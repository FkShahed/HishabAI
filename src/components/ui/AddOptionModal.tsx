import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Platform, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { Text } from './Text';
import { Spacing, Radii, Shadows, useThemeColors } from '../../constants/colors';
import { useUIStore } from '../../store';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

let BlurViewComponent: any = null;
try {
  BlurViewComponent = require('expo-blur').BlurView;
} catch (e) {}

interface AddOptionModalProps {
  visible: boolean;
  onClose: () => void;
}

function TravelingBorderGlow({ color1, color2, width, height, visible }: { color1: string; color2: string; width: number; height: number; visible: boolean }) {
  const dashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && width > 0 && height > 0) {
      dashAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(dashAnim, {
          toValue: 1,
          duration: 3400,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [visible, width, height]);

  if (!width || !height) return null;

  const perimeter = 2 * (width + height);
  const dashLength = Math.round(perimeter * 0.12);
  const gapLength = Math.round(perimeter * 0.88);

  const dashOffset = dashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [perimeter, 0],
  });

  const gradientId = `glow-${color1.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: Radii.lg, overflow: 'hidden', pointerEvents: 'none' }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            {/* Tail (soft, faded) */}
            <Stop offset="0%" stopColor={color2} stopOpacity="0" />
            <Stop offset="35%" stopColor={color2} stopOpacity="0.2" />
            
            {/* Body */}
            <Stop offset="80%" stopColor={color1} stopOpacity="0.8" />
            
            {/* Head (leading edge: bright glowing highlight!) */}
            <Stop offset="97%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor={color1} stopOpacity="0.95" />
          </SvgGradient>
        </Defs>

        {/* Base ambient border line */}
        <Rect
          x="1"
          y="1"
          width={width - 2}
          height={height - 2}
          rx={Radii.lg}
          stroke={color1}
          strokeWidth="1"
          strokeOpacity="0.1"
          fill="none"
        />

        {/* Soft Outer Aura Glow */}
        <AnimatedRect
          x="1"
          y="1"
          width={width - 2}
          height={height - 2}
          rx={Radii.lg}
          stroke={`url(#${gradientId})`}
          strokeWidth="3.5"
          strokeOpacity="0.3"
          strokeDasharray={`${dashLength} ${gapLength}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
        />

        {/* Inner Glow Core */}
        <AnimatedRect
          x="1"
          y="1"
          width={width - 2}
          height={height - 2}
          rx={Radii.lg}
          stroke={`url(#${gradientId})`}
          strokeWidth="1.5"
          strokeOpacity="0.75"
          strokeDasharray={`${dashLength} ${gapLength}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

export function AddOptionModal({ visible, onClose }: AddOptionModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const theme = useUIStore((s) => s.theme);

  const [cardLayout, setCardLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const onCardLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (cardLayout.width !== width || cardLayout.height !== height)) {
      setCardLayout({ width, height });
    }
  };

  const handleSelectOption = (path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path as any);
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[
          styles.backdrop,
          Platform.OS === 'web' && ({ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } as any)
        ]}>
          {BlurViewComponent && Platform.OS !== 'web' && (
            <BlurViewComponent 
              intensity={15} 
              tint={theme === 'dark' ? 'dark' : 'light'} 
              style={StyleSheet.absoluteFill} 
            />
          )}

          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[
              styles.sheetContainer,
              { 
                backgroundColor: colors.bg.modal,
                borderColor: colors.border.subtle,
                paddingBottom: Math.max(insets.bottom, 24) + 16,
              }
            ]}>
              {/* Handle bar */}
              <View style={[styles.handleBar, { backgroundColor: colors.border.medium }]} />

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text variant="lg" weight="bold">Create New Entry</Text>
                  <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                    Select how you want to record your transaction
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: colors.bg.secondary }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.optionsList}>
                {/* 1. Voice AI with Traveling SVG Border Light */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelectOption('/voice')}
                  onLayout={onCardLayout}
                >
                  <View style={[styles.optionCardInner, { backgroundColor: colors.bg.card }]}>
                    <TravelingBorderGlow 
                      color1="#10B981" 
                      color2="#34D399" 
                      width={cardLayout.width} 
                      height={cardLayout.height} 
                      visible={visible} 
                    />

                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="mic" size={26} color="#10B981" />
                    </View>

                    <View style={styles.optionTextContainer}>
                      <View style={styles.titleRow}>
                        <Text variant="md" weight="bold">Voice AI</Text>
                        <View style={[styles.aiBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                          <Ionicons name="sparkles" size={10} color="#10B981" />
                          <Text variant="xs" weight="bold" color="#10B981" style={{ marginLeft: 2 }}>AI Instant</Text>
                        </View>
                      </View>
                      <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                        Speak naturally in English, Bangla or Banglish
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                  </View>
                </TouchableOpacity>

                {/* 2. Receipt AI with Traveling SVG Border Light */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelectOption('/receipt')}
                >
                  <View style={[styles.optionCardInner, { backgroundColor: colors.bg.card }]}>
                    <TravelingBorderGlow 
                      color1="#6366F1" 
                      color2="#818CF8" 
                      width={cardLayout.width} 
                      height={cardLayout.height} 
                      visible={visible} 
                    />

                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                      <Ionicons name="receipt" size={26} color="#6366F1" />
                    </View>

                    <View style={styles.optionTextContainer}>
                      <View style={styles.titleRow}>
                        <Text variant="md" weight="bold">Scan Receipt AI</Text>
                        <View style={[styles.aiBadge, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                          <Ionicons name="sparkles" size={10} color="#6366F1" />
                          <Text variant="xs" weight="bold" color="#6366F1" style={{ marginLeft: 2 }}>OCR Fast</Text>
                        </View>
                      </View>
                      <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                        Extract totals and items from receipt photo
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                  </View>
                </TouchableOpacity>

                {/* 3. Manual Entry */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelectOption('/transaction/new')}
                >
                  <View style={[styles.optionCardInner, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, borderWidth: 1 }]}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Ionicons name="create" size={26} color="#F59E0B" />
                    </View>

                    <View style={styles.optionTextContainer}>
                      <Text variant="md" weight="bold">Manual Entry</Text>
                      <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                        Type transaction amount & details yourself
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: Spacing.md,
  },
  optionCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
});
