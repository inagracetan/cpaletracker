/**
 * CPALE Tracker Reminder Engine
 * Handles persistent reminder scheduling, event synchronization, cancellation,
 * and delivery for assessments, study sessions, and deadlines.
 */

import { AppStateData, UserPreferences, AssessmentRecord, Deadline } from '../../types';
import { NotificationService } from './notificationService';
import { IndexedDbStorage, STORES } from '../storage/indexedDbStorage';
import { SchedulingEngine } from '../scheduler/schedulingEngine';

export interface ScheduledReminder {
  id: string;
  eventId: string;
  eventType: 'ASSESSMENT' | 'PREBOARD' | 'STUDY_SESSION' | 'DEADLINE' | 'TEST';
  title: string;
  body: string;
  targetDate: string; // YYYY-MM-DD
  triggerTimestamp: number; // millisecond epoch timestamp
  leadTimeHours: number;
  isDelivered: boolean;
  deliveredAt?: number;
  createdAt: number;
}

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

const REMINDER_STORAGE_KEY = '@cpale_scheduled_reminders_v1';

export class ReminderEngine {
  private static runnerIntervalId: any = null;
  private static cachedReminders: ScheduledReminder[] | null = null;

  /**
   * Check current platform notification permission
   */
  public static getPermissionStatus(): PermissionStatus {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as PermissionStatus;
  }

  /**
   * Request notification permission with clear error guidance
   */
  public static async requestPermission(): Promise<{ granted: boolean; status: PermissionStatus; message: string }> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        granted: false,
        status: 'unsupported',
        message: 'Web notifications are not supported by this browser environment.',
      };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        return {
          granted: true,
          status: 'granted',
          message: 'Notification permission granted! Study and assessment reminders are now active.',
        };
      } else if (permission === 'denied') {
        return {
          granted: false,
          status: 'denied',
          message: 'Notifications were blocked. Please enable notification permissions for this site in your browser address bar/site settings.',
        };
      } else {
        return {
          granted: false,
          status: 'default',
          message: 'Notification permission was dismissed without a decision.',
        };
      }
    } catch (err) {
      console.warn('ReminderEngine: Failed to request notification permission:', err);
      return {
        granted: false,
        status: 'denied',
        message: 'An error occurred while requesting notification permission.',
      };
    }
  }

  /**
   * Load scheduled reminders from persistent storage
   */
  public static async getScheduledReminders(): Promise<ScheduledReminder[]> {
    if (this.cachedReminders) return this.cachedReminders;

    try {
      // 1. Try IndexedDB
      const idbList = await IndexedDbStorage.getAll<ScheduledReminder>(STORES.REMINDERS);
      if (idbList && idbList.length > 0) {
        this.cachedReminders = idbList;
        return idbList;
      }

      // 2. Fallback to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(REMINDER_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.cachedReminders = parsed;
            // Backfill into IndexedDB
            for (const r of parsed) {
              IndexedDbStorage.setItem(STORES.REMINDERS, r.id, r).catch(() => {});
            }
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('ReminderEngine: Error reading scheduled reminders:', err);
    }

    this.cachedReminders = [];
    return [];
  }

  /**
   * Permanently clear all scheduled reminders from memory and storage.
   */
  public static async clearAllReminders(): Promise<void> {
    this.cachedReminders = [];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(REMINDER_STORAGE_KEY);
      }
      await IndexedDbStorage.clearStore(STORES.REMINDERS);
    } catch (err) {
      console.warn('ReminderEngine: Error clearing reminders:', err);
    }
  }

  /**
   * Save scheduled reminders to persistent storage
   */
  private static async saveScheduledReminders(reminders: ScheduledReminder[]): Promise<void> {
    this.cachedReminders = reminders;
    try {
      // 1. Save to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));
      }

      // 2. Save to IndexedDB
      await IndexedDbStorage.clearStore(STORES.REMINDERS);
      for (const r of reminders) {
        await IndexedDbStorage.setItem(STORES.REMINDERS, r.id, r);
      }
    } catch (err) {
      console.warn('ReminderEngine: Error saving scheduled reminders:', err);
    }
  }

  /**
   * Synchronize scheduled reminders with current application state
   * Updates/cancels reminders when events are completed, rescheduled, or deleted.
   */
  public static async syncReminders(state: AppStateData): Promise<{
    activeCount: number;
    permissionStatus: PermissionStatus;
    success: boolean;
    reason?: string;
  }> {
    const permission = this.getPermissionStatus();
    const enabled = Boolean(state.preferences.notificationsEnabled);

    // If notifications are disabled or permission is denied, clear future pending reminders
    if (!enabled || permission === 'denied') {
      const existing = await this.getScheduledReminders();
      const updated = existing.filter((r) => r.isDelivered);
      await this.saveScheduledReminders(updated);
      return {
        activeCount: 0,
        permissionStatus: permission,
        success: true,
        reason: !enabled ? 'notifications_disabled' : 'permission_denied',
      };
    }

    const todayStr = SchedulingEngine.formatDate(new Date());
    const existing = await this.getScheduledReminders();
    const existingMap = new Map<string, ScheduledReminder>();
    for (const r of existing) {
      existingMap.set(r.id, r);
    }

    const nextReminders: ScheduledReminder[] = [];
    const validReminderIds = new Set<string>();

    // 1. Schedule reminders for upcoming assessments
    for (const assessment of (state.assessments || [])) {
      if (assessment.date && assessment.date >= todayStr) {
        const id = `rem_assessment_${assessment.id}`;
        validReminderIds.add(id);

        const existingRem = existingMap.get(id);
        if (existingRem && existingRem.isDelivered && existingRem.targetDate === assessment.date) {
          nextReminders.push(existingRem);
          continue;
        }

        // Calculate trigger timestamp (9:00 AM 1 day prior, or morning of if same day)
        const targetDateObj = new Date(assessment.date + 'T09:00:00');
        // Default lead time: 24 hours before
        let triggerTime = targetDateObj.getTime() - 24 * 60 * 60 * 1000;
        if (triggerTime < Date.now()) {
          // If within 24h, trigger at 8:00 AM on the day of the assessment
          const sameDay8AM = new Date(assessment.date + 'T08:00:00').getTime();
          triggerTime = Math.max(Date.now() + 60000, sameDay8AM);
        }

        const isPreboard = assessment.type.includes('preboard');
        nextReminders.push({
          id,
          eventId: assessment.id,
          eventType: isPreboard ? 'PREBOARD' : 'ASSESSMENT',
          title: `CPALE ${isPreboard ? 'Preboard' : 'Assessment'} Reminder`,
          body: `Upcoming: ${assessment.title} is scheduled for ${assessment.date}. Review your covered checklist topics!`,
          targetDate: assessment.date,
          triggerTimestamp: triggerTime,
          leadTimeHours: 24,
          isDelivered: false,
          createdAt: Date.now(),
        });
      }
    }

    // 2. Schedule reminders for upcoming deadlines & milestones
    for (const deadline of state.deadlines) {
      if (!deadline.isCompleted && deadline.dueDate && deadline.dueDate >= todayStr) {
        const id = `rem_deadline_${deadline.id}`;
        validReminderIds.add(id);

        const existingRem = existingMap.get(id);
        if (existingRem && existingRem.isDelivered && existingRem.targetDate === deadline.dueDate) {
          nextReminders.push(existingRem);
          continue;
        }

        const targetDateObj = new Date(deadline.dueDate + 'T09:00:00');
        let triggerTime = targetDateObj.getTime() - 24 * 60 * 60 * 1000;
        if (triggerTime < Date.now()) {
          const sameDay8AM = new Date(deadline.dueDate + 'T08:00:00').getTime();
          triggerTime = Math.max(Date.now() + 60000, sameDay8AM);
        }

        nextReminders.push({
          id,
          eventId: deadline.id,
          eventType: 'DEADLINE',
          title: 'CPALE Milestone Deadline Reminder',
          body: `Due soon: "${deadline.title}" on ${deadline.dueDate}. Ensure all requirements are prepared!`,
          targetDate: deadline.dueDate,
          triggerTimestamp: triggerTime,
          leadTimeHours: 24,
          isDelivered: false,
          createdAt: Date.now(),
        });
      }
    }

    // 3. Schedule daily study reminder if there are uncompleted sessions today
    const todaySessions = state.sessions.filter((s) => s.date === todayStr && s.type === 'STUDY' && s.status !== 'Completed');
    if (todaySessions.length > 0) {
      const sessionId = `rem_daily_study_${todayStr}`;
      validReminderIds.add(sessionId);

      const existingRem = existingMap.get(sessionId);
      if (!existingRem || !existingRem.isDelivered) {
        // Trigger at 8:30 AM or 15 mins from now
        const today830AM = new Date(todayStr + 'T08:30:00').getTime();
        const triggerTime = today830AM > Date.now() ? today830AM : Date.now() + 15 * 60 * 1000;

        nextReminders.push({
          id: sessionId,
          eventId: todayStr,
          eventType: 'STUDY_SESSION',
          title: 'Daily CPALE Study Routine',
          body: `You have ${todaySessions.length} study session(s) scheduled for today. Keep your review streak strong!`,
          targetDate: todayStr,
          triggerTimestamp: triggerTime,
          leadTimeHours: 0,
          isDelivered: false,
          createdAt: Date.now(),
        });
      } else {
        nextReminders.push(existingRem);
      }
    }

    // Retain previously delivered reminders for historical audit (up to 20)
    for (const rem of existing) {
      if (rem.isDelivered && !validReminderIds.has(rem.id) && nextReminders.length < 50) {
        nextReminders.push(rem);
      }
    }

    await this.saveScheduledReminders(nextReminders);
    const activeCount = nextReminders.filter((r) => !r.isDelivered).length;

    return {
      activeCount,
      permissionStatus: permission,
      success: true,
    };
  }

  /**
   * Check and dispatch any due reminders
   */
  public static async checkAndDispatchDueReminders(preferences: UserPreferences): Promise<number> {
    if (!preferences.notificationsEnabled) return 0;
    if (this.getPermissionStatus() !== 'granted') return 0;

    const reminders = await this.getScheduledReminders();
    const now = Date.now();
    let dispatchedCount = 0;
    let hasChanges = false;

    for (const rem of reminders) {
      if (!rem.isDelivered && rem.triggerTimestamp <= now) {
        const sent = NotificationService.sendNotification({
          title: rem.title,
          body: rem.body,
          preferences,
          tag: rem.id,
        });

        if (sent) {
          rem.isDelivered = true;
          rem.deliveredAt = now;
          dispatchedCount++;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await this.saveScheduledReminders(reminders);
    }

    return dispatchedCount;
  }

  /**
   * Send an immediate test notification to verify the complete delivery pipeline
   */
  public static async sendTestReminder(preferences: UserPreferences): Promise<{ success: boolean; message: string }> {
    const perm = this.getPermissionStatus();
    if (perm !== 'granted') {
      const requestRes = await this.requestPermission();
      if (!requestRes.granted) {
        return {
          success: false,
          message: requestRes.message,
        };
      }
    }

    const testTitle = 'CPALE Study Reminder: Test Alert';
    const testBody = 'Notification channel confirmed! You will receive scheduled reminders for assessments, deadlines, and study sessions.';

    const sent = NotificationService.sendNotification({
      title: testTitle,
      body: testBody,
      preferences: { ...preferences, notificationsEnabled: true },
      tag: 'test_notification',
    });

    if (sent) {
      return {
        success: true,
        message: 'Test notification sent successfully! Check your system notification banner.',
      };
    } else {
      return {
        success: false,
        message: 'Could not deliver test notification. Check if Quiet Hours are active or browser notifications are silenced.',
      };
    }
  }

  /**
   * Cancel a specific reminder (e.g. when an event is deleted)
   */
  public static async cancelReminder(eventId: string): Promise<void> {
    const reminders = await this.getScheduledReminders();
    const filtered = reminders.filter((r) => r.eventId !== eventId);
    if (filtered.length !== reminders.length) {
      await this.saveScheduledReminders(filtered);
    }
  }

  /**
   * Start the foreground polling timer to dispatch reminders when due
   */
  public static startForegroundScheduler(getPreferences: () => UserPreferences): void {
    if (this.runnerIntervalId) return;

    // Run every 30 seconds
    this.runnerIntervalId = setInterval(() => {
      this.checkAndDispatchDueReminders(getPreferences()).catch((e) => {
        console.warn('ReminderEngine scheduler tick error:', e);
      });
    }, 30000);
  }

  /**
   * Stop the foreground scheduler
   */
  public static stopForegroundScheduler(): void {
    if (this.runnerIntervalId) {
      clearInterval(this.runnerIntervalId);
      this.runnerIntervalId = null;
    }
  }
}
