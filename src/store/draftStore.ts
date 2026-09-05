import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DraftItem, DraftPayload, DraftSource, PreviewTransaction, Transaction } from '../types';
import { AIServiceClient, getFriendlyErrorMessage } from '../services/api';
import { useTransactionStore } from './index';
import { useCategoryStore } from './index';
import { useUIStore } from './index';
import { getTodayString } from '../utils/finance';

interface DraftState {
  drafts: DraftItem[];

  // Actions
  queueDraft: (title: string, source: DraftSource, payload: DraftPayload) => string;
  retryDraft: (draftId: string) => Promise<void>;
  deleteDraft: (draftId: string) => void;
  clearAllDrafts: () => void;
  updateDraftItem: (draftId: string, tempId: string, updates: Partial<PreviewTransaction>) => void;
  removeDraftItem: (draftId: string, tempId: string) => void;
  approveDraft: (draftId: string) => boolean;
  approveAllReadyDrafts: () => number;
}

function createTempId(prefix = 'draft_tx'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Maps raw AI parsed transactions to PreviewTransaction objects
 * with safe defaults for category, colors, icons, and dates.
 */
function mapToPreviewTransactions(rawTransactions: any[] = []): PreviewTransaction[] {
  const categoryStore = useCategoryStore.getState();
  const allCategories = [
    ...categoryStore.getCategoriesForType('expense'),
    ...categoryStore.getCategoriesForType('income'),
  ];

  return rawTransactions.map((t, idx) => {
    const matchedCategory = allCategories.find((c) => c.id === t.categoryId);
    return {
      ...t,
      tempId: t.tempId || createTempId(`ptx_${idx}`),
      transactionDate: t.transactionDate || getTodayString(),
      categoryNameSnapshot: matchedCategory?.name || t.categoryNameSnapshot || t.categoryName || 'General',
      categoryIcon: matchedCategory?.icon || t.categoryIcon || '💰',
      categoryColor: matchedCategory?.color || t.categoryColor || '#7C3AED',
    };
  });
}

/**
 * Converts PreviewTransactions to full Transaction objects ready to be saved.
 */
function convertToRealTransactions(previewItems: PreviewTransaction[]): Transaction[] {
  const currency = useUIStore.getState().currency || 'BDT';
  const categoryStore = useCategoryStore.getState();
  const allCategories = [
    ...categoryStore.getCategoriesForType('expense'),
    ...categoryStore.getCategoriesForType('income'),
  ];

  return previewItems.map((t) => {
    const cat = allCategories.find((c) => c.id === t.categoryId);
    return {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: 'user',
      amount: t.amount,
      type: t.type,
      categoryId: t.categoryId,
      categoryNameSnapshot: t.categoryNameSnapshot || cat?.name || 'General',
      categoryIcon: t.categoryIcon || cat?.icon || '💰',
      categoryColor: t.categoryColor || cat?.color || '#7C3AED',
      transactionDate: t.transactionDate || getTodayString(),
      dateSource: t.dateSource || 'inferred_today',
      comment: t.comment || '',
      source: (t.source as any) || 'manual',
      aiGenerated: true,
      aiConfidence: t.confidence ?? 0.9,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka',
      currency: currency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Core async executor for processing a draft in the background.
 */
async function executeBackgroundProcessing(draftId: string, payload: DraftPayload) {
  const store = useDraftStore.getState();
  console.log(`[DraftStore] Starting background AI processing for draft: ${draftId} (${payload.type})`);

  try {
    let result: any = null;

    if (payload.type === 'voice') {
      result = await AIServiceClient.parseVoice(payload.input, payload.categories, payload.sttModel);
    } else if (payload.type === 'receipt') {
      result = await AIServiceClient.parseReceipt(payload.input, payload.categories);
    } else if (payload.type === 'text') {
      result = await AIServiceClient.parseText(payload.input, payload.categories);
    }

    if (result && result.success && Array.isArray(result.transactions) && result.transactions.length > 0) {
      const mapped = mapToPreviewTransactions(result.transactions);
      console.log(`[DraftStore] Background AI completed successfully for ${draftId}. Extracted ${mapped.length} items.`);

      useDraftStore.setState((state) => ({
        drafts: state.drafts.map((d) =>
          d.id === draftId
            ? {
                ...d,
                status: 'ready',
                completedAt: new Date().toISOString(),
                previewTransactions: mapped,
                rawInput: result.rawTranscript || payload.rawText || d.rawInput,
                processingNotes: result.processingNotes,
                error: undefined,
              }
            : d
        ),
      }));
    } else {
      const fallbackMsg =
        result?.processingNotes ||
        "AI could not detect any transaction details. Please check your input and try again.";
      console.warn(`[DraftStore] Background AI completed with no transactions for ${draftId}:`, fallbackMsg);

      useDraftStore.setState((state) => ({
        drafts: state.drafts.map((d) =>
          d.id === draftId
            ? {
                ...d,
                status: 'failed',
                completedAt: new Date().toISOString(),
                error: fallbackMsg,
              }
            : d
        ),
      }));
    }
  } catch (error: any) {
    const errorMsg = getFriendlyErrorMessage(error);
    console.error(`[DraftStore] Background AI failed for ${draftId}:`, errorMsg);

    useDraftStore.setState((state) => ({
      drafts: state.drafts.map((d) =>
        d.id === draftId
          ? {
              ...d,
              status: 'failed',
              completedAt: new Date().toISOString(),
              error: errorMsg,
            }
          : d
      ),
    }));
  }
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: [],

      queueDraft: (title, source, payload) => {
        const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newDraft: DraftItem = {
          id: draftId,
          title: title || `${source.toUpperCase()} Draft`,
          source,
          status: 'processing',
          createdAt: new Date().toISOString(),
          rawInput: payload.rawText || (source === 'voice' ? 'Voice Recording' : source === 'receipt' ? 'Receipt Scan' : ''),
          previewTransactions: [],
          retryPayload: payload,
        };

        // Add to state immediately
        set((state) => ({
          drafts: [newDraft, ...state.drafts],
        }));

        // Execute background task asynchronously without blocking caller
        setTimeout(() => {
          executeBackgroundProcessing(draftId, payload);
        }, 50);

        return draftId;
      },

      retryDraft: async (draftId) => {
        const draft = get().drafts.find((d) => d.id === draftId);
        if (!draft || !draft.retryPayload) return;

        // Reset status to processing
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === draftId
              ? { ...d, status: 'processing', error: undefined, completedAt: undefined }
              : d
          ),
        }));

        await executeBackgroundProcessing(draftId, draft.retryPayload);
      },

      deleteDraft: (draftId) => {
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== draftId),
        }));
      },

      clearAllDrafts: () => {
        set({ drafts: [] });
      },

      updateDraftItem: (draftId, tempId, updates) => {
        set((state) => ({
          drafts: state.drafts.map((d) => {
            if (d.id !== draftId) return d;
            return {
              ...d,
              previewTransactions: d.previewTransactions.map((tx) =>
                tx.tempId === tempId ? { ...tx, ...updates, uncertain: false } : tx
              ),
            };
          }),
        }));
      },

      removeDraftItem: (draftId, tempId) => {
        set((state) => ({
          drafts: state.drafts
            .map((d) => {
              if (d.id !== draftId) return d;
              return {
                ...d,
                previewTransactions: d.previewTransactions.filter((tx) => tx.tempId !== tempId),
              };
            })
            .filter((d) => d.previewTransactions.length > 0 || d.status !== 'ready'),
        }));
      },

      approveDraft: (draftId) => {
        const draft = get().drafts.find((d) => d.id === draftId);
        if (!draft || draft.status !== 'ready' || draft.previewTransactions.length === 0) {
          return false;
        }

        const realTransactions = convertToRealTransactions(draft.previewTransactions);
        useTransactionStore.getState().addTransactions(realTransactions);

        // Remove draft after approving
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== draftId),
        }));

        return true;
      },

      approveAllReadyDrafts: () => {
        const readyDrafts = get().drafts.filter(
          (d) => d.status === 'ready' && d.previewTransactions.length > 0
        );
        if (readyDrafts.length === 0) return 0;

        const allItems: PreviewTransaction[] = [];
        const approvedIds: string[] = [];

        readyDrafts.forEach((d) => {
          allItems.push(...d.previewTransactions);
          approvedIds.push(d.id);
        });

        const realTransactions = convertToRealTransactions(allItems);
        useTransactionStore.getState().addTransactions(realTransactions);

        // Remove approved drafts
        set((state) => ({
          drafts: state.drafts.filter((d) => !approvedIds.includes(d.id)),
        }));

        return realTransactions.length;
      },
    }),
    {
      name: 'hishabai-drafts',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // If app was killed while a draft was processing, mark it as failed with retry option
        if (state && Array.isArray(state.drafts)) {
          state.drafts = state.drafts.map((d) => {
            if (d.status === 'processing') {
              return {
                ...d,
                status: 'failed',
                error: 'Processing was paused when the app was closed. Tap Retry to process now.',
              };
            }
            return d;
          });
        }
      },
    }
  )
);
