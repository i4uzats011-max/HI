export interface VoucherLine {
  account: string;
  amount: number; // negative = debit, positive = credit
  debit: number;
  credit: number;
  isHeader?: boolean;
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
}

function parseMonth(monthStr: string): number {
  const months: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  return months[monthStr.toLowerCase()] ?? 0;
}

function parseTallyDate(dateStr: string): Date {
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseMonth(parts[1]);
    let year = parseInt(parts[2], 10);
    if (year < 100) {
      year += 2000;
    }
    return new Date(Date.UTC(year, month, day));
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseCsvLine(line: string): string[] {
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
    } else if (c === ',' && !inQuotes) {
      res.push(curr.trim());
      curr = '';
    } else {
      curr += c;
    }
  }
  res.push(curr.trim());
  return res;
}

function extractFinancialAmount(cols: string[], startIndex: number): number | null {
  for (let c = startIndex; c < cols.length; c++) {
    const rawVal = cols[c];
    if (!rawVal) continue;
    // Skip currency symbols, exchange rates, and inventory units
    const lower = rawVal.toLowerCase();
    if (
      lower.includes('$') ||
      lower.includes('@') ||
      lower.includes('?') ||
      lower.includes('pcs') ||
      lower.includes('kgs') ||
      lower.includes('mtr') ||
      lower.includes('doz')
    ) {
      continue;
    }

    const cleanStr = rawVal.replace(/,/g, '').trim();
    const num = parseFloat(cleanStr);
    if (!isNaN(num) && num !== 0) {
      return num;
    }
  }
  return null;
}

export function parseDayBookContent(content: string): ParseResult {
  const rawLines = content.split(/\r?\n/);
  const vouchers: ParsedVoucher[] = [];
  const accountsSet = new Set<string>();

  let currentVoucher: ParsedVoucher | null = null;
  let totalDebits = 0;
  let totalCredits = 0;

  const datePattern = /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine) continue;

    const cols = parseCsvLine(rawLine);
    const col0 = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : '';

    // Check if col0 is a Date: Starts a new entry!
    const isNewEntry = datePattern.test(col0) || /^\d{4}-\d{2}-\d{2}$/.test(col0);

    if (isNewEntry) {
      // Finalize previous voucher
      if (currentVoucher && currentVoucher.lines.length > 0) {
        vouchers.push(currentVoucher);
      }

      const dateStr = col0;
      const ledgerName = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : '';
      const vType = cols[3] ? cols[3].replace(/^"|"$/g, '').trim() : 'General';
      const parsedDate = parseTallyDate(dateStr);

      currentVoucher = {
        date: parsedDate,
        dateStr,
        voucherType: vType,
        voucherNo: '',
        primaryParty: ledgerName,
        lines: [],
        narration: ''
      };

      // Find amount for first ledger line (searched in cols >= 4)
      const amount = extractFinancialAmount(cols, 4);

      // "हर लेजर के साथ अमाउंट आना जरूरी है, बिना अमाउंट के लेजर नहीं मिलेगा"
      if (ledgerName && amount !== null) {
        const debit = amount < 0 ? Math.abs(amount) : 0;
        const credit = amount > 0 ? amount : 0;
        currentVoucher.lines.push({
          account: ledgerName,
          amount,
          debit,
          credit,
          isHeader: true
        });
        accountsSet.add(ledgerName);
        totalDebits += debit;
        totalCredits += credit;
      }
    } else if (currentVoucher) {
      // Continuation lines for this same entry
      // Check for Voucher/Receipt Number
      if (rawLine.startsWith('(No. :') || col0.startsWith('(No. :')) {
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
        // Search amount in cols >= 1
        const amount = extractFinancialAmount(cols, 1);

        // "हर लेजर के साथ अमाउंट आना जरूरी है, बिना अमाउंट के लेजर नहीं मिलेगा"
        if (amount !== null) {
          const debit = amount < 0 ? Math.abs(amount) : 0;
          const credit = amount > 0 ? amount : 0;
          currentVoucher.lines.push({
            account: ledgerName,
            amount,
            debit,
            credit,
            isHeader: false
          });
          accountsSet.add(ledgerName);
          totalDebits += debit;
          totalCredits += credit;
        } else {
          // If no amount, could be narration / remarks
          if (!currentVoucher.narration) {
            currentVoucher.narration = ledgerName;
          } else {
            currentVoucher.narration += ' | ' + ledgerName;
          }
        }
      }
    }
  }

  // Push final voucher
  if (currentVoucher && currentVoucher.lines.length > 0) {
    vouchers.push(currentVoucher);
  }

  return {
    vouchers,
    totalVouchers: vouchers.length,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    accountsFound: Array.from(accountsSet)
  };
}
