import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const filterType = searchParams.get('filter') || 'all'; // 'all', 'multi_branch', 'dr', 'cr'

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Get branches for this company
    const branches = await db.collection('branches').find({ companyId }).sort({ createdAt: 1 }).toArray();
    const branchMap = new Map<string, string>();
    branches.forEach(b => branchMap.set(b._id.toString(), b.name));

    // Get all party_balances for this company
    const balances = await db.collection('party_balances').find({ companyId }).toArray();

    // Group by partyName
    const matrixMap = new Map<string, {
      partyName: string;
      branchBalances: { [branchId: string]: { branchName: string; debit: number; credit: number; net: number; status: string } };
      totalDebit: number;
      totalCredit: number;
      branchesCount: number;
    }>();

    for (const b of balances) {
      const pName = b.partyName;
      if (!matrixMap.has(pName)) {
        matrixMap.set(pName, {
          partyName: pName,
          branchBalances: {},
          totalDebit: 0,
          totalCredit: 0,
          branchesCount: 0
        });
      }
      const item = matrixMap.get(pName)!;
      const bId = b.branchId;
      const bName = branchMap.get(bId) || b.branchName || 'Unknown Branch';

      item.branchBalances[bId] = {
        branchName: bName,
        debit: b.totalDebit || 0,
        credit: b.totalCredit || 0,
        net: b.netBalance || 0,
        status: b.status || (b.netBalance > 0 ? 'Dr' : (b.netBalance < 0 ? 'Cr' : 'Nil'))
      };

      item.totalDebit += (b.totalDebit || 0);
      item.totalCredit += (b.totalCredit || 0);
      item.branchesCount++;
    }

    let parties = Array.from(matrixMap.values()).map(p => {
      const net = Math.round((p.totalDebit - p.totalCredit) * 100) / 100;
      return {
        partyName: p.partyName,
        branchBalances: p.branchBalances,
        totalDebit: Math.round(p.totalDebit * 100) / 100,
        totalCredit: Math.round(p.totalCredit * 100) / 100,
        netBalance: net,
        status: net > 0.01 ? 'Dr' : (net < -0.01 ? 'Cr' : 'Nil'),
        branchesCount: p.branchesCount,
        isMultiBranch: p.branchesCount > 1
      };
    });

    // Apply Search
    if (search) {
      parties = parties.filter(p => p.partyName.toLowerCase().includes(search));
    }

    // Apply Filter
    if (filterType === 'multi_branch') {
      parties = parties.filter(p => p.isMultiBranch);
    } else if (filterType === 'dr') {
      parties = parties.filter(p => p.status === 'Dr');
    } else if (filterType === 'cr') {
      parties = parties.filter(p => p.status === 'Cr');
    }

    // Sort by largest absolute net balance first
    parties.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));

    // Stats
    let totalReceivable = 0;
    let totalPayable = 0;
    let multiBranchCount = 0;

    for (const p of Array.from(matrixMap.values())) {
      const net = p.totalDebit - p.totalCredit;
      if (net > 0) totalReceivable += net;
      else if (net < 0) totalPayable += Math.abs(net);
      if (p.branchesCount > 1) multiBranchCount++;
    }

    return NextResponse.json({
      success: true,
      branches: branches.map(b => ({ id: b._id.toString(), name: b.name, code: b.code })),
      parties,
      stats: {
        totalParties: matrixMap.size,
        multiBranchCount,
        singleBranchCount: matrixMap.size - multiBranchCount,
        totalReceivable: Math.round(totalReceivable * 100) / 100,
        totalPayable: Math.round(totalPayable * 100) / 100,
        netConsolidated: Math.round((totalReceivable - totalPayable) * 100) / 100
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
