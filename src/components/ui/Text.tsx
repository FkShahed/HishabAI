import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { Typography, useThemeColors } from '../../constants/colors';

export interface TextProps extends RNTextProps {
  variant?: keyof typeof Typography.sizes;
  weight?: keyof typeof Typography.weights;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

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
