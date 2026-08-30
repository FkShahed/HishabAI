import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { Spacing, Radii, Shadows, useThemeColors } from '../../src/constants/colors';
import { usePreviewStore, useCategoryStore } from '../../src/store';
import { AIServiceClient } from '../../src/services/api';

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const getAICategoryList = useCategoryStore((s) => s.getAICategoryList);
  const setPreview = usePreviewStore((s) => s.setPreview);

  const handleProcessText = async () => {
    if (!textInput.trim()) return;

    setIsProcessing(true);
    try {
      const categories = getAICategoryList();
      const result = await AIServiceClient.parseText(textInput, categories);

      if (result.success && result.transactions && result.transactions.length > 0) {
        setPreview(result.transactions, 'voice', result.rawTranscript || textInput, result.processingNotes);
        setIsModalVisible(false);
        setTextInput('');
        router.replace('/transaction-preview');
      } else {
        const msg = result.processingNotes || "AI couldn't identify transaction details from the text. Please specify both the amount and item/category (e.g. 'Spent 300 on food').";
        alert(msg);
      }
    } catch (error: any) {
      console.warn('[AddScreen] text parsing failed:', error);
      alert(error.message || 'Failed to process text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Header title="Add Transaction" />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        
        {/* Manual Entry Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, borderWidth: 1 }]}
          activeOpacity={0.7}
          onPress={() => router.push('/transaction/new')}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.accent.primaryDim }]}>
            <Ionicons name="pencil" size={28} color={colors.accent.primary} />
          </View>
          <View style={styles.cardText}>
            <Text variant="lg" weight="bold">Manual</Text>
            <Text variant="sm" color={colors.text.secondary}>Enter it yourself</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Voice AI Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, borderWidth: 1 }]}
          activeOpacity={0.7}
          onPress={() => router.push('/voice')}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.semantic.incomeDim }]}>
            <Ionicons name="mic" size={28} color={colors.semantic.income} />
          </View>
          <View style={styles.cardText}>
            <View style={styles.titleRow}>
              <Text variant="lg" weight="bold">Voice AI</Text>
              <View style={[styles.sparkleBadge, { backgroundColor: colors.semantic.incomeDim }]}>
                <Ionicons name="sparkles" size={10} color={colors.semantic.income} />
                <Text variant="xs" weight="bold" color={colors.semantic.income} style={{ marginLeft: 2 }}>AI</Text>
              </View>
            </View>
            <Text variant="sm" color={colors.text.secondary}>Tell HisabAI what you spent</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Text AI Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, borderWidth: 1 }]}
          activeOpacity={0.7}
          onPress={() => setIsModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.semantic.warningDim }]}>
            <Ionicons name="chatbox-ellipses" size={28} color={colors.semantic.warning} />
          </View>
          <View style={styles.cardText}>
            <View style={styles.titleRow}>
              <Text variant="lg" weight="bold">Text AI</Text>
              <View style={[styles.sparkleBadgeAmber, { backgroundColor: colors.semantic.warningDim }]}>
                <Ionicons name="sparkles" size={10} color={colors.semantic.warning} />
                <Text variant="xs" weight="bold" color={colors.semantic.warning} style={{ marginLeft: 2 }}>AI</Text>
              </View>
            </View>
            <Text variant="sm" color={colors.text.secondary}>Type your transactions directly</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Receipt AI Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, borderWidth: 1 }]}
          activeOpacity={0.7}
          onPress={() => router.push('/receipt')}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.accent.secondaryDim }]}>
            <Ionicons name="receipt" size={28} color={colors.accent.secondary} />
          </View>
          <View style={styles.cardText}>
            <View style={styles.titleRow}>
              <Text variant="lg" weight="bold">Receipt AI</Text>
              <View style={[styles.sparkleBadgeBlue, { backgroundColor: colors.accent.secondaryDim }]}>
                <Ionicons name="sparkles" size={10} color={colors.accent.secondary} />
                <Text variant="xs" weight="bold" color={colors.accent.secondary} style={{ marginLeft: 2 }}>AI</Text>
              </View>
            </View>
            <Text variant="sm" color={colors.text.secondary}>Scan a receipt</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
        </TouchableOpacity>

      </ScrollView>

      {/* Text AI Input Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!isProcessing) setIsModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle, borderWidth: 1 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={18} color={colors.accent.primary} style={{ marginRight: 6 }} />
                <Text variant="md" weight="bold">Text AI Input</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setIsModalVisible(false);
                  setTextInput('');
                }}
                disabled={isProcessing}
                style={{ padding: Spacing.xs }}
              >
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text variant="xs" color={colors.text.secondary} style={{ marginBottom: Spacing.sm }}>
              Type your income or expense note in English, Bangla, or Banglish:
            </Text>

            <TextInput
              style={[
                styles.textInput,
                { 
                  backgroundColor: colors.bg.elevated, 
                  borderColor: colors.border.medium, 
                  color: colors.text.primary 
                }
              ]}
              placeholder='e.g., "Spent 500 taka on groceries today"'
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={4}
              value={textInput}
              onChangeText={setTextInput}
              editable={!isProcessing}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.accent.primary },
                  (!textInput.trim() || isProcessing) && { opacity: 0.5 }
                ]}
                onPress={handleProcessText}
                disabled={!textInput.trim() || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text variant="base" weight="bold" color="#FFFFFF">Process with AI</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  sparkleBadgeBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  sparkleBadgeAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 16, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
  },
  textInput: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.md,
    minWidth: 150,
  },
});
