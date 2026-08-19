import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Image, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/ui/Header';
import { Button } from '../../src/components/ui/Button';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { auth, AuthService, FirebaseService } from '../../src/services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useTransactionStore, useBudgetStore, useCategoryStore, useUIStore } from '../../src/store';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../../src/utils/finance';
import { NotificationService } from '../../src/services/notifications';
import { VersionServiceClient, CheckUpdateResult } from '../../src/services/api';
import { AddCategoryModal } from '../../src/components/ui/AddCategoryModal';

const pkg = require('../../package.json');

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [imageFailed, setImageFailed] = useState(false);
  const [isAddCatModalVisible, setIsAddCatModalVisible] = useState(false);
  
  const setTransactions = useTransactionStore((s) => s.setTransactions);
  const currency = useUIStore((s) => s.currency);
  const setCurrency = useUIStore((s) => s.setCurrency);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const userName = useUIStore((s) => s.userName);
  const setUserName = useUIStore((s) => s.setUserName);
  const userPhotoUrl = useUIStore((s) => s.userPhotoUrl);
  const dailyReminderEnabled = useUIStore((s) => s.dailyReminderEnabled);
  const setDailyReminderEnabled = useUIStore((s) => s.setDailyReminderEnabled);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isNameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const getCategoriesForType = useCategoryStore((s) => s.getCategoriesForType);

  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryTypeTab, setCategoryTypeTab] = useState<'expense' | 'income'>('expense');
  const [isAddCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  const EMOJI_OPTIONS = ['🍔', '☕', '🛒', '🚗', '🍿', '🎮', '🏋️', '💊', '✈️', '🎁', '🎓', '💼', '💰', '📈', '💻', '💸', '⚡', '📱', '👕', '🐶', '🍕', '🍻', '🎟️', '🏠', '🏷️'];

  const handleCreateCategory = () => {
    if (!newCatName.trim()) {
      Alert.alert('Category Name Required', 'Please enter a category name.');
      return;
    }
    const id = `cat_${Date.now()}`;
    const newCat = {
      id,
      name: newCatName.trim(),
      icon: newCatIcon || '🏷️',
      type: newCatType,
      color: newCatType === 'expense' ? '#EF4444' : '#10B981',
      isActive: true,
      isDefault: false,
      sortOrder: Date.now(),
    };
    useCategoryStore.getState().addCategory(newCat);
    setNewCatName('');
    setAddCategoryModalVisible(false);
    Alert.alert('Category Added 🎉', `"${newCat.name}" category added successfully.`);
  };

  const handleDeleteCategoryItem = (cat: any) => {
    Alert.alert(
      `Delete Category?`,
      `Are you sure you want to remove "${cat.name}" category?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            useCategoryStore.getState().deleteCategory(cat.id);
          },
        },
      ]
    );
  };


  // Version Control & Update State
  const pkg = require('../../package.json');
  const currentAppVersion = Constants.expoConfig?.version || Constants.nativeAppVersion || pkg.version || '2.5.0';
  const currentBuildNumber = Constants.expoConfig?.android?.versionCode || parseInt(Constants.expoConfig?.ios?.buildNumber || '3', 10) || 3;
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<CheckUpdateResult | null>(null);
  const [isUpdateModalVisible, setUpdateModalVisible] = useState(false);

  const rawPhotoUrl = currentUser?.photoURL || currentUser?.providerData?.[0]?.photoURL || userPhotoUrl;
  const photoUrl = !imageFailed && rawPhotoUrl ? rawPhotoUrl : null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setCurrentUser(user);
      if (user) {
        const pic = user.photoURL || user.providerData?.[0]?.photoURL;
        if (pic) {
          useUIStore.getState().setUserPhotoUrl(pic);
        }
        if (user.displayName && (!userName || userName === 'Guest User')) {
          useUIStore.getState().setUserName(user.displayName);
        }
      }
    });
    
    // Check update on screen load
    handleCheckForUpdates(false);

    return () => unsubscribe();
  }, []);

  const handleCheckForUpdates = async (manual = false) => {
    try {
      setIsCheckingUpdate(true);
      const result = await VersionServiceClient.checkUpdate(currentAppVersion, currentBuildNumber);
      setUpdateInfo(result);
      if (result.hasUpdate) {
        if (manual) {
          Alert.alert(
            `🚀 New Update Available! (v${result.latestVersion})`,
            `A new version of HisabAI is available with latest updates and bug fixes.\n\nWould you like to download and install it now?`,
            [
              { 
                text: 'View What\'s New', 
                onPress: () => setUpdateModalVisible(true) 
              },
              { 
                text: 'Download & Install', 
                style: 'default',
                onPress: () => handleDownloadUpdate(result.apkUrl) 
              },
              { 
                text: 'Later', 
                style: 'cancel' 
              },
            ]
          );
        }
      } else if (manual) {
        Alert.alert('Up to Date! 🎉', `You are running the latest version of HisabAI (v${currentAppVersion}).`);
      }
    } catch (err: any) {
      if (manual) {
        Alert.alert('Update Check', 'Could not connect to the update server. Please verify your connection.');
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleViewVersionInfo = async () => {
    if (!updateInfo) {
      try {
        setIsCheckingUpdate(true);
        const result = await VersionServiceClient.checkUpdate(currentAppVersion, currentBuildNumber);
        setUpdateInfo(result);
      } catch (e) {
        // ignore
      } finally {
        setIsCheckingUpdate(false);
      }
    }
    setUpdateModalVisible(true);
  };

  const handleDownloadUpdate = async (apkUrl?: string) => {
    const targetUrl = apkUrl || updateInfo?.apkUrl;
    if (!targetUrl) {
      Alert.alert('No APK Link', 'The APK download link is not available yet.');
      return;
    }
    try {
      await Linking.openURL(targetUrl);
    } catch (e) {
      Alert.alert('Download Error', 'Could not open the APK download URL in your browser.');
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      useTransactionStore.getState().clearAllData();
      useBudgetStore.getState().clearAllData();
      useCategoryStore.getState().clearAllData();
      useUIStore.getState().setUserName('Guest User');
      useUIStore.getState().setUserPhotoUrl('');
      Alert.alert('Signed Out', 'You have been signed out safely.');
      router.replace('/auth'); // Redirect to login
    } catch (e) {
      Alert.alert('Error', 'Failed to sign out.');
    }
  };



  const handleSaveName = () => {
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      setNameModalVisible(false);
    }
  };

  const handleToggleDailyReminder = async (value: boolean) => {
    setDailyReminderEnabled(value);
    if (value) {
      const success = await NotificationService.scheduleDailyReminder(20, 0); // 8:00 PM
      if (success) {
        Alert.alert('Daily Reminder Enabled 🔔', 'You will receive a daily notification at 8:00 PM to record your expenses!');
      } else {
        setDailyReminderEnabled(false);
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings to receive daily reminders.');
      }
    } else {
      await NotificationService.cancelDailyReminder();
      Alert.alert('Daily Reminder Disabled', 'Daily notifications have been turned off.');
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const activeUid = currentUser?.uid || auth?.currentUser?.uid;
      if (activeUid && activeUid !== 'mock-local-user') {
        await Promise.race([
          FirebaseService.deleteAllUserData(activeUid),
          new Promise(r => setTimeout(r, 2000))
        ]);
      }
    } catch (error) {
      console.warn('Delete data warning:', error);
    }

    // Always clear local stores
    useTransactionStore.getState().clearAllData();
    useBudgetStore.getState().clearAllData();
    useCategoryStore.getState().clearAllData();
    
    setIsDeleting(false);
    setDeleteModalVisible(false);
    
    Alert.alert('Data Reset 🗑️', 'All transactions, budgets, and custom data have been deleted successfully.');
  };

  const handleConfirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      if (auth.currentUser) {
        await AuthService.deleteAccount();
      }

      // Completely purge all local Zustand state and stored data
      useTransactionStore.getState().clearAllData();
      useBudgetStore.getState().clearAllData();
      useCategoryStore.getState().clearAllData();
      setUserName('Guest User');

      setIsDeletingAccount(false);
      setDeleteAccountModalVisible(false);

      Alert.alert('Account Deleted 🗑️', 'Your account and all associated data have been deleted successfully.');
      router.replace('/auth');
    } catch (e: any) {
      console.error('Account deletion error:', e);
      setIsDeletingAccount(false);
      setDeleteAccountModalVisible(false);

      let msg = e?.message || 'Could not delete your account. Please try again.';
      if (e?.code === 'auth/requires-recent-login' || msg.includes('requires-recent-login')) {
        msg = 'For security reasons, please sign out and sign in again before deleting your account.';
      }
      Alert.alert('Deletion Error', msg);
    }
  };



  const currentCurrencySymbol = getCurrencySymbol(currency);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Header title="Settings & Account" showBack={false} />

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Profile / Account Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent.primary, overflow: 'hidden' }]}>
            {photoUrl ? (
              Platform.OS === 'web' ? (
                <img 
                  src={photoUrl} 
                  referrerPolicy="no-referrer" 
                  style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover' }} 
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <Image 
                  source={{ uri: photoUrl }} 
                  style={{ width: 48, height: 48, borderRadius: 24 }} 
                  onError={() => setImageFailed(true)}
                />
              )
            ) : (
              <Ionicons 
                name={currentUser?.email ? "person" : "person-outline"} 
                size={24} 
                color="#FFFFFF" 
              />
            )}
          </View>
          <TouchableOpacity 
            style={styles.profileInfo} 
            onPress={() => { setNameInput(userName); setNameModalVisible(true); }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="base" weight="bold">
                {userName || currentUser?.email || 'User'}
              </Text>
              <Ionicons name="pencil" size={12} color={colors.accent.primary} style={{ marginLeft: 6 }} />
            </View>
            <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
              {currentUser?.email ? currentUser.email : `UID: ${currentUser?.uid?.substring(0, 8) || 'local'}...`}
            </Text>
          </TouchableOpacity>

          {currentUser?.email && !currentUser?.isAnonymous ? (
            <View style={[styles.linkButton, { backgroundColor: colors.semantic.safeDim }]}>
              <Text variant="xs" color={colors.semantic.safe} weight="bold">
                Synced ✓
              </Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.linkButton, { backgroundColor: colors.accent.primaryDim }]}
              onPress={() => router.push('/auth' as any)}
            >
              <Text variant="xs" color={colors.accent.primary} weight="bold">
                Sign In
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.settingsGroup}>
          <Text variant="xs" weight="bold" color={colors.text.tertiary} style={styles.groupTitle}>
            PREFERENCES
          </Text>
          
          {/* User Name */}
          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]}
            onPress={() => { setNameInput(userName); setNameModalVisible(true); }}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="person-outline" size={20} color={colors.text.primary} />
              </View>
              <Text variant="base" style={styles.settingText}>Your Name</Text>
            </View>
            <View style={styles.settingRight}>
              <Text variant="sm" weight="semibold" color={colors.text.primary} style={{ marginRight: Spacing.xs }}>
                {userName}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>

          {/* Manage Categories */}
          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]}
            onPress={() => setIsAddCatModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="pricetags-outline" size={20} color={colors.accent.primary} />
              </View>
              <Text variant="base" style={styles.settingText}>Manage Categories</Text>
            </View>
            <View style={styles.settingRight}>
              <Text variant="xs" weight="semibold" color={colors.accent.primary} style={{ marginRight: Spacing.xs }}>
                Expense & Income
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>

          {/* Currency Selection */}

          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]}
            onPress={() => setCurrencyModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="cash-outline" size={20} color={colors.text.primary} />
              </View>
              <Text variant="base" style={styles.settingText}>Currency</Text>
            </View>
            <View style={styles.settingRight}>
              <Text variant="sm" weight="semibold" color={colors.accent.primary} style={{ marginRight: Spacing.xs }}>
                {currency} ({currentCurrencySymbol})
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>

          {/* Theme Toggle */}
          <View style={[styles.settingItem, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons 
                  name={theme === 'dark' ? "moon-outline" : "sunny-outline"} 
                  size={20} 
                  color={colors.text.primary} 
                />
              </View>
              <Text variant="base" style={styles.settingText}>Dark Mode</Text>
            </View>
            <View style={styles.settingRight}>
              <Switch 
                value={theme === 'dark'} 
                onValueChange={toggleTheme} 
                trackColor={{ true: colors.accent.primary, false: colors.border.medium }} 
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
          
          {/* Daily Reminders */}
          <View style={[styles.settingItem, styles.settingItemLast, { backgroundColor: colors.bg.card }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="notifications-outline" size={20} color={colors.text.primary} />
              </View>
              <Text variant="base" style={styles.settingText}>Daily Reminder (8:00 PM)</Text>
            </View>
            <View style={styles.settingRight}>
              <Switch 
                value={dailyReminderEnabled} 
                onValueChange={handleToggleDailyReminder}
                trackColor={{ true: colors.accent.primary, false: colors.border.medium }} 
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* App Version & Updates Section */}
        <View style={styles.settingsGroup}>
          <Text variant="xs" weight="bold" color={colors.text.tertiary} style={styles.groupTitle}>
            APP UPDATES & VERSION
          </Text>

          {/* Update Available Banner */}
          {updateInfo?.hasUpdate && (
            <View style={[styles.updateBannerCard, { backgroundColor: colors.accent.primaryDim, borderColor: colors.accent.primary }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs }}>
                <View style={[styles.updateIconBadge, { backgroundColor: colors.accent.primary }]}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                </View>
                <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                  <Text variant="sm" weight="bold" color={colors.text.primary}>
                    New Update Available!
                  </Text>
                  <Text variant="xs" color={colors.accent.primary} weight="bold">
                    v{updateInfo.latestVersion} (Build #{updateInfo.latestBuildNumber})
                  </Text>
                </View>
                {updateInfo.forceUpdate && (
                  <View style={[styles.forceBadge, { backgroundColor: colors.semantic.dangerDim }]}>
                    <Text variant="xs" weight="bold" color={colors.semantic.danger}>
                      Required
                    </Text>
                  </View>
                )}
              </View>

              {updateInfo.releaseNotes ? (
                <Text variant="xs" color={colors.text.secondary} numberOfLines={2} style={{ marginBottom: Spacing.sm }}>
                  {updateInfo.releaseNotes}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
                <TouchableOpacity
                  style={[styles.bannerActionBtn, { backgroundColor: colors.accent.primary, flex: 1 }]}
                  onPress={() => handleDownloadUpdate(updateInfo.apkUrl)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud-download-outline" size={15} color="#FFFFFF" />
                  <Text variant="xs" weight="bold" color="#FFFFFF" style={{ marginLeft: 4 }}>
                    Download APK
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bannerActionBtn, { backgroundColor: colors.bg.card, borderColor: colors.border.medium, borderWidth: 1 }]}
                  onPress={() => setUpdateModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text variant="xs" weight="medium" color={colors.text.primary}>
                    What's New
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Current Version Item */}
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]}
            onPress={handleViewVersionInfo}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="information-circle-outline" size={20} color={colors.text.primary} />
              </View>
              <Text variant="base" style={styles.settingText}>Installed Version</Text>
            </View>
            <View style={styles.settingRight}>
              <View style={[styles.versionPill, { backgroundColor: colors.bg.elevated, borderColor: colors.border.subtle }]}>
                <Text variant="xs" weight="bold" color={colors.text.primary}>
                  v{currentAppVersion}
                </Text>
              </View>
              {updateInfo?.hasUpdate && (
                <View style={[styles.dotIndicator, { backgroundColor: colors.accent.primary }]} />
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {/* Check for Updates Button */}
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast, { backgroundColor: colors.bg.card }]}
            onPress={() => handleCheckForUpdates(true)}
            disabled={isCheckingUpdate}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="refresh-circle-outline" size={20} color={colors.accent.primary} />
              </View>
              <Text variant="base" style={styles.settingText}>Check for Updates</Text>
            </View>
            <View style={styles.settingRight}>
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              ) : (
                <Text variant="xs" color={colors.accent.primary} weight="bold">
                  {updateInfo?.hasUpdate ? 'Update Available!' : 'Check Now'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Support & Account Section */}
        <View style={styles.settingsGroup}>
          <Text variant="xs" weight="bold" color={colors.text.tertiary} style={styles.groupTitle}>
            SUPPORT & ACCOUNT
          </Text>
          
          {currentUser?.email && !currentUser?.isAnonymous ? (
            <View style={[styles.settingItem, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIconWrapper}>
                  <Ionicons name="cloud-done-outline" size={20} color={colors.semantic.safe} />
                </View>
                <Text variant="base" style={styles.settingText}>
                  Account Synced
                </Text>
              </View>
              <View style={styles.settingRight}>
                <Ionicons name="checkmark-circle" size={18} color={colors.semantic.safe} />
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.settingItem, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]}
              onPress={() => router.push('/auth' as any)}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconWrapper}>
                  <Ionicons name="cloud-upload-outline" size={20} color={colors.text.primary} />
                </View>
                <Text variant="base" style={styles.settingText}>
                  Sign In / Sync Account
                </Text>
              </View>
              <View style={styles.settingRight}>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.settingItem, styles.settingItemLast, { backgroundColor: colors.bg.card }]}
            onPress={() => router.push('/terms' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="document-text-outline" size={20} color={colors.text.primary} />
              </View>
              <Text variant="base" style={styles.settingText}>Terms & Privacy</Text>
            </View>
            <View style={styles.settingRight}>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.settingsGroup}>
          <Text variant="xs" weight="bold" color={colors.semantic.danger} style={styles.groupTitle}>
            DANGER ZONE
          </Text>
          
          {/* Delete All Data */}
          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: colors.bg.card, borderBottomColor: colors.border.subtle }]} 
            onPress={() => setDeleteModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="trash-outline" size={20} color={colors.semantic.danger} />
              </View>
              <Text variant="base" style={[styles.settingText, { color: colors.semantic.danger }]}>Delete All Data</Text>
            </View>
            <View style={styles.settingRight}>
              <Ionicons name="chevron-forward" size={16} color={colors.semantic.danger} />
            </View>
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity 
            style={[styles.settingItem, styles.settingItemLast, { backgroundColor: colors.bg.card }]} 
            onPress={() => setDeleteAccountModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="person-remove-outline" size={20} color={colors.semantic.danger} />
              </View>
              <Text variant="base" style={[styles.settingText, { color: colors.semantic.danger }]}>Delete Account</Text>
            </View>
            <View style={styles.settingRight}>
              <Ionicons name="chevron-forward" size={16} color={colors.semantic.danger} />
            </View>
          </TouchableOpacity>
        </View>

        {currentUser?.email || currentUser?.isAnonymous ? (
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.semantic.dangerDim }]} 
            onPress={handleSignOut}
          >
            <Text variant="base" weight="bold" color={colors.semantic.danger}>Sign Out</Text>
          </TouchableOpacity>
        ) : null}
        
        {/* Spacer for bottom tab */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Custom Category Modal */}
      <AddCategoryModal 
        visible={isAddCatModalVisible}
        onClose={() => setIsAddCatModalVisible(false)}
      />

      {/* Edit Name Modal */}
      <Modal visible={isNameModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle, borderWidth: 1, padding: Spacing.md }]}>
            <Text variant="md" weight="bold" style={{ marginBottom: Spacing.sm }}>Update Your Name</Text>
            <TextInput
              style={[
                styles.nameInput,
                { backgroundColor: colors.bg.card, borderColor: colors.border.medium, color: colors.text.primary }
              ]}
              placeholder="Enter your name"
              placeholderTextColor={colors.text.tertiary}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Button label="Cancel" variant="secondary" size="sm" onPress={() => setNameModalVisible(false)} style={{ flex: 1 }} />
              <Button label="Save Name" size="sm" onPress={handleSaveName} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal visible={isCurrencyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle, padding: Spacing.md }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <Text variant="md" weight="bold">Select Main Currency</Text>
              <TouchableOpacity onPress={() => setCurrencyModalVisible(false)} style={{ padding: Spacing.xs }}>
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {SUPPORTED_CURRENCIES.map((item) => {
                const isSelected = currency === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.currencyRow,
                      { borderBottomColor: colors.border.subtle },
                      isSelected && { backgroundColor: colors.accent.primaryDim }
                    ]}
                    onPress={() => {
                      setCurrency(item.code);
                      setCurrencyModalVisible(false);
                    }}
                  >
                    <View style={styles.currencyInfo}>
                      <Text variant="sm" weight="bold" color={isSelected ? colors.accent.primary : colors.text.primary}>
                        {item.symbol} {item.code}
                      </Text>
                      <Text variant="xs" color={colors.text.secondary}>
                        {item.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.accent.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete All Data Confirmation Modal */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.semantic.dangerDim, borderWidth: 1, padding: Spacing.md }]}>
            <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
              <View style={[styles.warningBadge, { backgroundColor: colors.semantic.dangerDim }]}>
                <Ionicons name="warning-outline" size={28} color={colors.semantic.danger} />
              </View>
              <Text variant="md" weight="bold" color={colors.semantic.danger} style={{ marginTop: Spacing.sm }}>
                Delete All Data?
              </Text>
              <Text variant="xs" color={colors.text.secondary} align="center" style={{ marginTop: Spacing.xs, paddingHorizontal: Spacing.xs }}>
                Are you sure you want to delete all transactions, budgets, and categories? This action cannot be undone.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Button 
                label="Cancel" 
                variant="secondary" 
                size="sm"
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1, marginRight: Spacing.sm }}
                disabled={isDeleting}
              />
              <Button 
                label={isDeleting ? "Deleting..." : "Yes, Delete All"} 
                variant="danger" 
                size="sm"
                onPress={handleConfirmDeleteAll}
                style={{ flex: 1 }}
                disabled={isDeleting}
                leftIcon={isDeleting ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="trash" size={15} color="#FFF" />}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal visible={isDeleteAccountModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.semantic.dangerDim, borderWidth: 1, padding: Spacing.md }]}>
            <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
              <View style={[styles.warningBadge, { backgroundColor: colors.semantic.dangerDim }]}>
                <Ionicons name="person-remove-outline" size={28} color={colors.semantic.danger} />
              </View>
              <Text variant="md" weight="bold" color={colors.semantic.danger} style={{ marginTop: Spacing.sm }}>
                Delete Account?
              </Text>
              <Text variant="xs" color={colors.text.secondary} align="center" style={{ marginTop: Spacing.xs, paddingHorizontal: Spacing.xs }}>
                This will permanently delete your account and all your transaction data from HisabAI servers.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Button 
                label="Cancel" 
                variant="secondary" 
                size="sm"
                onPress={() => setDeleteAccountModalVisible(false)}
                style={{ flex: 1, marginRight: Spacing.sm }}
                disabled={isDeletingAccount}
              />
              <Button 
                label={isDeletingAccount ? "Deleting..." : "Delete Account"} 
                variant="danger" 
                size="sm"
                onPress={handleConfirmDeleteAccount}
                style={{ flex: 1 }}
                disabled={isDeletingAccount}
                leftIcon={isDeletingAccount ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="person-remove" size={15} color="#FFF" />}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* App Version & Update Details Modal */}
      <Modal visible={isUpdateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: updateInfo?.hasUpdate ? colors.accent.primary : colors.border.medium, borderWidth: 1, padding: Spacing.md }]}>
            <View style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
              <View style={[styles.updateIconModalBadge, { backgroundColor: updateInfo?.hasUpdate ? colors.accent.primary : colors.semantic.safe }]}>
                <Ionicons name={updateInfo?.hasUpdate ? "rocket-outline" : "checkmark-circle-outline"} size={26} color="#FFFFFF" />
              </View>
              <Text variant="md" weight="bold" style={{ marginTop: Spacing.xs }}>
                {updateInfo?.hasUpdate ? 'New Update Available!' : 'HisabAI Version Details'}
              </Text>
              <View style={[styles.versionTagPill, { backgroundColor: updateInfo?.hasUpdate ? colors.accent.primaryDim : colors.semantic.safeDim, borderColor: updateInfo?.hasUpdate ? colors.accent.primary : colors.semantic.safe }]}>
                <Text variant="xs" weight="bold" color={updateInfo?.hasUpdate ? colors.accent.primary : colors.semantic.safe}>
                  {updateInfo?.hasUpdate ? `Update to v${updateInfo.latestVersion}` : `v${currentAppVersion} is Up to Date`}
                </Text>
              </View>
            </View>

            {/* Version Comparison Box */}
            <View style={[styles.versionDetailsBox, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.versionDetailRow}>
                <Text variant="xs" color={colors.text.secondary}>Installed on Device:</Text>
                <Text variant="xs" weight="bold" color={colors.text.primary}>v{currentAppVersion}</Text>
              </View>
              <View style={styles.versionDetailRow}>
                <Text variant="xs" color={colors.text.secondary}>Latest Server Release:</Text>
                <Text variant="xs" weight="bold" color={updateInfo?.hasUpdate ? colors.accent.primary : colors.semantic.safe}>
                  v{updateInfo?.latestVersion || currentAppVersion} (Build #{updateInfo?.latestBuildNumber || 1})
                </Text>
              </View>
              {updateInfo?.fileSize ? (
                <View style={styles.versionDetailRow}>
                  <Text variant="xs" color={colors.text.secondary}>Package Size:</Text>
                  <Text variant="xs" weight="medium" color={colors.text.primary}>{updateInfo.fileSize}</Text>
                </View>
              ) : null}
            </View>

            <Text variant="xs" weight="bold" color={colors.text.primary} style={{ marginTop: Spacing.xs, marginBottom: 4 }}>
              What's New:
            </Text>
            <ScrollView style={[styles.releaseNotesScroll, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text variant="xs" color={colors.text.secondary} style={{ lineHeight: 18 }}>
                {updateInfo?.releaseNotes || '• AI Voice command transaction recognition\n• Smart Receipt OCR parsing\n• Financial analytics and budget tracking\n• Performance optimizations and bug fixes'}
              </Text>
            </ScrollView>

            <View style={{ flexDirection: 'column', gap: Spacing.xs, marginTop: Spacing.sm }}>
              {updateInfo?.hasUpdate ? (
                <Button
                  label="Download & Install Now"
                  size="sm"
                  onPress={() => {
                    setUpdateModalVisible(false);
                    handleDownloadUpdate(updateInfo.apkUrl);
                  }}
                  leftIcon={<Ionicons name="cloud-download" size={16} color="#FFFFFF" />}
                />
              ) : (
                <Button
                  label="Check for Updates"
                  variant="secondary"
                  size="sm"
                  disabled={isCheckingUpdate}
                  onPress={() => handleCheckForUpdates(true)}
                  leftIcon={isCheckingUpdate ? <ActivityIndicator size="small" color={colors.text.primary} /> : <Ionicons name="refresh" size={16} color={colors.text.primary} />}
                />
              )}
              <Button
                label="Close"
                variant="secondary"
                size="sm"
                onPress={() => setUpdateModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Manager Modal */}
      <Modal visible={isCategoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.categoryModalContent, { backgroundColor: colors.bg.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <Text variant="lg" weight="bold">Manage Categories</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Type Tab Selector (Expense vs Income) */}
            <View style={[styles.tabSelectorRow, { backgroundColor: colors.bg.secondary }]}>
              <TouchableOpacity
                style={[
                  styles.tabSelectorBtn,
                  categoryTypeTab === 'expense' && { backgroundColor: colors.semantic.expenseDim, borderColor: colors.semantic.expense, borderWidth: 1 }
                ]}
                onPress={() => setCategoryTypeTab('expense')}
              >
                <Text
                  variant="sm"
                  weight="bold"
                  color={categoryTypeTab === 'expense' ? colors.semantic.expense : colors.text.secondary}
                >
                  Expense ({getCategoriesForType('expense').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabSelectorBtn,
                  categoryTypeTab === 'income' && { backgroundColor: colors.semantic.incomeDim, borderColor: colors.semantic.income, borderWidth: 1 }
                ]}
                onPress={() => setCategoryTypeTab('income')}
              >
                <Text
                  variant="sm"
                  weight="bold"
                  color={categoryTypeTab === 'income' ? colors.semantic.income : colors.text.secondary}
                >
                  Income ({getCategoriesForType('income').length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category List */}
            <ScrollView style={{ maxHeight: 320, marginVertical: Spacing.sm }}>
              {getCategoriesForType(categoryTypeTab).map((cat) => (
                <View
                  key={cat.id}
                  style={[styles.categoryItemRow, { borderBottomColor: colors.border.subtle }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 22, marginRight: 10 }}>{cat.icon}</Text>
                    <Text variant="base" weight="semibold" color={colors.text.primary}>
                      {cat.name}
                    </Text>
                    {cat.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: colors.bg.elevated }]}>
                        <Text variant="xs" color={colors.text.tertiary}>Default</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteCategoryItem(cat)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.semantic.expense} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <Button
              label="+ Add New Category"
              variant="primary"
              size="md"
              onPress={() => {
                setNewCatType(categoryTypeTab);
                setAddCategoryModalVisible(true);
              }}
              style={{ width: '100%', marginTop: Spacing.xs }}
            />
          </View>
        </View>
      </Modal>

      {/* Add New Category Sub-Modal */}
      <Modal visible={isAddCategoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <Text variant="md" weight="bold">Add New {newCatType === 'expense' ? 'Expense' : 'Income'} Category</Text>
              <TouchableOpacity onPress={() => setAddCategoryModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginVertical: Spacing.sm }}>
              <Text variant="xs" color={colors.text.secondary} style={{ marginBottom: 4 }}>
                Category Name
              </Text>
              <TextInput
                style={[styles.nameInput, { backgroundColor: colors.bg.secondary, borderColor: colors.border.medium, color: colors.text.primary }]}
                placeholder="e.g. Freelance, Snacks, Gaming"
                placeholderTextColor={colors.text.tertiary}
                value={newCatName}
                onChangeText={setNewCatName}
                autoFocus
              />

              <Text variant="xs" color={colors.text.secondary} style={{ marginTop: Spacing.xs, marginBottom: 4 }}>
                Choose Emoji Icon
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm }}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiChip,
                      { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                      newCatIcon === emoji && { borderColor: colors.accent.primary, backgroundColor: colors.accent.primaryDim }
                    ]}
                    onPress={() => setNewCatIcon(emoji)}
                  >
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Button
                label="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setAddCategoryModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Save Category"
                variant="primary"
                size="md"
                onPress={handleCreateCategory}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  categoryModalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  tabSelectorRow: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 4,
    marginTop: Spacing.sm,
    gap: 4,
  },
  tabSelectorBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    alignItems: 'center',
    borderRadius: Radii.sm,
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginLeft: 8,
  },
  emojiChip: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  linkButton: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
  },
  settingsGroup: {
    marginBottom: Spacing.lg,
  },
  groupTitle: {
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  settingItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: Radii.md,
    borderBottomRightRadius: Radii.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconWrapper: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 14,
  },
  logoutButton: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radii.md,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
    borderBottomWidth: 1,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderRadius: Radii.sm,
  },
  currencyInfo: {
    flexDirection: 'column',
  },
  warningBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  updateBannerCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  updateIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  bannerActionBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  versionPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  updateIconModalBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  versionDetailsBox: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  versionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  releaseNotesScroll: {
    maxHeight: 140,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
});
