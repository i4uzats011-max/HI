# BOOKS MATCH - Multi-Branch Ledger Reconciliation System 📊

> **Multi-Company & Multi-Branch Tally DayBook Ledger Reconciliation Platform built with Next.js & MongoDB.**

---

## 🌟 Key Features

### 1. 🏢 Multi-Company & Multi-Branch Architecture
- Create and manage multiple Companies and Branches (e.g. Head Office, Mumbai Branch, Bhiwandi Godown, Delhi Branch, etc.).
- Same customers/vendors are automatically cross-indexed across all branches.

### 2. 📥 High-Speed Tally DayBook Import Engine
- Imports standard Tally DayBook exports (`DayBook.TXT` / `CSV`).
- Parses balanced double-entry vouchers (Receipts, Payments, Sales, Purchases, Journals, Contras, Credit/Debit Notes).
- High-performance chunked insertion directly into **MongoDB**.
- Includes 1-Click Fast Import for local sample files (11,600+ vouchers).

### 3. 📊 Multi-Branch Party Reconciliation Matrix
- **"किस पार्टी से किस-किस ब्रांचेस में कितना-कितना बाकी है"**
- Consolidated overview matrix displaying every party's outstanding position across every single branch.
- Displays branch-wise Dr/Cr balances, Consolidated Debit, Consolidated Credit, and Net Outstanding Balance.
- Instant search and filters: *All Parties*, *Multi-Branch Parties Only*, *Receivables (लेना है / Dr)*, *Payables (देना है / Cr)*.

### 4. 🔍 360° Party Ledger Breakdown (Voucher Count by Type)
- Clicking on any party reveals a comprehensive 360° modal:
  - **Voucher Type Breakdown (Entry Count & Amounts)**:
    - 💳 Payments (भुगतान) - Count & Total Amount
    - 📥 Receipts (प्राप्ति) - Count & Total Amount
    - 🏷️ Sales (बिक्री) - Count & Total Amount
    - 📦 Purchases (खरीद) - Count & Total Amount
    - 📝 Journals (जनरल) - Count & Total Amount
    - 🔄 Contras (कॉन्ट्रा) & Notes
  - **Branch-Wise Breakdown Grid**: Outstanding balance per branch.
  - **Chronological Transaction Ledger**: Date, Branch, Voucher Type, Voucher No, Particulars, Debit, Credit, Running Balance.
  - Interactive filter by voucher type with a single click.

### 5. 🔄 Inter-Branch Books Reconciliation
- **"आपस में क्या रिकंसीलेशन है / आपसी बैलेंस"**
- Reconciles cross-branch accounts (Branch 1's book balance of Branch 2 vs Branch 2's book balance of Branch 1).
- Detects discrepancies and highlights matched vs unreconciled differences.

### 6. 🗑️ Flexible Data Reset & Re-import
- Clear data for a specific branch.
- Clear data for an entire company.
- Complete database reset for a fresh start whenever new data arrives.

### 7. 📑 Excel (.xlsx) Reports Export
- 1-Click export of the Multi-Branch Reconciliation Matrix to Excel.
- 1-Click export of Detailed Party Ledgers with running balances to Excel.

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/i4uzats011-max/HI.git
cd HI
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
MONGO_DB=focustube
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI & Styling**: React 18, Tailwind CSS, Lucide React Icons
- **Database**: MongoDB (Atlas)
- **Export**: SheetJS (XLSX)
