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
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  Sparkles,
  Zap,
  Tag,
  CheckSquare,
  Square,
  Globe2,
  Ban,
  RotateCcw,
  ShieldAlert,
  FolderKanban,
  Users2,
  Boxes,
  Split,
  GitCompare,
  FilterX
} from 'lucide-react';
import PartyLedgerModal from '@/components/PartyLedgerModal';

export default function Dashboard() {
  // Navigation tabs: matrix, groups, declare, interbranch, exceptions, branches, reset
  const [activeTab, setActiveTab] = useState<'matrix' | 'groups' | 'declare' | 'interbranch' | 'exceptions' | 'branches' | 'reset'>('matrix');

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
  const [matrixFilter, setMatrixFilter] = useState<'all' | 'multi_branch' | 'dr' | 'cr' | 'grouped' | 'ungrouped'>('all');
  const [matrixViewMode, setMatrixViewMode] = useState<'individual' | 'groups'>('individual');

  // 360 Party & Group Ledger Modal State
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [selectedGroupModal, setSelectedGroupModal] = useState<string | null>(null);

  // Ledger Groups State
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [groupParties, setGroupParties] = useState<any[]>([]);
  const [groupNamesList, setGroupNamesList] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(false);
  const [groupSearch, setGroupSearch] = useState<string>('');
  const [groupSelectedParties, setGroupSelectedParties] = useState<string[]>([]);
  const [newGroupNameInput, setNewGroupNameInput] = useState<string>('');
  const [existingGroupSelect, setExistingGroupSelect] = useState<string>('');

  // Branch Ledger Declaration State (Declare Ledgers as Branch with Code)
  const [declareLedgers, setDeclareLedgers] = useState<any[]>([]);
  const [declareLoading, setDeclareLoading] = useState<boolean>(false);
  const [declareSearch, setDeclareSearch] = useState<string>('');
  const [declareSelectedNames, setDeclareSelectedNames] = useState<string[]>([]);
  const [assignBranchCode, setAssignBranchCode] = useState<string>('');
  const [declaredOnlyFilter, setDeclaredOnlyFilter] = useState<boolean>(false);
  const [availableDeclaredCodes, setAvailableDeclaredCodes] = useState<string[]>([]);

  // Inter-Branch Two-Way Reconciliation State
  const [ibBranch1, setIbBranch1] = useState<string>('');
  const [ibBranch2, setIbBranch2] = useState<string>('');
  const [ibData, setIbData] = useState<any>(null);
  const [ibLoading, setIbLoading] = useState<boolean>(false);
  const [ibStatusFilter, setIbStatusFilter] = useState<'mismatch_only' | 'all' | 'matched_only' | 'missing_in_b2' | 'missing_in_b1'>('mismatch_only');
  const [ibTypeFilter, setIbTypeFilter] = useState<'all' | 'payment_receipt' | 'sale_purchase' | 'journal_other'>('all');
  const [ibSearch, setIbSearch] = useState<string>('');

  // Exceptions Report State
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState<boolean>(false);
  const [exceptionsSearch, setExceptionsSearch] = useState<string>('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Reset State
  const [resetModal, setResetModal] = useState<{ open: boolean; type: 'branch' | 'company' | 'all' | 'transactions'; id?: string; name?: string }>({
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

  // Fetch Groups
  async function fetchGroups(companyId: string, search = groupSearch) {
    if (!companyId) return;
    setGroupsLoading(true);
    try {
      let url = `/api/groups?companyId=${companyId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setGroupsData(json.groups || []);
        setGroupParties(json.parties || []);
        setGroupNamesList(json.groupNames || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGroupsLoading(false);
    }
  }

  // Assign Group
  async function handleAssignGroup() {
    const targetGroup = (newGroupNameInput.trim() || existingGroupSelect.trim());
    if (!targetGroup) {
      showToast('कृपया ग्रुप का नाम दर्ज करें या मौजूदा ग्रुप चुनें', 'error');
      return;
    }
    if (groupSelectedParties.length === 0) {
      showToast('कृपया कम से कम एक लेजर चुनें', 'error');
      return;
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          groupName: targetGroup,
          partyNames: groupSelectedParties
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setGroupSelectedParties([]);
        setNewGroupNameInput('');
        setExistingGroupSelect('');
        await fetchGroups(selectedCompanyId);
        await fetchMatrix(selectedCompanyId);
      } else {
        showToast(json.error || 'Failed to assign group', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  // Remove single party from group
  async function handleRemovePartyFromGroup(partyName: string) {
    try {
      const res = await fetch(`/api/groups?companyId=${selectedCompanyId}&partyName=${encodeURIComponent(partyName)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        await fetchGroups(selectedCompanyId);
        await fetchMatrix(selectedCompanyId);
      } else {
        showToast(json.error || 'Failed to remove from group', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  // Delete entire group
  async function handleDeleteGroup(groupName: string) {
    if (!confirm(`क्या आप पूरा ग्रुप "${groupName}" हटाना चाहते हैं? इसके सभी लेजर्स सामान्य लेजर्स बन जाएंगे।`)) return;
    try {
      const res = await fetch(`/api/groups?companyId=${selectedCompanyId}&groupName=${encodeURIComponent(groupName)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        await fetchGroups(selectedCompanyId);
        await fetchMatrix(selectedCompanyId);
      } else {
        showToast(json.error || 'Failed to delete group', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
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
      if (ibStatusFilter) url += `&statusFilter=${ibStatusFilter}`;
      if (ibTypeFilter) url += `&typeFilter=${ibTypeFilter}`;
      if (ibSearch) url += `&search=${encodeURIComponent(ibSearch)}`;

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
  }, [activeTab, ibBranch1, ibBranch2, ibStatusFilter, ibTypeFilter, ibSearch, selectedCompanyId]);

  useEffect(() => {
    if (activeTab === 'groups' && selectedCompanyId) {
      const timer = setTimeout(() => {
        fetchGroups(selectedCompanyId, groupSearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, groupSearch, selectedCompanyId]);

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
          setGroupsData([]);
        } else {
          await fetchBranches(selectedCompanyId);
          await fetchMatrix(selectedCompanyId);
          await fetchExceptions(selectedCompanyId);
          await fetchGroups(selectedCompanyId);
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
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          
          <div className="flex items-center justify-between sm:justify-start">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base sm:text-lg font-black tracking-wide text-white">BOOKS MATCH</h1>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 px-1.5 sm:px-2 py-0.5 rounded-full">
                    Multi-Branch
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400">T-Format Ledger & DayBook Reconciliation</p>
              </div>
            </div>

            {/* Mobile Actions: Add Company & Reset */}
            <div className="flex sm:hidden items-center space-x-1.5">
              <button
                onClick={() => setShowNewCompanyModal(true)}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow active:scale-95 transition"
                title="Add New Company"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setResetModal({ open: true, type: 'company', name: selectedCompany?.name })}
                className="p-2 text-slate-400 hover:text-rose-400 active:scale-95 rounded-xl bg-slate-800 transition"
                title="Delete or Reset Data"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>MongoDB: focustube</span>
            </div>

            <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 flex-1 sm:flex-initial">
              <Building className="w-4 h-4 text-indigo-400 shrink-0" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none cursor-pointer pr-2 w-full"
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
              className="hidden sm:inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition active:scale-95"
              title="Add New Company"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Company</span>
            </button>

            <button
              onClick={() => setResetModal({ open: true, type: 'company', name: selectedCompany?.name })}
              className="hidden sm:inline-flex p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition active:scale-95"
              title="Delete or Reset Data"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Swipable touch bar on mobile */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/80 overflow-x-auto touch-scroll no-scrollbar py-0.5">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 sm:py-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'matrix'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>पार्टी मैट्रिक्स (Party Matrix)</span>
          </button>

          {/* Tab: Ledger Grouping */}
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 sm:py-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'groups'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4 text-amber-400" />
            <span>लेजर ग्रुपिंग (Ledger Grouping)</span>
            {groupsData.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {groupsData.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('declare')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 sm:py-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'declare'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4 text-purple-400" />
            <span>लेजर को कोड मैप करें (Map Entity Code)</span>
          </button>

          <button
            onClick={() => setActiveTab('interbranch')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 sm:py-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'interbranch'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span>आपसी मिलान व मिसमैच (Reconciliation & Mismatches)</span>
          </button>

          <button
            onClick={() => setActiveTab('exceptions')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 sm:py-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 active:scale-95 ${
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
            className={`flex items-center space-x-1.5 py-2.5 px-3 sm:py-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 active:scale-95 ${
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
            className={`flex items-center space-x-1.5 py-2.5 px-3 sm:py-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 active:scale-95 ${
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6">

        {companies.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm max-w-lg mx-auto mt-6 sm:mt-10">
            <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">कंपनी बनाएं (Create First Company)</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6">
              शुरू करने के लिए अपनी कंपनी का नाम दर्ज करें। इसके बाद आप ब्रांचेस बनाकर DayBook इम्पोर्ट कर सकेंगे।
            </p>
            <button
              onClick={() => setShowNewCompanyModal(true)}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Company Now</span>
            </button>
          </div>
        )}

        {/* ==================== TAB 1: RECONCILIATION MATRIX ==================== */}
        {companies.length > 0 && activeTab === 'matrix' && (
          <div className="space-y-4 sm:space-y-6">
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3">
                <div className="p-2 sm:p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">कुल पार्टियां (Parties)</div>
                  <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5 truncate">
                    {matrixData?.stats?.totalParties || 0}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3">
                <div className="p-2 sm:p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
                  <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">मल्टी-ब्रांच पार्टियां</div>
                  <div className="text-base sm:text-xl font-black text-purple-700 mt-0.5 truncate">
                    {matrixData?.stats?.multiBranchCount || 0}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3">
                <div className="p-2 sm:p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">कुल लेना है (Dr)</div>
                  <div className="text-sm sm:text-lg font-black text-amber-700 mt-0.5 font-mono truncate">
                    {formatCurrency(matrixData?.stats?.totalReceivable || 0)}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3">
                <div className="p-2 sm:p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">कुल देना है (Cr)</div>
                  <div className="text-sm sm:text-lg font-black text-emerald-700 mt-0.5 font-mono truncate">
                    {formatCurrency(matrixData?.stats?.totalPayable || 0)}
                  </div>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3">
                <div className="p-2 sm:p-3 bg-slate-100 rounded-xl text-slate-700 shrink-0">
                  <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">नेट पोजीशन (Net Balance)</div>
                  <div className={`text-sm sm:text-lg font-black mt-0.5 font-mono truncate ${
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

            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="पार्टी या लेजर का नाम खोजें..."
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                  />
                  {matrixSearch && (
                    <button onClick={() => setMatrixSearch('')} className="text-slate-400 hover:text-slate-600 text-xs px-1">
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 justify-end">
                  <button
                    onClick={() => fetchMatrix(selectedCompanyId)}
                    className="p-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition active:scale-95"
                    title="Refresh Matrix"
                  >
                    <RefreshCw className={`w-4 h-4 ${matrixLoading ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>

                  <a
                    href={`/api/export?type=matrix&companyId=${encodeURIComponent(selectedCompanyId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden sm:inline">Export Matrix to Excel</span>
                    <span className="sm:hidden">Excel</span>
                  </a>
                </div>
              </div>

              {/* View Mode Toggle and Filter Pills (Horizontal swipeable on mobile) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                {/* View Mode Toggle: Individual vs Groups */}
                <div className="flex items-center space-x-1 bg-indigo-50 border border-indigo-200 p-1 rounded-xl text-xs font-bold overflow-x-auto touch-scroll no-scrollbar shrink-0">
                  <button
                    onClick={() => setMatrixViewMode('individual')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition shrink-0 active:scale-95 ${
                      matrixViewMode === 'individual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-700 hover:text-indigo-950'
                    }`}
                  >
                    व्यक्तिगत लेजर्स (Individual)
                  </button>
                  <button
                    onClick={() => setMatrixViewMode('groups')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shrink-0 active:scale-95 ${
                      matrixViewMode === 'groups' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-700 hover:text-indigo-950'
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>ग्रुप दृश्य {matrixData?.groups?.length ? `(${matrixData.groups.length})` : ''}</span>
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto touch-scroll no-scrollbar">
                  <button
                    onClick={() => setMatrixFilter('all')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition shrink-0 active:scale-95 ${
                      matrixFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Parties (सभी)
                  </button>
                  <button
                    onClick={() => setMatrixFilter('multi_branch')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition shrink-0 active:scale-95 ${
                      matrixFilter === 'multi_branch' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Multi-Branch ({matrixData?.stats?.multiBranchCount || 0})
                  </button>
                  <button
                    onClick={() => setMatrixFilter('dr')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition shrink-0 active:scale-95 ${
                      matrixFilter === 'dr' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Receivables (Dr)
                  </button>
                  <button
                    onClick={() => setMatrixFilter('cr')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition shrink-0 active:scale-95 ${
                      matrixFilter === 'cr' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Payables (Cr)
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Mobile swipe hint banner */}
              <div className="sm:hidden bg-indigo-50 border-b border-indigo-100 px-3 py-1.5 flex items-center justify-between text-[11px] text-indigo-900 font-semibold">
                <span>👈 पार्टियां व शाखा बैलेंस देखने हेतु स्वाइप करें</span>
                <span className="text-[10px] bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-bold">Swipe 👉</span>
              </div>

              <div className="overflow-x-auto touch-scroll max-h-[600px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 z-20">
                    <tr>
                      <th className="px-3.5 sm:px-5 py-3 sm:py-3.5 sticky left-0 z-30 bg-slate-100 sticky-shadow-right whitespace-nowrap">
                        {matrixViewMode === 'groups' ? 'ग्रुप का नाम (Ledger Group)' : 'पार्टी का नाम (Party / Ledger)'}
                      </th>
                      
                      {matrixData?.branches?.map((b: any) => (
                        <th key={b.id} className="px-4 py-3 sm:py-3.5 text-right whitespace-nowrap">
                          <span className="text-slate-900">{b.name}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">({b.code})</span>
                        </th>
                      ))}

                      <th className="px-4 py-3 sm:py-3.5 text-right text-slate-600 whitespace-nowrap">Consolidated Dr</th>
                      <th className="px-4 py-3 sm:py-3.5 text-right text-slate-600 whitespace-nowrap">Consolidated Cr</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-right font-black text-slate-900 whitespace-nowrap">कुल बाकी (Net)</th>
                      <th className="px-3 py-3 sm:py-3.5 text-center whitespace-nowrap">360° लेजर</th>
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

                    {/* VIEW 1: GROUP VIEW */}
                    {!matrixLoading && matrixViewMode === 'groups' && (
                      <>
                        {(!matrixData?.groups || matrixData.groups.length === 0) ? (
                          <tr>
                            <td colSpan={6 + (matrixData?.branches?.length || 0)} className="py-12 text-center text-slate-400">
                              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                              <p className="font-semibold text-slate-600">कोई लेजर ग्रुप नहीं मिला</p>
                              <p className="text-xs text-slate-400 mt-1">
                                "लेजर ग्रुपिंग" टैब में जाकर लेजर्स को ग्रुप में समूहित करें।
                              </p>
                            </td>
                          </tr>
                        ) : (
                          matrixData.groups.map((g: any) => (
                            <tr
                              key={g.groupName}
                              onClick={() => setSelectedGroupModal(g.groupName)}
                              className="group hover:bg-amber-50/40 cursor-pointer transition bg-amber-50/10"
                            >
                              <td className="px-3.5 sm:px-5 py-2.5 sm:py-3 text-slate-900 font-bold sticky left-0 z-10 bg-white group-hover:bg-amber-50 sticky-shadow-right max-w-[190px] sm:max-w-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                                    <span className="font-extrabold text-indigo-900 text-xs sm:text-sm truncate">📁 {g.groupName}</span>
                                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                      {g.parties?.length || 0}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate" title={g.parties?.join(', ')}>
                                    {g.parties?.join(', ')}
                                  </div>
                                </div>
                              </td>

                              {matrixData?.branches?.map((b: any) => {
                                const bInfo = g.branchBalances?.[b.id];
                                if (!bInfo || bInfo.net === 0) {
                                  return (
                                    <td key={b.id} className="px-4 py-2.5 sm:py-3 text-right text-slate-300 font-mono">
                                      -
                                    </td>
                                  );
                                }
                                return (
                                  <td key={b.id} className="px-4 py-2.5 sm:py-3 text-right whitespace-nowrap">
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

                              <td className="px-4 py-2.5 sm:py-3 text-right text-slate-600 font-mono whitespace-nowrap">
                                {g.totalDebit > 0 ? formatCurrency(g.totalDebit) : '-'}
                              </td>

                              <td className="px-4 py-2.5 sm:py-3 text-right text-slate-600 font-mono whitespace-nowrap">
                                {g.totalCredit > 0 ? formatCurrency(g.totalCredit) : '-'}
                              </td>

                              <td className="px-4 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap">
                                <span className={`font-black text-xs sm:text-sm font-mono ${
                                  g.status === 'Dr' ? 'text-amber-700' : g.status === 'Cr' ? 'text-emerald-700' : 'text-slate-500'
                                }`}>
                                  {formatCurrency(Math.abs(g.netBalance))}
                                </span>
                                <span className={`px-1.5 sm:px-2 py-0.5 ml-1.5 text-[9px] sm:text-[10px] font-bold rounded-full ${
                                  g.status === 'Dr'
                                    ? 'bg-amber-100 text-amber-800'
                                    : g.status === 'Cr'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {g.status === 'Dr' ? 'Dr' : g.status === 'Cr' ? 'Cr' : 'NIL'}
                                </span>
                              </td>

                              <td className="px-3 py-2.5 sm:py-3 text-center whitespace-nowrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedGroupModal(g.groupName);
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition active:scale-95"
                                >
                                  <Boxes className="w-3.5 h-3.5" />
                                  <span>Ledger</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </>
                    )}

                    {/* VIEW 2: INDIVIDUAL VIEW */}
                    {!matrixLoading && matrixViewMode === 'individual' && (!matrixData?.parties || matrixData.parties.length === 0) && (
                      <tr>
                        <td colSpan={6 + (matrixData?.branches?.length || 0)} className="py-12 text-center text-slate-400">
                          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600">No party ledger entries found</p>
                        </td>
                      </tr>
                    )}

                    {!matrixLoading && matrixViewMode === 'individual' && matrixData?.parties?.map((p: any) => (
                      <tr
                        key={p.partyName}
                        onClick={() => setSelectedParty(p.partyName)}
                        className="group hover:bg-indigo-50/40 cursor-pointer transition"
                      >
                        <td className="px-3.5 sm:px-5 py-2.5 sm:py-3 text-slate-900 font-semibold sticky left-0 z-10 bg-white group-hover:bg-indigo-50 sticky-shadow-right max-w-[190px] sm:max-w-xs">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                              <span className="truncate font-bold text-xs sm:text-sm">{p.partyName}</span>
                              {p.isMultiBranch && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                                  {p.branchesCount} Br
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                              {p.isGrouped && p.groupName && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  📁 {p.groupName}
                                </span>
                              )}
                              {p.isBranchAccount && p.mappedBranchCode && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 font-mono">
                                  🏷️ {p.mappedBranchCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {matrixData?.branches?.map((b: any) => {
                          const bInfo = p.branchBalances[b.id];
                          if (!bInfo || bInfo.net === 0) {
                            return (
                              <td key={b.id} className="px-4 py-2.5 sm:py-3 text-right text-slate-300 font-mono">
                                -
                              </td>
                            );
                          }
                          return (
                            <td key={b.id} className="px-4 py-2.5 sm:py-3 text-right whitespace-nowrap">
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

                        <td className="px-4 py-2.5 sm:py-3 text-right text-slate-600 font-mono whitespace-nowrap">
                          {p.totalDebit > 0 ? formatCurrency(p.totalDebit) : '-'}
                        </td>

                        <td className="px-4 py-2.5 sm:py-3 text-right text-slate-600 font-mono whitespace-nowrap">
                          {p.totalCredit > 0 ? formatCurrency(p.totalCredit) : '-'}
                        </td>

                        <td className="px-4 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap">
                          <span className={`font-black text-xs sm:text-sm font-mono ${
                            p.status === 'Dr' ? 'text-amber-700' : p.status === 'Cr' ? 'text-emerald-700' : 'text-slate-500'
                          }`}>
                            {formatCurrency(Math.abs(p.netBalance))}
                          </span>
                          <span className={`px-1.5 sm:px-2 py-0.5 ml-1.5 text-[9px] sm:text-[10px] font-bold rounded-full ${
                            p.status === 'Dr'
                              ? 'bg-amber-100 text-amber-800'
                              : p.status === 'Cr'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {p.status === 'Dr' ? 'Dr' : p.status === 'Cr' ? 'Cr' : 'NIL'}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 sm:py-3 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedParty(p.partyName);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>360° लेजर</span>
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
          <div className="space-y-4 sm:space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Tag className="w-5 h-5 text-purple-600 shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    लेजर को ब्रांच डिक्लेयर करें (Declare Ledgers as Branch by Code)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  लेजर को नाम से फ़िल्टर करें, सेलेक्ट करें और उसे एक ब्रांच कोड दें। फिर वे सभी लेजर उसी कोड से एज़ ए ब्रांच दिखेंगे और उनका बैलेंस आपस में मैच होगा।
                </p>
              </div>

              {availableDeclaredCodes.length > 0 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto touch-scroll no-scrollbar py-0.5">
                  <span className="text-[11px] sm:text-xs text-slate-500 font-semibold shrink-0">Declared Codes:</span>
                  {availableDeclaredCodes.map(code => (
                    <span key={code} className="px-2 sm:px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[11px] sm:text-xs font-bold font-mono shrink-0">
                      🏷️ {code}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-700">
                  चयनित लेजर: <b className="text-purple-700">{declareSelectedNames.length}</b>
                </span>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Branch Code (उदा. BHW, JOG)"
                    value={assignBranchCode}
                    onChange={(e) => setAssignBranchCode(e.target.value)}
                    className="bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-56 font-mono"
                  />

                  {branches.length > 0 && (
                    <div className="hidden sm:flex items-center space-x-1 shrink-0">
                      <span className="text-[10px] text-slate-400">Quick:</span>
                      {branches.map(b => (
                        <button
                          key={b.id}
                          onClick={() => setAssignBranchCode(b.code)}
                          className="px-2 py-0.5 bg-white hover:bg-purple-100 border border-purple-200 rounded text-[11px] font-bold text-purple-700 font-mono active:scale-95"
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
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold shadow transition flex items-center justify-center space-x-1.5 active:scale-95 ${
                    declareSelectedNames.length === 0 || !assignBranchCode.trim()
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>ब्रांच कोड लागू करें</span>
                </button>
              </div>

              <button
                onClick={() => setActiveTab('interbranch')}
                className="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center space-x-1.5 active:scale-95 shrink-0"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                <span>आपसी बैलेंस मैच देखें →</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="लेजर का नाम फ़िल्टर करें..."
                  value={declareSearch}
                  onChange={(e) => setDeclareSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                />
                {declareSearch && (
                  <button onClick={() => setDeclareSearch('')} className="text-slate-400 hover:text-slate-600 text-xs px-1">
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={declaredOnlyFilter}
                    onChange={(e) => setDeclaredOnlyFilter(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <span>केवल डिक्लेयर्ड लेजर्स</span>
                </label>

                <button
                  onClick={() => fetchDeclaredLedgers(selectedCompanyId)}
                  className="p-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 ${declareLoading ? 'animate-spin text-purple-600' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Mobile swipe hint banner */}
              <div className="sm:hidden bg-purple-50 border-b border-purple-100 px-3 py-1.5 flex items-center justify-between text-[11px] text-purple-900 font-semibold">
                <span>👈 लेजर विवरण व कोड देखने हेतु स्वाइप करें</span>
                <span className="text-[10px] bg-white text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">Swipe 👉</span>
              </div>

              <div className="overflow-x-auto touch-scroll max-h-[500px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 z-20">
                    <tr>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 w-10 text-center sticky left-0 z-30 bg-slate-100 sticky-shadow-right">
                        <button onClick={toggleSelectAllDeclare} className="text-slate-600 hover:text-slate-900 p-1">
                          {declareSelectedNames.length > 0 && declareSelectedNames.length === declareLedgers.length ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">लेजर का नाम (Ledger Name)</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">ब्रांच (Branch)</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center whitespace-nowrap">डिक्लेयर्ड कोड (Declared Code)</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right whitespace-nowrap">Debit (नाम)</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right whitespace-nowrap">Credit (जमा)</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-black whitespace-nowrap">Net Balance</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center whitespace-nowrap">Action</th>
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
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center sticky left-0 z-10 bg-white group-hover:bg-purple-50 sticky-shadow-right" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelectDeclare(item.partyName)} className="p-1">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-purple-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>

                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-900 font-bold">
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                              <span className="truncate max-w-[180px] sm:max-w-none">{item.partyName}</span>
                              {item.isBranchDeclared && (
                                <span className="px-1.5 sm:px-2 py-0.5 bg-purple-600 text-white rounded text-[9px] sm:text-[10px] font-bold font-mono shrink-0">
                                  BRANCH: {item.declaredBranchCode}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600 font-semibold whitespace-nowrap">{item.branchName}</td>

                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center whitespace-nowrap">
                            {item.isBranchDeclared ? (
                              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-purple-100 text-purple-800 rounded-full font-bold font-mono text-[11px] sm:text-xs">
                                🏷️ {item.declaredBranchCode}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">Not declared</span>
                            )}
                          </td>

                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-slate-600 font-mono whitespace-nowrap">
                            {item.totalDebit > 0 ? formatCurrency(item.totalDebit) : '-'}
                          </td>

                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-slate-600 font-mono whitespace-nowrap">
                            {item.totalCredit > 0 ? formatCurrency(item.totalCredit) : '-'}
                          </td>

                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right whitespace-nowrap font-bold font-mono">
                            <span className={item.status === 'Dr' ? 'text-amber-700' : item.status === 'Cr' ? 'text-emerald-700' : 'text-slate-500'}>
                              {formatCurrency(Math.abs(item.netBalance))}
                            </span>
                            <span className={`text-[10px] ml-1 font-bold ${
                              item.status === 'Dr' ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {item.status}
                            </span>
                          </td>

                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {item.isBranchDeclared ? (
                              <button
                                onClick={() => handleRemoveDeclaration(item.partyName)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold border border-rose-200 transition active:scale-95"
                              >
                                Remove Code
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setDeclareSelectedNames([item.partyName]);
                                }}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-semibold border border-purple-200 transition active:scale-95"
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

        {/* ==================== TAB 2: LEDGER GROUPING ==================== */}
        {companies.length > 0 && activeTab === 'groups' && (
          <div className="space-y-4 sm:space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Boxes className="w-5 h-5 text-amber-500 shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    लेजर ग्रुपिंग प्रबंधन (Party / Ledger Grouping)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  विभिन्न नामों या स्पेलिंग वाले लेजर्स को एक ही मुख्य ग्रुप/पार्टी (जैसे "Group A" या "Amol Bansal Group") में समूहित करें। नया डेटा अपलोड करने पर भी ये ग्रुप्स हमेशा सुरक्षित और ऑटो-अप्लाई रहेंगे।
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchGroups(selectedCompanyId)}
                  className="p-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition active:scale-95"
                  title="Refresh Groups"
                >
                  <RefreshCw className={`w-4 h-4 ${groupsLoading ? 'animate-spin text-amber-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Grid: Left = Existing Groups, Right = Assign Ledgers */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              
              {/* Left Column: Existing Groups List (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <FolderKanban className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        बनाए गए ग्रुप्स ({groupsData.length})
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">Total Groups</span>
                  </div>

                  {groupsData.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 space-y-2">
                      <Boxes className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold">अभी तक कोई ग्रुप नहीं बना है</p>
                      <p className="text-[11px] text-slate-400">
                        दाईं ओर दी गई सूची से लेजर्स को सेलेक्ट करें और नया ग्रुप नाम देकर जोड़ें।
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4 max-h-[500px] sm:max-h-[600px] overflow-y-auto touch-scroll pr-1">
                      {groupsData.map((g: any) => (
                        <div
                          key={g.groupName}
                          className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-2.5 sm:space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5 sm:space-x-2">
                                <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">📁 {g.groupName}</span>
                                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  {g.partyCount} Accounts
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">Consolidated Position</span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`text-[11px] sm:text-xs font-black font-mono px-2 py-0.5 rounded-lg whitespace-nowrap ${
                                g.status === 'Dr' ? 'bg-amber-100 text-amber-800' : g.status === 'Cr' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {formatCurrency(Math.abs(g.netBalance))} {g.status}
                              </span>
                            </div>
                          </div>

                          {/* Member Parties Tags */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              शामिल खाते (Member Accounts):
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto touch-scroll">
                              {g.parties.map((p: any) => (
                                <span
                                  key={p.partyName}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-800 shadow-2xs"
                                >
                                  <span className="truncate max-w-[140px] sm:max-w-none">{p.partyName}</span>
                                  <button
                                    onClick={() => handleRemovePartyFromGroup(p.partyName)}
                                    className="text-slate-400 hover:text-rose-600 transition ml-1 p-0.5"
                                    title="ग्रुप से निकालें"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                            <button
                              onClick={() => setSelectedGroupModal(g.groupName)}
                              className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-bold text-xs transition active:scale-95"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>संयुक्त लेजर देखें →</span>
                            </button>

                            <button
                              onClick={() => handleDeleteGroup(g.groupName)}
                              className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold transition p-1"
                            >
                              ग्रुप हटाएं
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Select & Assign Ledgers (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Users2 className="w-4 h-4 text-purple-600" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        लेजर्स चुनें और ग्रुप में जोड़ें
                      </h3>
                    </div>
                    {groupSelectedParties.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                        {groupSelectedParties.length} Selected
                      </span>
                    )}
                  </div>

                  {/* Assign Action Bar */}
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-purple-900 block">
                      चयनित लेजर्स को ग्रुप असाइन करें:
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="नया ग्रुप नाम (उदा. Group A)..."
                        value={newGroupNameInput}
                        onChange={(e) => {
                          setNewGroupNameInput(e.target.value);
                          if (e.target.value) setExistingGroupSelect('');
                        }}
                        className="flex-1 bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                      />

                      {groupNamesList.length > 0 && (
                        <select
                          value={existingGroupSelect}
                          onChange={(e) => {
                            setExistingGroupSelect(e.target.value);
                            if (e.target.value) setNewGroupNameInput('');
                          }}
                          className="bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto"
                        >
                          <option value="">-- या मौजूदा ग्रुप चुनें --</option>
                          {groupNamesList.map((gn) => (
                            <option key={gn} value={gn}>{gn}</option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={handleAssignGroup}
                        disabled={groupSelectedParties.length === 0 || (!newGroupNameInput.trim() && !existingGroupSelect.trim())}
                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition whitespace-nowrap active:scale-95"
                      >
                        ग्रुप असाइन करें ({groupSelectedParties.length})
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="पार्टी का नाम खोजें (उदा. Amol, Bansal)..."
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                    />
                    {groupSearch && (
                      <button onClick={() => setGroupSearch('')} className="text-slate-400 hover:text-slate-600 text-xs px-1">
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Party Selection Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] sm:max-h-[440px] overflow-y-auto touch-scroll">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] sticky top-0 z-20 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-10">
                            <input
                              type="checkbox"
                              checked={groupParties.length > 0 && groupSelectedParties.length === groupParties.length}
                              onChange={() => {
                                if (groupSelectedParties.length === groupParties.length) {
                                  setGroupSelectedParties([]);
                                } else {
                                  setGroupSelectedParties(groupParties.map(p => p.partyName));
                                }
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer p-1"
                            />
                          </th>
                          <th className="px-3 py-2.5 whitespace-nowrap">पार्टी का नाम</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">मौजूदा ग्रुप</th>
                          <th className="px-3 py-2.5 text-right whitespace-nowrap">Net Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {groupParties.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">
                              No accounts found matching search
                            </td>
                          </tr>
                        ) : (
                          groupParties.map((p) => {
                            const isChecked = groupSelectedParties.includes(p.partyName);
                            return (
                              <tr
                                key={p.partyName}
                                onClick={() => {
                                  if (isChecked) {
                                    setGroupSelectedParties(groupSelectedParties.filter(n => n !== p.partyName));
                                  } else {
                                    setGroupSelectedParties([...groupSelectedParties, p.partyName]);
                                  }
                                }}
                                className={`hover:bg-purple-50/30 transition cursor-pointer ${
                                  isChecked ? 'bg-purple-50/50' : ''
                                }`}
                              >
                                <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setGroupSelectedParties(groupSelectedParties.filter(n => n !== p.partyName));
                                      } else {
                                        setGroupSelectedParties([...groupSelectedParties, p.partyName]);
                                      }
                                    }}
                                    className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2 font-bold text-slate-900">
                                  <span className="truncate max-w-[170px] sm:max-w-none block">{p.partyName}</span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {p.isGrouped && p.groupName ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      📁 {p.groupName}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Ungrouped</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold whitespace-nowrap">
                                  <span className={p.status === 'Dr' ? 'text-amber-700' : p.status === 'Cr' ? 'text-emerald-700' : 'text-slate-500'}>
                                    {formatCurrency(Math.abs(p.netBalance))}
                                  </span>
                                  <span className={`text-[10px] ml-1 font-bold ${
                                    p.status === 'Dr' ? 'text-amber-600' : 'text-emerald-600'
                                  }`}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB 3: INTER-BRANCH TWO-WAY RECONCILIATION & MISMATCHES ==================== */}
        {companies.length > 0 && activeTab === 'interbranch' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ArrowRightLeft className="w-5 h-5 text-cyan-600 shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    आपसी कंपनी/ब्रांच मिलान व मिसमैच (Cross-Entity Reconciliation)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  स्पेलिंग भिन्नता की समस्या को दूर करने के लिए एंटिटी कोड (Entity Code) के आधार पर दोनों किताबों का दो-तरफा मिलान किया जाता है।
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('declare')}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition active:scale-95"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>कोड मैप करें</span>
                </button>

                <button
                  onClick={fetchInterBranch}
                  className="inline-flex items-center space-x-1 px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 active:scale-95 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ibLoading ? 'animate-spin text-cyan-600' : ''}`} />
                  <span>Re-check</span>
                </button>
              </div>
            </div>

            {/* Branch Selection Bar with Entity Codes */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                
                {/* Branch 1 Card */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>First Entity / Branch (बुक 1)</span>
                    </label>
                    {ibData?.selected?.branch1?.code && (
                      <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-blue-600 text-white font-mono shadow-xs">
                        CODE: {ibData.selected.branch1.code}
                      </span>
                    )}
                  </div>
                  <select
                    value={ibBranch1}
                    onChange={(e) => setIbBranch1(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Code: {b.code})
                      </option>
                    ))}
                  </select>

                  <div className="text-[11px] text-blue-900/80">
                    <span className="font-semibold">बुक 2 को दर्शाने वाले लेजर्स: </span>
                    {ibData?.selected?.branch1?.mappedLedgers?.length > 0 ? (
                      <span className="font-bold underline text-blue-900">
                        {ibData.selected.branch1.mappedLedgers.join(', ')}
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold italic">
                        कोई लेजर कोड से मैप नहीं है। <button onClick={() => setActiveTab('declare')} className="underline">कोड मैप करें</button>
                      </span>
                    )}
                  </div>
                </div>

                {/* Branch 2 Card */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span>Second Entity / Branch (बुक 2)</span>
                    </label>
                    {ibData?.selected?.branch2?.code && (
                      <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-purple-600 text-white font-mono shadow-xs">
                        CODE: {ibData.selected.branch2.code}
                      </span>
                    )}
                  </div>
                  <select
                    value={ibBranch2}
                    onChange={(e) => setIbBranch2(e.target.value)}
                    className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Code: {b.code})
                      </option>
                    ))}
                  </select>

                  <div className="text-[11px] text-purple-900/80">
                    <span className="font-semibold">बुक 1 को दर्शाने वाले लेजर्स: </span>
                    {ibData?.selected?.branch2?.mappedLedgers?.length > 0 ? (
                      <span className="font-bold underline text-purple-900">
                        {ibData.selected.branch2.mappedLedgers.join(', ')}
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold italic">
                        कोई लेजर कोड से मैप नहीं है। <button onClick={() => setActiveTab('declare')} className="underline">कोड मैप करें</button>
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Reconciliation KPI Summary Cards */}
            {ibData?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                
                {/* Total Mismatches Card */}
                <div className="bg-white border-2 border-rose-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3 bg-rose-50/30">
                  <div className="p-2 sm:p-3 bg-rose-100 rounded-xl text-rose-600 shrink-0">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[10px] font-extrabold text-rose-700 uppercase tracking-wider truncate">
                      कुल मिसमैच
                    </div>
                    <div className="text-base sm:text-xl font-black text-rose-700 mt-0.5 truncate">
                      {ibData.summary.totalMismatches} Entries
                    </div>
                    <span className="text-[10px] text-rose-600 font-bold block mt-0.5 truncate">
                      Diff: {formatCurrency(ibData.summary.missingInB2Amount + ibData.summary.missingInB1Amount)}
                    </span>
                  </div>
                </div>

                {/* Missing in B2 Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3">
                  <div className="p-2 sm:p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                    <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                      बुक 2 में गायब
                    </div>
                    <div className="text-base sm:text-lg font-black text-amber-700 mt-0.5 truncate">
                      {ibData.summary.missingInB2Count} Entries
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                      {formatCurrency(ibData.summary.missingInB2Amount)}
                    </span>
                  </div>
                </div>

                {/* Missing in B1 Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3">
                  <div className="p-2 sm:p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
                    <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                      बुक 1 में गायब
                    </div>
                    <div className="text-base sm:text-lg font-black text-purple-700 mt-0.5 truncate">
                      {ibData.summary.missingInB1Count} Entries
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                      {formatCurrency(ibData.summary.missingInB1Amount)}
                    </span>
                  </div>
                </div>

                {/* Matched Count Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3">
                  <div className="p-2 sm:p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                      पूर्ण मिलान (Matched)
                    </div>
                    <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 truncate">
                      {ibData.summary.matchedCount} Pairs
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                      {formatCurrency(ibData.summary.matchedAmount)}
                    </span>
                  </div>
                </div>

                {/* Net Difference Card */}
                <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-2.5 sm:space-x-3">
                  <div className="p-2 sm:p-3 bg-slate-100 rounded-xl text-slate-700 shrink-0">
                    <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                      नेट अंतर (Net Diff)
                    </div>
                    <div className={`text-base sm:text-lg font-black mt-0.5 truncate font-mono ${
                      ibData.summary.isReconciled ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {formatCurrency(ibData.summary.difference)}
                    </div>
                    <span className={`text-[10px] font-bold block mt-0.5 truncate ${
                      ibData.summary.isReconciled ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {ibData.summary.isReconciled ? '✓ Fully Reconciled' : 'Discrepancy Exists'}
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* Filter and Mismatch Toggle Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                
                {/* Status Toggle: Default is 'mismatch_only' as requested! */}
                <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto touch-scroll no-scrollbar">
                  <span className="text-slate-500 text-[10px] sm:text-[11px] uppercase px-1.5 shrink-0">मोड:</span>
                  
                  <button
                    onClick={() => setIbStatusFilter('mismatch_only')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shrink-0 active:scale-95 ${
                      ibStatusFilter === 'mismatch_only'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <FilterX className="w-3.5 h-3.5" />
                    <span>केवल मिसमैच</span>
                    {ibData?.summary?.totalMismatches > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        ibStatusFilter === 'mismatch_only' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {ibData.summary.totalMismatches}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setIbStatusFilter('all')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition shrink-0 active:scale-95 ${
                      ibStatusFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span>सभी ({ibData?.filters?.totalAllRows || ''})</span>
                  </button>

                  <button
                    onClick={() => setIbStatusFilter('matched_only')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shrink-0 active:scale-95 ${
                      ibStatusFilter === 'matched_only'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>मैच हुई ({ibData?.summary?.matchedCount || 0})</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="वाउचर नं, तारीख या राशि..."
                    value={ibSearch}
                    onChange={(e) => setIbSearch(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                  />
                  {ibSearch && (
                    <button onClick={() => setIbSearch('')} className="text-slate-400 hover:text-slate-600 text-xs px-1">
                      ✕
                    </button>
                  )}
                </div>

              </div>

              {/* Category Pills (Payment vs Sale vs Journal) */}
              <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-100 text-xs font-semibold overflow-x-auto touch-scroll no-scrollbar py-0.5">
                <span className="text-slate-400 text-[10px] sm:text-[11px] uppercase mr-1 shrink-0">श्रेणी:</span>
                
                <button
                  onClick={() => setIbTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 active:scale-95 ${
                    ibTypeFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  सभी प्रकार (All)
                </button>

                <button
                  onClick={() => setIbTypeFilter('payment_receipt')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 shrink-0 active:scale-95 ${
                    ibTypeFilter === 'payment_receipt' ? 'bg-blue-600 text-white font-bold' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <span>Payment ↔ Receipt</span>
                  {ibData?.summary?.categories?.paymentReceipt?.mismatchCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1 py-0.2 rounded-full font-mono ml-1">
                      {ibData.summary.categories.paymentReceipt.mismatchCount} Diff
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setIbTypeFilter('sale_purchase')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 shrink-0 active:scale-95 ${
                    ibTypeFilter === 'sale_purchase' ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <span>Sale ↔ Purchase</span>
                  {ibData?.summary?.categories?.salePurchase?.mismatchCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1 py-0.2 rounded-full font-mono ml-1">
                      {ibData.summary.categories.salePurchase.mismatchCount} Diff
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setIbTypeFilter('journal_other')}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 active:scale-95 ${
                    ibTypeFilter === 'journal_other' ? 'bg-purple-600 text-white font-bold' : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <span>Journal व अन्य</span>
                </button>
              </div>
            </div>

            {/* Side-by-Side Unified Line-by-Line Comparison Table */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="font-bold text-xs tracking-wide flex items-center space-x-2">
                  <GitCompare className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">दो-तरफा वाउचर मिलान तालिका</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-300 font-mono">
                  प्रविष्टियां: <b className="text-white">{ibData?.rows?.length || 0}</b>
                  {ibStatusFilter === 'mismatch_only' && <span className="text-amber-300 ml-1.5">(केवल मिसमैच)</span>}
                </div>
              </div>

              {/* Mobile swipe hint banner */}
              <div className="sm:hidden bg-cyan-50 border-b border-cyan-100 px-3 py-1.5 flex items-center justify-between text-[11px] text-cyan-950 font-semibold">
                <span>👈 दोनों किताबों का मिलान देखने हेतु स्वाइप करें</span>
                <span className="text-[10px] bg-white text-cyan-800 px-2 py-0.5 rounded border border-cyan-200 font-bold">Swipe 👉</span>
              </div>

              <div className="overflow-x-auto touch-scroll max-h-[580px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b-2 border-slate-300 sticky top-0 shadow-sm z-20">
                    <tr>
                      <th className="px-3 py-2.5 sm:py-3 text-center border-r border-slate-200 sticky left-0 z-30 bg-slate-100 sticky-shadow-right whitespace-nowrap">
                        स्थिति (Status)
                      </th>
                      <th className="px-3 py-2.5 sm:py-3 text-center border-r border-slate-200 whitespace-nowrap">Category</th>
                      
                      {/* Book 1 Header Block */}
                      <th colSpan={4} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-100/70 text-blue-950 border-r-2 border-indigo-300 text-center font-black whitespace-nowrap">
                        बुक 1: {ibData?.selected?.branch1?.name || 'Branch 1'} [{ibData?.selected?.branch1?.code}]
                      </th>

                      {/* Book 2 Header Block */}
                      <th colSpan={4} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-100/70 text-purple-950 border-r border-slate-300 text-center font-black whitespace-nowrap">
                        बुक 2: {ibData?.selected?.branch2?.name || 'Branch 2'} [{ibData?.selected?.branch2?.code}]
                      </th>

                      <th className="px-3 py-2.5 sm:py-3 text-right bg-slate-200 text-slate-900 font-black whitespace-nowrap">
                        राशि (Amount)
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-[10px] text-slate-600 border-b border-slate-200">
                      <th className="px-3 py-2 text-center border-r border-slate-200 sticky left-0 z-30 bg-slate-50 sticky-shadow-right whitespace-nowrap">#</th>
                      <th className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap">Type</th>
                      
                      {/* B1 sub-columns */}
                      <th className="px-3 py-2 whitespace-nowrap">तारीख व प्रकार</th>
                      <th className="px-3 py-2 whitespace-nowrap">वाउचर नं</th>
                      <th className="px-3 py-2 text-right bg-amber-50/50 whitespace-nowrap">डेबिट (नाम)</th>
                      <th className="px-3 py-2 text-right bg-emerald-50/50 border-r-2 border-indigo-300 whitespace-nowrap">क्रेडिट (जमा)</th>

                      {/* B2 sub-columns */}
                      <th className="px-3 py-2 whitespace-nowrap">तारीख व प्रकार</th>
                      <th className="px-3 py-2 whitespace-nowrap">वाउचर नं</th>
                      <th className="px-3 py-2 text-right bg-amber-50/50 whitespace-nowrap">डेबिट (नाम)</th>
                      <th className="px-3 py-2 text-right bg-emerald-50/50 border-r border-slate-300 whitespace-nowrap">क्रेडिट (जमा)</th>

                      <th className="px-3 py-2 text-right whitespace-nowrap">Net Value</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 font-medium text-xs">
                    {ibLoading && (
                      <tr>
                        <td colSpan={11} className="py-16 text-center text-slate-400">
                          <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <span>दोनों किताबों का मिलान जांचा जा रहा है...</span>
                        </td>
                      </tr>
                    )}

                    {!ibLoading && (!ibData?.rows || ibData.rows.length === 0) && (
                      <tr>
                        <td colSpan={11} className="py-16 text-center text-slate-400">
                          <div className="max-w-sm mx-auto space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                            <p className="font-bold text-slate-700 text-sm">
                              {ibStatusFilter === 'mismatch_only' 
                                ? 'बधाई! कोई मिसमैच प्रविष्टि नहीं पाई गई (0 Mismatches).'
                                : 'No entries found matching criteria.'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {ibStatusFilter === 'mismatch_only' && 'दोनों ब्रांचेस के सभी वाउचर्स पूर्ण रूप से मेल खाते हैं।'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!ibLoading && ibData?.rows?.map((row: any, idx: number) => {
                      const isMatched = row.matchStatus === 'MATCHED';
                      const isMissingInB2 = row.matchStatus === 'MISSING_IN_B2';
                      const isMissingInB1 = row.matchStatus === 'MISSING_IN_B1';

                      return (
                        <tr
                          key={row.id || idx}
                          className={`hover:bg-slate-50/80 transition ${
                            isMatched
                              ? 'bg-emerald-50/20'
                              : isMissingInB2
                              ? 'bg-amber-50/25'
                              : 'bg-purple-50/25'
                          }`}
                        >
                          {/* Match Status Badge */}
                          <td className="px-3 py-2 sm:py-2.5 text-center border-r border-slate-200 whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-slate-50 sticky-shadow-right">
                            {isMatched && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span>🟢</span>
                                <span>MATCHED</span>
                              </span>
                            )}
                            {isMissingInB2 && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300" title="यह एंट्री बुक 1 में दर्ज है, पर बुक 2 में नहीं मिली">
                                <span>🔴</span>
                                <span>MISSING B2</span>
                              </span>
                            )}
                            {isMissingInB1 && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300" title="यह एंट्री बुक 2 में दर्ज है, पर बुक 1 में नहीं मिली">
                                <span>🔴</span>
                                <span>MISSING B1</span>
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-3 py-2.5 text-center border-r border-slate-200 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.category === 'PAYMENT_RECEIPT'
                                ? 'bg-blue-100 text-blue-800'
                                : row.category === 'SALE_PURCHASE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}>
                              {row.category === 'PAYMENT_RECEIPT' ? 'Pymt ↔ Rcpt' : row.category === 'SALE_PURCHASE' ? 'Sale ↔ Purc' : 'Jrnl / Other'}
                            </span>
                          </td>

                          {/* Book 1 Side: Date & Voucher Type */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-700">
                            {row.b1 ? (
                              <div>
                                <span className="font-semibold">{row.b1.dateStr}</span>
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {row.b1.voucherType}
                                </span>
                              </div>
                            ) : (
                              <span className="text-rose-400 italic font-mono text-[11px]">- (बुक 1 में गायब) -</span>
                            )}
                          </td>

                          {/* Book 1 Side: Voucher No */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                            {row.b1?.voucherNo || '-'}
                          </td>

                          {/* Book 1 Side: Debit */}
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700 bg-amber-50/20 whitespace-nowrap">
                            {row.b1?.debit > 0 ? formatCurrency(row.b1.debit) : '-'}
                          </td>

                          {/* Book 1 Side: Credit */}
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20 border-r-2 border-indigo-300 whitespace-nowrap">
                            {row.b1?.credit > 0 ? formatCurrency(row.b1.credit) : '-'}
                          </td>

                          {/* Book 2 Side: Date & Voucher Type */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-700">
                            {row.b2 ? (
                              <div>
                                <span className="font-semibold">{row.b2.dateStr}</span>
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  {row.b2.voucherType}
                                </span>
                              </div>
                            ) : (
                              <span className="text-rose-400 italic font-mono text-[11px]">- (बुक 2 में गायब) -</span>
                            )}
                          </td>

                          {/* Book 2 Side: Voucher No */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                            {row.b2?.voucherNo || '-'}
                          </td>

                          {/* Book 2 Side: Debit */}
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700 bg-amber-50/20 whitespace-nowrap">
                            {row.b2?.debit > 0 ? formatCurrency(row.b2.debit) : '-'}
                          </td>

                          {/* Book 2 Side: Credit */}
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20 border-r border-slate-300 whitespace-nowrap">
                            {row.b2?.credit > 0 ? formatCurrency(row.b2.credit) : '-'}
                          </td>

                          {/* Amount */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono font-black text-slate-900 bg-slate-100/60">
                            {formatCurrency(row.amount)}
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

        {/* ==================== TAB 4: EXCEPTIONS REPORT (IGNORED ENTRIES) ==================== */}
        {companies.length > 0 && activeTab === 'exceptions' && (
          <div className="space-y-4 sm:space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    एक्सेप्शंस रिपोर्ट (Exceptions Report - Ignored Entries)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  गलत या अमान्य एंट्रियां जिन्हें लेजर और बैलेंस से अलग कर दिया गया है। आप इन्हें यहाँ देखकर कभी भी वापस लेजर में शामिल कर सकते हैं।
                </p>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <button
                  onClick={() => fetchExceptions(selectedCompanyId)}
                  className="p-2.5 sm:p-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition active:scale-95 touch-target-min"
                  title="रिफ्रेश करें"
                >
                  <RefreshCw className={`w-4 h-4 ${exceptionsLoading ? 'animate-spin text-rose-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="खोजें (Search party, voucher no, type)..."
                  value={exceptionsSearch}
                  onChange={(e) => setExceptionsSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                />
                {exceptionsSearch && (
                  <button onClick={() => setExceptionsSearch('')} className="text-slate-400 hover:text-slate-600 text-xs p-1">
                    ✕
                  </button>
                )}
              </div>

              <div className="text-xs font-bold text-slate-600 flex items-center justify-between sm:justify-end gap-2">
                <span>कुल एक्सेप्शंस:</span>
                <span className="text-rose-700 font-mono text-xs font-extrabold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                  {exceptions.length} Entries
                </span>
              </div>
            </div>

            {/* Exceptions Table */}
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
              {/* Mobile Swipe Hint Banner */}
              <div className="sm:hidden bg-rose-50 border-b border-rose-100 px-3 py-1.5 flex items-center justify-between text-[11px] text-rose-900 font-semibold">
                <span>👈 एक्सेप्शन एंट्रियां देखने हेतु स्वाइप करें</span>
                <span className="text-[10px] bg-white text-rose-700 px-2 py-0.5 rounded border border-rose-200 font-bold">Swipe 👉</span>
              </div>

              <div className="overflow-x-auto touch-scroll max-h-[500px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 z-20">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 sticky left-0 z-20 bg-slate-100 sticky-shadow-right whitespace-nowrap">Date (तारीख)</th>
                      <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Branch (ब्रांच)</th>
                      <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Type & Voucher No</th>
                      <th className="px-3 sm:px-4 py-3 min-w-[140px]">पार्टी का नाम (Party Name)</th>
                      <th className="px-3 sm:px-4 py-3 min-w-[130px]">काउंटर खाता (Counter Account)</th>
                      <th className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">राशि (Amount)</th>
                      <th className="px-3 sm:px-4 py-3 min-w-[140px]">इग्नोर कारण (Reason)</th>
                      <th className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">Action</th>
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
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-slate-600 font-mono sticky left-0 z-10 bg-white sticky-shadow-right">
                          {item.dateStr}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                            {item.branchName}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mr-1">
                            {item.voucherType}
                          </span>
                          <span className="font-mono text-slate-700 font-semibold">{item.voucherNo}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-900 font-bold whitespace-nowrap">{item.primaryParty}</td>
                        <td className="px-3 sm:px-4 py-3 text-slate-600 whitespace-nowrap">{item.counterAccount || '-'}</td>
                        <td className="px-3 sm:px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-500 italic max-w-xs truncate" title={item.ignoredReason}>
                          {item.ignoredReason}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                          <button
                            disabled={restoringId === item.id}
                            onClick={() => handleRestoreEntry(item.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition active:scale-95 touch-target-min"
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
          <div className="space-y-4 sm:space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">ब्रांचेस प्रबंधन (Branch Management)</h2>
                <p className="text-xs text-slate-500">
                  हर ब्रांच का नाम क्रिएट करें और उस ब्रांच के लिए DayBook फ़ाइल इम्पोर्ट करें
                </p>
              </div>

              <button
                onClick={() => setShowNewBranchModal(true)}
                className="inline-flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 sm:py-2 rounded-xl shadow transition active:scale-95 touch-target-min w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>+ Create New Branch</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className={`bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm transition ${
                    importBranchId === b.id ? 'border-indigo-500 ring-2 ring-indigo-400/40' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                        {b.code || b.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{b.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">Code: {b.code}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setResetModal({ open: true, type: 'branch', id: b.id, name: b.name })}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition active:scale-95 shrink-0"
                      title="Clear or delete branch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Vouchers</span>
                      <span className="font-bold text-slate-900 text-sm font-mono">{b.voucherCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Parties Found</span>
                      <span className="font-bold text-slate-900 text-sm font-mono">{b.partiesCount || 0}</span>
                    </div>
                  </div>

                  {b.lastDate && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      Latest Voucher: <span className="font-semibold text-slate-700 font-mono">{b.lastDate}</span>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-2">
                    <button
                      onClick={() => setImportBranchId(b.id)}
                      className={`flex-1 py-2 sm:py-1.5 px-3 rounded-xl text-xs font-semibold text-center transition active:scale-95 touch-target-min ${
                        importBranchId === b.id
                          ? 'bg-indigo-600 text-white font-bold'
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
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mt-4 sm:mt-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 sm:p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                  <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    DayBook फ़ाइल अपलोड और इम्पोर्ट (Upload DayBook File)
                  </h3>
                  <p className="text-xs text-slate-500">
                    चयनित ब्रांच के लिए Tally DayBook TXT या CSV फ़ाइल अपलोड करें
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    किस ब्रांच में इम्पोर्ट करना है? (Target Branch) *
                  </label>
                  <select
                    value={importBranchId}
                    onChange={(e) => setImportBranchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer mt-1 sm:mt-5">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 mx-auto mb-2" />
                    <div className="text-xs sm:text-sm font-semibold text-slate-700">अपनी DayBook.txt / .CSV फ़ाइल चुनें</div>
                    <p className="text-[11px] text-slate-400 mt-1">Supports Tally DayBook .TXT and .CSV export</p>
                    
                    <input
                      type="file"
                      accept=".txt,.csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="mt-3 block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />

                    {importFile && (
                      <div className="mt-3 text-xs font-bold text-indigo-600 bg-indigo-50 py-1 px-3 rounded-lg inline-block">
                        Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <button
                      disabled={!importFile || importing}
                      onClick={() => handleImport(false)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow transition flex items-center justify-center space-x-2 active:scale-95 touch-target-min ${
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

                <div className="border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs sm:text-sm mb-1">
                      <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>⚡ 1-Click Fast Import (Sample DayBook)</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 mb-3">
                      डेस्कटॉप फ़ोल्डर की मूल <code className="bg-white px-1 py-0.5 rounded border border-indigo-200 text-indigo-900 font-bold">DayBook.CSV / DayBook.txt</code> को सीधे एक क्लिक में इस ब्रांच में इम्पोर्ट करें!
                    </p>

                    <div className="bg-white/80 rounded-xl p-3 border border-indigo-100 text-[11px] text-slate-600 space-y-1 mb-4">
                      <div className="truncate">• Path: <code>c:\Users\USER\Desktop\BOOKS MATCH\DayBook.CSV</code></div>
                      <div>• 100% Balanced vouchers (Total Dr == Total Cr, Sum == 0)</div>
                      <div>• Stores directly in MongoDB <code>focustube</code> collection</div>
                    </div>
                  </div>

                  <button
                    disabled={importing}
                    onClick={() => handleImport(true)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center space-x-2 active:scale-95 touch-target-min ${
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
                <div className="mt-4 sm:mt-6 p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-xl sm:rounded-2xl text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs sm:text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>इम्पोर्ट सफलतापूर्वक पूरा हुआ (Import Summary)</span>
                    </div>
                    <span className="bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold text-[11px] self-start sm:self-auto">
                      {importResult.branchName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block text-[11px]">Total Vouchers</span>
                      <span className="font-extrabold text-slate-900 text-sm sm:text-base font-mono">{importResult.totalVouchers}</span>
                    </div>
                    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block text-[11px]">Parties Identified</span>
                      <span className="font-extrabold text-slate-900 text-sm sm:text-base font-mono">{importResult.totalParties}</span>
                    </div>
                    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block text-[11px]">Total Debits</span>
                      <span className="font-extrabold text-amber-700 text-xs sm:text-sm font-mono whitespace-nowrap">{formatCurrency(importResult.totalDebits)}</span>
                    </div>
                    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block text-[11px]">Total Credits</span>
                      <span className="font-extrabold text-emerald-700 text-xs sm:text-sm font-mono whitespace-nowrap">{formatCurrency(importResult.totalCredits)}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveTab('matrix')}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold active:scale-95 touch-target-min text-center"
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
          <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
            
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-center space-x-3 text-rose-600 mb-3 sm:mb-4">
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  डेटा रीसेट और क्लियर (Clear / Reset Data)
                </h3>
              </div>

              <p className="text-xs text-slate-500 mb-4 sm:mb-6">
                यूजर आवश्यकतानुसार केवल ट्रांजैक्शन डेटा वाइप कर सकता है ताकि उनके बनाए गए <b>एंटिटी कोड्स</b> और <b>लेजर ग्रुप्स</b> सुरक्षित रहें और नया डेटा अपलोड होते ही स्वतः लागू हो जाएं।
              </p>

              <div className="space-y-3 sm:space-y-4">
                {/* Preserve Rules Wipe Option */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <h4 className="font-extrabold text-indigo-950 text-xs sm:text-sm">केवल ट्रांजैक्शन वाइप करें (Wipe Transactions Only - Safe Re-upload)</h4>
                    </div>
                    <p className="text-xs text-indigo-900/80 mt-1 sm:mt-0.5">
                      सभी वाउचर्स हट जाएंगे, लेकिन आपके बनाए गए <b>लेजर ग्रुप्स</b> और <b>ब्रांच कोड मैपिंग्स</b> पूरी तरह सुरक्षित रहेंगे। अगली बार अपलोड पर वे अपने आप जुड़ जाएंगे!
                    </p>
                  </div>
                  <button
                    onClick={() => setResetModal({ open: true, type: 'transactions' as any, name: 'All Transactions (Rules Preserved)' })}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition active:scale-95 touch-target-min whitespace-nowrap text-center"
                  >
                    Wipe Transactions (Keep Rules)
                  </button>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">चयनित ब्रांच का डेटा हटाएं (Clear Branch Vouchers)</h4>
                    <p className="text-xs text-slate-500 mt-1 sm:mt-0.5">
                      केवल चुनी गई ब्रांच के वाउचर्स और लेजर बैलेंस डिलीट होंगे।
                    </p>
                  </div>
                  <button
                    onClick={() => setResetModal({ open: true, type: 'branch', id: importBranchId, name: branches.find(b => b.id === importBranchId)?.name })}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition active:scale-95 touch-target-min text-center"
                  >
                    Clear Selected Branch Data
                  </button>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-amber-900 text-xs sm:text-sm">पूरी कंपनी का डेटा हटाएं (Clear Company Data)</h4>
                    <p className="text-xs text-amber-700 mt-1 sm:mt-0.5">
                      इस कंपनी की सभी ब्रांचेस के वाउचर्स और रिकंसीलेशन साफ हो जाएंगे।
                    </p>
                  </div>
                  <button
                    onClick={() => setResetModal({ open: true, type: 'company', name: selectedCompany?.name })}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow transition active:scale-95 touch-target-min text-center"
                  >
                    Clear Company Data
                  </button>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl border border-rose-300 bg-rose-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-rose-950 text-xs sm:text-sm">संपूर्ण डेटाबेस रीसेट (Complete Database Wipe)</h4>
                    <p className="text-xs text-rose-800 mt-1 sm:mt-0.5">
                      सभी कंपनियां, ब्रांचेस, वाउचर्स और पार्टी लेजर रिकॉर्ड्स स्थायी रूप से डिलीट हो जाएंगे।
                    </p>
                  </div>
                  <button
                    onClick={() => setResetModal({ open: true, type: 'all', name: 'All Database Collections' })}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow transition active:scale-95 touch-target-min text-center"
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

      {/* 360 T-Format Party & Group Ledger Modal */}
      {(selectedParty || selectedGroupModal) && selectedCompanyId && (
        <PartyLedgerModal
          partyName={selectedParty}
          groupName={selectedGroupModal}
          companyId={selectedCompanyId}
          onClose={() => {
            setSelectedParty(null);
            setSelectedGroupModal(null);
          }}
          onVoucherIgnored={() => {
            fetchExceptions(selectedCompanyId);
            fetchMatrix(selectedCompanyId);
            if (activeTab === 'interbranch') fetchInterBranch();
          }}
        />
      )}

      {/* New Company Modal */}
      {showNewCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 touch-scroll overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-slate-200 my-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2">नई कंपनी बनाएं (Add New Company)</h3>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCompanyModal(false)}
                  className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 active:scale-95 touch-target-min"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow active:scale-95 touch-target-min"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 touch-scroll overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-slate-200 my-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2">नई ब्रांच जोड़ें (Add New Branch)</h3>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 active:scale-95 touch-target-min"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow active:scale-95 touch-target-min"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 touch-scroll overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-rose-200 my-auto">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">डेटा डिलीट करने की पुष्टि (Confirm Delete)</h3>
            </div>
            
            <div className="text-xs text-slate-600 mb-5 space-y-1">
              {resetModal.type === 'transactions' ? (
                <>
                  <p>क्या आप सभी वित्तीय वाउचर्स और बैलेंस वाइप करना चाहते हैं?</p>
                  <p className="font-bold text-indigo-700">
                    ✓ आपके बनाए गए लेजर ग्रुप्स और ब्रांच कोड्स सुरक्षित रहेंगे और नया DayBook अपलोड करने पर स्वतः पुनः लागू हो जाएंगे।
                  </p>
                </>
              ) : (
                <p>
                  क्या आप सुनिश्चित हैं कि आप <b>{resetModal.name || resetModal.type}</b> का डेटा स्थायी रूप से डिलीट करना चाहते हैं?
                  डिलीट होने के बाद आप कभी भी नया डेटा इम्पोर्ट कर सकते हैं।
                </p>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setResetModal({ open: false, type: 'company' })}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 active:scale-95 touch-target-min"
              >
                रद्द करें (Cancel)
              </button>
              <button
                disabled={resetLoading}
                onClick={executeReset}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center space-x-1.5 active:scale-95 touch-target-min"
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
