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
    name: 'Aurora Orbs',
    subtitle: 'Luminous floating organic glass orbs with atmospheric glow',
    colors: ['#7C3AED', '#06B6D4', '#EC4899'],
  },
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    subtitle: '35° sweeping galactic light beam with deep indigo twilight pool',
    colors: ['#8B5CF6', '#6366F1', '#D946EF'],
  },
  {
    id: 'emerald',
    name: 'Emerald Oasis',
    subtitle: 'Breathing radiant central spotlight halo & calm ocean horizon',
    colors: ['#10B981', '#14B8A6', '#0284C7'],
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    subtitle: 'Warm golden hour 4-corner fluid mesh gradient & evening rose',
    colors: ['#F59E0B', '#F97316', '#F43F5E'],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    subtitle: 'Top-down cyan laser beam with bottom ultraviolet stage dome',
    colors: ['#06B6D4', '#3B82F6', '#A855F7'],
  },
  {
    id: 'midnight',
    name: 'Midnight Velvet',
    subtitle: 'Astronomical celestial arch with deep royal twilight crescent',
    colors: ['#4338CA', '#581C87', '#475569'],
  },
];

const OPACITY_LEVELS = [
  { label: '0%', title: 'Off', value: 0.0 },
  { label: '25%', title: 'Subtle', value: 0.25 },
  { label: '50%', title: 'Soft', isDefault: true, value: 0.50 },
  { label: '75%', title: 'Vibrant', value: 0.75 },
  { label: '100%', title: 'Full', value: 1.0 },
];

export default function ThemeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const backgroundPreset = useUIStore((s) => s.backgroundPreset);
  const setBackgroundPreset = useUIStore((s) => s.setBackgroundPreset);
  const backgroundOpacity = useUIStore((s) => s.backgroundOpacity);
  const setBackgroundOpacity = useUIStore((s) => s.setBackgroundOpacity);
  const isDark = colors.bg.primary === '#080810';

  const currentOpacity = typeof backgroundOpacity === 'number' ? backgroundOpacity : 0.5;
  const activePresetOption = PRESET_OPTIONS.find((p) => p.id === (backgroundPreset || 'aurora')) || PRESET_OPTIONS[0];

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

        {/* Section 2: Background Design Opacity Control */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl, justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="contrast-outline" size={18} color={colors.accent.primary} />
            <Text variant="md" weight="bold" style={{ marginLeft: 6 }}>
              Background Intensity
            </Text>
          </View>
          <View
            style={[
              styles.opacityValuePill,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                borderColor: colors.border.subtle,
              },
            ]}
          >
            <Text variant="xs" weight="bold" color={colors.accent.primary}>
              {Math.round(currentOpacity * 100)}%{Math.abs(currentOpacity - 0.5) < 0.05 ? ' • Default' : ''}
            </Text>
          </View>
        </View>
        <Text variant="xs" color={colors.text.secondary} style={{ marginBottom: Spacing.md }}>
          Adjust the glow brightness and visibility of ambient background artwork across the app.
        </Text>

        <View
          style={[
            styles.opacityCard,
            {
              backgroundColor: colors.bg.glass,
              borderColor: colors.bg.glassBorder,
            },
            Platform.OS === 'web' && ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any)
          ]}
        >
          {/* Interactive Stepper Pills */}
          <View style={styles.opacityRow}>
            {OPACITY_LEVELS.map((lvl) => {
              const isSelected = Math.abs(currentOpacity - lvl.value) < 0.05;
              return (
                <TouchableOpacity
                  key={lvl.label}
                  style={[
                    styles.opacityPill,
                    isSelected && {
                      backgroundColor: colors.accent.primary,
                      borderColor: colors.accent.primary,
                      shadowColor: colors.accent.primary,
                      shadowOpacity: 0.35,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 4,
                      elevation: 3,
                    },
                    !isSelected && {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    },
                  ]}
                  onPress={() => setBackgroundOpacity(lvl.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="xs"
                    weight="bold"
                    color={isSelected ? '#FFFFFF' : colors.text.primary}
                  >
                    {lvl.label}
                  </Text>
                  <Text
                    variant="xs"
                    weight={isSelected ? 'semibold' : 'regular'}
                    color={isSelected ? 'rgba(255, 255, 255, 0.9)' : colors.text.secondary}
                    style={{ fontSize: 9.5, marginTop: 2, includeFontPadding: false }}
                  >
                    {lvl.isDefault ? 'Default' : lvl.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 3: Ambient Background Designs */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
          <Ionicons name="image-outline" size={18} color={colors.accent.primary} />
          <Text variant="md" weight="bold" style={{ marginLeft: 6 }}>
            Ambient Background Designs
          </Text>
        </View>
        <Text variant="xs" color={colors.text.secondary} style={{ marginBottom: Spacing.md }}>
          Choose a unique glowing visual design style for the glassmorphic background across the entire app.
        </Text>

        <View style={styles.presetGrid}>
          {PRESET_OPTIONS.map((item) => {
            const isSelected = backgroundPreset === item.id || (!backgroundPreset && item.id === 'aurora');
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.presetCard,
                  { 
                    backgroundColor: colors.bg.glass, 
                    borderColor: isSelected ? colors.accent.primary : colors.bg.glassBorder 
                  },
                  isSelected && styles.selectedPresetCard,
                  Platform.OS === 'web' && ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any)
                ]}
                onPress={() => setBackgroundPreset(item.id)}
                activeOpacity={0.8}
              >
                {/* Miniature Screen Mockup illustrating the distinct design layout */}
                <View
                  style={[
                    styles.previewGradientBox,
                    {
                      backgroundColor: isDark ? '#0B0B14' : '#F1F5F9',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)',
                    },
                  ]}
                >
                  {/* 1. Aurora: 3 Floating Micro-Orbs */}
                  {item.id === 'aurora' && (
                    <View style={StyleSheet.absoluteFill}>
                      <View style={[styles.miniOrb, { top: 2, right: 2, width: 19, height: 19, backgroundColor: item.colors[0] }]} />
                      <View style={[styles.miniOrb, { top: '35%', left: 1, width: 17, height: 17, backgroundColor: item.colors[1] }]} />
                      <View style={[styles.miniOrb, { bottom: 2, right: 3, width: 18, height: 18, backgroundColor: item.colors[2] }]} />
                    </View>
                  )}

                  {/* 2. Nebula: Angled Diagonal Luminous Beam */}
                  {item.id === 'nebula' && (
                    <View style={StyleSheet.absoluteFill}>
                      <LinearGradient
                        colors={[item.colors[0], item.colors[1], 'transparent']}
                        style={styles.miniBeam}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <View style={[styles.miniOrb, { top: 2, right: 2, width: 15, height: 15, backgroundColor: item.colors[2] }]} />
                      <View style={[styles.miniOrb, { bottom: -3, left: 3, width: 28, height: 15, borderRadius: 7.5, backgroundColor: item.colors[1] }]} />
                    </View>
                  )}

                  {/* 3. Emerald: Central Glowing Focus Halo */}
                  {item.id === 'emerald' && (
                    <View style={StyleSheet.absoluteFill}>
                      <View style={[styles.miniHorizon, { backgroundColor: item.colors[2] }]} />
                      <View style={[styles.miniHalo, { backgroundColor: item.colors[0] }]} />
                      <View style={[styles.miniCorner, { bottom: -2, left: -2, backgroundColor: '#34D399' }]} />
                    </View>
                  )}

                  {/* 4. Sunset: 4-Corner Fluid Mesh Gradient */}
                  {item.id === 'sunset' && (
                    <View style={StyleSheet.absoluteFill}>
                      <View style={[styles.miniCorner, { top: -2, left: -2, backgroundColor: item.colors[0] }]} />
                      <View style={[styles.miniCorner, { top: -2, right: -2, backgroundColor: item.colors[1] }]} />
                      <View style={[styles.miniCorner, { bottom: -2, left: -2, backgroundColor: '#EAB308' }]} />
                      <View style={[styles.miniCorner, { bottom: -2, right: -2, backgroundColor: item.colors[2] }]} />
                    </View>
                  )}

                  {/* 5. Cyberpunk: Top Laser Bar & Bottom Stage Dome */}
                  {item.id === 'cyberpunk' && (
                    <View style={StyleSheet.absoluteFill}>
                      <View style={[styles.miniLaserBar, { backgroundColor: item.colors[0] }]} />
                      <View style={[styles.miniStageDome, { backgroundColor: item.colors[2] }]} />
                      <View style={[styles.miniLaserAccent, { backgroundColor: item.colors[1] }]} />
                    </View>
                  )}

                  {/* 6. Midnight: Curved Astronomical Eclipse Arch & Crescent */}
                  {item.id === 'midnight' && (
                    <View style={StyleSheet.absoluteFill}>
                      <View style={[styles.miniArch, { backgroundColor: item.colors[0] }]} />
                      <View style={[styles.miniCrescent, { backgroundColor: item.colors[1] }]} />
                    </View>
                  )}
                </View>

                {/* Clean Preset Title & Subtitle (Without Badges) */}
                <View style={styles.presetTextContainer}>
                  <Text variant="sm" weight="bold">
                    {item.name}
                  </Text>
                  <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 3 }}>
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
    height: 8,
    borderRadius: 4,
    width: '40%',
  },
  cardContentMock: {
    height: 48,
    borderRadius: Radii.md,
    padding: 8,
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

  // Opacity Control Section
  opacityValuePill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  opacityCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  opacityRow: {
    flexDirection: 'row',
    gap: 6,
  },
  opacityPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },

  // Presets Grid
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
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginLeft: Spacing.xs,
  },
  inactiveCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    marginLeft: Spacing.xs,
  },

  // Miniature representation shapes
  miniOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.85,
  },
  miniBeam: {
    position: 'absolute',
    width: 60,
    height: 15,
    borderRadius: 7,
    top: 14,
    left: -8,
    transform: [{ rotate: '-32deg' }],
    opacity: 0.85,
  },
  miniHalo: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    top: 10,
    left: 6,
    opacity: 0.85,
  },
  miniHorizon: {
    position: 'absolute',
    width: '100%',
    height: 6,
    top: 0,
    left: 0,
    opacity: 0.75,
  },
  miniCorner: {
    position: 'absolute',
    width: 17,
    height: 17,
    borderRadius: 8.5,
    opacity: 0.85,
  },
  miniLaserBar: {
    position: 'absolute',
    width: '100%',
    height: 7,
    top: 0,
    left: 0,
    opacity: 0.9,
  },
  miniStageDome: {
    position: 'absolute',
    width: 38,
    height: 22,
    borderRadius: 11,
    bottom: -6,
    left: 3,
    opacity: 0.85,
  },
  miniLaserAccent: {
    position: 'absolute',
    width: 24,
    height: 5,
    borderRadius: 2.5,
    top: '42%',
    left: 10,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.75,
  },
  miniArch: {
    position: 'absolute',
    width: 48,
    height: 20,
    borderRadius: 10,
    top: -6,
    left: -2,
    opacity: 0.85,
  },
  miniCrescent: {
    position: 'absolute',
    width: 36,
    height: 12,
    borderRadius: 6,
    bottom: -2,
    left: 4,
    opacity: 0.8,
  },
});
