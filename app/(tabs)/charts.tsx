import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { MonthSelector } from '../../src/components/ui/MonthSelector';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useUIStore, useTransactionStore } from '../../src/store';
import { formatCurrency } from '../../src/utils/finance';

export default function ChartsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  
  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const selectedYear = useUIStore((s) => s.selectedYear);
  const goToPrevMonth = useUIStore((s) => s.goToPrevMonth);
  const goToNextMonth = useUIStore((s) => s.goToNextMonth);
  const currency = useUIStore((s) => s.currency);
  
  const getTransactionsForMonth = useTransactionStore((s) => s.getTransactionsForMonth);
  const getDailyGroups = useTransactionStore((s) => s.getDailyGroups);

  const transactions = getTransactionsForMonth(selectedMonth, selectedYear);
  const dailyGroups = getDailyGroups(selectedMonth, selectedYear);

  // 1. Prepare Pie Chart Data (Category Breakdown for Expenses)
  const pieData = useMemo(() => {
    const expenseTxns = transactions.filter(t => t.type === 'expense');
    const categoryTotals = new Map<string, { value: number; color: string; label: string }>();

    let totalExpense = 0;
    
    expenseTxns.forEach(t => {
      totalExpense += t.amount;
      const existing = categoryTotals.get(t.categoryId) || {
        value: 0,
        color: t.categoryColor || colors.accent.primary,
        label: t.categoryNameSnapshot,
      };
      existing.value += t.amount;
      categoryTotals.set(t.categoryId, existing);
    });

    const data = Array.from(categoryTotals.values()).map(item => ({
      value: item.value,
      color: item.color,
      percentage: Math.round((item.value / (totalExpense || 1)) * 100),
      label: item.label,
    })).sort((a, b) => b.value - a.value);

    return { data, totalExpense };
  }, [transactions, colors.accent.primary]);

  // 2. Prepare Bar Chart Data (Daily Expense vs Income)
  const barData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const data = [];
    let maxVal = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const group = dailyGroups.find(g => g.date === dateStr);
      const val = group ? group.totalExpense : 0;
      if (val > maxVal) maxVal = val;
      
      data.push({
        value: val,
        day: i,
      });
    }
    
    return { data, maxVal: maxVal || 1000 };
  }, [dailyGroups, selectedMonth, selectedYear]);

  // SVG Donut Chart Math Constants
  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Header title="Analytics" showBack={false} />
      
      <MonthSelector 
        month={selectedMonth}
        year={selectedYear}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
      />

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Category Breakdown (SVG Donut Chart) */}
        <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <Text variant="md" weight="bold" style={styles.cardTitle}>Spending by Category</Text>
          
          {pieData.data.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <View style={styles.donutWrapper}>
                  <Svg width={200} height={200} viewBox="0 0 200 200">
                    <G rotation="-90" origin="100, 100">
                      {/* Background track circle */}
                      <Circle
                        cx="100"
                        cy="100"
                        r={radius}
                        stroke={colors.bg.secondary}
                        strokeWidth={strokeWidth}
                        fill="none"
                      />
                      {/* Category Slices */}
                      {(() => {
                        let accumulatedOffset = 0;
                        return pieData.data.map((item, index) => {
                          const strokeDasharray = (item.value / pieData.totalExpense) * circumference;
                          const strokeDashoffset = -accumulatedOffset;
                          accumulatedOffset += strokeDasharray;

                          return (
                            <Circle
                              key={index}
                              cx="100"
                              cy="100"
                              r={radius}
                              stroke={item.color}
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${strokeDasharray} ${circumference - strokeDasharray}`}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              fill="none"
                            />
                          );
                        });
                      })()}
                    </G>
                  </Svg>
                  
                  {/* Donut Center Total Overlay */}
                  <View style={styles.centerLabel}>
                    <Text variant="xs" color={colors.text.secondary}>Total Spent</Text>
                    <Text variant="md" weight="bold" color={colors.text.primary} style={{ marginTop: 2 }}>
                      {formatCurrency(pieData.totalExpense, currency)}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Category Legend */}
              <View style={styles.legendContainer}>
                {pieData.data.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <View style={styles.legendText}>
                      <Text variant="sm" color={colors.text.secondary}>{item.label}</Text>
                      <Text variant="sm" weight="semibold">
                        {formatCurrency(item.value, currency)} ({item.percentage}%)
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text color={colors.text.tertiary}>No expenses this month</Text>
            </View>
          )}
        </View>

        {/* Daily Spending (Pure React Native Bar Chart) */}
        <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <Text variant="lg" weight="bold" style={styles.cardTitle}>Daily Spending</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.md }}>
            <View style={styles.barChartContainer}>
              {barData.data.map((item) => {
                const heightPercent = Math.max((item.value / barData.maxVal) * 120, item.value > 0 ? 6 : 2);

                return (
                  <View key={item.day} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            height: heightPercent, 
                            backgroundColor: item.value > 0 ? colors.semantic.expense : colors.border.subtle 
                          }
                        ]} 
                      />
                    </View>
                    <Text variant="xs" color={colors.text.tertiary} style={{ marginTop: 6 }}>
                      {item.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
        
        {/* Spacer for bottom tab */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  donutWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    marginTop: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  legendText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyState: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: Spacing.md,
    gap: 8,
  },
  barColumn: {
    alignItems: 'center',
    width: 16,
  },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
});
