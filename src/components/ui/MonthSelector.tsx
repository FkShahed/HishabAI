import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Spacing, useThemeColors } from '../../constants/colors';
import { getMonthLabel } from '../../utils/finance';

export interface MonthSelectorProps {
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthSelector({ month, year, onPrev, onNext }: MonthSelectorProps) {
  const colors = useThemeColors();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isCurrentMonth = month === currentMonth && year === currentYear;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <TouchableOpacity onPress={onPrev} style={styles.button}>
        <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <Text variant="lg" weight="semibold" style={styles.label}>
        {getMonthLabel(month, year)}
      </Text>

      <TouchableOpacity
        onPress={onNext}
        style={styles.button}
        disabled={isCurrentMonth}
      >
        <Ionicons
          name="chevron-forward"
          size={24}
          color={isCurrentMonth ? colors.text.tertiary : colors.text.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  button: {
    padding: Spacing.sm,
  },
  label: {
    minWidth: 150,
    textAlign: 'center',
  },
});
