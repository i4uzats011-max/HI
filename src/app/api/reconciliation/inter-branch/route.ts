import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const branch1Id = searchParams.get('branch1Id');
    const branch2Id = searchParams.get('branch2Id');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const branches = await db.collection('branches').find({ companyId }).toArray();

    // Auto-detect inter-branch candidate accounts
    // Look for accounts in branch 1 that match branch 2 name/code, or vice-versa
    const branchMap = new Map<string, any>();
    branches.forEach(b => branchMap.set(b._id.toString(), b));

    let b1 = branch1Id ? branchMap.get(branch1Id) : branches[0];
    let b2 = branch2Id ? branchMap.get(branch2Id) : (branches.length > 1 ? branches[1] : null);

    if (!b1 || !b2 || b1._id.toString() === b2._id.toString()) {
      return NextResponse.json({
        success: true,
        branches: branches.map(b => ({ id: b._id.toString(), name: b.name, code: b.code })),
        message: 'Please create at least 2 branches to perform inter-branch reconciliation'
      });
    }

    const b1Id = b1._id.toString();
    const b2Id = b2._id.toString();

    // Find all ledger accounts in b1 and b2
    const [b1Accounts, b2Accounts] = await Promise.all([
      db.collection('party_balances').find({ branchId: b1Id }).toArray(),
      db.collection('party_balances').find({ branchId: b2Id }).toArray()
    ]);

    // Find accounts in B1 that mention B2's name or code or "Branch" or "HO" or "Inter"
    const b2Keywords = [b2.name.toLowerCase(), b2.code.toLowerCase(), 'inter branch', 'branch transfer'];
    const b1Keywords = [b1.name.toLowerCase(), b1.code.toLowerCase(), 'inter branch', 'branch transfer'];

    const matchedInB1 = b1Accounts.filter(a => b2Keywords.some(kw => kw && a.partyName.toLowerCase().includes(kw)));
    const matchedInB2 = b2Accounts.filter(a => b1Keywords.some(kw => kw && a.partyName.toLowerCase().includes(kw)));

    // Fetch transactions in B1 for these accounts
    const b1AccountNames = matchedInB1.map(a => a.partyName);
    const b2AccountNames = matchedInB2.map(a => a.partyName);

    const [b1Vouchers, b2Vouchers] = await Promise.all([
      b1AccountNames.length > 0
        ? db.collection('vouchers').find({ branchId: b1Id, "lines.account": { $in: b1AccountNames } }).sort({ date: 1 }).toArray()
        : [],
      b2AccountNames.length > 0
        ? db.collection('vouchers').find({ branchId: b2Id, "lines.account": { $in: b2AccountNames } }).sort({ date: 1 }).toArray()
        : []
    ]);

    // Calculate balances
    const b1TotalDebit = matchedInB1.reduce((sum, a) => sum + (a.totalDebit || 0), 0);
    const b1TotalCredit = matchedInB1.reduce((sum, a) => sum + (a.totalCredit || 0), 0);
    const b1Net = b1TotalDebit - b1TotalCredit; // Net in B1's books

    const b2TotalDebit = matchedInB2.reduce((sum, a) => sum + (a.totalDebit || 0), 0);
    const b2TotalCredit = matchedInB2.reduce((sum, a) => sum + (a.totalCredit || 0), 0);
    const b2Net = b2TotalDebit - b2TotalCredit; // Net in B2's books

    // In double entry, if B1 shows Debit X for B2, then B2 should show Credit X for B1!
    // So reconciliation difference = |b1Net - (-b2Net)| = |b1Net + b2Net|
    const difference = Math.abs(Math.round((b1Net + b2Net) * 100) / 100);
    const isReconciled = difference < 1.0;

    return NextResponse.json({
      success: true,
      branches: branches.map(b => ({ id: b._id.toString(), name: b.name, code: b.code })),
      selected: {
        branch1: { id: b1Id, name: b1.name, code: b1.code },
        branch2: { id: b2Id, name: b2.name, code: b2.code }
      },
      reconciliation: {
        branch1Book: {
          branchName: b1.name,
          matchedAccounts: matchedInB1.map(a => ({ name: a.partyName, net: a.netBalance, status: a.status })),
          totalDebit: Math.round(b1TotalDebit * 100) / 100,
          totalCredit: Math.round(b1TotalCredit * 100) / 100,
          netBalance: Math.round(b1Net * 100) / 100,
          balanceType: b1Net > 0 ? 'Dr' : (b1Net < 0 ? 'Cr' : 'Nil'),
          entriesCount: b1Vouchers.length,
          vouchers: b1Vouchers.slice(0, 100)
        },
        branch2Book: {
          branchName: b2.name,
          matchedAccounts: matchedInB2.map(a => ({ name: a.partyName, net: a.netBalance, status: a.status })),
          totalDebit: Math.round(b2TotalDebit * 100) / 100,
          totalCredit: Math.round(b2TotalCredit * 100) / 100,
          netBalance: Math.round(b2Net * 100) / 100,
          balanceType: b2Net > 0 ? 'Dr' : (b2Net < 0 ? 'Cr' : 'Nil'),
          entriesCount: b2Vouchers.length,
          vouchers: b2Vouchers.slice(0, 100)
        },
        difference,
        isReconciled,
        statusText: isReconciled ? 'Books Reconciled (आपस में पूर्ण मिलान है)' : `Difference of ₹${difference.toLocaleString('en-IN')} (अंतर है)`
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
