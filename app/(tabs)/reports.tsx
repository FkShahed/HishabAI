import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { MonthSelector } from '../../src/components/ui/MonthSelector';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useUIStore, useTransactionStore, useBudgetStore } from '../../src/store';
import { formatCurrency } from '../../src/utils/finance';
import { Button } from '../../src/components/ui/Button';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  
  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const selectedYear = useUIStore((s) => s.selectedYear);
  const goToPrevMonth = useUIStore((s) => s.goToPrevMonth);
  const goToNextMonth = useUIStore((s) => s.goToNextMonth);
  const currency = useUIStore((s) => s.currency);
  const budgets = useBudgetStore((s) => s.budgets); // subscribe to force re-render
  const getBudgetForMonth = useBudgetStore((s) => s.getBudgetForMonth);
  const getBudgetStatus = useBudgetStore((s) => s.getBudgetStatus);
  const setBudget = useBudgetStore((s) => s.setBudget);
  const getMonthlySummary = useTransactionStore((s) => s.getMonthlySummary);

  const [isBudgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const getTransactionsForMonth = useTransactionStore((s) => s.getTransactionsForMonth);
  const transactionsState = useTransactionStore((s) => s.transactions); // force re-render

  const summary = getMonthlySummary(selectedMonth, selectedYear);
  const transactions = getTransactionsForMonth(selectedMonth, selectedYear);
  
  // Find a generic monthly budget
  const monthlyBudget = getBudgetForMonth(selectedMonth, selectedYear);
  const budgetStatus = getBudgetStatus(selectedMonth, selectedYear);

  // Determine progress bar color based on state
  const progressBarColor = 
    budgetStatus.state === 'safe' ? colors.semantic.safe :
    budgetStatus.state === 'warning' ? colors.semantic.warning :
    colors.semantic.danger;

  const handleSaveBudget = () => {
    const amount = parseFloat(budgetInput.replace(/[^0-9.]/g, ''));
    if (!isNaN(amount) && amount >= 0) {
      setBudget({ 
        id: `budget-${selectedYear}-${selectedMonth}`,
        userId: 'mock-local-user',
        amount, 
        month: selectedMonth, 
        year: selectedYear,
        currency,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    setBudgetModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Header title="Reports & Budget" showBack={false} />
      
      <MonthSelector 
        month={selectedMonth}
        year={selectedYear}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
      />

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Monthly Budget Card */}
        <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text variant="md" weight="bold">Monthly Budget</Text>
              <Text variant="xs" color={colors.text.secondary}>Overall Spending Limit</Text>
            </View>
            <Button 
              label={monthlyBudget ? "Edit" : "Set Budget"} 
              variant="secondary" 
              size="sm"
              onPress={() => {
                setBudgetInput(monthlyBudget ? monthlyBudget.amount.toString() : '');
                setBudgetModalVisible(true);
              }}
            />
          </View>
          
          {monthlyBudget ? (
            <View style={styles.budgetBody}>
              <View style={styles.budgetRow}>
                <Text variant="sm" color={colors.text.secondary}>Spent</Text>
                <Text variant="md" weight="bold" color={colors.text.primary}>
                  {formatCurrency(budgetStatus.spent, currency)}
                </Text>
              </View>
              
              <View style={[styles.progressBarBg, { backgroundColor: colors.bg.secondary }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${Math.min(budgetStatus.percentage, 100)}%`,
                      backgroundColor: progressBarColor
                    }
                  ]} 
                />
              </View>
              
              <View style={styles.budgetRow}>
                <Text variant="xs" color={colors.text.tertiary}>
                  {budgetStatus.percentage.toFixed(0)}% of {formatCurrency(monthlyBudget.amount, currency)}
                </Text>
                <Text variant="xs" color={budgetStatus.state === 'exceeded' ? colors.semantic.danger : colors.text.tertiary} weight="semibold">
                  {budgetStatus.state === 'exceeded' ? 'Over by ' : 'Remaining '}
                  {formatCurrency(Math.abs(budgetStatus.remaining), currency)}
                </Text>
              </View>

              {/* Daily Safe to Spend */}
              <View style={[styles.dailySafeBox, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.accent.primary} />
                <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                  <Text variant="sm" weight="semibold">Daily Safe-to-Spend</Text>
                  {budgetStatus.state === 'exceeded' ? (
                    <Text variant="xs" color={colors.semantic.danger}>Budget exceeded for this month.</Text>
                  ) : (
                    <Text variant="xs" color={colors.text.secondary}>
                      You can safely spend <Text weight="bold">{formatCurrency(budgetStatus.dailyBudget, currency)}</Text> / day.
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={colors.border.strong} />
              <Text variant="md" color={colors.text.secondary} style={{ marginTop: Spacing.md }}>
                No budget set for this month.
              </Text>
            </View>
          )}
        </View>

        {/* Transaction Summary Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <Text variant="sm" color={colors.text.secondary}>Total Income</Text>
            <Text variant="lg" weight="bold" color={colors.semantic.income}>
              {formatCurrency(summary.totalIncome, currency)}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <Text variant="sm" color={colors.text.secondary}>Total Expense</Text>
            <Text variant="lg" weight="bold" color={colors.semantic.expense}>
              {formatCurrency(summary.totalExpense, currency)}
            </Text>
          </View>
        </View>
        
        {/* Spacer for bottom tab */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Set Budget Modal */}
      <Modal visible={isBudgetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle, borderWidth: 1 }]}>
            <Text variant="lg" weight="bold" style={{ marginBottom: Spacing.md }}>Set Monthly Budget</Text>
            <TextInput
              style={[styles.budgetInput, { borderColor: colors.border.medium, color: colors.text.primary, backgroundColor: colors.bg.card }]}
              keyboardType="numeric"
              value={budgetInput}
              onChangeText={setBudgetInput}
              placeholder="Enter amount"
              placeholderTextColor={colors.text.tertiary}
            />
            <View style={styles.modalActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setBudgetModalVisible(false)} style={{ flex: 1, marginRight: Spacing.sm }} />
              <Button label="Save" variant="primary" onPress={handleSaveBudget} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  card: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  budgetBody: {
    gap: Spacing.sm,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  dailySafeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statBox: {
    flex: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  budgetInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 18,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
  }
});
