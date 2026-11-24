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
  CheckCircle2
} from 'lucide-react';

interface PartyLedgerModalProps {
  partyName: string | null;
  companyId: string;
  onClose: () => void;
}

export default function PartyLedgerModal({ partyName, companyId, onClose }: PartyLedgerModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('all'); // 'all' = Consolidated, or specific branchId
  const [selectedVType, setSelectedVType] = useState<string>('all');
  const [txnSearch, setTxnSearch] = useState<string>('');

  useEffect(() => {
    if (!partyName || !companyId) return;

    async function fetchLedger() {
      setLoading(true);
      setError(null);
      try {
        let url = `/api/ledgers/details?companyId=${encodeURIComponent(companyId)}&partyName=${encodeURIComponent(partyName)}`;
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

    fetchLedger();
  }, [partyName, companyId, selectedBranch, selectedVType]);

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

  const formatCurrency = (val: number) => {
    return '₹' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const currentBranchName = selectedBranch === 'all'
    ? 'Consolidated (सभी ब्रांचेस)'
    : (data?.branchBreakdowns?.find((b: any) => b.branchId === selectedBranch)?.branchName || 'Selected Branch');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
              {partyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold tracking-tight text-white">{partyName}</h2>
                {data?.summary && (
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    data.summary.status === 'Dr' 
                      ? 'bg-amber-400 text-slate-950' 
                      : data.summary.status === 'Cr' 
                      ? 'bg-emerald-400 text-slate-950' 
                      : 'bg-slate-300 text-slate-950'
                  }`}>
                    {data.summary.status === 'Dr' ? 'Receivable (लेना है / Dr)' : data.summary.status === 'Cr' ? 'Payable (देना है / Cr)' : 'Settled (NIL)'}
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200 mt-0.5 flex items-center space-x-2">
                <span>दृश्य (View): <b>{currentBranchName}</b></span>
                <span>•</span>
                <span>कुल एंट्रीज: <b>{data?.summary?.totalTransactions || 0}</b></span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={`/api/export?type=ledger&companyId=${encodeURIComponent(companyId)}&partyName=${encodeURIComponent(partyName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
              title="Download Ledger as Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </a>

            <button
              onClick={() => window.print()}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher: Consolidated vs Individual Branch */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-bold">
            <span className="text-slate-500 text-[11px] uppercase mr-1">लेजर मोड:</span>
            
            {/* Consolidated Button */}
            <button
              onClick={() => setSelectedBranch('all')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl transition ${
                selectedBranch === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>कंसोलिडेटेड (सभी ब्रांचेस)</span>
            </button>

            {/* Individual Branch Buttons */}
            {data?.branchBreakdowns?.map((bb: any) => {
              const isCurrent = selectedBranch === bb.branchId;
              return (
                <button
                  key={bb.branchId}
                  onClick={() => setSelectedBranch(bb.branchId)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl transition ${
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

          <div className="text-xs text-slate-500">
            {selectedBranch === 'all' ? (
              <span className="text-indigo-700 font-semibold">🌐 Viewing across all branches</span>
            ) : (
              <span className="text-indigo-700 font-semibold">🏢 Viewing isolated branch statement</span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium">Loading ledger statement and voucher type breakdown...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              {/* KPI Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {selectedBranch === 'all' ? 'Consolidated Debits (नाम)' : 'Branch Debits (नाम)'}
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1 flex items-center">
                    <ArrowDownRight className="w-4 h-4 text-amber-600 mr-1" />
                    {formatCurrency(data.summary.totalDebit)}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {selectedBranch === 'all' ? 'Consolidated Credits (जमा)' : 'Branch Credits (जमा)'}
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1 flex items-center">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600 mr-1" />
                    {formatCurrency(data.summary.totalCredit)}
                  </div>
                </div>

                <div className={`rounded-xl p-4 border ${
                  data.summary.status === 'Dr' 
                    ? 'bg-amber-50/70 border-amber-200' 
                    : data.summary.status === 'Cr' 
                    ? 'bg-emerald-50/70 border-emerald-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {selectedBranch === 'all' ? 'Net Outstanding (कुल बाकी)' : 'Branch Outstanding (बाकी)'}
                  </div>
                  <div className={`text-xl font-extrabold mt-1 ${
                    data.summary.status === 'Dr' ? 'text-amber-700' : data.summary.status === 'Cr' ? 'text-emerald-700' : 'text-slate-800'
                  }`}>
                    {formatCurrency(Math.abs(data.summary.netBalance))}
                    <span className="text-xs ml-1 font-semibold">({data.summary.status})</span>
                  </div>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Total Entries (कुल एंट्री संख्या)</div>
                  <div className="text-xl font-extrabold text-indigo-900 mt-1">
                    {data.summary.totalTransactions} Vouchers
                  </div>
                </div>
              </div>

              {/* Requirement: Breakdown of Voucher Types with exact Numbers / Count */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                      वाउचर टाइप अनुसार एंट्री संख्या (Voucher Type Entry Counts & Total Amounts)
                    </h3>
                  </div>
                  {selectedVType !== 'all' && (
                    <button 
                      onClick={() => setSelectedVType('all')} 
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Clear Filter (Show All Types)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
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
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.02]'
                            : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`} />
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {stats.count} {stats.count === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>
                        <div className={`text-xs font-semibold mt-2 truncate ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                          {stats.label}
                        </div>
                        <div className={`text-xs mt-0.5 font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-900'}`}>
                          {formatCurrency(stats.debit || stats.credit || 0)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search voucher no, narration, date..."
                      value={txnSearch}
                      onChange={(e) => setTxnSearch(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                    />
                  </div>

                  <div className="text-xs text-slate-500 flex items-center space-x-3">
                    <span>Showing <b>{filteredTxns.length}</b> entries</span>
                    {selectedBranch !== 'all' && (
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
                        Filtered: {currentBranchName}
                      </span>
                    )}
                    {selectedVType !== 'all' && (
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
                        Type: {selectedVType}
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Date (तारीख)</th>
                        {selectedBranch === 'all' && <th className="px-4 py-2.5">Branch (ब्रांच)</th>}
                        <th className="px-4 py-2.5">Voucher Type (टाइप)</th>
                        <th className="px-4 py-2.5">Voucher No (नंबर)</th>
                        <th className="px-4 py-2.5">Particulars / Narration</th>
                        <th className="px-4 py-2.5 text-right">Debit (नाम / -)</th>
                        <th className="px-4 py-2.5 text-right">Credit (जमा / +)</th>
                        <th className="px-4 py-2.5 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredTxns.length === 0 ? (
                        <tr>
                          <td colSpan={selectedBranch === 'all' ? 8 : 7} className="px-4 py-8 text-center text-slate-400">
                            No transactions found matching criteria
                          </td>
                        </tr>
                      ) : (
                        filteredTxns.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 font-mono">{t.dateStr}</td>
                            {selectedBranch === 'all' && (
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">
                                  {t.branchName}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {t.voucherType}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-700 font-mono font-bold">{t.voucherNo}</td>
                            <td className="px-4 py-2.5 text-slate-800 max-w-xs truncate" title={t.particulars}>
                              {t.particulars}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-amber-700 font-mono">
                              {t.debit > 0 ? formatCurrency(t.debit) : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-700 font-mono">
                              {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap font-bold text-slate-900 font-mono">
                              {formatCurrency(Math.abs(t.runningBalance))}
                              <span className={`text-[10px] ml-1 font-bold ${
                                t.balanceType === 'Dr' ? 'text-amber-600' : t.balanceType === 'Cr' ? 'text-emerald-600' : 'text-slate-400'
                              }`}>
                                {t.balanceType}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Connected to MongoDB cluster</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
