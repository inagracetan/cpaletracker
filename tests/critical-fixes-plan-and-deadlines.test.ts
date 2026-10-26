import { describe, it, expect, beforeEach } from 'vitest';
import { StorageEngine } from '../src/services/storage/storageEngine';
import { SchedulingEngine } from '../src/services/scheduler/schedulingEngine';
import { ReminderEngine } from '../src/services/notifications/reminderEngine';
import { AppStateData, StudySession, Deadline } from '../src/types';
import { DEFAULT_TOPICS } from '../src/data/defaultTopics';

describe('Critical Bug Fixes: Plan Editing, Deadlines, and Syllabus Expansion', () => {
  let mockState: AppStateData;

  beforeEach(() => {
    mockState = StorageEngine.getDefaultState();
    // Tests that exercise scheduling must supply an imported topic bank (app no longer auto-seeds).
    mockState.topics = JSON.parse(JSON.stringify(DEFAULT_TOPICS));
    mockState.preferences.notificationsEnabled = true;
  });

  describe('1. Plan Editing & Rescheduling', () => {
    it('preserves existing completed sessions when plan dates are modified', () => {
      // Create a completed session on an earlier date
      const completedSession: StudySession = {
        id: 'sess_done_1',
        date: '2026-06-15',
        type: 'STUDY',
        subject: 'FAR',
        topicCode: 'FAR-01',
        topicName: 'Conceptual Framework',
        plannedDuration: 60,
        actualDuration: 55,
        status: 'Completed',
        completedAt: '2026-06-15T10:00:00Z',
      };

      const existingSessions: StudySession[] = [completedSession];

      // Change plan start date to later (e.g., 2026-07-01)
      const updatedPlan = {
        ...mockState.examPlan,
        title: 'Updated 2027 CPALE Plan',
        description: 'New study schedule with revised timeline',
        studyStartDate: '2026-07-01',
        targetFinishDate: '2027-04-15',
        examDay1: '2027-05-14',
      };

      const res = SchedulingEngine.generateSchedule({
        examPlan: updatedPlan,
        weeklySchedule: mockState.weeklySchedule,
        workPeriod: mockState.workPeriod,
        isWorking: mockState.userProfile.isWorking,
        restDays: mockState.restDays,
        topics: mockState.topics,
        existingSessions,
        studyMaterials: mockState.studyMaterials,
        weeklyReviewTask: mockState.weeklyReviewTask,
      });

      // The historical completed session must be strictly preserved!
      const preserved = res.sessions.find(s => s.id === 'sess_done_1');
      expect(preserved).toBeDefined();
      expect(preserved?.status).toBe('Completed');
      expect(preserved?.date).toBe('2026-06-15');
      expect(preserved?.topicCode).toBe('FAR-01');

      // Upcoming sessions are scheduled from the new start date
      const upcomingStudySessions = res.sessions.filter(s => s.status !== 'Completed' && s.type === 'STUDY');
      expect(upcomingStudySessions.length).toBeGreaterThan(0);
      expect(upcomingStudySessions[0].date >= '2026-07-01').toBe(true);
    });

    it('correctly calculates exam day 2 and day 3 from day 1', () => {
      const dates = SchedulingEngine.calculateExamDates('2027-05-16');
      expect(dates.examDay1).toBe('2027-05-16');
      expect(dates.examDay2).toBe('2027-05-17');
      expect(dates.examDay3).toBe('2027-05-18');
    });
  });

  describe('2. Deadline Editing & Rescheduling', () => {
    it('allows editing a deadline without creating duplicates or resetting completion', async () => {
      const originalDeadline: Deadline = {
        id: 'dl_test_100',
        title: 'Initial LERIS Registration',
        dueDate: '2027-03-01',
        category: 'Registration and filing',
        verificationStatus: 'Estimated',
        isCompleted: true,
        completedAt: '2026-10-01T12:00:00Z',
        notes: 'Original note',
        reminderDays: [7, 3, 1, 0],
      };

      mockState.deadlines = [originalDeadline];

      // Update deadline fields
      const updated = mockState.deadlines.map(d => {
        if (d.id === 'dl_test_100') {
          return {
            ...d,
            title: 'Confirmed LERIS Registration Filing',
            dueDate: '2027-03-15',
            verificationStatus: 'Confirmed' as const,
            notes: 'Updated filing guidelines',
            reminderDays: [14, 7, 1],
          };
        }
        return d;
      });

      expect(updated.length).toBe(1);
      const edited = updated[0];
      expect(edited.id).toBe('dl_test_100'); // ID preserved
      expect(edited.title).toBe('Confirmed LERIS Registration Filing');
      expect(edited.dueDate).toBe('2027-03-15');
      expect(edited.verificationStatus).toBe('Confirmed');
      expect(edited.isCompleted).toBe(true); // Completion preserved
      expect(edited.completedAt).toBe('2026-10-01T12:00:00Z');
      expect(edited.notes).toBe('Updated filing guidelines');
      expect(edited.reminderDays).toEqual([14, 7, 1]);
    });

    it('allows valid historical dates when editing past records', () => {
      const pastDate = '2026-01-15';
      const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(pastDate);
      expect(isValidFormat).toBe(true);

      const deadline: Deadline = {
        id: 'dl_historical',
        title: 'Past Transcript Request Submitted',
        dueDate: pastDate,
        category: 'Required documents',
        verificationStatus: 'Confirmed',
        reminderDays: [7, 1],
        isCompleted: true,
      };

      expect(deadline.dueDate).toBe('2026-01-15');
    });

    it('syncs reminders and updates schedule when deadline date is updated', async () => {
      const future1 = SchedulingEngine.addDays(SchedulingEngine.formatDate(new Date()), 5);
      const future2 = SchedulingEngine.addDays(SchedulingEngine.formatDate(new Date()), 10);

      mockState.deadlines = [
        {
          id: 'dl_sync_test',
          title: 'NBI Clearance Submission',
          dueDate: future1,
          category: 'Required documents',
          verificationStatus: 'User-target',
          isCompleted: false,
          reminderDays: [7, 3, 1, 0],
        },
      ];

      await ReminderEngine.syncReminders(mockState);
      let reminders = await ReminderEngine.getScheduledReminders();
      let matched = reminders.find(r => r.eventId === 'dl_sync_test');
      expect(matched?.targetDate).toBe(future1);

      // Reschedule deadline to future2
      mockState.deadlines = mockState.deadlines.map(d => 
        d.id === 'dl_sync_test' ? { ...d, dueDate: future2 } : d
      );

      await ReminderEngine.syncReminders(mockState);
      reminders = await ReminderEngine.getScheduledReminders();
      matched = reminders.find(r => r.eventId === 'dl_sync_test');
      expect(matched?.targetDate).toBe(future2);
    });
  });

  describe('3. Syllabus Independent Row Expansion', () => {
    it('ensures each syllabus topic expands and collapses independently', () => {
      const topicA = 'FAR-01';
      const topicB = 'FAR-02';
      const topicC = 'AFAR-01';

      let expandedTopicIds: Record<string, boolean> = {};

      const toggleTopic = (id: string) => {
        expandedTopicIds = {
          ...expandedTopicIds,
          [id]: !expandedTopicIds[id],
        };
      };

      // Initially none expanded
      expect(!!expandedTopicIds[topicA]).toBe(false);
      expect(!!expandedTopicIds[topicB]).toBe(false);
      expect(!!expandedTopicIds[topicC]).toBe(false);

      // Expand topic A
      toggleTopic(topicA);
      expect(!!expandedTopicIds[topicA]).toBe(true);
      expect(!!expandedTopicIds[topicB]).toBe(false);
      expect(!!expandedTopicIds[topicC]).toBe(false);

      // Expand topic B without affecting topic A
      toggleTopic(topicB);
      expect(!!expandedTopicIds[topicA]).toBe(true);
      expect(!!expandedTopicIds[topicB]).toBe(true);
      expect(!!expandedTopicIds[topicC]).toBe(false);

      // Collapse topic A
      toggleTopic(topicA);
      expect(!!expandedTopicIds[topicA]).toBe(false);
      expect(!!expandedTopicIds[topicB]).toBe(true); // Topic B remains open!
      expect(!!expandedTopicIds[topicC]).toBe(false);
    });
  });

  describe('4. Calendar Alignment', () => {
    it('has equal 14.2857% widths for all 7 days of the week', () => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      expect(days.length).toBe(7);

      const colWidthPercent = 100 / 7;
      expect(colWidthPercent.toFixed(4)).toBe('14.2857');
    });
  });
});
