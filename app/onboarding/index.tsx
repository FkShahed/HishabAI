import React from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { useUIStore } from '../../src/store';
import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Button } from '../../src/components/ui/Button';
import { Colors, Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const setFirstLaunch = useUIStore((state) => state.setFirstLaunch);
  const colors = useThemeColors();

  const handleGetStarted = () => {
    setFirstLaunch(false);
    router.replace('/(tabs)');
  };

  return (
    <GlassBackground style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          
          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={styles.iconContainer}>
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text variant="hero" weight="extrabold" align="center" style={styles.title}>
              HisabAI
            </Text>
            <Text variant="lg" color={colors.text.secondary} align="center" style={styles.subtitle}>
              Track your money naturally.
            </Text>
          </View>

          {/* Features Section */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="mic" size={24} color="#10B981" />
              </View>
              <View style={styles.featureText}>
                <Text variant="md" weight="bold">Voice AI Input</Text>
                <Text variant="sm" color={colors.text.secondary}>"I spent 500 taka on groceries"</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                <Ionicons name="camera" size={24} color="#06B6D4" />
              </View>
              <View style={styles.featureText}>
                <Text variant="md" weight="bold">Receipt Scanner</Text>
                <Text variant="sm" color={colors.text.secondary}>Snap a picture of your receipt</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.accent.primaryDim }]}>
                <Ionicons name="pie-chart" size={24} color={colors.accent.primary} />
              </View>
              <View style={styles.featureText}>
                <Text variant="md" weight="bold">Smart Analytics</Text>
                <Text variant="sm" color={colors.text.secondary}>Beautiful charts and insights</Text>
              </View>
            </View>
          </View>

          {/* Action Section */}
          <View style={styles.footer}>
            <Button
              label="Get Started"
              size="lg"
              onPress={handleGetStarted}
              rightIcon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
              style={styles.button}
            />
          </View>

        </View>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    marginTop: Spacing.section,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  title: {
    color: Colors.accent.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    marginBottom: Spacing.xl,
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  action: {
    marginBottom: Spacing.lg,
  },
  footer: {
    marginBottom: Spacing.lg,
  },
  button: {
    width: '100%',
  },
});
