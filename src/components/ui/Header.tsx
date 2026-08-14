import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg.primary, borderBottomColor: colors.border.subtle }]}>
      <View style={styles.content}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>

        <Text variant="lg" weight="bold" style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.right}>
          {rightElement}
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
  left: {
    flex: 1,
    alignItems: 'flex-start',
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  title: {
    flex: 2,
    textAlign: 'center',
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
  },
});
