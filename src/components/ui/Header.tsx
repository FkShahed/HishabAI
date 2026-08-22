import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Spacing, HEADER_HEIGHT, useThemeColors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export function Header({ title, showBack = false, onBack, rightElement }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View style={[
      styles.container, 
      { paddingTop: insets.top, backgroundColor: colors.topbar.bg, borderBottomColor: colors.topbar.border },
      Platform.OS === 'web' && ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any)
    ]}>
      <View style={styles.content}>
        {/* Left Side */}
        <View style={styles.side}>
          {showBack && (
            <TouchableOpacity 
              onPress={onBack} 
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={colors.topbar.icon} />
            </TouchableOpacity>
          )}
        </View>

        {/* Title: Takes maximum available width and scales gracefully */}
        <View style={styles.titleWrapper}>
          <Text 
            variant="lg" 
            weight="bold" 
            color={colors.topbar.text}
            style={styles.title} 
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.85}
          >
            {title}
          </Text>
        </View>

        {/* Right Side */}
        <View style={[styles.side, styles.rightSide]}>
          {rightElement || null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  side: {
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  title: {
    textAlign: 'center',
    width: '100%',
  },
});
