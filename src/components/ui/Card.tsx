import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Radii, Spacing, Shadows, useThemeColors } from '../../constants/colors';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  style,
  variant = 'default',
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

  return (
    <View
      style={[
        styles.card,
        { 
          padding: getPadding(),
          backgroundColor: variant === 'elevated' ? colors.bg.elevated : colors.bg.card,
          borderColor: colors.border.subtle,
        },
        variant === 'elevated' && styles.elevated,
        variant === 'outline' && styles.outline,
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
});
