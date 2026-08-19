import React from 'react';
import { Text as RNText, TextProps as RNTextProps, Platform } from 'react-native';
import { Typography, useThemeColors } from '../../constants/colors';

export interface TextProps extends RNTextProps {
  variant?: keyof typeof Typography.sizes;
  weight?: keyof typeof Typography.weights;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

const getFontFamily = (weight: keyof typeof Typography.weights) => {
  return Platform.select({
    ios: 'System',
    android: weight === 'bold' || weight === 'extrabold' || weight === 'semibold' ? 'sans-serif-medium' : 'sans-serif',
    web: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'sans-serif',
  });
};

export function Text({
  style,
  variant = 'base',
  weight = 'regular',
  color,
  align = 'left',
  ...props
}: TextProps) {
  const colors = useThemeColors();
  const textColor = color || colors.text.primary;

  return (
    <RNText
      style={[
        {
          fontFamily: getFontFamily(weight),
          fontSize: Typography.sizes[variant],
          lineHeight: Typography.lineHeights[variant],
          letterSpacing: Typography.letterSpacings[variant],
          fontWeight: Typography.weights[weight],
          color: textColor,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    />
  );
}
