import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const branch1Id = searchParams.get('branch1Id');
    const branch2Id = searchParams.get('branch2Id');
    const statusFilter = searchParams.get('statusFilter') || 'mismatch_only'; // 'mismatch_only', 'all', 'matched_only'
    const typeFilter = searchParams.get('typeFilter') || 'all'; // 'all', 'payment_receipt', 'sale_purchase', 'journal_other'
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const branches = await db.collection('branches').find({ companyId }).toArray();
    const branchMap = new Map<string, any>();
    branches.forEach(b => branchMap.set(b._id.toString(), b));

    let b1 = branch1Id ? branchMap.get(branch1Id) : branches[0];
    let b2 = branch2Id ? branchMap.get(branch2Id) : (branches.length > 1 ? branches[1] : null);

    if (!b1 || !b2 || b1._id.toString() === b2._id.toString()) {
      return NextResponse.json({
        success: true,
        branches: branches.map(b => ({ id: b._id.toString(), name: b.name, code: b.code })),
        message: 'Please select 2 different branches to perform inter-branch reconciliation'
      });
    }

    const b1Id = b1._id.toString();
    const b2Id = b2._id.toString();
    const b1Code = (b1.code || '').trim().toUpperCase();
    const b2Code = (b2.code || '').trim().toUpperCase();

    // 1. Fetch persistent branch ledger mappings
    const mappings = await db.collection('branch_ledger_mappings').find({ companyId }).toArray();
    const b1MappedToB2 = mappings.filter(m =>
      (m.branchId === b1Id || m.branchId === 'all') &&
      (m.targetBranchId === b2Id || (b2Code && (m.targetBranchCode || '').trim().toUpperCase() === b2Code))
    );
    const b2MappedToB1 = mappings.filter(m =>
      (m.branchId === b2Id || m.branchId === 'all') &&
      (m.targetBranchId === b1Id || (b1Code && (m.targetBranchCode || '').trim().toUpperCase() === b1Code))
    );

    const b1MappedNames = new Set(b1MappedToB2.map(m => m.partyName));
    const b2MappedNames = new Set(b2MappedToB1.map(m => m.partyName));

    // 2. Fetch party balances for both branches
    const [b1Accounts, b2Accounts] = await Promise.all([
      db.collection('party_balances').find({ branchId: b1Id }).toArray(),
      db.collection('party_balances').find({ branchId: b2Id }).toArray()
    ]);

    // Fallback keywords if not explicitly mapped
    const b2Keywords = [b2.name.toLowerCase(), b2Code.toLowerCase()].filter(Boolean);
    const b1Keywords = [b1.name.toLowerCase(), b1Code.toLowerCase()].filter(Boolean);

    const matchedInB1 = b1Accounts.filter(a => {
      const aCode = (a.mappedBranchCode || '').trim().toUpperCase();
      return (
        b1MappedNames.has(a.partyName) ||
        (aCode && aCode === b2Code) ||
        (a.targetBranchId && a.targetBranchId === b2Id) ||
        b2Keywords.some(kw => kw.length >= 3 && a.partyName.toLowerCase().includes(kw))
      );
    });

    const matchedInB2 = b2Accounts.filter(a => {
      const aCode = (a.mappedBranchCode || '').trim().toUpperCase();
      return (
        b2MappedNames.has(a.partyName) ||
        (aCode && aCode === b1Code) ||
        (a.targetBranchId && a.targetBranchId === b1Id) ||
        b1Keywords.some(kw => kw.length >= 3 && a.partyName.toLowerCase().includes(kw))
      );
    });

    const b1NamesList = matchedInB1.map(a => a.partyName);
    const b2NamesList = matchedInB2.map(a => a.partyName);
    const b1NamesSet = new Set(b1NamesList);
    const b2NamesSet = new Set(b2NamesList);

    // 3. Fetch active vouchers for both branches
    const [rawB1Vouchers, rawB2Vouchers] = await Promise.all([
      b1NamesList.length > 0
        ? db.collection('vouchers').find({
            branchId: b1Id,
            "lines.account": { $in: b1NamesList },
            isIgnored: { $ne: true }
          }).sort({ date: 1, _id: 1 }).toArray()
        : [],
      b2NamesList.length > 0
        ? db.collection('vouchers').find({
            branchId: b2Id,
            "lines.account": { $in: b2NamesList },
            isIgnored: { $ne: true }
          }).sort({ date: 1, _id: 1 }).toArray()
        : []
    ]);

    // Normalize B1 vouchers into line items for reconciliation
    const b1Items: any[] = [];
    for (const v of rawB1Vouchers) {
      let debit = 0;
      let credit = 0;
      const counterAccounts: string[] = [];
      let accountName = '';

      for (const line of v.lines) {
        if (b1NamesSet.has(line.account)) {
          debit += (line.debit || 0);
          credit += (line.credit || 0);
          accountName = line.account;
        } else {
          counterAccounts.push(line.account);
        }
      }

      const amount = Math.abs(debit - credit);
      if (amount > 0.001) {
        b1Items.push({
          id: v._id.toString(),
          rawVoucher: v,
          branchId: b1Id,
          branchName: b1.name,
          date: v.date,
          dateStr: v.dateStr,
          voucherType: v.voucherType || 'Other',
          voucherNo: v.voucherNo || '-',
          accountName,
          counterAccount: counterAccounts.slice(0, 2).join(', '),
          narration: v.narration || '',
          debit: Math.round(debit * 100) / 100,
          credit: Math.round(credit * 100) / 100,
          amount: Math.round(amount * 100) / 100,
          isDebit: debit > credit,
          matched: false
        });
      }
    }

    // Normalize B2 vouchers into line items for reconciliation
    const b2Items: any[] = [];
    for (const v of rawB2Vouchers) {
      let debit = 0;
      let credit = 0;
      const counterAccounts: string[] = [];
      let accountName = '';

      for (const line of v.lines) {
        if (b2NamesSet.has(line.account)) {
          debit += (line.debit || 0);
          credit += (line.credit || 0);
          accountName = line.account;
        } else {
          counterAccounts.push(line.account);
        }
      }

      const amount = Math.abs(debit - credit);
      if (amount > 0.001) {
        b2Items.push({
          id: v._id.toString(),
          rawVoucher: v,
          branchId: b2Id,
          branchName: b2.name,
          date: v.date,
          dateStr: v.dateStr,
          voucherType: v.voucherType || 'Other',
          voucherNo: v.voucherNo || '-',
          accountName,
          counterAccount: counterAccounts.slice(0, 2).join(', '),
          narration: v.narration || '',
          debit: Math.round(debit * 100) / 100,
          credit: Math.round(credit * 100) / 100,
          amount: Math.round(amount * 100) / 100,
          isDebit: debit > credit,
          matched: false
        });
      }
    }

    // Helper: Category check
    function getCategory(t1: string, t2?: string): 'PAYMENT_RECEIPT' | 'SALE_PURCHASE' | 'JOURNAL_OTHER' {
      const types = [t1, t2].filter(Boolean).map(t => t!.toLowerCase());
      if (types.some(t => t.includes('pymt') || t.includes('rcpt') || t.includes('pay') || t.includes('rec'))) {
        return 'PAYMENT_RECEIPT';
      }
      if (types.some(t => t.includes('sale') || t.includes('purc') || t.includes('inv'))) {
        return 'SALE_PURCHASE';
      }
      return 'JOURNAL_OTHER';
    }

    // Helper: Are voucher types mirror inverses?
    function areMirrorTypes(t1: string, t2: string): boolean {
      const a = t1.toLowerCase();
      const b = t2.toLowerCase();
      if ((a.includes('pymt') && b.includes('rcpt')) || (a.includes('rcpt') && b.includes('pymt'))) return true;
      if ((a.includes('sale') && b.includes('purc')) || (a.includes('purc') && b.includes('sale'))) return true;
      if ((a.includes('d/note') && b.includes('c/note')) || (a.includes('c/note') && b.includes('d/note'))) return true;
      if (a.includes('jrnl') && b.includes('jrnl')) return true;
      if (a.includes('ctra') && b.includes('ctra')) return true;
      return false;
    }

    // Two-Way Matching Engine
    const matchedPairs: any[] = [];

    // PASS 1: Exact Mirror Type + Exact Amount + (Exact Voucher No OR Exact Date)
    for (const item1 of b1Items) {
      if (item1.matched) continue;
      for (const item2 of b2Items) {
        if (item2.matched) continue;
        // Must be opposite Dr/Cr direction
        if (item1.isDebit === item2.isDebit) continue;

        const amountDiff = Math.abs(item1.amount - item2.amount);
        if (amountDiff < 0.05) {
          const isMirror = areMirrorTypes(item1.voucherType, item2.voucherType);
          const sameVoucherNo = item1.voucherNo !== '-' && item1.voucherNo === item2.voucherNo;
          const sameDate = item1.dateStr === item2.dateStr;

          if (isMirror && (sameVoucherNo || sameDate)) {
            item1.matched = true;
            item2.matched = true;
            matchedPairs.push({
              id: `match_${item1.id}_${item2.id}`,
              matchStatus: 'MATCHED',
              category: getCategory(item1.voucherType, item2.voucherType),
              amount: item1.amount,
              difference: 0,
              b1: item1,
              b2: item2
            });
            break;
          }
        }
      }
    }

    // PASS 2: Mirror Type + Exact Amount within 30 days
    for (const item1 of b1Items) {
      if (item1.matched) continue;
      for (const item2 of b2Items) {
        if (item2.matched) continue;
        if (item1.isDebit === item2.isDebit) continue;

        const amountDiff = Math.abs(item1.amount - item2.amount);
        if (amountDiff < 0.05 && areMirrorTypes(item1.voucherType, item2.voucherType)) {
          const d1 = new Date(item1.date).getTime();
          const d2 = new Date(item2.date).getTime();
          const daysDiff = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);

          if (daysDiff <= 30) {
            item1.matched = true;
            item2.matched = true;
            matchedPairs.push({
              id: `match_${item1.id}_${item2.id}`,
              matchStatus: 'MATCHED',
              category: getCategory(item1.voucherType, item2.voucherType),
              amount: item1.amount,
              difference: 0,
              b1: item1,
              b2: item2
            });
            break;
          }
        }
      }
    }

    // PASS 3: Mirror Type + Exact Amount (any date)
    for (const item1 of b1Items) {
      if (item1.matched) continue;
      for (const item2 of b2Items) {
        if (item2.matched) continue;
        if (item1.isDebit === item2.isDebit) continue;

        const amountDiff = Math.abs(item1.amount - item2.amount);
        if (amountDiff < 0.05 && areMirrorTypes(item1.voucherType, item2.voucherType)) {
          item1.matched = true;
          item2.matched = true;
          matchedPairs.push({
            id: `match_${item1.id}_${item2.id}`,
            matchStatus: 'MATCHED',
            category: getCategory(item1.voucherType, item2.voucherType),
            amount: item1.amount,
            difference: 0,
            b1: item1,
            b2: item2
          });
          break;
        }
      }
    }

    // PASS 4: Opposite Dr/Cr + Exact Amount (General fallback)
    for (const item1 of b1Items) {
      if (item1.matched) continue;
      for (const item2 of b2Items) {
        if (item2.matched) continue;
        if (item1.isDebit === item2.isDebit) continue;

        const amountDiff = Math.abs(item1.amount - item2.amount);
        if (amountDiff < 0.05) {
          item1.matched = true;
          item2.matched = true;
          matchedPairs.push({
            id: `match_${item1.id}_${item2.id}`,
            matchStatus: 'MATCHED',
            category: getCategory(item1.voucherType, item2.voucherType),
            amount: item1.amount,
            difference: 0,
            b1: item1,
            b2: item2
          });
          break;
        }
      }
    }

    // Unmatched B1 Items (Missing in Book 2)
    const unmatchedB1Rows: any[] = [];
    for (const item1 of b1Items) {
      if (!item1.matched) {
        unmatchedB1Rows.push({
          id: `unmatched_b1_${item1.id}`,
          matchStatus: 'MISSING_IN_B2',
          category: getCategory(item1.voucherType),
          amount: item1.amount,
          difference: item1.amount,
          b1: item1,
          b2: null
        });
      }
    }

    // Unmatched B2 Items (Missing in Book 1)
    const unmatchedB2Rows: any[] = [];
    for (const item2 of b2Items) {
      if (!item2.matched) {
        unmatchedB2Rows.push({
          id: `unmatched_b2_${item2.id}`,
          matchStatus: 'MISSING_IN_B1',
          category: getCategory(item2.voucherType),
          amount: item2.amount,
          difference: item2.amount,
          b1: null,
          b2: item2
        });
      }
    }

    // Combine all reconciliation rows
    let allRows = [...unmatchedB1Rows, ...unmatchedB2Rows, ...matchedPairs];

    // Calculate Summary Stats
    const b1TotalDebit = b1Items.reduce((sum, i) => sum + i.debit, 0);
    const b1TotalCredit = b1Items.reduce((sum, i) => sum + i.credit, 0);
    const b1Net = Math.round((b1TotalDebit - b1TotalCredit) * 100) / 100;

    const b2TotalDebit = b2Items.reduce((sum, i) => sum + i.debit, 0);
    const b2TotalCredit = b2Items.reduce((sum, i) => sum + i.credit, 0);
    const b2Net = Math.round((b2TotalDebit - b2TotalCredit) * 100) / 100;

    const difference = Math.abs(Math.round((b1Net + b2Net) * 100) / 100);
    const isReconciled = difference < 1.0 && unmatchedB1Rows.length === 0 && unmatchedB2Rows.length === 0;

    const matchedTotalAmount = matchedPairs.reduce((sum, m) => sum + m.amount, 0);
    const missingInB2Amount = unmatchedB1Rows.reduce((sum, m) => sum + m.amount, 0);
    const missingInB1Amount = unmatchedB2Rows.reduce((sum, m) => sum + m.amount, 0);

    // Category Breakdowns
    function getCategoryBreakdown(cat: 'PAYMENT_RECEIPT' | 'SALE_PURCHASE' | 'JOURNAL_OTHER') {
      const catMatched = matchedPairs.filter(p => p.category === cat);
      const catMissingB2 = unmatchedB1Rows.filter(p => p.category === cat);
      const catMissingB1 = unmatchedB2Rows.filter(p => p.category === cat);

      const b1Amt = b1Items.filter(i => getCategory(i.voucherType) === cat).reduce((s, i) => s + (i.isDebit ? i.debit : -i.credit), 0);
      const b2Amt = b2Items.filter(i => getCategory(i.voucherType) === cat).reduce((s, i) => s + (i.isDebit ? i.debit : -i.credit), 0);

      return {
        matchedCount: catMatched.length,
        mismatchCount: catMissingB2.length + catMissingB1.length,
        missingInB2Count: catMissingB2.length,
        missingInB1Count: catMissingB1.length,
        b1Net: Math.round(b1Amt * 100) / 100,
        b2Net: Math.round(b2Amt * 100) / 100,
        diff: Math.abs(Math.round((b1Amt + b2Amt) * 100) / 100)
      };
    }

    const categoryStats = {
      paymentReceipt: getCategoryBreakdown('PAYMENT_RECEIPT'),
      salePurchase: getCategoryBreakdown('SALE_PURCHASE'),
      journalOther: getCategoryBreakdown('JOURNAL_OTHER')
    };

    // Apply Filter for UI Display:
    // Default is 'mismatch_only': Hide matched rows and show ONLY mismatched rows!
    let displayRows = allRows;

    if (statusFilter === 'mismatch_only') {
      displayRows = displayRows.filter(r => r.matchStatus !== 'MATCHED');
    } else if (statusFilter === 'matched_only') {
      displayRows = displayRows.filter(r => r.matchStatus === 'MATCHED');
    } else if (statusFilter === 'missing_in_b2') {
      displayRows = displayRows.filter(r => r.matchStatus === 'MISSING_IN_B2');
    } else if (statusFilter === 'missing_in_b1') {
      displayRows = displayRows.filter(r => r.matchStatus === 'MISSING_IN_B1');
    }

    if (typeFilter === 'payment_receipt') {
      displayRows = displayRows.filter(r => r.category === 'PAYMENT_RECEIPT');
    } else if (typeFilter === 'sale_purchase') {
      displayRows = displayRows.filter(r => r.category === 'SALE_PURCHASE');
    } else if (typeFilter === 'journal_other') {
      displayRows = displayRows.filter(r => r.category === 'JOURNAL_OTHER');
    }

    if (search) {
      displayRows = displayRows.filter(r => {
        const s1 = r.b1 ? `${r.b1.voucherNo} ${r.b1.dateStr} ${r.b1.amount} ${r.b1.narration} ${r.b1.accountName}`.toLowerCase() : '';
        const s2 = r.b2 ? `${r.b2.voucherNo} ${r.b2.dateStr} ${r.b2.amount} ${r.b2.narration} ${r.b2.accountName}`.toLowerCase() : '';
        return s1.includes(search) || s2.includes(search);
      });
    }

    // Sort displayRows: Mismatches first, largest amount first
    displayRows.sort((a, b) => {
      if (a.matchStatus !== 'MATCHED' && b.matchStatus === 'MATCHED') return -1;
      if (a.matchStatus === 'MATCHED' && b.matchStatus !== 'MATCHED') return 1;
      return b.amount - a.amount;
    });

    return NextResponse.json({
      success: true,
      branches: branches.map(b => ({ id: b._id.toString(), name: b.name, code: b.code })),
      selected: {
        branch1: { id: b1Id, name: b1.name, code: b1.code, mappedLedgers: b1NamesList },
        branch2: { id: b2Id, name: b2.name, code: b2.code, mappedLedgers: b2NamesList }
      },
      summary: {
        b1TotalDebit: Math.round(b1TotalDebit * 100) / 100,
        b1TotalCredit: Math.round(b1TotalCredit * 100) / 100,
        b1Net,
        b1Status: b1Net > 0.01 ? 'Dr' : (b1Net < -0.01 ? 'Cr' : 'Nil'),
        b1TotalEntries: b1Items.length,

        b2TotalDebit: Math.round(b2TotalDebit * 100) / 100,
        b2TotalCredit: Math.round(b2TotalCredit * 100) / 100,
        b2Net,
        b2Status: b2Net > 0.01 ? 'Dr' : (b2Net < -0.01 ? 'Cr' : 'Nil'),
        b2TotalEntries: b2Items.length,

        difference,
        isReconciled,
        statusText: isReconciled ? 'पूर्ण मिलान है (Fully Reconciled)' : `अंतर है: ₹${difference.toLocaleString('en-IN')}`,

        matchedCount: matchedPairs.length,
        matchedAmount: Math.round(matchedTotalAmount * 100) / 100,

        totalMismatches: unmatchedB1Rows.length + unmatchedB2Rows.length,
        missingInB2Count: unmatchedB1Rows.length,
        missingInB2Amount: Math.round(missingInB2Amount * 100) / 100,
        missingInB1Count: unmatchedB2Rows.length,
        missingInB1Amount: Math.round(missingInB1Amount * 100) / 100,

        categories: categoryStats
      },
      filters: {
        statusFilter,
        typeFilter,
        search,
        totalShown: displayRows.length,
        totalAllRows: allRows.length
      },
      rows: displayRows
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
