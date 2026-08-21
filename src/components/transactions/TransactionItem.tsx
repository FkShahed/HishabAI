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
  isLast?: boolean;
}

export function TransactionItem({ transaction, onPress, showDate = false, isLast = false }: TransactionItemProps) {
  const currency = useUIStore((s) => s.currency);
  const colors = useThemeColors();
  const isDark = colors.bg.primary === '#080810';

  const getSourceIcon = () => {
    switch (transaction.source) {
      case 'voice': return 'mic';
      case 'receipt': return 'receipt';
      default: return null;
    }
  };

  const sourceIcon = getSourceIcon();
  const rowDividerColor = isDark ? colors.bg.glassBorder : 'rgba(0, 0, 0, 0.04)';

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { 
          backgroundColor: 'transparent', 
          borderBottomColor: isLast ? 'transparent' : rowDividerColor,
          borderBottomWidth: isLast ? 0 : 1,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.left}>
        <CategoryIcon
          icon={transaction.categoryIcon}
          color={transaction.categoryColor}
          size="sm"
        />
        <View style={styles.info}>
          <Text variant="sm" weight="medium" numberOfLines={1}>
            {transaction.categoryNameSnapshot}
          </Text>
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
          weight="semibold"
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
