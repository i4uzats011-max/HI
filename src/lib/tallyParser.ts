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
}

export interface ParseResult {
  vouchers: ParsedVoucher[];
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

  // Format 4: DD Month YYYY (e.g. 15 Jun 2023)
  const m4 = clean.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/);
  if (m4) {
    const day = parseInt(m4[1], 10);
    const month = parseMonth(m4[2]);
    let year = parseInt(m4[3], 10);
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
  if (/^\d{4}[-/](0?[1-9]|1[0-2])[-/]\d{1,2}$/.test(s)) return true;
  if (/^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}$/.test(s)) return true;
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

  // Check for Dr / Cr explicit markers
  let explicitSide: 'Dr' | 'Cr' | null = null;
  if (/\bdr\b/i.test(s) || /debit/i.test(s)) {
    explicitSide = 'Dr';
    s = s.replace(/\bdr\b/gi, '').replace(/debit/gi, '');
  } else if (/\bcr\b/i.test(s) || /credit/i.test(s)) {
    explicitSide = 'Cr';
    s = s.replace(/\bcr\b/gi, '').replace(/credit/gi, '');
  }

  // Check for accounting parentheses e.g. (1000.00) => -1000.00
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
    // In Tally single-entry DayBook export: negative amount = Debit!
    return { debit: absVal, credit: 0, amount: -absVal };
  } else {
    // Positive amount without explicit Dr/Cr
    return { debit: 0, credit: absVal, amount: absVal };
  }
}

export function parseDayBookContent(content: string): ParseResult {
  if (!content) {
    return { vouchers: [], totalVouchers: 0, totalDebits: 0, totalCredits: 0, accountsFound: [] };
  }

  // Strip BOM if present
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }
  // Strip null bytes if decoded from UTF-16
  if (cleanContent.includes('\u0000')) {
    cleanContent = cleanContent.replace(/\u0000/g, '');
  }

  // Split lines handling CRLF, LF, and CR
  const rawLines = cleanContent.split(/\r?\n|\r/);
  const delimiter = detectDelimiter(rawLines.slice(0, 30));

  const vouchers: ParsedVoucher[] = [];
  const accountsSet = new Set<string>();

  let currentVoucher: ParsedVoucher | null = null;
  let totalDebits = 0;
  let totalCredits = 0;

  const finalizeVoucher = (v: ParsedVoucher) => {
    if (!v || v.lines.length === 0) return;

    let vDr = v.lines.reduce((s, l) => s + l.debit, 0);
    let vCr = v.lines.reduce((s, l) => s + l.credit, 0);

    // If both lines ended up on same side (e.g. positive amounts in separate debit/credit columns)
    if (v.lines.length === 2 && vDr === 0 && vCr > 0) {
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

    // Auto-balance rounding difference up to 1.00 rupee
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

    // Strict Double-Entry Rule: Total Dr == Total Cr (Debit == Credit, Sum of Plus and Minus == 0)
    if (Math.abs(vDr - vCr) < 0.05 && vDr > 0) {
      vouchers.push(v);
      for (const line of v.lines) {
        if (line.account) accountsSet.add(line.account);
      }
      totalDebits += vDr;
      totalCredits += vCr;
    }
  };

  const KNOWN_VTYPES = [
    'rcpt', 'receipt', 'pymt', 'payment', 'sale', 'sales', 'purc', 'purchase',
    'jrnl', 'journal', 'ctra', 'contra', 'c/note', 'd/note', 'credit note', 'debit note',
    'stk jrnl', 'phy stk', 'delv note', 'rcpt note'
  ];

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine) continue;

    const cols = parseDelimitedLine(rawLine, delimiter);
    const col0 = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : '';
    const col1 = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : '';

    // Check if line starts a new voucher
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
      if (currentVoucher) {
        finalizeVoucher(currentVoucher);
      }

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

      // In Tally, col 4 is Debit, col 5 is Credit
      const debitColVal = cols[ledgerIdx + 3] || '';
      const creditColVal = cols[ledgerIdx + 4] || '';

      const debitParsed = parseFinancialCell(debitColVal);
      const creditParsed = parseFinancialCell(creditColVal);

      if (debitParsed && !creditParsed) {
        currentVoucher.lines.push({
          account: ledgerName,
          amount: -debitParsed.debit,
          debit: debitParsed.debit,
          credit: 0,
          isHeader: true,
          isDebitCol: true
        });
      } else if (creditParsed && !debitParsed) {
        currentVoucher.lines.push({
          account: ledgerName,
          amount: creditParsed.credit,
          debit: 0,
          credit: creditParsed.credit,
          isHeader: true,
          isDebitCol: false
        });
      } else {
        // Fallback: search for first financial cell from col 4 onwards
        for (let c = ledgerIdx + 3; c < cols.length; c++) {
          const parsed = parseFinancialCell(cols[c]);
          if (parsed) {
            currentVoucher.lines.push({
              account: ledgerName,
              amount: parsed.amount,
              debit: parsed.debit,
              credit: parsed.credit,
              isHeader: true,
              isDebitCol: c === ledgerIdx + 3
            });
            break;
          }
        }
      }
    } else if (currentVoucher) {
      // Check for voucher number
      const vNoMatch = rawLine.match(/\(?\s*(?:No\.?|Vch\s*No\.?|Ref\.?|Inv\s*No\.?|Chq\s*No\.?)\s*:\s*([^)"']+)\)?/i);
      if (vNoMatch) {
        currentVoucher.voucherNo = vNoMatch[1].trim();
      } else if (rawLine.startsWith('(No. :') || col0.startsWith('(No. :')) {
        const raw = rawLine.startsWith('(No. :') ? rawLine : col0;
        currentVoucher.voucherNo = raw.replace(/\(No\.\s*:/, '').replace(/\)/, '').replace(/"/g, '').trim();
      } else if (
        col0 &&
        !col0.startsWith('@') &&
        !col0.startsWith('$') &&
        !col0.startsWith('?') &&
        !col0.toLowerCase().includes('pcs') &&
        !col0.toLowerCase().includes('kgs')
      ) {
        const ledgerName = col0;
        // Detail lines: col 1 is Debit, col 2 is Credit
        const dVal = cols[1] || '';
        const cVal = cols[2] || '';

        const dParsed = parseFinancialCell(dVal);
        const cParsed = parseFinancialCell(cVal);

        if (dParsed && !cParsed) {
          currentVoucher.lines.push({
            account: ledgerName,
            amount: -dParsed.debit,
            debit: dParsed.debit,
            credit: 0,
            isHeader: false,
            isDebitCol: true
          });
        } else if (cParsed && !dParsed) {
          currentVoucher.lines.push({
            account: ledgerName,
            amount: cParsed.credit,
            debit: 0,
            credit: cParsed.credit,
            isHeader: false,
            isDebitCol: false
          });
        } else {
          for (let c = 1; c < cols.length; c++) {
            const parsed = parseFinancialCell(cols[c]);
            if (parsed) {
              currentVoucher.lines.push({
                account: ledgerName,
                amount: parsed.amount,
                debit: parsed.debit,
                credit: parsed.credit,
                isHeader: false,
                isDebitCol: c === 1
              });
              break;
            }
          }
        }
      }
    }
  }

  // Finalize last voucher
  if (currentVoucher) {
    finalizeVoucher(currentVoucher);
  }

  return {
    vouchers,
    totalVouchers: vouchers.length,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    accountsFound: Array.from(accountsSet),
    delimiter
  };
}
