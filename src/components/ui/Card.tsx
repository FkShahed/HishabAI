import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors, Radii, Spacing, Shadows } from '../../constants/colors';

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
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return Spacing.md;
      case 'md': return Spacing.lg;
      case 'lg': return Spacing.xl;
      default: return Spacing.lg;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { padding: getPadding() },
        variant === 'default' && styles.default,
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
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: Colors.bg.card,
  },
  elevated: {
    backgroundColor: Colors.bg.elevated,
    ...Shadows.md,
  },
  outline: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
});
