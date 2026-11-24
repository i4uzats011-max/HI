import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'matrix';
    const companyId = searchParams.get('companyId');
    const partyName = searchParams.get('partyName');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const company = await db.collection('companies').findOne({ _id: new (require('mongodb').ObjectId)(companyId) }).catch(() => null);
    const companyName = company?.name || 'Company';

    const wb = XLSX.utils.book_new();

    if (type === 'matrix') {
      const branches = await db.collection('branches').find({ companyId }).sort({ createdAt: 1 }).toArray();
      const balances = await db.collection('party_balances').find({ companyId }).toArray();

      const branchMap = new Map<string, string>();
      branches.forEach(b => branchMap.set(b._id.toString(), b.name));

      const matrixMap = new Map<string, any>();
      for (const b of balances) {
        const pName = b.partyName;
        if (!matrixMap.has(pName)) {
          matrixMap.set(pName, { partyName: pName, branchNets: {}, totalDebit: 0, totalCredit: 0 });
        }
        const item = matrixMap.get(pName)!;
        item.branchNets[b.branchId] = b.netBalance || 0;
        item.totalDebit += (b.totalDebit || 0);
        item.totalCredit += (b.totalCredit || 0);
      }

      const rows = Array.from(matrixMap.values()).map(p => {
        const net = Math.round((p.totalDebit - p.totalCredit) * 100) / 100;
        const row: any = {
          'Party Name / लेजर नाम': p.partyName,
        };
        for (const b of branches) {
          const bNet = p.branchNets[b._id.toString()] || 0;
          row[`${b.name} (Balance)`] = bNet === 0 ? '0.00' : (bNet > 0 ? `${bNet.toFixed(2)} Dr` : `${Math.abs(bNet).toFixed(2)} Cr`);
        }
        row['Consolidated Debit (कुल नाम)'] = p.totalDebit.toFixed(2);
        row['Consolidated Credit (कुल जमा)'] = p.totalCredit.toFixed(2);
        row['Net Balance (कुल बाकी)'] = net === 0 ? '0.00 NIL' : (net > 0 ? `${net.toFixed(2)} Dr (लेना है)` : `${Math.abs(net).toFixed(2)} Cr (देना है)`);
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Party Matrix');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="${encodeURIComponent(companyName)}_Reconciliation_Matrix.xlsx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    }

    if (type === 'ledger' && partyName) {
      const vouchers = await db.collection('vouchers').find({ companyId, "lines.account": partyName }).sort({ date: 1 }).toArray();

      let running = 0;
      const rows = vouchers.map(v => {
        let vDr = 0;
        let vCr = 0;
        const counters: string[] = [];
        for (const l of v.lines) {
          if (l.account === partyName) {
            vDr += (l.debit || 0);
            vCr += (l.credit || 0);
          } else {
            counters.push(l.account);
          }
        }
        running += (vDr - vCr);
        return {
          'Date': v.dateStr || '',
          'Branch': v.branchName || '',
          'Voucher Type': v.voucherType || '',
          'Voucher No': v.voucherNo || '',
          'Particulars': counters.slice(0, 3).join(', ') || v.narration || '',
          'Debit (Dr)': vDr > 0 ? vDr.toFixed(2) : '',
          'Credit (Cr)': vCr > 0 ? vCr.toFixed(2) : '',
          'Running Balance': Math.abs(running).toFixed(2) + (running >= 0 ? ' Dr' : ' Cr'),
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Ledger Statement');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="${encodeURIComponent(partyName)}_Ledger.xlsx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid export type' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
