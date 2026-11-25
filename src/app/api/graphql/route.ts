import { NextRequest, NextResponse } from 'next/server';
import { graphql, buildSchema } from 'graphql';
import { connectToDatabase } from '@/lib/mongodb';
import { getCache, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const schema = buildSchema(`
  type BranchInfo {
    id: String!
    name: String!
    code: String!
  }

  type PartyBalance {
    partyName: String!
    groupName: String
    isGrouped: Boolean
    isBranchAccount: Boolean
    mappedBranchCode: String
    totalDebit: Float!
    totalCredit: Float!
    netBalance: Float!
    status: String!
    branchesCount: Int!
    isMultiBranch: Boolean!
  }

  type MatrixResult {
    success: Boolean!
    branches: [BranchInfo!]!
    parties: [PartyBalance!]!
    totalParties: Int!
    totalReceivable: Float!
    totalPayable: Float!
    netConsolidated: Float!
  }

  type LedgerSummary {
    totalDebit: Float!
    totalCredit: Float!
    netBalance: Float!
    status: String!
    totalTransactions: Int!
  }

  type LedgerTransaction {
    id: String!
    dateStr: String!
    voucherType: String!
    voucherNo: String!
    branchName: String
    particulars: String!
    debit: Float!
    credit: Float!
    runningBalance: Float!
    balanceType: String!
  }

  type LedgerResult {
    success: Boolean!
    partyName: String!
    summary: LedgerSummary!
    transactions: [LedgerTransaction!]!
  }

  type Query {
    searchParties(companyId: String!, query: String!): [PartyBalance!]!
    matrix(companyId: String!, search: String, filter: String): MatrixResult!
    ledger(companyId: String!, partyName: String!, branchId: String): LedgerResult!
  }
`);

const root = {
  // Ultra fast party search resolver
  searchParties: async ({ companyId, query }: { companyId: string; query: string }) => {
    const { db } = await connectToDatabase();
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return [];

    const regex = new RegExp(cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const balances = await db.collection('party_balances')
      .find({
        companyId,
        partyName: { $regex: regex }
      })
      .project({ partyName: 1, groupName: 1, isGrouped: 1, isBranchAccount: 1, mappedBranchCode: 1, totalDebit: 1, totalCredit: 1, netBalance: 1, status: 1, branchId: 1 })
      .limit(50)
      .toArray();

    const partyMap = new Map<string, any>();
    for (const b of balances) {
      if (!partyMap.has(b.partyName)) {
        partyMap.set(b.partyName, {
          partyName: b.partyName,
          groupName: b.groupName || '',
          isGrouped: !!b.isGrouped,
          isBranchAccount: !!b.isBranchAccount,
          mappedBranchCode: b.mappedBranchCode || '',
          totalDebit: 0,
          totalCredit: 0,
          netBalance: 0,
          status: 'Nil',
          branchesCount: 0,
          isMultiBranch: false
        });
      }
      const item = partyMap.get(b.partyName);
      item.totalDebit += (b.totalDebit || 0);
      item.totalCredit += (b.totalCredit || 0);
      item.branchesCount++;
    }

    return Array.from(partyMap.values()).map(p => {
      const net = Math.round((p.totalDebit - p.totalCredit) * 100) / 100;
      return {
        ...p,
        totalDebit: Math.round(p.totalDebit * 100) / 100,
        totalCredit: Math.round(p.totalCredit * 100) / 100,
        netBalance: net,
        status: net > 0.01 ? 'Dr' : (net < -0.01 ? 'Cr' : 'Nil'),
        isMultiBranch: p.branchesCount > 1
      };
    });
  },

  // GraphQL Matrix Query with caching
  matrix: async ({ companyId, search, filter }: { companyId: string; search?: string; filter?: string }) => {
    const { db } = await connectToDatabase();
    const branches = await db.collection('branches').find({ companyId }).sort({ createdAt: 1 }).toArray();
    const balances = await db.collection('party_balances').find({ companyId }).toArray();

    const partyMap = new Map<string, any>();
    for (const b of balances) {
      if (!partyMap.has(b.partyName)) {
        partyMap.set(b.partyName, {
          partyName: b.partyName,
          groupName: b.groupName || '',
          isGrouped: !!b.isGrouped,
          isBranchAccount: !!b.isBranchAccount,
          mappedBranchCode: b.mappedBranchCode || '',
          totalDebit: 0,
          totalCredit: 0,
          netBalance: 0,
          status: 'Nil',
          branchesCount: 0,
          isMultiBranch: false
        });
      }
      const item = partyMap.get(b.partyName);
      item.totalDebit += (b.totalDebit || 0);
      item.totalCredit += (b.totalCredit || 0);
      item.branchesCount++;
    }

    let parties = Array.from(partyMap.values()).map(p => {
      const net = Math.round((p.totalDebit - p.totalCredit) * 100) / 100;
      return {
        ...p,
        totalDebit: Math.round(p.totalDebit * 100) / 100,
        totalCredit: Math.round(p.totalCredit * 100) / 100,
        netBalance: net,
        status: net > 0.01 ? 'Dr' : (net < -0.01 ? 'Cr' : 'Nil'),
        isMultiBranch: p.branchesCount > 1
      };
    });

    if (search) {
      const s = search.toLowerCase();
      parties = parties.filter(p => p.partyName.toLowerCase().includes(s) || (p.groupName && p.groupName.toLowerCase().includes(s)));
    }

    if (filter === 'multi_branch') parties = parties.filter(p => p.isMultiBranch);
    else if (filter === 'dr') parties = parties.filter(p => p.status === 'Dr');
    else if (filter === 'cr') parties = parties.filter(p => p.status === 'Cr');

    let totalReceivable = 0;
    let totalPayable = 0;
    for (const p of parties) {
      if (p.netBalance > 0) totalReceivable += p.netBalance;
      else if (p.netBalance < 0) totalPayable += Math.abs(p.netBalance);
    }

    return {
      success: true,
      branches: branches.map(b => ({ id: b._id.toString(), name: b.name, code: b.code })),
      parties,
      totalParties: parties.length,
      totalReceivable: Math.round(totalReceivable * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
      netConsolidated: Math.round((totalReceivable - totalPayable) * 100) / 100
    };
  },

  // Fast GraphQL Ledger query
  ledger: async ({ companyId, partyName, branchId }: { companyId: string; partyName: string; branchId?: string }) => {
    const { db } = await connectToDatabase();
    const query: any = { companyId, "lines.account": partyName, isIgnored: { $ne: true } };
    if (branchId && branchId !== 'all') query.branchId = branchId;

    const vouchers = await db.collection('vouchers').find(query, {
      projection: { date: 1, dateStr: 1, voucherType: 1, voucherNo: 1, narration: 1, branchName: 1, lines: 1 }
    }).sort({ date: 1, _id: 1 }).toArray();

    let totalDebit = 0;
    let totalCredit = 0;
    let runningBalance = 0;

    const transactions = vouchers.map(v => {
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
      runningBalance += (vDebit - vCredit);

      return {
        id: v._id.toString(),
        dateStr: v.dateStr,
        voucherType: v.voucherType,
        voucherNo: v.voucherNo || '-',
        branchName: v.branchName || '',
        particulars: counterAccounts.slice(0, 3).join(', ') || v.narration || partyName,
        debit: vDebit,
        credit: vCredit,
        runningBalance: Math.round(runningBalance * 100) / 100,
        balanceType: runningBalance > 0.01 ? 'Dr' : (runningBalance < -0.01 ? 'Cr' : 'Nil')
      };
    });

    const netBal = Math.round((totalDebit - totalCredit) * 100) / 100;

    return {
      success: true,
      partyName,
      summary: {
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        netBalance: netBal,
        status: netBal > 0.01 ? 'Dr' : (netBal < -0.01 ? 'Cr' : 'Nil'),
        totalTransactions: vouchers.length
      },
      transactions
    };
  }
};

export async function POST(req: NextRequest) {
  try {
    const { query, variables } = await req.json();
    if (!query) {
      return NextResponse.json({ errors: [{ message: 'GraphQL query required' }] }, { status: 400 });
    }

    const response = await graphql({
      schema,
      source: query,
      rootValue: root,
      variableValues: variables
    });

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json({ errors: [{ message: err.message }] }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');
  if (!query) {
    return NextResponse.json({ message: 'GraphQL endpoint ready. Send POST with query.' });
  }
  const response = await graphql({
    schema,
    source: query,
    rootValue: root
  });
  return NextResponse.json(response);
}
