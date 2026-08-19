import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Transaction } from '../../types';
import { Spacing, useThemeColors } from '../../constants/colors';
import { formatSignedAmount, formatDateShort } from '../../utils/finance';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../../store';

export interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  showDate?: boolean;
}

export function TransactionItem({ transaction, onPress, showDate = false }: TransactionItemProps) {
  const currency = useUIStore((s) => s.currency);
  const colors = useThemeColors();

  const getSourceIcon = () => {
    switch (transaction.source) {
      case 'voice': return 'mic';
      case 'receipt': return 'receipt';
      default: return null;
    }
  };

  const sourceIcon = getSourceIcon();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.left}>
        <CategoryIcon
          icon={transaction.categoryIcon}
          color={transaction.categoryColor}
          size="md"
        />
        <View style={styles.info}>
          <Text variant="sm" weight="bold" numberOfLines={1}>
            {transaction.categoryNameSnapshot}
          </Text>
          {transaction.comment ? (
            <Text variant="xs" color={colors.text.secondary} numberOfLines={1} style={{ marginTop: 1, fontSize: 11 }}>
              {transaction.comment}
            </Text>
          ) : null}
          {showDate && (
            <Text variant="xs" color={colors.text.tertiary} style={styles.date}>
              {formatDateShort(transaction.transactionDate)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.right}>
        {sourceIcon && (
          <View style={styles.sourceBadge}>
            <Ionicons name="sparkles" size={11} color={colors.accent.primary} />
          </View>
        )}
        <Text
          variant="sm"
          weight="bold"
          color={
            transaction.type === 'expense'
              ? colors.text.primary
              : transaction.type === 'income'
              ? colors.semantic.income
              : colors.text.primary
          }
        >
          {formatSignedAmount(transaction.amount, transaction.type, currency)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  info: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  date: {
    marginTop: 2,
  },
  sourceBadge: {
    marginRight: 6,
  },
});
