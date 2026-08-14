import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { Button } from '../../src/components/ui/Button';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useTransactionStore, useUIStore, useCategoryStore } from '../../src/store';
import { formatCurrency, formatDateDisplay, getTodayString } from '../../src/utils/finance';
import { CategoryIcon } from '../../src/components/ui/CategoryIcon';
import { DatePickerModal } from '../../src/components/ui/DatePickerModal';

export default function TransactionDetailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currency = useUIStore((s) => s.currency);
  
  const transactions = useTransactionStore((s) => s.transactions);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const getCategoriesForType = useCategoryStore((s) => s.getCategoriesForType);
  
  const transaction = transactions.find((t) => t.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: transaction?.amount.toString() || '',
    comment: transaction?.comment || '',
    transactionDate: transaction?.transactionDate || getTodayString(),
    categoryId: transaction?.categoryId || '',
  });

  const openEdit = () => {
    if (!transaction) return;
    setEditForm({
      amount: transaction.amount.toString(),
      comment: transaction.comment || '',
      transactionDate: transaction.transactionDate,
      categoryId: transaction.categoryId,
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!transaction) return;
    const numAmount = parseFloat(editForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const categories = getCategoriesForType(transaction.type);
    const cat = categories.find(c => c.id === editForm.categoryId);

    updateTransaction(transaction.id, {
      amount: numAmount,
      comment: editForm.comment,
      transactionDate: editForm.transactionDate,
      categoryId: editForm.categoryId,
      categoryNameSnapshot: cat?.name || transaction.categoryNameSnapshot,
      categoryIcon: cat?.icon || transaction.categoryIcon,
      categoryColor: cat?.color || transaction.categoryColor,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (id) {
      deleteTransaction(id);
      router.back();
    }
  };

  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <Header title="Transaction Details" showBack onBack={() => router.back()} />
        <View style={styles.notFound}>
          <Text variant="lg" color={colors.text.secondary}>Transaction not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.bg.primary }]}>
      <Header 
        title="Transaction Details" 
        showBack 
        onBack={() => router.back()} 
        rightElement={
          <TouchableOpacity onPress={openEdit} style={{ padding: Spacing.xs }}>
            <Ionicons name="pencil" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Category Header */}
        <View style={[styles.heroCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <CategoryIcon 
            icon={transaction.categoryIcon} 
            color={transaction.categoryColor} 
            size="lg" 
          />
          <Text variant="xl" weight="bold" style={{ marginTop: Spacing.md }}>
            {transaction.categoryNameSnapshot}
          </Text>
          <Text 
            variant="xxxl" 
            weight="extrabold" 
            color={transaction.type === 'expense' ? colors.semantic.expense : colors.semantic.income}
            style={{ marginTop: Spacing.xs }}
          >
            {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount, currency)}
          </Text>
        </View>

        {/* Details Grid */}
        <View style={[styles.detailsCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text variant="sm" color={colors.text.secondary}>Date</Text>
            <Text variant="sm" weight="semibold">{transaction.transactionDate}</Text>
          </View>
          
          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text variant="sm" color={colors.text.secondary}>Type</Text>
            <Text variant="sm" weight="semibold" style={{ textTransform: 'capitalize' }}>
              {transaction.type}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text variant="sm" color={colors.text.secondary}>Source</Text>
            <View style={[styles.sourceBadge, { backgroundColor: colors.accent.primaryDim }]}>
              <Text variant="xs" weight="bold" color={colors.accent.primary} style={{ textTransform: 'uppercase' }}>
                {transaction.source}
              </Text>
            </View>
          </View>

          {transaction.comment ? (
            <View style={styles.detailRow}>
              <Text variant="sm" color={colors.text.secondary}>Note</Text>
              <Text variant="sm" weight="medium" style={{ flex: 1, textAlign: 'right' }}>
                {transaction.comment}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <Button 
          label="Delete Transaction" 
          variant="danger" 
          leftIcon={<Ionicons name="trash-outline" size={20} color={colors.semantic.danger} />}
          onPress={handleDelete}
          style={{ marginTop: Spacing.xl }}
        />

      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={isEditing} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <Text variant="xl" weight="bold">Edit Transaction</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text variant="sm" color={colors.text.secondary} style={styles.inputLabel}>Amount ({currency})</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, color: colors.text.primary }]}
                keyboardType="numeric"
                value={editForm.amount}
                onChangeText={(val) => setEditForm(p => ({ ...p, amount: val }))}
              />

              <Text variant="sm" color={colors.text.secondary} style={styles.inputLabel}>Note</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, color: colors.text.primary }]}
                value={editForm.comment}
                onChangeText={(val) => setEditForm(p => ({ ...p, comment: val }))}
              />

              <Text variant="sm" color={colors.text.secondary} style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={[styles.textInput, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ fontSize: 16, color: colors.text.primary }}>
                  {formatDateDisplay(editForm.transactionDate)}
                </Text>
              </TouchableOpacity>
              <DatePickerModal
                visible={showDatePicker}
                selectedDate={editForm.transactionDate}
                onClose={() => setShowDatePicker(false)}
                onSelectDate={(date) => {
                  setEditForm(p => ({ ...p, transactionDate: date }));
                  setShowDatePicker(false);
                }}
              />

              <Text variant="sm" color={colors.text.secondary} style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {getCategoriesForType(transaction.type).map(cat => (
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
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  detailsCard: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
  },
  modalBody: {
    padding: Spacing.xl,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.xxxl,
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
    padding: Spacing.xl,
    borderTopWidth: 1,
  },
});
