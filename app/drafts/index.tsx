import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Header } from '../../src/components/ui/Header';
import { DatePickerModal } from '../../src/components/ui/DatePickerModal';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useDraftStore, useCategoryStore, useUIStore } from '../../src/store';
import { DraftItem, PreviewTransaction } from '../../src/types';
import { formatCurrency, getTodayString, formatDateDisplay } from '../../src/utils/finance';

export default function DraftsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isDark = colors.bg.primary === '#080810';

  const {
    drafts,
    deleteDraft,
    clearAllDrafts,
    approveDraft,
    approveAllReadyDrafts,
    updateDraftItem,
    removeDraftItem,
    retryDraft,
  } = useDraftStore();

  const getCategoriesForType = useCategoryStore((s) => s.getCategoriesForType);
  const currency = useUIStore((s) => s.currency);

  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Edit item modal state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<PreviewTransaction | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    comment: '',
    categoryId: '',
    transactionDate: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    description: '',
    actionLabel: 'Discard',
    onConfirm: () => {},
  });

  const readyDrafts = drafts.filter((d) => d.status === 'ready' && d.previewTransactions.length > 0);
  const totalReadyCount = readyDrafts.reduce((sum, d) => sum + d.previewTransactions.length, 0);

  const openEditModal = (draftId: string, item: PreviewTransaction) => {
    setEditingDraftId(draftId);
    setEditingItem(item);
    setEditForm({
      amount: item.amount.toString(),
      comment: item.comment || '',
      categoryId: item.categoryId || '',
      transactionDate: item.transactionDate || getTodayString(),
    });
  };

  const saveEdit = () => {
    if (!editingDraftId || !editingItem) return;
    const numericAmount = parseFloat(editForm.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    const categories = getCategoriesForType(editingItem.type);
    const selectedCategory = categories.find((c) => c.id === editForm.categoryId);

    updateDraftItem(editingDraftId, editingItem.tempId, {
      amount: numericAmount,
      comment: editForm.comment,
      categoryId: editForm.categoryId,
      categoryNameSnapshot: selectedCategory?.name || editingItem.categoryNameSnapshot,
      categoryIcon: selectedCategory?.icon || editingItem.categoryIcon,
      categoryColor: selectedCategory?.color || editingItem.categoryColor,
      transactionDate: editForm.transactionDate || getTodayString(),
    });

    setEditingDraftId(null);
    setEditingItem(null);
  };

  const handleRetry = async (draftId: string) => {
    setRetryingId(draftId);
    try {
      await retryDraft(draftId);
    } finally {
      setRetryingId(null);
    }
  };

  const confirmDiscardDraft = (draftId: string) => {
    setDeleteModal({
      visible: true,
      title: 'Discard Draft?',
      description: 'Are you sure you want to discard this pending draft? All transactions in it will be permanently deleted.',
      actionLabel: 'Discard',
      onConfirm: () => {
        deleteDraft(draftId);
        setDeleteModal((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const confirmClearAll = () => {
    setDeleteModal({
      visible: true,
      title: 'Clear All Drafts?',
      description: 'Are you sure you want to discard all saved drafts? This action cannot be undone.',
      actionLabel: 'Clear All',
      onConfirm: () => {
        clearAllDrafts();
        setDeleteModal((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const confirmRemoveItem = (draftId: string, tempId: string) => {
    setDeleteModal({
      visible: true,
      title: 'Remove Item?',
      description: 'Are you sure you want to delete this transaction item from the draft?',
      actionLabel: 'Delete',
      onConfirm: () => {
        removeDraftItem(draftId, tempId);
        if (editingItem?.tempId === tempId) {
          setEditingItem(null);
          setEditingDraftId(null);
        }
        setDeleteModal((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const handleApproveDraft = (draftId: string) => {
    approveDraft(draftId);
  };

  const handleApproveAll = () => {
    approveAllReadyDrafts();
  };

  return (
    <GlassBackground style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Header
        title="AI Drafts"
        showBack={true}
        onBack={() => router.back()}
        rightElement={
          drafts.length > 0 ? (
            <TouchableOpacity onPress={confirmClearAll} style={styles.clearAllBtn} activeOpacity={0.7}>
              <Text variant="xs" weight="bold" color={colors.semantic.danger}>
                Clear All
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Approve All Sticky Banner if multiple drafts ready */}
      {readyDrafts.length > 0 && (
        <View style={[styles.batchActionBar, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]}>
          <View style={{ flex: 1 }}>
            <Text variant="sm" weight="bold" color={colors.text.primary}>
              {totalReadyCount} item{totalReadyCount > 1 ? 's' : ''} ready to approve
            </Text>
            <Text variant="xs" color={colors.text.secondary}>
              Across {readyDrafts.length} draft{readyDrafts.length > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.approveAllBtn, { backgroundColor: colors.accent.primary }]}
            onPress={handleApproveAll}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text variant="xs" weight="bold" color="#FFFFFF">
              Approve All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {drafts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.bg.glass, borderColor: colors.border.subtle }]}>
            <Ionicons name="documents-outline" size={56} color={colors.accent.primary} />
          </View>
          <Text variant="lg" weight="bold" style={{ marginTop: Spacing.lg }}>
            No Saved Drafts
          </Text>
          <Text variant="sm" color={colors.text.secondary} align="center" style={styles.emptyText}>
            When you choose "In Background" during Voice, Receipt, or Text AI processing, your results are saved here for review.
          </Text>
          <TouchableOpacity
            style={[styles.emptyAddButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text variant="base" weight="bold" color="#FFFFFF">
              Back to Home
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {drafts.map((draft) => {
            const isProcessing = draft.status === 'processing' || retryingId === draft.id;
            const isFailed = draft.status === 'failed';
            const isReady = draft.status === 'ready';

            const sourceIcon =
              draft.source === 'voice' ? 'mic' : draft.source === 'receipt' ? 'receipt' : 'chatbox-ellipses';
            const sourceBadgeColor =
              draft.source === 'voice'
                ? colors.semantic.income
                : draft.source === 'receipt'
                ? colors.accent.secondary
                : '#EC4899';

            const isInvalid =
              draft.status === 'failed' ||
              Boolean(draft.error) ||
              (draft.status === 'ready' &&
                (!draft.previewTransactions ||
                  draft.previewTransactions.length === 0 ||
                  draft.previewTransactions.some((t) => t.uncertain || !t.amount || t.amount <= 0 || !t.categoryId)));

            const totalAmount = draft.previewTransactions?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0;

            return (
              <View
                key={draft.id}
                style={[
                  styles.draftCard,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: isInvalid
                      ? colors.semantic.warning
                      : isProcessing
                      ? colors.accent.primary
                      : colors.border.subtle,
                  },
                ]}
              >
                {/* Draft Card Top Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <View style={[styles.sourceIconBadge, { backgroundColor: colors.bg.glass, borderColor: isInvalid ? colors.semantic.warning : sourceBadgeColor }]}>
                      <Ionicons name={sourceIcon} size={16} color={isInvalid ? colors.semantic.warning : sourceBadgeColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text variant="base" weight="bold" numberOfLines={1}>
                        {draft.title}
                      </Text>
                      <Text variant="xs" color={colors.text.tertiary}>
                        {new Date(draft.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => confirmDiscardDraft(draft.id)}
                    style={styles.discardIconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                </View>

                {/* Status or Error Banner */}
                {isProcessing && (
                  <View style={[styles.statusBanner, { backgroundColor: colors.accent.primaryDim }]}>
                    <ActivityIndicator size="small" color={colors.accent.primary} style={{ marginRight: 8 }} />
                    <Text variant="xs" weight="medium" color={colors.accent.primary} style={{ flex: 1 }}>
                      AI is processing in background... You can leave and check back anytime.
                    </Text>
                  </View>
                )}

                {isFailed && (
                  <View style={[styles.statusBanner, { backgroundColor: colors.semantic.warningDim }]}>
                    <Ionicons name="alert-circle" size={16} color={colors.semantic.warning} style={{ marginRight: 8 }} />
                    <Text variant="xs" weight="medium" color={colors.semantic.warning} style={{ flex: 1 }}>
                      {draft.error || 'Failed to process AI input.'}
                    </Text>
                    {draft.retryPayload && (
                      <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.semantic.warning }]}
                        onPress={() => handleRetry(draft.id)}
                        disabled={isProcessing}
                      >
                        <Text variant="xs" weight="bold" color="#FFFFFF">
                          Retry
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {isReady && isInvalid && (
                  <View style={[styles.statusBanner, { backgroundColor: colors.semantic.warningDim }]}>
                    <Ionicons name="alert-circle" size={16} color={colors.semantic.warning} style={{ marginRight: 8 }} />
                    <Text variant="xs" weight="medium" color={colors.semantic.warning} style={{ flex: 1 }}>
                      {draft.previewTransactions.length === 0
                        ? 'No valid transactions detected. You can discard or retry.'
                        : 'Some items require your review before approval.'}
                    </Text>
                  </View>
                )}

                {/* Extracted Transactions List */}
                {isReady && draft.previewTransactions.length > 0 && (
                  <View style={styles.transactionsContainer}>
                    <View style={styles.transactionsSummaryRow}>
                      <Text variant="xs" color={colors.text.secondary} weight="medium">
                        {draft.previewTransactions.length} item{draft.previewTransactions.length > 1 ? 's' : ''} detected:
                      </Text>
                      <Text variant="xs" color={colors.text.primary} weight="bold">
                        Total: {formatCurrency(totalAmount, currency)}
                      </Text>
                    </View>

                    {draft.previewTransactions.map((item, idx) => {
                      const hasNote = Boolean(item.comment && item.comment.trim());
                      const primaryTitle = hasNote ? item.comment.trim() : (item.categoryNameSnapshot || 'General');
                      const secondaryCategory = hasNote ? (item.categoryNameSnapshot || 'General') : null;

                      return (
                        <View
                          key={item.tempId || idx}
                          style={[
                            styles.transactionItemRow,
                            {
                              backgroundColor: colors.bg.glass,
                              borderColor: colors.border.subtle,
                            },
                          ]}
                        >
                          <View style={[styles.categoryIconCircle, { backgroundColor: item.categoryColor || colors.accent.primary }]}>
                            <Text variant="xs">{item.categoryIcon || '💰'}</Text>
                          </View>

                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text variant="sm" weight="semibold" numberOfLines={1}>
                                {primaryTitle}
                              </Text>
                              {item.uncertain && (
                                <View style={[styles.uncertainBadge, { backgroundColor: colors.semantic.warningDim }]}>
                                  <Text variant="xs" color={colors.semantic.warning} style={{ fontSize: 10 }}>
                                    Review
                                  </Text>
                                </View>
                              )}
                            </View>
                            {secondaryCategory && (
                              <Text variant="xs" color={colors.text.secondary} numberOfLines={1} style={{ marginTop: 1 }}>
                                {secondaryCategory}
                              </Text>
                            )}
                            <Text variant="xs" color={colors.text.tertiary} style={{ fontSize: 10, marginTop: 2 }}>
                              {formatDateDisplay(item.transactionDate)}
                            </Text>
                          </View>

                          <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                            <Text
                              variant="sm"
                              weight="bold"
                              color={item.type === 'income' ? colors.semantic.income : colors.semantic.expense}
                            >
                              {item.type === 'income' ? '+' : '-'}
                              {formatCurrency(item.amount, currency)}
                            </Text>

                            <View style={{ flexDirection: 'row', marginTop: 4 }}>
                              <TouchableOpacity
                                onPress={() => openEditModal(draft.id, item)}
                                style={styles.itemActionIcon}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="pencil" size={15} color={colors.accent.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => confirmRemoveItem(draft.id, item.tempId)}
                                style={[styles.itemActionIcon, { marginLeft: 8 }]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="close-circle-outline" size={16} color={colors.semantic.danger} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Draft Card Bottom Action Footer */}
                {isReady && (
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={[styles.discardButton, { borderColor: colors.border.medium }]}
                      onPress={() => confirmDiscardDraft(draft.id)}
                    >
                      <Text variant="xs" weight="semibold" color={colors.text.secondary}>
                        Discard
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.approveDraftButton, { backgroundColor: colors.accent.primary }]}
                      onPress={() => handleApproveDraft(draft.id)}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text variant="xs" weight="bold" color="#FFFFFF">
                        Approve & Save ({draft.previewTransactions.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Edit Transaction Item Modal */}
      <Modal visible={!!editingItem} transparent animationType="fade" onRequestClose={() => setEditingItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle }]}>
            <View style={styles.modalHeader}>
              <Text variant="base" weight="bold">
                Edit Transaction
              </Text>
              <TouchableOpacity onPress={() => setEditingItem(null)} style={{ padding: Spacing.xs }}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {editingItem && (
              <>
                {/* Amount input */}
                <Text variant="xs" color={colors.text.secondary} style={styles.inputLabel}>
                  Amount ({currency}):
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.bg.elevated,
                      borderColor: colors.border.medium,
                      color: colors.text.primary,
                    },
                  ]}
                  keyboardType="decimal-pad"
                  value={editForm.amount}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, amount: val }))}
                />

                {/* Comment input */}
                <Text variant="xs" color={colors.text.secondary} style={styles.inputLabel}>
                  Description:
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.bg.elevated,
                      borderColor: colors.border.medium,
                      color: colors.text.primary,
                    },
                  ]}
                  value={editForm.comment}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, comment: val }))}
                />

                {/* Category selector */}
                <Text variant="xs" color={colors.text.secondary} style={styles.inputLabel}>
                  Category:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                  {getCategoriesForType(editingItem.type).map((cat) => {
                    const isSelected = cat.id === editForm.categoryId;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catPill,
                          {
                            backgroundColor: isSelected ? colors.accent.primary : colors.bg.elevated,
                            borderColor: isSelected ? colors.accent.primary : colors.border.subtle,
                          },
                        ]}
                        onPress={() => setEditForm((p) => ({ ...p, categoryId: cat.id }))}
                      >
                        <Text variant="xs" style={{ marginRight: 4 }}>
                          {cat.icon}
                        </Text>
                        <Text variant="xs" weight={isSelected ? 'bold' : 'medium'} color={isSelected ? '#FFFFFF' : colors.text.primary}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Date button */}
                <Text variant="xs" color={colors.text.secondary} style={styles.inputLabel}>
                  Date:
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateSelectBtn,
                    { backgroundColor: colors.bg.elevated, borderColor: colors.border.medium },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.text.primary} style={{ marginRight: 8 }} />
                  <Text variant="sm" color={colors.text.primary}>
                    {formatDateDisplay(editForm.transactionDate)}
                  </Text>
                </TouchableOpacity>

                {/* Modal action buttons */}
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity
                    style={[styles.modalDeleteBtn, { borderColor: colors.semantic.danger }]}
                    onPress={() => {
                      if (editingDraftId && editingItem) {
                        confirmRemoveItem(editingDraftId, editingItem.tempId);
                      }
                    }}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.semantic.danger} style={{ marginRight: 4 }} />
                    <Text variant="sm" weight="semibold" color={colors.semantic.danger}>
                      Delete
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flex: 1 }} />

                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: colors.border.medium }]}
                    onPress={() => setEditingItem(null)}
                  >
                    <Text variant="sm" weight="semibold" color={colors.text.secondary}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.accent.primary }]} onPress={saveEdit}>
                    <Text variant="sm" weight="bold" color="#FFFFFF">
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Confirmation Alert Modal for Discard / Delete */}
      <Modal
        visible={deleteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.customAlertOverlay}>
          <View
            style={[
              styles.customAlertContent,
              {
                backgroundColor: colors.bg.modal,
                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
              },
            ]}
          >
            <View
              style={[
                styles.customAlertIconWrap,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' },
              ]}
            >
              <Ionicons name="trash-outline" size={24} color={colors.semantic.danger} />
            </View>

            <Text variant="md" weight="bold" color={colors.text.primary} align="center">
              {deleteModal.title}
            </Text>

            <Text
              variant="xs"
              color={colors.text.secondary}
              align="center"
              style={{ marginTop: Spacing.xs, lineHeight: 18 }}
            >
              {deleteModal.description}
            </Text>

            <View style={styles.customAlertActions}>
              <TouchableOpacity
                style={[
                  styles.customAlertCancelBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: colors.border.subtle,
                  },
                ]}
                onPress={() => setDeleteModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.7}
              >
                <Text variant="sm" weight="semibold" color={colors.text.secondary}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.customAlertConfirmBtn, { backgroundColor: colors.semantic.danger }]}
                onPress={deleteModal.onConfirm}
                activeOpacity={0.8}
              >
                <Ionicons name="trash" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text variant="sm" weight="bold" color="#FFFFFF">
                  {deleteModal.actionLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={editForm.transactionDate}
        onSelectDate={(newDate) => {
          setEditForm((p) => ({ ...p, transactionDate: newDate }));
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  clearAllBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  batchActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  approveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  draftCard: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardIconBtn: {
    padding: 6,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    marginLeft: 6,
  },
  transactionsContainer: {
    marginTop: Spacing.xs,
  },
  transactionsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  transactionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: 6,
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncertainBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  itemActionIcon: {
    padding: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  discardButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  approveDraftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  emptyAddButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radii.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 16, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  inputLabel: {
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  textInput: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginRight: 6,
  },
  dateSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  modalActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  modalCancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  modalSaveBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
  },
  customAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  customAlertContent: {
    width: '100%',
    maxWidth: 330,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  customAlertIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  customAlertActions: {
    flexDirection: 'row',
    width: '100%',
    marginTop: Spacing.lg,
    gap: 10,
  },
  customAlertCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  customAlertConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 11,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
