import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  '🏥': 'medical',
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
  '💊': 'fitness',
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
      case 'sm': return { container: 30, iconSize: 16, font: 14, radius: 9, pip: 6 };
      case 'md': return { container: 40, iconSize: 21, font: 18, radius: 12, pip: 7.5 };
      case 'lg': return { container: 52, iconSize: 28, font: 25, radius: 16, pip: 9 };
      case 'xl': return { container: 68, iconSize: 38, font: 34, radius: 20, pip: 11 };
      default: return { container: 40, iconSize: 21, font: 18, radius: 12, pip: 7.5 };
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

  const topBorder = getRgba(effectiveIconColor, isDark ? 0.55 : 0.42);
  const bottomBorder = getRgba(effectiveIconColor, isDark ? 0.22 : 0.16);
  const sideBorder = getRgba(effectiveIconColor, isDark ? 0.38 : 0.28);

  const pipColor =
    liveStatus === 'danger'
      ? colors.semantic.danger
      : liveStatus === 'warning'
      ? colors.semantic.warning
      : colors.semantic.income;

  return (
    <View
      style={[
        styles.outerWrapper,
        {
          width: dim.container,
          height: dim.container,
          shadowColor: effectiveIconColor,
          shadowOpacity: isDark ? 0.34 : 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        style,
      ]}
    >
      {/* Luminous Frosted Squircle with Angled Gradient */}
      <LinearGradient
        colors={
          isDark
            ? [getRgba(effectiveIconColor, 0.28), getRgba(effectiveIconColor, 0.11)]
            : [getRgba(effectiveIconColor, 0.20), getRgba(effectiveIconColor, 0.07)]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[
          styles.container,
          {
            width: dim.container,
            height: dim.container,
            borderRadius: dim.radius,
            borderTopColor: topBorder,
            borderBottomColor: bottomBorder,
            borderLeftColor: sideBorder,
            borderRightColor: sideBorder,
            borderWidth: 1,
          },
        ]}
      >
        {/* Specular Top-Edge Reflection Highlight */}
        <View
          style={[
            styles.specularHighlight,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.42)',
            },
          ]}
        />

        {/* Semantic Icon Glyph or Fallback Emoji */}
        {vectorName ? (
          <Ionicons name={vectorName} size={dim.iconSize} color={effectiveIconColor} />
        ) : (
          <Text style={{ fontSize: dim.font, textAlign: 'center', includeFontPadding: false }}>
            {icon || '🏷️'}
          </Text>
        )}
      </LinearGradient>

      {/* Live Activity / Connection Pip */}
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
  outerWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  specularHighlight: {
    position: 'absolute',
    top: 1,
    width: '55%',
    height: 1.5,
    borderRadius: 1,
  },
  livePip: {
    position: 'absolute',
    top: -1,
    right: -1,
    borderWidth: 1.5,
  },
});
