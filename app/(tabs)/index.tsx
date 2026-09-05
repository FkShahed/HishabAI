import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

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
  const totalDraftAmount = useMemo(() => {
    return readyDrafts.reduce((sum, d) => {
      return sum + d.previewTransactions.reduce((itemSum, tx) => itemSum + (tx.amount || 0), 0);
    }, 0);
  }, [readyDrafts]);

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
          <View style={[styles.draftsCard, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder }]}>
            {/* Header */}
            <View style={styles.draftsCardHeader}>
              <View style={styles.draftsHeaderLeft}>
                <View style={[styles.draftsIconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons 
                    name={processingDrafts.length > 0 ? "sync" : "documents"} 
                    size={17} 
                    color={colors.accent.primary} 
                  />
                </View>
                <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text variant="sm" weight="bold">
                      {processingDrafts.length > 0 ? 'AI Processing in Background' : 'Pending AI Drafts'}
                    </Text>
                    {processingDrafts.length > 0 ? (
                      <View style={[styles.draftStatusPill, { backgroundColor: colors.accent.primaryDim, borderColor: colors.accent.primary }]}>
                        <ActivityIndicator size="small" color={colors.accent.primary} style={{ transform: [{ scale: 0.6 }], marginRight: 2 }} />
                        <Text variant="xs" weight="bold" color={colors.accent.primary} style={{ fontSize: 10 }}>
                          {processingDrafts.length} running
                        </Text>
                      </View>
                    ) : readyDrafts.length > 0 ? (
                      <View style={[styles.draftStatusPill, { backgroundColor: colors.semantic.incomeDim, borderColor: colors.semantic.income }]}>
                        <Text variant="xs" weight="bold" color={colors.semantic.income} style={{ fontSize: 10 }}>
                          {readyDrafts.length} ready
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                    {readyDrafts.length > 0
                      ? `${totalDraftTxCount} item${totalDraftTxCount > 1 ? 's' : ''} ready to approve • Total ${formatCurrency(totalDraftAmount, currency)}`
                      : 'AI tasks are processing in background...'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Compact Preview List of Drafts */}
            <View style={[styles.draftsListContainer, { borderColor: colors.border.subtle, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' }]}>
              {drafts.slice(0, 2).map((d, index) => {
                const draftTotal = d.previewTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
                const isLast = index === Math.min(drafts.length, 2) - 1;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.draftItemRow,
                      !isLast && { borderBottomColor: colors.border.subtle, borderBottomWidth: 1 }
                    ]}
                    onPress={() => router.push('/drafts' as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.draftItemLeft}>
                      <View style={[
                        styles.draftSourceIconCircle,
                        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }
                      ]}>
                        <Ionicons 
                          name={d.source === 'voice' ? 'mic' : d.source === 'receipt' ? 'receipt' : 'chatbox-ellipses'} 
                          size={13} 
                          color={d.status === 'failed' ? colors.semantic.danger : colors.accent.primary} 
                        />
                      </View>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text variant="xs" weight="semibold" numberOfLines={1}>
                          {d.title}
                        </Text>
                        <Text variant="xs" color={colors.text.tertiary} style={{ fontSize: 10, marginTop: 1 }}>
                          {format(new Date(d.createdAt), 'hh:mm a')} • {d.previewTransactions.length} item{d.previewTransactions.length === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.draftItemRight}>
                      {d.status === 'processing' ? (
                        <ActivityIndicator size="small" color={colors.accent.primary} style={{ transform: [{ scale: 0.7 }] }} />
                      ) : d.status === 'ready' ? (
                        <Text variant="xs" weight="bold" color={colors.text.primary}>
                          {formatCurrency(draftTotal, currency)}
                        </Text>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="alert-circle" size={14} color={colors.semantic.danger} />
                          <Text variant="xs" color={colors.semantic.danger} style={{ fontSize: 10, marginLeft: 2 }}>Failed</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {drafts.length > 2 && (
                <TouchableOpacity 
                  style={[styles.draftMoreNotice, { borderTopColor: colors.border.subtle }]}
                  onPress={() => router.push('/drafts' as any)}
                  activeOpacity={0.7}
                >
                  <Text variant="xs" color={colors.accent.primary} weight="medium" style={{ fontSize: 11 }}>
                    +{drafts.length - 2} more draft{drafts.length - 2 > 1 ? 's' : ''} in review queue
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.accent.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Action Bar */}
            <View style={styles.draftsActionsRow}>
              {readyDrafts.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.draftQuickApproveBtn,
                    { borderColor: colors.semantic.income, backgroundColor: colors.semantic.incomeDim }
                  ]}
                  onPress={() => {
                    const count = approveAllReadyDrafts();
                    alert(`Approved and saved ${count} transaction${count > 1 ? 's' : ''} to your records!`);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.semantic.income} />
                  <Text variant="xs" weight="bold" color={colors.semantic.income} style={{ marginLeft: 4 }}>
                    Approve All ({readyDrafts.length})
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.draftReviewBtn,
                  { backgroundColor: colors.accent.primary, flex: readyDrafts.length > 0 ? 1 : undefined, width: readyDrafts.length > 0 ? undefined : '100%' }
                ]}
                onPress={() => router.push('/drafts' as any)}
                activeOpacity={0.8}
              >
                <Text variant="xs" weight="bold" color="#FFFFFF">
                  Review & Edit
                </Text>
                <Ionicons name="chevron-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
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
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  draftsCardHeader: {
    marginBottom: Spacing.sm,
  },
  draftsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftsIconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginLeft: 6,
  },
  draftsListContainer: {
    borderRadius: Radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  draftItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  draftItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  draftSourceIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftItemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  draftMoreNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
  },
  draftsActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  draftQuickApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  draftReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.md,
  },
});
