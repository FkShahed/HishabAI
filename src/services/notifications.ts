import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;
let isHandlerSet = false;

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

export const NotificationService = {
  /**
   * Request push notification permissions from the OS
   */
  async requestPermissions(): Promise<boolean> {
    const notif = getNotifications();
    if (!notif) {
      return false;
    }
    try {
      const { status: existingStatus } = await notif.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await notif.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.warn('Failed to request notification permissions:', error);
      return false;
    }
  },

  /**
   * Schedule a daily recurring push notification at 8:00 PM (or custom hour/minute)
   */
  async scheduleDailyReminder(hour = 20, minute = 0): Promise<boolean> {
    const notif = getNotifications();
    if (!notif) {
      return false;
    }
    try {
      const granted = await this.requestPermissions();
      if (!granted) {
        return false;
      }

      // Cancel existing scheduled notifications first to prevent duplicates
      await notif.cancelAllScheduledNotificationsAsync();

      // Schedule recurring daily notification
      await notif.scheduleNotificationAsync({
        content: {
          title: '💡 Daily Expense Reminder',
          body: "Don't forget to log your daily expenses in HisabAI today!",
          sound: true,
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });

      return true;
    } catch (error) {
      console.warn('Error scheduling daily reminder:', error);
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
      await notif.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.warn('Error cancelling notifications:', error);
    }
  },
};
