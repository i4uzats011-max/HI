import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCache, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const partyName = searchParams.get('partyName') || '';
    const groupNameParam = searchParams.get('groupName') || '';
    const isGroupMode = searchParams.get('isGroupMode') === 'true' || !!groupNameParam;
    const branchFilter = searchParams.get('branchId') || 'all';
    const vTypeFilter = searchParams.get('voucherType') || 'all';

    if (!companyId || (!partyName && !groupNameParam)) {
      return NextResponse.json({ success: false, error: 'companyId and either partyName or groupName are required' }, { status: 400 });
    }

    // High speed cache lookup (Redis / RAM)
    const cacheKey = `company:${companyId}:ledger:${partyName || groupNameParam}:${branchFilter}:${vTypeFilter}:${isGroupMode}`;
    const cachedResponse = await getCache<any>(cacheKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const { db } = await connectToDatabase();

    // Check group membership
    let effectiveGroupName = groupNameParam;
    let targetAccounts: string[] = [];
    let groupInfo: any = null;

    if (groupNameParam) {
      const gRecords = await db.collection('ledger_groups').find({ companyId, groupName: groupNameParam }).toArray();
      targetAccounts = gRecords.map(g => g.partyName);
      groupInfo = {
        groupName: groupNameParam,
        memberParties: targetAccounts,
        isGroupView: true
      };
    } else if (partyName) {
      const pRecord = await db.collection('ledger_groups').findOne({ companyId, partyName });
      if (pRecord) {
        effectiveGroupName = pRecord.groupName;
        const allGroupMembers = await db.collection('ledger_groups').find({ companyId, groupName: pRecord.groupName }).toArray();
        const memberNames = allGroupMembers.map(g => g.partyName);
        groupInfo = {
          groupName: pRecord.groupName,
          memberParties: memberNames,
          isGroupView: isGroupMode
        };
        if (isGroupMode) {
          targetAccounts = memberNames;
        } else {
          targetAccounts = [partyName];
        }
      } else {
        targetAccounts = [partyName];
      }
    }

    if (targetAccounts.length === 0) {
      targetAccounts = [partyName];
    }

    const targetAccountsSet = new Set(targetAccounts);

    // Query active (non-ignored) vouchers for these accounts in this company
    const query: any = {
      companyId,
      "lines.account": { $in: targetAccounts },
      isIgnored: { $ne: true } // Exclude ignored entries from regular ledger
    };
    if (branchFilter && branchFilter !== 'all') {
      query.branchId = branchFilter;
    }

    const branches = await db.collection('branches').find({ companyId }).toArray();
    const branchNameMap = new Map<string, string>();
    branches.forEach(b => branchNameMap.set(b._id.toString(), b.name));

    // Check if this party is declared as a branch account
    const branchMapping = partyName ? await db.collection('branch_ledger_mappings').findOne({ companyId, partyName }) : null;

    // Fetch active vouchers sorted by date asc with selective projection for lightning speed
    const vouchers = await db.collection('vouchers').find(query, {
      projection: {
        date: 1,
        dateStr: 1,
        voucherType: 1,
        voucherNo: 1,
        narration: 1,
        branchId: 1,
        branchName: 1,
        lines: 1
      }
    }).sort({ date: 1, _id: 1 }).toArray();

    // Count ignored entries for these accounts
    const ignoredCount = await db.collection('vouchers').countDocuments({
      companyId,
      "lines.account": { $in: targetAccounts },
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

    // Pre-populate branches for this company
    for (const b of branches) {
      const bId = b._id.toString();
      branchBreakdownMap.set(bId, {
        branchId: bId,
        branchName: b.name,
        totalDebit: 0,
        totalCredit: 0,
        voucherCounts: {},
        totalCount: 0
      });
    }

    const transactions: any[] = [];
    let runningBalance = 0;

    for (const v of vouchers) {
      let vDebit = 0;
      let vCredit = 0;
      const counterAccounts: string[] = [];
      const matchedTargetAccounts: string[] = [];

      for (const line of v.lines) {
        if (targetAccountsSet.has(line.account)) {
          vDebit += (line.debit || 0);
          vCredit += (line.credit || 0);
          if (!matchedTargetAccounts.includes(line.account)) {
            matchedTargetAccounts.push(line.account);
          }
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

      // Update branch breakdown directly from active vouchers
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
      bStats.totalDebit += vDebit;
      bStats.totalCredit += vCredit;
      bStats.totalCount++;
      bStats.voucherCounts[vtKey] = (bStats.voucherCounts[vtKey] || 0) + 1;

      if (!vTypeFilter || vTypeFilter === 'all' || v.voucherType === vTypeFilter) {
        const itemParticulars = targetAccounts.length > 1
          ? `[${matchedTargetAccounts.join(', ')}] ${counterAccounts.length > 0 ? counterAccounts.slice(0, 2).join(', ') : (v.narration || '')}`
          : (counterAccounts.length > 0 ? counterAccounts.slice(0, 3).join(', ') : (v.narration || partyName));

        transactions.push({
          id: v._id.toString(),
          date: v.date,
          dateStr: v.dateStr,
          voucherType: v.voucherType,
          voucherNo: v.voucherNo || '-',
          branchId: v.branchId,
          branchName: bName,
          ledgerAccount: matchedTargetAccounts.join(', '),
          particulars: itemParticulars,
          narration: v.narration || '',
          debit: vDebit,
          credit: vCredit,
          runningBalance: Math.round(runningBalance * 100) / 100,
          balanceType: runningBalance > 0.01 ? 'Dr' : (runningBalance < -0.01 ? 'Cr' : 'Nil')
        });
      }
    }

    const netBal = Math.round((totalDebit - totalCredit) * 100) / 100;

    const responsePayload = {
      success: true,
      partyName,
      displayName: targetAccounts.length > 1 ? (groupInfo?.groupName ? `[GROUP] ${groupInfo.groupName}` : partyName) : partyName,
      isGroupView: targetAccounts.length > 1,
      targetAccounts,
      groupInfo,
      branchMapping: branchMapping ? {
        isBranchAccount: true,
        mappedBranchCode: branchMapping.targetBranchCode,
        targetBranchName: branchMapping.targetBranchName,
        targetBranchId: branchMapping.targetBranchId
      } : null,
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
      branchBreakdowns: Array.from(branchBreakdownMap.values())
        .filter(b => b.totalCount > 0 || b.totalDebit > 0 || b.totalCredit > 0 || branchBreakdownMap.size <= 1)
        .map(b => {
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
    };

    // Store in cache for 5 minutes
    await setCache(cacheKey, responsePayload, 300);

    return NextResponse.json(responsePayload);

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
