import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../src/components/ui/Text';
import { GlassBackground } from '../src/components/ui/GlassBackground';
import { Header } from '../src/components/ui/Header';
import { Spacing, Radii, useThemeColors } from '../src/constants/colors';

export default function TermsAndPrivacyScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <GlassBackground style={styles.container}>
      <Header 
        title="Terms & Privacy" 
        showBack={true} 
        onBack={() => router.back()} 
      />

      {/* Segmented Switch */}
      <View style={styles.tabWrapper}>
        <View style={[styles.toggleContainer, { backgroundColor: colors.bg.secondary }]}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'terms' && { backgroundColor: colors.accent.primary }
            ]}
            onPress={() => setActiveTab('terms')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="document-text-outline" 
              size={15} 
              color={activeTab === 'terms' ? '#FFFFFF' : colors.text.secondary} 
              style={{ marginRight: 6 }}
            />
            <Text 
              variant="sm" 
              weight="bold" 
              color={activeTab === 'terms' ? '#FFFFFF' : colors.text.secondary}
            >
              Terms of Service
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'privacy' && { backgroundColor: colors.accent.primary }
            ]}
            onPress={() => setActiveTab('privacy')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="shield-checkmark-outline" 
              size={15} 
              color={activeTab === 'privacy' ? '#FFFFFF' : colors.text.secondary} 
              style={{ marginRight: 6 }}
            />
            <Text 
              variant="sm" 
              weight="bold" 
              color={activeTab === 'privacy' ? '#FFFFFF' : colors.text.secondary}
            >
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'terms' ? (
          /* ── Terms of Service ─────────────────────────────────────────── */
          <View style={styles.sectionList}>
            <View style={[styles.infoBanner, { backgroundColor: colors.accent.primaryDim, borderColor: colors.accent.primary }]}>
              <Ionicons name="information-circle" size={18} color={colors.accent.primary} />
              <Text variant="xs" color={colors.accent.primary} weight="medium" style={{ marginLeft: 8, flex: 1 }}>
                Last updated: August 15, 2026. Please read these terms carefully before using HisabAI.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons name="checkmark-done" size={16} color={colors.accent.primary} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  1. Acceptance of Terms
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                By downloading, accessing, or using the HisabAI mobile application and associated services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please discontinue using the application.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons name="hardware-chip" size={16} color={colors.accent.primary} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  2. Service Description & AI Features
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                HisabAI is a personal financial expense and budget tracking tool. It provides automated extraction features via voice notes and receipt scanning utilizing advanced AI models (Google Gemini AI and Cloud Vision OCR).
              </Text>
              <Text variant="sm" color={colors.text.secondary} style={[styles.bodyText, { marginTop: Spacing.xs }]}>
                AI extractions are suggestions to assist tracking. You retain full control to review, edit, or discard any extracted transaction before it is permanently recorded.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons name="wallet-outline" size={16} color={colors.accent.primary} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  3. Financial Disclaimer
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                HisabAI is designed solely for personal bookkeeping and expense tracking. It does not provide certified financial, accounting, legal, or investment advice. HisabAI is not a bank or financial institution.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons name="person-circle-outline" size={16} color={colors.accent.primary} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  4. User Accounts & Security
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access to your account.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.semantic.dangerDim }]}>
                  <Ionicons name="trash-outline" size={16} color={colors.semantic.danger} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  5. Data Deletion & Termination
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                You have the right to delete your transaction data or permanently terminate and delete your account at any time directly through the app settings under the Danger Zone section.
              </Text>
            </View>
          </View>
        ) : (
          /* ── Privacy Policy ───────────────────────────────────────────── */
          <View style={styles.sectionList}>
            <View style={[styles.infoBanner, { backgroundColor: colors.semantic.safeDim, borderColor: colors.semantic.safe }]}>
              <Ionicons name="lock-closed" size={18} color={colors.semantic.safe} />
              <Text variant="xs" color={colors.semantic.safe} weight="medium" style={{ marginLeft: 8, flex: 1 }}>
                Your financial data belongs to you. We do not sell or rent your personal information.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons name="layers-outline" size={16} color={colors.accent.primary} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  1. Information We Collect
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                • <Text weight="bold" color={colors.text.primary}>Account Data:</Text> Name and email address when you register or sign in with Google or Email.
              </Text>
              <Text variant="sm" color={colors.text.secondary} style={[styles.bodyText, { marginTop: 4 }]}>
                • <Text weight="bold" color={colors.text.primary}>Financial Records:</Text> Transactions, amounts, dates, categories, and optional personal notes you record.
              </Text>
              <Text variant="sm" color={colors.text.secondary} style={[styles.bodyText, { marginTop: 4 }]}>
                • <Text weight="bold" color={colors.text.primary}>Voice & Images:</Text> Audio recordings and receipt photos provided by you solely for transaction extraction.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons name="hardware-chip-outline" size={16} color={colors.accent.primary} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  2. How AI Processing Works
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                Audio clips and receipt images are transmitted securely over TLS encryption to our backend and processed ephemerally using Google Gemini AI and Google Cloud Vision OCR to parse transaction fields.
              </Text>
              <Text variant="sm" color={colors.text.secondary} style={[styles.bodyText, { marginTop: Spacing.xs }]}>
                Voice recordings and raw receipt uploads are not retained after processing completes.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons name="cloud-outline" size={16} color={colors.accent.primary} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  3. Storage & Cloud Synchronization
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                HisabAI uses local device storage for rapid, offline-capable tracking. When logged in, your transactions synchronize securely with Google Firebase Cloud Firestore, allowing you to access your records across multiple devices.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons name="shield-outline" size={16} color={colors.accent.primary} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  4. Your Privacy Rights
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                You maintain complete ownership of your data. You may view, edit, export, or permanently delete any transaction, or delete your entire account and associated data from cloud servers at any time.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accent.primaryDim }]}>
                  <Ionicons name="mail-outline" size={16} color={colors.accent.primary} />
                </View>
                <Text variant="md" weight="bold" style={{ marginLeft: Spacing.sm }}>
                  5. Contact & Support
                </Text>
              </View>
              <Text variant="sm" color={colors.text.secondary} style={styles.bodyText}>
                If you have questions regarding these Terms or our Privacy Policy, please contact our support team at support@hishabai.com.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabWrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.sm,
  },
  content: {
    padding: Spacing.md,
  },
  sectionList: {
    gap: Spacing.md,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  card: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs + 2,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyText: {
    lineHeight: 20,
  },
});
