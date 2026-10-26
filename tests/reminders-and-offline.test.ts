import { describe, it, expect, beforeEach } from 'vitest';
import { ReminderEngine } from '../src/services/notifications/reminderEngine';
import { StorageEngine } from '../src/services/storage/storageEngine';
import { OfflineService } from '../src/services/offline/offlineService';
import { AppStateData } from '../src/types';
import { SchedulingEngine } from '../src/services/scheduler/schedulingEngine';

describe('ReminderEngine and Offline Systems', () => {
  let mockState: AppStateData;

  beforeEach(() => {
    mockState = StorageEngine.getDefaultState();
    mockState.preferences.notificationsEnabled = true;
  });

  describe('ReminderEngine', () => {
    it('returns 0 active reminders when notifications are disabled', async () => {
      mockState.preferences.notificationsEnabled = false;
      const res = await ReminderEngine.syncReminders(mockState);
      expect(res.activeCount).toBe(0);
      expect(res.reason).toBe('notifications_disabled');
    });

    it('schedules reminders for upcoming assessments and deadlines', async () => {
      const futureDate = SchedulingEngine.addDays(SchedulingEngine.formatDate(new Date()), 7);
      
      mockState.assessments = [
        {
          id: 'test_ass_1',
          title: 'First Preboard Examination',
          type: 'first_preboard',
          date: futureDate,
          topics: [],
        },
      ];

      mockState.deadlines = [
        {
          id: 'test_dl_1',
          title: 'PRC Board Exam Application Filing',
          dueDate: futureDate,
          category: 'Registration and filing',
          verificationStatus: 'Confirmed',
          isCompleted: false,
          reminderDays: [7, 3, 1, 0],
        },
      ];

      const res = await ReminderEngine.syncReminders(mockState);
      expect(res.activeCount).toBeGreaterThanOrEqual(2);

      const reminders = await ReminderEngine.getScheduledReminders();
      const assessmentRem = reminders.find(r => r.eventId === 'test_ass_1');
      const deadlineRem = reminders.find(r => r.eventId === 'test_dl_1');

      expect(assessmentRem).toBeDefined();
      expect(assessmentRem?.title).toContain('Preboard');
      expect(assessmentRem?.targetDate).toBe(futureDate);

      expect(deadlineRem).toBeDefined();
      expect(deadlineRem?.title).toContain('Milestone Deadline');
      expect(deadlineRem?.targetDate).toBe(futureDate);
    });

    it('cancels reminders when an event is deleted or completed', async () => {
      const futureDate = SchedulingEngine.addDays(SchedulingEngine.formatDate(new Date()), 10);
      mockState.assessments = [
        {
          id: 'ass_to_remove',
          title: 'Monthly Mock',
          type: 'monthly',
          date: futureDate,
          topics: [],
        },
      ];

      await ReminderEngine.syncReminders(mockState);
      await ReminderEngine.cancelReminder('ass_to_remove');

      const reminders = await ReminderEngine.getScheduledReminders();
      const rem = reminders.find(r => r.eventId === 'ass_to_remove');
      expect(rem).toBeUndefined();
    });

    it('does not schedule reminders for completed deadlines', async () => {
      const futureDate = SchedulingEngine.addDays(SchedulingEngine.formatDate(new Date()), 5);
      mockState.deadlines = [
        {
          id: 'completed_dl',
          title: 'Completed Task',
          dueDate: futureDate,
          category: 'Required documents',
          verificationStatus: 'Confirmed',
          isCompleted: true, // Marked completed
          reminderDays: [1],
        },
      ];

      await ReminderEngine.syncReminders(mockState);
      const reminders = await ReminderEngine.getScheduledReminders();
      const rem = reminders.find(r => r.eventId === 'completed_dl');
      expect(rem).toBeUndefined();
    });
  });

  describe('OfflineService', () => {
    it('provides transparent offline notices describing capabilities', () => {
      const notice = OfflineService.getOfflineNotice();
      expect(notice).toContain('offline');
      expect(notice).toContain('checklist');
    });

    it('allows registering and unregistering network listeners safely', () => {
      let notified = false;
      const unsub = OfflineService.addListener((online) => {
        notified = true;
      });
      expect(typeof unsub).toBe('function');
      unsub();
      expect(notified).toBe(false);
    });
  });

  describe('StorageEngine Resilience', () => {
    it('persists and retrieves app state without data loss', async () => {
      const testState = StorageEngine.getDefaultState();
      testState.userProfile.nickname = 'CPA Topnotcher';
      testState.customCategories = ['Special Auditing', 'IFRS Standards'];

      await StorageEngine.saveState(testState);
      const loaded = await StorageEngine.loadState();

      expect(loaded.userProfile.nickname).toBe('CPA Topnotcher');
      expect(loaded.customCategories).toContain('Special Auditing');
    });
  });
});
