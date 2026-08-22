import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from './Text';
import { Spacing, Radii, Shadows, useThemeColors } from '../../constants/colors';
import { useUIStore } from '../../store';
import { evaluateMathExpression, formatCurrency } from '../../utils/finance';

let BlurViewComponent: any = null;

interface CalculatorKeypadModalProps {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  onApply: (amount: string) => void;
}

export function CalculatorKeypadModal({ visible, initialValue, onClose, onApply }: CalculatorKeypadModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const currency = useUIStore((s) => s.currency);

  const [expression, setExpression] = useState('');

  useEffect(() => {
    if (visible) {
      setExpression(initialValue || '');
    }
  }, [visible, initialValue]);

  const evaluatedResult = evaluateMathExpression(expression);

  const triggerHaptic = (type: 'selection' | 'impact' | 'success' = 'selection') => {
    try {
      if (type === 'selection') {
        Haptics.selectionAsync();
      } else if (type === 'impact') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      // Ignore if haptics aren't supported on web/simulator
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'C') {
      triggerHaptic('impact');
      setExpression('');
      return;
    }

    if (key === 'DEL') {
      triggerHaptic('impact');
      setExpression((prev) => prev.slice(0, -1).trim());
      return;
    }

    if (key === '=') {
      triggerHaptic('impact');
      if (evaluatedResult !== null) {
        setExpression(String(evaluatedResult));
      }
      return;
    }

    triggerHaptic('selection');

    if (key === '%') {
      if (evaluatedResult !== null) {
        setExpression(String(evaluatedResult / 100));
      } else if (expression.trim()) {
        const num = parseFloat(expression);
        if (!isNaN(num)) setExpression(String(num / 100));
      }
      return;
    }

    if (['+', '-', '×', '÷'].includes(key)) {
      setExpression((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) return '';
        const lastChar = trimmed.slice(-1);
        if (['+', '-', '×', '÷', '*', '/'].includes(lastChar)) {
          return `${trimmed.slice(0, -1)} ${key} `;
        }
        return `${trimmed} ${key} `;
      });
      return;
    }

    // Number or decimal point
    setExpression((prev) => `${prev}${key}`);
  };

  const handleDone = () => {
    triggerHaptic('success');
    const finalVal = evaluatedResult !== null ? String(evaluatedResult) : expression.trim();
    onApply(finalVal || '0');
    onClose();
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[
          styles.backdrop,
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
              styles.sheetContainer,
              { 
                backgroundColor: colors.bg.modal,
                borderColor: colors.border.subtle,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              }
            ]}>
              {/* Handle bar */}
              <View style={[styles.handleBar, { backgroundColor: colors.border.medium }]} />

              {/* Header / Title */}
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.calcBadge, { backgroundColor: colors.accent.primaryDim }]}>
                    <Ionicons name="calculator" size={18} color={colors.accent.primary} />
                  </View>
                  <Text variant="md" weight="bold" style={{ marginLeft: 8 }}>Smart Calculator</Text>
                </View>

                <TouchableOpacity 
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: colors.bg.secondary }]}
                >
                  <Ionicons name="close" size={18} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* Calculator Display Box */}
              <View style={[styles.displayCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
                <Text variant="xs" color={colors.text.secondary} align="right" numberOfLines={1} style={{ marginBottom: 2 }}>
                  {expression ? `${expression} =` : 'Enter calculation'}
                </Text>

                <View style={styles.displayAmountRow}>
                  <Text variant="xxl" weight="bold" color={colors.text.primary} align="right" numberOfLines={1} style={styles.heroAmountText}>
                    {formatCurrency((evaluatedResult ?? parseFloat(expression)) || 0, currency)}
                  </Text>
                </View>
              </View>

              {/* Keypad Grid */}
              <View style={styles.keypadGrid}>
                {/* Row 1 */}
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.secondary }]} onPress={() => handleKeyPress('C')}>
                  <Text variant="lg" weight="bold" color={colors.semantic.expense}>C</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.secondary }]} onPress={() => handleKeyPress('÷')}>
                  <Text variant="lg" weight="bold" color={colors.accent.primary}>÷</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.secondary }]} onPress={() => handleKeyPress('×')}>
                  <Text variant="lg" weight="bold" color={colors.accent.primary}>×</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.secondary }]} onPress={() => handleKeyPress('DEL')}>
                  <Ionicons name="backspace-outline" size={22} color={colors.text.secondary} />
                </TouchableOpacity>

                {/* Row 2 */}
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('7')}>
                  <Text variant="xl" weight="bold">7</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('8')}>
                  <Text variant="xl" weight="bold">8</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('9')}>
                  <Text variant="xl" weight="bold">9</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.secondary }]} onPress={() => handleKeyPress('-')}>
                  <Text variant="xl" weight="bold" color={colors.accent.primary}>-</Text>
                </TouchableOpacity>

                {/* Row 3 */}
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('4')}>
                  <Text variant="xl" weight="bold">4</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('5')}>
                  <Text variant="xl" weight="bold">5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('6')}>
                  <Text variant="xl" weight="bold">6</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.secondary }]} onPress={() => handleKeyPress('+')}>
                  <Text variant="xl" weight="bold" color={colors.accent.primary}>+</Text>
                </TouchableOpacity>

                {/* Row 4 */}
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('1')}>
                  <Text variant="xl" weight="bold">1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('2')}>
                  <Text variant="xl" weight="bold">2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('3')}>
                  <Text variant="xl" weight="bold">3</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.secondary }]} onPress={() => handleKeyPress('%')}>
                  <Text variant="xl" weight="bold" color={colors.accent.primary}>%</Text>
                </TouchableOpacity>

                {/* Row 5 */}
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('0')}>
                  <Text variant="xl" weight="bold">0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('00')}>
                  <Text variant="xl" weight="bold">00</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.bg.card }]} onPress={() => handleKeyPress('.')}>
                  <Text variant="xl" weight="bold">.</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: colors.accent.primaryDim }]} onPress={() => handleKeyPress('=')}>
                  <Text variant="xl" weight="bold" color={colors.accent.primary}>=</Text>
                </TouchableOpacity>
              </View>

              {/* Dedicated Prominent Full-Width Done Button */}
              <TouchableOpacity 
                style={[styles.fullApplyBtn, { backgroundColor: colors.accent.primary }]} 
                onPress={handleDone}
                activeOpacity={0.8}
              >
                <Text variant="md" weight="bold" color="#FFFFFF">
                  Done ✓  (Apply {formatCurrency((evaluatedResult ?? parseFloat(expression)) || 0, currency)})
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  calcBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    justifyContent: 'center',
  },
  displayAmountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  heroAmountText: {
    fontSize: 28,
    lineHeight: 34,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  keyBtn: {
    width: '23%',
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBtnDouble: {
    width: '48%',
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullApplyBtn: {
    width: '100%',
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
