import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useThemeColors } from '../../constants/colors';

export interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  live?: boolean;
  liveStatus?: 'active' | 'warning' | 'danger';
  style?: ViewStyle;
}

const EMOJI_TO_IONICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  '🏠': 'home',
  '🚌': 'bus',
  '🎮': 'game-controller',
  '🍔': 'fast-food',
  '🛍️': 'bag-handle',
  '🍽️': 'restaurant',
  '🎬': 'film',
  '📱': 'phone-portrait',
  '💸': 'cash',
  '🎁': 'gift',
  '🚬': 'flame',
  '💻': 'laptop',
  '📚': 'book',
  '💇': 'cut',
  '⚽': 'football',
  '👥': 'people',
  '👗': 'shirt',
  '🚗': 'car-sport',
  '🍺': 'beer',
  '✈️': 'airplane',
  '🏥': 'medkit',
  '🐾': 'paw',
  '🔧': 'construct',
  '🏘️': 'business',
  '❤️': 'heart',
  '🎲': 'trophy',
  '🍟': 'pizza',
  '🧒': 'happy',
  '💰': 'wallet',
  '🏢': 'business',
  '📈': 'trending-up',
  '↩️': 'arrow-undo',
  '🎉': 'ribbon',
  '💹': 'stats-chart',
  '➕': 'add-circle',
  '☕': 'cafe',
  '🍕': 'pizza',
  '🍰': 'nutrition',
  '🛒': 'cart',
  '💳': 'card',
  '💡': 'bulb',
  '⛽': 'car',
  '🚕': 'car-sport',
  '💊': 'medkit',
  '🎓': 'school',
  '🎧': 'headset',
  '🎸': 'musical-notes',
  '🍿': 'film',
  '🏕️': 'compass',
  '🏋️': 'barbell',
  '🚲': 'bicycle',
  '🎨': 'color-palette',
  '💼': 'briefcase',
  '📊': 'analytics',
  '🏧': 'card',
  '🏦': 'business',
  '💎': 'diamond',
  '🔑': 'key',
  '🧾': 'receipt',
  '🧼': 'water',
  '👕': 'shirt',
  '👠': 'shirt',
  '⌚': 'watch',
  '🎟️': 'ticket',
  '🏷️': 'pricetag',
  '💵': 'cash',
  '🏆': 'trophy',
  '🥇': 'medal',
  '🤝': 'people',
  '🪙': 'wallet',
  '⚡': 'flash',
  '🚀': 'rocket',
  '⭐': 'star',
  '✨': 'sparkles',
  '🧘': 'fitness',
  '🩺': 'medkit',
  '🔬': 'flask',
  '🏨': 'bed',
  '🏖️': 'sunny',
  '🎯': 'locate',
};

export function CategoryIcon({ icon, color, size = 'md', live = false, liveStatus = 'active', style }: CategoryIconProps) {
  const colors = useThemeColors();
  const isDark = colors.bg.primary === '#080810';
  const activeColor = color || '#7C3AED';

  const getDimensions = () => {
    switch (size) {
      case 'sm': return { container: 32, iconSize: 16, font: 14, radius: 16, pip: 6 };
      case 'md': return { container: 38, iconSize: 20, font: 17, radius: 19, pip: 7 };
      case 'lg': return { container: 48, iconSize: 26, font: 23, radius: 24, pip: 9 };
      case 'xl': return { container: 64, iconSize: 36, font: 32, radius: 32, pip: 11 };
      default: return { container: 38, iconSize: 20, font: 17, radius: 19, pip: 7 };
    }
  };

  const dim = getDimensions();

  const getRgba = (hex: string, opacity: number) => {
    let r = 124, g = 58, b = 237;
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

  // Adjust faint/pastel colors in Light mode for crisp contrast & high readability
  const hexLower = activeColor.toLowerCase();
  const isTooLight = hexLower === '#fde68a' || hexLower === '#fcd34d' || hexLower === '#eab308' || hexLower === '#ffffff' || hexLower === '#fef08a';
  const effectiveIconColor = (!isDark && isTooLight) ? '#D97706' : activeColor;

  const pipColor =
    liveStatus === 'danger'
      ? colors.semantic.danger
      : liveStatus === 'warning'
      ? colors.semantic.warning
      : colors.semantic.income;

  return (
    <View style={[styles.wrapper, style]}>
      {/* Clean, Fully Rounded Circular Container with Uniform Border */}
      <View
        style={[
          styles.circle,
          {
            width: dim.container,
            height: dim.container,
            borderRadius: dim.radius,
            backgroundColor: getRgba(effectiveIconColor, isDark ? 0.18 : 0.12),
            borderColor: getRgba(effectiveIconColor, isDark ? 0.35 : 0.25),
            borderWidth: 1,
          },
        ]}
      >
        {/* Semantic Icon Glyph or Fallback Emoji */}
        {vectorName ? (
          <View style={vectorName === 'airplane' ? styles.flyPlane : undefined}>
            <Ionicons name={vectorName} size={dim.iconSize} color={effectiveIconColor} />
          </View>
        ) : (
          <Text style={{ fontSize: dim.font, textAlign: 'center', includeFontPadding: false }}>
            {icon || '🏷️'}
          </Text>
        )}
      </View>

      {/* Optional Live Status Pip */}
      {live && (
        <View
          style={[
            styles.livePip,
            {
              width: dim.pip,
              height: dim.pip,
              borderRadius: dim.pip / 2,
              backgroundColor: pipColor,
              borderColor: isDark ? '#080810' : '#FFFFFF',
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  livePip: {
    position: 'absolute',
    top: -1,
    right: -1,
    borderWidth: 1.5,
  },
  flyPlane: {
    transform: [{ rotate: '-45deg' }],
  },
});
