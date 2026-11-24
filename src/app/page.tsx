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
  Tag,
  CheckSquare,
  Square,
  Globe2,
  Ban,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import PartyLedgerModal from '@/components/PartyLedgerModal';

export default function Dashboard() {
  // Navigation tabs: added 'exceptions' tab
  const [activeTab, setActiveTab] = useState<'matrix' | 'declare' | 'interbranch' | 'exceptions' | 'branches' | 'reset'>('matrix');

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

  // Branch Ledger Declaration State (Declare Ledgers as Branch with Code)
  const [declareLedgers, setDeclareLedgers] = useState<any[]>([]);
  const [declareLoading, setDeclareLoading] = useState<boolean>(false);
  const [declareSearch, setDeclareSearch] = useState<string>('');
  const [declareSelectedNames, setDeclareSelectedNames] = useState<string[]>([]);
  const [assignBranchCode, setAssignBranchCode] = useState<string>('');
  const [declaredOnlyFilter, setDeclaredOnlyFilter] = useState<boolean>(false);
  const [availableDeclaredCodes, setAvailableDeclaredCodes] = useState<string[]>([]);

  // Inter-Branch State
  const [ibBranch1, setIbBranch1] = useState<string>('');
  const [ibBranch2, setIbBranch2] = useState<string>('');
  const [ibData, setIbData] = useState<any>(null);
  const [ibLoading, setIbLoading] = useState<boolean>(false);

  // Exceptions Report State
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState<boolean>(false);
  const [exceptionsSearch, setExceptionsSearch] = useState<string>('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedCompanyId) return;
    const current = companies.find(c => c.id === selectedCompanyId);
    setSelectedCompany(current);
    fetchBranches(selectedCompanyId);
    fetchMatrix(selectedCompanyId);
    fetchDeclaredLedgers(selectedCompanyId);
    fetchExceptions(selectedCompanyId);
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

  // Fetch Ledgers for Branch Declaration
  async function fetchDeclaredLedgers(companyId: string, search = declareSearch, declaredOnly = declaredOnlyFilter) {
    setDeclareLoading(true);
    try {
      let url = `/api/branches/mappings?companyId=${companyId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (declaredOnly) url += `&declaredOnly=true`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setDeclareLedgers(json.ledgers || []);
        setAvailableDeclaredCodes(json.declaredCodes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeclareLoading(false);
    }
  }

  // Fetch Exceptions (Ignored Entries)
  async function fetchExceptions(companyId: string, search = exceptionsSearch) {
    setExceptionsLoading(true);
    try {
      let url = `/api/exceptions?companyId=${companyId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setExceptions(json.exceptions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExceptionsLoading(false);
    }
  }

  // Restore Ignored Entry back to Ledger
  async function handleRestoreEntry(voucherId: string) {
    setRestoringId(voucherId);
    try {
      const res = await fetch('/api/vouchers/ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherId,
          isIgnored: false
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast('एंट्री को वापस लेजर में शामिल कर दिया गया!');
        await fetchExceptions(selectedCompanyId);
        await fetchMatrix(selectedCompanyId);
      } else {
        showToast(json.error || 'Failed to restore', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRestoringId(null);
    }
  }

  useEffect(() => {
    if (selectedCompanyId && activeTab === 'declare') {
      const timer = setTimeout(() => {
        fetchDeclaredLedgers(selectedCompanyId, declareSearch, declaredOnlyFilter);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [declareSearch, declaredOnlyFilter, activeTab]);

  useEffect(() => {
    if (selectedCompanyId && activeTab === 'exceptions') {
      const timer = setTimeout(() => {
        fetchExceptions(selectedCompanyId, exceptionsSearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [exceptionsSearch, activeTab]);

  // Handle Branch Code Assignment / Declaration
  async function handleAssignBranchCode() {
    if (!selectedCompanyId || !assignBranchCode.trim()) {
      showToast('कृपया पहले ब्रांच कोड दर्ज करें', 'error');
      return;
    }
    if (declareSelectedNames.length === 0) {
      showToast('कृपया कम से कम एक लेजर चुनें', 'error');
      return;
    }

    try {
      const res = await fetch('/api/branches/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          partyNames: declareSelectedNames,
          branchCode: assignBranchCode.trim().toUpperCase()
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setDeclareSelectedNames([]);
        setAssignBranchCode('');
        await fetchDeclaredLedgers(selectedCompanyId, declareSearch, declaredOnlyFilter);
        await fetchMatrix(selectedCompanyId);
      } else {
        showToast(json.error || 'Error declaring branch', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  // Remove Branch Declaration
  async function handleRemoveDeclaration(partyName: string) {
    if (!selectedCompanyId || !partyName) return;
    try {
      const res = await fetch(`/api/branches/mappings?companyId=${selectedCompanyId}&partyName=${encodeURIComponent(partyName)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        await fetchDeclaredLedgers(selectedCompanyId, declareSearch, declaredOnlyFilter);
        await fetchMatrix(selectedCompanyId);
      } else {
        showToast(json.error || 'Error removing declaration', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  function toggleSelectAllDeclare() {
    if (declareSelectedNames.length === declareLedgers.length) {
      setDeclareSelectedNames([]);
    } else {
      setDeclareSelectedNames(declareLedgers.map(l => l.partyName));
    }
  }

  function toggleSelectDeclare(partyName: string) {
    if (declareSelectedNames.includes(partyName)) {
      setDeclareSelectedNames(declareSelectedNames.filter(n => n !== partyName));
    } else {
      setDeclareSelectedNames([...declareSelectedNames, partyName]);
    }
  }

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

  // Import Handler
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
        await fetchBranches(selectedCompanyId);
        await fetchMatrix(selectedCompanyId);
        await fetchExceptions(selectedCompanyId);
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
          setExceptions([]);
        } else {
          await fetchBranches(selectedCompanyId);
          await fetchMatrix(selectedCompanyId);
          await fetchExceptions(selectedCompanyId);
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
              <p className="text-xs text-slate-400">T-Format Ledger & DayBook Reconciliation System</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>MongoDB: focustube</span>
            </div>

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

            <button
              onClick={() => setShowNewCompanyModal(true)}
              className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition"
              title="Add New Company"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Company</span>
            </button>

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
            <span>पार्टी मैट्रिक्स (Party Matrix)</span>
          </button>

          <button
            onClick={() => setActiveTab('declare')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'declare'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4 text-purple-400" />
            <span>लेजर को ब्रांच कोड दें (Declare Branch by Code)</span>
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
            <span>आपसी ब्रांच मिलान (Inter-Branch Matching)</span>
          </button>

          {/* New Tab: Exceptions Report */}
          <button
            onClick={() => setActiveTab('exceptions')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'exceptions'
                ? 'border-rose-500 text-rose-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>एक्सेप्शंस रिपोर्ट (Exceptions Report)</span>
            {exceptions.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono">
                {exceptions.length}
              </span>
            )}
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
            <span>ब्रांचेस व इम्पोर्ट (Branches & Import)</span>
            {branches.length > 0 && (
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full">
                {branches.length}
              </span>
            )}
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
            <span>डेटा रीसेट (Reset & Clear)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

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

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
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
                        </td>
                      </tr>
                    )}

                    {!matrixLoading && matrixData?.parties?.map((p: any) => (
                      <tr
                        key={p.partyName}
                        onClick={() => setSelectedParty(p.partyName)}
                        className="hover:bg-indigo-50/40 cursor-pointer transition"
                      >
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

                        <td className="px-4 py-3 text-right text-slate-600 font-mono">
                          {p.totalDebit > 0 ? formatCurrency(p.totalDebit) : '-'}
                        </td>

                        <td className="px-4 py-3 text-right text-slate-600 font-mono">
                          {p.totalCredit > 0 ? formatCurrency(p.totalCredit) : '-'}
                        </td>

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

                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedParty(p.partyName);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>T-Ledger</span>
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

        {/* ==================== TAB 2: DECLARE LEDGERS AS BRANCH (BY CODE) ==================== */}
        {companies.length > 0 && activeTab === 'declare' && (
          <div className="space-y-6">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    लेजर को ब्रांच डिक्लेयर करें (Declare Ledgers as Branch by Code)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  लेजर को नाम से फ़िल्टर करें, सेलेक्ट करें और उसे एक ब्रांच कोड दें। फिर वे सभी लेजर उसी कोड से एज़ ए ब्रांच दिखेंगे और उनका बैलेंस आपस में मैच होगा।
                </p>
              </div>

              {availableDeclaredCodes.length > 0 && (
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-500 font-semibold">Declared Codes:</span>
                  {availableDeclaredCodes.map(code => (
                    <span key={code} className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold font-mono">
                      🏷️ {code}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-700">
                  चयनित लेजर: <b className="text-purple-700">{declareSelectedNames.length}</b>
                </span>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Branch Code दर्ज करें (उदा. BHW, JOG, DEL)"
                    value={assignBranchCode}
                    onChange={(e) => setAssignBranchCode(e.target.value)}
                    className="bg-white border border-purple-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 w-56 font-mono"
                  />

                  {branches.length > 0 && (
                    <div className="hidden sm:flex items-center space-x-1">
                      <span className="text-[10px] text-slate-400">Quick:</span>
                      {branches.map(b => (
                        <button
                          key={b.id}
                          onClick={() => setAssignBranchCode(b.code)}
                          className="px-2 py-0.5 bg-white hover:bg-purple-100 border border-purple-200 rounded text-[11px] font-bold text-purple-700 font-mono"
                        >
                          {b.code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  disabled={declareSelectedNames.length === 0 || !assignBranchCode.trim()}
                  onClick={handleAssignBranchCode}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5 ${
                    declareSelectedNames.length === 0 || !assignBranchCode.trim()
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>ब्रांच कोड लागू करें (Apply Branch Code)</span>
                </button>
              </div>

              <button
                onClick={() => setActiveTab('interbranch')}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center space-x-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                <span>आपसी बैलेंस मैच देखें →</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="लेजर का नाम फ़िल्टर करें (Filter ledger by name)..."
                  value={declareSearch}
                  onChange={(e) => setDeclareSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                />
                {declareSearch && (
                  <button onClick={() => setDeclareSearch('')} className="text-slate-400 hover:text-slate-600 text-xs">
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={declaredOnlyFilter}
                    onChange={(e) => setDeclaredOnlyFilter(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <span>केवल डिक्लेयर्ड ब्रांच लेजर्स दिखाएं</span>
                </label>

                <button
                  onClick={() => fetchDeclaredLedgers(selectedCompanyId)}
                  className="p-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${declareLoading ? 'animate-spin text-purple-600' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-10 text-center">
                        <button onClick={toggleSelectAllDeclare} className="text-slate-600 hover:text-slate-900">
                          {declareSelectedNames.length > 0 && declareSelectedNames.length === declareLedgers.length ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3">लेजर का नाम (Ledger Name)</th>
                      <th className="px-4 py-3">ब्रांच (Branch)</th>
                      <th className="px-4 py-3 text-center">डिक्लेयर्ड कोड (Declared Code)</th>
                      <th className="px-4 py-3 text-right">Debit (नाम)</th>
                      <th className="px-4 py-3 text-right">Credit (जमा)</th>
                      <th className="px-4 py-3 text-right font-black">Net Balance</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">
                    {declareLoading && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <span>Searching ledgers...</span>
                        </td>
                      </tr>
                    )}

                    {!declareLoading && declareLedgers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No ledgers found matching criteria
                        </td>
                      </tr>
                    )}

                    {!declareLoading && declareLedgers.map((item) => {
                      const isSelected = declareSelectedNames.includes(item.partyName);
                      return (
                        <tr
                          key={`${item.branchId}_${item.partyName}`}
                          className={`hover:bg-purple-50/40 transition cursor-pointer ${
                            isSelected ? 'bg-purple-50/60' : item.isBranchDeclared ? 'bg-purple-50/20' : ''
                          }`}
                          onClick={() => toggleSelectDeclare(item.partyName)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelectDeclare(item.partyName)}>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-purple-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>

                          <td className="px-4 py-3 text-slate-900 font-bold">
                            <div className="flex items-center space-x-2">
                              <span>{item.partyName}</span>
                              {item.isBranchDeclared && (
                                <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-bold font-mono">
                                  BRANCH: {item.declaredBranchCode}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-slate-600 font-semibold">{item.branchName}</td>

                          <td className="px-4 py-3 text-center">
                            {item.isBranchDeclared ? (
                              <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold font-mono text-xs">
                                🏷️ {item.declaredBranchCode}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">Not declared</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-600 font-mono">
                            {item.totalDebit > 0 ? formatCurrency(item.totalDebit) : '-'}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-600 font-mono">
                            {item.totalCredit > 0 ? formatCurrency(item.totalCredit) : '-'}
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap font-bold font-mono">
                            <span className={item.status === 'Dr' ? 'text-amber-700' : item.status === 'Cr' ? 'text-emerald-700' : 'text-slate-500'}>
                              {formatCurrency(Math.abs(item.netBalance))}
                            </span>
                            <span className={`text-[10px] ml-1 font-bold ${
                              item.status === 'Dr' ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {item.status}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {item.isBranchDeclared ? (
                              <button
                                onClick={() => handleRemoveDeclaration(item.partyName)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold border border-rose-200 transition"
                              >
                                Remove Code
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setDeclareSelectedNames([item.partyName]);
                                }}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-semibold border border-purple-200 transition"
                              >
                                Select
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                  दो ब्रांचेस के डिक्लेयर्ड कोड अनुसार खातों का मिलान करें और अंतर (Mismatch / Discrepancy) जांचें
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('declare')}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>लेजर को कोड दें</span>
                </button>

                <button
                  onClick={fetchInterBranch}
                  className="inline-flex items-center space-x-1 px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ibLoading ? 'animate-spin' : ''}`} />
                  <span>Re-check Books</span>
                </button>
              </div>
            </div>

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

            {ibData?.reconciliation && (
              <>
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
                          : `अंतर राशि: ₹${ibData.reconciliation.difference.toLocaleString('en-IN')}.`}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{ibData.reconciliation.branch1Book.branchName}</h4>
                        <span className="text-xs text-slate-500 font-mono">Branch Code: {ibData.reconciliation.branch1Book.branchCode}</span>
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
                      <span className="text-slate-500 font-bold">Accounts representing other branch:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ibData.reconciliation.branch1Book.matchedAccounts.length === 0 ? (
                          <div className="text-slate-400 italic text-xs py-1">
                            कोई लेजर इस ब्रांच कोड से लिंक नहीं है। <button onClick={() => setActiveTab('declare')} className="text-purple-600 underline font-semibold">लेजर को कोड दें</button>
                          </div>
                        ) : (
                          ibData.reconciliation.branch1Book.matchedAccounts.map((a: any) => (
                            <span key={a.name} className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-purple-900 font-semibold">
                              {a.name} ({formatCurrency(Math.abs(a.net))} {a.status})
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-2 text-xs">
                      <span className="text-slate-500 block mb-2 font-bold">Recent Cross Vouchers:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {ibData.reconciliation.branch1Book.vouchers.length === 0 ? (
                          <div className="text-slate-400 text-center py-4">No cross entries found</div>
                        ) : (
                          ibData.reconciliation.branch1Book.vouchers.map((v: any) => (
                            <div key={v._id} className="py-1.5 flex justify-between">
                              <span className="text-slate-600 font-mono">{v.dateStr} ({v.voucherType})</span>
                              <span className="font-mono font-semibold">{v.primaryParty}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{ibData.reconciliation.branch2Book.branchName}</h4>
                        <span className="text-xs text-slate-500 font-mono">Branch Code: {ibData.reconciliation.branch2Book.branchCode}</span>
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
                      <span className="text-slate-500 font-bold">Accounts representing other branch:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ibData.reconciliation.branch2Book.matchedAccounts.length === 0 ? (
                          <div className="text-slate-400 italic text-xs py-1">
                            कोई लेजर इस ब्रांच कोड से लिंक नहीं है। <button onClick={() => setActiveTab('declare')} className="text-purple-600 underline font-semibold">लेजर को कोड दें</button>
                          </div>
                        ) : (
                          ibData.reconciliation.branch2Book.matchedAccounts.map((a: any) => (
                            <span key={a.name} className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-purple-900 font-semibold">
                              {a.name} ({formatCurrency(Math.abs(a.net))} {a.status})
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-2 text-xs">
                      <span className="text-slate-500 block mb-2 font-bold">Recent Cross Vouchers:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {ibData.reconciliation.branch2Book.vouchers.length === 0 ? (
                          <div className="text-slate-400 text-center py-4">No cross entries found</div>
                        ) : (
                          ibData.reconciliation.branch2Book.vouchers.map((v: any) => (
                            <div key={v._id} className="py-1.5 flex justify-between">
                              <span className="text-slate-600 font-mono">{v.dateStr} ({v.voucherType})</span>
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

        {/* ==================== TAB 4: EXCEPTIONS REPORT (IGNORED ENTRIES) ==================== */}
        {companies.length > 0 && activeTab === 'exceptions' && (
          <div className="space-y-6">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    एक्सेप्शंस रिपोर्ट (Exceptions Report - Ignored Entries)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  गलत या अमान्य एंट्रियां जिन्हें लेजर और बैलेंस से अलग कर दिया गया है। आप इन्हें यहाँ देखकर कभी भी वापस लेजर में शामिल कर सकते हैं।
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchExceptions(selectedCompanyId)}
                  className="p-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${exceptionsLoading ? 'animate-spin text-rose-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="खोजें (Search party, voucher no, type)..."
                  value={exceptionsSearch}
                  onChange={(e) => setExceptionsSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                />
                {exceptionsSearch && (
                  <button onClick={() => setExceptionsSearch('')} className="text-slate-400 hover:text-slate-600 text-xs">
                    ✕
                  </button>
                )}
              </div>

              <div className="text-xs font-bold text-slate-600">
                कुल एक्सेप्शंस: <span className="text-rose-600 font-mono text-sm">{exceptions.length}</span>
              </div>
            </div>

            {/* Exceptions Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Date (तारीख)</th>
                      <th className="px-4 py-3">Branch (ब्रांच)</th>
                      <th className="px-4 py-3">Type & Voucher No</th>
                      <th className="px-4 py-3">पार्टी का नाम (Party Name)</th>
                      <th className="px-4 py-3">काउंटर खाता (Counter Account)</th>
                      <th className="px-4 py-3 text-right">राशि (Amount)</th>
                      <th className="px-4 py-3">इग्नोर कारण (Reason)</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">
                    {exceptionsLoading && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <span>Loading exceptions report...</span>
                        </td>
                      </tr>
                    )}

                    {!exceptionsLoading && exceptions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <p className="font-bold text-slate-700">कोई एक्सेप्शन एंट्री नहीं है (No Ignored Entries)</p>
                          <p className="text-xs text-slate-400 mt-0.5">सभी एंट्रियां लेजर में सक्रिय हैं। जब आप किसी लेजर से किसी गलत एंट्री को 'Ignore' करेंगे, वह यहाँ दिखाई देगी।</p>
                        </td>
                      </tr>
                    )}

                    {!exceptionsLoading && exceptions.map((item) => (
                      <tr key={item.id} className="hover:bg-rose-50/40 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">{item.dateStr}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                            {item.branchName}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mr-1">
                            {item.voucherType}
                          </span>
                          <span className="font-mono text-slate-700 font-semibold">{item.voucherNo}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-bold">{item.primaryParty}</td>
                        <td className="px-4 py-3 text-slate-600">{item.counterAccount || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate" title={item.ignoredReason}>
                          {item.ignoredReason}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            disabled={restoringId === item.id}
                            onClick={() => handleRestoreEntry(item.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition"
                            title="Restore this voucher back to regular ledger"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore (वापस जोड़ें)</span>
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

        {/* ==================== TAB 5: BRANCHES & IMPORT ==================== */}
        {companies.length > 0 && activeTab === 'branches' && (
          <div className="space-y-6">
            
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
                    <span>इस ब्रांच का पिछला डेटा रीप्लेस करें (Replace existing data)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-6 text-center bg-slate-50/50">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-slate-700">अपनी DayBook.txt / .CSV फ़ाइल चुनें</div>
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

                <div className="border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl p-6 text-left relative overflow-hidden">
                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>⚡ 1-Click Fast Import (Sample DayBook)</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 mb-3">
                    डेस्कटॉप फ़ोल्डर की मूल <code className="bg-white px-1 py-0.5 rounded border border-indigo-200 text-indigo-900 font-bold">DayBook.CSV / DayBook.txt</code> को सीधे एक क्लिक में इस ब्रांच में इम्पोर्ट करें!
                  </p>

                  <div className="bg-white/80 rounded-xl p-3 border border-indigo-100 text-[11px] text-slate-600 space-y-1 mb-4">
                    <div>• Path: <code>c:\Users\USER\Desktop\BOOKS MATCH\DayBook.CSV</code></div>
                    <div>• 100% Balanced vouchers (Total Dr == Total Cr, Sum == 0)</div>
                    <div>• Stores directly in MongoDB <code>focustube</code> collection</div>
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
                        <span>Processing vouchers...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>⚡ 1-Click Import Local DayBook</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

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

        {/* ==================== TAB 6: RESET & MAINTENANCE ==================== */}
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

      {/* 360 T-Format Party Ledger Modal */}
      {selectedParty && selectedCompanyId && (
        <PartyLedgerModal
          partyName={selectedParty}
          companyId={selectedCompanyId}
          onClose={() => setSelectedParty(null)}
          onVoucherIgnored={() => {
            fetchExceptions(selectedCompanyId);
            fetchMatrix(selectedCompanyId);
          }}
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
