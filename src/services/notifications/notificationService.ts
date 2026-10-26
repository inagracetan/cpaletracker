import { UserPreferences } from '../../types';

export class NotificationService {
  /**
   * Request permission for notifications on Web or Native
   */
  public static async requestPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {
        console.warn('Notification permission error:', e);
      }
    }
    return false;
  }

  /**
   * Check if notifications are currently permitted
   */
  public static hasPermission(): boolean {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  /**
   * Send a local notification (respecting quiet hours and user preferences)
   */
  public static sendNotification(params: {
    title: string;
    body: string;
    preferences: UserPreferences;
    tag?: string;
  }): boolean {
    const { title, body, preferences, tag } = params;

    if (!preferences.notificationsEnabled) return false;

    // Check quiet hours
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentMinutes = currentH * 60 + currentM;

    const [qhStartH, qhStartM] = (preferences.quietHoursStart || '22:00').split(':').map(Number);
    const [qhEndH, qhEndM] = (preferences.quietHoursEnd || '07:00').split(':').map(Number);
    const qhStart = qhStartH * 60 + qhStartM;
    const qhEnd = qhEndH * 60 + qhEndM;

    // If quiet hours span midnight (e.g. 22:00 to 07:00)
    let inQuietHours = false;
    if (qhStart > qhEnd) {
      inQuietHours = currentMinutes >= qhStart || currentMinutes < qhEnd;
    } else {
      inQuietHours = currentMinutes >= qhStart && currentMinutes <= qhEnd;
    }

    if (inQuietHours) {
      console.log('Notification suppressed due to quiet hours:', title);
      return false;
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        // If ServiceWorker registration is ready, prefer showNotification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              tag: tag || 'cpale_notification',
              icon: '/cpabg.png',
            });
          }).catch(() => {
            new Notification(title, { body, tag, icon: '/cpabg.png' });
          });
          return true;
        }

        new Notification(title, {
          body,
          tag,
          icon: '/cpabg.png',
        });
        return true;
      } catch (e) {
        console.warn('Failed to trigger web notification:', e);
      }
    }
    return false;
  }
}
