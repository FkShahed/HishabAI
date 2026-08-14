import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    console.warn('expo-notifications module load error:', error);
  }
}

export const NotificationService = {
  /**
   * Request push notification permissions from the OS
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('Push notifications are not supported on web platform.');
      return false;
    }
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
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
    if (Platform.OS === 'web' || !Notifications) {
      return false;
    }
    try {
      const granted = await this.requestPermissions();
      if (!granted) {
        return false;
      }

      // Cancel existing scheduled notifications first to prevent duplicates
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Schedule recurring daily notification
      await Notifications.scheduleNotificationAsync({
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
    if (Platform.OS === 'web' || !Notifications) {
      return;
    }
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.warn('Error cancelling notifications:', error);
    }
  },
};
