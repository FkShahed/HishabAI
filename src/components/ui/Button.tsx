import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Text } from './Text';
import { Radii, Spacing, Typography, useThemeColors } from '../../constants/colors';

export interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const colors = useThemeColors();

  const getBgColor = () => {
    if (disabled) return colors.bg.secondary;
    switch (variant) {
      case 'primary': return colors.accent.primary;
      case 'secondary': return colors.bg.secondary;
      case 'danger': return colors.semantic.danger;
      case 'ghost': return 'transparent';
      default: return colors.accent.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.text.tertiary;
    switch (variant) {
      case 'primary': return '#FFFFFF';
      case 'secondary': return colors.text.primary;
      case 'danger': return '#FFFFFF';
      case 'ghost': return colors.accent.primary;
      default: return colors.text.primary;
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm': return 34;
      case 'md': return 44;
      case 'lg': return 50;
      default: return 44;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || isLoading}
      style={[
        styles.button,
        {
          backgroundColor: getBgColor(),
          height: getHeight(),
          borderRadius: Radii.md,
          paddingHorizontal: size === 'sm' ? Spacing.sm + 2 : Spacing.md,
        },
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            weight="semibold"
            color={getTextColor()}
            variant={size === 'sm' ? 'xs' : 'base'}
          >
            {label}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
  },
});
