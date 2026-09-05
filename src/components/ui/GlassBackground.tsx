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
  const backgroundOpacity = useUIStore((s) => s.backgroundOpacity ?? 1.0);
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
      {/* Dynamic Ambient Background Artwork Layer with User-Controlled Opacity */}
      <View 
        style={[
          StyleSheet.absoluteFill, 
          { opacity: typeof backgroundOpacity === 'number' ? backgroundOpacity : 1.0 }
        ]} 
        pointerEvents="none"
      >
        {/* 1. DEFAULT AURORA: Luminous Floating Glass Orbs with Atmospheric Halo */}
        {presetKey === 'aurora' && (
          <>
            {/* Top-Right Vivid Violet Orb */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(139, 92, 246, 0.25)', 'rgba(124, 58, 237, 0.12)', 'transparent'] 
                  : ['rgba(139, 92, 246, 0.20)', 'rgba(124, 58, 237, 0.08)', 'transparent']
              }
              style={[styles.orb, styles.auroraOrbTopRight]}
              start={{ x: 0.35, y: 0.35 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Center-Left Radiant Cyan/Turquoise Orb */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(6, 182, 212, 0.22)', 'rgba(14, 165, 233, 0.09)', 'transparent'] 
                  : ['rgba(6, 182, 212, 0.18)', 'rgba(14, 165, 233, 0.07)', 'transparent']
              }
              style={[styles.orb, styles.auroraOrbCenterLeft]}
              start={{ x: 0.3, y: 0.3 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Bottom-Right Magenta Aura Orb */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(236, 72, 153, 0.19)', 'rgba(217, 70, 239, 0.08)', 'transparent'] 
                  : ['rgba(236, 72, 153, 0.16)', 'rgba(217, 70, 239, 0.06)', 'transparent']
              }
              style={[styles.orb, styles.auroraOrbBottomRight]}
              start={{ x: 0.4, y: 0.4 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Central Ambient Violet Mist */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(124, 58, 237, 0.09)', 'transparent']
                  : ['rgba(124, 58, 237, 0.06)', 'transparent']
              }
              style={styles.ambientCenterMist}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </>
        )}

        {/* 2. DEEP NEBULA: Cosmic 35° Diagonal Light Beam, Stellar Burst & Cosmic Pools */}
        {presetKey === 'nebula' && (
          <>
            {/* 35° Galactic Sweeping Beam */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(139, 92, 246, 0.28)', 'rgba(99, 102, 241, 0.14)', 'transparent']
                  : ['rgba(139, 92, 246, 0.22)', 'rgba(99, 102, 241, 0.09)', 'transparent']
              }
              style={styles.nebulaDiagonalBeam}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Stellar Fuchsia Top-Right Burst */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(217, 70, 239, 0.24)', 'rgba(192, 38, 211, 0.08)', 'transparent'] 
                  : ['rgba(217, 70, 239, 0.18)', 'rgba(192, 38, 211, 0.06)', 'transparent']
              }
              style={styles.nebulaTopStreak}
              start={{ x: 0.8, y: 0.2 }}
              end={{ x: 0.2, y: 0.8 }}
            />
            {/* Deep Indigo Cosmic Pool */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(79, 70, 229, 0.22)', 'rgba(67, 56, 202, 0.09)', 'transparent'] 
                  : ['rgba(99, 102, 241, 0.16)', 'rgba(79, 70, 229, 0.07)', 'transparent']
              }
              style={styles.nebulaBottomPool}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
            />
            {/* Mid-screen Cosmic Dust Flare */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(168, 85, 247, 0.12)', 'transparent']
                  : ['rgba(168, 85, 247, 0.08)', 'transparent']
              }
              style={styles.nebulaDustFlare}
              start={{ x: 0.1, y: 0.5 }}
              end={{ x: 0.9, y: 0.5 }}
            />
          </>
        )}

        {/* 3. EMERALD OASIS: Central Radiant Focus Halo, Calm Ocean Horizon & Mint Pool */}
        {presetKey === 'emerald' && (
          <>
            {/* Central Breathing Spotlight Halo */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(16, 185, 129, 0.26)', 'rgba(20, 184, 166, 0.12)', 'transparent']
                  : ['rgba(16, 185, 129, 0.20)', 'rgba(20, 184, 166, 0.08)', 'transparent']
              }
              style={styles.emeraldCenterHalo}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Ocean Cyan Top Horizon */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(2, 132, 199, 0.18)', 'rgba(14, 165, 233, 0.06)', 'transparent'] 
                  : ['rgba(2, 132, 199, 0.14)', 'rgba(14, 165, 233, 0.04)', 'transparent']
              }
              style={styles.emeraldTopHorizon}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            {/* Bottom-Left Mint Aurora Pool */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(52, 211, 153, 0.18)', 'rgba(16, 185, 129, 0.06)', 'transparent'] 
                  : ['rgba(52, 211, 153, 0.14)', 'rgba(16, 185, 129, 0.04)', 'transparent']
              }
              style={styles.emeraldBottomMint}
              start={{ x: 0.2, y: 0.8 }}
              end={{ x: 0.8, y: 0.2 }}
            />
          </>
        )}

        {/* 4. SUNSET GLOW: 4-Corner Fluid Ambient Mesh Gradient with Warm Golden Tone */}
        {presetKey === 'sunset' && (
          <>
            {/* Top-Left Amber Sunburst */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(245, 158, 11, 0.26)', 'rgba(251, 191, 36, 0.10)', 'transparent'] 
                  : ['rgba(245, 158, 11, 0.22)', 'rgba(251, 191, 36, 0.07)', 'transparent']
              }
              style={styles.meshTopLeft}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 0.8 }}
            />
            {/* Top-Right Sunset Tangerine */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(249, 115, 22, 0.24)', 'rgba(234, 88, 12, 0.08)', 'transparent'] 
                  : ['rgba(249, 115, 22, 0.20)', 'rgba(234, 88, 12, 0.06)', 'transparent']
              }
              style={styles.meshTopRight}
              start={{ x: 1, y: 0 }}
              end={{ x: 0.2, y: 0.8 }}
            />
            {/* Bottom-Left Solar Gold */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(234, 179, 8, 0.20)', 'transparent'] 
                  : ['rgba(234, 179, 8, 0.16)', 'transparent']
              }
              style={styles.meshBottomLeft}
              start={{ x: 0, y: 1 }}
              end={{ x: 0.8, y: 0.2 }}
            />
            {/* Bottom-Right Deep Twilight Rose */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(244, 63, 94, 0.24)', 'rgba(225, 29, 72, 0.08)', 'transparent'] 
                  : ['rgba(244, 63, 94, 0.19)', 'rgba(225, 29, 72, 0.06)', 'transparent']
              }
              style={styles.meshBottomRight}
              start={{ x: 1, y: 1 }}
              end={{ x: 0.2, y: 0.2 }}
            />
            {/* Central Warm Horizon Haze */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(251, 146, 60, 0.09)', 'transparent']
                  : ['rgba(251, 146, 60, 0.06)', 'transparent']
              }
              style={styles.meshCenterHaze}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </>
        )}

        {/* 5. CYBERPUNK NEON: Top Electric Cyan Laser Beam & Bottom Ultraviolet Stage Dome */}
        {presetKey === 'cyberpunk' && (
          <>
            {/* Top Horizon Laser Beam */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(6, 182, 212, 0.30)', 'rgba(59, 130, 246, 0.15)', 'transparent']
                  : ['rgba(6, 182, 212, 0.22)', 'rgba(59, 130, 246, 0.10)', 'transparent']
              }
              style={styles.cyberpunkTopBeam}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.8 }}
            />
            {/* Bottom Ultraviolet Stage Dome */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(168, 85, 247, 0.28)', 'rgba(217, 70, 239, 0.10)', 'transparent']
                  : ['rgba(168, 85, 247, 0.20)', 'rgba(217, 70, 239, 0.07)', 'transparent']
              }
              style={styles.cyberpunkBottomDome}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
            />
            {/* Neon Blue Diagonal Laser Accent */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(59, 130, 246, 0.20)', 'transparent'] 
                  : ['rgba(59, 130, 246, 0.14)', 'transparent']
              }
              style={styles.cyberpunkCenterFlare}
              start={{ x: 0.1, y: 0.5 }}
              end={{ x: 0.9, y: 0.5 }}
            />
          </>
        )}

        {/* 6. MIDNIGHT VELVET: Astronomical Eclipse Arch & Royal Twilight Crescent */}
        {presetKey === 'midnight' && (
          <>
            {/* Astronomical Eclipse Arch */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(67, 56, 202, 0.34)', 'rgba(88, 28, 135, 0.16)', 'transparent']
                  : ['rgba(67, 56, 202, 0.24)', 'rgba(88, 28, 135, 0.10)', 'transparent']
              }
              style={styles.midnightTopArch}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            {/* Royal Purple Twilight Crescent */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(126, 34, 206, 0.26)', 'rgba(88, 28, 135, 0.09)', 'transparent'] 
                  : ['rgba(126, 34, 206, 0.18)', 'rgba(88, 28, 135, 0.06)', 'transparent']
              }
              style={styles.midnightBottomCrescent}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
            />
            {/* Deep Slate-Indigo Starlight Shimmer */}
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(71, 85, 105, 0.22)', 'transparent'] 
                  : ['rgba(71, 85, 105, 0.14)', 'transparent']
              }
              style={styles.midnightCenterShimmer}
              start={{ x: 0.2, y: 0.5 }}
              end={{ x: 0.8, y: 0.5 }}
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

  // 1. Aurora Styles (Luminous Orbs & Mist)
  auroraOrbTopRight: {
    width: width * 0.9,
    height: width * 0.9,
    top: -width * 0.22,
    right: -width * 0.18,
  },
  auroraOrbCenterLeft: {
    width: width * 0.8,
    height: width * 0.8,
    top: '32%',
    left: -width * 0.28,
  },
  auroraOrbBottomRight: {
    width: width * 0.85,
    height: width * 0.85,
    bottom: -width * 0.2,
    right: -width * 0.15,
  },
  ambientCenterMist: {
    position: 'absolute',
    width: width * 1.1,
    height: width * 0.9,
    top: '25%',
    left: -width * 0.05,
    borderRadius: 999,
  },

  // 2. Nebula Styles (Diagonal Beam & Cosmic Pools)
  nebulaDiagonalBeam: {
    position: 'absolute',
    width: width * 1.7,
    height: width * 0.85,
    top: -width * 0.15,
    left: -width * 0.35,
    borderRadius: width * 0.42,
    transform: [{ rotate: '-32deg' }],
  },
  nebulaTopStreak: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.55,
    top: -width * 0.12,
    right: -width * 0.22,
    borderRadius: 999,
  },
  nebulaBottomPool: {
    position: 'absolute',
    width: width * 1.25,
    height: width * 0.7,
    bottom: -width * 0.22,
    left: -width * 0.12,
    borderRadius: width * 0.62,
  },
  nebulaDustFlare: {
    position: 'absolute',
    width: width * 0.85,
    height: 80,
    top: '48%',
    left: width * 0.08,
    borderRadius: 40,
    transform: [{ rotate: '15deg' }],
  },

  // 3. Emerald Styles (Central Halo, Horizon & Mint)
  emeraldCenterHalo: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    top: '18%',
    left: -width * 0.1,
    borderRadius: 999,
  },
  emeraldTopHorizon: {
    position: 'absolute',
    width: width,
    height: 180,
    top: 0,
    left: 0,
  },
  emeraldBottomMint: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.6,
    bottom: -width * 0.15,
    left: -width * 0.15,
    borderRadius: 999,
  },

  // 4. Sunset Styles (4-Corner Fluid Mesh & Haze)
  meshTopLeft: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    top: -width * 0.22,
    left: -width * 0.22,
    borderRadius: 999,
  },
  meshTopRight: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    top: -width * 0.15,
    right: -width * 0.22,
    borderRadius: 999,
  },
  meshBottomLeft: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    bottom: -width * 0.18,
    left: -width * 0.18,
    borderRadius: 999,
  },
  meshBottomRight: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    bottom: -width * 0.22,
    right: -width * 0.18,
    borderRadius: 999,
  },
  meshCenterHaze: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.7,
    top: '28%',
    left: width * 0.05,
    borderRadius: 999,
  },

  // 5. Cyberpunk Styles (Laser Beam & Stage Dome)
  cyberpunkTopBeam: {
    position: 'absolute',
    width: width,
    height: 200,
    top: 0,
    left: 0,
  },
  cyberpunkBottomDome: {
    position: 'absolute',
    width: width * 1.3,
    height: width * 0.98,
    bottom: -width * 0.36,
    left: -width * 0.15,
    borderRadius: 999,
  },
  cyberpunkCenterFlare: {
    position: 'absolute',
    width: width * 0.85,
    height: 100,
    top: '40%',
    left: width * 0.08,
    borderRadius: 50,
    transform: [{ rotate: '-12deg' }],
  },

  // 6. Midnight Styles (Eclipse Arch & Twilight Crescent)
  midnightTopArch: {
    position: 'absolute',
    width: width * 1.65,
    height: width * 0.95,
    top: -width * 0.4,
    left: -width * 0.32,
    borderRadius: width * 0.82,
  },
  midnightBottomCrescent: {
    position: 'absolute',
    width: width * 1.4,
    height: width * 0.6,
    bottom: -width * 0.22,
    left: -width * 0.2,
    borderRadius: width * 0.7,
  },
  midnightCenterShimmer: {
    position: 'absolute',
    width: width * 0.9,
    height: 120,
    top: '36%',
    left: width * 0.05,
    borderRadius: 60,
  },
});
