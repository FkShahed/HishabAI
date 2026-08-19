import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';

export interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const EMOJI_TO_IONICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  '🏠': 'home-outline',
  '🚌': 'bus-outline',
  '🎮': 'game-controller-outline',
  '🍔': 'fast-food-outline',
  '🛍️': 'bag-handle-outline',
  '🍽️': 'restaurant-outline',
  '🎬': 'film-outline',
  '📱': 'phone-portrait-outline',
  '💸': 'cash-outline',
  '🎁': 'gift-outline',
  '🚬': 'flame-outline',
  '💻': 'laptop-outline',
  '📚': 'book-outline',
  '💇': 'sparkles-outline',
  '⚽': 'football-outline',
  '👥': 'people-outline',
  '👗': 'shirt-outline',
  '🚗': 'car-sport-outline',
  '🍺': 'beer-outline',
  '✈️': 'airplane-outline',
  '🏥': 'medical-outline',
  '🐾': 'paw-outline',
  '🔧': 'construct-outline',
  '🏘️': 'business-outline',
  '❤️': 'heart-outline',
  '🎲': 'trophy-outline',
  '🍟': 'pizza-outline',
  '🧒': 'happy-outline',
  '💰': 'wallet-outline',
  '🏢': 'briefcase-outline',
  '📈': 'trending-up-outline',
  '↩️': 'refresh-outline',
  '🎉': 'star-outline',
  '💹': 'stats-chart-outline',
  '➕': 'add-circle-outline',
  '☕': 'cafe-outline',
  '🍕': 'pizza-outline',
  '🛒': 'cart-outline',
  '💳': 'card-outline',
  '💡': 'bulb-outline',
  '🚕': 'car-outline',
  '💊': 'fitness-outline',
  '🎓': 'school-outline',
  '🎧': 'headset-outline',
  '🎸': 'musical-notes-outline',
  '🍿': 'film-outline',
  '🏋️': 'barbell-outline',
  '🚲': 'bicycle-outline',
  '🎨': 'color-palette-outline',
  '💼': 'briefcase-outline',
  '📊': 'analytics-outline',
  '🏧': 'card-outline',
  '🏦': 'storefront-outline',
  '💎': 'diamond-outline',
  '🔑': 'key-outline',
  '🧾': 'receipt-outline',
  '🧼': 'water-outline',
  '👕': 'shirt-outline',
  '⌚': 'watch-outline',
  '🎟️': 'ticket-outline',
  '🏷️': 'pricetag-outline',
};

export function CategoryIcon({ icon, color, size = 'md' }: CategoryIconProps) {
  const getDimensions = () => {
    switch (size) {
      case 'sm': return { container: 28, iconSize: 16, font: 14, radius: 14 };
      case 'md': return { container: 34, iconSize: 20, font: 18, radius: 17 };
      case 'lg': return { container: 46, iconSize: 27, font: 24, radius: 23 };
      case 'xl': return { container: 62, iconSize: 36, font: 32, radius: 31 };
      default: return { container: 34, iconSize: 20, font: 18, radius: 17 };
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

  // Determine vector icon name
  let vectorName: keyof typeof Ionicons.glyphMap | null = null;
  if (icon && (icon in Ionicons.glyphMap)) {
    vectorName = icon as keyof typeof Ionicons.glyphMap;
  } else if (icon && EMOJI_TO_IONICON[icon]) {
    vectorName = EMOJI_TO_IONICON[icon];
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: dim.container,
          height: dim.container,
          borderRadius: dim.radius,
          backgroundColor: getRgba(color, 0.14),
          borderColor: getRgba(color, 0.32),
          borderWidth: 1,
          ...Platform.select({
            ios: {
              shadowColor: color,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.16,
              shadowRadius: 3,
            },
            android: {
              elevation: 1,
            },
          }),
        },
      ]}
    >
      {vectorName ? (
        <Ionicons name={vectorName} size={dim.iconSize} color={color} />
      ) : (
        <Text style={{ fontSize: dim.font, textAlign: 'center', includeFontPadding: false }}>{icon}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
