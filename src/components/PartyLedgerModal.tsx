'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Building2,
  Calendar,
  CreditCard,
  Receipt,
  ShoppingCart,
  ShoppingBag,
  BookOpen,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Filter,
  Search,
  Printer,
  Globe2,
  Ban,
  RotateCcw,
  Scale,
  Columns
} from 'lucide-react';

interface PartyLedgerModalProps {
  partyName: string | null;
  groupName?: string | null;
  companyId: string;
  onClose: () => void;
  onVoucherIgnored?: () => void;
}

export default function PartyLedgerModal({ partyName, groupName, companyId, onClose, onVoucherIgnored }: PartyLedgerModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedVType, setSelectedVType] = useState<string>('all');
  const [txnSearch, setTxnSearch] = useState<string>('');
  const [ledgerLayout, setLedgerLayout] = useState<'t_table' | 't_twosided'>('t_table');
  const [ignoringId, setIgnoringId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isGroupMode, setIsGroupMode] = useState<boolean>(!!groupName);

  useEffect(() => {
    if (!partyName && !groupName) return;
    if (!companyId) return;
    fetchLedger();
  }, [partyName, groupName, companyId, selectedBranch, selectedVType, isGroupMode]);

  async function fetchLedger() {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/ledgers/details?companyId=${encodeURIComponent(companyId)}`;
      if (isGroupMode && (groupName || data?.groupInfo?.groupName)) {
        url += `&groupName=${encodeURIComponent(groupName || data.groupInfo.groupName)}`;
      } else if (partyName) {
        url += `&partyName=${encodeURIComponent(partyName)}`;
      } else if (groupName) {
        url += `&groupName=${encodeURIComponent(groupName)}`;
      }

      if (selectedBranch !== 'all') {
        url += `&branchId=${encodeURIComponent(selectedBranch)}`;
      }
      if (selectedVType !== 'all') {
        url += `&voucherType=${encodeURIComponent(selectedVType)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load ledger');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  }

  // Handle Ignore Voucher
  async function handleIgnoreVoucher(voucherId: string) {
    if (!confirm('क्या आप इस गलत/अमान्य एंट्री को इग्नोर करना चाहते हैं? यह लेजर और बैलेंस से हटकर एक्सेप्शंस रिपोर्ट में चली जाएगी।')) {
      return;
    }

    setIgnoringId(voucherId);
    try {
      const res = await fetch('/api/vouchers/ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherId,
          isIgnored: true,
          reason: 'Marked as incorrect by user from ledger view'
        })
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('एंट्री लेजर से इग्नोर कर दी गई और एक्सेप्शंस रिपोर्ट में भेज दी गई।');
        setTimeout(() => setActionSuccessMsg(null), 4000);
        await fetchLedger();
        if (onVoucherIgnored) onVoucherIgnored();
      } else {
        alert(json.error || 'Failed to ignore voucher');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIgnoringId(null);
    }
  }

  if (!partyName) return null;

  const vTypeIcons: { [k: string]: any } = {
    'Pymt': CreditCard,
    'Rcpt': Receipt,
    'Sale': ShoppingCart,
    'Purc': ShoppingBag,
    'Jrnl': BookOpen,
    'Ctra': Layers,
  };

  const filteredTxns = (data?.transactions || []).filter((t: any) => {
    if (!txnSearch) return true;
    const term = txnSearch.toLowerCase();
    return (
      t.voucherNo?.toLowerCase().includes(term) ||
      t.particulars?.toLowerCase().includes(term) ||
      t.dateStr?.toLowerCase().includes(term) ||
      t.branchName?.toLowerCase().includes(term) ||
      t.voucherType?.toLowerCase().includes(term)
    );
  });

  const debitTxns = filteredTxns.filter((t: any) => t.debit > 0);
  const creditTxns = filteredTxns.filter((t: any) => t.credit > 0);

  const formatCurrency = (val: number) => {
    return '₹' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const currentBranchName = selectedBranch === 'all'
    ? 'Consolidated (सभी ब्रांचेस)'
    : (data?.branchBreakdowns?.find((b: any) => b.branchId === selectedBranch)?.branchName || 'Selected Branch');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto touch-scroll">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-6xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col border-0 sm:border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-3.5 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-base sm:text-lg shrink-0 mt-0.5 sm:mt-0">
              {partyName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-white break-words">{partyName}</h2>
                {data?.summary && (
                  <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full ${
                    data.summary.status === 'Dr' 
                      ? 'bg-amber-400 text-slate-950' 
                      : data.summary.status === 'Cr' 
                      ? 'bg-emerald-400 text-slate-950' 
                      : 'bg-slate-300 text-slate-950'
                  }`}>
                    {data.summary.status === 'Dr' ? 'Receivable (लेना है / Dr)' : data.summary.status === 'Cr' ? 'Payable (देना है / Cr)' : 'Settled (NIL)'}
                  </span>
                )}
                {data?.ignoredCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full bg-rose-500/30 border border-rose-400/40 text-rose-200 flex items-center space-x-1">
                    <Ban className="w-3 h-3" />
                    <span>{data.ignoredCount} Ignored</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-200 mt-0.5 flex items-center space-x-1.5 flex-wrap">
                <span>दृश्य: <b className="text-white">{currentBranchName}</b></span>
                <span>•</span>
                <span>T-Format Running Ledger</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 shrink-0">
            <a
              href={`/api/export?type=ledger&companyId=${encodeURIComponent(companyId)}&partyName=${encodeURIComponent(partyName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition active:scale-95"
              title="Download Ledger as Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Excel</span>
            </a>

            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-300 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition"
              title="Close Modal"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher: Consolidated vs Individual Branch + T-Format Layout */}
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Branch Mode Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto touch-scroll no-scrollbar text-xs font-bold py-0.5">
            <span className="text-slate-500 text-[10px] sm:text-[11px] uppercase shrink-0 mr-1">मोड:</span>
            
            <button
              onClick={() => setSelectedBranch('all')}
              className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl transition shrink-0 active:scale-95 ${
                selectedBranch === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>कंसोलिडेटेड (सभी ब्रांचेस)</span>
            </button>

            {data?.branchBreakdowns?.map((bb: any) => {
              const isCurrent = selectedBranch === bb.branchId;
              return (
                <button
                  key={bb.branchId}
                  onClick={() => setSelectedBranch(bb.branchId)}
                  className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl transition shrink-0 active:scale-95 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{bb.branchName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {formatCurrency(Math.abs(bb.netBalance))} {bb.status}
                  </span>
                </button>
              );
            })}
          </div>

          {/* T-Format Switcher Toggle */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto touch-scroll no-scrollbar shrink-0">
            <button
              onClick={() => setLedgerLayout('t_table')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition shrink-0 active:scale-95 ${
                ledgerLayout === 't_table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>टी रनिंग (T-Running)</span>
            </button>
            <button
              onClick={() => setLedgerLayout('t_twosided')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition shrink-0 active:scale-95 ${
                ledgerLayout === 't_twosided' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>टू-साइडेड (Dr vs Cr)</span>
            </button>
          </div>
        </div>

        {/* Action success alert */}
        {actionSuccessMsg && (
          <div className="mx-3.5 sm:mx-6 mt-3 sm:mt-4 p-2.5 sm:p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto touch-scroll p-3 sm:p-6 space-y-4 sm:space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-slate-400">
              <div className="w-9 h-9 sm:w-10 sm:h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs sm:text-sm font-medium">Loading ledger statement and voucher type breakdown...</p>
            </div>
          )}

          {error && (
            <div className="p-3.5 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              {/* KPI Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
                  <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
                    {selectedBranch === 'all' ? 'Total Debits (कुल नाम)' : 'Branch Debits (नाम)'}
                  </div>
                  <div className="text-base sm:text-xl font-bold text-slate-900 mt-1 flex items-center font-mono">
                    <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 mr-1 shrink-0" />
                    <span className="truncate">{formatCurrency(data.summary.totalDebit)}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
                  <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
                    {selectedBranch === 'all' ? 'Total Credits (कुल जमा)' : 'Branch Credits (जमा)'}
                  </div>
                  <div className="text-base sm:text-xl font-bold text-slate-900 mt-1 flex items-center font-mono">
                    <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 mr-1 shrink-0" />
                    <span className="truncate">{formatCurrency(data.summary.totalCredit)}</span>
                  </div>
                </div>

                <div className={`rounded-xl p-3 sm:p-4 border ${
                  data.summary.status === 'Dr' 
                    ? 'bg-amber-50/70 border-amber-200' 
                    : data.summary.status === 'Cr' 
                    ? 'bg-emerald-50/70 border-emerald-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 truncate">
                    {selectedBranch === 'all' ? 'Net Outstanding (कुल बाकी)' : 'Branch Outstanding (बाकी)'}
                  </div>
                  <div className={`text-base sm:text-xl font-extrabold mt-1 font-mono truncate ${
                    data.summary.status === 'Dr' ? 'text-amber-700' : data.summary.status === 'Cr' ? 'text-emerald-700' : 'text-slate-800'
                  }`}>
                    {formatCurrency(Math.abs(data.summary.netBalance))}
                    <span className="text-[11px] sm:text-xs ml-1 font-semibold">({data.summary.status})</span>
                  </div>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 sm:p-4">
                  <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-700 truncate">Total Valid Entries</div>
                  <div className="text-base sm:text-xl font-extrabold text-indigo-900 mt-1 truncate">
                    {data.summary.totalTransactions} Vouchers
                  </div>
                </div>
              </div>

              {/* Requirement: Breakdown of Voucher Types with exact Numbers / Count */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                      वाउचर प्रकार अनुसार सारांश (Voucher Types)
                    </h3>
                  </div>
                  {selectedVType !== 'all' && (
                    <button 
                      onClick={() => setSelectedVType('all')} 
                      className="text-[11px] sm:text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
                  {Object.entries(data.voucherTypeCounts || {}).map(([vtKey, stats]: [string, any]) => {
                    if (stats.count === 0 && vtKey !== 'Pymt' && vtKey !== 'Sale' && vtKey !== 'Purc' && vtKey !== 'Rcpt' && vtKey !== 'Jrnl') {
                      return null;
                    }
                    const Icon = vTypeIcons[vtKey] || BookOpen;
                    const isSelected = selectedVType === vtKey;

                    return (
                      <button
                        key={vtKey}
                        onClick={() => setSelectedVType(isSelected ? 'all' : vtKey)}
                        className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`} />
                          <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {stats.count}
                          </span>
                        </div>
                        <div className={`text-[11px] sm:text-xs font-semibold mt-1.5 truncate ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                          {stats.label}
                        </div>
                        <div className={`text-[11px] sm:text-xs mt-0.5 font-bold font-mono truncate ${isSelected ? 'text-indigo-100' : 'text-slate-900'}`}>
                          {formatCurrency(stats.debit || stats.credit || 0)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search and Ledger Filter Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search voucher, narration, date..."
                    value={txnSearch}
                    onChange={(e) => setTxnSearch(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                  />
                  {txnSearch && <button onClick={() => setTxnSearch('')} className="text-slate-400 text-xs px-1">✕</button>}
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between sm:justify-end space-x-2">
                  <span>प्रविष्टियां: <b>{filteredTxns.length}</b></span>
                  {selectedVType !== 'all' && (
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">
                      Type: {selectedVType}
                    </span>
                  )}
                </div>
              </div>

              {/* ================= VIEW 1: T-FORMAT RUNNING STATEMENT TABLE ================= */}
              {ledgerLayout === 't_table' && (
                <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                  {/* T-Ledger Header Bar */}
                  <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-slate-800 to-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="font-bold text-xs sm:text-sm tracking-wide truncate">
                      T-FORMAT LEDGER ACCOUNT: <span className="text-indigo-200 underline">{partyName}</span>
                    </div>
                    <div className="text-[10px] sm:text-xs text-indigo-200 font-mono">
                      Formula: Net = Dr - Cr
                    </div>
                  </div>

                  {/* Mobile swipe hint */}
                  <div className="sm:hidden bg-indigo-50 border-b border-indigo-100 px-3 py-1.5 flex items-center justify-between text-[11px] text-indigo-900 font-semibold">
                    <span>👈 विवरण व बैलेंस देखने हेतु स्वाइप करें</span>
                    <span className="text-[10px] bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-bold">Swipe 👉</span>
                  </div>

                  <div className="overflow-x-auto touch-scroll max-h-[460px]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b-2 border-slate-300 sticky top-0 shadow-sm z-20">
                        <tr>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 sticky left-0 z-30 bg-slate-100 sticky-shadow-right whitespace-nowrap">
                            Date (तारीख)
                          </th>
                          {selectedBranch === 'all' && <th className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">Branch</th>}
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">Voucher Type & No</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[180px]">पार्टी विवरण (Particulars)</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right bg-amber-50/60 text-amber-900 border-l border-amber-200 whitespace-nowrap">
                            DEBIT (नाम / -)
                          </th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right bg-emerald-50/60 text-emerald-900 border-l border-emerald-200 whitespace-nowrap">
                            CREDIT (जमा / +)
                          </th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right bg-slate-200/80 text-slate-900 border-l border-slate-300 font-black whitespace-nowrap">
                            BALANCE (रनिंग बैलेंस)
                          </th>
                          <th className="px-2.5 sm:px-3 py-2.5 sm:py-3 text-center border-l border-slate-200 whitespace-nowrap">Ignore</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {filteredTxns.length === 0 ? (
                          <tr>
                            <td colSpan={selectedBranch === 'all' ? 8 : 7} className="px-4 py-12 text-center text-slate-400">
                              No entries found matching criteria
                            </td>
                          </tr>
                        ) : (
                          filteredTxns.map((t: any) => (
                            <tr key={t.id} className="group hover:bg-indigo-50/50 transition">
                              <td className="px-3 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap text-slate-700 font-mono font-semibold sticky left-0 z-10 bg-white group-hover:bg-indigo-50/80 sticky-shadow-right">
                                {t.dateStr}
                              </td>
                              
                              {selectedBranch === 'all' && (
                                <td className="px-3 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap">
                                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                                    {t.branchName}
                                  </span>
                                </td>
                              )}

                              <td className="px-3 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mr-1">
                                  {t.voucherType}
                                </span>
                                <span className="font-mono text-slate-700 font-semibold">{t.voucherNo}</span>
                              </td>

                              <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-slate-900 font-medium min-w-[180px] max-w-xs truncate" title={t.particulars}>
                                {t.particulars}
                              </td>

                              {/* Debit Column */}
                              <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-right font-bold text-amber-700 font-mono bg-amber-50/30 border-l border-amber-100 whitespace-nowrap">
                                {t.debit > 0 ? formatCurrency(t.debit) : '-'}
                              </td>

                              {/* Credit Column */}
                              <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-right font-bold text-emerald-700 font-mono bg-emerald-50/30 border-l border-emerald-100 whitespace-nowrap">
                                {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                              </td>

                              {/* Running Balance Column */}
                              <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-right whitespace-nowrap font-black text-slate-900 font-mono bg-slate-100/60 border-l border-slate-200">
                                {formatCurrency(Math.abs(t.runningBalance))}
                                <span className={`text-[10px] ml-1.5 px-1 py-0.2 rounded font-bold ${
                                  t.balanceType === 'Dr' ? 'bg-amber-100 text-amber-800' : t.balanceType === 'Cr' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'
                                }`}>
                                  {t.balanceType}
                                </span>
                              </td>

                              {/* Action: Ignore Button */}
                              <td className="px-2.5 sm:px-3 py-2 sm:py-2.5 text-center border-l border-slate-200 whitespace-nowrap">
                                <button
                                  disabled={ignoringId === t.id}
                                  onClick={() => handleIgnoreVoucher(t.id)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold border border-rose-200 transition active:scale-95 touch-target-min sm:touch-target-auto"
                                  title="Mark this entry as incorrect / ignored"
                                >
                                  <Ban className="w-3 h-3 text-rose-600" />
                                  <span>Ignore</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================= VIEW 2: CLASSIC TWO-SIDED T-ACCOUNT VIEW ================= */}
              {ledgerLayout === 't_twosided' && (
                <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                  {/* Account Title */}
                  <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 text-white text-center font-bold text-xs sm:text-sm tracking-wide border-b border-slate-800">
                    Dr. &nbsp;&nbsp;&nbsp;&nbsp; LEDGER ACCOUNT: {partyName} &nbsp;&nbsp;&nbsp;&nbsp; Cr.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-300">
                    
                    {/* LEFT SIDE: DEBITS (नाम) */}
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 bg-amber-50/20">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200 text-amber-900 font-extrabold text-[11px] sm:text-xs uppercase tracking-wider">
                        <span>DEBIT SIDE (नाम / -)</span>
                        <span className="font-mono">Dr: {formatCurrency(data.summary.totalDebit)}</span>
                      </div>

                      <div className="overflow-y-auto touch-scroll max-h-[340px] sm:max-h-[380px] divide-y divide-slate-100 text-xs">
                        {debitTxns.length === 0 ? (
                          <div className="py-6 text-center text-slate-400">No debit entries</div>
                        ) : (
                          debitTxns.map((t: any) => (
                            <div key={t.id} className="py-2 flex items-center justify-between hover:bg-amber-50/50 pr-1">
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="font-semibold text-slate-800 truncate">To {t.particulars}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  {t.dateStr} | {t.voucherType} #{t.voucherNo} {t.branchName && `| ${t.branchName}`}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0">
                                <span className="font-bold text-amber-800 font-mono text-xs sm:text-sm whitespace-nowrap">
                                  {formatCurrency(t.debit)}
                                </span>
                                <button
                                  onClick={() => handleIgnoreVoucher(t.id)}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 rounded transition active:scale-95"
                                  title="Ignore entry"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* RIGHT SIDE: CREDITS (जमा) */}
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 bg-emerald-50/20">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200 text-emerald-900 font-extrabold text-[11px] sm:text-xs uppercase tracking-wider">
                        <span>CREDIT SIDE (जमा / +)</span>
                        <span className="font-mono">Cr: {formatCurrency(data.summary.totalCredit)}</span>
                      </div>

                      <div className="overflow-y-auto touch-scroll max-h-[340px] sm:max-h-[380px] divide-y divide-slate-100 text-xs">
                        {creditTxns.length === 0 ? (
                          <div className="py-6 text-center text-slate-400">No credit entries</div>
                        ) : (
                          creditTxns.map((t: any) => (
                            <div key={t.id} className="py-2 flex items-center justify-between hover:bg-emerald-50/50 pr-1">
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="font-semibold text-slate-800 truncate">By {t.particulars}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  {t.dateStr} | {t.voucherType} #{t.voucherNo} {t.branchName && `| ${t.branchName}`}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0">
                                <span className="font-bold text-emerald-800 font-mono text-xs sm:text-sm whitespace-nowrap">
                                  {formatCurrency(t.credit)}
                                </span>
                                <button
                                  onClick={() => handleIgnoreVoucher(t.id)}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 rounded transition active:scale-95"
                                  title="Ignore entry"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Two-sided footer balance */}
                  <div className="p-3 bg-slate-100 border-t-2 border-slate-300 flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Balance c/d (नेट क्लोजिंग बैलेंस):</span>
                    <span className={`text-xs sm:text-sm font-mono font-black ${
                      data.summary.status === 'Dr' ? 'text-amber-700' : data.summary.status === 'Cr' ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      {formatCurrency(Math.abs(data.summary.netBalance))} {data.summary.status}
                    </span>
                  </div>
                </div>
              )}

            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="hidden sm:inline">Connected to MongoDB cluster</span>
          <span className="sm:hidden text-[11px]">MongoDB focustube</span>
          <button
            onClick={onClose}
            className="px-4 py-2 sm:py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold transition"
          >
            Close (बंद करें)
          </button>
        </div>

      </div>
    </div>
  );
}
