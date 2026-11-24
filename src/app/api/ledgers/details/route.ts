import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const partyName = searchParams.get('partyName');
    const branchFilter = searchParams.get('branchId') || 'all';
    const vTypeFilter = searchParams.get('voucherType') || 'all';

    if (!companyId || !partyName) {
      return NextResponse.json({ success: false, error: 'companyId and partyName are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Query active (non-ignored) vouchers for this party in this company
    const query: any = {
      companyId,
      "lines.account": partyName,
      isIgnored: { $ne: true } // Exclude ignored entries from regular ledger
    };
    if (branchFilter && branchFilter !== 'all') {
      query.branchId = branchFilter;
    }

    const branches = await db.collection('branches').find({ companyId }).toArray();
    const branchNameMap = new Map<string, string>();
    branches.forEach(b => branchNameMap.set(b._id.toString(), b.name));

    // Fetch active vouchers sorted by date asc
    const vouchers = await db.collection('vouchers').find(query).sort({ date: 1, _id: 1 }).toArray();

    // Count ignored entries for this party
    const ignoredCount = await db.collection('vouchers').countDocuments({
      companyId,
      "lines.account": partyName,
      isIgnored: true
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const voucherTypeCounts: {
      [key: string]: { count: number; debit: number; credit: number; label: string }
    } = {
      'Pymt': { count: 0, debit: 0, credit: 0, label: 'Payment (भुगतान)' },
      'Rcpt': { count: 0, debit: 0, credit: 0, label: 'Receipt (प्राप्ति)' },
      'Sale': { count: 0, debit: 0, credit: 0, label: 'Sales (बिक्री)' },
      'Purc': { count: 0, debit: 0, credit: 0, label: 'Purchase (खरीद)' },
      'Jrnl': { count: 0, debit: 0, credit: 0, label: 'Journal (जनरल)' },
      'Ctra': { count: 0, debit: 0, credit: 0, label: 'Contra (कॉन्ट्रा)' },
      'C/Note': { count: 0, debit: 0, credit: 0, label: 'Credit Note (जमा पत्र)' },
      'D/Note': { count: 0, debit: 0, credit: 0, label: 'Debit Note (नाम पत्र)' },
      'Other': { count: 0, debit: 0, credit: 0, label: 'Other (अन्य)' }
    };

    const branchBreakdownMap = new Map<string, {
      branchId: string;
      branchName: string;
      totalDebit: number;
      totalCredit: number;
      voucherCounts: { [vt: string]: number };
      totalCount: number;
    }>();

    // Fetch all party balances for this party across all branches in company
    const allPartyBalances = await db.collection('party_balances').find({ companyId, partyName }).toArray();
    for (const pb of allPartyBalances) {
      const bName = branchNameMap.get(pb.branchId) || pb.branchName || 'Branch';
      branchBreakdownMap.set(pb.branchId, {
        branchId: pb.branchId,
        branchName: bName,
        totalDebit: pb.totalDebit || 0,
        totalCredit: pb.totalCredit || 0,
        voucherCounts: {},
        totalCount: pb.voucherCount || 0
      });
    }

    const transactions: any[] = [];
    let runningBalance = 0;

    for (const v of vouchers) {
      let vDebit = 0;
      let vCredit = 0;
      const counterAccounts: string[] = [];

      for (const line of v.lines) {
        if (line.account === partyName) {
          vDebit += (line.debit || 0);
          vCredit += (line.credit || 0);
        } else {
          counterAccounts.push(line.account);
        }
      }

      totalDebit += vDebit;
      totalCredit += vCredit;
      // Debit increases party receivable (+), Credit decreases (-)
      runningBalance += (vDebit - vCredit);

      let vtKey = v.voucherType || 'Other';
      if (!voucherTypeCounts[vtKey]) {
        voucherTypeCounts[vtKey] = { count: 0, debit: 0, credit: 0, label: vtKey };
      }
      voucherTypeCounts[vtKey].count++;
      voucherTypeCounts[vtKey].debit += vDebit;
      voucherTypeCounts[vtKey].credit += vCredit;

      // Update branch breakdown
      const bId = v.branchId;
      const bName = branchNameMap.get(bId) || v.branchName || 'Branch';
      if (!branchBreakdownMap.has(bId)) {
        branchBreakdownMap.set(bId, {
          branchId: bId,
          branchName: bName,
          totalDebit: 0,
          totalCredit: 0,
          voucherCounts: {},
          totalCount: 0
        });
      }
      const bStats = branchBreakdownMap.get(bId)!;
      bStats.voucherCounts[vtKey] = (bStats.voucherCounts[vtKey] || 0) + 1;

      if (!vTypeFilter || vTypeFilter === 'all' || v.voucherType === vTypeFilter) {
        transactions.push({
          id: v._id.toString(),
          date: v.date,
          dateStr: v.dateStr,
          voucherType: v.voucherType,
          voucherNo: v.voucherNo || '-',
          branchId: v.branchId,
          branchName: bName,
          particulars: counterAccounts.length > 0 ? counterAccounts.slice(0, 3).join(', ') : (v.narration || partyName),
          narration: v.narration || '',
          debit: vDebit,
          credit: vCredit,
          runningBalance: Math.round(runningBalance * 100) / 100,
          balanceType: runningBalance > 0.01 ? 'Dr' : (runningBalance < -0.01 ? 'Cr' : 'Nil')
        });
      }
    }

    const netBal = Math.round((totalDebit - totalCredit) * 100) / 100;

    return NextResponse.json({
      success: true,
      partyName,
      branchFilter,
      ignoredCount,
      summary: {
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        netBalance: netBal,
        status: netBal > 0.01 ? 'Dr' : (netBal < -0.01 ? 'Cr' : 'Nil'),
        totalTransactions: vouchers.length
      },
      voucherTypeCounts,
      branchBreakdowns: Array.from(branchBreakdownMap.values()).map(b => {
        const net = Math.round((b.totalDebit - b.totalCredit) * 100) / 100;
        return {
          ...b,
          totalDebit: Math.round(b.totalDebit * 100) / 100,
          totalCredit: Math.round(b.totalCredit * 100) / 100,
          netBalance: net,
          status: net > 0.01 ? 'Dr' : (net < -0.01 ? 'Cr' : 'Nil')
        };
      }),
      transactions
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
