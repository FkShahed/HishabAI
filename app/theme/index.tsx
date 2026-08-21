import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { useUIStore, BackgroundPreset } from '../../src/store';

const { width } = Dimensions.get('window');

interface PresetOption {
  id: BackgroundPreset;
  name: string;
  subtitle: string;
  colors: [string, string, string];
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    id: 'aurora',
    name: 'Default Glass Aurora',
    subtitle: 'Classic Violet, Cyan & Rose ambient glow',
    colors: ['#7C3AED', '#06B6D4', '#EC4899'],
  },
  {
    id: 'nebula',
    name: 'Deep Nebula',
    subtitle: 'Electric Purple, Indigo & Magenta glow',
    colors: ['#8B5CF6', '#6366F1', '#D946EF'],
  },
  {
    id: 'emerald',
    name: 'Emerald Oasis',
    subtitle: 'Mint Emerald, Teal & Cyan glow',
    colors: ['#10B981', '#14B8A6', '#0284C7'],
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    subtitle: 'Amber Gold, Coral Orange & Rose glow',
    colors: ['#F59E0B', '#F97316', '#F43F5E'],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    subtitle: 'Electric Blue, Cyan & Hot Violet glow',
    colors: ['#3B82F6', '#06B6D4', '#A855F7'],
  },
  {
    id: 'midnight',
    name: 'Midnight Velvet',
    subtitle: 'Deep Slate, Midnight Indigo & Purple glow',
    colors: ['#475569', '#4338CA', '#581C87'],
  },
];

export default function ThemeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const backgroundPreset = useUIStore((s) => s.backgroundPreset);
  const setBackgroundPreset = useUIStore((s) => s.setBackgroundPreset);

  return (
    <GlassBackground style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title="Theme & Appearance" 
        showBack={true} 
        onBack={() => router.back()} 
      />

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Light vs Dark Theme */}
        <View style={styles.sectionHeader}>
          <Ionicons name="color-palette-outline" size={18} color={colors.accent.primary} />
          <Text variant="md" weight="bold" style={{ marginLeft: 6 }}>
            Theme Mode
          </Text>
        </View>

        <View style={styles.themeGrid}>
          {/* Light Mode Card */}
          <TouchableOpacity
            style={[
              styles.themeCard,
              { backgroundColor: colors.bg.glass, borderColor: theme === 'light' ? colors.accent.primary : colors.bg.glassBorder },
              theme === 'light' && styles.selectedThemeCard
            ]}
            onPress={() => setTheme('light')}
            activeOpacity={0.8}
          >
            <View style={[styles.themeCardHeader, { backgroundColor: '#F8FAFC' }]}>
              <View style={[styles.headerBarMock, { backgroundColor: '#7C3AED' }]} />
              <View style={[styles.cardContentMock, { backgroundColor: '#FFFFFF' }]}>
                <View style={[styles.mockTextLine, { backgroundColor: '#7C3AED', width: '60%' }]} />
                <View style={[styles.mockTextLine, { backgroundColor: '#CBD5E1', width: '40%', marginTop: 4 }]} />
              </View>
            </View>
            <View style={styles.themeCardLabel}>
              <Ionicons name="sunny-outline" size={18} color={theme === 'light' ? colors.accent.primary : colors.text.secondary} />
              <Text variant="sm" weight="bold" style={{ marginLeft: 6 }}>
                Light Mode
              </Text>
              {theme === 'light' && (
                <Ionicons name="checkmark-circle" size={18} color={colors.accent.primary} style={{ marginLeft: 'auto' }} />
              )}
            </View>
          </TouchableOpacity>

          {/* Dark Mode Card */}
          <TouchableOpacity
            style={[
              styles.themeCard,
              { backgroundColor: colors.bg.glass, borderColor: theme === 'dark' ? colors.accent.primary : colors.bg.glassBorder },
              theme === 'dark' && styles.selectedThemeCard
            ]}
            onPress={() => setTheme('dark')}
            activeOpacity={0.8}
          >
            <View style={[styles.themeCardHeader, { backgroundColor: '#080810' }]}>
              <View style={[styles.headerBarMock, { backgroundColor: '#0F0F1A' }]} />
              <View style={[styles.cardContentMock, { backgroundColor: 'rgba(19, 19, 31, 0.6)' }]}>
                <View style={[styles.mockTextLine, { backgroundColor: '#7C3AED', width: '60%' }]} />
                <View style={[styles.mockTextLine, { backgroundColor: '#3A3A58', width: '40%', marginTop: 4 }]} />
              </View>
            </View>
            <View style={styles.themeCardLabel}>
              <Ionicons name="moon-outline" size={18} color={theme === 'dark' ? colors.accent.primary : colors.text.secondary} />
              <Text variant="sm" weight="bold" style={{ marginLeft: 6 }}>
                Dark Mode
              </Text>
              {theme === 'dark' && (
                <Ionicons name="checkmark-circle" size={18} color={colors.accent.primary} style={{ marginLeft: 'auto' }} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 2: Ambient Background Glow Art */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
          <Ionicons name="image-outline" size={18} color={colors.accent.primary} />
          <Text variant="md" weight="bold" style={{ marginLeft: 6 }}>
            Ambient Background Orbs
          </Text>
        </View>
        <Text variant="xs" color={colors.text.secondary} style={{ marginBottom: Spacing.md }}>
          Choose an ambient glowing artwork preset for the glassmorphic background across the entire app.
        </Text>

        <View style={styles.presetGrid}>
          {PRESET_OPTIONS.map((item) => {
            const isSelected = backgroundPreset === item.id || (!backgroundPreset && item.id === 'aurora');
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.presetCard,
                  { backgroundColor: colors.bg.glass, borderColor: isSelected ? colors.accent.primary : colors.bg.glassBorder },
                  isSelected && styles.selectedPresetCard,
                  Platform.OS === 'web' && ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any)
                ]}
                onPress={() => setBackgroundPreset(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.previewGradientBox}>
                  <LinearGradient
                    colors={item.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.presetGradientCircle}
                  />
                </View>

                <View style={styles.presetTextContainer}>
                  <Text variant="sm" weight="bold">
                    {item.name}
                  </Text>
                  <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                    {item.subtitle}
                  </Text>
                </View>

                {isSelected ? (
                  <View style={[styles.activeBadge, { backgroundColor: colors.accent.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={[styles.inactiveCircle, { borderColor: colors.border.medium }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  themeCard: {
    flex: 1,
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectedThemeCard: {
    borderWidth: 2,
  },
  themeCardHeader: {
    height: 90,
    padding: Spacing.xs + 2,
    justifyContent: 'space-between',
  },
  headerBarMock: {
    height: 12,
    borderRadius: 6,
  },
  cardContentMock: {
    height: 52,
    borderRadius: Radii.sm,
    padding: Spacing.xs,
    justifyContent: 'center',
  },
  mockTextLine: {
    height: 6,
    borderRadius: 3,
  },
  themeCardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  presetGrid: {
    gap: Spacing.sm,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  selectedPresetCard: {
    borderWidth: 1.5,
  },
  previewGradientBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetGradientCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  presetTextContainer: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
