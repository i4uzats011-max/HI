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

  const finalizeVoucher = (v: ParsedVoucher) => {
    if (!v || v.lines.length === 0) return;
    const vDr = v.lines.reduce((s, l) => s + l.debit, 0);
    const vCr = v.lines.reduce((s, l) => s + l.credit, 0);

    // Strict Double-Entry Rule: Debit == Credit (Sum of Plus and Minus == 0)
    if (Math.abs(vDr - vCr) < 0.05 && vDr > 0) {
      vouchers.push(v);
      for (const line of v.lines) {
        if (line.account) accountsSet.add(line.account);
      }
      totalDebits += vDr;
      totalCredits += vCr;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine) continue;

    const cols = parseCsvLine(rawLine);
    const col0 = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : '';

    // Check if col0 is a Date: Starts a new entry!
    const isNewEntry = datePattern.test(col0) || /^\d{4}-\d{2}-\d{2}$/.test(col0);

    if (isNewEntry) {
      if (currentVoucher) {
        finalizeVoucher(currentVoucher);
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

      // Header line amount
      const amount = extractFinancialAmount(cols, 4);
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
      }
    } else if (currentVoucher) {
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
        const amount = extractFinancialAmount(cols, 1);

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
        }
      }
    }
  }

  // Push final voucher
  if (currentVoucher) {
    finalizeVoucher(currentVoucher);
  }

  return {
    vouchers,
    totalVouchers: vouchers.length,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    accountsFound: Array.from(accountsSet)
  };
}
