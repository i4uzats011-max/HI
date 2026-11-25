import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { invalidateCompanyCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// GET: Fetch all groups, their member parties and balances, plus ungrouped parties
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // 1. Fetch all group assignments
    const groupRecords = await db.collection('ledger_groups').find({ companyId }).toArray();
    const groupMap = new Map<string, string>(); // partyName (lowercase) -> groupName
    groupRecords.forEach(g => {
      groupMap.set(g.partyName, g.groupName);
      groupMap.set(g.partyName.toLowerCase(), g.groupName);
    });

    // 2. Fetch all party balances for this company
    const balances = await db.collection('party_balances').find({ companyId }).toArray();

    // Aggregate balances per partyName across branches
    const partyAgg = new Map<string, {
      partyName: string;
      totalDebit: number;
      totalCredit: number;
      netBalance: number;
      status: string;
      branchCount: number;
      isGrouped: boolean;
      groupName: string;
      isBranchAccount: boolean;
      mappedBranchCode: string;
    }>();

    for (const b of balances) {
      const pName = b.partyName;
      if (!partyAgg.has(pName)) {
        const grp = groupMap.get(pName) || groupMap.get(pName.toLowerCase()) || b.groupName || '';
        partyAgg.set(pName, {
          partyName: pName,
          totalDebit: 0,
          totalCredit: 0,
          netBalance: 0,
          status: 'Nil',
          branchCount: 0,
          isGrouped: !!grp,
          groupName: grp,
          isBranchAccount: !!b.isBranchAccount,
          mappedBranchCode: b.mappedBranchCode || ''
        });
      }

      const item = partyAgg.get(pName)!;
      item.totalDebit += (b.totalDebit || 0);
      item.totalCredit += (b.totalCredit || 0);
      item.branchCount++;
    }

    // Finalize party totals
    for (const item of Array.from(partyAgg.values())) {
      item.totalDebit = Math.round(item.totalDebit * 100) / 100;
      item.totalCredit = Math.round(item.totalCredit * 100) / 100;
      item.netBalance = Math.round((item.totalDebit - item.totalCredit) * 100) / 100;
      item.status = item.netBalance > 0.01 ? 'Dr' : (item.netBalance < -0.01 ? 'Cr' : 'Nil');
    }

    // 3. Aggregate by groupName
    const groupsAgg = new Map<string, {
      groupName: string;
      parties: any[];
      totalDebit: number;
      totalCredit: number;
      netBalance: number;
      status: string;
      partyCount: number;
    }>();

    for (const p of Array.from(partyAgg.values())) {
      if (p.isGrouped && p.groupName) {
        if (!groupsAgg.has(p.groupName)) {
          groupsAgg.set(p.groupName, {
            groupName: p.groupName,
            parties: [],
            totalDebit: 0,
            totalCredit: 0,
            netBalance: 0,
            status: 'Nil',
            partyCount: 0
          });
        }
        const grp = groupsAgg.get(p.groupName)!;
        grp.parties.push(p);
        grp.totalDebit += p.totalDebit;
        grp.totalCredit += p.totalCredit;
        grp.partyCount++;
      }
    }

    // Finalize group totals
    const groups = Array.from(groupsAgg.values()).map(g => {
      g.totalDebit = Math.round(g.totalDebit * 100) / 100;
      g.totalCredit = Math.round(g.totalCredit * 100) / 100;
      g.netBalance = Math.round((g.totalDebit - g.totalCredit) * 100) / 100;
      g.status = g.netBalance > 0.01 ? 'Dr' : (g.netBalance < -0.01 ? 'Cr' : 'Nil');
      g.parties.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
      return g;
    });

    // Sort groups by largest net balance
    groups.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));

    // Filter parties if search is provided
    let allPartiesList = Array.from(partyAgg.values());
    if (search) {
      allPartiesList = allPartiesList.filter(p =>
        p.partyName.toLowerCase().includes(search) ||
        (p.groupName && p.groupName.toLowerCase().includes(search))
      );
    }
    allPartiesList.sort((a, b) => {
      // Show ungrouped or largest balance first
      return Math.abs(b.netBalance) - Math.abs(a.netBalance);
    });

    const uniqueGroupNames = Array.from(new Set(groupRecords.map(g => g.groupName))).sort();

    return NextResponse.json({
      success: true,
      groups,
      groupNames: uniqueGroupNames,
      totalGroups: groups.length,
      parties: allPartiesList
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Assign one or more parties to a group
export async function POST(req: NextRequest) {
  try {
    const { companyId, groupName, partyNames, partyName } = await req.json();

    if (!companyId || !groupName || !groupName.trim()) {
      return NextResponse.json({ success: false, error: 'companyId and groupName are required' }, { status: 400 });
    }

    const cleanGroupName = groupName.trim();
    const names: string[] = partyNames && Array.isArray(partyNames) ? partyNames : (partyName ? [partyName] : []);

    if (names.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one ledger / party must be selected' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    // 1. Batch upsert in ledger_groups collection
    for (const name of names) {
      // Find actual party document to get correct casing
      const existingParty = await db.collection('party_balances').findOne({
        companyId,
        partyName: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      const canonicalName = existingParty ? existingParty.partyName : name.trim();

      await db.collection('ledger_groups').updateOne(
        { companyId, partyName: canonicalName },
        {
          $set: {
            companyId,
            groupName: cleanGroupName,
            partyName: canonicalName,
            updatedAt: now
          },
          $setOnInsert: {
            createdAt: now
          }
        },
        { upsert: true }
      );

      // Update party_balances collection
      await db.collection('party_balances').updateMany(
        {
          companyId,
          partyName: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        },
        {
          $set: {
            isGrouped: true,
            groupName: cleanGroupName
          }
        }
      );
    }

    // Invalidate company cache
    await invalidateCompanyCache(companyId);

    return NextResponse.json({
      success: true,
      message: `${names.length} ledger(s) successfully assigned to group "${cleanGroupName}"`
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove party from group or delete entire group
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const groupName = searchParams.get('groupName');
    const partyName = searchParams.get('partyName');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    if (partyName) {
      // Remove specific party from group
      await Promise.all([
        db.collection('ledger_groups').deleteMany({ companyId, partyName }),
        db.collection('party_balances').updateMany(
          { companyId, partyName },
          {
            $unset: {
              isGrouped: "",
              groupName: ""
            }
          }
        )
      ]);
      await invalidateCompanyCache(companyId);
      return NextResponse.json({ success: true, message: `Removed "${partyName}" from its group` });
    }

    if (groupName) {
      // Delete entire group
      await Promise.all([
        db.collection('ledger_groups').deleteMany({ companyId, groupName }),
        db.collection('party_balances').updateMany(
          { companyId, groupName },
          {
            $unset: {
              isGrouped: "",
              groupName: ""
            }
          }
        )
      ]);
      await invalidateCompanyCache(companyId);
      return NextResponse.json({ success: true, message: `Group "${groupName}" deleted successfully` });
    }

    return NextResponse.json({ success: false, error: 'Either groupName or partyName is required' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
