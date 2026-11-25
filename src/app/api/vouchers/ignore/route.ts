import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { invalidateCompanyCache } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    const { voucherId, isIgnored, reason } = await req.json();

    if (!voucherId) {
      return NextResponse.json({ success: false, error: 'voucherId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const vId = new ObjectId(voucherId);

    const voucher = await db.collection('vouchers').findOne({ _id: vId });
    if (!voucher) {
      return NextResponse.json({ success: false, error: 'Voucher not found' }, { status: 404 });
    }

    const shouldIgnore = isIgnored !== false;

    const setObj: any = {
      isIgnored: shouldIgnore,
      ignoredAt: shouldIgnore ? new Date() : null,
      ignoredReason: shouldIgnore ? (reason || 'Marked as incorrect / ignored by user') : null
    };

    await db.collection('vouchers').updateOne({ _id: vId }, { $set: setObj });

    // Double-Entry Effect: Extract ALL accounts in this voucher (Both Debit side accounts AND Credit side accounts)
    const rawParties: string[] = (voucher.lines || []).map((l: any) => (l.account || '').trim()).filter(Boolean);
    const affectedParties: string[] = Array.from(new Set(rawParties));
    const companyId = voucher.companyId;
    const branchId = voucher.branchId;

    // Branches to recalculate: primary branchId and targetBranchId if present
    const branchIdsToUpdate = Array.from(new Set([branchId, voucher.targetBranchId].filter(Boolean)));

    for (const bId of branchIdsToUpdate) {
      for (const party of affectedParties) {
        const partyRegex = new RegExp(`^${party.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

        // Find all active (non-ignored) vouchers for this party in this branch
        const activeVouchers = await db.collection('vouchers').find({
          companyId,
          branchId: bId,
          "lines.account": { $regex: partyRegex },
          isIgnored: { $ne: true }
        }).toArray();

        let totalDr = 0;
        let totalCr = 0;
        const vTypes: { [vt: string]: { count: number; debit: number; credit: number } } = {};

        for (const v of activeVouchers) {
          const vt = v.voucherType || 'Other';
          if (!vTypes[vt]) vTypes[vt] = { count: 0, debit: 0, credit: 0 };
          vTypes[vt].count++;

          for (const line of (v.lines || [])) {
            const lineAcct = (line.account || '').trim();
            if (lineAcct.toLowerCase() === party.toLowerCase()) {
              totalDr += (line.debit || 0);
              totalCr += (line.credit || 0);
              vTypes[vt].debit += (line.debit || 0);
              vTypes[vt].credit += (line.credit || 0);
            }
          }
        }

        const net = Math.round((totalDr - totalCr) * 100) / 100;

        // Update party_balances for this account
        const updateResult = await db.collection('party_balances').updateOne(
          {
            companyId,
            branchId: bId,
            partyName: { $regex: partyRegex }
          },
          {
            $set: {
              totalDebit: Math.round(totalDr * 100) / 100,
              totalCredit: Math.round(totalCr * 100) / 100,
              netBalance: net,
              status: net > 0.01 ? 'Dr' : (net < -0.01 ? 'Cr' : 'Nil'),
              voucherCount: activeVouchers.length,
              voucherTypes: vTypes,
              updatedAt: new Date()
            }
          }
        );

        // If no document matched the regex, ensure an upserted record exists
        if (updateResult.matchedCount === 0) {
          await db.collection('party_balances').updateOne(
            { companyId, branchId: bId, partyName: party },
            {
              $set: {
                companyId,
                branchId: bId,
                partyName: party,
                branchName: voucher.branchName || '',
                branchCode: voucher.branchCode || '',
                totalDebit: Math.round(totalDr * 100) / 100,
                totalCredit: Math.round(totalCr * 100) / 100,
                netBalance: net,
                status: net > 0.01 ? 'Dr' : (net < -0.01 ? 'Cr' : 'Nil'),
                voucherCount: activeVouchers.length,
                voucherTypes: vTypes,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          );
        }
      }
    }

    // Invalidate company cache completely so matrix, ledger details, groups and reports are instantly fresh
    await invalidateCompanyCache(companyId);

    return NextResponse.json({
      success: true,
      message: shouldIgnore
        ? `एंट्री को इग्नोर कर दिया गया। दोनों खातों (${affectedParties.join(' व ')}) से इसका पूरा डेबिट और क्रेडिट प्रभाव हटा दिया गया है।`
        : `एंट्री को पुनः शामिल कर दिया गया। दोनों खातों (${affectedParties.join(' व ')}) में इसका प्रभाव बहाल हो गया है।`,
      affectedAccounts: affectedParties
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
