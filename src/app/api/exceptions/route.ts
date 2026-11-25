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
      const debitLines = (v.lines || []).filter((l: any) => (l.debit || 0) > 0);
      const creditLines = (v.lines || []).filter((l: any) => (l.credit || 0) > 0);

      const debitAccounts = debitLines.map((l: any) => l.account).filter(Boolean);
      const creditAccounts = creditLines.map((l: any) => l.account).filter(Boolean);

      const totalDr = debitLines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
      const totalCr = creditLines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
      const vAmount = Math.max(totalDr, totalCr);

      const drPartyText = debitAccounts.join(', ') || v.primaryParty || 'Debit Account';
      const crPartyText = creditAccounts.join(', ') || 'Credit Account';

      return {
        id: v._id.toString(),
        date: v.date,
        dateStr: v.dateStr,
        branchId: v.branchId,
        branchName: v.branchName,
        branchCode: v.branchCode,
        voucherType: v.voucherType,
        voucherNo: v.voucherNo || '-',
        primaryParty: drPartyText,
        counterAccount: crPartyText,
        debitAccount: drPartyText,
        creditAccount: crPartyText,
        amount: Math.round(vAmount * 100) / 100,
        debit: Math.round(totalDr * 100) / 100,
        credit: Math.round(totalCr * 100) / 100,
        bothSidesIgnored: true,
        affectedAccounts: Array.from(new Set([...debitAccounts, ...creditAccounts])),
        ignoredAt: v.ignoredAt,
        ignoredReason: v.ignoredReason || 'Marked as incorrect by user (Both Dr & Cr ignored)',
        lines: v.lines
      };
    });

    if (search) {
      items = items.filter(i =>
        i.primaryParty.toLowerCase().includes(search) ||
        i.counterAccount.toLowerCase().includes(search) ||
        i.voucherNo.toLowerCase().includes(search) ||
        (i.branchName && i.branchName.toLowerCase().includes(search)) ||
        (i.voucherType && i.voucherType.toLowerCase().includes(search)) ||
        i.affectedAccounts.some(acc => acc.toLowerCase().includes(search))
      );
    }

    const totalIgnoredAmount = items.reduce((s, i) => s + (i.amount || 0), 0);
    const totalIgnoredDebit = items.reduce((s, i) => s + (i.debit || 0), 0);
    const totalIgnoredCredit = items.reduce((s, i) => s + (i.credit || 0), 0);

    return NextResponse.json({
      success: true,
      totalExceptions: items.length,
      totalIgnoredAmount: Math.round(totalIgnoredAmount * 100) / 100,
      totalIgnoredDebit: Math.round(totalIgnoredDebit * 100) / 100,
      totalIgnoredCredit: Math.round(totalIgnoredCredit * 100) / 100,
      isBalanced: Math.abs(totalIgnoredDebit - totalIgnoredCredit) < 0.01,
      exceptions: items
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
