import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  isSameDay,
  isAfter
} from 'date-fns';

import { Text } from './Text';
import { Button } from './Button';
import { Spacing, Radii, useThemeColors } from '../../constants/colors';

export interface DatePickerModalProps {
  visible: boolean;
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

export function DatePickerModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}: DatePickerModalProps) {
  const colors = useThemeColors();
  const initialDate = selectedDate ? parseISO(selectedDate) : new Date();
  const [viewDate, setViewDate] = useState<Date>(initialDate);
  const [tempSelected, setTempSelected] = useState<Date>(initialDate);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate empty leading slots for first day of month (0 = Sun, 1 = Mon, etc.)
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array.from({ length: startDayOfWeek });

  const handleConfirm = () => {
    onSelectDate(format(tempSelected, 'yyyy-MM-dd'));
    onClose();
  };

  const today = new Date();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle, borderWidth: 1 }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border.subtle }]}>
            <Text variant="lg" weight="bold">Select Date</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => setViewDate(subMonths(viewDate, 1))}>
              <Ionicons name="chevron-back" size={24} color={colors.accent.primary} />
            </TouchableOpacity>
            <Text variant="md" weight="bold">
              {format(viewDate, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity onPress={() => setViewDate(addMonths(viewDate, 1))}>
              <Ionicons name="chevron-forward" size={24} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <Text key={day} variant="xs" weight="bold" color={colors.text.tertiary} style={styles.weekdayCell}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>
            {paddingDays.map((_, i) => (
              <View key={`pad-${i}`} style={styles.dayCell} />
            ))}
            {daysInMonth.map((day) => {
              const isSelected = isSameDay(day, tempSelected);
              const isFuture = isAfter(day, today);

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.accent.primary },
                  ]}
                  disabled={isFuture}
                  onPress={() => setTempSelected(day)}
                >
                  <Text
                    variant="sm"
                    weight={isSelected ? 'bold' : 'regular'}
                    color={
                      isSelected
                        ? '#FFFFFF'
                        : isFuture
                        ? colors.text.tertiary
                        : colors.text.primary
                    }
                  >
                    {format(day, 'd')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.footer}>
            <Button label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1, marginRight: Spacing.sm }} />
            <Button label="Confirm" onPress={handleConfirm} style={{ flex: 1 }} />
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  },
  weekdayCell: {
    width: 34,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.full,
    marginVertical: 1,
  },
  dayCellSelected: {
  },
  footer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
});
