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

export function GlassBackground({ children, style }: GlassBackgroundProps) {
  const colors = useThemeColors();
  const rawPreset = useUIStore((s) => s.backgroundPreset) || 'aurora';
  const isDark = colors.bg.primary === '#080810';

  // Backwards compatibility normalization
  let presetKey: BackgroundPreset = 'aurora';
  if (rawPreset === 'nebula') presetKey = 'nebula';
  else if (rawPreset === 'emerald') presetKey = 'emerald';
  else if (rawPreset === 'sunset') presetKey = 'sunset';
  else if (rawPreset === 'cyberpunk') presetKey = 'cyberpunk';
  else if (rawPreset === 'midnight') presetKey = 'midnight';
  else presetKey = 'aurora';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }, style]}>
      {/* Dynamic Ambient Background Artwork Layer */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* 1. DEFAULT AURORA: 3 Organic Floating Circular Glass Orbs */}
        {presetKey === 'aurora' && (
          <>
            <LinearGradient
              colors={isDark ? ['rgba(124, 58, 237, 0.14)', 'transparent'] : ['rgba(124, 58, 237, 0.13)', 'transparent']}
              style={[styles.orb, styles.auroraOrbTopRight]}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(6, 182, 212, 0.10)', 'transparent'] : ['rgba(6, 182, 212, 0.10)', 'transparent']}
              style={[styles.orb, styles.auroraOrbCenterLeft]}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(236, 72, 153, 0.08)', 'transparent'] : ['rgba(244, 114, 182, 0.09)', 'transparent']}
              style={[styles.orb, styles.auroraOrbBottomRight]}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </>
        )}

        {/* 2. DEEP NEBULA: Cosmic 45° Diagonal Light Beam & Dual Radiant Pools */}
        {presetKey === 'nebula' && (
          <>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(139, 92, 246, 0.18)', 'rgba(99, 102, 241, 0.08)', 'transparent']
                  : ['rgba(139, 92, 246, 0.16)', 'rgba(99, 102, 241, 0.06)', 'transparent']
              }
              style={styles.nebulaDiagonalBeam}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(217, 70, 239, 0.14)', 'transparent'] : ['rgba(217, 70, 239, 0.12)', 'transparent']}
              style={styles.nebulaTopStreak}
              start={{ x: 0.8, y: 0.2 }}
              end={{ x: 0.2, y: 0.8 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(79, 70, 229, 0.13)', 'transparent'] : ['rgba(99, 102, 241, 0.10)', 'transparent']}
              style={styles.nebulaBottomPool}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
            />
          </>
        )}

        {/* 3. EMERALD OASIS: Central Radiant Focus Halo & Calm Horizon */}
        {presetKey === 'emerald' && (
          <>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(16, 185, 129, 0.17)', 'rgba(20, 184, 166, 0.07)', 'transparent']
                  : ['rgba(16, 185, 129, 0.15)', 'rgba(20, 184, 166, 0.05)', 'transparent']
              }
              style={styles.emeraldCenterHalo}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(2, 132, 199, 0.11)', 'transparent'] : ['rgba(2, 132, 199, 0.09)', 'transparent']}
              style={styles.emeraldTopHorizon}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </>
        )}

        {/* 4. SUNSET GLOW: 4-Corner Fluid Ambient Mesh Gradient */}
        {presetKey === 'sunset' && (
          <>
            <LinearGradient
              colors={isDark ? ['rgba(245, 158, 11, 0.16)', 'transparent'] : ['rgba(245, 158, 11, 0.17)', 'transparent']}
              style={styles.meshTopLeft}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 0.8 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(249, 115, 22, 0.15)', 'transparent'] : ['rgba(249, 115, 22, 0.16)', 'transparent']}
              style={styles.meshTopRight}
              start={{ x: 1, y: 0 }}
              end={{ x: 0.2, y: 0.8 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(234, 179, 8, 0.13)', 'transparent'] : ['rgba(234, 179, 8, 0.14)', 'transparent']}
              style={styles.meshBottomLeft}
              start={{ x: 0, y: 1 }}
              end={{ x: 0.8, y: 0.2 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(244, 63, 94, 0.14)', 'transparent'] : ['rgba(244, 63, 94, 0.15)', 'transparent']}
              style={styles.meshBottomRight}
              start={{ x: 1, y: 1 }}
              end={{ x: 0.2, y: 0.2 }}
            />
          </>
        )}

        {/* 5. CYBERPUNK NEON: Top Laser Beam & Bottom Neon Stage Dome */}
        {presetKey === 'cyberpunk' && (
          <>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(6, 182, 212, 0.19)', 'rgba(59, 130, 246, 0.11)', 'transparent']
                  : ['rgba(6, 182, 212, 0.17)', 'rgba(59, 130, 246, 0.09)', 'transparent']
              }
              style={styles.cyberpunkTopBeam}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.8 }}
            />
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(168, 85, 247, 0.18)', 'rgba(217, 70, 239, 0.07)', 'transparent']
                  : ['rgba(168, 85, 247, 0.15)', 'rgba(217, 70, 239, 0.05)', 'transparent']
              }
              style={styles.cyberpunkBottomDome}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(59, 130, 246, 0.10)', 'transparent'] : ['rgba(59, 130, 246, 0.08)', 'transparent']}
              style={styles.cyberpunkCenterFlare}
              start={{ x: 0.1, y: 0.5 }}
              end={{ x: 0.9, y: 0.5 }}
            />
          </>
        )}

        {/* 6. MIDNIGHT VELVET: Astronomical Eclipse Arch & Twilight Crescent */}
        {presetKey === 'midnight' && (
          <>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(67, 56, 202, 0.22)', 'rgba(88, 28, 135, 0.10)', 'transparent']
                  : ['rgba(67, 56, 202, 0.16)', 'rgba(88, 28, 135, 0.07)', 'transparent']
              }
              style={styles.midnightTopArch}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <LinearGradient
              colors={isDark ? ['rgba(71, 85, 105, 0.16)', 'transparent'] : ['rgba(71, 85, 105, 0.13)', 'transparent']}
              style={styles.midnightBottomCrescent}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
            />
          </>
        )}
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

  // 1. Aurora Styles (Default Orbs)
  auroraOrbTopRight: {
    width: width * 0.85,
    height: width * 0.85,
    top: -width * 0.25,
    right: -width * 0.2,
  },
  auroraOrbCenterLeft: {
    width: width * 0.75,
    height: width * 0.75,
    top: '35%',
    left: -width * 0.3,
  },
  auroraOrbBottomRight: {
    width: width * 0.8,
    height: width * 0.8,
    bottom: -width * 0.2,
    right: -width * 0.15,
  },

  // 2. Nebula Styles (Diagonal Beam & Dual Pools)
  nebulaDiagonalBeam: {
    position: 'absolute',
    width: width * 1.6,
    height: width * 0.8,
    top: -width * 0.15,
    left: -width * 0.3,
    borderRadius: width * 0.4,
    transform: [{ rotate: '-32deg' }],
  },
  nebulaTopStreak: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.5,
    top: -width * 0.1,
    right: -width * 0.2,
    borderRadius: 999,
  },
  nebulaBottomPool: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 0.65,
    bottom: -width * 0.2,
    left: -width * 0.1,
    borderRadius: width * 0.6,
  },

  // 3. Emerald Styles (Central Halo & Horizon)
  emeraldCenterHalo: {
    position: 'absolute',
    width: width * 1.15,
    height: width * 1.15,
    top: '20%',
    left: -width * 0.075,
    borderRadius: 999,
  },
  emeraldTopHorizon: {
    position: 'absolute',
    width: width,
    height: 160,
    top: 0,
    left: 0,
  },

  // 4. Sunset Styles (4-Corner Fluid Mesh)
  meshTopLeft: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.25,
    left: -width * 0.25,
    borderRadius: 999,
  },
  meshTopRight: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.15,
    right: -width * 0.25,
    borderRadius: 999,
  },
  meshBottomLeft: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    bottom: -width * 0.2,
    left: -width * 0.2,
    borderRadius: 999,
  },
  meshBottomRight: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    bottom: -width * 0.25,
    right: -width * 0.2,
    borderRadius: 999,
  },

  // 5. Cyberpunk Styles (Laser Beam & Stage Dome)
  cyberpunkTopBeam: {
    position: 'absolute',
    width: width,
    height: 190,
    top: 0,
    left: 0,
  },
  cyberpunkBottomDome: {
    position: 'absolute',
    width: width * 1.25,
    height: width * 0.95,
    bottom: -width * 0.38,
    left: -width * 0.125,
    borderRadius: 999,
  },
  cyberpunkCenterFlare: {
    position: 'absolute',
    width: width * 0.8,
    height: 90,
    top: '40%',
    left: width * 0.1,
    borderRadius: 45,
    transform: [{ rotate: '-12deg' }],
  },

  // 6. Midnight Styles (Eclipse Arch & Twilight Crescent)
  midnightTopArch: {
    position: 'absolute',
    width: width * 1.6,
    height: width * 0.9,
    top: -width * 0.42,
    left: -width * 0.3,
    borderRadius: width * 0.8,
  },
  midnightBottomCrescent: {
    position: 'absolute',
    width: width * 1.35,
    height: width * 0.55,
    bottom: -width * 0.22,
    left: -width * 0.175,
    borderRadius: width * 0.65,
  },
});
