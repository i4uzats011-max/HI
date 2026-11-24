export interface VoucherLine {
  account: string;
  debit: number;
  credit: number;
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

export function parseDayBookContent(content: string): ParseResult {
  const rawLines = content.split(/\r?\n/);
  const vouchers: ParsedVoucher[] = [];
  const accountsSet = new Set<string>();

  let currentVoucher: ParsedVoucher | null = null;
  let totalDebits = 0;
  let totalCredits = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine) continue;

    const cols = parseCsvLine(rawLine);
    const firstCol = cols[0] || '';

    // Check if line starts with a date like 15-Jun-23 or 2-Aug-23 or 2023-08-02
    const isDate = /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(firstCol) || /^\d{4}-\d{2}-\d{2}$/.test(firstCol);

    if (isDate) {
      if (currentVoucher && currentVoucher.lines.length > 0) {
        vouchers.push(currentVoucher);
      }

      const dateStr = cols[0];
      const party = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : '';
      const vType = cols[3] ? cols[3].replace(/^"|"$/g, '').trim() : 'General';
      const parsedDate = parseTallyDate(dateStr);

      currentVoucher = {
        date: parsedDate,
        dateStr,
        voucherType: vType,
        voucherNo: '',
        primaryParty: party,
        lines: [],
        narration: ''
      };

      // Extract amount for primary party (usually cols[4] or cols[5])
      let amount: number | null = null;
      for (let c = 4; c < cols.length; c++) {
        const valStr = cols[c];
        if (!valStr || valStr.includes('$') || valStr.includes('@') || valStr.includes('pcs') || valStr.includes('KGS')) continue;
        const num = parseFloat(valStr.replace(/,/g, ''));
        if (!isNaN(num) && num !== 0) {
          amount = num;
          break;
        }
      }

      if (party && amount !== null) {
        const debit = amount < 0 ? Math.abs(amount) : 0;
        const credit = amount > 0 ? amount : 0;
        currentVoucher.lines.push({ account: party, debit, credit });
        accountsSet.add(party);
        totalDebits += debit;
        totalCredits += credit;
      }
    } else if (currentVoucher) {
      // Check for voucher number e.g. "(No. :1)" or "(No. :INF-JOG-23-1)"
      if (rawLine.startsWith('(No. :') || firstCol.startsWith('(No. :')) {
        const raw = rawLine.startsWith('(No. :') ? rawLine : firstCol;
        currentVoucher.voucherNo = raw.replace(/\(No\.\s*:/, '').replace(/\)/, '').replace(/"/g, '').trim();
      } else if (firstCol && !firstCol.startsWith('@') && !firstCol.startsWith('$') && !firstCol.startsWith('?') && !firstCol.includes('pcs') && !firstCol.includes('KGS')) {
        // Additional ledger row
        const account = firstCol.replace(/^"|"$/g, '').trim();
        let amount: number | null = null;
        for (let c = 1; c < cols.length; c++) {
          const valStr = cols[c];
          if (!valStr || valStr.includes('$') || valStr.includes('@') || valStr.includes('pcs') || valStr.includes('KGS')) continue;
          const num = parseFloat(valStr.replace(/,/g, ''));
          if (!isNaN(num) && num !== 0) {
            amount = num;
            break;
          }
        }

        if (account && amount !== null) {
          const debit = amount < 0 ? Math.abs(amount) : 0;
          const credit = amount > 0 ? amount : 0;
          currentVoucher.lines.push({ account, debit, credit });
          accountsSet.add(account);
          totalDebits += debit;
          totalCredits += credit;
        } else if (account) {
          // Could be narration or note
          if (!currentVoucher.narration) {
            currentVoucher.narration = account;
          } else {
            currentVoucher.narration += ' | ' + account;
          }
        }
      }
    }
  }

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
