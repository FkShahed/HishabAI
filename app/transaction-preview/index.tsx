import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { Button } from '../../src/components/ui/Button';
import { Colors, Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { usePreviewStore, useTransactionStore, useCategoryStore } from '../../src/store';
import { PreviewTransaction } from '../../src/types';
import { formatCurrency, formatSignedAmount, getTodayString } from '../../src/utils/finance';
import { useUIStore } from '../../src/store';

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { previewTransactions, source, clearPreview, updatePreviewTransaction } = usePreviewStore();
  const addTransactions = useTransactionStore((s) => s.addTransactions);
  const getCategoriesForType = useCategoryStore((s) => s.getCategoriesForType);
  const currency = useUIStore((s) => s.currency);

  const [editingTransaction, setEditingTransaction] = React.useState<PreviewTransaction | null>(null);
  const [editForm, setEditForm] = React.useState({ amount: '', comment: '', categoryId: '', transactionDate: '' });

  const hasUncertainItems = previewTransactions.some(t => t.uncertain);

  const openEditModal = (item: PreviewTransaction) => {
    setEditingTransaction(item);
    setEditForm({
      amount: item.amount.toString(),
      comment: item.comment,
      categoryId: item.categoryId,
      transactionDate: item.transactionDate,
    });
  };

  const saveEdit = () => {
    if (!editingTransaction) return;
    
    // Find selected category to update name, icon, color
    const allCategories = [...getCategoriesForType('expense'), ...getCategoriesForType('income')];
    const selectedCat = allCategories.find(c => c.id === editForm.categoryId);

    updatePreviewTransaction(editingTransaction.tempId, {
      amount: parseFloat(editForm.amount) || 0,
      comment: editForm.comment,
      transactionDate: editForm.transactionDate,
      categoryId: editForm.categoryId,
      ...(selectedCat ? {
        categoryNameSnapshot: selectedCat.name,
        categoryIcon: selectedCat.icon,
        categoryColor: selectedCat.color,
      } : {}),
      uncertain: false,
    });

    setEditingTransaction(null);
  };

  const handleSave = () => {
    // Generate full transactions from preview
    const newTransactions = previewTransactions.map(t => {
      const allCategories = [...getCategoriesForType('expense'), ...getCategoriesForType('income')];
      const cat = allCategories.find(c => c.id === t.categoryId);

      return {
        id: Math.random().toString(36).substr(2, 9),
        userId: 'mock-user',
        amount: t.amount,
        type: t.type,
        categoryId: t.categoryId,
        categoryNameSnapshot: t.categoryNameSnapshot || cat?.name || t.categoryName || 'Unknown',
        categoryIcon: t.categoryIcon || cat?.icon || '❓',
        categoryColor: t.categoryColor || cat?.color || colors.text.secondary,
        transactionDate: t.transactionDate,
        dateSource: t.dateSource,
        comment: t.comment,
        source: t.source,
        aiGenerated: true,
        aiConfidence: t.confidence,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: currency,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    addTransactions(newTransactions);
    clearPreview();
    router.replace('/(tabs)');
  };

  const handleDiscard = () => {
    clearPreview();
    router.back();
  };

  const items: PreviewTransaction[] = [...previewTransactions].sort((a, b) => a.categoryId.localeCompare(b.categoryId));

  const totalExpense = items.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = items.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Header 
        title="Review Transactions" 
        showBack={false}
        rightElement={
          <TouchableOpacity onPress={handleDiscard} style={{ padding: Spacing.xs }}>
            <Text color={colors.text.secondary} weight="semibold">Cancel</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.headerInfo}>
          <View style={[styles.sourceBadge, { backgroundColor: colors.accent.primaryDim }]}>
            <Ionicons name={source === 'receipt' ? 'receipt' : 'mic'} size={16} color={colors.accent.primary} />
            <Text variant="sm" weight="bold" color={colors.accent.primary} style={{ marginLeft: 6 }}>
              {source === 'receipt' ? 'Scanned from Receipt' : 'Voice Assistant'}
            </Text>
          </View>
          <Text variant="md" color={colors.text.secondary} style={{ marginTop: Spacing.sm }}>
            AI found {items.length} transaction{items.length !== 1 ? 's' : ''}. Please review before saving.
          </Text>
        </View>

        {(totalExpense > 0 || totalIncome > 0) && (
          <View style={[styles.summaryCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            {totalExpense > 0 && (
              <View style={styles.summaryTotals}>
                <Text variant="md" color={colors.text.secondary}>Total Expense: </Text>
                <Text variant="lg" weight="bold" color={colors.semantic.expense}>
                  {formatSignedAmount(totalExpense, 'expense', currency)}
                </Text>
              </View>
            )}
            {totalIncome > 0 && (
              <View style={styles.summaryTotals}>
                <Text variant="md" color={colors.text.secondary}>Total Income: </Text>
                <Text variant="lg" weight="bold" color={colors.semantic.income}>
                  {formatSignedAmount(totalIncome, 'income', currency)}
                </Text>
              </View>
            )}
          </View>
        )}

        {hasUncertainItems && (
          <View style={[styles.uncertainBanner, { backgroundColor: colors.semantic.warningDim, borderColor: colors.semantic.warning }]}>
            <Ionicons name="warning" size={20} color={colors.semantic.warning} />
            <Text variant="sm" color={colors.semantic.warning} style={{ marginLeft: 8, flex: 1 }}>
              Some items are marked as uncertain. Please verify them.
            </Text>
          </View>
        )}

        <View style={styles.list}>
          {previewTransactions.map((item, index) => {
            const allCategories = [...getCategoriesForType('expense'), ...getCategoriesForType('income')];
            const cat = allCategories.find(c => c.id === item.categoryId);
            const icon = item.categoryIcon || cat?.icon || '❓';
            const name = item.categoryNameSnapshot || cat?.name || 'Unknown';

            return (
              <TouchableOpacity 
                key={item.tempId || `preview-item-${index}`}
                style={[
                  styles.itemCard,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                  item.uncertain && { borderColor: colors.semantic.warning, backgroundColor: colors.semantic.warningDim }
                ]}
                activeOpacity={0.7}
                onPress={() => openEditModal(item)}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemCategory}>
                    <Text style={{ fontSize: 20 }}>{icon}</Text>
                    <Text variant="base" weight="semibold" style={{ marginLeft: 8 }}>
                      {name}
                    </Text>
                  </View>
                  <Text 
                    variant="lg" 
                    weight="bold" 
                    color={item.type === 'expense' ? colors.semantic.expense : colors.semantic.income}
                  >
                    {formatSignedAmount(item.amount, item.type, currency)}
                  </Text>
                </View>

                <View style={styles.itemDetails}>
                  <Text variant="sm" color={colors.text.primary} weight="medium">
                    {item.comment || 'No details'}
                  </Text>
                </View>
                
                <View style={[styles.itemFooter, { borderTopColor: colors.border.subtle }]}>
                  <Text variant="xs" color={colors.text.tertiary}>
                    Date: {item.transactionDate}
                  </Text>
                  {item.uncertain ? (
                    <View style={[styles.uncertainBadge, { backgroundColor: colors.semantic.warningDim }]}>
                      <Text variant="xs" weight="bold" color={colors.semantic.warning}>Needs Review</Text>
                    </View>
                  ) : (
                    <Ionicons name="checkmark-circle" size={16} color={colors.semantic.safe} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* Footer Confirm Action */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md), backgroundColor: colors.bg.primary, borderTopColor: colors.border.subtle }]}>
        <Button 
          label={`Confirm & Save All (${previewTransactions.length})`}
          variant="primary"
          onPress={handleSave}
          style={{ width: '100%' }}
        />
      </View>

      {/* Edit Modal */}
      <Modal visible={!!editingTransaction} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <Text variant="lg" weight="bold">Edit Extracted Item</Text>
              <TouchableOpacity onPress={() => setEditingTransaction(null)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text variant="sm" color={colors.text.secondary} style={styles.inputLabel}>Amount ({currency})</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, color: colors.text.primary }]}
                keyboardType="numeric"
                value={editForm.amount}
                onChangeText={val => setEditForm(p => ({ ...p, amount: val }))}
              />

              <Text variant="sm" color={colors.text.secondary} style={styles.inputLabel}>Note / Comment</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, color: colors.text.primary }]}
                value={editForm.comment}
                onChangeText={val => setEditForm(p => ({ ...p, comment: val }))}
              />

              <Text variant="sm" color={colors.text.secondary} style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, color: colors.text.primary }]}
                value={editForm.transactionDate}
                onChangeText={val => setEditForm(p => ({ ...p, transactionDate: val }))}
              />

              <Text variant="sm" color={colors.text.secondary} style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {editingTransaction && getCategoriesForType(editingTransaction.type).map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                      editForm.categoryId === cat.id && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary }
                    ]}
                    onPress={() => setEditForm(p => ({ ...p, categoryId: cat.id }))}
                  >
                    <Text>{cat.icon}</Text>
                    <Text variant="xs" style={{ marginLeft: 4 }} color={editForm.categoryId === cat.id ? '#FFFFFF' : colors.text.primary}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: colors.bg.modal, borderTopColor: colors.border.subtle }]}>
              <Button label="Save Changes" onPress={saveEdit} style={{ width: '100%' }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  headerInfo: {
    marginBottom: Spacing.md,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    marginBottom: Spacing.xs,
  },
  list: {
    gap: Spacing.sm,
  },
  uncertainBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  summaryTotals: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  itemCard: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDetails: {
    marginBottom: Spacing.md,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  uncertainBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  }
});
