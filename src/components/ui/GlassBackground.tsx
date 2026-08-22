import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../constants/colors';
import { useUIStore, BackgroundPreset } from '../../store';

const { width } = Dimensions.get('window');

export interface GlassBackgroundProps {
  children?: React.ReactNode;
  style?: any;
}

interface OrbColorConfig {
  orb1Dark: string; orb1Light: string;
  orb2Dark: string; orb2Light: string;
  orb3Dark: string; orb3Light: string;
}

const PRESET_ORBS: Record<string, OrbColorConfig> = {
  aurora: {
    // Default Aurora: Violet + Cyan + Rose
    orb1Dark: 'rgba(124, 58, 237, 0.09)', orb1Light: 'rgba(124, 58, 237, 0.10)',
    orb2Dark: 'rgba(6, 182, 212, 0.07)',  orb2Light: 'rgba(6, 182, 212, 0.08)',
    orb3Dark: 'rgba(236, 72, 153, 0.05)', orb3Light: 'rgba(244, 114, 182, 0.06)',
  },
  nebula: {
    // Deep Nebula: Electric Purple + Indigo + Magenta
    orb1Dark: 'rgba(139, 92, 246, 0.09)', orb1Light: 'rgba(139, 92, 246, 0.10)',
    orb2Dark: 'rgba(99, 102, 241, 0.07)',  orb2Light: 'rgba(99, 102, 241, 0.08)',
    orb3Dark: 'rgba(217, 70, 239, 0.05)', orb3Light: 'rgba(217, 70, 239, 0.06)',
  },
  emerald: {
    // Emerald Oasis: Mint Emerald + Teal + Sapphire
    orb1Dark: 'rgba(16, 185, 129, 0.09)', orb1Light: 'rgba(16, 185, 129, 0.10)',
    orb2Dark: 'rgba(20, 184, 166, 0.07)', orb2Light: 'rgba(20, 184, 166, 0.08)',
    orb3Dark: 'rgba(2, 132, 199, 0.05)',  orb3Light: 'rgba(2, 132, 199, 0.06)',
  },
  sunset: {
    // Sunset Glow: Amber Gold + Coral Orange + Rose Pink
    orb1Dark: 'rgba(249, 115, 22, 0.09)', orb1Light: 'rgba(249, 115, 22, 0.10)',
    orb2Dark: 'rgba(245, 158, 11, 0.07)', orb2Light: 'rgba(245, 158, 11, 0.08)',
    orb3Dark: 'rgba(244, 63, 94, 0.05)',  orb3Light: 'rgba(244, 63, 94, 0.06)',
  },
  cyberpunk: {
    // Cyberpunk Neon: Electric Blue + Cyan + Hot Violet
    orb1Dark: 'rgba(59, 130, 246, 0.09)', orb1Light: 'rgba(59, 130, 246, 0.10)',
    orb2Dark: 'rgba(6, 182, 212, 0.07)',  orb2Light: 'rgba(6, 182, 212, 0.08)',
    orb3Dark: 'rgba(168, 85, 247, 0.05)', orb3Light: 'rgba(168, 85, 247, 0.06)',
  },
  midnight: {
    // Midnight Velvet: Slate + Midnight Indigo + Deep Purple
    orb1Dark: 'rgba(71, 85, 105, 0.10)',  orb1Light: 'rgba(71, 85, 105, 0.10)',
    orb2Dark: 'rgba(67, 56, 202, 0.07)',  orb2Light: 'rgba(67, 56, 202, 0.08)',
    orb3Dark: 'rgba(88, 28, 135, 0.05)',  orb3Light: 'rgba(88, 28, 135, 0.06)',
  },
};

export function GlassBackground({ children, style }: GlassBackgroundProps) {
  const colors = useThemeColors();
  const rawPreset = useUIStore((s) => s.backgroundPreset) || 'aurora';
  const isDark = colors.bg.primary === '#080810';

  // Backwards compatibility normalization
  let presetKey = 'aurora';
  if (rawPreset === 'nebula' || rawPreset === ('waves' as any)) presetKey = 'nebula';
  else if (rawPreset === 'emerald' || rawPreset === ('prism' as any)) presetKey = 'emerald';
  else if (rawPreset === 'sunset' || rawPreset === ('grid' as any)) presetKey = 'sunset';
  else if (rawPreset === 'cyberpunk') presetKey = 'cyberpunk';
  else if (rawPreset === 'midnight' || rawPreset === ('topography' as any)) presetKey = 'midnight';
  else presetKey = 'aurora';

  const orbConfig = PRESET_ORBS[presetKey] || PRESET_ORBS.aurora;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }, style]}>
      {/* Ambient Glowing Glass Orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Orb 1: Top-Right Glow */}
        <LinearGradient
          colors={isDark ? [orbConfig.orb1Dark, 'transparent'] : [orbConfig.orb1Light, 'transparent']}
          style={[styles.orb, styles.orbTopRight]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Orb 2: Center-Left Glow */}
        <LinearGradient
          colors={isDark ? [orbConfig.orb2Dark, 'transparent'] : [orbConfig.orb2Light, 'transparent']}
          style={[styles.orb, styles.orbCenterLeft]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Orb 3: Bottom-Right Glow */}
        <LinearGradient
          colors={isDark ? [orbConfig.orb3Dark, 'transparent'] : [orbConfig.orb3Light, 'transparent']}
          style={[styles.orb, styles.orbBottomRight]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {/* Screen Children Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTopRight: {
    width: width * 0.85,
    height: width * 0.85,
    top: -width * 0.25,
    right: -width * 0.2,
  },
  orbCenterLeft: {
    width: width * 0.75,
    height: width * 0.75,
    top: '35%',
    left: -width * 0.3,
  },
  orbBottomRight: {
    width: width * 0.8,
    height: width * 0.8,
    bottom: -width * 0.2,
    right: -width * 0.15,
  },
});
