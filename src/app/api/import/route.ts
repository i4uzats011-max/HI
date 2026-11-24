import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { parseDayBookContent } from '@/lib/tallyParser';
import fs from 'fs';
import path from 'path';

export const maxDuration = 120;
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
        let samplePath = path.join(process.cwd(), 'DayBook.CSV');
        if (!fs.existsSync(samplePath)) {
          samplePath = path.join(process.cwd(), 'DayBook.txt');
        }
        if (!fs.existsSync(samplePath)) {
          return NextResponse.json({ success: false, error: 'DayBook file not found on server' }, { status: 404 });
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

    const [company, branch] = await Promise.all([
      db.collection('companies').findOne({ _id: new (require('mongodb').ObjectId)(companyId) }).catch(() => null),
      db.collection('branches').findOne({ _id: new (require('mongodb').ObjectId)(branchId) }).catch(() => null)
    ]);

    const companyName = company?.name || 'Company';
    const branchName = branch?.name || 'Branch';

    // Parse DayBook content with exact single-entry rules
    const parseResult = parseDayBookContent(fileContent);
    const { vouchers, totalDebits, totalCredits } = parseResult;

    if (vouchers.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid vouchers found in the uploaded file' }, { status: 400 });
    }

    // Clear existing vouchers/balances for this branch if requested
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
