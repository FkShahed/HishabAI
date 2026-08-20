import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { Button } from '../../src/components/ui/Button';
import { CategoryIcon } from '../../src/components/ui/CategoryIcon';
import { AddCategoryModal } from '../../src/components/ui/AddCategoryModal';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useCategoryStore } from '../../src/store';
import { Category } from '../../src/types';

export default function ManageCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const categories = useCategoryStore((s) => s.categories);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const handleDeleteCategory = (cat: Category) => {
    if (cat.isDefault) {
      Alert.alert('Default Category', 'Default system categories cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteCategory(cat.id)
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title="Manage Categories" 
        showBack={true} 
        onBack={() => router.back()} 
      />

      <View style={styles.content}>
        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: colors.bg.secondary }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'expense' && { backgroundColor: colors.semantic.expense }]}
            onPress={() => setActiveTab('expense')}
            activeOpacity={0.8}
          >
            <Text 
              variant="xs" 
              weight="bold" 
              color={activeTab === 'expense' ? '#FFFFFF' : colors.text.secondary}
            >
              Expense ({categories.filter(c => c.type === 'expense').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'income' && { backgroundColor: colors.semantic.income }]}
            onPress={() => setActiveTab('income')}
            activeOpacity={0.8}
          >
            <Text 
              variant="xs" 
              weight="bold" 
              color={activeTab === 'income' ? '#FFFFFF' : colors.text.secondary}
            >
              Income ({categories.filter(c => c.type === 'income').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Category Header Button */}
        <TouchableOpacity
          style={[styles.addCardBtn, { backgroundColor: colors.accent.primaryDim, borderColor: colors.accent.primary }]}
          onPress={() => setIsAddModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.addIconCircle, { backgroundColor: colors.accent.primary }]}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text variant="sm" weight="bold" color={colors.accent.primary}>
              + Add New Custom Category
            </Text>
            <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 1 }}>
              Choose from 80+ icons & theme colors
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.accent.primary} />
        </TouchableOpacity>

        {/* Categories List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {filteredCategories.map((cat) => (
            <View 
              key={cat.id} 
              style={[styles.categoryRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
            >
              <CategoryIcon icon={cat.icon} color={cat.color} size="md" />

              <View style={styles.catInfo}>
                <Text variant="sm" weight="bold">
                  {cat.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <View style={[styles.colorIndicator, { backgroundColor: cat.color }]} />
                  <Text variant="xs" color={colors.text.tertiary} style={{ marginLeft: 4 }}>
                    {cat.isDefault ? 'System Default' : 'Custom Category'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.bg.secondary }]}
                  onPress={() => setEditingCategory(cat)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.accent.primary} />
                </TouchableOpacity>

                {!cat.isDefault && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.semantic.dangerDim }]}
                    onPress={() => handleDeleteCategory(cat)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.semantic.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>

      <AddCategoryModal
        visible={isAddModalVisible || editingCategory !== null}
        onClose={() => {
          setIsAddModalVisible(false);
          setEditingCategory(null);
        }}
        initialType={activeTab}
        categoryToEdit={editingCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radii.sm,
  },
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  catInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
