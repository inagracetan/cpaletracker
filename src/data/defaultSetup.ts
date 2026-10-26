import { 
  UserProfile, 
  ExamPlan, 
  DayRoutine, 
  WorkPeriod, 
  RestDay, 
  StudyMaterial, 
  UserPreferences,
  SyncMetadata,
  SubjectCode
} from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'user_default',
  fullName: '',
  nickname: 'Future CPA',
  takerType: 'First-timer',
  isWorking: false,
  timeZone: 'Asia/Manila',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_EXAM_PLAN: ExamPlan = {
  studyStartDate: '2026-08-24',
  examDay1: '2027-05-23',
  examDay2: '2027-05-24',
  examDay3: '2027-05-25',
  day1Subjects: 'MS & AUD',
  day2Subjects: 'TAX & RFBT',
  day3Subjects: 'FAR & AFAR',
  targetFinishDate: '2027-03-31',
  firstPreboardStart: '2027-02-20',
  firstPreboardEnd: '2027-02-21',
  finalPreboardStart: '2027-04-23',
  finalPreboardEnd: '2027-04-25',
  topicOrderMode: 'Recommended',
};

export const DEFAULT_WEEKLY_SCHEDULE: DayRoutine[] = [
  { dayOfWeek: 'Monday', workSetup: 'Day off', studyPlan: '1 topic' },
  { dayOfWeek: 'Tuesday', workSetup: 'Day off', studyPlan: '1 topic' },
  { dayOfWeek: 'Wednesday', workSetup: 'Day off', studyPlan: '1 topic' },
  { dayOfWeek: 'Thursday', workSetup: 'Day off', studyPlan: '1 topic' },
  { dayOfWeek: 'Friday', workSetup: 'Day off', studyPlan: '1 topic' },
  { dayOfWeek: 'Saturday', workSetup: 'Day off', studyPlan: '1 topic' },
  { dayOfWeek: 'Sunday', workSetup: 'Day off', studyPlan: 'Weekly review' },
];

export const DEFAULT_WORK_PERIOD: WorkPeriod = {
  monthEndCloseStartDay: undefined,
  monthEndCloseEndDay: undefined,
  busySeasonStart: undefined,
  busySeasonEnd: undefined,
  peakWeek1Start: undefined,
  peakWeek1End: undefined,
  peakWeek2Start: undefined,
  peakWeek2End: undefined,
  notes: '',
  peakWeekTargetMinutes: 25,
};

export const DEFAULT_REST_DAYS: RestDay[] = [
  { id: 'rest-1', date: '2026-12-24', name: 'Christmas Eve' },
  { id: 'rest-2', date: '2026-12-25', name: 'Christmas Day' },
  { id: 'rest-3', date: '2026-12-31', name: "New Year's Eve" },
  { id: 'rest-4', date: '2027-01-01', name: "New Year's Day" },
];

export const DEFAULT_STUDY_MATERIALS: Record<SubjectCode, StudyMaterial> = {
  FAR: { subject: 'FAR', materialText: 'practice questions', notes: 'What you practice with' },
  AFAR: { subject: 'AFAR', materialText: 'practice questions' },
  MS: { subject: 'MS', materialText: 'practice questions' },
  TAX: { subject: 'TAX', materialText: 'practice questions' },
  AUD: { subject: 'AUD', materialText: 'practice questions' },
  RFBT: { subject: 'RFBT', materialText: 'practice questions' },
};

export const DEFAULT_WEEKLY_REVIEW_TASK = 'Weekly review + timed practice set (20 items in 50 min)';

export const DEFAULT_PREFERENCES: UserPreferences = {
  motivationalQuotesEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  notificationsEnabled: false,
  timeZone: 'Asia/Manila',
  theme: 'system',
};

export const DEFAULT_SYNC_METADATA: SyncMetadata = {
  syncStatus: 'Saved on this device',
  pendingChangesCount: 0,
};
