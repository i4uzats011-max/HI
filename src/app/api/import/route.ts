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
  // 2. UTF-16 LE with BOM (0xFF, 0xFE)
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes.slice(2));
  }
  // 3. UTF-16 BE with BOM (0xFE, 0xFF)
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

/**
 * GET: Lists all available sample data files in data/ directory and root
 */
export async function GET() {
  try {
    const sampleFiles: Array<{ name: string; size: string; type: string; path: string }> = [];

    // Scan data/ directory
    const dataDir = path.join(process.cwd(), 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        if (file.endsWith('.txt') || file.endsWith('.csv') || file.endsWith('.xml')) {
          const stats = fs.statSync(path.join(dataDir, file));
          const sizeKb = stats.size / 1024;
          const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
          const type = file.endsWith('.xml') ? 'Tally XML' : (file.endsWith('.csv') ? 'Tally CSV' : 'Tally TXT');
          sampleFiles.push({ name: file, size: sizeStr, type, path: `data/${file}` });
        }
      }
    }

    // Check root DayBook files
    const rootFiles = ['DayBook.CSV', 'DayBook.txt'];
    for (const rf of rootFiles) {
      const p = path.join(process.cwd(), rf);
      if (fs.existsSync(p)) {
        const stats = fs.statSync(p);
        const sizeKb = stats.size / 1024;
        const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
        sampleFiles.push({ name: rf, size: sizeStr, type: 'DayBook Register', path: rf });
      }
    }

    return NextResponse.json({ success: true, files: sampleFiles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: Imports Tally data (.xml, .txt, .csv) with voucher-wise double-entry verification.
 * If Debit == Credit -> Imported into database.
 * If Debit != Credit -> Ignored for accounting, saved to exceptions report.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let companyId = '';
    let branchId = '';
    let clearExisting = true;
    let fileContent = '';
    let fileName = '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      companyId = body.companyId;
      branchId = body.branchId;
      clearExisting = body.clearExisting !== false;

      if (body.sampleFileName) {
        // Specific sample file selected from data/ or root
        fileName = body.sampleFileName;
        let samplePath = path.join(process.cwd(), 'data', body.sampleFileName);
        if (!fs.existsSync(samplePath)) {
          samplePath = path.join(process.cwd(), body.sampleFileName);
        }
        if (!fs.existsSync(samplePath)) {
          return NextResponse.json({ success: false, error: `नमूना फ़ाइल नहीं मिली: ${body.sampleFileName}` }, { status: 404 });
        }
        const rawBuf = fs.readFileSync(samplePath);
        fileContent = decodeUploadedBuffer(rawBuf);
      } else if (body.useSampleFile) {
        let samplePath = path.join(process.cwd(), 'DayBook.CSV');
        if (!fs.existsSync(samplePath)) {
          samplePath = path.join(process.cwd(), 'DayBook.txt');
        }
        if (!fs.existsSync(samplePath)) {
          return NextResponse.json({ success: false, error: 'DayBook file not found on server' }, { status: 404 });
        }
        fileName = path.basename(samplePath);
        const rawBuf = fs.readFileSync(samplePath);
        fileContent = decodeUploadedBuffer(rawBuf);
      } else if (body.fileContent) {
        fileContent = body.fileContent;
        fileName = body.fileName || 'uploaded_content';
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      companyId = formData.get('companyId') as string;
      branchId = formData.get('branchId') as string;
      clearExisting = formData.get('clearExisting') !== 'false';

      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ success: false, error: 'कोई फ़ाइल अपलोड नहीं की गई' }, { status: 400 });
      }
      fileName = file.name;
      const buffer = await file.arrayBuffer();
      fileContent = decodeUploadedBuffer(buffer);
    }

    if (!companyId || !branchId) {
      return NextResponse.json({ success: false, error: 'कृपया कंपनी और ब्रांच दोनों चुनें' }, { status: 400 });
    }

    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'फ़ाइल की सामग्री खाली है (File content is empty)' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const [company, branch] = await Promise.all([
      db.collection('companies').findOne({ _id: new (require('mongodb').ObjectId)(companyId) }).catch(() => null),
      db.collection('branches').findOne({ _id: new (require('mongodb').ObjectId)(branchId) }).catch(() => null)
    ]);

    const companyName = company?.name || 'Company';
    const branchName = branch?.name || 'Branch';
    const branchCode = (branch?.code || '').trim().toUpperCase();

    // Parse content voucher-wise with strict double-entry verification
    const parseResult = parseDayBookContent(fileContent);
    const { vouchers, unbalancedVouchers, totalDebits, totalCredits, delimiter } = parseResult;

    if (vouchers.length === 0 && unbalancedVouchers.length === 0) {
      const sampleLines = fileContent.split(/\r?\n|\r/).filter(l => l.trim().length > 0).slice(0, 3).join(' | ');
      return NextResponse.json({
        success: false,
        error: `फ़ाइल में कोई मान्य वाउचर नहीं मिला। कृपया सुनिश्चित करें कि फ़ाइल Tally DayBook .TXT, .CSV या .XML फॉर्मेट में है। (प्रारंभिक पंक्तियाँ: ${sampleLines.slice(0, 90)}...)`
      }, { status: 400 });
    }

    // Clear existing vouchers/balances for this branch if requested
    if (clearExisting) {
      await Promise.all([
        db.collection('vouchers').deleteMany({ branchId }),
        db.collection('party_balances').deleteMany({ branchId })
      ]);
    }

    // 1. Prepare valid balanced vouchers for insertion
    const vouchersToInsert = vouchers.map((v) => ({
      ...v,
      companyId,
      companyName,
      branchId,
      branchName,
      branchCode,
      isIgnored: false,
      sourceFile: fileName,
      createdAt: new Date()
    }));

    // 2. Prepare unbalanced vouchers (Debit != Credit): marked as ignored and saved for the exceptions report
    const unbalancedToInsert = unbalancedVouchers.map((uv) => ({
      date: parseResult.vouchers[0]?.date || new Date(),
      dateStr: uv.dateStr,
      voucherType: uv.voucherType,
      voucherNo: uv.voucherNo,
      primaryParty: uv.primaryParty,
      lines: uv.lines,
      narration: uv.reason,
      companyId,
      companyName,
      branchId,
      branchName,
      branchCode,
      isIgnored: true,
      bothSidesIgnored: true,
      isUnbalancedOnImport: true,
      ignoredAt: new Date(),
      ignoredReason: uv.reason,
      sourceFile: fileName,
      createdAt: new Date()
    }));

    // Batch insert vouchers in chunks of 1000
    const chunkSize = 1000;
    const allToInsert = [...vouchersToInsert, ...unbalancedToInsert];
    for (let i = 0; i < allToInsert.length; i += chunkSize) {
      const chunk = allToInsert.slice(i, i + chunkSize);
      await db.collection('vouchers').insertMany(chunk, { ordered: false });
    }

    // Aggregate party balances and voucher counts ONLY from valid, non-ignored vouchers
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
      branchMappingMap.set(m.partyName, m);
    });

    const groupMappingMap = new Map<string, string>();
    groupMappings.forEach(g => {
      groupMappingMap.set(g.partyName, g.groupName);
    });

    let autoAppliedBranchCount = 0;
    let autoAppliedGroupCount = 0;

    // Prepare party balance documents
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
        isBranchAccount: !!bMap,
        mappedBranchCode: bMap ? (bMap.targetBranchCode || '') : '',
        targetBranchId: bMap ? (bMap.targetBranchId || '') : '',
        targetBranchName: bMap ? (bMap.targetBranchName || '') : '',
        isGrouped: !!grpName,
        groupName: grpName || '',
        updatedAt: new Date()
      };
    });

    // Bulk upsert party balances
    if (partyDocs.length > 0) {
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
    }

    // Invalidate company cache
    await invalidateCompanyCache(companyId);

    const message = unbalancedVouchers.length > 0
      ? `इम्पोर्ट संपन्न: ${vouchers.length} संतुलित वाउचर्स इम्पोर्ट हुए। ${unbalancedVouchers.length} असंतुलित एंट्रीज (Dr ≠ Cr) को स्वतः इग्नोर कर अपवाद रिपोर्ट में दर्ज किया गया।`
      : `सफलतापूर्वक इम्पोर्ट: सभी ${vouchers.length} वाउचर्स 100% संतुलित (Dr = Cr) पाए गए और सुरक्षित रूप से सेव हुए।`;

    return NextResponse.json({
      success: true,
      summary: {
        totalVouchers: vouchers.length,
        unbalancedCount: unbalancedVouchers.length,
        unbalancedReport: unbalancedVouchers.slice(0, 100), // First 100 for report
        totalDebits: Math.round(totalDebits * 100) / 100,
        totalCredits: Math.round(totalCredits * 100) / 100,
        totalParties: partyDocs.length,
        branchName,
        companyName,
        sourceFile: fileName,
        autoAppliedBranchCount,
        autoAppliedGroupCount,
        voucherTypesBreakdown: voucherTypeSummary,
        message
      }
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
