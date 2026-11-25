import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

export interface BranchBalance {
  branchName: string;
  debit: number;
  credit: number;
  net: number;
  status: string;
}

export interface PartyRecord {
  partyName: string;
  groupName?: string;
  isGrouped?: boolean;
  isBranchAccount?: boolean;
  mappedBranchCode?: string;
  branchBalances: { [branchId: string]: BranchBalance };
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  status: string;
  branchesCount: number;
  isMultiBranch: boolean;
}

export interface GroupRecord {
  groupName: string;
  parties: string[];
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  status: string;
  branchBalances: { [branchId: string]: BranchBalance };
}

interface LedgerState {
  companyId: string;
  branches: Array<{ id: string; name: string; code: string }>;
  parties: PartyRecord[];
  groups: GroupRecord[];
  declaredLedgers: any[];
  exceptions: any[];
  matrixSearch: string;
  matrixFilter: 'all' | 'multi_branch' | 'dr' | 'cr' | 'grouped' | 'ungrouped';
  matrixViewMode: 'individual' | 'groups';
  declareSearch: string;
  declaredOnly: boolean;
  exceptionsSearch: string;
  isLoading: boolean;
  lastUpdated: number | null;
}

const initialState: LedgerState = {
  companyId: '',
  branches: [],
  parties: [],
  groups: [],
  declaredLedgers: [],
  exceptions: [],
  matrixSearch: '',
  matrixFilter: 'all',
  matrixViewMode: 'individual',
  declareSearch: '',
  declaredOnly: false,
  exceptionsSearch: '',
  isLoading: false,
  lastUpdated: null,
};

export const ledgerSlice = createSlice({
  name: 'ledger',
  initialState,
  reducers: {
    setCompanyId: (state, action: PayloadAction<string>) => {
      state.companyId = action.payload;
    },
    setMatrixData: (state, action: PayloadAction<{ branches: any[]; parties: PartyRecord[]; groups: GroupRecord[] }>) => {
      state.branches = action.payload.branches || [];
      state.parties = action.payload.parties || [];
      state.groups = action.payload.groups || [];
      state.lastUpdated = Date.now();
      state.isLoading = false;
    },
    setDeclaredLedgers: (state, action: PayloadAction<any[]>) => {
      state.declaredLedgers = action.payload || [];
    },
    setExceptions: (state, action: PayloadAction<any[]>) => {
      state.exceptions = action.payload || [];
    },
    setMatrixSearch: (state, action: PayloadAction<string>) => {
      state.matrixSearch = action.payload;
    },
    setMatrixFilter: (state, action: PayloadAction<'all' | 'multi_branch' | 'dr' | 'cr' | 'grouped' | 'ungrouped'>) => {
      state.matrixFilter = action.payload;
    },
    setMatrixViewMode: (state, action: PayloadAction<'individual' | 'groups'>) => {
      state.matrixViewMode = action.payload;
    },
    setDeclareSearch: (state, action: PayloadAction<string>) => {
      state.declareSearch = action.payload;
    },
    setDeclaredOnly: (state, action: PayloadAction<boolean>) => {
      state.declaredOnly = action.payload;
    },
    setExceptionsSearch: (state, action: PayloadAction<string>) => {
      state.exceptionsSearch = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }
  }
});

export const {
  setCompanyId,
  setMatrixData,
  setDeclaredLedgers,
  setExceptions,
  setMatrixSearch,
  setMatrixFilter,
  setMatrixViewMode,
  setDeclareSearch,
  setDeclaredOnly,
  setExceptionsSearch,
  setLoading
} = ledgerSlice.actions;

// Redux Selectors for Ultra-Fast In-Memory Filtering (0ms Latency)
const selectParties = (state: { ledger: LedgerState }) => state.ledger.parties;
const selectGroups = (state: { ledger: LedgerState }) => state.ledger.groups;
const selectMatrixSearch = (state: { ledger: LedgerState }) => state.ledger.matrixSearch;
const selectMatrixFilter = (state: { ledger: LedgerState }) => state.ledger.matrixFilter;
const selectDeclaredLedgers = (state: { ledger: LedgerState }) => state.ledger.declaredLedgers;
const selectDeclareSearch = (state: { ledger: LedgerState }) => state.ledger.declareSearch;
const selectDeclaredOnly = (state: { ledger: LedgerState }) => state.ledger.declaredOnly;
const selectExceptionsList = (state: { ledger: LedgerState }) => state.ledger.exceptions;
const selectExceptionsSearch = (state: { ledger: LedgerState }) => state.ledger.exceptionsSearch;

// Filtered Parties Selector
export const selectFilteredParties = createSelector(
  [selectParties, selectMatrixSearch, selectMatrixFilter],
  (parties, search, filter) => {
    let result = parties;
    const cleanSearch = (search || '').trim().toLowerCase();

    if (cleanSearch) {
      result = result.filter(p => {
        const pName = (p.partyName || '').toLowerCase();
        const gName = (p.groupName || '').toLowerCase();
        const bCode = (p.mappedBranchCode || '').toLowerCase();
        return pName.includes(cleanSearch) || gName.includes(cleanSearch) || bCode.includes(cleanSearch);
      });
    }

    if (filter === 'multi_branch') {
      result = result.filter(p => p.isMultiBranch);
    } else if (filter === 'dr') {
      result = result.filter(p => p.status === 'Dr');
    } else if (filter === 'cr') {
      result = result.filter(p => p.status === 'Cr');
    } else if (filter === 'grouped') {
      result = result.filter(p => p.isGrouped);
    } else if (filter === 'ungrouped') {
      result = result.filter(p => !p.isGrouped);
    }

    return result;
  }
);

// Filtered Groups Selector
export const selectFilteredGroups = createSelector(
  [selectGroups, selectMatrixSearch],
  (groups, search) => {
    const cleanSearch = (search || '').trim().toLowerCase();
    if (!cleanSearch) return groups;

    return groups.filter(g => {
      const gName = (g.groupName || '').toLowerCase();
      const matchParty = (g.parties || []).some(p => p.toLowerCase().includes(cleanSearch));
      return gName.includes(cleanSearch) || matchParty;
    });
  }
);

// Filtered Declared Ledgers Selector
export const selectFilteredDeclaredLedgers = createSelector(
  [selectDeclaredLedgers, selectDeclareSearch, selectDeclaredOnly],
  (ledgers, search, declaredOnly) => {
    let result = ledgers;
    const cleanSearch = (search || '').trim().toLowerCase();

    if (cleanSearch) {
      result = result.filter(l => {
        const pName = (l.partyName || '').toLowerCase();
        const bCode = (l.targetBranchCode || l.mappedBranchCode || '').toLowerCase();
        const bName = (l.branchName || '').toLowerCase();
        return pName.includes(cleanSearch) || bCode.includes(cleanSearch) || bName.includes(cleanSearch);
      });
    }

    if (declaredOnly) {
      result = result.filter(l => !!l.isDeclared || !!l.targetBranchCode || !!l.mappedBranchCode);
    }

    return result;
  }
);

// Filtered Exceptions Selector
export const selectFilteredExceptions = createSelector(
  [selectExceptionsList, selectExceptionsSearch],
  (exceptions, search) => {
    const cleanSearch = (search || '').trim().toLowerCase();
    if (!cleanSearch) return exceptions;

    return exceptions.filter(e => {
      const vNo = (e.voucherNo || '').toLowerCase();
      const nar = (e.narration || '').toLowerCase();
      const pName = (e.partyName || '').toLowerCase();
      const accounts = (e.lines || []).some((l: any) => (l.account || '').toLowerCase().includes(cleanSearch));
      return vNo.includes(cleanSearch) || nar.includes(cleanSearch) || pName.includes(cleanSearch) || accounts;
    });
  }
);

export default ledgerSlice.reducer;
