import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { Button } from './Button';
import { Spacing, Radii, useThemeColors } from '../../constants/colors';
import { useCategoryStore } from '../../store';
import { AVAILABLE_CATEGORY_ICONS } from '../../constants/categories';
import { CategoryIcon } from './CategoryIcon';

let BlurViewComponent: any = null;
try {
  BlurViewComponent = require('expo-blur').BlurView;
} catch (e) {}

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: 'expense' | 'income';
  onCategoryCreated?: (categoryId: string) => void;
}

const CATEGORY_COLORS = [
  '#8B5CF6', '#06B6D4', '#F59E0B', '#EC4899', 
  '#10B981', '#3B82F6', '#EF4444', '#84CC16', 
  '#F97316', '#6366F1', '#14B8A6', '#D97706',
  '#A855F7', '#EAB308', '#F472B6', '#22C55E'
];

export function AddCategoryModal({ visible, onClose, initialType = 'expense', onCategoryCreated }: AddCategoryModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const addCategory = useCategoryStore((s) => s.addCategory);

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [selectedIcon, setSelectedIcon] = useState('🏷️');
  const [selectedColor, setSelectedColor] = useState('#10B981');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('Category name is required');
      return;
    }

    const newCat = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      type,
      isActive: true,
      isDefault: false,
      sortOrder: 99,
    };

    addCategory(newCat);
    if (onCategoryCreated) {
      onCategoryCreated(newCat.id);
    }
    
    // Reset form
    setName('');
    setSelectedIcon('🏷️');
    setErrorMsg('');
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
                paddingBottom: Math.max(insets.bottom, 20) + 12,
              }
            ]}>
              <View style={[styles.handleBar, { backgroundColor: colors.border.medium }]} />

              <View style={styles.sheetHeader}>
                <Text variant="lg" weight="bold">Create Custom Category</Text>
                <TouchableOpacity 
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: colors.bg.secondary }]}
                >
                  <Ionicons name="close" size={18} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                {/* Type Selector Toggle */}
                <View style={[styles.typeToggleContainer, { backgroundColor: colors.bg.secondary }]}>
                  <TouchableOpacity
                    style={[styles.typeToggleBtn, type === 'expense' && { backgroundColor: colors.semantic.expense }]}
                    onPress={() => setType('expense')}
                    activeOpacity={0.8}
                  >
                    <Text variant="xs" weight="bold" color={type === 'expense' ? '#FFFFFF' : colors.text.secondary}>
                      Expense
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeToggleBtn, type === 'income' && { backgroundColor: colors.semantic.income }]}
                    onPress={() => setType('income')}
                    activeOpacity={0.8}
                  >
                    <Text variant="xs" weight="bold" color={type === 'income' ? '#FFFFFF' : colors.text.secondary}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Preview Badge */}
                <View style={styles.previewContainer}>
                  <CategoryIcon icon={selectedIcon} color={selectedColor} size="lg" />
                  <Text variant="sm" weight="bold" style={{ marginTop: 6 }}>
                    {name.trim() || 'Category Preview'}
                  </Text>
                </View>

                {/* Name Input */}
                <Text variant="xs" weight="bold" color={colors.text.secondary} style={styles.inputLabel}>
                  CATEGORY NAME
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.bg.card, borderColor: errorMsg ? colors.semantic.danger : colors.border.subtle, color: colors.text.primary }
                  ]}
                  value={name}
                  onChangeText={(val) => { setName(val); setErrorMsg(''); }}
                  placeholder="e.g. Subscriptions, Snacks, Fuel"
                  placeholderTextColor={colors.text.tertiary}
                  maxLength={24}
                />
                {errorMsg ? (
                  <Text variant="xs" color={colors.semantic.danger} style={{ marginTop: 4 }}>
                    {errorMsg}
                  </Text>
                ) : null}

                {/* Color Palette */}
                <Text variant="xs" weight="bold" color={colors.text.secondary} style={styles.inputLabel}>
                  THEME COLOR
                </Text>
                <View style={styles.colorPalette}>
                  {CATEGORY_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        selectedColor === c && { borderWidth: 3, borderColor: '#FFFFFF', transform: [{ scale: 1.1 }] }
                      ]}
                      onPress={() => setSelectedColor(c)}
                    />
                  ))}
                </View>

                {/* Emoji / Vector Icon Library (80+ Icons) */}
                <Text variant="xs" weight="bold" color={colors.text.secondary} style={styles.inputLabel}>
                  CHOOSE ICON ({AVAILABLE_CATEGORY_ICONS.length}+ Icons)
                </Text>
                <View style={styles.iconGrid}>
                  {AVAILABLE_CATEGORY_ICONS.map((ic, idx) => {
                    const isSelected = selectedIcon === ic;
                    return (
                      <TouchableOpacity
                        key={`${ic}_${idx}`}
                        style={[
                          styles.iconChip,
                          isSelected && { transform: [{ scale: 1.1 }] }
                        ]}
                        onPress={() => setSelectedIcon(ic)}
                        activeOpacity={0.8}
                      >
                        <CategoryIcon 
                          icon={ic} 
                          color={isSelected ? selectedColor : colors.text.tertiary} 
                          size="sm" 
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={{ marginTop: Spacing.md }}>
                <Button label="Save Category" onPress={handleSave} />
              </View>
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeToggleContainer: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radii.sm,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
  },
  inputLabel: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  textInput: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconChip: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
