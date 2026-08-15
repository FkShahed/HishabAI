import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { MonthSelector } from '../../src/components/ui/MonthSelector';
import { TransactionItem } from '../../src/components/transactions/TransactionItem';
import { useTransactionStore, useUIStore, useBudgetStore } from '../../src/store';
import { Colors, Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { formatCurrency } from '../../src/utils/finance';
import { auth } from '../../src/services/firebase';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [imageFailed, setImageFailed] = useState(false);

  const { selectedMonth, selectedYear, goToPrevMonth, goToNextMonth, currency, userName, userPhotoUrl } = useUIStore();
  const { getMonthlySummary, getDailyGroups, isLoading } = useTransactionStore();
  const summary = getMonthlySummary(selectedMonth, selectedYear);
  const dailyGroups = getDailyGroups(selectedMonth, selectedYear);
  const budgets = useBudgetStore((s) => s.budgets); // subscribe to force re-render
  const getBudgetStatus = useBudgetStore((s) => s.getBudgetStatus);
  const budgetStatus = getBudgetStatus(selectedMonth, selectedYear);
  const dailyBudget = budgetStatus.fixedDailyBudget;

  const userInitial = userName && userName.trim() ? userName.trim().charAt(0).toUpperCase() : null;
  const rawPhotoUrl = auth?.currentUser?.photoURL || auth?.currentUser?.providerData?.[0]?.photoURL || userPhotoUrl;
  const photoUrl = !imageFailed && rawPhotoUrl ? rawPhotoUrl : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Compact Topbar Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="lg" weight="bold" style={{ color: colors.accent.primary }}>
            HisabAI
          </Text>
        </View>

        <TouchableOpacity 
          onPress={() => router.push('/profile')}
          style={[styles.profileBadge, { backgroundColor: colors.accent.primary, overflow: 'hidden' }]}
          activeOpacity={0.8}
        >
          {photoUrl ? (
            Platform.OS === 'web' ? (
              <img 
                src={photoUrl} 
                referrerPolicy="no-referrer" 
                style={{ width: 34, height: 34, borderRadius: 17, objectFit: 'cover' }} 
                onError={() => setImageFailed(true)}
              />
            ) : (
              <Image 
                source={{ uri: photoUrl }} 
                style={{ width: 34, height: 34, borderRadius: 17 }} 
                onError={() => setImageFailed(true)}
              />
            )
          ) : userInitial ? (
            <Text variant="sm" weight="bold" color="#FFFFFF">
              {userInitial}
            </Text>
          ) : (
            <Ionicons name="person" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <MonthSelector
        month={selectedMonth}
        year={selectedYear}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => {}} tintColor={colors.accent.primary} />}
      >
        {/* Monthly Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, borderWidth: 1 }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="xs" color={colors.text.secondary} weight="semibold">
                EXPENSES
              </Text>
              <Text variant="md" weight="bold" color={colors.semantic.expense} style={{ marginTop: 2 }}>
                {formatCurrency(summary.totalExpense, currency)}
              </Text>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />

            <View style={styles.summaryItem}>
              <Text variant="xs" color={colors.text.secondary} weight="semibold">
                INCOME
              </Text>
              <Text variant="md" weight="bold" color={colors.semantic.income} style={{ marginTop: 2 }}>
                {formatCurrency(summary.totalIncome, currency)}
              </Text>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />

            <View style={styles.summaryItem}>
              <Text variant="xs" color={colors.text.secondary} weight="semibold">
                BALANCE
              </Text>
              <Text
                variant="md"
                weight="bold"
                color={summary.balance >= 0 ? colors.semantic.income : colors.semantic.expense}
                style={{ marginTop: 2 }}
              >
                {formatCurrency(summary.balance, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Grouped Transactions List */}
        {dailyGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="lg" weight="semibold" color={colors.text.secondary}>
              No transactions yet
            </Text>
            <Text variant="sm" color={colors.text.tertiary} align="center" style={styles.emptySubtitle}>
              Tap the (+) icon below or use voice to record your first transaction for this month.
            </Text>
          </View>
        ) : (
          dailyGroups.map((group) => {
            const isDailyOverBudget = dailyBudget > 0 && group.totalExpense > dailyBudget;
            return (
              <View key={group.date} style={styles.dayGroup}>
                <View style={[styles.dayHeader, { backgroundColor: colors.bg.secondary }]}>
                  <View style={styles.dayHeaderLeft}>
                    <Text variant="sm" weight="bold">
                      {group.dayName}
                    </Text>
                  </View>

                  <Text
                    variant="xs"
                    weight="bold"
                    color={isDailyOverBudget ? colors.semantic.danger : colors.text.secondary}
                  >
                    Expenses: {formatCurrency(group.totalExpense, currency)}
                  </Text>
                </View>

                <View style={[styles.transactionList, { backgroundColor: colors.bg.card }]}>
                  {group.transactions.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      onPress={() => router.push(`/transaction/${tx.id}` as any)}
                    />
                  ))}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Colors.accent.primary,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
  },
  summaryCard: {
    marginHorizontal: Spacing.md,
    borderRadius: Radii.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border.subtle,
  },
  dayGroup: {
    marginBottom: Spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.secondary,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  transactionList: {
    backgroundColor: Colors.bg.card,
  },
  emptyState: {
    padding: Spacing.section,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptySubtitle: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },
});
