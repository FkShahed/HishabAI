import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { MonthSelector } from '../../src/components/ui/MonthSelector';
import { TransactionItem } from '../../src/components/transactions/TransactionItem';
import { useTransactionStore, useUIStore, useBudgetStore, useDraftStore } from '../../src/store';
import { Colors, Spacing, Radii, Gradients, useThemeColors } from '../../src/constants/colors';
import { formatCurrency } from '../../src/utils/finance';
import { auth } from '../../src/services/firebase';

import { AddOptionModal } from '../../src/components/ui/AddOptionModal';

let BlurViewComponent: any = null;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [imageFailed, setImageFailed] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const { selectedMonth, selectedYear, goToPrevMonth, goToNextMonth, currency, userName, userPhotoUrl } = useUIStore();
  const { getMonthlySummary, getDailyGroups, isLoading } = useTransactionStore();
  const drafts = useDraftStore((s) => s.drafts);
  const approveAllReadyDrafts = useDraftStore((s) => s.approveAllReadyDrafts);

  const readyDrafts = drafts.filter((d) => d.status === 'ready');
  const processingDrafts = drafts.filter((d) => d.status === 'processing');
  const totalDraftTxCount = readyDrafts.reduce((acc, d) => acc + d.previewTransactions.length, 0);

  const summary = getMonthlySummary(selectedMonth, selectedYear);
  const dailyGroups = getDailyGroups(selectedMonth, selectedYear);
  const budgets = useBudgetStore((s) => s.budgets); // subscribe to force re-render
  const getBudgetStatus = useBudgetStore((s) => s.getBudgetStatus);
  const budgetStatus = getBudgetStatus(selectedMonth, selectedYear);
  const dailyBudget = budgetStatus.fixedDailyBudget;

  const userInitial = userName && userName.trim() ? userName.trim().charAt(0).toUpperCase() : null;
  const rawPhotoUrl = auth?.currentUser?.photoURL || auth?.currentUser?.providerData?.[0]?.photoURL || userPhotoUrl;
  const photoUrl = !imageFailed && rawPhotoUrl ? rawPhotoUrl : null;

  const isDark = colors.bg.primary === '#080810';
  const heroGradientColors = isDark ? ['#1A103C', '#0F0F24', '#090914'] : ['#6D28D9', '#7C3AED', '#5B21B6'];

  return (
    <GlassBackground style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Topbar Header Banner */}
      <View style={[
        styles.topbarContainer, 
        { 
          paddingTop: insets.top, 
          backgroundColor: colors.topbar.bg, 
          borderBottomColor: colors.topbar.border 
        },
        Platform.OS === 'web' && ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any)
      ]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={{ width: 26, height: 26, borderRadius: 7, marginRight: 8 }}
              resizeMode="contain"
            />
            <Text variant="lg" weight="bold" color={colors.topbar.text} style={{ letterSpacing: 0.4 }}>
              Hisab<Text variant="lg" weight="bold" color={isDark ? '#A78BFA' : '#FCD34D'} style={{ letterSpacing: 0.4 }}>AI</Text>
            </Text>
          </View>

          <TouchableOpacity 
            onPress={() => router.push('/profile')}
            style={[styles.profileBadge, { backgroundColor: colors.topbar.badgeBg, borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1, overflow: 'hidden' }]}
            activeOpacity={0.8}
          >
            {photoUrl ? (
              Platform.OS === 'web' ? (
                <img 
                  src={photoUrl} 
                  referrerPolicy="no-referrer" 
                  style={{ width: 32, height: 32, borderRadius: 16, objectFit: 'cover' }} 
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <Image 
                  source={{ uri: photoUrl }} 
                  style={{ width: 32, height: 32, borderRadius: 16 }} 
                  onError={() => setImageFailed(true)}
                />
              )
            ) : userInitial ? (
              <Text variant="sm" weight="bold" color={colors.topbar.badgeText}>
                {userInitial}
              </Text>
            ) : (
              <Ionicons name="person" size={16} color={colors.topbar.badgeText} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => {}} tintColor={colors.accent.primary} />}
      >
        {/* Translucent Blurry Glassmorphic Monthly Summary Card */}
        <View style={[
          styles.compactSummaryCard, 
          { 
            backgroundColor: Platform.OS === 'web' 
              ? (isDark ? 'rgba(19, 19, 31, 0.65)' : 'rgba(255, 255, 255, 0.85)')
              : (isDark ? '#13131F' : '#FFFFFF'), 
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.55)',
            ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any) : {})
          }
        ]}>
          {/* Integrated Month Selector inside card header */}
          <View style={styles.cardMonthHeader}>
            <TouchableOpacity onPress={goToPrevMonth} style={[styles.monthNavBtn, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 10 }]} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color={colors.text.secondary} />
            </TouchableOpacity>

            <Text variant="sm" weight="bold" color={colors.text.primary}>
              {new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Text>

            <TouchableOpacity 
              onPress={goToNextMonth} 
              style={[styles.monthNavBtn, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 10 }]} 
              disabled={selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="chevron-forward" 
                size={18} 
                color={(selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()) ? colors.text.tertiary : colors.text.secondary} 
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)' }]} />

          {/* 3-Column Compact Balance Summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="xs" color={colors.text.tertiary} weight="medium" style={{ fontSize: 10, letterSpacing: 0.4 }}>
                EXPENSES
              </Text>
              <Text variant="sm" weight="semibold" color={colors.semantic.expense} style={{ marginTop: 2 }}>
                {formatCurrency(summary.totalExpense, currency)}
              </Text>
            </View>

            <View style={[styles.columnDivider, { backgroundColor: colors.border.subtle }]} />

            <View style={styles.summaryItem}>
              <Text variant="xs" color={colors.text.tertiary} weight="medium" style={{ fontSize: 10, letterSpacing: 0.4 }}>
                INCOME
              </Text>
              <Text variant="sm" weight="semibold" color={colors.semantic.income} style={{ marginTop: 2 }}>
                {formatCurrency(summary.totalIncome, currency)}
              </Text>
            </View>

            <View style={[styles.columnDivider, { backgroundColor: colors.border.subtle }]} />

            <View style={styles.summaryItem}>
              <Text variant="xs" color={colors.text.tertiary} weight="medium" style={{ fontSize: 10, letterSpacing: 0.4 }}>
                BALANCE
              </Text>
              <Text
                variant="sm"
                weight="semibold"
                color={summary.balance >= 0 ? colors.semantic.income : colors.semantic.expense}
                style={{ marginTop: 2 }}
              >
                {formatCurrency(summary.balance, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Persistent Drafts Section */}
        {drafts.length > 0 && (
          <View
            style={[
              styles.draftsCard,
              {
                backgroundColor: Platform.OS === 'web'
                  ? (isDark ? 'rgba(23, 19, 44, 0.7)' : 'rgba(245, 243, 255, 0.85)')
                  : (isDark ? '#16132C' : '#F5F3FF'),
                borderColor: isDark ? 'rgba(167, 139, 250, 0.35)' : 'rgba(124, 58, 237, 0.35)',
              }
            ]}
          >
            <View style={styles.draftsCardHeader}>
              <View style={styles.draftsTitleContainer}>
                <View style={[styles.draftsBadge, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(124, 58, 237, 0.12)' }]}>
                  {processingDrafts.length > 0 && (
                    <ActivityIndicator size="small" color={colors.accent.primary} style={{ marginRight: 6 }} />
                  )}
                  <Text variant="xs" weight="bold" color={colors.accent.primary}>
                    {processingDrafts.length > 0
                      ? `${processingDrafts.length} AI Task${processingDrafts.length > 1 ? 's' : ''} Processing...`
                      : `${drafts.length} Saved AI Draft${drafts.length > 1 ? 's' : ''}`}
                  </Text>
                </View>
                {readyDrafts.length > 0 && (
                  <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 4 }}>
                    {totalDraftTxCount} transaction{totalDraftTxCount > 1 ? 's' : ''} ready to approve
                  </Text>
                )}
              </View>

              {readyDrafts.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.quickApproveBtn,
                    { backgroundColor: colors.semantic.incomeDim, borderColor: colors.semantic.income, borderWidth: 1 }
                  ]}
                  onPress={() => {
                    const count = approveAllReadyDrafts();
                    alert(`Approved and saved ${count} transaction${count > 1 ? 's' : ''} to your records!`);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-done" size={14} color={colors.semantic.income} />
                  <Text variant="xs" weight="bold" color={colors.semantic.income} style={{ marginLeft: 4 }}>
                    Approve All
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Snippet list of drafts */}
            <View style={styles.draftsListSnippet}>
              {drafts.slice(0, 3).map((d) => (
                <View 
                  key={d.id} 
                  style={[
                    styles.draftPill, 
                    { 
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                      borderColor: colors.border.subtle 
                    }
                  ]}
                >
                  <Ionicons 
                    name={d.source === 'voice' ? 'mic' : d.source === 'receipt' ? 'receipt' : 'chatbox-ellipses'} 
                    size={13} 
                    color={d.status === 'failed' ? colors.semantic.danger : d.status === 'processing' ? colors.accent.primary : colors.text.secondary} 
                  />
                  <Text variant="xs" weight="medium" color={colors.text.primary} numberOfLines={1} style={{ marginHorizontal: 6, flexShrink: 1, fontSize: 11 }}>
                    {d.title}
                  </Text>
                  {d.status === 'processing' ? (
                    <ActivityIndicator size="small" color={colors.accent.primary} style={{ transform: [{ scale: 0.6 }] }} />
                  ) : d.status === 'ready' ? (
                    <View style={[styles.miniStatusBadge, { backgroundColor: colors.semantic.incomeDim }]}>
                      <Text variant="xs" weight="bold" color={colors.semantic.income} style={{ fontSize: 9 }}>
                        {d.previewTransactions.length}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons name="alert-circle" size={13} color={colors.semantic.danger} />
                  )}
                </View>
              ))}
              {drafts.length > 3 && (
                <Text variant="xs" color={colors.text.tertiary} style={{ alignSelf: 'center', marginLeft: 4, fontSize: 11 }}>
                  +{drafts.length - 3} more
                </Text>
              )}
            </View>

            {/* Review Button */}
            <TouchableOpacity
              style={[styles.reviewDraftsButton, { backgroundColor: colors.accent.primary }]}
              onPress={() => router.push('/drafts' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text variant="xs" weight="bold" color="#FFFFFF">
                Review & Edit Drafts ({drafts.length})
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Daily Grouped Transactions List */}
        {dailyGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="md" weight="semibold" color={colors.text.secondary}>
              No transactions yet
            </Text>
            <Text variant="xs" color={colors.text.tertiary} align="center" style={styles.emptySubtitle}>
              Tap the (+) icon below or use voice to record your first transaction for this month.
            </Text>
            <TouchableOpacity 
              style={[styles.emptyAddBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => setIsAddModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
              <Text variant="xs" weight="bold" color="#FFFFFF" style={{ marginLeft: 6 }}>
                Add Entry Now
              </Text>
            </TouchableOpacity>
          </View>
        ) : (


          dailyGroups.map((group) => {
            const isDailyOverBudget = dailyBudget > 0 && group.totalExpense > dailyBudget;
            return (
              <View key={group.date} style={styles.dayGroup}>
                <View style={[styles.dayHeader, { backgroundColor: colors.bg.secondary }]}>
                  <View style={styles.dayHeaderLeft}>
                    <Text variant="xs" weight="medium" style={{ fontSize: 12 }}>
                      {group.dayName}
                    </Text>
                  </View>

                  <Text
                    variant="xs"
                    weight="medium"
                    style={{ fontSize: 11 }}
                    color={isDailyOverBudget ? colors.semantic.danger : colors.text.tertiary}
                  >
                    Expenses: {formatCurrency(group.totalExpense, currency)}
                  </Text>
                </View>

                <View style={[styles.transactionList, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder, borderWidth: 1, borderRadius: Radii.md, overflow: 'hidden' }]}>
                  {group.transactions.map((tx, idx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      isLast={idx === group.transactions.length - 1}
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

      <AddOptionModal 
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
      />
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topbarContainer: {
    borderBottomWidth: 1,
    paddingBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Colors.accent.primary,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
  },
  compactSummaryCard: {
    marginHorizontal: Spacing.md,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cardMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  monthNavBtn: {
    padding: 4,
  },
  cardDivider: {
    height: 1,
    marginVertical: Spacing.xs + 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  columnDivider: {
    width: 1,
    height: 24,
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
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  transactionList: {},
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
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  draftsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  draftsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  draftsTitleContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  draftsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  quickApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  draftsListSnippet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  draftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
    maxWidth: 160,
  },
  miniStatusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  reviewDraftsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radii.md,
  },
});
