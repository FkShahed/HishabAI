import React from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useUIStore } from '../../src/store';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Colors, Spacing, Radii } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const setFirstLaunch = useUIStore((state) => state.setFirstLaunch);

  const handleGetStarted = () => {
    setFirstLaunch(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={48} color={Colors.accent.primary} />
          </View>
          <Text variant="hero" weight="extrabold" align="center" style={styles.title}>
            HisabAI
          </Text>
          <Text variant="lg" color={Colors.text.secondary} align="center" style={styles.subtitle}>
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
              <Text variant="md" weight="bold">Speak</Text>
              <Text variant="sm" color={Colors.text.secondary}>"I spent 500 taka on groceries"</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="receipt" size={24} color="#3B82F6" />
            </View>
            <View style={styles.featureText}>
              <Text variant="md" weight="bold">Scan</Text>
              <Text variant="sm" color={Colors.text.secondary}>Snap a picture of your receipt</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.accent.primaryDim }]}>
              <Ionicons name="pie-chart" size={24} color={Colors.accent.primary} />
            </View>
            <View style={styles.featureText}>
              <Text variant="md" weight="bold">Track</Text>
              <Text variant="sm" color={Colors.text.secondary}>Beautiful charts and insights</Text>
            </View>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.action}>
          <Button
            label="Get Started"
            size="lg"
            onPress={handleGetStarted}
            rightIcon={<Ionicons name="arrow-forward" size={20} color={Colors.text.primary} />}
            style={styles.button}
          />
        </View>

      </View>
    </SafeAreaView>
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
    borderRadius: 48,
    backgroundColor: Colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
  button: {
    width: '100%',
  },
});
