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

    const setObj: any = {
      isIgnored: isIgnored !== false,
      ignoredAt: isIgnored !== false ? new Date() : null,
      ignoredReason: isIgnored !== false ? (reason || 'Marked as incorrect / ignored by user') : null
    };

    await db.collection('vouchers').updateOne({ _id: vId }, { $set: setObj });

    // Recalculate party balances for the parties in this voucher
    const affectedParties = voucher.lines.map((l: any) => l.account).filter(Boolean);
    const companyId = voucher.companyId;
    const branchId = voucher.branchId;

    for (const party of affectedParties) {
      // Find all active (non-ignored) vouchers for this party in this branch
      const activeVouchers = await db.collection('vouchers').find({
        companyId,
        branchId,
        "lines.account": party,
        isIgnored: { $ne: true }
      }).toArray();

      let totalDr = 0;
      let totalCr = 0;
      const vTypes: { [vt: string]: { count: number; debit: number; credit: number } } = {};

      for (const v of activeVouchers) {
        const vt = v.voucherType || 'Other';
        if (!vTypes[vt]) vTypes[vt] = { count: 0, debit: 0, credit: 0 };
        vTypes[vt].count++;

        for (const line of v.lines) {
          if (line.account === party) {
            totalDr += (line.debit || 0);
            totalCr += (line.credit || 0);
            vTypes[vt].debit += (line.debit || 0);
            vTypes[vt].credit += (line.credit || 0);
          }
        }
      }

      const net = Math.round((totalDr - totalCr) * 100) / 100;
      await db.collection('party_balances').updateOne(
        { companyId, branchId, partyName: party },
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
    }

    // Invalidate company cache
    await invalidateCompanyCache(companyId);

    return NextResponse.json({
      success: true,
      message: isIgnored !== false
        ? 'Entry marked as ignored and moved to Exceptions Report'
        : 'Entry restored back to regular ledger'
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
