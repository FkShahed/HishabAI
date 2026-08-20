import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { startOfMonth, getDaysInMonth, format } from 'date-fns';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { MonthSelector } from '../../src/components/ui/MonthSelector';
import { TransactionItem } from '../../src/components/transactions/TransactionItem';
import { CategoryIcon } from '../../src/components/ui/CategoryIcon';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useUIStore, useTransactionStore } from '../../src/store';
import { formatCurrency, getCurrencySymbol, formatDateDisplay } from '../../src/utils/finance';

let BlurViewComponent: any = null;
try {
  BlurViewComponent = require('expo-blur').BlurView;
} catch (e) {}

/** Helper to format compact amounts on small calendar cells */
function formatCompactAmount(amount: number, symbol: string): string {
  if (!amount || amount <= 0) return '';
  if (amount >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  }
  return `${symbol}${Math.round(amount)}`;
}

export default function ChartsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  
  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const selectedYear = useUIStore((s) => s.selectedYear);
  const goToPrevMonth = useUIStore((s) => s.goToPrevMonth);
  const goToNextMonth = useUIStore((s) => s.goToNextMonth);
  const currency = useUIStore((s) => s.currency);
  const currencySymbol = getCurrencySymbol(currency);
  
  const getTransactionsForMonth = useTransactionStore((s) => s.getTransactionsForMonth);
  const transactions = getTransactionsForMonth(selectedMonth, selectedYear);

  // State: Expense vs Income filter
  const [selectedType, setSelectedType] = useState<'expense' | 'income'>('expense');
  
  // State: Selected Calendar Day for Popup Modal inspection
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // State: Expanded category ID for inline date-wise transaction list
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // State: Show Top 5 vs See All categories toggle
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Filter transactions by the selected type
  const typeFilteredTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === selectedType);
  }, [transactions, selectedType]);

  // Selected Category Transactions
  const selectedCategoryTransactions = useMemo(() => {
    if (!selectedCategoryModal) return [];
    return typeFilteredTransactions.filter((t) => t.categoryId === selectedCategoryModal.categoryId);
  }, [typeFilteredTransactions, selectedCategoryModal]);

  // Monthly Cash Flow & Financial Health Metrics
  const cashFlowMetrics = useMemo(() => {
    let totalInc = 0;
    let totalExp = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') totalInc += t.amount;
      else if (t.type === 'expense') totalExp += t.amount;
    });

    const netSurplus = totalInc - totalExp;
    const savingsRate = totalInc > 0 ? Math.max(0, Math.round((netSurplus / totalInc) * 100)) : 0;
    const daysCount = getDaysInMonth(new Date(selectedYear, selectedMonth - 1, 1)) || 30;
    const avgDailySpend = Math.round(totalExp / daysCount);
    const flowTotal = (totalInc + totalExp) || 1;
    const incPercent = Math.round((totalInc / flowTotal) * 100);
    const expPercent = Math.round((totalExp / flowTotal) * 100);

    return {
      totalInc,
      totalExp,
      netSurplus,
      savingsRate,
      avgDailySpend,
      incPercent,
      expPercent,
    };
  }, [transactions, selectedMonth, selectedYear]);

  // 1. Prepare Pie / Donut Chart Data (Category Breakdown)
  const pieData = useMemo(() => {
    const categoryTotals = new Map<string, { id: string; value: number; color: string; label: string; icon: string }>();
    let totalAmount = 0;
    
    typeFilteredTransactions.forEach((t) => {
      totalAmount += t.amount;
      const existing = categoryTotals.get(t.categoryId) || {
        id: t.categoryId,
        value: 0,
        color: t.categoryColor || colors.accent.primary,
        label: t.categoryNameSnapshot,
        icon: t.categoryIcon || '💰',
      };
      existing.value += t.amount;
      categoryTotals.set(t.categoryId, existing);
    });

    const data = Array.from(categoryTotals.values())
      .map((item) => ({
        id: item.id,
        value: item.value,
        color: item.color,
        percentage: Math.round((item.value / (totalAmount || 1)) * 100),
        label: item.label,
        icon: item.icon,
      }))
      .sort((a, b) => b.value - a.value);

    return { data, totalAmount };
  }, [typeFilteredTransactions, colors.accent.primary]);

  // 2. Prepare Calendar Grid & Daily Totals Data
  const calendarData = useMemo(() => {
    const firstDayDate = new Date(selectedYear, selectedMonth - 1, 1);
    const startDayOfWeek = firstDayDate.getDay(); // 0 = Sun, 1 = Mon, ...
    const totalDays = getDaysInMonth(firstDayDate);

    // Map each day number to its transactions and total amount
    const dayMap = new Map<number, { total: number; count: number }>();
    for (let i = 1; i <= totalDays; i++) {
      dayMap.set(i, { total: 0, count: 0 });
    }

    typeFilteredTransactions.forEach((t) => {
      const parts = t.transactionDate.split('-');
      if (parts.length === 3) {
        const dayNum = parseInt(parts[2], 10);
        if (dayMap.has(dayNum)) {
          const cur = dayMap.get(dayNum)!;
          cur.total += t.amount;
          cur.count += 1;
        }
      }
    });

    let maxDayAmount = 0;
    dayMap.forEach((v) => {
      if (v.total > maxDayAmount) maxDayAmount = v.total;
    });

    return {
      startDayOfWeek,
      totalDays,
      dayMap,
      maxDayAmount: maxDayAmount || 1,
    };
  }, [typeFilteredTransactions, selectedMonth, selectedYear]);

  // 3. Transactions for the selected calendar day
  const selectedDayTransactions = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return typeFilteredTransactions.filter((t) => t.transactionDate === dateStr);
  }, [typeFilteredTransactions, selectedDay, selectedMonth, selectedYear]);

  const selectedDayTotal = useMemo(() => {
    return selectedDayTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayTransactions]);

  // 4. Prepare Bar Chart Data
  const barData = useMemo(() => {
    const daysInMonth = calendarData.totalDays;
    const data = [];
    let maxVal = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
      const val = calendarData.dayMap.get(i)?.total || 0;
      if (val > maxVal) maxVal = val;
      data.push({ day: i, value: val });
    }
    
    return { data, maxVal: maxVal || 1000 };
  }, [calendarData]);

  // SVG Donut Chart Math Constants
  const radius = 70;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  const activeThemeColor = selectedType === 'expense' ? colors.semantic.expense : colors.semantic.income;
  const activeDimColor = selectedType === 'expense' ? colors.semantic.expenseDim : colors.semantic.incomeDim;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Header title="Analytics & Trends" showBack={false} />
      
      <MonthSelector 
        month={selectedMonth}
        year={selectedYear}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── Type Switcher (Expenses vs Income) ───────────────────────────── */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.bg.secondary }]}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              selectedType === 'expense' && { backgroundColor: colors.semantic.expense }
            ]}
            onPress={() => {
              setSelectedType('expense');
              setSelectedDay(null);
            }}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="trending-down" 
              size={15} 
              color={selectedType === 'expense' ? '#FFFFFF' : colors.text.secondary} 
              style={{ marginRight: 6 }}
            />
            <Text 
              variant="sm" 
              weight="bold" 
              color={selectedType === 'expense' ? '#FFFFFF' : colors.text.secondary}
            >
              Expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              selectedType === 'income' && { backgroundColor: colors.semantic.income }
            ]}
            onPress={() => {
              setSelectedType('income');
              setSelectedDay(null);
            }}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="trending-up" 
              size={15} 
              color={selectedType === 'income' ? '#FFFFFF' : colors.text.secondary} 
              style={{ marginRight: 6 }}
            />
            <Text 
              variant="sm" 
              weight="bold" 
              color={selectedType === 'income' ? '#FFFFFF' : colors.text.secondary}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 1. Monthly Calendar Grid with Daily Totals ───────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text variant="md" weight="bold">
                {selectedType === 'expense' ? 'Expense Calendar' : 'Income Calendar'}
              </Text>
              <Text variant="xs" color={colors.text.secondary}>
                Daily totals for {format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy')}
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: activeDimColor }]}>
              <Text variant="xs" weight="bold" color={activeThemeColor}>
                {formatCurrency(pieData.totalAmount, currency)}
              </Text>
            </View>
          </View>

          {/* Weekday Header Labels */}
          <View style={styles.weekdayRow}>
            {weekdays.map((day, idx) => (
              <Text 
                key={idx} 
                variant="xs" 
                weight="bold" 
                color={idx === 0 || idx === 6 ? colors.text.tertiary : colors.text.secondary} 
                style={styles.weekdayLabel}
              >
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Day Grid */}
          <View style={styles.calendarGrid}>
            {/* Empty slots for leading weekday padding */}
            {Array.from({ length: calendarData.startDayOfWeek }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.calendarSlot} />
            ))}

            {/* Actual day cells */}
            {Array.from({ length: calendarData.totalDays }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayInfo = calendarData.dayMap.get(dayNum);
              const dayTotal = dayInfo?.total || 0;
              const hasTransactions = dayTotal > 0;
              const isSelected = selectedDay === dayNum;

              // Intensity ratio for background tint
              const intensity = hasTransactions ? Math.min(dayTotal / calendarData.maxDayAmount, 1) : 0;

              return (
                <View key={`slot-${dayNum}`} style={styles.calendarSlot}>
                  <TouchableOpacity
                    style={[
                      styles.calendarDayCell,
                      { 
                        borderColor: colors.border.subtle,
                        backgroundColor: hasTransactions && selectedType === 'expense' 
                          ? colors.bg.secondary 
                          : 'transparent'
                      },
                      hasTransactions && selectedType === 'income' && {
                        backgroundColor: `rgba(5, 150, 105, ${0.08 + intensity * 0.18})`,
                        borderColor: `rgba(5, 150, 105, ${0.25 + intensity * 0.35})`,
                      },
                      isSelected && {
                        borderColor: colors.accent.primary,
                        borderWidth: 1.5,
                        backgroundColor: colors.accent.primaryDim,
                      }
                    ]}
                    onPress={() => setSelectedDay(isSelected ? null : dayNum)}
                    activeOpacity={0.7}
                  >
                    <Text 
                      variant="xs" 
                      weight={hasTransactions || isSelected ? "bold" : "medium"}
                      color={isSelected ? colors.accent.primary : hasTransactions ? colors.text.primary : colors.text.tertiary}
                    >
                      {dayNum}
                    </Text>
                    
                    {hasTransactions && (
                      <Text 
                        variant="xs" 
                        weight="bold" 
                        color={isSelected ? colors.accent.primary : activeThemeColor} 
                        numberOfLines={1}
                        style={styles.dayAmountText}
                      >
                        {formatCompactAmount(dayTotal, currencySymbol)}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── 2. Category Breakdown (SVG Donut Chart) ────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <Text variant="md" weight="bold" style={styles.cardTitle}>
            {selectedType === 'expense' ? 'Spending by Category' : 'Income by Category'}
          </Text>
          
          {pieData.data.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <View style={styles.donutWrapper}>
                  <Svg width={190} height={190} viewBox="0 0 190 190">
                    <G rotation="-90" origin="95, 95">
                      {/* Background track circle */}
                      <Circle
                        cx="95"
                        cy="95"
                        r={radius}
                        stroke={colors.bg.secondary}
                        strokeWidth={strokeWidth}
                        fill="none"
                      />
                      {/* Category Slices */}
                      {(() => {
                        let accumulatedOffset = 0;
                        return pieData.data.map((item, index) => {
                          const strokeDasharray = (item.value / pieData.totalAmount) * circumference;
                          const strokeDashoffset = -accumulatedOffset;
                          accumulatedOffset += strokeDasharray;

                          return (
                            <Circle
                              key={index}
                              cx="95"
                              cy="95"
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
                    <Text variant="xs" color={colors.text.secondary}>
                      {selectedType === 'expense' ? 'Total Spent' : 'Total Earned'}
                    </Text>
                    <Text variant="md" weight="bold" color={activeThemeColor} style={{ marginTop: 2 }}>
                      {formatCurrency(pieData.totalAmount, currency)}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Category Legend with Top 5 + See More + Inline Date-wise Expansion */}
              <View style={styles.legendContainer}>
                {(showAllCategories ? pieData.data : pieData.data.slice(0, 5)).map((item, index) => {
                  const isExpanded = expandedCategoryId === item.id;
                  const categoryTxns = typeFilteredTransactions
                    .filter((t) => t.categoryId === item.id)
                    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

                  return (
                    <View key={item.id || index} style={{ marginBottom: Spacing.xs }}>
                      <TouchableOpacity
                        style={[
                          styles.categoryLegendCard,
                          { backgroundColor: colors.bg.secondary, borderColor: isExpanded ? colors.accent.primary : colors.border.subtle }
                        ]}
                        onPress={() => setExpandedCategoryId(isExpanded ? null : item.id)}
                        activeOpacity={0.7}
                      >
                        <CategoryIcon icon={item.icon} color={item.color} size="sm" />
                        
                        <View style={styles.categoryLegendDetails}>
                          <View style={{ flex: 1 }}>
                            <Text variant="sm" weight="semibold" numberOfLines={1}>
                              {item.label}
                            </Text>
                            <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 1 }}>
                              {item.percentage}% of total {selectedType} ({categoryTxns.length} txns)
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text variant="sm" weight="bold" color={activeThemeColor} style={{ marginRight: 6 }}>
                              {formatCurrency(item.value, currency)}
                            </Text>
                            <Ionicons 
                              name={isExpanded ? "chevron-up" : "chevron-down"} 
                              size={16} 
                              color={colors.text.tertiary} 
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Inline Date-wise Transactions List */}
                      {isExpanded && (
                        <View style={[styles.inlineCategoryTxnBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
                          <View style={styles.inlineHeader}>
                            <Ionicons name="list-outline" size={14} color={colors.accent.primary} style={{ marginRight: 6 }} />
                            <Text variant="xs" weight="bold" color={colors.text.primary}>
                              {item.label} Transactions by Date
                            </Text>
                          </View>
                          {categoryTxns.length > 0 ? (
                            categoryTxns.map((tx) => (
                              <TransactionItem
                                key={tx.id}
                                transaction={tx}
                                showDate={true}
                                onPress={() => router.push(`/transaction/${tx.id}` as any)}
                              />
                            ))
                          ) : (
                            <Text variant="xs" color={colors.text.tertiary} align="center" style={{ paddingVertical: 8 }}>
                              No transactions in this category.
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Top 5 See More / See Less Toggle */}
                {pieData.data.length > 5 && (
                  <TouchableOpacity
                    style={[styles.seeMoreBtn, { borderColor: colors.border.subtle, backgroundColor: colors.bg.secondary }]}
                    onPress={() => setShowAllCategories(!showAllCategories)}
                    activeOpacity={0.7}
                  >
                    <Text variant="xs" weight="bold" color={colors.accent.primary}>
                      {showAllCategories ? 'Show Top 5 Only' : `See More (${pieData.data.length - 5} More Categories)`}
                    </Text>
                    <Ionicons 
                      name={showAllCategories ? "chevron-up" : "chevron-down"} 
                      size={14} 
                      color={colors.accent.primary} 
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="pie-chart-outline" size={36} color={colors.text.tertiary} />
              <Text variant="sm" color={colors.text.tertiary} style={{ marginTop: Spacing.xs }}>
                No {selectedType} recorded for this month
              </Text>
            </View>
          )}
        </View>

        {/* ── 3. Daily Trend Bar Chart ────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <Text variant="md" weight="bold" style={styles.cardTitle}>
            {selectedType === 'expense' ? 'Daily Spending Trend' : 'Daily Income Trend'}
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.xs }}>
            <View style={styles.barChartContainer}>
              {barData.data.map((item) => {
                const heightPercent = Math.max((item.value / barData.maxVal) * 110, item.value > 0 ? 6 : 2);

                return (
                  <View key={item.day} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            height: heightPercent, 
                            backgroundColor: item.value > 0 ? activeThemeColor : colors.border.subtle 
                          }
                        ]} 
                      />
                    </View>
                    <Text variant="xs" color={colors.text.tertiary} style={{ marginTop: 4 }}>
                      {item.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* ── 4. Monthly Cash Flow & Savings Ratio Graph ───────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text variant="md" weight="bold">
                Monthly Cash Flow & Health
              </Text>
              <Text variant="xs" color={colors.text.secondary}>
                Income vs Expense Balance Overview
              </Text>
            </View>
            <View style={[
              styles.typeBadge, 
              { backgroundColor: cashFlowMetrics.netSurplus >= 0 ? colors.semantic.incomeDim : colors.semantic.expenseDim }
            ]}>
              <Text 
                variant="xs" 
                weight="bold" 
                color={cashFlowMetrics.netSurplus >= 0 ? colors.semantic.income : colors.semantic.expense}
              >
                {cashFlowMetrics.netSurplus >= 0 ? 'Surplus' : 'Deficit'}
              </Text>
            </View>
          </View>

          {/* Dual Bar Comparison Track */}
          <View style={styles.cashFlowBarTrack}>
            <View 
              style={[
                styles.cashFlowBarFill, 
                { width: `${cashFlowMetrics.incPercent}%`, backgroundColor: colors.semantic.income }
              ]} 
            />
            <View 
              style={[
                styles.cashFlowBarFill, 
                { width: `${cashFlowMetrics.expPercent}%`, backgroundColor: colors.semantic.expense }
              ]} 
            />
          </View>

          <View style={styles.cashFlowLegendRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.legendDot, { backgroundColor: colors.semantic.income }]} />
              <Text variant="xs" color={colors.text.secondary}>
                Earned: <Text variant="xs" weight="bold" color={colors.semantic.income}>{formatCurrency(cashFlowMetrics.totalInc, currency)}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.legendDot, { backgroundColor: colors.semantic.expense }]} />
              <Text variant="xs" color={colors.text.secondary}>
                Spent: <Text variant="xs" weight="bold" color={colors.semantic.expense}>{formatCurrency(cashFlowMetrics.totalExp, currency)}</Text>
              </Text>
            </View>
          </View>

          {/* 3 Metric Pills */}
          <View style={styles.metricsPillRow}>
            <View style={[styles.metricPillCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
              <Text variant="xs" color={colors.text.tertiary}>Net Balance</Text>
              <Text 
                variant="sm" 
                weight="bold" 
                color={cashFlowMetrics.netSurplus >= 0 ? colors.semantic.income : colors.semantic.expense}
                style={{ marginTop: 2 }}
              >
                {cashFlowMetrics.netSurplus >= 0 ? '+' : ''}{formatCurrency(cashFlowMetrics.netSurplus, currency)}
              </Text>
            </View>

            <View style={[styles.metricPillCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
              <Text variant="xs" color={colors.text.tertiary}>Savings Rate</Text>
              <Text variant="sm" weight="bold" color={colors.accent.primaryLight} style={{ marginTop: 2 }}>
                🎯 {cashFlowMetrics.savingsRate}%
              </Text>
            </View>

            <View style={[styles.metricPillCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
              <Text variant="xs" color={colors.text.tertiary}>Daily Avg</Text>
              <Text variant="sm" weight="bold" color={colors.text.primary} style={{ marginTop: 2 }}>
                ⚡ {formatCurrency(cashFlowMetrics.avgDailySpend, currency)}/d
              </Text>
            </View>
          </View>
        </View>
        
        {/* Spacer for bottom tab */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Expense Calendar Date-Wise Popup Modal ───────────────────────── */}
      <Modal
        visible={selectedDay !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDay(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedDay(null)}>
          <View style={[
            styles.modalBackdrop,
            Platform.OS === 'web' && ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
          ]}>
            {BlurViewComponent && Platform.OS !== 'web' ? (
              <BlurViewComponent 
                intensity={Platform.OS === 'ios' ? 40 : 65} 
                tint="dark" 
                style={StyleSheet.absoluteFill} 
              />
            ) : null}

            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[
                styles.modalSheetContainer,
                { 
                  backgroundColor: colors.bg.modal,
                  borderColor: colors.border.subtle,
                  paddingBottom: Math.max(insets.bottom, 20) + 12,
                }
              ]}>
                <View style={[styles.modalHandleBar, { backgroundColor: colors.border.medium }]} />

                {selectedDay !== null && (
                  <>
                    <View style={styles.modalSheetHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.dateModalIconBadge, { backgroundColor: activeDimColor }]}>
                          <Ionicons name="calendar" size={18} color={activeThemeColor} />
                        </View>
                        <View style={{ marginLeft: Spacing.sm }}>
                          <Text variant="md" weight="bold">
                            {formatDateDisplay(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`)}
                          </Text>
                          <Text variant="xs" color={colors.text.secondary}>
                            {selectedDayTransactions.length} {selectedType === 'expense' ? 'expense' : 'income'} transaction{selectedDayTransactions.length === 1 ? '' : 's'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text variant="md" weight="bold" color={activeThemeColor} style={{ marginRight: Spacing.sm }}>
                          {formatCurrency(selectedDayTotal, currency)}
                        </Text>
                        <TouchableOpacity 
                          onPress={() => setSelectedDay(null)}
                          style={[styles.modalCloseBtn, { backgroundColor: colors.bg.secondary }]}
                        >
                          <Ionicons name="close" size={16} color={colors.text.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                      {selectedDayTransactions.length > 0 ? (
                        <View style={{ paddingVertical: Spacing.xs }}>
                          {selectedDayTransactions.map((tx) => (
                            <TransactionItem
                              key={tx.id}
                              transaction={tx}
                              showDate={false}
                              onPress={() => {
                                setSelectedDay(null);
                                router.push(`/transaction/${tx.id}` as any);
                              }}
                            />
                          ))}
                        </View>
                      ) : (
                        <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                          <Ionicons name="calendar-outline" size={32} color={colors.text.tertiary} />
                          <Text variant="sm" color={colors.text.tertiary} style={{ marginTop: Spacing.xs }}>
                            No {selectedType} recorded on this date.
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.sm,
  },
  card: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    marginBottom: 4,
  },
  weekdayLabel: {
    width: '14.285%',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarSlot: {
    width: '14.285%',
    height: 48,
    paddingHorizontal: 2.5,
    paddingVertical: 2,
  },
  calendarDayCell: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
    borderWidth: 1,
    paddingVertical: 1,
  },
  dayAmountText: {
    fontSize: 9,
    lineHeight: 11,
    marginTop: 1,
  },
  selectedDayCard: {
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
  },
  selectedDayList: {
    paddingHorizontal: 0,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
  },
  donutWrapper: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    marginTop: Spacing.md,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryLegendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  categoryLegendDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: Spacing.xs + 2,
  },
  inlineCategoryTxnBox: {
    borderRadius: Radii.sm,
    borderWidth: 1,
    padding: Spacing.xs,
    marginTop: 4,
    marginLeft: 8,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    marginBottom: 4,
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginTop: 4,
  },
  dateModalIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashFlowBarTrack: {
    height: 14,
    borderRadius: 7,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: Spacing.sm,
  },
  cashFlowBarFill: {
    height: '100%',
  },
  cashFlowLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  metricsPillRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 4,
  },
  metricPillCard: {
    flex: 1,
    padding: Spacing.xs + 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheetContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: Spacing.md,
    maxHeight: '85%',
  },
  modalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    marginBottom: Spacing.xs,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  emptyState: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: Spacing.sm,
    gap: 7,
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
    borderRadius: 3,
  },
});
