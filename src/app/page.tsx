'use client';

import React, { useState, useEffect } from 'react';
import {
  Building,
  Building2,
  UploadCloud,
  FileSpreadsheet,
  Layers,
  ArrowRightLeft,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronRight,
  Database,
  Eye,
  TrendingUp,
  TrendingDown,
  Scale,
  Sparkles,
  Zap,
  Check,
  FolderOpen
} from 'lucide-react';
import PartyLedgerModal from '@/components/PartyLedgerModal';

export default function Dashboard() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'matrix' | 'branches' | 'interbranch' | 'reset'>('matrix');

  // Company State
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState<boolean>(false);
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newCompanyCode, setNewCompanyCode] = useState<string>('');

  // Branch State
  const [branches, setBranches] = useState<any[]>([]);
  const [showNewBranchModal, setShowNewBranchModal] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [newBranchCode, setNewBranchCode] = useState<string>('');

  // Import State
  const [importBranchId, setImportBranchId] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importClearExisting, setImportClearExisting] = useState<boolean>(true);

  // Matrix State
  const [matrixData, setMatrixData] = useState<any>(null);
  const [matrixLoading, setMatrixLoading] = useState<boolean>(false);
  const [matrixSearch, setMatrixSearch] = useState<string>('');
  const [matrixFilter, setMatrixFilter] = useState<'all' | 'multi_branch' | 'dr' | 'cr'>('all');

  // 360 Party Ledger Modal State
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  // Inter-Branch State
  const [ibBranch1, setIbBranch1] = useState<string>('');
  const [ibBranch2, setIbBranch2] = useState<string>('');
  const [ibData, setIbData] = useState<any>(null);
  const [ibLoading, setIbLoading] = useState<boolean>(false);

  // Reset State
  const [resetModal, setResetModal] = useState<{ open: boolean; type: 'branch' | 'company' | 'all'; id?: string; name?: string }>({
    open: false,
    type: 'company'
  });
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  // Global Notification
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Companies on Load
  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      const res = await fetch('/api/companies');
      const json = await res.json();
      if (json.success) {
        setCompanies(json.companies || []);
        if (json.companies && json.companies.length > 0) {
          // If no active company, select first
          if (!selectedCompanyId) {
            setSelectedCompanyId(json.companies[0].id);
            setSelectedCompany(json.companies[0]);
          } else {
            const current = json.companies.find((c: any) => c.id === selectedCompanyId) || json.companies[0];
            setSelectedCompany(current);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  }

  // When selectedCompanyId changes, refresh branches & matrix
  useEffect(() => {
    if (!selectedCompanyId) return;
    const current = companies.find(c => c.id === selectedCompanyId);
    setSelectedCompany(current);
    fetchBranches(selectedCompanyId);
    fetchMatrix(selectedCompanyId);
  }, [selectedCompanyId, companies]);

  async function fetchBranches(companyId: string) {
    try {
      const res = await fetch(`/api/branches?companyId=${companyId}`);
      const json = await res.json();
      if (json.success) {
        setBranches(json.branches || []);
        if (json.branches && json.branches.length > 0) {
          if (!importBranchId) setImportBranchId(json.branches[0].id);
          if (!ibBranch1) setIbBranch1(json.branches[0].id);
          if (!ibBranch2 && json.branches.length > 1) setIbBranch2(json.branches[1].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchMatrix(companyId: string, search = matrixSearch, filter = matrixFilter) {
    setMatrixLoading(true);
    try {
      const res = await fetch(`/api/reconciliation/matrix?companyId=${companyId}&search=${encodeURIComponent(search)}&filter=${filter}`);
      const json = await res.json();
      if (json.success) {
        setMatrixData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMatrixLoading(false);
    }
  }

  // Handle Search in Matrix
  useEffect(() => {
    if (selectedCompanyId) {
      const timer = setTimeout(() => {
        fetchMatrix(selectedCompanyId, matrixSearch, matrixFilter);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [matrixSearch, matrixFilter]);

  // Create Company
  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCompanyName, code: newCompanyCode })
      });
      const json = await res.json();
      if (json.success) {
        showToast('कंपनी सफलतापूर्वक बनाई गई!');
        setNewCompanyName('');
        setNewCompanyCode('');
        setShowNewCompanyModal(false);
        await fetchCompanies();
        setSelectedCompanyId(json.company.id);
      } else {
        showToast(json.error || 'Error creating company', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  // Create Branch
  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!newBranchName.trim() || !selectedCompanyId) return;
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: selectedCompanyId, name: newBranchName, code: newBranchCode })
      });
      const json = await res.json();
      if (json.success) {
        showToast('ब्रांच सफलतापूर्वक बनाई गई!');
        setNewBranchName('');
        setNewBranchCode('');
        setShowNewBranchModal(false);
        await fetchBranches(selectedCompanyId);
      } else {
        showToast(json.error || 'Error creating branch', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  // Import Handler (File or 1-Click Sample)
  async function handleImport(useSample = false) {
    if (!selectedCompanyId || !importBranchId) {
      showToast('कृपया पहले कंपनी और ब्रांच चुनें', 'error');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      let res;
      if (useSample) {
        res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: selectedCompanyId,
            branchId: importBranchId,
            useSampleFile: true,
            clearExisting: importClearExisting
          })
        });
      } else {
        if (!importFile) {
          showToast('कृपया पहले DayBook फ़ाइल चुनें', 'error');
          setImporting(false);
          return;
        }
        const formData = new FormData();
        formData.append('companyId', selectedCompanyId);
        formData.append('branchId', importBranchId);
        formData.append('clearExisting', importClearExisting ? 'true' : 'false');
        formData.append('file', importFile);

        res = await fetch('/api/import', {
          method: 'POST',
          body: formData
        });
      }

      const json = await res.json();
      if (json.success) {
        setImportResult(json.summary);
        showToast(`इम्पोर्ट सफल! ${json.summary.totalVouchers} वाउचर्स MongoDB में सेव हो गए।`);
        // Refresh branches & matrix
        await fetchBranches(selectedCompanyId);
        await fetchMatrix(selectedCompanyId);
      } else {
        showToast(json.error || 'Import failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  }

  // Inter-Branch Reconciliation Fetch
  async function fetchInterBranch() {
    if (!selectedCompanyId) return;
    setIbLoading(true);
    try {
      let url = `/api/reconciliation/inter-branch?companyId=${selectedCompanyId}`;
      if (ibBranch1) url += `&branch1Id=${ibBranch1}`;
      if (ibBranch2) url += `&branch2Id=${ibBranch2}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setIbData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIbLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'interbranch') {
      fetchInterBranch();
    }
  }, [activeTab, ibBranch1, ibBranch2, selectedCompanyId]);

  // Execute Reset
  async function executeReset() {
    setResetLoading(true);
    try {
      const res = await fetch('/api/data/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: resetModal.type,
          companyId: resetModal.type === 'company' ? selectedCompanyId : undefined,
          branchId: resetModal.type === 'branch' ? resetModal.id : undefined
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setResetModal({ open: false, type: 'company' });
        if (resetModal.type === 'all') {
          await fetchCompanies();
          setSelectedCompanyId('');
          setMatrixData(null);
          setBranches([]);
        } else {
          await fetchBranches(selectedCompanyId);
          await fetchMatrix(selectedCompanyId);
        }
      } else {
        showToast(json.error || 'Reset failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setResetLoading(false);
    }
  }

  const formatCurrency = (val: number) => {
    return '₹' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-semibold transition-all transform animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-wide text-white">BOOKS MATCH</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 px-2 py-0.5 rounded-full">
                  Multi-Branch
                </span>
              </div>
              <p className="text-xs text-slate-400">Ledger Reconciliation & DayBook Matching System</p>
            </div>
          </div>

          {/* Company Selector & Actions */}
          <div className="flex items-center space-x-3">
            {/* Database indicator */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>MongoDB: focustube</span>
            </div>

            {/* Select Company */}
            <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1">
              <Building className="w-4 h-4 text-indigo-400" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer pr-2"
              >
                {companies.length === 0 ? (
                  <option value="">No Company Found</option>
                ) : (
                  companies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* New Company Button */}
            <button
              onClick={() => setShowNewCompanyModal(true)}
              className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition"
              title="Add New Company"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Company</span>
            </button>

            {/* Wipe / Reset Data */}
            <button
              onClick={() => setResetModal({ open: true, type: 'company', name: selectedCompany?.name })}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
              title="Delete or Reset Data"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>पार्टी रिकंसीलेशन मैट्रिक्स (Party Reconciliation Matrix)</span>
          </button>

          <button
            onClick={() => setActiveTab('branches')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'branches'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>ब्रांचेस व इम्पोर्ट (Branches & DayBook Import)</span>
            {branches.length > 0 && (
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full">
                {branches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('interbranch')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'interbranch'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>आपसी ब्रांच मिलान (Inter-Branch Reconciliation)</span>
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'reset'
                ? 'border-rose-500 text-rose-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>डेटा रीसेट (Reset & Clear Data)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* If no company created yet */}
        {companies.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm max-w-lg mx-auto mt-10">
            <Building2 className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900">कंपनी बनाएं (Create First Company)</h2>
            <p className="text-sm text-slate-500 mt-2 mb-6">
              शुरू करने के लिए अपनी कंपनी का नाम दर्ज करें। इसके बाद आप ब्रांचेस बनाकर DayBook इम्पोर्ट कर सकेंगे।
            </p>
            <button
              onClick={() => setShowNewCompanyModal(true)}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Company Now</span>
            </button>
          </div>
        )}

        {/* ==================== TAB 1: RECONCILIATION MATRIX ==================== */}
        {companies.length > 0 && activeTab === 'matrix' && (
          <div className="space-y-6">
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">कुल पार्टियां (Parties)</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {matrixData?.stats?.totalParties || 0}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
                <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">मल्टी-ब्रांच पार्टियां</div>
                  <div className="text-xl font-black text-purple-700 mt-0.5">
                    {matrixData?.stats?.multiBranchCount || 0}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">कुल लेना है (Receivable Dr)</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">
                    {formatCurrency(matrixData?.stats?.totalReceivable || 0)}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">कुल देना है (Payable Cr)</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">
                    {formatCurrency(matrixData?.stats?.totalPayable || 0)}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">नेट पोजीशन (Net Balance)</div>
                  <div className={`text-lg font-black mt-0.5 ${
                    (matrixData?.stats?.netConsolidated || 0) >= 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {formatCurrency(Math.abs(matrixData?.stats?.netConsolidated || 0))}
                    <span className="text-xs ml-1 font-bold">
                      {(matrixData?.stats?.netConsolidated || 0) >= 0 ? 'Dr' : 'Cr'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Matrix Filter & Action Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              
              {/* Search input */}
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="पार्टी या लेजर का नाम खोजें (Search party)..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                />
                {matrixSearch && (
                  <button onClick={() => setMatrixSearch('')} className="text-slate-400 hover:text-slate-600 text-xs">
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setMatrixFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    matrixFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Parties (सभी)
                </button>
                <button
                  onClick={() => setMatrixFilter('multi_branch')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    matrixFilter === 'multi_branch' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Multi-Branch Only ({matrixData?.stats?.multiBranchCount || 0})
                </button>
                <button
                  onClick={() => setMatrixFilter('dr')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    matrixFilter === 'dr' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Receivables (लेना है / Dr)
                </button>
                <button
                  onClick={() => setMatrixFilter('cr')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    matrixFilter === 'cr' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Payables (देना है / Cr)
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchMatrix(selectedCompanyId)}
                  className="p-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition"
                  title="Refresh Matrix"
                >
                  <RefreshCw className={`w-4 h-4 ${matrixLoading ? 'animate-spin text-indigo-600' : ''}`} />
                </button>

                <a
                  href={`/api/export?type=matrix&companyId=${encodeURIComponent(selectedCompanyId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Matrix to Excel</span>
                </a>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-5 py-3.5">पार्टी का नाम (Party / Ledger Name)</th>
                      
                      {/* Dynamic Branch Columns */}
                      {matrixData?.branches?.map((b: any) => (
                        <th key={b.id} className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="text-slate-900">{b.name}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">({b.code})</span>
                        </th>
                      ))}

                      <th className="px-4 py-3.5 text-right text-slate-600">Consolidated Dr</th>
                      <th className="px-4 py-3.5 text-right text-slate-600">Consolidated Cr</th>
                      <th className="px-5 py-3.5 text-right font-black text-slate-900">कुल बाकी (Net Outstanding)</th>
                      <th className="px-4 py-3.5 text-center">360° लेजर</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">
                    {matrixLoading && (
                      <tr>
                        <td colSpan={6 + (matrixData?.branches?.length || 0)} className="py-12 text-center text-slate-400">
                          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <span>Loading Party Reconciliation Matrix...</span>
                        </td>
                      </tr>
                    )}

                    {!matrixLoading && (!matrixData?.parties || matrixData.parties.length === 0) && (
                      <tr>
                        <td colSpan={6 + (matrixData?.branches?.length || 0)} className="py-12 text-center text-slate-400">
                          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600">No party ledger entries found</p>
                          <p className="text-xs text-slate-400 mt-1">Please import DayBook files for branches first</p>
                          <button
                            onClick={() => setActiveTab('branches')}
                            className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Go to DayBook Import</span>
                          </button>
                        </td>
                      </tr>
                    )}

                    {!matrixLoading && matrixData?.parties?.map((p: any) => (
                      <tr
                        key={p.partyName}
                        onClick={() => setSelectedParty(p.partyName)}
                        className="hover:bg-indigo-50/40 cursor-pointer transition"
                      >
                        {/* Party Name */}
                        <td className="px-5 py-3 text-slate-900 font-semibold max-w-xs">
                          <div className="flex items-center space-x-2">
                            <span className="truncate">{p.partyName}</span>
                            {p.isMultiBranch && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                                {p.branchesCount} Branches
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Branch Balance Columns */}
                        {matrixData?.branches?.map((b: any) => {
                          const bInfo = p.branchBalances[b.id];
                          if (!bInfo || bInfo.net === 0) {
                            return (
                              <td key={b.id} className="px-4 py-3 text-right text-slate-300 font-mono">
                                -
                              </td>
                            );
                          }
                          return (
                            <td key={b.id} className="px-4 py-3 text-right whitespace-nowrap">
                              <span className={`font-bold font-mono ${
                                bInfo.status === 'Dr' ? 'text-amber-700' : bInfo.status === 'Cr' ? 'text-emerald-700' : 'text-slate-500'
                              }`}>
                                {formatCurrency(Math.abs(bInfo.net))}
                              </span>
                              <span className={`text-[10px] ml-1 font-bold ${
                                bInfo.status === 'Dr' ? 'text-amber-600' : 'text-emerald-600'
                              }`}>
                                {bInfo.status}
                              </span>
                            </td>
                          );
                        })}

                        {/* Consolidated Debit */}
                        <td className="px-4 py-3 text-right text-slate-600 font-mono">
                          {p.totalDebit > 0 ? formatCurrency(p.totalDebit) : '-'}
                        </td>

                        {/* Consolidated Credit */}
                        <td className="px-4 py-3 text-right text-slate-600 font-mono">
                          {p.totalCredit > 0 ? formatCurrency(p.totalCredit) : '-'}
                        </td>

                        {/* Net Consolidated */}
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <span className={`font-black text-sm font-mono ${
                            p.status === 'Dr' ? 'text-amber-700' : p.status === 'Cr' ? 'text-emerald-700' : 'text-slate-500'
                          }`}>
                            {formatCurrency(Math.abs(p.netBalance))}
                          </span>
                          <span className={`px-2 py-0.5 ml-2 text-[10px] font-bold rounded-full ${
                            p.status === 'Dr'
                              ? 'bg-amber-100 text-amber-800'
                              : p.status === 'Cr'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {p.status === 'Dr' ? 'लेना है (Dr)' : p.status === 'Cr' ? 'देना है (Cr)' : 'NIL'}
                          </span>
                        </td>

                        {/* Action 360 */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedParty(p.partyName);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 2: BRANCHES & IMPORT ==================== */}
        {companies.length > 0 && activeTab === 'branches' && (
          <div className="space-y-6">
            
            {/* Header + Add Branch Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">ब्रांचेस प्रबंधन (Branch Management)</h2>
                <p className="text-xs text-slate-500">
                  हर ब्रांच का नाम क्रिएट करें और उस ब्रांच के लिए DayBook फ़ाइल इम्पोर्ट करें
                </p>
              </div>

              <button
                onClick={() => setShowNewBranchModal(true)}
                className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create New Branch</span>
              </button>
            </div>

            {/* Branches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className={`bg-white border rounded-2xl p-5 shadow-sm transition ${
                    importBranchId === b.id ? 'border-indigo-500 ring-2 ring-indigo-400/40' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {b.code || b.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{b.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">Code: {b.code}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setResetModal({ open: true, type: 'branch', id: b.id, name: b.name })}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded transition"
                      title="Clear or delete branch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Vouchers</span>
                      <span className="font-bold text-slate-900 text-sm">{b.voucherCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Parties Found</span>
                      <span className="font-bold text-slate-900 text-sm">{b.partiesCount || 0}</span>
                    </div>
                  </div>

                  {b.lastDate && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      Latest Voucher: <span className="font-semibold text-slate-700">{b.lastDate}</span>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-2">
                    <button
                      onClick={() => setImportBranchId(b.id)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition ${
                        importBranchId === b.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {importBranchId === b.id ? '✓ Selected for Import' : 'Select for Import'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* DayBook Import Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    DayBook फ़ाइल अपलोड और इम्पोर्ट (Upload DayBook File)
                  </h3>
                  <p className="text-xs text-slate-500">
                    चयनित ब्रांच के लिए Tally DayBook TXT या CSV फ़ाइल अपलोड करें
                  </p>
                </div>
              </div>

              {/* Target Branch Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    किस ब्रांच में इम्पोर्ट करना है? (Target Branch) *
                  </label>
                  <select
                    value={importBranchId}
                    onChange={(e) => setImportBranchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer mt-5">
                    <input
                      type="checkbox"
                      checked={importClearExisting}
                      onChange={(e) => setImportClearExisting(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span>इस ब्रांच का पिछला डेटा रीप्लेस करें (Replace existing data for this branch)</span>
                  </label>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                
                {/* Method 1: Choose File */}
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-6 text-center bg-slate-50/50">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-slate-700">अपनी DayBook.txt फ़ाइल चुनें</div>
                  <p className="text-xs text-slate-400 mt-1">Supports Tally DayBook .TXT and .CSV export</p>
                  
                  <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />

                  {importFile && (
                    <div className="mt-3 text-xs font-bold text-indigo-600 bg-indigo-50 py-1 px-3 rounded-lg inline-block">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}

                  <div className="mt-4">
                    <button
                      disabled={!importFile || importing}
                      onClick={() => handleImport(false)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow transition flex items-center justify-center space-x-2 ${
                        !importFile || importing
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {importing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Parsing & Importing to MongoDB...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Upload & Import Selected File</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Method 2: Fast 1-Click Sample Import */}
                <div className="border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl p-6 text-left relative overflow-hidden">
                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>⚡ 1-Click Fast Import (Sample DayBook.txt)</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 mb-3">
                    डेस्कटॉप फ़ोल्डर की मूल <code className="bg-white px-1 py-0.5 rounded border border-indigo-200 text-indigo-900 font-bold">DayBook.txt</code> (11,608 वाउचर्स) को सीधे एक क्लिक में इस ब्रांच में इम्पोर्ट करें!
                  </p>

                  <div className="bg-white/80 rounded-xl p-3 border border-indigo-100 text-[11px] text-slate-600 space-y-1 mb-4">
                    <div>• Path: <code>c:\Users\USER\Desktop\BOOKS MATCH\DayBook.txt</code></div>
                    <div>• Vouchers: <b>11,608</b> | Size: <b>1.56 MB</b></div>
                    <div>• Stores instantly in MongoDB <code>focustube</code> collection</div>
                  </div>

                  <button
                    disabled={importing}
                    onClick={() => handleImport(true)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center space-x-2 ${
                      importing
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
                    }`}
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing 11,608 vouchers...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>⚡ 1-Click Import Local DayBook.txt</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Import Result Summary Card */}
              {importResult && (
                <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>इम्पोर्ट सफलतापूर्वक पूरा हुआ (Import Summary)</span>
                    </div>
                    <span className="bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                      {importResult.branchName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block">Total Vouchers</span>
                      <span className="font-extrabold text-slate-900 text-base">{importResult.totalVouchers}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block">Parties Identified</span>
                      <span className="font-extrabold text-slate-900 text-base">{importResult.totalParties}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block">Total Debits</span>
                      <span className="font-extrabold text-amber-700 text-sm">{formatCurrency(importResult.totalDebits)}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block">Total Credits</span>
                      <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(importResult.totalCredits)}</span>
                    </div>
                  </div>

                  {/* Voucher types breakdown */}
                  {importResult.voucherTypesBreakdown && (
                    <div className="pt-2">
                      <span className="font-bold text-emerald-950 block mb-2">Voucher Types Breakdown:</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(importResult.voucherTypesBreakdown).map(([k, v]: [string, any]) => (
                          <span key={k} className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px] font-semibold text-slate-700">
                            <b>{k}</b>: {v.count} vouchers
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveTab('matrix')}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold"
                    >
                      View Party Reconciliation Matrix →
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* ==================== TAB 3: INTER-BRANCH RECONCILIATION ==================== */}
        {companies.length > 0 && activeTab === 'interbranch' && (
          <div className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">आपसी ब्रांच रिकंसीलेशन (Inter-Branch Books Reconciliation)</h2>
                <p className="text-xs text-slate-500">
                  दो ब्रांचेस के आपसी खातों का मिलान करें और अंतर (Mismatch / Discrepancy) जांचें
                </p>
              </div>

              <button
                onClick={fetchInterBranch}
                className="inline-flex items-center space-x-1 px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ibLoading ? 'animate-spin' : ''}`} />
                <span>Re-check Books</span>
              </button>
            </div>

            {/* Branch Selector Cards */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    First Branch (ब्रांच 1)
                  </label>
                  <select
                    value={ibBranch1}
                    onChange={(e) => setIbBranch1(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Second Branch (ब्रांच 2)
                  </label>
                  <select
                    value={ibBranch2}
                    onChange={(e) => setIbBranch2(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Reconciliation Comparison Cards */}
            {ibData?.reconciliation && (
              <>
                {/* Result Status Banner */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  ibData.reconciliation.isReconciled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center space-x-3">
                    {ibData.reconciliation.isReconciled ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-extrabold text-base">
                        {ibData.reconciliation.statusText}
                      </h4>
                      <p className="text-xs mt-0.5 opacity-90">
                        {ibData.reconciliation.isReconciled
                          ? 'दोनों ब्रांचेस के आपसी खाते पूर्ण रूप से मेल खाते हैं (0 Difference).'
                          : `अंतर राशि: ₹${ibData.reconciliation.difference.toLocaleString('en-IN')}. कृपया नीचे दी गई एंट्रीज का मिलान करें.`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs uppercase font-bold tracking-wider opacity-75">Net Difference</span>
                    <div className="text-xl font-black font-mono">
                      {formatCurrency(ibData.reconciliation.difference)}
                    </div>
                  </div>
                </div>

                {/* Side by side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Branch 1's Books */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{ibData.reconciliation.branch1Book.branchName}</h4>
                        <span className="text-xs text-slate-500">Books showing cross balance</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ibData.reconciliation.branch1Book.balanceType === 'Dr'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {formatCurrency(Math.abs(ibData.reconciliation.branch1Book.netBalance))} {ibData.reconciliation.branch1Book.balanceType}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <span className="text-slate-500 font-bold">Matched Accounts:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ibData.reconciliation.branch1Book.matchedAccounts.length === 0 ? (
                          <span className="text-slate-400 italic">No direct inter-branch account found</span>
                        ) : (
                          ibData.reconciliation.branch1Book.matchedAccounts.map((a: any) => (
                            <span key={a.name} className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-semibold">
                              {a.name} ({formatCurrency(Math.abs(a.net))} {a.status})
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-2 text-xs">
                      <span className="text-slate-500 block mb-2 font-bold">Recent Inter-branch Vouchers:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {ibData.reconciliation.branch1Book.vouchers.length === 0 ? (
                          <div className="text-slate-400 text-center py-4">No cross entries found</div>
                        ) : (
                          ibData.reconciliation.branch1Book.vouchers.map((v: any) => (
                            <div key={v._id} className="py-1.5 flex justify-between">
                              <span className="text-slate-600">{v.dateStr} ({v.voucherType})</span>
                              <span className="font-mono font-semibold">{v.primaryParty}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Branch 2's Books */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{ibData.reconciliation.branch2Book.branchName}</h4>
                        <span className="text-xs text-slate-500">Books showing cross balance</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ibData.reconciliation.branch2Book.balanceType === 'Dr'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {formatCurrency(Math.abs(ibData.reconciliation.branch2Book.netBalance))} {ibData.reconciliation.branch2Book.balanceType}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <span className="text-slate-500 font-bold">Matched Accounts:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ibData.reconciliation.branch2Book.matchedAccounts.length === 0 ? (
                          <span className="text-slate-400 italic">No direct inter-branch account found</span>
                        ) : (
                          ibData.reconciliation.branch2Book.matchedAccounts.map((a: any) => (
                            <span key={a.name} className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-semibold">
                              {a.name} ({formatCurrency(Math.abs(a.net))} {a.status})
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-2 text-xs">
                      <span className="text-slate-500 block mb-2 font-bold">Recent Inter-branch Vouchers:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {ibData.reconciliation.branch2Book.vouchers.length === 0 ? (
                          <div className="text-slate-400 text-center py-4">No cross entries found</div>
                        ) : (
                          ibData.reconciliation.branch2Book.vouchers.map((v: any) => (
                            <div key={v._id} className="py-1.5 flex justify-between">
                              <span className="text-slate-600">{v.dateStr} ({v.voucherType})</span>
                              <span className="font-mono font-semibold">{v.primaryParty}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </>
            )}

          </div>
        )}

        {/* ==================== TAB 4: RESET & MAINTENANCE ==================== */}
        {companies.length > 0 && activeTab === 'reset' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center space-x-3 text-rose-600 mb-4">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900">
                  डेटा रीसेट और क्लियर (Clear / Reset Data)
                </h3>
              </div>

              <p className="text-xs text-slate-500 mb-6">
                यूजर आवश्यकतानुसार किसी ब्रांच का डेटा, किसी कंपनी का डेटा या पूरा डेटाबेस रीसेट करके दोबारा नया डेटा अपलोड कर सकता है।
              </p>

              <div className="space-y-4">
                {/* Reset Branch */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">चयनित ब्रांच का डेटा हटाएं (Clear Branch Vouchers)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      केवल चुनी गई ब्रांच के वाउचर्स और लेजर बैलेंस डिलीट होंगे।
                    </p>
                  </div>
                  <button
                    onClick={() => setResetModal({ open: true, type: 'branch', id: importBranchId, name: branches.find(b => b.id === importBranchId)?.name })}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition"
                  >
                    Clear Selected Branch Data
                  </button>
                </div>

                {/* Reset Company Data */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">पूरी कंपनी का डेटा हटाएं (Clear Company Data)</h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      इस कंपनी की सभी ब्रांचेस के वाउचर्स और रिकंसीलेशन साफ हो जाएंगे।
                    </p>
                  </div>
                  <button
                    onClick={() => setResetModal({ open: true, type: 'company', name: selectedCompany?.name })}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow transition"
                  >
                    Clear Company Data
                  </button>
                </div>

                {/* Complete Database Wipe */}
                <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/70 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-rose-950 text-sm">संपूर्ण डेटाबेस रीसेट (Complete Database Wipe)</h4>
                    <p className="text-xs text-rose-800 mt-0.5">
                      सभी कंपनियां, ब्रांचेस, वाउचर्स और पार्टी लेजर रिकॉर्ड्स स्थायी रूप से डिलीट हो जाएंगे।
                    </p>
                  </div>
                  <button
                    onClick={() => setResetModal({ open: true, type: 'all', name: 'All Database Collections' })}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow transition"
                  >
                    Wipe Entire Database
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ==================== MODALS ==================== */}

      {/* 360 Party Ledger Drawer / Modal */}
      {selectedParty && selectedCompanyId && (
        <PartyLedgerModal
          partyName={selectedParty}
          companyId={selectedCompanyId}
          onClose={() => setSelectedParty(null)}
        />
      )}

      {/* New Company Modal */}
      {showNewCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">नई कंपनी बनाएं (Add New Company)</h3>
            <p className="text-xs text-slate-500 mb-4">
              कंपनी का नाम दर्ज करें जिसके अंतर्गत विभिन्न ब्रांचेस का डेटा रिकंसाइल होगा।
            </p>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  placeholder="उदा. Supreme Steels Pvt Ltd"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Short Code (वैकल्पिक)</label>
                <input
                  type="text"
                  placeholder="उदा. SUPR"
                  value={newCompanyCode}
                  onChange={(e) => setNewCompanyCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCompanyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Branch Modal */}
      {showNewBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">नई ब्रांच जोड़ें (Add New Branch)</h3>
            <p className="text-xs text-slate-500 mb-4">
              ब्रांच का नाम दर्ज करें जिसके लिए DayBook अपलोड की जाएगी।
            </p>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  placeholder="उदा. Jogeshwari Branch / Bhiwandi Godown"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch Code (वैकल्पिक)</label>
                <input
                  type="text"
                  placeholder="उदा. JOG / BHW"
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-rose-200">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">डेटा डिलीट करने की पुष्टि (Confirm Delete)</h3>
            </div>
            
            <p className="text-xs text-slate-600 mb-5">
              क्या आप सुनिश्चित हैं कि आप <b>{resetModal.name || resetModal.type}</b> का डेटा स्थायी रूप से डिलीट करना चाहते हैं?
              डिलीट होने के बाद आप कभी भी नया डेटा इम्पोर्ट कर सकते हैं।
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setResetModal({ open: false, type: 'company' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                रद्द करें (Cancel)
              </button>
              <button
                disabled={resetLoading}
                onClick={executeReset}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5"
              >
                {resetLoading ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>हाँ, डिलीट करें (Yes, Delete)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
