import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from './Text';

export interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function CategoryIcon({ icon, color, size = 'md' }: CategoryIconProps) {
  const getDimensions = () => {
    switch (size) {
      case 'sm': return { container: 34, font: 16, radius: 10 };
      case 'md': return { container: 44, font: 22, radius: 14 };
      case 'lg': return { container: 58, font: 28, radius: 18 };
      case 'xl': return { container: 72, font: 36, radius: 22 };
      default: return { container: 44, font: 22, radius: 14 };
    }
  };

  const dim = getDimensions();

  const getRgba = (hex: string, opacity: number) => {
    let r = 59, g = 130, b = 246;
    if (hex && hex.startsWith('#')) {
      if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      } else if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      }
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: dim.container,
          height: dim.container,
          borderRadius: dim.radius,
          backgroundColor: getRgba(color, 0.16),
          borderColor: getRgba(color, 0.35),
          borderWidth: 1,
          ...Platform.select({
            ios: {
              shadowColor: color,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
          }),
        },
      ]}
    >
      <Text style={{ fontSize: dim.font, lineHeight: dim.font + 4 }}>{icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
