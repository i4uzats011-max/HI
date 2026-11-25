export interface VoucherLine {
  account: string;
  amount: number; // negative = debit, positive = credit
  debit: number;
  credit: number;
  isHeader?: boolean;
  isDebitCol?: boolean;
}

export interface ParsedVoucher {
  date: Date;
  dateStr: string;
  voucherType: string;
  voucherNo: string;
  primaryParty: string;
  lines: VoucherLine[];
  narration?: string;
  isIgnored?: boolean;
  ignoredReason?: string;
}

export interface UnbalancedVoucherReport {
  dateStr: string;
  voucherNo: string;
  voucherType: string;
  primaryParty: string;
  debit: number;
  credit: number;
  difference: number;
  reason: string;
  lines: VoucherLine[];
}

export interface ParseResult {
  vouchers: ParsedVoucher[];
  unbalancedVouchers: UnbalancedVoucherReport[];
  totalVouchers: number;
  totalDebits: number;
  totalCredits: number;
  accountsFound: string[];
  delimiter?: string;
}

function parseMonth(monthStr: string): number {
  if (!monthStr) return 0;
  const lower = monthStr.toLowerCase().slice(0, 3);
  const months: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  return months[lower] ?? 0;
}

export function parseTallyDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const clean = dateStr.trim().replace(/^"|"$/g, '').trim();

  // Format 1: DD-MMM-YY or DD-MMM-YYYY or DD/MMM/YY (e.g. 15-Jun-23, 15/Jun/2023)
  const m1 = clean.match(/^(\d{1,2})[-/]([A-Za-z]{3,9})[-/](\d{2,4})$/);
  if (m1) {
    const day = parseInt(m1[1], 10);
    const month = parseMonth(m1[2]);
    let year = parseInt(m1[3], 10);
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month, day));
  }

  // Format 2: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const m2 = clean.match(/^(\d{1,2})[-/.](0?[1-9]|1[0-2])[-/.](\d{2,4})$/);
  if (m2) {
    const day = parseInt(m2[1], 10);
    const month = parseInt(m2[2], 10) - 1;
    let year = parseInt(m2[3], 10);
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month, day));
  }

  // Format 3: YYYY-MM-DD or YYYY/MM/DD
  const m3 = clean.match(/^(\d{4})[-/.](0?[1-9]|1[0-2])[-/.](\d{1,2})$/);
  if (m3) {
    const year = parseInt(m3[1], 10);
    const month = parseInt(m3[2], 10) - 1;
    const day = parseInt(m3[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Format 4: YYYYMMDD (Tally XML format)
  const m4 = clean.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m4) {
    const year = parseInt(m4[1], 10);
    const month = parseInt(m4[2], 10) - 1;
    const day = parseInt(m4[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Format 5: DD Month YYYY (e.g. 15 Jun 2023)
  const m5 = clean.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/);
  if (m5) {
    const day = parseInt(m5[1], 10);
    const month = parseMonth(m5[2]);
    let year = parseInt(m5[3], 10);
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month, day));
  }

  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function isDateString(str: string): boolean {
  if (!str) return false;
  const s = str.trim().replace(/^"|"$/g, '').trim();
  if (/^\d{1,2}[-/][A-Za-z]{3,9}[-/]\d{2,4}$/.test(s)) return true;
  if (/^\d{1,2}[-/.](0?[1-9]|1[0-2])[-/.]\d{2,4}$/.test(s)) return true;
  if (/^\d{4}[-/](0?[1-9]|1[0-2])[-/.]\d{1,2}$/.test(s)) return true;
  if (/^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}$/.test(s)) return true;
  if (/^\d{8}$/.test(s)) return true;
  return false;
}

export function detectDelimiter(sampleLines: string[]): string {
  let commaCount = 0;
  let tabCount = 0;
  let semiCount = 0;

  for (const line of sampleLines.slice(0, 30)) {
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ',') commaCount++;
      else if (line[i] === '\t') tabCount++;
      else if (line[i] === ';') semiCount++;
    }
  }

  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (semiCount > commaCount && semiCount > tabCount) return ';';
  return ',';
}

export function parseDelimitedLine(line: string, delimiter: string = ','): string[] {
  const res: string[] = [];
  let curr = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        curr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      res.push(curr.trim());
      curr = '';
    } else {
      curr += c;
    }
  }
  res.push(curr.trim());
  return res;
}

export function parseFinancialCell(rawVal: string | undefined): { debit: number; credit: number; amount: number } | null {
  if (!rawVal) return null;
  let s = rawVal.trim().replace(/^"|"$/g, '').trim();
  if (!s) return null;

  const lower = s.toLowerCase();
  if (
    lower.includes('$') ||
    lower.includes('@') ||
    lower.includes('?') ||
    lower.includes('pcs') ||
    lower.includes('kgs') ||
    lower.includes('mtr') ||
    lower.includes('doz')
  ) {
    return null;
  }

  let explicitSide: 'Dr' | 'Cr' | null = null;
  if (/\bdr\b/i.test(s) || /debit/i.test(s)) {
    explicitSide = 'Dr';
    s = s.replace(/\bdr\b/gi, '').replace(/debit/gi, '');
  } else if (/\bcr\b/i.test(s) || /credit/i.test(s)) {
    explicitSide = 'Cr';
    s = s.replace(/\bcr\b/gi, '').replace(/credit/gi, '');
  }

  let isParensNegative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    isParensNegative = true;
    s = s.slice(1, -1);
  }

  const clean = s.replace(/,/g, '').trim();
  const num = parseFloat(clean);
  if (isNaN(num) || num === 0) return null;

  const absVal = Math.abs(num);

  if (explicitSide === 'Dr') {
    return { debit: absVal, credit: 0, amount: -absVal };
  } else if (explicitSide === 'Cr') {
    return { debit: 0, credit: absVal, amount: absVal };
  } else if (num < 0 || isParensNegative) {
    return { debit: absVal, credit: 0, amount: -absVal };
  } else {
    return { debit: 0, credit: absVal, amount: absVal };
  }
}

export function getCounterAccount(vType: string, isPartyDebit: boolean): string {
  const lower = (vType || '').toLowerCase().trim();
  if (lower.includes('sale')) return 'Sales Account';
  if (lower.includes('purc')) return 'Purchase Account';
  if (lower.includes('pymt') || lower.includes('payment')) return 'Bank/Cash Account';
  if (lower.includes('rcpt') || lower.includes('receipt')) return 'Bank/Cash Account';
  if (lower.includes('ctra') || lower.includes('contra')) return 'Bank/Cash Transfer';
  if (lower.includes('stk')) return 'Stock Adjustment';
  return isPartyDebit ? 'Counter Credit' : 'Counter Debit';
}

/**
 * High-performance parser for Tally XML export files (.xml)
 * Validates voucher-wise:
 * If Debit == Credit -> Imported
 * If Debit != Credit -> Ignored & Added to Unbalanced Report
 */
export function parseTallyXml(xmlContent: string): ParseResult {
  const vouchers: ParsedVoucher[] = [];
  const unbalancedVouchers: UnbalancedVoucherReport[] = [];
  let totalDebits = 0;
  let totalCredits = 0;
  const accountsSet = new Set<string>();

  const voucherRegex = /<VOUCHER\b[^>]*>([\s\S]*?)<\/VOUCHER>/gi;
  let vMatch: RegExpExecArray | null;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  while ((vMatch = voucherRegex.exec(xmlContent)) !== null) {
    const vBody = vMatch[1];

    if (/<ISCANCELLED>\s*Yes\s*<\/ISCANCELLED>/i.test(vBody)) continue;
    if (/<ISDELETED>\s*Yes\s*<\/ISDELETED>/i.test(vBody)) continue;

    let dateStr = '';
    let parsedDate = new Date();
    const dMatch = vBody.match(/<DATE>(\d{4})(\d{2})(\d{2})<\/DATE>/i);
    if (dMatch) {
      const year = parseInt(dMatch[1], 10);
      const month = parseInt(dMatch[2], 10) - 1;
      const day = parseInt(dMatch[3], 10);
      parsedDate = new Date(Date.UTC(year, month, day));
      dateStr = `${day}-${monthNames[month]}-${year}`;
    }

    const typeMatch = vBody.match(/<VOUCHERTYPENAME>([^<]+)<\/VOUCHERTYPENAME>/i) ||
                      vBody.match(/<VCHTYPE>([^<]+)<\/VCHTYPE>/i);
    const voucherType = typeMatch ? typeMatch[1].trim() : 'General';

    const noMatch = vBody.match(/<VOUCHERNUMBER>([^<]+)<\/VOUCHERNUMBER>/i);
    const voucherNo = noMatch ? noMatch[1].trim() : '';

    const partyMatch = vBody.match(/<PARTYLEDGERNAME>([^<]+)<\/PARTYLEDGERNAME>/i) ||
                       vBody.match(/<PARTYNAME>([^<]+)<\/PARTYNAME>/i);
    const primaryParty = partyMatch ? partyMatch[1].trim() : '';

    const narrMatch = vBody.match(/<NARRATION>([\s\S]*?)<\/NARRATION>/i);
    const narration = narrMatch ? narrMatch[1].replace(/&#13;/g, ' ').replace(/&#10;/g, ' ').trim() : '';

    const lines: VoucherLine[] = [];
    const ledgerListRegex = /<(?:ALLLEDGERENTRIES|LEDGERENTRIES|ACCOUNTINGALLOCATIONS)\.LIST\b[^>]*>([\s\S]*?)<\/(?:ALLLEDGERENTRIES|LEDGERENTRIES|ACCOUNTINGALLOCATIONS)\.LIST>/gi;
    let lm: RegExpExecArray | null;

    while ((lm = ledgerListRegex.exec(vBody)) !== null) {
      const lBody = lm[1];
      const nameMatch = lBody.match(/<LEDGERNAME>([^<]+)<\/LEDGERNAME>/i);
      const amtMatch = lBody.match(/<AMOUNT>([^<]+)<\/AMOUNT>/i);
      const deemedPosMatch = lBody.match(/<ISDEEMEDPOSITIVE>([^<]+)<\/ISDEEMEDPOSITIVE>/i);

      if (nameMatch && amtMatch) {
        const account = nameMatch[1].trim();
        const rawAmt = parseFloat(amtMatch[1].replace(/,/g, ''));
        if (isNaN(rawAmt)) continue;

        let debit = 0;
        let credit = 0;

        if (deemedPosMatch) {
          const isPos = deemedPosMatch[1].trim().toLowerCase() === 'yes';
          if (isPos) {
            debit = Math.abs(rawAmt);
          } else {
            credit = Math.abs(rawAmt);
          }
        } else {
          if (rawAmt < 0) {
            debit = Math.abs(rawAmt);
          } else {
            credit = rawAmt;
          }
        }

        if (debit > 0 || credit > 0) {
          lines.push({
            account,
            amount: debit > 0 ? -debit : credit,
            debit: Math.round(debit * 100) / 100,
            credit: Math.round(credit * 100) / 100,
            isHeader: lines.length === 0,
            isDebitCol: debit > 0
          });
        }
      }
    }

    if (lines.length > 0) {
      let vDr = lines.reduce((s, l) => s + l.debit, 0);
      let vCr = lines.reduce((s, l) => s + l.credit, 0);

      // Auto balance round off if difference <= 1.00
      const diff = Math.abs(vDr - vCr);
      if (diff > 0.001 && diff <= 1.00 && vDr > 0 && vCr > 0) {
        if (vDr > vCr) {
          lines.push({ account: 'Round Off', amount: diff, debit: 0, credit: diff, isHeader: false });
          vCr += diff;
        } else {
          lines.push({ account: 'Round Off', amount: -diff, debit: diff, credit: 0, isHeader: false });
          vDr += diff;
        }
      }

      vDr = Math.round(vDr * 100) / 100;
      vCr = Math.round(vCr * 100) / 100;

      // VOUCHER-WISE EQUALITY RULE:
      // If debit and credit are equal -> IMPORT
      // Otherwise -> IGNORE that entry and add to unbalanced report
      if (Math.abs(vDr - vCr) < 0.05 && vDr > 0) {
        totalDebits += vDr;
        totalCredits += vCr;
        for (const line of lines) {
          if (line.account) accountsSet.add(line.account);
        }

        vouchers.push({
          date: parsedDate,
          dateStr,
          voucherType,
          voucherNo,
          primaryParty: primaryParty || (lines[0] ? lines[0].account : 'General'),
          lines,
          narration
        });
      } else {
        const diffAmt = Math.round(Math.abs(vDr - vCr) * 100) / 100;
        unbalancedVouchers.push({
          dateStr,
          voucherNo,
          voucherType,
          primaryParty: primaryParty || (lines[0] ? lines[0].account : 'General'),
          debit: vDr,
          credit: vCr,
          difference: diffAmt,
          reason: `असंतुलित प्रविष्टि (डेबिट ₹${vDr} ≠ क्रेडिट ₹${vCr}) - अंतर: ₹${diffAmt}`,
          lines
        });
      }
    }
  }

  return {
    vouchers,
    unbalancedVouchers,
    totalVouchers: vouchers.length,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    accountsFound: Array.from(accountsSet),
    delimiter: 'XML'
  };
}

/**
 * Universal DayBook / CSV / TXT / XML Parser
 * Handles both Single-Line Register Exports (ACE.txt, JSX.txt, KUMAR.txt, etc.)
 * and Multi-Line Voucher Exports (DayBook.CSV) and Tally XML files.
 * Validates voucher-wise:
 * If Debit == Credit -> Imported
 * If Debit != Credit -> Ignored & Added to Unbalanced Report
 */
export function parseDayBookContent(content: string): ParseResult {
  if (!content) {
    return { vouchers: [], unbalancedVouchers: [], totalVouchers: 0, totalDebits: 0, totalCredits: 0, accountsFound: [] };
  }

  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 0xfeff) cleanContent = cleanContent.slice(1);
  if (cleanContent.includes('\u0000')) cleanContent = cleanContent.replace(/\u0000/g, '');

  // 1. Direct XML Detection
  if (cleanContent.includes('<ENVELOPE') || cleanContent.includes('<VOUCHER')) {
    return parseTallyXml(cleanContent);
  }

  const rawLines = cleanContent.split(/\r?\n|\r/).map(l => l.trim()).filter(Boolean);
  const delimiter = detectDelimiter(rawLines.slice(0, 30));

  // Determine whether file contains multi-line vouchers or single-line vouchers
  let multiLineIndicatorCount = 0;
  for (const line of rawLines.slice(0, 60)) {
    if (line.startsWith('"(No.') || line.startsWith('(No.')) continue;
    const cols = parseDelimitedLine(line, delimiter);
    const col0 = (cols[0] || '').replace(/^"|"$/g, '').trim();
    if (col0 && !isDateString(col0) && cols.length >= 2) {
      multiLineIndicatorCount++;
    }
  }

  const isMultiLineFile = multiLineIndicatorCount > 3;

  const vouchers: ParsedVoucher[] = [];
  const unbalancedVouchers: UnbalancedVoucherReport[] = [];
  const accountsSet = new Set<string>();
  let totalDebits = 0;
  let totalCredits = 0;

  const KNOWN_VTYPES = [
    'rcpt', 'receipt', 'pymt', 'payment', 'sale', 'sales', 'purc', 'purchase',
    'jrnl', 'journal', 'ctra', 'contra', 'c/note', 'd/note', 'credit note', 'debit note',
    'stk jrnl', 'phy stk', 'delv note', 'rcpt note'
  ];

  if (isMultiLineFile) {
    // Multi-line DayBook parser
    let currentVoucher: ParsedVoucher | null = null;

    const finalizeVoucher = (v: ParsedVoucher) => {
      if (!v || v.lines.length === 0) return;

      let vDr = v.lines.reduce((s, l) => s + l.debit, 0);
      let vCr = v.lines.reduce((s, l) => s + l.credit, 0);

      if (v.lines.length === 1) {
        const line = v.lines[0];
        const isPartyDr = line.debit > 0;
        const amt = isPartyDr ? line.debit : line.credit;
        const counter = getCounterAccount(v.voucherType, isPartyDr);
        if (isPartyDr) {
          v.lines.push({ account: counter, amount: amt, debit: 0, credit: amt, isHeader: false });
          vCr += amt;
        } else {
          v.lines.push({ account: counter, amount: -amt, debit: amt, credit: 0, isHeader: false });
          vDr += amt;
        }
      } else if (v.lines.length === 2 && vDr === 0 && vCr > 0) {
        if (v.lines[0].isDebitCol) {
          v.lines[0].debit = v.lines[0].credit;
          v.lines[0].credit = 0;
          v.lines[0].amount = -v.lines[0].debit;
        } else {
          v.lines[1].debit = v.lines[1].credit;
          v.lines[1].credit = 0;
          v.lines[1].amount = -v.lines[1].debit;
        }
        vDr = v.lines.reduce((s, l) => s + l.debit, 0);
        vCr = v.lines.reduce((s, l) => s + l.credit, 0);
      } else if (v.lines.length === 2 && vCr === 0 && vDr > 0) {
        v.lines[1].credit = v.lines[1].debit;
        v.lines[1].debit = 0;
        v.lines[1].amount = v.lines[1].credit;
        vDr = v.lines.reduce((s, l) => s + l.debit, 0);
        vCr = v.lines.reduce((s, l) => s + l.credit, 0);
      }

      const diff = Math.abs(vDr - vCr);
      if (diff > 0.001 && diff <= 1.00 && vDr > 0 && vCr > 0) {
        if (vDr > vCr) {
          v.lines.push({ account: 'Round Off', amount: diff, debit: 0, credit: diff, isHeader: false });
          vCr += diff;
        } else {
          v.lines.push({ account: 'Round Off', amount: -diff, debit: diff, credit: 0, isHeader: false });
          vDr += diff;
        }
      }

      vDr = Math.round(vDr * 100) / 100;
      vCr = Math.round(vCr * 100) / 100;

      // Voucher-wise Debit == Credit validation
      if (Math.abs(vDr - vCr) < 0.05 && vDr > 0) {
        vouchers.push(v);
        for (const line of v.lines) {
          if (line.account) accountsSet.add(line.account);
        }
        totalDebits += vDr;
        totalCredits += vCr;
      } else {
        const diffAmt = Math.round(Math.abs(vDr - vCr) * 100) / 100;
        unbalancedVouchers.push({
          dateStr: v.dateStr,
          voucherNo: v.voucherNo,
          voucherType: v.voucherType,
          primaryParty: v.primaryParty,
          debit: vDr,
          credit: vCr,
          difference: diffAmt,
          reason: `असंतुलित प्रविष्टि (डेबिट ₹${vDr} ≠ क्रेडिट ₹${vCr}) - अंतर: ₹${diffAmt}`,
          lines: v.lines
        });
      }
    };

    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i].trim();
      if (!rawLine) continue;

      const cols = parseDelimitedLine(rawLine, delimiter);
      const col0 = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : '';
      const col1 = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : '';

      let isHeader = false;
      let dateIdx = -1;
      let ledgerIdx = -1;

      if (isDateString(col0)) {
        isHeader = true;
        dateIdx = 0;
        ledgerIdx = 1;
      } else if (!col0 && isDateString(col1)) {
        isHeader = true;
        dateIdx = 1;
        ledgerIdx = 2;
      }

      if (isHeader) {
        if (currentVoucher) finalizeVoucher(currentVoucher);

        const dateStr = cols[dateIdx] ? cols[dateIdx].replace(/^"|"$/g, '').trim() : '';
        const ledgerName = cols[ledgerIdx] ? cols[ledgerIdx].replace(/^"|"$/g, '').trim() : '';
        const parsedDate = parseTallyDate(dateStr);

        let vType = 'General';
        let headerVNo = '';

        for (let c = ledgerIdx + 1; c < cols.length; c++) {
          const val = cols[c] ? cols[c].replace(/^"|"$/g, '').trim() : '';
          if (!val) continue;
          const valLower = val.toLowerCase();
          if (KNOWN_VTYPES.includes(valLower)) {
            vType = val;
          } else if (!headerVNo && /^(no\.?|vch\.?|inv\.?|ref\.?|[a-z0-9\/-]+)$/i.test(val) && val.length < 25 && isNaN(Number(val.replace(/,/g, '')))) {
            headerVNo = val;
          }
        }

        currentVoucher = {
          date: parsedDate,
          dateStr,
          voucherType: vType,
          voucherNo: headerVNo,
          primaryParty: ledgerName,
          lines: [],
          narration: ''
        };

        for (let c = ledgerIdx + 1; c < cols.length; c++) {
          const parsed = parseFinancialCell(cols[c]);
          if (parsed) {
            currentVoucher.lines.push({
              account: ledgerName,
              amount: parsed.amount,
              debit: parsed.debit,
              credit: parsed.credit,
              isHeader: true,
              isDebitCol: parsed.debit > 0
            });
            break;
          }
        }
      } else if (currentVoucher) {
        const vNoMatch = rawLine.match(/\(?\s*(?:No\.?|Vch\s*No\.?|Ref\.?|Inv\s*No\.?|Chq\s*No\.?)\s*:\s*([^)"']+)\)?/i);
        if (vNoMatch) {
          currentVoucher.voucherNo = vNoMatch[1].trim();
        } else if (rawLine.startsWith('(No. :') || col0.startsWith('(No. :')) {
          const raw = rawLine.startsWith('(No. :') ? rawLine : col0;
          currentVoucher.voucherNo = raw.replace(/\(No\.\s*:/, '').replace(/\)/, '').replace(/"/g, '').trim();
        } else if (col0 && !col0.startsWith('@') && !col0.startsWith('$')) {
          const ledgerName = col0;
          for (let c = 1; c < cols.length; c++) {
            const parsed = parseFinancialCell(cols[c]);
            if (parsed) {
              currentVoucher.lines.push({
                account: ledgerName,
                amount: parsed.amount,
                debit: parsed.debit,
                credit: parsed.credit,
                isHeader: false,
                isDebitCol: parsed.debit > 0
              });
              break;
            }
          }
        }
      }
    }
    if (currentVoucher) finalizeVoucher(currentVoucher);

  } else {
    // Single-line DayBook / Register parser (handles ACE.txt, JSX.txt, KUMAR.txt, etc.)
    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i].trim();
      if (!rawLine || rawLine.startsWith('"(No.') || rawLine.startsWith('(No.')) continue;

      const cols = parseDelimitedLine(rawLine, delimiter);
      if (cols.length < 3) continue;

      let dateIdx = -1;
      let ledgerIdx = -1;
      let vTypeIdx = -1;

      if (isDateString(cols[0])) {
        dateIdx = 0;
        ledgerIdx = 1;
        vTypeIdx = 2;
      } else if (!cols[0] && isDateString(cols[1])) {
        dateIdx = 1;
        ledgerIdx = 2;
        vTypeIdx = 3;
      }

      if (dateIdx === -1 || ledgerIdx === -1) continue;

      const dateStr = cols[dateIdx].replace(/^"|"$/g, '').trim();
      const accountName = cols[ledgerIdx].replace(/^"|"$/g, '').trim();
      const vType = cols[vTypeIdx] ? cols[vTypeIdx].replace(/^"|"$/g, '').trim() : 'General';

      if (!accountName || accountName.toLowerCase() === '(cancelled)') continue;

      let partyDr = 0;
      let partyCr = 0;

      for (let c = vTypeIdx + 1; c < cols.length; c++) {
        const val = cols[c];
        if (!val) continue;
        const parsed = parseFinancialCell(val);
        if (parsed) {
          if (c === vTypeIdx + 1) {
            partyDr = parsed.debit > 0 ? parsed.debit : parsed.credit;
          } else if (c === vTypeIdx + 2) {
            partyCr = parsed.credit > 0 ? parsed.credit : parsed.debit;
          } else {
            if (parsed.debit > 0) partyDr = parsed.debit;
            if (parsed.credit > 0) partyCr = parsed.credit;
          }
          break;
        }
      }

      if (partyDr === 0 && partyCr === 0) continue;

      let voucherNo = '';
      if (i + 1 < rawLines.length) {
        const nextLine = rawLines[i + 1];
        const noMatch = nextLine.match(/\(?\s*(?:No\.?|Vch\s*No\.?|Ref\.?|Inv\s*No\.?)\s*:\s*([^)"']+)\)?/i);
        if (noMatch) {
          voucherNo = noMatch[1].trim();
        }
      }

      const parsedDate = parseTallyDate(dateStr);
      const isPartyDr = partyDr > 0;
      const amount = isPartyDr ? partyDr : partyCr;
      const counterAccount = getCounterAccount(vType, isPartyDr);

      const vLines: VoucherLine[] = [];
      if (isPartyDr) {
        vLines.push({
          account: accountName,
          amount: -amount,
          debit: Math.round(amount * 100) / 100,
          credit: 0,
          isHeader: true,
          isDebitCol: true
        });
        vLines.push({
          account: counterAccount,
          amount: amount,
          debit: 0,
          credit: Math.round(amount * 100) / 100,
          isHeader: false,
          isDebitCol: false
        });
      } else {
        vLines.push({
          account: accountName,
          amount: amount,
          debit: 0,
          credit: Math.round(amount * 100) / 100,
          isHeader: true,
          isDebitCol: false
        });
        vLines.push({
          account: counterAccount,
          amount: -amount,
          debit: Math.round(amount * 100) / 100,
          credit: 0,
          isHeader: false,
          isDebitCol: true
        });
      }

      // Check Dr == Cr (in synthesized single-line entries amount is always balanced)
      let vDr = vLines.reduce((s, l) => s + l.debit, 0);
      let vCr = vLines.reduce((s, l) => s + l.credit, 0);
      vDr = Math.round(vDr * 100) / 100;
      vCr = Math.round(vCr * 100) / 100;

      if (Math.abs(vDr - vCr) < 0.05 && vDr > 0) {
        accountsSet.add(accountName);
        accountsSet.add(counterAccount);

        totalDebits += vDr;
        totalCredits += vCr;

        vouchers.push({
          date: parsedDate,
          dateStr,
          voucherType: vType,
          voucherNo,
          primaryParty: accountName,
          lines: vLines,
          narration: `${vType} - ${accountName} (Vch: ${voucherNo || '-'})`
        });
      } else {
        const diffAmt = Math.round(Math.abs(vDr - vCr) * 100) / 100;
        unbalancedVouchers.push({
          dateStr,
          voucherNo,
          voucherType: vType,
          primaryParty: accountName,
          debit: vDr,
          credit: vCr,
          difference: diffAmt,
          reason: `असंतुलित प्रविष्टि (डेबिट ₹${vDr} ≠ क्रेडिट ₹${vCr}) - अंतर: ₹${diffAmt}`,
          lines: vLines
        });
      }
    }
  }

  return {
    vouchers,
    unbalancedVouchers,
    totalVouchers: vouchers.length,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    accountsFound: Array.from(accountsSet),
    delimiter
  };
}
