import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Animated } from 'react-native';


import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest, ResponseType, makeRedirectUri } from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';


import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Header } from '../../src/components/ui/Header';
import { Button } from '../../src/components/ui/Button';
import { Spacing, Radii, Typography, useThemeColors } from '../../src/constants/colors';
import { AuthService, FirebaseService, auth } from '../../src/services/firebase';
import { useTransactionStore, useUIStore, useBudgetStore } from '../../src/store';

import Constants from 'expo-constants';


WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const setTransactions = useTransactionStore((s) => s.setTransactions);
  const setUserName = useUIStore((s) => s.setUserName);
  const isExpoGo = Constants.appOwnership === 'expo';
  const setUserPhotoUrl = useUIStore((s) => s.setUserPhotoUrl);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'password' | null>(null);

  const isDark = colors.bg.primary === '#080810';
  const tabAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchMode = (targetMode: 'signin' | 'signup') => {
    if (mode === targetMode) return;
    setErrorMessage('');
    
    Animated.parallel([
      Animated.timing(tabAnim, {
        toValue: targetMode === 'signin' ? 0 : 1,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.35,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    setMode(targetMode);
  };

  const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '254866158438-sm0ksqb3dathmggubibr9d7no51lcgio.apps.googleusercontent.com';
  const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '254866158438-m6c9hglpc030rjemqtchjmtdl2pre70j.apps.googleusercontent.com';

  // Use Native Android Client ID on Android, Web Client ID on Web
  const clientId = Platform.OS === 'android' ? GOOGLE_ANDROID_CLIENT_ID : GOOGLE_WEB_CLIENT_ID;
  const redirectUri = Platform.OS === 'web'
    ? 'https://hishab-ai.firebaseapp.com/__/auth/handler'
    : makeRedirectUri({ scheme: 'hisabai' });

  const GOOGLE_DISCOVERY = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: ResponseType.IdToken,
    },
    GOOGLE_DISCOVERY
  );

  const loadUserData = async (userId: string) => {
    try {
      const [cloudTxns, cloudBudgets, cloudProfile] = await Promise.all([
        FirebaseService.fetchTransactions(userId),
        FirebaseService.fetchBudgets(userId),
        FirebaseService.fetchUserProfile(userId),
      ]);
      if (cloudTxns) {
        setTransactions(cloudTxns as any[]);
      }

      if (cloudBudgets) {
        useBudgetStore.getState().setBudgets(cloudBudgets);
      }
      await useUIStore.getState().fetchAndSyncUserProfile(userId);
    } catch (err) {
      console.warn('Load user data error:', err);
    }
  };





  useEffect(() => {
    if (response?.type === 'success') {
      const params = response.params as Record<string, any>;
      const token = params?.id_token || (response as any)?.authentication?.idToken;
      if (token) {
        setLoading(true);
        const credential = GoogleAuthProvider.credential(token);
        signInWithCredential(auth, credential)
          .then(async (userCred) => {
            const user = userCred.user;
            await loadUserData(user.uid);
            const currentStoreName = useUIStore.getState().userName;
            if (!currentStoreName && user.displayName) {
              setUserName(user.displayName);
            }
            const pic = user.photoURL || user.providerData?.[0]?.photoURL;
            if (pic && !useUIStore.getState().userPhotoUrl) {
              setUserPhotoUrl(pic);
            }
            router.replace('/(tabs)');
          })
          .catch((err: any) => {
            console.error('Google sign-in error:', err);
            setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
          })
          .finally(() => setLoading(false));
      }
    }
  }, [response]);

  // If user is already signed in, prevent viewing sign in / sign up page
  useEffect(() => {
    if (auth?.currentUser && !auth.currentUser.isAnonymous && auth.currentUser.email) {
      router.replace('/(tabs)');
    }
  }, []);

  const handleAuthAction = async () => {
    setErrorMessage('');

    if (mode === 'signup' && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (mode === 'signup') {
        user = await AuthService.signUp(email.trim(), password, name.trim());
        if (user && name.trim()) {
          setUserName(name.trim());
        }
      } else {
        user = await AuthService.signIn(email.trim(), password);
      }

      if (user) {
        // Fetch user data completely while showing loader (syncs saved cloud profile)
        await loadUserData(user.uid);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Auth action failed:', error);
      let msg = error.message || 'Authentication failed.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        msg = 'No account found with this email, or password is incorrect. If you need a new account, tap "Create Account".';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email already exists. Try signing in instead.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const user = await AuthService.signInWithGoogle();
        if (user) {
          const creationTime = user.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
          const lastSignInTime = user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : 0;
          const isNewUser = Math.abs(creationTime - lastSignInTime) < 5000;

          if (mode === 'signin' && isNewUser) {
            user.delete().catch(() => AuthService.signOut());
            setErrorMessage('No account found for this Google email. Please tap "Create Account" tab to register.');
            return;
          }

          // Fetch user data completely while showing loader
          await loadUserData(user.uid);
          const currentStoreName = useUIStore.getState().userName;
          if (!currentStoreName && user.displayName) {
            setUserName(user.displayName);
          }
          const pic = (user as any).customPhotoURL || user.photoURL || user.providerData?.[0]?.photoURL;
          if (pic && !useUIStore.getState().userPhotoUrl) {
            setUserPhotoUrl(pic);
          }
          router.replace('/(tabs)');
        }
      } else {
        // Native Mobile
        if (promptAsync) {
          await promptAsync();
        } else {
          setErrorMessage('Google Sign-In is initializing. Please tap again or use Email & Password.');
        }
      }
    } catch (error: any) {
      console.error('Google Auth failed:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(error.message || 'Google authentication failed. Please try again or use Email & Password.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <GlassBackground style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <Header
        title={mode === 'signin' ? 'Sign In' : 'Create Account'}
        showBack={true}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>

        {/* Header Hero */}
        <View style={styles.hero}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border.subtle, borderWidth: 1 }]}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text variant="xl" weight="bold" align="center" color={colors.text.primary} style={{ marginTop: Spacing.md }}>
            {mode === 'signin' ? 'Welcome Back' : 'Save & Sync Your Data'}
          </Text>
          <Text variant="sm" color={colors.text.secondary} align="center" style={{ marginTop: 4 }}>
            {mode === 'signin'
              ? 'Sign in to access your money tracker from any device.'
              : 'Create an account to keep your transactions synced forever.'}
          </Text>
        </View>

        {/* Smooth Glassmorphic Mode Toggle */}
        <View style={[styles.toggleRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)', borderColor: colors.border.subtle, borderWidth: 1 }]}>
          <Animated.View
            style={[
              styles.slidingPill,
              {
                backgroundColor: colors.bg.card,
                borderColor: colors.accent.primary,
                borderWidth: 1,
                left: tabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['1%', '50%'],
                }),
              },
            ]}
          />
          <TouchableOpacity
            style={styles.toggleTab}
            onPress={() => switchMode('signin')}
            activeOpacity={0.8}
          >
            <Text
              variant="sm"
              weight={mode === 'signin' ? 'bold' : 'medium'}
              color={mode === 'signin' ? colors.accent.primary : colors.text.secondary}
            >
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleTab}
            onPress={() => switchMode('signup')}
            activeOpacity={0.8}
          >
            <Text
              variant="sm"
              weight={mode === 'signup' ? 'bold' : 'medium'}
              color={mode === 'signup' ? colors.accent.primary : colors.text.secondary}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: colors.semantic.dangerDim }]}>
            <Ionicons name="alert-circle" size={20} color={colors.semantic.danger} />
            <Text variant="xs" color={colors.semantic.danger} style={{ marginLeft: 8, flex: 1 }}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Glassmorphic Form Card with Smooth Fade Animation */}
        <Animated.View 
          style={[
            styles.formCard,
            {
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              borderWidth: 0,
              opacity: fadeAnim,
            },
          ]}
        >
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text variant="xs" weight="bold" color={colors.text.secondary} style={styles.label}>
                FULL NAME
              </Text>
              <View style={[
                styles.inputWrapper, 
                { 
                  backgroundColor: colors.bg.card, 
                  borderColor: focusedInput === 'name' ? colors.accent.primary : colors.border.subtle 
                }
              ]}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={focusedInput === 'name' ? colors.accent.primary : colors.text.tertiary} 
                  style={{ marginRight: 10 }} 
                />
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary }]}
                  placeholder="e.g. Fazlul Karim Shahed"
                  placeholderTextColor={colors.text.tertiary}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text variant="xs" weight="bold" color={colors.text.secondary} style={styles.label}>
              EMAIL ADDRESS
            </Text>
            <View style={[
              styles.inputWrapper, 
              { 
                backgroundColor: colors.bg.card, 
                borderColor: focusedInput === 'email' ? colors.accent.primary : colors.border.subtle 
              }
            ]}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color={focusedInput === 'email' ? colors.accent.primary : colors.text.tertiary} 
                style={{ marginRight: 10 }} 
              />
              <TextInput
                style={[styles.textInput, { color: colors.text.primary }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text variant="xs" weight="bold" color={colors.text.secondary} style={styles.label}>
              PASSWORD
            </Text>
            <View style={[
              styles.inputWrapper, 
              { 
                backgroundColor: colors.bg.card, 
                borderColor: focusedInput === 'password' ? colors.accent.primary : colors.border.subtle 
              }
            ]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={focusedInput === 'password' ? colors.accent.primary : colors.text.tertiary} 
                style={{ marginRight: 10 }} 
              />
              <TextInput
                style={[styles.textInput, { color: colors.text.primary }]}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.text.tertiary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.text.secondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <Button
            label={mode === 'signin' ? 'Sign In' : 'Create Account'}
            onPress={handleAuthAction}
            isLoading={loading}
            style={{ marginTop: Spacing.xs }}
          />
        </Animated.View>

      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text variant="md" weight="bold" color={colors.text.primary} style={{ marginTop: 16 }}>
              Signing In...
            </Text>
            <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 6 }}>
              Loading your data...
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  </GlassBackground>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingCard: {
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  container: {

    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 3,
    marginBottom: Spacing.lg,
    position: 'relative',
    height: 44,
  },
  slidingPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '49%',
    borderRadius: Radii.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.sm,
    zIndex: 2,
  },
  formCard: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 0,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radii.md,
    marginBottom: Spacing.lg,
  },
  expoGoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
  },
});
