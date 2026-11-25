import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { parseDayBookContent } from '@/lib/tallyParser';
import { invalidateCompanyCache } from '@/lib/cache';
import fs from 'fs';
import path from 'path';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

function decodeUploadedBuffer(buffer: ArrayBuffer | Buffer): string {
  const bytes = buffer instanceof Buffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  if (bytes.length === 0) return '';

  // 1. UTF-8 with BOM (0xEF, 0xBB, 0xBF)
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(bytes.slice(3));
  }
  // 2. UTF-16 LE (0xFF, 0xFE)
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes.slice(2));
  }
  // 3. UTF-16 BE (0xFE, 0xFF)
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(bytes.slice(2));
  }
  // 4. UTF-16 LE without BOM (common in Windows Notepad when null bytes alternate)
  if (bytes.length >= 4 && bytes[1] === 0x00 && bytes[3] === 0x00) {
    return new TextDecoder('utf-16le').decode(bytes);
  }

  // 5. Try UTF-8 (strict)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // 6. Fallback to latin1 / windows-1252
    return new TextDecoder('latin1').decode(bytes);
  }
}

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
        let samplePath = path.join(process.cwd(), 'DayBook.CSV');
        if (!fs.existsSync(samplePath)) {
          samplePath = path.join(process.cwd(), 'DayBook.txt');
        }
        if (!fs.existsSync(samplePath)) {
          return NextResponse.json({ success: false, error: 'DayBook file not found on server' }, { status: 404 });
        }
        const rawBuf = fs.readFileSync(samplePath);
        fileContent = decodeUploadedBuffer(rawBuf);
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
      fileContent = decodeUploadedBuffer(buffer);
    }

    if (!companyId || !branchId) {
      return NextResponse.json({ success: false, error: 'Company and Branch must be selected' }, { status: 400 });
    }

    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'File content is empty' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const [company, branch] = await Promise.all([
      db.collection('companies').findOne({ _id: new (require('mongodb').ObjectId)(companyId) }).catch(() => null),
      db.collection('branches').findOne({ _id: new (require('mongodb').ObjectId)(branchId) }).catch(() => null)
    ]);

    const companyName = company?.name || 'Company';
    const branchName = branch?.name || 'Branch';
    const branchCode = (branch?.code || '').trim().toUpperCase();

    // Parse DayBook content with exact double-entry rules
    const parseResult = parseDayBookContent(fileContent);
    const { vouchers, totalDebits, totalCredits, delimiter } = parseResult;

    if (vouchers.length === 0) {
      const sampleLines = fileContent.split(/\r?\n|\r/).filter(l => l.trim().length > 0).slice(0, 3).join(' | ');
      return NextResponse.json({
        success: false,
        error: `फ़ाइल में कोई मान्य वाउचर नहीं मिला (No valid vouchers found). कृपया सुनिश्चित करें कि फ़ाइल Tally DayBook CSV/TXT फॉर्मेट में है। (प्रारंभिक पंक्तियाँ: ${sampleLines.slice(0, 90)}...)`
      }, { status: 400 });
    }

    // Clear existing vouchers/balances for this branch if requested
    if (clearExisting) {
      await Promise.all([
        db.collection('vouchers').deleteMany({ branchId }),
        db.collection('party_balances').deleteMany({ branchId })
      ]);
    }

    // Prepare vouchers with metadata including branchCode
    const vouchersToInsert = vouchers.map((v) => ({
      ...v,
      companyId,
      companyName,
      branchId,
      branchName,
      branchCode,
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

    // Fetch persistent rules for this company: Branch mappings and Group mappings
    const [branchMappings, groupMappings] = await Promise.all([
      db.collection('branch_ledger_mappings').find({ companyId }).toArray(),
      db.collection('ledger_groups').find({ companyId }).toArray()
    ]);

    const branchMappingMap = new Map<string, any>();
    branchMappings.forEach(m => {
      branchMappingMap.set(`${m.branchId}_${m.partyName}`, m);
      branchMappingMap.set(m.partyName, m); // Fallback company-wide
    });

    const groupMappingMap = new Map<string, string>();
    groupMappings.forEach(g => {
      groupMappingMap.set(g.partyName, g.groupName);
    });

    let autoAppliedBranchCount = 0;
    let autoAppliedGroupCount = 0;

    // Prepare party balance documents with persistent rules auto-attached
    const partyDocs = Array.from(partyMap.values()).map(p => {
      const netBalance = Math.round((p.totalDebit - p.totalCredit) * 100) / 100;
      
      const bMap = branchMappingMap.get(`${branchId}_${p.partyName}`) || branchMappingMap.get(p.partyName);
      const grpName = groupMappingMap.get(p.partyName);

      if (bMap) autoAppliedBranchCount++;
      if (grpName) autoAppliedGroupCount++;

      return {
        companyId,
        companyName,
        branchId,
        branchName,
        branchCode,
        partyName: p.partyName,
        totalDebit: Math.round(p.totalDebit * 100) / 100,
        totalCredit: Math.round(p.totalCredit * 100) / 100,
        netBalance,
        status: netBalance > 0.01 ? 'Dr' : (netBalance < -0.01 ? 'Cr' : 'Nil'),
        voucherCount: p.voucherCount,
        voucherTypes: p.voucherTypes,
        // Auto-attached from persistent branch declarations
        isBranchAccount: !!bMap,
        mappedBranchCode: bMap ? (bMap.targetBranchCode || '') : '',
        targetBranchId: bMap ? (bMap.targetBranchId || '') : '',
        targetBranchName: bMap ? (bMap.targetBranchName || '') : '',
        // Auto-attached from persistent ledger groups
        isGrouped: !!grpName,
        groupName: grpName || '',
        updatedAt: new Date()
      };
    });

    // Bulk upsert party balances to safely avoid duplicate key errors
    const bulkOps = partyDocs.map(doc => ({
      updateOne: {
        filter: { companyId: doc.companyId, branchId: doc.branchId, partyName: doc.partyName },
        update: { $set: doc },
        upsert: true
      }
    }));

    for (let i = 0; i < bulkOps.length; i += chunkSize) {
      const chunk = bulkOps.slice(i, i + chunkSize);
      await db.collection('party_balances').bulkWrite(chunk, { ordered: false });
    }

    // Invalidate caches for this company so all new data reflects immediately
    await invalidateCompanyCache(companyId);

    return NextResponse.json({
      success: true,
      summary: {
        totalVouchers: vouchers.length,
        totalDebits,
        totalCredits,
        totalParties: partyDocs.length,
        branchName,
        companyName,
        autoAppliedBranchCount,
        autoAppliedGroupCount,
        voucherTypesBreakdown: voucherTypeSummary
      }
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
