import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Header } from '../../src/components/ui/Header';
import { TransactionItem } from '../../src/components/transactions/TransactionItem';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useTransactionStore, useUIStore } from '../../src/store';
import { formatCurrency } from '../../src/utils/finance';

const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DayPatternDetailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    day: string; // '0'..'6'
    dayName?: string;
    fullName?: string;
    type?: 'expense' | 'income';
    month?: string;
    year?: string;
  }>();

  const currentMonth = useUIStore((s) => s.selectedMonth);
  const currentYear = useUIStore((s) => s.selectedYear);
  const currency = useUIStore((s) => s.currency);

  const targetDayIdx = params.day !== undefined ? parseInt(params.day, 10) : 0;
  const selectedMonth = params.month ? parseInt(params.month, 10) : currentMonth;
  const selectedYear = params.year ? parseInt(params.year, 10) : currentYear;
  const activeType = params.type || 'expense';

  const fullDayName = params.fullName || FULL_DAY_NAMES[targetDayIdx] || 'Day';
  const shortDayName = params.dayName || SHORT_DAY_NAMES[targetDayIdx] || 'Day';

  const getTransactionsForMonth = useTransactionStore((s) => s.getTransactionsForMonth);
  const allMonthTxns = getTransactionsForMonth(selectedMonth, selectedYear);

  // Filter transactions for this day of week & type
  const dayTxns = useMemo(() => {
    return allMonthTxns
      .filter((t) => {
        if (t.type !== activeType) return false;
        const parts = t.transactionDate.split('-').map(Number);
        if (parts.length !== 3) return false;
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.getDay() === targetDayIdx;
      })
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [allMonthTxns, targetDayIdx, activeType]);

  // Total spent/earned on this day of the week
  const totalDayAmount = useMemo(() => {
    return dayTxns.reduce((sum, t) => sum + t.amount, 0);
  }, [dayTxns]);

  // Overall type total to compute percentage
  const overallTypeTotal = useMemo(() => {
    return allMonthTxns
      .filter((t) => t.type === activeType)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [allMonthTxns, activeType]);

  const percentage = overallTypeTotal > 0 ? Math.round((totalDayAmount / overallTypeTotal) * 100) : 0;

  // Number of occurrences of this weekday in the selected month
  const occurrencesInMonth = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      if (new Date(selectedYear, selectedMonth - 1, day).getDay() === targetDayIdx) {
        count++;
      }
    }
    return count;
  }, [selectedYear, selectedMonth, targetDayIdx]);

  const avgPerDay = occurrencesInMonth > 0 ? totalDayAmount / occurrencesInMonth : 0;

  const monthLabel = format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy');
  const activeThemeColor = activeType === 'expense' ? colors.semantic.expense : colors.semantic.income;

  return (
    <GlassBackground style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title={`${fullDayName} Details`} 
        showBack={true} 
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/charts' as any);
        }} 
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        
        {/* Day Pattern Overview Card */}
        <View style={[styles.overviewCard, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder }]}>
          <View style={styles.headerRow}>
            <View style={[styles.dayIconBadge, { backgroundColor: colors.accent.primaryDim, borderColor: colors.accent.primary }]}>
              <Text variant="sm" weight="bold" color={colors.accent.primary}>
                {shortDayName}
              </Text>
            </View>
            <View style={styles.headerTitleBox}>
              <Text variant="lg" weight="bold">All {fullDayName}s</Text>
              <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                {monthLabel} • {occurrencesInMonth} {fullDayName}s in month
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

          {/* Amount Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text variant="xs" color={colors.text.tertiary}>Total {activeType === 'expense' ? 'Spent' : 'Earned'}</Text>
              <Text variant="xl" weight="bold" color={activeThemeColor} style={{ marginTop: 4 }}>
                {formatCurrency(totalDayAmount, currency)}
              </Text>
              {occurrencesInMonth > 0 && totalDayAmount > 0 && (
                <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 3 }}>
                  Avg: {formatCurrency(avgPerDay, currency)} / {shortDayName}
                </Text>
              )}
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
          <Text variant="base" weight="bold">Transactions ({dayTxns.length})</Text>
        </View>

        {dayTxns.length > 0 ? (
          <View style={[styles.listContainer, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder, borderWidth: 1, borderRadius: Radii.md, overflow: 'hidden' }]}>
            {dayTxns.map((item, index) => (
              <TransactionItem 
                key={item.id}
                transaction={item} 
                showDate={true}
                isLast={index === dayTxns.length - 1}
                onPress={() => router.push(`/transaction/${item.id}` as any)} 
              />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder }]}>
            <Ionicons name="calendar-outline" size={38} color={colors.text.tertiary} />
            <Text variant="sm" color={colors.text.secondary} style={{ marginTop: Spacing.xs }}>
              No transactions recorded on {fullDayName}s in {monthLabel}.
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
  dayIconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
