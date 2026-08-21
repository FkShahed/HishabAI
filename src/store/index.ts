import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category, Budget, TransactionFilters, UserPreferences, TransactionType } from '../types';
import { ALL_DEFAULT_CATEGORIES } from '../constants/categories';
import {
  groupTransactionsByDate,
  calculateMonthlySummary,
  calculateBudgetStatus,
  isInMonth,
  getTodayString,
} from '../utils/finance';
import { FirebaseService, auth } from '../services/firebase';

// ─── Transaction Store ────────────────────────────────────────────────────────

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  filters: TransactionFilters;

  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  addTransactions: (transactions: Transaction[]) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  clearAllData: () => void;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed getters (always use transactionDate)
  getTransactionsForMonth: (month: number, year: number) => Transaction[];
  getTransactionsForDate: (dateStr: string) => Transaction[];
  getTransaction: (id: string) => Transaction | undefined;
  getMonthlySummary: (month: number, year: number) => ReturnType<typeof calculateMonthlySummary>;
  getDailyGroups: (month: number, year: number) => ReturnType<typeof groupTransactionsByDate>;
  getFilteredTransactions: () => Transaction[];
  searchTransactions: (query: string) => Transaction[];
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
  isLoading: false,
  error: null,
  filters: {},

  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => {
    set((state) => ({ transactions: [transaction, ...state.transactions] }));
    if (auth?.currentUser) {
      FirebaseService.saveTransaction(auth.currentUser.uid, transaction).catch(console.error);
    }
  },
  addTransactions: (newTransactions) => {
    set((state) => ({ transactions: [...newTransactions, ...state.transactions] }));
    if (auth?.currentUser) {
      newTransactions.forEach(t => 
        FirebaseService.saveTransaction(auth.currentUser!.uid, t).catch(console.error)
      );
    }
  },
  updateTransaction: (id, updates) => {
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    }));
    if (auth?.currentUser) {
      const updated = get().transactions.find(t => t.id === id);
      if (updated) {
        FirebaseService.saveTransaction(auth.currentUser.uid, updated).catch(console.error);
      }
    }
  },
  deleteTransaction: (id) => {
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
    if (auth?.currentUser) {
      FirebaseService.deleteTransaction(auth.currentUser.uid, id).catch(console.error);
    }
  },
  clearAllData: () => set({ transactions: [] }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearFilters: () => set({ filters: {} }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // All getters use transactionDate — NEVER createdAt
  getTransactionsForMonth: (month, year) =>
    get().transactions.filter((t) => isInMonth(t.transactionDate, month, year)),

  getTransactionsForDate: (dateStr) =>
    get().transactions.filter((t) => t.transactionDate === dateStr),

  getTransaction: (id) =>
    get().transactions.find((t) => t.id === id),

  getMonthlySummary: (month, year) =>
    calculateMonthlySummary(get().transactions, month, year),

  getDailyGroups: (month, year) => {
    const monthTransactions = get().transactions.filter((t) =>
      isInMonth(t.transactionDate, month, year)
    );
    return groupTransactionsByDate(monthTransactions);
  },

  getFilteredTransactions: () => {
    const { transactions, filters } = get();
    return transactions.filter((t) => {
      if (filters.type && t.type !== filters.type) return false;
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
      if (filters.source && t.source !== filters.source) return false;
      if (filters.startDate && t.transactionDate < filters.startDate) return false;
      if (filters.endDate && t.transactionDate > filters.endDate) return false;
      if (filters.minAmount && t.amount < filters.minAmount) return false;
      if (filters.maxAmount && t.amount > filters.maxAmount) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matches =
          t.comment.toLowerCase().includes(q) ||
          t.categoryNameSnapshot.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  },

  searchTransactions: (query) => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return get().transactions.filter((t) =>
      t.comment.toLowerCase().includes(q) ||
      t.categoryNameSnapshot.toLowerCase().includes(q) ||
      t.amount.toString().includes(q) ||
      t.transactionDate.includes(q)
    );
  },
  

    }),
    {
      name: 'hishabai-transactions',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ transactions: state.transactions, filters: state.filters }),
    }
  )
);

// ─── Category Store ───────────────────────────────────────────────────────────

interface CategoryState {
  categories: Category[];
  isLoading: boolean;

  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  clearAllData: () => void;
  getCategoriesForType: (type: TransactionType) => Category[];
  getCategoryById: (id: string) => Category | undefined;
  getAICategoryList: () => { id: string; name: string; type: 'expense' | 'income' }[];
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: ALL_DEFAULT_CATEGORIES,
      isLoading: false,

      setCategories: (categories) => set({ categories }),
      addCategory: (category) => {
        set((state) => ({ categories: [...state.categories, category] }));
        if (auth?.currentUser && !category.isDefault) {
          FirebaseService.saveCategory(auth.currentUser.uid, category).catch(console.error);
        }
      },
      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));

        // Cascade category changes (name, icon, color) to all transactions belonging to this category
        const txStore = useTransactionStore.getState();
        if (txStore && txStore.transactions) {
          txStore.transactions.forEach((tx) => {
            if (tx.categoryId === id) {
              txStore.updateTransaction(tx.id, {
                ...(updates.name ? { categoryNameSnapshot: updates.name } : {}),
                ...(updates.icon ? { categoryIcon: updates.icon } : {}),
                ...(updates.color ? { categoryColor: updates.color } : {}),
              });
            }
          });
        }

        if (auth?.currentUser) {
          const updated = get().categories.find(c => c.id === id);
          if (updated && !updated.isDefault) {
            FirebaseService.saveCategory(auth.currentUser.uid, updated).catch(console.error);
          }
        }
      },
      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
        if (auth?.currentUser) {
          FirebaseService.deleteCategory(auth.currentUser.uid, id).catch(console.error);
        }
      },

      clearAllData: () => set({ categories: ALL_DEFAULT_CATEGORIES }),
      getCategoriesForType: (type) =>
        get().categories.filter((c) => c.type === type && c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
      getCategoryById: (id) => get().categories.find((c) => c.id === id),
      getAICategoryList: () =>
        get().categories
          .filter((c) => c.isActive)
          .map((c) => ({ id: c.id, name: c.name, type: c.type })),
    }),
    {
      name: 'hishabai-categories',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ categories: state.categories }),
    }
  )
);

// ─── Budget Store ─────────────────────────────────────────────────────────────

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;

  setBudgets: (budgets: Budget[]) => void;
  setBudget: (budget: Budget) => void;
  clearAllData: () => void;
  getBudgetForMonth: (month: number, year: number) => Budget | null;
  getBudgetStatus: (month: number, year: number) => ReturnType<typeof calculateBudgetStatus>;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      budgets: [],
      isLoading: false,

      setBudgets: (budgets) => set({ budgets }),
      setBudget: (budget) => {
        set((state) => {
          const existing = state.budgets.findIndex(
            (b) => b.month === budget.month && b.year === budget.year
          );
          if (existing >= 0) {
            const updated = [...state.budgets];
            updated[existing] = budget;
            return { budgets: updated };
          }
          return { budgets: [...state.budgets, budget] };
        });
        if (auth?.currentUser) {
          FirebaseService.saveBudget(auth.currentUser.uid, budget).catch(console.error);
        }
      },

      clearAllData: () => set({ budgets: [] }),

      getBudgetForMonth: (month, year) =>
        get().budgets.find((b) => b.month === month && b.year === year) ?? null,

      getBudgetStatus: (month, year) => {
        const budget = get().getBudgetForMonth(month, year);
        const transactions = useTransactionStore.getState().transactions;
        return calculateBudgetStatus(transactions, budget, month, year);
      },
    }),
    {
      name: 'hishabai-budgets',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ budgets: state.budgets }),
    }
  )
);

// ─── UI Store ─────────────────────────────────────────────────────────────────

export type BackgroundPreset = 'aurora' | 'nebula' | 'emerald' | 'sunset' | 'cyberpunk' | 'midnight';

interface UIState {
  selectedMonth: number;
  selectedYear: number;
  currency: string;
  isFirstLaunch: boolean;
  theme: 'dark' | 'light';
  backgroundPreset: BackgroundPreset;
  userName: string;
  userPhotoUrl: string | null;
  dailyReminderEnabled: boolean;

  setSelectedMonth: (month: number, year: number) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  setCurrency: (currency: string) => void;
  setFirstLaunch: (value: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setBackgroundPreset: (preset: BackgroundPreset) => void;
  toggleTheme: () => void;
  setUserName: (name: string) => void;
  setUserPhotoUrl: (url: string | null) => void;
  setDailyReminderEnabled: (enabled: boolean) => void;
  fetchAndSyncUserProfile: (userId: string) => Promise<void>;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      selectedMonth: new Date().getMonth() + 1,
      selectedYear: new Date().getFullYear(),
      currency: 'BDT',
      isFirstLaunch: true,
      theme: 'light',
      backgroundPreset: 'aurora',
      userName: 'Guest User',
      userPhotoUrl: null,
      dailyReminderEnabled: false,

      setSelectedMonth: (month, year) => set({ selectedMonth: month, selectedYear: year }),
      goToPrevMonth: () => {
        const { selectedMonth, selectedYear } = get();
        if (selectedMonth === 1) {
          set({ selectedMonth: 12, selectedYear: selectedYear - 1 });
        } else {
          set({ selectedMonth: selectedMonth - 1 });
        }
      },
      goToNextMonth: () => {
        const { selectedMonth, selectedYear } = get();
        if (selectedMonth === 12) {
          set({ selectedMonth: 1, selectedYear: selectedYear + 1 });
        } else {
          set({ selectedMonth: selectedMonth + 1 });
        }
      },
      setCurrency: (currency) => {
        set({ currency });
        if (auth?.currentUser) {
          FirebaseService.saveUserProfile(auth.currentUser.uid, { currency }).catch(() => {});
        }
      },
      setFirstLaunch: (isFirstLaunch) => set({ isFirstLaunch }),
      setTheme: (theme) => {
        set({ theme });
        if (auth?.currentUser) {
          FirebaseService.saveUserProfile(auth.currentUser.uid, { theme }).catch(() => {});
        }
      },
      setBackgroundPreset: (backgroundPreset) => {
        set({ backgroundPreset });
        if (auth?.currentUser) {
          FirebaseService.saveUserProfile(auth.currentUser.uid, { backgroundPreset }).catch(() => {});
        }
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
      setUserName: (userName) => {
        set({ userName });
        if (auth?.currentUser) {
          FirebaseService.saveUserProfile(auth.currentUser.uid, { userName }).catch(() => {});
        }
      },
      setUserPhotoUrl: (userPhotoUrl) => {
        set({ userPhotoUrl });
        if (auth?.currentUser) {
          FirebaseService.saveUserProfile(auth.currentUser.uid, { userPhotoUrl }).catch(() => {});
        }
      },
      setDailyReminderEnabled: (dailyReminderEnabled) => {
        set({ dailyReminderEnabled });
        if (auth?.currentUser) {
          FirebaseService.saveUserProfile(auth.currentUser.uid, { dailyReminderEnabled }).catch(() => {});
        }
      },
      fetchAndSyncUserProfile: async (userId: string) => {
        if (!userId || userId === 'mock-local-user') return;
        try {
          const profile = await FirebaseService.fetchUserProfile(userId);
          if (profile) {
            if (profile.userName) set({ userName: profile.userName });
            if (profile.userPhotoUrl) set({ userPhotoUrl: profile.userPhotoUrl });
            if (profile.currency) set({ currency: profile.currency });
            if (profile.theme) set({ theme: profile.theme as 'dark' | 'light' });
            if (profile.backgroundPreset) set({ backgroundPreset: profile.backgroundPreset as BackgroundPreset });
            if (profile.dailyReminderEnabled !== undefined) set({ dailyReminderEnabled: profile.dailyReminderEnabled });
          } else if (auth.currentUser) {
            const initialName = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User';
            const initialPhoto = auth.currentUser.photoURL || auth.currentUser.providerData?.[0]?.photoURL || null;
            set({ userName: initialName, userPhotoUrl: initialPhoto });
            FirebaseService.saveUserProfile(userId, { userName: initialName, userPhotoUrl: initialPhoto }).catch(() => {});
          }
        } catch (err) {
          console.warn('[Store] Sync user profile warning:', err);
        }
      },
    }),
    {
      name: 'hishabai-ui',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        currency: state.currency, 
        isFirstLaunch: state.isFirstLaunch,
        theme: state.theme,
        backgroundPreset: state.backgroundPreset,
        userName: state.userName,
        userPhotoUrl: state.userPhotoUrl,
        dailyReminderEnabled: state.dailyReminderEnabled,
      }),
    }
  )
);

// ─── Preview Store (AI results awaiting confirmation) ─────────────────────────

import { PreviewTransaction } from '../types';

interface PreviewState {
  previewTransactions: PreviewTransaction[];
  source: 'voice' | 'receipt' | null;
  rawTranscript: string | null;
  processingNotes: string | null;

  setPreview: (
    transactions: PreviewTransaction[],
    source: 'voice' | 'receipt',
    rawTranscript?: string,
    processingNotes?: string
  ) => void;
  updatePreviewTransaction: (tempId: string, updates: Partial<PreviewTransaction>) => void;
  updatePreviewTransactionByIndex: (index: number, updates: Partial<PreviewTransaction>) => void;
  removePreviewTransaction: (tempId: string) => void;
  removePreviewTransactionByIndex: (index: number) => void;
  clearPreview: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  previewTransactions: [],
  source: null,
  rawTranscript: null,
  processingNotes: null,

  setPreview: (transactions, source, rawTranscript, processingNotes) =>
    set({
      previewTransactions: (transactions || []).map((t, idx) => ({
        ...t,
        tempId: t.tempId || `preview_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 9)}`,
        transactionDate: t.transactionDate || getTodayString(),
      })),
      source: source || null,
      rawTranscript: rawTranscript ?? null,
      processingNotes: processingNotes ?? null,
    }),

  updatePreviewTransaction: (tempId, updates) =>
    set((state) => ({
      previewTransactions: state.previewTransactions.map((t) =>
        t.tempId === tempId ? { ...t, ...updates } : t
      ),
    })),

  updatePreviewTransactionByIndex: (index, updates) =>
    set((state) => ({
      previewTransactions: state.previewTransactions.map((t, i) =>
        i === index ? { ...t, ...updates } : t
      ),
    })),

  removePreviewTransaction: (tempId) =>
    set((state) => ({
      previewTransactions: state.previewTransactions.filter((t) => t.tempId !== tempId),
    })),

  removePreviewTransactionByIndex: (index) =>
    set((state) => ({
      previewTransactions: state.previewTransactions.filter((_, i) => i !== index),
    })),

  clearPreview: () =>
    set({ previewTransactions: [], source: null, rawTranscript: null, processingNotes: null }),
}));
