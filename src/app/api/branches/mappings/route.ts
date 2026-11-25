import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { invalidateCompanyCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const branchFilter = searchParams.get('branchId');
    const declaredOnly = searchParams.get('declaredOnly') === 'true';

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const query: any = { companyId };
    if (branchFilter && branchFilter !== 'all') {
      query.branchId = branchFilter;
    }

    // Get all party balances
    const balances = await db.collection('party_balances').find(query).toArray();

    // Get all declarations / mappings
    const mappings = await db.collection('branch_ledger_mappings').find({ companyId }).toArray();
    const mappingMap = new Map<string, any>();
    mappings.forEach(m => {
      mappingMap.set(`${m.branchId}_${m.partyName}`, m);
      mappingMap.set(`all_${m.partyName}`, m);
      mappingMap.set(m.partyName, m);
    });

    const branches = await db.collection('branches').find({ companyId }).toArray();
    const branchCodeMap = new Map<string, string>();
    branches.forEach(b => branchCodeMap.set(b._id.toString(), b.code));

    let items = balances.map(b => {
      const mapping = mappingMap.get(`${b.branchId}_${b.partyName}`) ||
                      mappingMap.get(`all_${b.partyName}`) ||
                      mappingMap.get(b.partyName);
      const declaredCode = mapping?.targetBranchCode || b.mappedBranchCode || '';

      return {
        id: b._id.toString(),
        branchId: b.branchId,
        branchName: b.branchName,
        partyName: b.partyName,
        totalDebit: b.totalDebit || 0,
        totalCredit: b.totalCredit || 0,
        netBalance: b.netBalance || 0,
        status: b.status || (b.netBalance > 0 ? 'Dr' : 'Cr'),
        voucherCount: b.voucherCount || 0,
        isBranchDeclared: !!declaredCode,
        declaredBranchCode: declaredCode,
        declaredAt: mapping?.updatedAt || null
      };
    });

    if (declaredOnly) {
      items = items.filter(i => i.isBranchDeclared);
    }

    if (search) {
      items = items.filter(i =>
        i.partyName.toLowerCase().includes(search) ||
        i.declaredBranchCode.toLowerCase().includes(search) ||
        i.branchName.toLowerCase().includes(search)
      );
    }

    // Sort: declared branches first, then largest balance
    items.sort((a, b) => {
      if (a.isBranchDeclared && !b.isBranchDeclared) return -1;
      if (!a.isBranchDeclared && b.isBranchDeclared) return 1;
      return Math.abs(b.netBalance) - Math.abs(a.netBalance);
    });

    // Unique declared codes
    const declaredCodesSet = new Set<string>();
    items.forEach(i => {
      if (i.declaredBranchCode) declaredCodesSet.add(i.declaredBranchCode);
    });

    return NextResponse.json({
      success: true,
      branches: branches.map(b => ({ id: b._id.toString(), name: b.name, code: b.code })),
      declaredCodes: Array.from(declaredCodesSet),
      ledgers: items
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Declare 1 or more ledgers as branch with branchCode
export async function POST(req: NextRequest) {
  try {
    const { companyId, branchId, partyNames, partyName, branchCode } = await req.json();

    if (!companyId || !branchCode || !branchCode.trim()) {
      return NextResponse.json({ success: false, error: 'companyId and branchCode are required' }, { status: 400 });
    }

    const cleanCode = branchCode.trim().toUpperCase();
    const names: string[] = partyNames && Array.isArray(partyNames) ? partyNames : (partyName ? [partyName] : []);

    if (names.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one party/ledger name must be selected' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check if branchCode matches an existing branch
    const matchedBranch = await db.collection('branches').findOne({
      companyId,
      code: cleanCode
    });

    // Batch upsert in branch_ledger_mappings
    const now = new Date();
    for (const name of names) {
      const filter: any = { companyId, partyName: name };
      if (branchId && branchId !== 'all') filter.branchId = branchId;

      await db.collection('branch_ledger_mappings').updateMany(
        filter,
        {
          $set: {
            companyId,
            branchId: branchId || 'all',
            partyName: name,
            targetBranchCode: cleanCode,
            targetBranchId: matchedBranch ? matchedBranch._id.toString() : '',
            targetBranchName: matchedBranch?.name || cleanCode,
            updatedAt: now
          }
        },
        { upsert: true }
      );

      // Update in party_balances
      const pbFilter: any = { companyId, partyName: name };
      if (branchId && branchId !== 'all') pbFilter.branchId = branchId;

      await db.collection('party_balances').updateMany(
        pbFilter,
        {
          $set: {
            isBranchAccount: true,
            mappedBranchCode: cleanCode,
            targetBranchId: matchedBranch ? matchedBranch._id.toString() : '',
            targetBranchName: matchedBranch?.name || cleanCode
          }
        }
      );
    }

    await invalidateCompanyCache(companyId);

    return NextResponse.json({
      success: true,
      message: `${names.length} ledger(s) successfully declared as branch with code "${cleanCode}"`
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Remove branch declaration from ledgers
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const partyName = searchParams.get('partyName');
    const branchId = searchParams.get('branchId');

    if (!companyId || !partyName) {
      return NextResponse.json({ success: false, error: 'companyId and partyName are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const filter: any = { companyId, partyName };
    if (branchId) filter.branchId = branchId;

    await Promise.all([
      db.collection('branch_ledger_mappings').deleteMany(filter),
      db.collection('party_balances').updateMany(filter, {
        $unset: {
          isBranchAccount: "",
          mappedBranchCode: "",
          targetBranchId: "",
          targetBranchName: ""
        }
      })
    ]);

    await invalidateCompanyCache(companyId);

    return NextResponse.json({ success: true, message: `Branch declaration removed from "${partyName}"` });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
