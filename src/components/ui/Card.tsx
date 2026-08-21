import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radii, Spacing, Shadows, useThemeColors, Gradients } from '../../constants/colors';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outline' | 'gradient' | 'glass';
  gradientColors?: readonly [string, string, ...string[]];
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  style,
  variant = 'default',
  gradientColors,
  padding = 'md',
  children,
  ...props
}: CardProps) {
  const colors = useThemeColors();
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return Spacing.sm;
      case 'md': return Spacing.md;
      case 'lg': return Spacing.lg;
      default: return Spacing.md;
    }
  };

  const padValue = getPadding();

  if (variant === 'gradient') {
    const defaultGradient = colors.bg.primary === '#080810' ? Gradients.heroDark : Gradients.heroLight;
    const finalColors = gradientColors || defaultGradient;

    return (
      <LinearGradient
        colors={finalColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          { padding: padValue, borderColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1 },
          styles.elevated,
          style,
        ]}
        {...props}
      >
        {children}
      </LinearGradient>
    );
  }

  const isGlass = variant === 'glass';

  return (
    <View
      style={[
        styles.card,
        { 
          padding: padValue,
          backgroundColor: isGlass ? colors.bg.glass : variant === 'elevated' ? colors.bg.elevated : colors.bg.card,
          borderColor: isGlass ? colors.bg.glassBorder : colors.border.subtle,
          borderWidth: isGlass ? 1 : 0,
        },
        variant === 'elevated' && styles.elevated,
        variant === 'outline' && styles.outline,
        isGlass && styles.glassCard,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  elevated: {
    ...Shadows.sm,
  },
  outline: {
    borderWidth: 1,
  },
  glassCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});

