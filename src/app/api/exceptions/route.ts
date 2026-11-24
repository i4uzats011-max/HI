import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const query: any = {
      companyId,
      isIgnored: true
    };

    if (branchId && branchId !== 'all') {
      query.branchId = branchId;
    }

    const ignoredVouchers = await db.collection('vouchers').find(query).sort({ ignoredAt: -1, date: -1 }).toArray();

    let items = ignoredVouchers.map(v => {
      const primaryLine = v.lines?.[0] || {};
      const counterLine = v.lines?.[1] || {};

      return {
        id: v._id.toString(),
        date: v.date,
        dateStr: v.dateStr,
        branchId: v.branchId,
        branchName: v.branchName,
        voucherType: v.voucherType,
        voucherNo: v.voucherNo || '-',
        primaryParty: v.primaryParty || primaryLine.account || '',
        counterAccount: counterLine.account || '',
        amount: Math.abs(primaryLine.amount || primaryLine.debit || primaryLine.credit || 0),
        debit: primaryLine.debit || 0,
        credit: primaryLine.credit || 0,
        ignoredAt: v.ignoredAt,
        ignoredReason: v.ignoredReason || 'Marked as incorrect by user',
        lines: v.lines
      };
    });

    if (search) {
      items = items.filter(i =>
        i.primaryParty.toLowerCase().includes(search) ||
        i.counterAccount.toLowerCase().includes(search) ||
        i.voucherNo.toLowerCase().includes(search) ||
        i.branchName.toLowerCase().includes(search) ||
        i.voucherType.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      totalExceptions: items.length,
      exceptions: items
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
