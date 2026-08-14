import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { Spacing, Radii, Shadows, useThemeColors } from '../../src/constants/colors';

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Header title="Add Transaction" />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        
        {/* Manual Entry Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, borderWidth: 1 }]}
          activeOpacity={0.7}
          onPress={() => router.push('/transaction/new')}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.accent.primaryDim }]}>
            <Ionicons name="pencil" size={28} color={colors.accent.primary} />
          </View>
          <View style={styles.cardText}>
            <Text variant="lg" weight="bold">Manual</Text>
            <Text variant="sm" color={colors.text.secondary}>Enter it yourself</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Voice AI Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, borderWidth: 1 }]}
          activeOpacity={0.7}
          onPress={() => router.push('/voice')}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.semantic.incomeDim }]}>
            <Ionicons name="mic" size={28} color={colors.semantic.income} />
          </View>
          <View style={styles.cardText}>
            <View style={styles.titleRow}>
              <Text variant="lg" weight="bold">Voice AI</Text>
              <View style={[styles.sparkleBadge, { backgroundColor: colors.semantic.incomeDim }]}>
                <Ionicons name="sparkles" size={10} color={colors.semantic.income} />
                <Text variant="xs" weight="bold" color={colors.semantic.income} style={{ marginLeft: 2 }}>AI</Text>
              </View>
            </View>
            <Text variant="sm" color={colors.text.secondary}>Tell HisabAI what you spent</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Receipt AI Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, borderWidth: 1 }]}
          activeOpacity={0.7}
          onPress={() => router.push('/receipt')}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.accent.secondaryDim }]}>
            <Ionicons name="receipt" size={28} color={colors.accent.secondary} />
          </View>
          <View style={styles.cardText}>
            <View style={styles.titleRow}>
              <Text variant="lg" weight="bold">Receipt AI</Text>
              <View style={[styles.sparkleBadgeBlue, { backgroundColor: colors.accent.secondaryDim }]}>
                <Ionicons name="sparkles" size={10} color={colors.accent.secondary} />
                <Text variant="xs" weight="bold" color={colors.accent.secondary} style={{ marginLeft: 2 }}>AI</Text>
              </View>
            </View>
            <Text variant="sm" color={colors.text.secondary}>Scan a receipt</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  sparkleBadgeBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
});
