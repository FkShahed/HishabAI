import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Modal, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Header } from '../../src/components/ui/Header';
import { MonthSelector } from '../../src/components/ui/MonthSelector';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useUIStore, useTransactionStore, useBudgetStore, useCategoryStore } from '../../src/store';
import { formatCurrency } from '../../src/utils/finance';
import { Button } from '../../src/components/ui/Button';
import { CategoryIcon } from '../../src/components/ui/CategoryIcon';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isDark = colors.bg.primary === '#080810';
  
  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const selectedYear = useUIStore((s) => s.selectedYear);
  const goToPrevMonth = useUIStore((s) => s.goToPrevMonth);
  const goToNextMonth = useUIStore((s) => s.goToNextMonth);
  const currency = useUIStore((s) => s.currency);

  const categories = useCategoryStore((s) => s.categories);
  const expenseCategories = categories.filter((c) => c.type === 'expense' && c.isActive);

  const budgets = useBudgetStore((s) => s.budgets); // subscribe to force re-render
  const getBudgetForMonth = useBudgetStore((s) => s.getBudgetForMonth);
  const getCategoryBudget = useBudgetStore((s) => s.getCategoryBudget);
  const getBudgetStatus = useBudgetStore((s) => s.getBudgetStatus);
  const setBudget = useBudgetStore((s) => s.setBudget);
  const deleteBudget = useBudgetStore((s) => s.deleteBudget);
  const getMonthlySummary = useTransactionStore((s) => s.getMonthlySummary);

  const [isBudgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const [isCatBudgetModalVisible, setIsCatBudgetModalVisible] = useState(false);
  const [selectedCategoryForBudget, setSelectedCategoryForBudget] = useState<any>(null);
  const [currentEditingCatBudget, setCurrentEditingCatBudget] = useState<any>(null);
  const [catBudgetInput, setCatBudgetInput] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);

  const getTransactionsForMonth = useTransactionStore((s) => s.getTransactionsForMonth);
  const transactionsState = useTransactionStore((s) => s.transactions); // force re-render

  const summary = getMonthlySummary(selectedMonth, selectedYear);
  const transactions = getTransactionsForMonth(selectedMonth, selectedYear);
  
  // Find a generic monthly budget
  const monthlyBudget = getBudgetForMonth(selectedMonth, selectedYear);
  const budgetStatus = getBudgetStatus(selectedMonth, selectedYear);

  const categorySpendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type === 'expense' && tx.categoryId) {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
      }
    });
    return map;
  }, [transactions]);

  const sortedExpenseCategories = useMemo(() => {
    return [...expenseCategories].sort((a, b) => {
      const aSpent = categorySpendingMap[a.id] || 0;
      const bSpent = categorySpendingMap[b.id] || 0;
      const aBudget = getCategoryBudget(selectedMonth, selectedYear, a.id);
      const bBudget = getCategoryBudget(selectedMonth, selectedYear, b.id);

      const aScore = (aBudget ? 1000000 : 0) + aSpent;
      const bScore = (bBudget ? 1000000 : 0) + bSpent;

      if (bScore !== aScore) return bScore - aScore;
      return a.sortOrder - b.sortOrder;
    });
  }, [expenseCategories, categorySpendingMap, budgets, selectedMonth, selectedYear]);

  const visibleCategories = showAllCategories ? sortedExpenseCategories : sortedExpenseCategories.slice(0, 10);

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

  const openCategoryBudgetModal = (category: any, existingBudget: any) => {
    setSelectedCategoryForBudget(category);
    setCurrentEditingCatBudget(existingBudget);
    setCatBudgetInput(existingBudget ? existingBudget.amount.toString() : '');
    setIsCatBudgetModalVisible(true);
  };

  const handleSaveCategoryBudget = () => {
    if (!selectedCategoryForBudget) return;
    const amount = parseFloat(catBudgetInput.replace(/[^0-9.]/g, ''));
    if (!isNaN(amount) && amount >= 0) {
      setBudget({
        id: currentEditingCatBudget?.id || `budget-${selectedYear}-${selectedMonth}-${selectedCategoryForBudget.id}`,
        userId: 'mock-local-user',
        categoryId: selectedCategoryForBudget.id,
        amount,
        month: selectedMonth,
        year: selectedYear,
        currency,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setIsCatBudgetModalVisible(false);
  };

  const handleDeleteCategoryBudget = () => {
    if (currentEditingCatBudget) {
      deleteBudget(currentEditingCatBudget.id);
    }
    setIsCatBudgetModalVisible(false);
  };

  return (
    <GlassBackground style={styles.container}>
      <Header title="Reports & Budget" showBack={false} />
      
      <MonthSelector 
        month={selectedMonth}
        year={selectedYear}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Monthly Budget Card */}
        <View style={[styles.card, { backgroundColor: colors.bg.glass, borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
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
          {/* Total Income Card */}
          <View style={[
            styles.statCard, 
            { 
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', 
              borderColor: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.22)',
              borderWidth: 1,
            },
            Platform.OS === 'web' && ({ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any)
          ]}>
            <View style={styles.statHeaderRow}>
              <Text variant="xs" color={colors.text.secondary} weight="medium">
                Total Income
              </Text>
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.38)' }]}>
                <Ionicons name="arrow-down" size={14} color={colors.semantic.income} />
              </View>
            </View>
            <Text variant="lg" weight="medium" color={colors.semantic.income} style={{ marginTop: Spacing.xs }}>
              {formatCurrency(summary.totalIncome, currency)}
            </Text>
          </View>

          {/* Total Expense Card */}
          <View style={[
            styles.statCard, 
            { 
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)', 
              borderColor: isDark ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.22)',
              borderWidth: 1,
            },
            Platform.OS === 'web' && ({ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any)
          ]}>
            <View style={styles.statHeaderRow}>
              <Text variant="xs" color={colors.text.secondary} weight="medium">
                Total Expense
              </Text>
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderColor: 'rgba(239, 68, 68, 0.38)' }]}>
                <Ionicons name="arrow-up" size={14} color={colors.semantic.expense} />
              </View>
            </View>
            <Text variant="lg" weight="medium" color={colors.semantic.expense} style={{ marginTop: Spacing.xs }}>
              {formatCurrency(summary.totalExpense, currency)}
            </Text>
          </View>
        </View>

        {/* Individual Category Budgets Breakdown Card */}
        <View style={[styles.card, { backgroundColor: colors.bg.glass, borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', marginTop: Spacing.xs }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text variant="md" weight="bold">Category Budgets</Text>
              <Text variant="xs" color={colors.text.secondary}>Set limits for individual categories</Text>
            </View>
          </View>

          {visibleCategories.map((category, index) => {
            const catSpent = categorySpendingMap[category.id] || 0;
            const catBudget = getCategoryBudget(selectedMonth, selectedYear, category.id);
            const budgetAmt = catBudget?.amount || 0;
            const percentage = budgetAmt > 0 ? (catSpent / budgetAmt) * 100 : 0;
            const remaining = budgetAmt - catSpent;
            const isExceeded = budgetAmt > 0 && catSpent > budgetAmt;

            const catProgressColor = percentage >= 100
              ? colors.semantic.danger
              : percentage >= 80
              ? colors.semantic.warning
              : colors.semantic.safe;

            return (
              <View 
                key={category.id} 
                style={[
                  styles.categoryBudgetItem, 
                  { 
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    borderBottomWidth: index === visibleCategories.length - 1 ? 0 : 1,
                  }
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Category Icon vertically centered */}
                  <View style={{ marginRight: 10 }}>
                    <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                  </View>

                  {/* Category Content Column */}
                  <View style={{ flex: 1 }}>
                    {/* Title & Action Button Row */}
                    <View style={styles.catHeaderRow}>
                      <Text variant="sm" weight="semibold" style={{ flex: 1 }}>
                        {category.name}
                      </Text>
                      
                      <TouchableOpacity
                        onPress={() => openCategoryBudgetModal(category, catBudget)}
                        style={[styles.catActionBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={catBudget ? "pencil-sharp" : "add-circle-outline"} size={13} color={colors.accent.primary} />
                        <Text variant="xs" weight="bold" color={colors.accent.primary} style={{ marginLeft: 4 }}>
                          {catBudget ? "Edit Limit" : "Set Limit"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Amount Row */}
                    <View style={styles.catAmountRow}>
                      <Text variant="xs" color={colors.text.secondary}>
                        Spent: <Text variant="xs" weight="bold" color={colors.text.primary}>{formatCurrency(catSpent, currency)}</Text>
                      </Text>
                      {catBudget ? (
                        <Text variant="xs" color={colors.text.tertiary}>
                          Limit: <Text variant="xs" weight="bold" color={colors.text.primary}>{formatCurrency(budgetAmt, currency)}</Text>
                        </Text>
                      ) : (
                        <Text variant="xs" color={colors.text.tertiary}>
                          No limit set
                        </Text>
                      )}
                    </View>

                    {/* Progress Bar & Status if budget set */}
                    {catBudget ? (
                      <View style={{ marginTop: 6 }}>
                        <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', height: 6 }]}>
                          <View 
                            style={[
                              styles.progressBarFill, 
                              { 
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: catProgressColor
                              }
                            ]} 
                          />
                        </View>
                        <View style={[styles.budgetRow, { marginTop: 4 }]}>
                          <Text variant="xs" color={colors.text.tertiary} style={{ fontSize: 11 }}>
                            {percentage.toFixed(0)}% used
                          </Text>
                          <Text variant="xs" color={isExceeded ? colors.semantic.danger : colors.text.tertiary} weight="semibold" style={{ fontSize: 11 }}>
                            {isExceeded ? `Over by ${formatCurrency(Math.abs(remaining), currency)}` : `${formatCurrency(remaining, currency)} left`}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}

          {sortedExpenseCategories.length > 10 ? (
            <TouchableOpacity
              onPress={() => setShowAllCategories(!showAllCategories)}
              style={styles.showMoreBtn}
              activeOpacity={0.7}
            >
              <Text variant="xs" weight="bold" color={colors.accent.primary}>
                {showAllCategories ? 'Show Less' : `Show More (${sortedExpenseCategories.length - 10} More Categories)`}
              </Text>
              <Ionicons
                name={showAllCategories ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.accent.primary}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        
        {/* Spacer for bottom tab */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Set Overall Budget Modal */}
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

      {/* Set Category Budget Modal */}
      <Modal visible={isCatBudgetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle, borderWidth: 1 }]}>
            {selectedCategoryForBudget ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                <CategoryIcon icon={selectedCategoryForBudget.icon} color={selectedCategoryForBudget.color} size="md" />
                <View style={{ marginLeft: Spacing.sm }}>
                  <Text variant="md" weight="bold">Set {selectedCategoryForBudget.name} Limit</Text>
                  <Text variant="xs" color={colors.text.secondary}>Category budget for this month</Text>
                </View>
              </View>
            ) : null}

            <TextInput
              style={[styles.budgetInput, { borderColor: colors.border.medium, color: colors.text.primary, backgroundColor: colors.bg.card }]}
              keyboardType="numeric"
              value={catBudgetInput}
              onChangeText={setCatBudgetInput}
              placeholder="Enter limit amount"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
            />

            <View style={styles.modalActions}>
              {currentEditingCatBudget ? (
                <Button 
                  label="Remove" 
                  variant="danger" 
                  onPress={handleDeleteCategoryBudget} 
                  style={{ marginRight: Spacing.sm }} 
                />
              ) : null}
              <Button label="Cancel" variant="secondary" onPress={() => setIsCatBudgetModalVisible(false)} style={{ flex: 1, marginRight: Spacing.sm }} />
              <Button label="Save Limit" variant="primary" onPress={handleSaveCategoryBudget} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </GlassBackground>
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
  categoryBudgetItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  catHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  catAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: 'transparent',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
