import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { Spacing, Radii, useThemeColors } from '../../constants/colors';

export interface CustomAlertModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  transcript?: string | null;
  missingDetails?: string | null;
  message?: string | null;
  type?: 'warning' | 'error' | 'info' | 'success';
  iconOverride?: keyof typeof Ionicons.glyphMap;
  primaryButtonText?: string;
  onPrimaryPress?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  showExamples?: boolean;
}

export function CustomAlertModal({
  visible,
  onClose,
  title = 'Needs More Details',
  transcript,
  missingDetails,
  message,
  type = 'warning',
  iconOverride,
  primaryButtonText = 'Try Again',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  showExamples = true,
}: CustomAlertModalProps) {
  const colors = useThemeColors();

  const getBadgeConfig = () => {
    if (iconOverride) {
      const color = type === 'success' ? colors.semantic.income : type === 'error' ? colors.semantic.danger : type === 'info' ? colors.accent.primary : colors.semantic.warning;
      const bgColor = type === 'success' ? colors.semantic.incomeDim : type === 'error' ? colors.semantic.dangerDim : type === 'info' ? colors.accent.primaryDim : colors.semantic.warningDim;
      return { icon: iconOverride, color, bgColor };
    }
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          color: colors.semantic.income,
          bgColor: colors.semantic.incomeDim,
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          color: colors.semantic.danger,
          bgColor: colors.semantic.dangerDim,
        };
      case 'info':
        return {
          icon: 'information-circle' as const,
          color: colors.accent.primary,
          bgColor: colors.accent.primaryDim,
        };
      case 'warning':
      default:
        return {
          icon: 'bulb-outline' as const,
          color: colors.semantic.warning,
          bgColor: colors.semantic.warningDim,
        };
    }
  };

  const badge = getBadgeConfig();

  const handlePrimaryAction = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else {
      onClose();
    }
  };

  const handleSecondaryAction = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View 
          style={[
            styles.modalCard, 
            { 
              backgroundColor: colors.bg.modal, 
              borderColor: colors.border.subtle,
              borderWidth: 1 
            }
          ]}
        >
          {/* Top Badge Icon */}
          <View style={styles.badgeWrapper}>
            <View style={[styles.badgeCircle, { backgroundColor: badge.bgColor }]}>
              <Ionicons name={badge.icon} size={32} color={badge.color} />
            </View>
          </View>

          {/* Title */}
          <Text variant="lg" weight="bold" align="center" style={styles.title}>
            {title}
          </Text>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            {/* The AI Heard Card */}
            {transcript ? (
              <View style={[styles.transcriptBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
                <View style={styles.transcriptHeader}>
                  <Ionicons name="mic-outline" size={16} color={colors.accent.primary} />
                  <Text variant="xs" weight="bold" color={colors.accent.primary} style={{ marginLeft: 6 }}>
                    The AI heard:
                  </Text>
                </View>
                <Text variant="sm" weight="semibold" color={colors.text.primary} style={styles.transcriptText}>
                  "{transcript}"
                </Text>
              </View>
            ) : null}

            {/* Missing Details / Feedback Message */}
            {missingDetails ? (
              <View style={[styles.missingBox, { backgroundColor: colors.semantic.warningDim, borderColor: colors.semantic.warning }]}>
                <View style={styles.missingHeader}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.semantic.warning} />
                  <Text variant="xs" weight="bold" color={colors.semantic.warning} style={{ marginLeft: 6 }}>
                    Missing details:
                  </Text>
                </View>
                <Text variant="sm" color={colors.text.primary} style={styles.missingText}>
                  {missingDetails}
                </Text>
              </View>
            ) : message ? (
              <Text variant="sm" color={colors.text.secondary} align="center" style={styles.messageText}>
                {message}
              </Text>
            ) : null}

            {/* Examples Hint Box */}
            {showExamples && (transcript || missingDetails) && (
              <View style={[styles.examplesContainer, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
                <View style={styles.examplesHeader}>
                  <Ionicons name="sparkles-outline" size={14} color={colors.text.tertiary} />
                  <Text variant="xs" weight="bold" color={colors.text.tertiary} style={{ marginLeft: 6 }}>
                    Try saying something like:
                  </Text>
                </View>

                <View style={styles.exampleItem}>
                  <Text variant="xs" color={colors.accent.primary} weight="bold">•</Text>
                  <Text variant="xs" color={colors.text.secondary} style={styles.exampleItemText}>
                    "Spent 500 on groceries at Shwapno"
                  </Text>
                </View>
                <View style={styles.exampleItem}>
                  <Text variant="xs" color={colors.accent.primary} weight="bold">•</Text>
                  <Text variant="xs" color={colors.text.secondary} style={styles.exampleItemText}>
                    "Paid 120 Taka for rickshaw ride"
                  </Text>
                </View>
                <View style={styles.exampleItem}>
                  <Text variant="xs" color={colors.accent.primary} weight="bold">•</Text>
                  <Text variant="xs" color={colors.text.secondary} style={styles.exampleItemText}>
                    "Received 15000 salary from office"
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {secondaryButtonText && (
              <Button
                label={secondaryButtonText}
                variant="secondary"
                onPress={handleSecondaryAction}
                style={styles.secondaryBtn}
              />
            )}
            <Button
              label={primaryButtonText}
              variant="primary"
              onPress={handlePrimaryAction}
              style={[styles.primaryBtn, !secondaryButtonText && { flex: 1 }]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeWrapper: {
    alignItems: 'center',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: Spacing.md,
  },
  scrollArea: {
    maxHeight: 340,
  },
  scrollContent: {
    paddingBottom: Spacing.xs,
  },
  transcriptBox: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  transcriptText: {
    fontStyle: 'italic',
    lineHeight: 20,
  },
  missingBox: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  missingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  missingText: {
    lineHeight: 20,
  },
  messageText: {
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  examplesContainer: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  examplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  exampleItemText: {
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  secondaryBtn: {
    flex: 1,
  },
  primaryBtn: {
    flex: 1.2,
  },
});
