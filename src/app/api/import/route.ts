import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { parseDayBookContent, ParsedVoucher } from '@/lib/tallyParser';
import fs from 'fs';
import path from 'path';

export const maxDuration = 120; // 2 minutes for large files
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let companyId = '';
    let branchId = '';
    let clearExisting = true;
    let fileContent = '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      companyId = body.companyId;
      branchId = body.branchId;
      clearExisting = body.clearExisting !== false;

      if (body.useSampleFile) {
        const samplePath = path.join(process.cwd(), 'DayBook.txt');
        if (!fs.existsSync(samplePath)) {
          return NextResponse.json({ success: false, error: 'DayBook.txt sample file not found on server' }, { status: 404 });
        }
        fileContent = fs.readFileSync(samplePath, 'latin1');
      } else if (body.fileContent) {
        fileContent = body.fileContent;
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      companyId = formData.get('companyId') as string;
      branchId = formData.get('branchId') as string;
      clearExisting = formData.get('clearExisting') !== 'false';

      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }
      const buffer = await file.arrayBuffer();
      // Decode as latin1 or utf8
      const decoder = new TextDecoder('latin1');
      fileContent = decoder.decode(buffer);
    }

    if (!companyId || !branchId) {
      return NextResponse.json({ success: false, error: 'Company and Branch must be selected' }, { status: 400 });
    }

    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'File content is empty' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Verify company and branch exist
    const [company, branch] = await Promise.all([
      db.collection('companies').findOne({ _id: new (require('mongodb').ObjectId)(companyId) }).catch(() => null),
      db.collection('branches').findOne({ _id: new (require('mongodb').ObjectId)(branchId) }).catch(() => null)
    ]);

    const companyName = company?.name || 'Company';
    const branchName = branch?.name || 'Branch';

    // Parse the file
    const parseResult = parseDayBookContent(fileContent);
    const { vouchers, totalDebits, totalCredits } = parseResult;

    if (vouchers.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid vouchers found in the uploaded file' }, { status: 400 });
    }

    // If clearExisting is true, clear this branch's data first
    if (clearExisting) {
      await Promise.all([
        db.collection('vouchers').deleteMany({ branchId }),
        db.collection('party_balances').deleteMany({ branchId })
      ]);
    }

    // Prepare vouchers with metadata
    const vouchersToInsert = vouchers.map((v) => ({
      ...v,
      companyId,
      companyName,
      branchId,
      branchName,
      createdAt: new Date()
    }));

    // Batch insert vouchers in chunks of 1000
    const chunkSize = 1000;
    for (let i = 0; i < vouchersToInsert.length; i += chunkSize) {
      const chunk = vouchersToInsert.slice(i, i + chunkSize);
      await db.collection('vouchers').insertMany(chunk, { ordered: false });
    }

    // Aggregate party balances and voucher counts for this branch
    const partyMap = new Map<string, {
      partyName: string;
      totalDebit: number;
      totalCredit: number;
      voucherTypes: { [vType: string]: { count: number; debit: number; credit: number } };
      voucherCount: number;
    }>();

    const voucherTypeSummary: { [vType: string]: { count: number; debit: number; credit: number } } = {};

    for (const v of vouchers) {
      const vType = v.voucherType || 'Other';
      if (!voucherTypeSummary[vType]) {
        voucherTypeSummary[vType] = { count: 0, debit: 0, credit: 0 };
      }
      voucherTypeSummary[vType].count++;

      for (const line of v.lines) {
        if (!line.account) continue;
        const acct = line.account.trim();
        voucherTypeSummary[vType].debit += line.debit;
        voucherTypeSummary[vType].credit += line.credit;

        let entry = partyMap.get(acct);
        if (!entry) {
          entry = {
            partyName: acct,
            totalDebit: 0,
            totalCredit: 0,
            voucherTypes: {},
            voucherCount: 0
          };
          partyMap.set(acct, entry);
        }

        entry.totalDebit += line.debit;
        entry.totalCredit += line.credit;
        entry.voucherCount++;

        if (!entry.voucherTypes[vType]) {
          entry.voucherTypes[vType] = { count: 0, debit: 0, credit: 0 };
        }
        entry.voucherTypes[vType].count++;
        entry.voucherTypes[vType].debit += line.debit;
        entry.voucherTypes[vType].credit += line.credit;
      }
    }

    // Prepare party balance documents
    const partyDocs = Array.from(partyMap.values()).map(p => {
      const netBalance = Math.round((p.totalDebit - p.totalCredit) * 100) / 100;
      return {
        companyId,
        companyName,
        branchId,
        branchName,
        partyName: p.partyName,
        totalDebit: Math.round(p.totalDebit * 100) / 100,
        totalCredit: Math.round(p.totalCredit * 100) / 100,
        netBalance,
        status: netBalance > 0.01 ? 'Dr' : (netBalance < -0.01 ? 'Cr' : 'Nil'),
        voucherCount: p.voucherCount,
        voucherTypes: p.voucherTypes,
        updatedAt: new Date()
      };
    });

    for (let i = 0; i < partyDocs.length; i += chunkSize) {
      const chunk = partyDocs.slice(i, i + chunkSize);
      await db.collection('party_balances').insertMany(chunk, { ordered: false });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalVouchers: vouchers.length,
        totalDebits,
        totalCredits,
        totalParties: partyDocs.length,
        branchName,
        companyName,
        voucherTypesBreakdown: voucherTypeSummary
      }
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
