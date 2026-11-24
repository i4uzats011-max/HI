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

    // Get all party_balances for this company, plus group and branch mappings
    const [balances, groupRecords, branchMappings] = await Promise.all([
      db.collection('party_balances').find({ companyId }).toArray(),
      db.collection('ledger_groups').find({ companyId }).toArray(),
      db.collection('branch_ledger_mappings').find({ companyId }).toArray()
    ]);

    const groupMap = new Map<string, string>(); // partyName -> groupName
    groupRecords.forEach(g => groupMap.set(g.partyName, g.groupName));

    const branchDeclMap = new Map<string, string>(); // partyName -> targetBranchCode
    branchMappings.forEach(m => branchDeclMap.set(m.partyName, m.targetBranchCode));

    // Group by partyName
    const matrixMap = new Map<string, {
      partyName: string;
      groupName: string;
      isGrouped: boolean;
      isBranchAccount: boolean;
      mappedBranchCode: string;
      branchBalances: { [branchId: string]: { branchName: string; debit: number; credit: number; net: number; status: string } };
      totalDebit: number;
      totalCredit: number;
      branchesCount: number;
    }>();

    for (const b of balances) {
      const pName = b.partyName;
      if (!matrixMap.has(pName)) {
        const grp = groupMap.get(pName) || b.groupName || '';
        const bCode = branchDeclMap.get(pName) || b.mappedBranchCode || '';
        matrixMap.set(pName, {
          partyName: pName,
          groupName: grp,
          isGrouped: !!grp,
          isBranchAccount: !!bCode || !!b.isBranchAccount,
          mappedBranchCode: bCode,
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
        groupName: p.groupName,
        isGrouped: p.isGrouped,
        isBranchAccount: p.isBranchAccount,
        mappedBranchCode: p.mappedBranchCode,
        branchBalances: p.branchBalances,
        totalDebit: Math.round(p.totalDebit * 100) / 100,
        totalCredit: Math.round(p.totalCredit * 100) / 100,
        netBalance: net,
        status: net > 0.01 ? 'Dr' : (net < -0.01 ? 'Cr' : 'Nil'),
        branchesCount: p.branchesCount,
        isMultiBranch: p.branchesCount > 1
      };
    });

    // Build Group Aggregates
    const groupsAgg = new Map<string, {
      groupName: string;
      parties: string[];
      totalDebit: number;
      totalCredit: number;
      netBalance: number;
      status: string;
      branchBalances: { [branchId: string]: { branchName: string; debit: number; credit: number; net: number; status: string } };
    }>();

    for (const p of parties) {
      if (p.isGrouped && p.groupName) {
        if (!groupsAgg.has(p.groupName)) {
          groupsAgg.set(p.groupName, {
            groupName: p.groupName,
            parties: [],
            totalDebit: 0,
            totalCredit: 0,
            netBalance: 0,
            status: 'Nil',
            branchBalances: {}
          });
        }
        const g = groupsAgg.get(p.groupName)!;
        g.parties.push(p.partyName);
        g.totalDebit += p.totalDebit;
        g.totalCredit += p.totalCredit;

        // Aggregate branch balances
        for (const [bId, bVal] of Object.entries(p.branchBalances)) {
          if (!g.branchBalances[bId]) {
            g.branchBalances[bId] = {
              branchName: bVal.branchName,
              debit: 0,
              credit: 0,
              net: 0,
              status: 'Nil'
            };
          }
          g.branchBalances[bId].debit += bVal.debit;
          g.branchBalances[bId].credit += bVal.credit;
        }
      }
    }

    const groupsList = Array.from(groupsAgg.values()).map(g => {
      g.totalDebit = Math.round(g.totalDebit * 100) / 100;
      g.totalCredit = Math.round(g.totalCredit * 100) / 100;
      g.netBalance = Math.round((g.totalDebit - g.totalCredit) * 100) / 100;
      g.status = g.netBalance > 0.01 ? 'Dr' : (g.netBalance < -0.01 ? 'Cr' : 'Nil');

      for (const [bId, bVal] of Object.entries(g.branchBalances)) {
        bVal.debit = Math.round(bVal.debit * 100) / 100;
        bVal.credit = Math.round(bVal.credit * 100) / 100;
        bVal.net = Math.round((bVal.debit - bVal.credit) * 100) / 100;
        bVal.status = bVal.net > 0.01 ? 'Dr' : (bVal.net < -0.01 ? 'Cr' : 'Nil');
      }
      return g;
    });

    // Apply Search
    if (search) {
      parties = parties.filter(p =>
        p.partyName.toLowerCase().includes(search) ||
        (p.groupName && p.groupName.toLowerCase().includes(search)) ||
        (p.mappedBranchCode && p.mappedBranchCode.toLowerCase().includes(search))
      );
    }

    // Apply Filter
    if (filterType === 'multi_branch') {
      parties = parties.filter(p => p.isMultiBranch);
    } else if (filterType === 'dr') {
      parties = parties.filter(p => p.status === 'Dr');
    } else if (filterType === 'cr') {
      parties = parties.filter(p => p.status === 'Cr');
    } else if (filterType === 'grouped') {
      parties = parties.filter(p => p.isGrouped);
    } else if (filterType === 'ungrouped') {
      parties = parties.filter(p => !p.isGrouped);
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
      groups: groupsList,
      stats: {
        totalParties: matrixMap.size,
        totalGroups: groupsList.length,
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
