import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Header } from '../../src/components/ui/Header';
import { CategoryIcon } from '../../src/components/ui/CategoryIcon';
import { TransactionItem } from '../../src/components/transactions/TransactionItem';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useTransactionStore, useUIStore } from '../../src/store';
import { formatCurrency, getCurrencySymbol } from '../../src/utils/finance';

export default function CategoryDetailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    id: string;
    type?: 'expense' | 'income';
    month?: string;
    year?: string;
    name?: string;
    icon?: string;
    color?: string;
  }>();

  const currentMonth = useUIStore((s) => s.selectedMonth);
  const currentYear = useUIStore((s) => s.selectedYear);
  const currency = useUIStore((s) => s.currency);

  const selectedMonth = params.month ? parseInt(params.month, 10) : currentMonth;
  const selectedYear = params.year ? parseInt(params.year, 10) : currentYear;
  const activeType = params.type || 'expense';

  const getTransactionsForMonth = useTransactionStore((s) => s.getTransactionsForMonth);
  const allMonthTxns = getTransactionsForMonth(selectedMonth, selectedYear);

  // Filter transactions for this category & type
  const categoryTxns = useMemo(() => {
    return allMonthTxns
      .filter((t) => (t.categoryId === params.id || t.categoryNameSnapshot.toLowerCase() === (params.name || '').toLowerCase()) && t.type === activeType)
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [allMonthTxns, params.id, params.name, activeType]);

  // Total spent/earned in category
  const totalCategoryAmount = useMemo(() => {
    return categoryTxns.reduce((sum, t) => sum + t.amount, 0);
  }, [categoryTxns]);

  // Overall type total to compute percentage
  const overallTypeTotal = useMemo(() => {
    return allMonthTxns
      .filter((t) => t.type === activeType)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [allMonthTxns, activeType]);

  const percentage = overallTypeTotal > 0 ? Math.round((totalCategoryAmount / overallTypeTotal) * 100) : 0;

  const categoryName = params.name || categoryTxns[0]?.categoryNameSnapshot || 'Category';
  const categoryIcon = params.icon || categoryTxns[0]?.categoryIcon || '📁';
  const categoryColor = params.color || categoryTxns[0]?.categoryColor || colors.accent.primary;
  const monthLabel = format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy');
  const activeThemeColor = activeType === 'expense' ? colors.semantic.expense : colors.semantic.income;

  return (
    <GlassBackground style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title={`${categoryName} Details`} 
        showBack={true} 
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/charts' as any);
        }} 
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        
        {/* Category Overview Card */}
        <View style={[styles.overviewCard, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder }]}>
          <View style={styles.headerRow}>
            <CategoryIcon icon={categoryIcon} color={categoryColor} size="lg" />
            <View style={styles.headerTitleBox}>
              <Text variant="lg" weight="bold">{categoryName}</Text>
              <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                {monthLabel} • {activeType === 'expense' ? 'Expense Category' : 'Income Category'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

          {/* Amount Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text variant="xs" color={colors.text.tertiary}>Total Spent</Text>
              <Text variant="xl" weight="bold" color={activeThemeColor} style={{ marginTop: 4 }}>
                {formatCurrency(totalCategoryAmount, currency)}
              </Text>
            </View>

            <View style={styles.statColRight}>
              <View style={[styles.badgePill, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
                <Text variant="xs" weight="bold" color={colors.accent.primary}>
                  {percentage}% of Total
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.sectionHeader}>
          <Text variant="base" weight="bold">Transactions ({categoryTxns.length})</Text>
        </View>

        {categoryTxns.length > 0 ? (
          <View style={[styles.listContainer, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder, borderWidth: 1, borderRadius: Radii.md, overflow: 'hidden' }]}>
            {categoryTxns.map((item, index) => (
              <TransactionItem 
                key={item.id}
                transaction={item} 
                isLast={index === categoryTxns.length - 1}
                onPress={() => router.push(`/transaction/${item.id}` as any)} 
              />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder }]}>
            <Ionicons name="receipt-outline" size={38} color={colors.text.tertiary} />
            <Text variant="sm" color={colors.text.secondary} style={{ marginTop: Spacing.xs }}>
              No transactions recorded for {categoryName} in {monthLabel}.
            </Text>
          </View>
        )}
      </ScrollView>
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
  overviewCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleBox: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
  },
  statColRight: {
    alignItems: 'flex-end',
  },
  badgePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    paddingHorizontal: 4,
  },
  listContainer: {
    borderRadius: Radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemDivider: {
    height: 1,
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
