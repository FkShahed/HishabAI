import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;
let isHandlerSet = false;

export const REMINDER_NOTIFICATION_ID = 'hisabai-daily-expense-reminder';
export const REMINDER_CHANNEL_ID = 'daily-reminder';

function getNotifications() {
  if (Platform.OS === 'web') return null;
  if (!Notifications) {
    try {
      Notifications = require('expo-notifications');
      if (Notifications && !isHandlerSet) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        isHandlerSet = true;
      }
    } catch (e) {
      console.warn('[Notifications] Module load exception:', e);
    }
  }
  return Notifications;
}

// Pre-initialize immediately on non-web so foreground handler is registered at bundle load
if (Platform.OS !== 'web') {
  getNotifications();
}

export const NotificationService = {
  /**
   * Set up high-priority Android notification channel
   */
  async setupNotificationChannel(): Promise<void> {
    const notif = getNotifications();
    if (!notif || Platform.OS !== 'android') return;

    try {
      await notif.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Daily Expense Reminders',
        description: 'Daily notifications reminding you to log your expenses in HisabAI',
        importance: notif.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    } catch (error) {
      console.warn('[Notifications] Error setting up notification channel:', error);
    }
  },

  /**
   * Request push notification permissions from the OS / Browser
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') return true;
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
      return false;
    }

    const notif = getNotifications();
    if (!notif) {
      return false;
    }
    try {
      const { status: existingStatus, granted: existingGranted } = await notif.getPermissionsAsync();
      let finalGranted = existingGranted || existingStatus === 'granted';

      if (!finalGranted) {
        const { status, granted } = await notif.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalGranted = granted || status === 'granted';
      }

      return finalGranted;
    } catch (error) {
      console.warn('[Notifications] Failed to request notification permissions:', error);
      return false;
    }
  },

  /**
   * Schedule a daily recurring push notification at custom hour/minute
   */
  async scheduleDailyReminder(hour = 20, minute = 0): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log(`[Notifications] Web reminder configured for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      return true;
    }

    const notif = getNotifications();
    if (!notif) {
      return false;
    }
    try {
      const granted = await this.requestPermissions();
      if (!granted) {
        console.warn('[Notifications] Permission not granted for daily reminder');
        return false;
      }

      // Ensure channel is registered on Android
      await this.setupNotificationChannel();

      // Cancel existing reminder first to prevent duplicates
      await this.cancelDailyReminder();

      // Schedule recurring daily notification
      await notif.scheduleNotificationAsync({
        identifier: REMINDER_NOTIFICATION_ID,
        content: {
          title: '💡 Daily Expense Reminder',
          body: "Don't forget to log your daily expenses in HisabAI today!",
          sound: 'default',
          priority: notif.AndroidNotificationPriority.HIGH,
          data: { screen: '/(tabs)' },
        },
        trigger: {
          channelId: REMINDER_CHANNEL_ID,
          hour,
          minute,
          repeats: true,
        },
      });

      console.log(`[Notifications] Daily reminder scheduled for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      return true;
    } catch (error) {
      console.warn('[Notifications] Error scheduling daily reminder:', error);
      return false;
    }
  },

  /**
   * Schedule an instant / near-instant test notification (in 2 seconds) to verify system works
   */
  async sendTestNotification(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        let granted = Notification.permission === 'granted';
        if (!granted) {
          const perm = await Notification.requestPermission();
          granted = perm === 'granted';
        }
        if (granted) {
          setTimeout(() => {
            try {
              new Notification('🔔 Reminder Test', {
                body: 'HisabAI daily notifications are working perfectly in your browser!',
              });
            } catch (e) {
              console.warn('[Notifications] Web Notification creation failed:', e);
            }
          }, 2000);
          return true;
        }
      }
      return false;
    }

    const notif = getNotifications();
    if (!notif) return false;

    try {
      const granted = await this.requestPermissions();
      if (!granted) return false;

      await this.setupNotificationChannel();

      await notif.scheduleNotificationAsync({
        content: {
          title: '🔔 Reminder Test',
          body: 'HisabAI daily notifications are working perfectly!',
          sound: 'default',
          priority: notif.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          channelId: REMINDER_CHANNEL_ID,
          seconds: 2,
        },
      });

      return true;
    } catch (error) {
      console.warn('[Notifications] Error sending test notification:', error);
      return false;
    }
  },

  /**
   * Cancel all scheduled notifications (when daily reminder is turned OFF)
   */
  async cancelDailyReminder(): Promise<void> {
    const notif = getNotifications();
    if (!notif) {
      return;
    }
    try {
      await notif.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);
    } catch (error) {
      try {
        await notif.cancelAllScheduledNotificationsAsync();
      } catch (e) {
        console.warn('[Notifications] Error cancelling notifications:', e);
      }
    }
  },

  /**
   * Check if daily reminder is currently scheduled with the OS
   */
  async isReminderScheduled(): Promise<boolean> {
    const notif = getNotifications();
    if (!notif) return false;

    try {
      const scheduled = await notif.getAllScheduledNotificationsAsync();
      return scheduled.some((n) => n.identifier === REMINDER_NOTIFICATION_ID);
    } catch (error) {
      return false;
    }
  },

  /**
   * Initialize notification system at app startup
   */
  async init(): Promise<void> {
    const notif = getNotifications();
    if (!notif) return;

    try {
      await this.setupNotificationChannel();
    } catch (error) {
      console.warn('[Notifications] Init error:', error);
    }
  },
};
