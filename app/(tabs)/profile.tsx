import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Image, Platform, Linking, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Header } from '../../src/components/ui/Header';
import { Button } from '../../src/components/ui/Button';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { auth, AuthService, FirebaseService } from '../../src/services/firebase';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { useTransactionStore, useBudgetStore, useCategoryStore, useUIStore } from '../../src/store';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../../src/utils/finance';
import { NotificationService } from '../../src/services/notifications';
import { VersionServiceClient, CheckUpdateResult } from '../../src/services/api';
import { AddCategoryModal } from '../../src/components/ui/AddCategoryModal';

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
  const setUserPhotoUrl = useUIStore((s) => s.setUserPhotoUrl);
  const dailyReminderEnabled = useUIStore((s) => s.dailyReminderEnabled);
  const setDailyReminderEnabled = useUIStore((s) => s.setDailyReminderEnabled);
  const reminderHour = useUIStore((s) => s.reminderHour) ?? 20;
  const reminderMinute = useUIStore((s) => s.reminderMinute) ?? 0;
  const setReminderTime = useUIStore((s) => s.setReminderTime);
  const backgroundPreset = useUIStore((s) => s.backgroundPreset) || 'aurora';
  const transactionTitleMode = useUIStore((s) => s.transactionTitleMode);
  const setTransactionTitleMode = useUIStore((s) => s.setTransactionTitleMode);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [isReminderTimeModalVisible, setReminderTimeModalVisible] = useState(false);
  const [selectedHour12, setSelectedHour12] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');
  const [modalReminderActive, setModalReminderActive] = useState(dailyReminderEnabled);
  const [isTitleModeModalVisible, setTitleModeModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isSignOutModalVisible, setSignOutModalVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required 📷', 'Permission to access photo gallery is required to choose a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploadingPhoto(true);

        let photoUri = asset.uri;
        if (asset.base64) {
          photoUri = `data:image/jpeg;base64,${asset.base64}`;
        }

        setImageFailed(false);
        setUserPhotoUrl(photoUri);

        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: photoUri }).catch(() => {});
          await FirebaseService.saveUserProfile(auth.currentUser.uid, { userPhotoUrl: photoUri });
        }
        setIsUploadingPhoto(false);
        Alert.alert('Profile Picture Updated 📸', 'Your profile picture has been updated and synced successfully.');
      }
    } catch (err: any) {
      setIsUploadingPhoto(false);
      console.error('Image picker error:', err);
      Alert.alert('Upload Error', 'Could not select image. Please try again.');
    }
  };

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

    useCategoryStore.getState().addCategory({
      id: `cat_${Date.now()}`,
      name: newCatName.trim(),
      icon: newCatIcon || '🏷️',
      type: newCatType,
      color: colors.accent.primary,
      isDefault: false,
      isActive: true,
      sortOrder: Date.now(),
    });

    setNewCatName('');
    setNewCatIcon('🏷️');
    setAddCategoryModalVisible(false);
    Alert.alert('Category Added 🎉', `Custom category "${newCatName.trim()}" created!`);
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
  const currentAppVersion = Constants.expoConfig?.version || '4.0.0';
  const currentBuildNumber = Constants.expoConfig?.android?.versionCode?.toString() || Constants.expoConfig?.ios?.buildNumber || '1';
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<CheckUpdateResult | null>(null);

  const rawPhotoUrl = currentUser?.photoURL || currentUser?.providerData?.[0]?.photoURL || userPhotoUrl;
  const photoUrl = !imageFailed && rawPhotoUrl ? rawPhotoUrl : null;

  const handleManualCheckUpdate = async (manual = true) => {
    try {
      setIsCheckingUpdate(true);
      const buildNum = parseInt(currentBuildNumber, 10) || 1;
      const result = await VersionServiceClient.checkUpdate(currentAppVersion, buildNum);
      setUpdateInfo(result);
      if (result.hasUpdate) {
        if (manual) {
          setUpdateModalVisible(true);
        } else {
          Alert.alert(
            `Update Available (v${result.latestVersion}) 🚀`,
            result.releaseNotes || 'A new update is available for HisabAI with improvements and bug fixes.',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Update Now', onPress: () => {
                if (result.apkUrl) {
                  Linking.openURL(result.apkUrl);
                }
              }}
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
        const buildNum = parseInt(currentBuildNumber, 10) || 1;
        const result = await VersionServiceClient.checkUpdate(currentAppVersion, buildNum);
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      if (u) {
        useUIStore.getState().fetchAndSyncUserProfile(u.uid);
      }
    });
    return () => unsub();
  }, []);

  const handleSignOut = () => {
    setSignOutModalVisible(true);
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await AuthService.signOut();
      useUIStore.getState().resetForSignOut();
      useTransactionStore.getState().clearAllData();
      useBudgetStore.getState().clearAllData();
      useCategoryStore.getState().clearAllData();

      setIsSigningOut(false);
      setSignOutModalVisible(false);
      router.replace('/auth' as any);
    } catch (err: any) {
      setIsSigningOut(false);
      setSignOutModalVisible(false);
      console.error('Sign out error:', err);
    }
  };

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      const newName = nameInput.trim();
      setUserName(newName);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newName }).catch(() => {});
        await FirebaseService.saveUserProfile(auth.currentUser.uid, { userName: newName }).catch(() => {});
      }
    }
    setNameModalVisible(false);
  };

  const formatReminderTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const displayMinute = m < 10 ? `0${m}` : m;
    return `${displayHour}:${displayMinute} ${period}`;
  };

  const handleToggleDailyReminder = async (val: boolean) => {
    setDailyReminderEnabled(val);
    setModalReminderActive(val);

    if (auth.currentUser) {
      FirebaseService.saveUserProfile(auth.currentUser.uid, { dailyReminderEnabled: val }).catch(() => {});
    }

    if (val) {
      try {
        const granted = await NotificationService.requestPermissions();
        if (granted) {
          const success = await NotificationService.scheduleDailyReminder(reminderHour, reminderMinute);
          if (success) {
            Alert.alert(
              'Daily Reminder Active ⏰',
              `You'll receive a daily reminder at ${formatReminderTime(reminderHour, reminderMinute)} to record your expenses.`
            );
            return;
          }
        }
        Alert.alert(
          'Reminder Enabled ⏰',
          `Daily reminder enabled for ${formatReminderTime(reminderHour, reminderMinute)}. Please allow notifications in device settings to receive alerts.`
        );
      } catch (err) {
        console.warn('[Profile] Error enabling daily reminder:', err);
      }
    } else {
      try {
        await NotificationService.cancelDailyReminder();
      } catch (err) {
        console.warn('[Profile] Error canceling daily reminder:', err);
      }
    }
  };

  const openReminderTimeModal = () => {
    const period = reminderHour >= 12 ? 'PM' : 'AM';
    const h12 = reminderHour % 12 === 0 ? 12 : reminderHour % 12;
    setSelectedHour12(h12);
    setSelectedMinute(reminderMinute);
    setSelectedPeriod(period);
    setModalReminderActive(dailyReminderEnabled);
    setReminderTimeModalVisible(true);
  };

  const incrementHour = () => {
    setSelectedHour12((prev) => (prev % 12) + 1);
  };

  const decrementHour = () => {
    setSelectedHour12((prev) => (prev === 1 ? 12 : prev - 1));
  };

  const incrementMinute = (step: number = 1) => {
    setSelectedMinute((prev) => (prev + step) % 60);
  };

  const decrementMinute = (step: number = 1) => {
    setSelectedMinute((prev) => (prev - step + 60) % 60);
  };

  // Swipe up / down responders for interactive touch wheel
  const hourPanResponder = useMemo(() => {
    let accumulatedDy = 0;
    const STEP_THRESHOLD = 18;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        accumulatedDy = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const delta = gestureState.dy - accumulatedDy;
        if (delta < -STEP_THRESHOLD) {
          const steps = Math.floor(Math.abs(delta) / STEP_THRESHOLD);
          for (let i = 0; i < steps; i++) {
            setSelectedHour12((prev) => (prev % 12) + 1);
          }
          accumulatedDy -= steps * STEP_THRESHOLD;
        } else if (delta > STEP_THRESHOLD) {
          const steps = Math.floor(delta / STEP_THRESHOLD);
          for (let i = 0; i < steps; i++) {
            setSelectedHour12((prev) => (prev === 1 ? 12 : prev - 1));
          }
          accumulatedDy += steps * STEP_THRESHOLD;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dy) < STEP_THRESHOLD && Math.abs(gestureState.vy) > 0.3) {
          if (gestureState.vy < 0) {
            setSelectedHour12((prev) => (prev % 12) + 1);
          } else {
            setSelectedHour12((prev) => (prev === 1 ? 12 : prev - 1));
          }
        }
      },
    });
  }, []);

  const minutePanResponder = useMemo(() => {
    let accumulatedDy = 0;
    const STEP_THRESHOLD = 16;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        accumulatedDy = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const delta = gestureState.dy - accumulatedDy;
        if (delta < -STEP_THRESHOLD) {
          const steps = Math.floor(Math.abs(delta) / STEP_THRESHOLD);
          for (let i = 0; i < steps; i++) {
            setSelectedMinute((prev) => (prev + 1) % 60);
          }
          accumulatedDy -= steps * STEP_THRESHOLD;
        } else if (delta > STEP_THRESHOLD) {
          const steps = Math.floor(delta / STEP_THRESHOLD);
          for (let i = 0; i < steps; i++) {
            setSelectedMinute((prev) => (prev - 1 + 60) % 60);
          }
          accumulatedDy += steps * STEP_THRESHOLD;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dy) < STEP_THRESHOLD && Math.abs(gestureState.vy) > 0.3) {
          if (gestureState.vy < 0) {
            setSelectedMinute((prev) => (prev + 1) % 60);
          } else {
            setSelectedMinute((prev) => (prev - 1 + 60) % 60);
          }
        }
      },
    });
  }, []);

  const applyPresetTime = (h24: number, m: number) => {
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    setSelectedHour12(h12);
    setSelectedMinute(m);
    setSelectedPeriod(period);
  };

  const handleSaveCustomReminderTime = async () => {
    const h24 = selectedPeriod === 'PM'
      ? (selectedHour12 === 12 ? 12 : selectedHour12 + 12)
      : (selectedHour12 === 12 ? 0 : selectedHour12);
    const m = Math.max(0, Math.min(59, selectedMinute));

    // 1. Unconditionally save time and toggle state in Zustand & local storage
    setReminderTime(h24, m);
    setDailyReminderEnabled(modalReminderActive);
    setReminderTimeModalVisible(false);

    // 2. Persist to Firebase profile
    if (auth.currentUser) {
      FirebaseService.saveUserProfile(auth.currentUser.uid, {
        dailyReminderEnabled: modalReminderActive,
        reminderHour: h24,
        reminderMinute: m,
      }).catch((e) => console.warn('[Profile] Firebase save error:', e));
    }

    // 3. Configure OS Notifications
    if (modalReminderActive) {
      try {
        const granted = await NotificationService.requestPermissions();
        if (granted) {
          const success = await NotificationService.scheduleDailyReminder(h24, m);
          if (success) {
            Alert.alert(
              'Daily Reminder Saved ⏰',
              `Reminder scheduled daily at ${formatReminderTime(h24, m)}.`
            );
            return;
          }
        }
        Alert.alert(
          'Daily Reminder Saved ⏰',
          `Daily reminder saved for ${formatReminderTime(h24, m)}. Please ensure notifications are enabled in device settings to receive alerts.`
        );
      } catch (err) {
        console.warn('[Profile] Error scheduling daily reminder:', err);
        Alert.alert(
          'Daily Reminder Saved ⏰',
          `Daily reminder saved for ${formatReminderTime(h24, m)}.`
        );
      }
    } else {
      try {
        await NotificationService.cancelDailyReminder();
      } catch (e) {}
      Alert.alert(
        'Daily Reminder Saved ⏰',
        `Daily reminder time updated to ${formatReminderTime(h24, m)} (Reminder is currently OFF).`
      );
    }
  };

  const handleConfirmDeleteData = async () => {
    setIsDeleting(true);
    try {
      const activeUid = auth.currentUser?.uid;
      if (activeUid) {
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

      useUIStore.getState().setUserName('');
      useUIStore.getState().setUserPhotoUrl('');
      useUIStore.getState().setCurrency('BDT');

      setIsDeletingAccount(false);
      setDeleteAccountModalVisible(false);

      Alert.alert('Account Deleted 🗑️', 'Your account and all associated data have been permanently deleted.');
      router.replace('/auth');
    } catch (error: any) {
      setIsDeletingAccount(false);
      setDeleteAccountModalVisible(false);
      Alert.alert('Delete Account Failed', error.message || 'Could not delete account. Try signing in again first.');
    }
  };



  const currentCurrencySymbol = getCurrencySymbol(currency);
  const isDark = colors.bg.primary === '#080810';
  const sectionBg = isDark ? 'rgba(24, 24, 40, 0.65)' : 'rgba(255, 255, 255, 0.78)';
  const sectionBorder = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(203, 213, 225, 0.55)';

  return (
    <GlassBackground style={styles.container}>
      <Header title="Settings & Account" showBack={false} />

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Profile / Account Card */}
        <View style={[styles.profileCard, { backgroundColor: sectionBg, borderColor: sectionBorder }, Platform.OS === 'web' && ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any)]}>
          <TouchableOpacity 
            style={styles.avatarWrapper} 
            onPress={handlePickImage}
            activeOpacity={0.85}
          >
            <View style={[styles.avatar, { backgroundColor: colors.accent.primary, overflow: 'hidden' }]}>
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : photoUrl ? (
                Platform.OS === 'web' ? (
                  <img 
                    src={photoUrl} 
                    referrerPolicy="no-referrer" 
                    style={{ width: 52, height: 52, borderRadius: 26, objectFit: 'cover' }} 
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <Image 
                    source={{ uri: photoUrl }} 
                    style={{ width: 52, height: 52, borderRadius: 26 }} 
                    onError={() => setImageFailed(true)}
                  />
                )
              ) : (
                <Ionicons 
                  name={currentUser?.email ? "person" : "person-outline"} 
                  size={26} 
                  color="#FFFFFF" 
                />
              )}
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: colors.accent.primary }]}>
              <Ionicons name="camera" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
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
        <Text variant="xs" weight="bold" color={colors.text.tertiary} style={styles.groupTitle}>
          PREFERENCES
        </Text>
        <View style={[styles.settingsGroup, { backgroundColor: sectionBg, borderColor: sectionBorder }]}>
          {/* User Name */}
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: sectionBorder }]}
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
            style={[styles.settingItem, { borderBottomColor: sectionBorder }]}
            onPress={() => router.push('/categories' as any)}
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
            style={[styles.settingItem, { borderBottomColor: sectionBorder }]}
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

          {/* Theme & Background Appearance */}
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: sectionBorder }]}
            onPress={() => router.push('/theme' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons 
                  name="color-palette-outline" 
                  size={20} 
                  color={colors.accent.primary} 
                />
              </View>
              <Text variant="base" style={styles.settingText}>Theme & Background</Text>
            </View>
            <View style={styles.settingRight}>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>

          {/* Transaction Title Display Preference */}
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: sectionBorder }]}
            onPress={() => setTitleModeModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Ionicons 
                  name="text-outline" 
                  size={20} 
                  color={colors.accent.primary} 
                />
              </View>
              <Text variant="base" style={styles.settingText}>Transaction Title</Text>
            </View>
            <View style={styles.settingRight}>
              <Text variant="xs" weight="semibold" color={colors.accent.primary} style={{ marginRight: Spacing.xs }}>
                {transactionTitleMode === 'category' ? 'Only Category' : 'Note (or Category)'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>
          
          {/* Daily Reminder (Consolidated Setting: Time + Quick Toggle) */}
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <TouchableOpacity 
              style={styles.settingLeft}
              onPress={openReminderTimeModal}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconWrapper}>
                <Ionicons 
                  name={dailyReminderEnabled ? "notifications" : "notifications-off-outline"} 
                  size={20} 
                  color={dailyReminderEnabled ? colors.accent.primary : colors.text.tertiary} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="base" style={styles.settingText}>Daily Reminder</Text>
                <Text variant="xs" color={colors.text.tertiary}>
                  {dailyReminderEnabled 
                    ? `Daily at ${formatReminderTime(reminderHour, reminderMinute)}` 
                    : 'Off • Tap to set time'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.settingRight}>
              <TouchableOpacity 
                onPress={openReminderTimeModal}
                activeOpacity={0.7}
                style={{
                  backgroundColor: dailyReminderEnabled ? colors.accent.primaryDim : colors.bg.card,
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 3,
                  borderRadius: Radii.full,
                  marginRight: Spacing.xs,
                  borderWidth: 1,
                  borderColor: dailyReminderEnabled ? colors.accent.primary + '35' : colors.border.subtle,
                }}
              >
                <Text 
                  variant="xs" 
                  weight="bold" 
                  color={dailyReminderEnabled ? colors.accent.primary : colors.text.tertiary}
                >
                  {formatReminderTime(reminderHour, reminderMinute)}
                </Text>
              </TouchableOpacity>

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
        <Text variant="xs" weight="bold" color={colors.text.tertiary} style={styles.groupTitle}>
          APP UPDATES & VERSION
        </Text>
        <View style={[styles.settingsGroup, { backgroundColor: sectionBg, borderColor: sectionBorder }]}>
          {/* Update Available Banner */}
          {updateInfo?.hasUpdate && (
            <View style={[styles.updateBannerCard, { backgroundColor: colors.accent.primaryDim, borderColor: colors.accent.primary }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs }}>
                <View style={[styles.updateIconBadge, { backgroundColor: colors.accent.primary }]}>
                  <Ionicons name="arrow-up-circle" size={14} color="#FFFFFF" />
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
                  style={[styles.bannerActionBtn, { backgroundColor: sectionBg, borderColor: sectionBorder, borderWidth: 1 }]}
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
            style={[styles.settingItem, { borderBottomColor: sectionBorder }]}
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
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={() => handleManualCheckUpdate(true)}
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
        <Text variant="xs" weight="bold" color={colors.text.tertiary} style={styles.groupTitle}>
          SUPPORT & ACCOUNT
        </Text>
        <View style={[styles.settingsGroup, { backgroundColor: sectionBg, borderColor: sectionBorder }]}>
          {currentUser?.email && !currentUser?.isAnonymous ? (
            <View style={[styles.settingItem, { borderBottomColor: sectionBorder }]}>
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
              style={[styles.settingItem, { borderBottomColor: sectionBorder }]}
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
            style={[styles.settingItem, styles.settingItemLast]}
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

        {/* Account & Data Controls Section */}
        <Text variant="xs" weight="bold" color={colors.text.tertiary} style={styles.groupTitle}>
          ACCOUNT & DATA CONTROLS
        </Text>
        <View style={[styles.settingsGroup, { backgroundColor: sectionBg, borderColor: sectionBorder }]}>
          {/* Delete All Data */}
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: sectionBorder }]} 
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
            style={[styles.settingItem, styles.settingItemLast]} 
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
            style={[styles.logoutButton, { backgroundColor: sectionBg, borderColor: sectionBorder, borderWidth: 1 }]} 
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.semantic.danger} style={{ marginRight: 6 }} />
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

      {/* Transaction Title Mode Selection Modal */}
      <Modal visible={isTitleModeModalVisible} animationType="slide" transparent onRequestClose={() => setTitleModeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle, padding: Spacing.md }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <Text variant="md" weight="bold">Transaction Title Display</Text>
              <TouchableOpacity onPress={() => setTitleModeModalVisible(false)} style={{ padding: Spacing.xs }}>
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: Spacing.xs }}>
              <TouchableOpacity
                style={[
                  styles.currencyRow,
                  { borderBottomColor: colors.border.subtle },
                  transactionTitleMode === 'note' && { backgroundColor: colors.accent.primaryDim }
                ]}
                onPress={() => {
                  setTransactionTitleMode('note');
                  setTitleModeModalVisible(false);
                }}
              >
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <Text variant="sm" weight="bold" color={transactionTitleMode === 'note' ? colors.accent.primary : colors.text.primary}>
                    Note (or Category fallback)
                  </Text>
                  <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                    Show note if available; otherwise show category name.
                  </Text>
                </View>
                {transactionTitleMode === 'note' && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.currencyRow,
                  { borderBottomColor: 'transparent' },
                  transactionTitleMode === 'category' && { backgroundColor: colors.accent.primaryDim }
                ]}
                onPress={() => {
                  setTransactionTitleMode('category');
                  setTitleModeModalVisible(false);
                }}
              >
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <Text variant="sm" weight="bold" color={transactionTitleMode === 'category' ? colors.accent.primary : colors.text.primary}>
                    Only Category Name
                  </Text>
                  <Text variant="xs" color={colors.text.secondary} style={{ marginTop: 2 }}>
                    Always show category name as primary title in transaction lists.
                  </Text>
                </View>
                {transactionTitleMode === 'category' && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reminder Time Selection Modal */}
      <Modal 
        visible={isReminderTimeModalVisible} 
        animationType="slide" 
        transparent 
        onRequestClose={() => setReminderTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle, padding: Spacing.lg, borderRadius: 28, maxHeight: '90%' }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, paddingBottom: Spacing.sm, marginBottom: Spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="alarm-outline" size={22} color={colors.text.primary} style={{ marginRight: Spacing.xs }} />
                <Text variant="md" weight="bold">Daily Reminder</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setReminderTimeModalVisible(false)} 
                style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: Spacing.xs }}>
              {/* Simple Toggle Row */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                paddingVertical: Spacing.sm, 
                marginBottom: Spacing.md 
              }}>
                <Text variant="sm" weight="semibold" color={colors.text.primary}>
                  Reminder Alert
                </Text>
                <Switch
                  value={modalReminderActive}
                  onValueChange={setModalReminderActive}
                  trackColor={{ true: colors.accent.primary, false: colors.border.medium }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Digital Time Picker Card */}
              <View style={[styles.timePickerCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                <View style={styles.timePickerRow}>
                  {/* Hour Column */}
                  <View style={styles.timeDigitColumn}>
                    <TouchableOpacity 
                      onPress={incrementHour} 
                      style={styles.stepperArrowBtn}
                      activeOpacity={0.6}
                      hitSlop={{ top: 12, bottom: 8, left: 14, right: 14 }}
                    >
                      <Ionicons name="chevron-up" size={26} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <View 
                      {...hourPanResponder.panHandlers}
                      style={[styles.timeDigitBox, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle }]}
                    >
                      <Text style={[styles.timeDigitText, { color: colors.text.primary }]}>
                        {String(selectedHour12).padStart(2, '0')}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      onPress={decrementHour} 
                      style={styles.stepperArrowBtn}
                      activeOpacity={0.6}
                      hitSlop={{ top: 8, bottom: 12, left: 14, right: 14 }}
                    >
                      <Ionicons name="chevron-down" size={26} color={colors.text.secondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Colon Separator - exactly in the middle */}
                  <View style={styles.colonContainer}>
                    <Text style={[styles.colonText, { color: colors.text.secondary }]}>:</Text>
                  </View>

                  {/* Minute Column */}
                  <View style={styles.timeDigitColumn}>
                    <TouchableOpacity 
                      onPress={() => incrementMinute(1)} 
                      style={styles.stepperArrowBtn}
                      activeOpacity={0.6}
                      hitSlop={{ top: 12, bottom: 8, left: 14, right: 14 }}
                    >
                      <Ionicons name="chevron-up" size={26} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <View 
                      {...minutePanResponder.panHandlers}
                      style={[styles.timeDigitBox, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle }]}
                    >
                      <Text style={[styles.timeDigitText, { color: colors.text.primary }]}>
                        {String(selectedMinute).padStart(2, '0')}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      onPress={() => decrementMinute(1)} 
                      style={styles.stepperArrowBtn}
                      activeOpacity={0.6}
                      hitSlop={{ top: 8, bottom: 12, left: 14, right: 14 }}
                    >
                      <Ionicons name="chevron-down" size={26} color={colors.text.secondary} />
                    </TouchableOpacity>
                  </View>

                  {/* AM / PM Segmented Capsule */}
                  <View style={[styles.periodColumn, { backgroundColor: colors.bg.modal, borderColor: colors.border.subtle }]}>
                    <TouchableOpacity
                      style={[
                        styles.periodBtn,
                        selectedPeriod === 'AM' 
                          ? { backgroundColor: colors.accent.primary }
                          : { backgroundColor: 'transparent' }
                      ]}
                      onPress={() => setSelectedPeriod('AM')}
                      activeOpacity={0.7}
                    >
                      <Text 
                        variant="sm" 
                        weight={selectedPeriod === 'AM' ? 'bold' : 'regular'} 
                        color={selectedPeriod === 'AM' ? '#FFFFFF' : colors.text.tertiary}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.periodBtn,
                        selectedPeriod === 'PM' 
                          ? { backgroundColor: colors.accent.primary }
                          : { backgroundColor: 'transparent' }
                      ]}
                      onPress={() => setSelectedPeriod('PM')}
                      activeOpacity={0.7}
                    >
                      <Text 
                        variant="sm" 
                        weight={selectedPeriod === 'PM' ? 'bold' : 'regular'} 
                        color={selectedPeriod === 'PM' ? '#FFFFFF' : colors.text.tertiary}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Quick Presets Section */}
              <View style={{ marginBottom: Spacing.lg }}>
                <Text variant="xs" color={colors.text.tertiary} style={{ marginBottom: Spacing.sm, marginLeft: 2, letterSpacing: 0.5 }}>
                  Quick Presets
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { hour: 20, minute: 0, label: '8:00 PM' },
                    { hour: 21, minute: 0, label: '9:00 PM' },
                    { hour: 22, minute: 0, label: '10:00 PM' },
                    { hour: 9, minute: 0, label: '9:00 AM' },
                  ].map((opt) => {
                    const optPeriod = opt.hour >= 12 ? 'PM' : 'AM';
                    const optH12 = opt.hour % 12 === 0 ? 12 : opt.hour % 12;
                    const isMatched = selectedHour12 === optH12 && selectedMinute === opt.minute && selectedPeriod === optPeriod;

                    return (
                      <TouchableOpacity
                        key={`${opt.hour}-${opt.minute}`}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: Radii.full,
                          backgroundColor: isMatched ? colors.accent.primaryDim : colors.bg.card,
                          borderWidth: 1,
                          borderColor: isMatched ? colors.accent.primary : colors.border.subtle,
                        }}
                        onPress={() => applyPresetTime(opt.hour, opt.minute)}
                        activeOpacity={0.7}
                      >
                        <Text 
                          variant="xs" 
                          weight={isMatched ? 'bold' : 'regular'} 
                          color={isMatched ? colors.accent.primary : colors.text.secondary}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ marginTop: Spacing.xs, gap: Spacing.sm }}>
                <Button
                  variant="primary"
                  label={`Save Reminder (${selectedHour12}:${String(selectedMinute).padStart(2, '0')} ${selectedPeriod})`}
                  onPress={handleSaveCustomReminderTime}
                  textColor="#FFFFFF"
                  style={{
                    backgroundColor: theme === 'dark' ? '#242436' : '#0F172A',
                    borderWidth: theme === 'dark' ? 1 : 0,
                    borderColor: colors.border.medium,
                  }}
                />
                <Button
                  variant="ghost"
                  label="Cancel"
                  textColor={colors.text.secondary}
                  onPress={() => setReminderTimeModalVisible(false)}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal visible={isSignOutModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.modal, borderColor: 'transparent', borderWidth: 0, padding: Spacing.md }]}>
            <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
              <View style={[styles.warningBadge, { backgroundColor: colors.semantic.dangerDim }]}>
                <Ionicons name="log-out-outline" size={28} color={colors.semantic.danger} />
              </View>
              <Text variant="md" weight="bold" color={colors.semantic.danger} style={{ marginTop: Spacing.sm }}>
                Sign Out?
              </Text>
              <Text variant="xs" color={colors.text.secondary} align="center" style={{ marginTop: Spacing.xs, paddingHorizontal: Spacing.xs }}>
                Are you sure you want to sign out of your HisabAI account?
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Button 
                label="Cancel" 
                variant="secondary" 
                size="sm"
                onPress={() => setSignOutModalVisible(false)}
                style={{ flex: 1, marginRight: Spacing.sm }}
                disabled={isSigningOut}
              />
              <Button 
                label={isSigningOut ? "Signing Out..." : "Sign Out"} 
                variant="danger" 
                size="sm"
                onPress={handleConfirmSignOut}
                style={{ flex: 1 }}
                disabled={isSigningOut}
                leftIcon={isSigningOut ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="log-out" size={15} color="#FFF" />}
              />
            </View>
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
                onPress={handleConfirmDeleteData}
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
      <Modal visible={updateModalVisible} animationType="slide" transparent>
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
                  onPress={() => handleManualCheckUpdate(true)}
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

    </GlassBackground>
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
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any) : {}),
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    borderRadius: Radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any) : {}),
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
    borderBottomColor: 'transparent',
  },
  settingItemLast: {
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
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
  reminderActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.sm + 2,
  },
  timePickerCard: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDigitColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperArrowBtn: {
    width: 68,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  timeDigitBox: {
    width: 78,
    height: 70,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  timeDigitText: {
    fontSize: 38,
    fontWeight: '700',
  },
  colonContainer: {
    width: 28,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colonText: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 36,
    marginBottom: 4,
  },
  periodColumn: {
    marginLeft: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 4,
    justifyContent: 'center',
    gap: 6,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
  },
});
