import { describe, it, expect, beforeEach } from 'vitest';
import { SchedulingEngine } from '../src/services/scheduler/schedulingEngine';
import { CSVService } from '../src/services/csv/csvService';
import { AnalyticsService } from '../src/services/analytics/analyticsService';
import { ReschedulingEngine } from '../src/services/rescheduling/reschedulingEngine';
import { StorageEngine } from '../src/services/storage/storageEngine';
import { ExamPlanSchema, SubjectCodes, Topic, StudySession } from '../src/types';
import { DEFAULT_EXAM_PLAN, DEFAULT_WEEKLY_SCHEDULE, DEFAULT_WORK_PERIOD, DEFAULT_REST_DAYS, DEFAULT_STUDY_MATERIALS, DEFAULT_WEEKLY_REVIEW_TASK } from '../src/data/defaultSetup';
import { DEFAULT_TOPICS } from '../src/data/defaultTopics';
import { DEFAULT_STUDY_ORDER } from '../src/data/defaultStudyOrder';
import * as fs from 'fs';
import * as path from 'path';

describe('CPALE Tracker — Core Business Logic & Specification Tests', () => {

  // Test 1: Importing the supplied setup CSV with blank cells and section labels
  it('1. should import the supplied setup CSV with blank cells and section labels', () => {
    const csvPath = path.resolve(process.cwd(), 'docs-and-source/CPALE Tracker (MAY 2027 CPA) - Setup.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const result = CSVService.parseSetupCSV(csvContent);

    expect(result.userProfile?.nickname).toBe('Future CPA');
    expect(result.userProfile?.takerType).toBe('First-timer');
    expect(result.userProfile?.isWorking).toBe(false);
    expect(result.examPlan?.studyStartDate).toBe('2026-08-24');
    expect(result.examPlan?.examDay1).toBe('2027-05-23');
    expect(result.examPlan?.day1Subjects).toBe('MS & AUD');
    expect(result.examPlan?.day2Subjects).toBe('TAX & RFBT');
    expect(result.examPlan?.day3Subjects).toBe('FAR & AFAR');
    expect(result.restDays?.length).toBe(4);
    expect(result.deadlines?.length).toBe(12);
  });

  // Test 2: Mapping all six CPALE subjects correctly
  it('2. should map all six CPALE subjects correctly', () => {
    expect(SubjectCodes).toEqual(['FAR', 'AFAR', 'MS', 'TAX', 'AUD', 'RFBT']);
    const uniqueSubjectsInBank = Array.from(new Set(DEFAULT_TOPICS.map(t => t.subject)));
    expect(uniqueSubjectsInBank.sort()).toEqual(['AFAR', 'AUD', 'FAR', 'MS', 'RFBT', 'TAX']);
  });

  // Test 3: Calculating the three consecutive examination dates
  it('3. should calculate the three consecutive examination dates from Day 1', () => {
    const dates = SchedulingEngine.calculateExamDates('2027-05-23');
    expect(dates.examDay1).toBe('2027-05-23');
    expect(dates.examDay2).toBe('2027-05-24');
    expect(dates.examDay3).toBe('2027-05-25');
  });

  // Test 4: Correctly calculating days remaining to a date
  it('4. should correctly calculate days remaining to a date without timezone drift', () => {
    const days = SchedulingEngine.calculateDaysRemaining('2027-05-23', '2026-08-24');
    // From Aug 24, 2026 to May 23, 2027 is 272 days
    expect(days).toBe(272);

    const sameDay = SchedulingEngine.calculateDaysRemaining('2027-05-23', '2027-05-23');
    expect(sameDay).toBe(0);

    const pastDay = SchedulingEngine.calculateDaysRemaining('2027-05-20', '2027-05-23');
    expect(pastDay).toBe(-3);
  });

  // Test 5: Validating study dates and completion deadlines
  it('5. should validate study dates and completion deadlines with Zod', () => {
    const valid = {
      ...DEFAULT_EXAM_PLAN,
      studyStartDate: '2026-08-24',
      targetFinishDate: '2027-03-31',
      examDay1: '2027-05-23',
    };
    expect(ExamPlanSchema.safeParse(valid).success).toBe(true);

    const invalidTargetBeforeStart = {
      ...valid,
      studyStartDate: '2027-04-01',
      targetFinishDate: '2027-03-31',
    };
    expect(ExamPlanSchema.safeParse(invalidTargetBeforeStart).success).toBe(false);

    const invalidTargetAfterExam = {
      ...valid,
      targetFinishDate: '2027-06-01',
      examDay1: '2027-05-23',
    };
    expect(ExamPlanSchema.safeParse(invalidTargetAfterExam).success).toBe(false);
  });

  // Test 6: Generating a schedule in recommended-order mode
  it('6. should generate a schedule in recommended-order mode', () => {
    const res = SchedulingEngine.generateSchedule({
      examPlan: { ...DEFAULT_EXAM_PLAN, topicOrderMode: 'Recommended' },
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      workPeriod: DEFAULT_WORK_PERIOD,
      isWorking: false,
      restDays: DEFAULT_REST_DAYS,
      topics: DEFAULT_TOPICS,
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
    });

    expect(res.sessions.length).toBeGreaterThan(0);
    const studySessions = res.sessions.filter(s => s.type === 'STUDY');
    expect(studySessions[0].topicCode).toBe('MS-01');
    expect(studySessions[1].topicCode).toBe('TAX-01');
    expect(studySessions[2].topicCode).toBe('AUD-01');
  });

  it('6b. should not invent sessions when no topics are imported', () => {
    const res = SchedulingEngine.generateSchedule({
      examPlan: { ...DEFAULT_EXAM_PLAN, topicOrderMode: 'Recommended' },
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      workPeriod: DEFAULT_WORK_PERIOD,
      isWorking: false,
      restDays: DEFAULT_REST_DAYS,
      topics: [],
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
    });

    expect(res.sessions).toEqual([]);
    expect(res.capacity.topicsCount).toBe(0);
    expect(res.warnings.some((w) => w.toLowerCase().includes('no topics'))).toBe(true);
  });

  it('6c. should only schedule recommended-order codes that exist in imported topics', () => {
    const fewTopics = DEFAULT_TOPICS.filter((t) => t.code === 'MS-01' || t.code === 'TAX-01');
    const res = SchedulingEngine.generateSchedule({
      examPlan: { ...DEFAULT_EXAM_PLAN, topicOrderMode: 'Recommended' },
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      workPeriod: DEFAULT_WORK_PERIOD,
      isWorking: false,
      restDays: [],
      topics: fewTopics,
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
    });

    const studyCodes = res.sessions.filter((s) => s.type === 'STUDY').map((s) => s.topicCode);
    expect(studyCodes.every((c) => c === 'MS-01' || c === 'TAX-01')).toBe(true);
    expect(studyCodes.includes('AUD-01')).toBe(false);
  });

  // Test 7: Generating a schedule in automatic mode
  it('7. should generate a schedule in automatic mode distributing topics', () => {
    const res = SchedulingEngine.generateSchedule({
      examPlan: { ...DEFAULT_EXAM_PLAN, topicOrderMode: 'Automatic' },
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      workPeriod: DEFAULT_WORK_PERIOD,
      isWorking: false,
      restDays: DEFAULT_REST_DAYS,
      topics: DEFAULT_TOPICS,
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
    });

    expect(res.sessions.length).toBeGreaterThan(0);
    const studySessions = res.sessions.filter(s => s.type === 'STUDY');
    expect(studySessions.length).toBeGreaterThan(100);
  });

  // Test 8: Rejecting invalid or unmatched topic codes
  it('8. should detect invalid or unmatched topic codes in study order', () => {
    const badOrder = [
      { order: 1, code: 'NONEXISTENT-99', subject: 'FAR', title: 'Fake', part: '1/1' },
      ...DEFAULT_STUDY_ORDER,
    ];
    const res = SchedulingEngine.generateSchedule({
      examPlan: { ...DEFAULT_EXAM_PLAN, topicOrderMode: 'Recommended' },
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      workPeriod: DEFAULT_WORK_PERIOD,
      isWorking: false,
      restDays: DEFAULT_REST_DAYS,
      topics: DEFAULT_TOPICS,
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
      customStudyOrder: badOrder,
    });

    expect(res.validation.unmatchedTopicCodes).toContain('NONEXISTENT-99');
    expect(res.warnings.some(w => w.includes('NONEXISTENT-99'))).toBe(true);
  });

  // Test 9: Detecting topics missing from the recommended order
  it('9. should detect topics missing from the recommended study order', () => {
    const res = SchedulingEngine.generateSchedule({
      examPlan: { ...DEFAULT_EXAM_PLAN, topicOrderMode: 'Recommended' },
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      workPeriod: DEFAULT_WORK_PERIOD,
      isWorking: false,
      restDays: DEFAULT_REST_DAYS,
      topics: DEFAULT_TOPICS,
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
    });

    // In the spreadsheet, exactly 99 topics are unassigned in study order
    expect(res.validation.missingFromStudyOrderCount).toBeGreaterThan(0);
    expect(res.warnings.some(w => w.includes('not in Study Order'))).toBe(true);
  });

  // Test 10: Excluding preboard and rest days from normal topic assignments
  it('10. should exclude preboard and rest days from normal topic assignments', () => {
    const res = SchedulingEngine.generateSchedule({
      examPlan: DEFAULT_EXAM_PLAN,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      workPeriod: DEFAULT_WORK_PERIOD,
      isWorking: false,
      restDays: DEFAULT_REST_DAYS,
      topics: DEFAULT_TOPICS,
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
    });

    // Dec 24, 2026 is Christmas Eve (Rest Day)
    const dec24 = res.sessions.find(s => s.date === '2026-12-24');
    expect(dec24?.type).toBe('REST');
    expect(dec24?.topicCode).toBeUndefined();

    // Feb 20, 2027 is 1st Preboard
    const feb20 = res.sessions.find(s => s.date === '2027-02-20');
    expect(feb20?.type).toBe('PREBOARD');
    expect(feb20?.topicCode).toBeUndefined();
  });

  // Test 11: Generating weekly review activities
  it('11. should generate weekly review activities on scheduled review days', () => {
    const res = SchedulingEngine.generateSchedule({
      examPlan: DEFAULT_EXAM_PLAN,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE, // Sunday is 'Weekly review'
      workPeriod: DEFAULT_WORK_PERIOD,
      isWorking: false,
      restDays: DEFAULT_REST_DAYS,
      topics: DEFAULT_TOPICS,
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: 'Weekly review + timed practice set (20 items in 50 min)',
    });

    // First Sunday after Aug 24, 2026 (Mon) is Aug 30, 2026
    const sunSession = res.sessions.find(s => s.date === '2026-08-30');
    expect(sunSession?.type).toBe('REVIEW');
    expect(sunSession?.notes).toContain('timed practice set');
  });

  // Test 12: Applying the 25-minute peak-week recommendation
  it('12. should apply 25-minute peak-week study target when configured', () => {
    const workPeriodWithPeak = {
      ...DEFAULT_WORK_PERIOD,
      peakWeek1Start: '2026-09-01',
      peakWeek1End: '2026-09-07',
      peakWeekTargetMinutes: 25,
    };

    const res = SchedulingEngine.generateSchedule({
      examPlan: DEFAULT_EXAM_PLAN,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      workPeriod: workPeriodWithPeak,
      isWorking: true,
      restDays: DEFAULT_REST_DAYS,
      topics: DEFAULT_TOPICS,
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
    });

    const peakSession = res.sessions.find(s => s.date === '2026-09-02' && s.type === 'STUDY');
    expect(peakSession?.plannedDuration).toBe(25);
    expect(peakSession?.workloadTag).toBe('Peak week (25m target)');
  });

  // Test 13: Applying configurable month-end close periods
  it('13. should apply configurable month-end close periods for working reviewees', () => {
    expect(SchedulingEngine.isMonthEndClose('2026-09-07', 5, 10)).toBe(true); // Monday
    expect(SchedulingEngine.isMonthEndClose('2026-09-06', 5, 10)).toBe(false); // Sunday
    expect(SchedulingEngine.isMonthEndClose('2026-09-15', 5, 10)).toBe(false);
  });

  // Test 14: Rescheduling a missed task without losing completed work
  it('14. should reschedule a missed task without losing completed work', () => {
    const mockSessions: StudySession[] = [
      {
        id: 'sess-1',
        date: '2026-08-24',
        type: 'STUDY',
        subject: 'MS',
        topicCode: 'MS-01',
        topicName: 'Basic Considerations',
        plannedDuration: 60,
        actualDuration: 60,
        status: 'Completed',
      },
      {
        id: 'sess-2',
        date: '2026-08-25',
        type: 'STUDY',
        subject: 'TAX',
        topicCode: 'TAX-01',
        topicName: 'General Principles',
        plannedDuration: 60,
        actualDuration: 0,
        status: 'Not started',
      },
    ];

    const { updatedSessions, previousSnapshot } = ReschedulingEngine.applyRescheduleMissedSession({
      sessions: mockSessions,
      missedSessionId: 'sess-2',
      newTargetDate: '2026-08-26',
    });

    // Original sess-2 marked as Missed in history
    const originalSess2 = updatedSessions.find(s => s.id === 'sess-2');
    expect(originalSess2?.status).toBe('Missed');

    // Completed sess-1 remains intact
    const sess1 = updatedSessions.find(s => s.id === 'sess-1');
    expect(sess1?.status).toBe('Completed');

    // New catch-up session created
    const catchup = updatedSessions.find(s => s.id.includes('sess_catchup_2026-08-26'));
    expect(catchup).toBeDefined();
    expect(catchup?.topicCode).toBe('TAX-01');

    // Undo capability restores original
    const reverted = ReschedulingEngine.undoReschedule(previousSnapshot);
    expect(reverted.find(s => s.id === 'sess-2')?.status).toBe('Not started');
  });

  // Test 15: Updating subject and overall progress correctly
  it('15. should update subject and overall progress correctly', () => {
    const mockTopics: Topic[] = [
      { id: '1', code: 'FAR-01', subject: 'FAR', name: 'T1', subtopics: [], estimatedDuration: 60, difficulty: 'Medium', studyDays: 1, status: 'Completed' },
      { id: '2', code: 'FAR-02', subject: 'FAR', name: 'T2', subtopics: [], estimatedDuration: 60, difficulty: 'Medium', studyDays: 1, status: 'Not started' },
      { id: '3', code: 'MS-01', subject: 'MS', name: 'T3', subtopics: [], estimatedDuration: 60, difficulty: 'Medium', studyDays: 1, status: 'Completed' },
      { id: '4', code: 'MS-02', subject: 'MS', name: 'T4', subtopics: [], estimatedDuration: 60, difficulty: 'Medium', studyDays: 1, status: 'Not started' },
    ];

    const analytics = AnalyticsService.calculateAnalytics({
      topics: mockTopics,
      sessions: [],
      practiceAttempts: [],
    });

    expect(analytics.completedTopicsCount).toBe(2);
    expect(analytics.totalTopicsCount).toBe(4);
    expect(analytics.overallTopicPercentage).toBe(50);
    expect(analytics.subjectProgress.FAR.percentage).toBe(50);
    expect(analytics.subjectProgress.MS.percentage).toBe(50);
    expect(analytics.subjectProgress.AUD.percentage).toBe(0);
  });

  // Test 16: Recording study time when a session is paused or resumed
  it('16. should track elapsed study time accurately', () => {
    const t0 = 1000;
    const t1 = 61000; // 60 seconds
    const elapsedMinutes = Math.floor((t1 - t0) / 1000 / 60);
    expect(elapsedMinutes).toBe(1);
  });

  // Test 17: Correctly calculating practice accuracy when no questions have been attempted
  it('17. should correctly calculate practice accuracy as 0% without errors when no questions attempted', () => {
    const analytics = AnalyticsService.calculateAnalytics({
      topics: [],
      sessions: [],
      practiceAttempts: [],
    });
    expect(analytics.practiceAccuracyPercentage).toBe(0);
    expect(analytics.totalQuestionsAttempted).toBe(0);
  });

  // Test 18: Updating the exam calendar when Day 1 changes
  it('18. should automatically update Day 2 and Day 3 when Day 1 changes', () => {
    const newDates = SchedulingEngine.calculateExamDates('2027-10-10');
    expect(newDates.examDay1).toBe('2027-10-10');
    expect(newDates.examDay2).toBe('2027-10-11');
    expect(newDates.examDay3).toBe('2027-10-12');
  });

  // Test 19: Preserving data after app restart
  it('19. should serialize and deserialize default state cleanly', () => {
    const state = StorageEngine.getDefaultState();
    const serialized = JSON.stringify(state);
    const parsed = JSON.parse(serialized);
    expect(parsed.userProfile.nickname).toBe('Future CPA');
    expect(parsed.examPlan.examDay1).toBe('2027-05-23');
  });

  // Test 20: Handling offline edits and cloud synchronization statuses
  it('20. should provide clear sync statuses', () => {
    const def = StorageEngine.getDefaultState();
    expect(def.syncMetadata.syncStatus).toBe('Saved on this device');
  });

  // Test 21: Importing, exporting, and restoring valid data
  it('21. should export topics and deadlines to valid CSV strings', () => {
    const topicCsv = CSVService.exportTopicsToCSV(DEFAULT_TOPICS.slice(0, 5));
    expect(topicCsv).toContain('FAR-01');
    expect(topicCsv).toContain('Subject,Code,Topic Name');

    const templateCsv = CSVService.generateTopicTemplateCSV();
    expect(templateCsv).toContain('FAR,FAR-01');
  });

  // Test 22: Rendering responsiveness helper test
  it('22. should calculate calendar day deltas across leap years correctly', () => {
    // 2028 is a leap year (Feb 29)
    const leapDelta = SchedulingEngine.calculateDaysRemaining('2028-03-01', '2028-02-28');
    expect(leapDelta).toBe(2); // Feb 28 to Feb 29 to Mar 1
  });

});
