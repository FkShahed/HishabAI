import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';

import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Header } from '../../src/components/ui/Header';
import { Button } from '../../src/components/ui/Button';
import { Colors, Spacing, Radii, Typography, useThemeColors } from '../../src/constants/colors';
import { useCategoryStore, useTransactionStore, useUIStore } from '../../src/store';
import { getTodayString, getYesterdayString, formatDateDisplay, evaluateMathExpression } from '../../src/utils/finance';
import { Category } from '../../src/types';
import { CategoryIcon } from '../../src/components/ui/CategoryIcon';
import { DatePickerModal } from '../../src/components/ui/DatePickerModal';

type FormData = {
  amount: string;
  comment: string;
  categoryId: string;
  transactionDate: string;
};

import { CalculatorKeypadModal } from '../../src/components/ui/CalculatorKeypadModal';
import { AddCategoryModal } from '../../src/components/ui/AddCategoryModal';

export default function ManualAddScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const getCategoriesForType = useCategoryStore((s) => s.getCategoriesForType);
  const currency = useUIStore((s) => s.currency);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(true);
  const [isAddCatModalVisible, setIsAddCatModalVisible] = useState(false);

  const categories = getCategoriesForType(type);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      amount: '',
      comment: '',
      categoryId: '',
      transactionDate: getTodayString(),
    },
  });

  const selectedDate = watch('transactionDate');
  const amountValue = watch('amount');

  const onSubmit = (data: FormData) => {
    const category = categories.find((c) => c.id === data.categoryId);
    if (!category) return;

    const amountVal = evaluateMathExpression(data.amount) ?? parseFloat(data.amount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    addTransaction({
      id: Math.random().toString(36).substr(2, 9),
      userId: 'mock-user',
      amount: amountVal,
      type,
      categoryId: category.id,
      categoryNameSnapshot: category.name,
      categoryIcon: category.icon,
      categoryColor: category.color,
      transactionDate: data.transactionDate || getTodayString(),
      comment: data.comment,
      source: 'manual',
      aiGenerated: false,
      currency: currency,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    router.replace('/(tabs)');
  };

  const isCustomDate = selectedDate !== getTodayString() && selectedDate !== getYesterdayString();

  return (
    <GlassBackground style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Header 
          title="Add Transaction" 
          showBack 
          onBack={() => router.back()} 
        />
        
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
          {/* 1. Type Toggle (Top Tab) */}
          <View style={[styles.toggleContainer, { backgroundColor: colors.bg.secondary }]}>
          <TouchableOpacity
            style={[styles.toggleButton, type === 'expense' && styles.toggleActiveExpense]}
            onPress={() => { setType('expense'); setValue('categoryId', ''); }}
          >
            <Text 
              variant="md" 
              weight={type === 'expense' ? 'bold' : 'medium'}
              color={type === 'expense' ? '#FFFFFF' : colors.text.secondary}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, type === 'income' && styles.toggleActiveIncome]}
            onPress={() => { setType('income'); setValue('categoryId', ''); }}
          >
            <Text 
              variant="md" 
              weight={type === 'income' ? 'bold' : 'medium'}
              color={type === 'income' ? '#FFFFFF' : colors.text.secondary}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Date Option */}
        <View style={styles.inputGroup}>
          <Text variant="sm" color={colors.text.secondary} style={styles.label}>Date</Text>
          
          <View style={styles.dateSelectionRow}>
            <TouchableOpacity
              style={[
                styles.dateChip,
                { backgroundColor: colors.bg.secondary },
                selectedDate === getTodayString() && { borderColor: colors.accent.primary, backgroundColor: colors.accent.primaryDim },
              ]}
              onPress={() => setValue('transactionDate', getTodayString())}
            >
              <Ionicons 
                name="calendar-outline" 
                size={16} 
                color={selectedDate === getTodayString() ? colors.accent.primary : colors.text.secondary} 
              />
              <Text 
                variant="sm" 
                weight={selectedDate === getTodayString() ? "bold" : "medium"}
                color={selectedDate === getTodayString() ? colors.text.primary : colors.text.secondary}
                style={{ marginLeft: 6 }}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                { backgroundColor: colors.bg.secondary },
                selectedDate === getYesterdayString() && { borderColor: colors.accent.primary, backgroundColor: colors.accent.primaryDim },
              ]}
              onPress={() => setValue('transactionDate', getYesterdayString())}
            >
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={selectedDate === getYesterdayString() ? colors.accent.primary : colors.text.secondary} 
              />
              <Text 
                variant="sm"
                weight={selectedDate === getYesterdayString() ? "bold" : "medium"}
                color={selectedDate === getYesterdayString() ? colors.text.primary : colors.text.secondary}
                style={{ marginLeft: 6 }}
              >
                Yesterday
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                { backgroundColor: colors.bg.secondary },
                isCustomDate && { borderColor: colors.accent.primary, backgroundColor: colors.accent.primaryDim },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons 
                name="ellipsis-horizontal-circle-outline" 
                size={16} 
                color={isCustomDate ? colors.accent.primary : colors.text.secondary} 
              />
              <Text 
                variant="sm"
                weight={isCustomDate ? "bold" : "medium"}
                color={isCustomDate ? colors.text.primary : colors.text.secondary}
                style={{ marginLeft: 6 }}
              >
                {isCustomDate ? formatDateDisplay(selectedDate) : 'Other Date'}
              </Text>
            </TouchableOpacity>
          </View>

          <DatePickerModal
            visible={showDatePicker}
            selectedDate={selectedDate}
            onClose={() => setShowDatePicker(false)}
            onSelectDate={(newDate) => setValue('transactionDate', newDate)}
          />
        </View>

        {/* 3. Amount */}
        <View style={styles.inputGroup}>
          <Text variant="sm" color={colors.text.secondary} style={styles.label}>Amount</Text>

          <TouchableOpacity 
            style={[styles.amountContainer, { borderBottomColor: colors.border.medium }]}
            onPress={() => setIsCalcOpen(true)}
            activeOpacity={0.8}
          >
            <Text variant="xxxl" weight="bold" color={colors.text.tertiary}>৳</Text>
            <Controller
              control={control}
              rules={{ 
                required: true, 
                validate: (val) => {
                  const num = evaluateMathExpression(val) ?? parseFloat(val);
                  return !isNaN(num) && num > 0;
                } 
              }}
              render={({ field: { value } }) => (
                <View style={{ flex: 1, pointerEvents: 'none' }}>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text.primary }]}
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                    value={value}
                    editable={false}
                  />
                </View>
              )}
              name="amount"
            />
          </TouchableOpacity>
          {errors.amount && <Text variant="xs" color={colors.semantic.danger} style={{ marginTop: 4 }}>Please enter a valid amount</Text>}
        </View>

        <CalculatorKeypadModal
          visible={isCalcOpen}
          initialValue={amountValue}
          onClose={() => setIsCalcOpen(false)}
          onApply={(calcAmount) => setValue('amount', calcAmount)}
        />

        {/* 4. Comment / Note */}
        <View style={styles.inputGroup}>
          <Text variant="sm" color={colors.text.secondary} style={styles.label}>Note (Optional)</Text>
          <Controller
            control={control}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.secondary, color: colors.text.primary }]}
                placeholder="What was this for? (e.g. Grocery, Rent)"
                placeholderTextColor={colors.text.tertiary}
                value={value}
                onChangeText={onChange}
              />
            )}
            name="comment"
          />
        </View>

        {/* 5. Category Selection */}
        <View style={styles.inputGroup}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs }}>
            <Text variant="sm" color={colors.text.secondary} style={styles.label}>Category</Text>
            <TouchableOpacity 
              onPress={() => setIsAddCatModalVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="add-circle" size={14} color={colors.accent.primary} />
              <Text variant="xs" weight="bold" color={colors.accent.primary} style={{ marginLeft: 4 }}>
                + Add Custom Icon
              </Text>
            </TouchableOpacity>
          </View>
          {errors.categoryId && <Text variant="xs" color={colors.semantic.danger} style={{ marginBottom: 8 }}>Please select a category</Text>}
          
          <Controller
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.categoryGrid}>
                {categories.map((cat: Category) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryItem,
                      value === cat.id && { backgroundColor: colors.accent.primaryDim, borderRadius: Radii.md }
                    ]}
                    onPress={() => onChange(cat.id)}
                  >
                    <CategoryIcon 
                      icon={cat.icon} 
                      color={value === cat.id ? cat.color : colors.text.tertiary} 
                      size="sm" 
                    />
                    <Text 
                      variant="xs" 
                      weight={value === cat.id ? "bold" : "regular"}
                      color={value === cat.id ? colors.accent.primary : colors.text.secondary}
                      style={styles.categoryName}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* + Add New Custom Category Button */}
                <TouchableOpacity
                  style={[styles.categoryItem]}
                  onPress={() => setIsAddCatModalVisible(true)}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.accent.primaryDim, alignItems: 'center', justifyContent: 'center', borderColor: colors.accent.primary, borderWidth: 1 }}>
                    <Ionicons name="add" size={18} color={colors.accent.primary} />
                  </View>
                  <Text 
                    variant="xs" 
                    weight="bold"
                    color={colors.accent.primary}
                    style={styles.categoryName}
                    numberOfLines={1}
                  >
                    + Add New
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            name="categoryId"
          />
        </View>

      </ScrollView>

      <AddCategoryModal
        visible={isAddCatModalVisible}
        onClose={() => setIsAddCatModalVisible(false)}
        initialType={type}
        onCategoryCreated={(newId) => setValue('categoryId', newId)}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg), backgroundColor: colors.bg.glassHeader, borderTopColor: colors.bg.glassBorder, borderTopWidth: 1 }]}>
        <Button 
          label="Save Transaction" 
          onPress={handleSubmit(onSubmit)}
          style={{ width: '100%' }}
        />
      </View>
    </KeyboardAvoidingView>
  </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Radii.lg,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  toggleActiveExpense: {
    backgroundColor: Colors.semantic.expense,
  },
  toggleActiveIncome: {
    backgroundColor: Colors.semantic.income,
  },
  dateSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateChipActive: {
    borderColor: Colors.accent.primary,
    backgroundColor: Colors.accent.primaryDim,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.strong,
    paddingBottom: Spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  textInput: {
    color: Colors.text.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    fontSize: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
    padding: Spacing.xs + 2,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryItemActive: {
    borderColor: Colors.border.strong,
  },
  categoryName: {
    marginTop: 2,
    textAlign: 'center',
  },
  mathToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: Spacing.sm,
  },
  mathBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  calcPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    marginLeft: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
});
