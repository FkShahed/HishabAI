import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Radii } from '../../constants/colors';

export interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function CategoryIcon({ icon, color, size = 'md' }: CategoryIconProps) {
  const getDimensions = () => {
    switch (size) {
      case 'sm': return { container: 32, font: 16 };
      case 'md': return { container: 48, font: 24 };
      case 'lg': return { container: 64, font: 32 };
      case 'xl': return { container: 80, font: 40 };
      default: return { container: 48, font: 24 };
    }
  };

  const dim = getDimensions();

  // Convert hex color to a transparent background version (20% opacity)
  const getBgColor = (hex: string) => {
    // Basic hex to rgba converter
    let r = 0, g = 0, b = 0;
    if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, 0.2)`;
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: dim.container,
          height: dim.container,
          borderRadius: dim.container / 2,
          backgroundColor: getBgColor(color),
        },
      ]}
    >
      <Text style={{ fontSize: dim.font }}>{icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
