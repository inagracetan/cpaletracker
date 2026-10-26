import { z } from 'zod';

export type SubjectCode = 'FAR' | 'AFAR' | 'MS' | 'TAX' | 'AUD' | 'RFBT';

export const SubjectCodes: SubjectCode[] = ['FAR', 'AFAR', 'MS', 'TAX', 'AUD', 'RFBT'];

export type TakerType = 'First-timer' | 'Repeater';
export type WorkSetup = 'Onsite' | 'Work from home' | 'Hybrid' | 'Day off';
export type StudyPlanDay = '1 topic' | '2 topics' | '3 topics' | 'Weekly review' | 'Rest day';
export type TopicOrderMode = 'Recommended' | 'Automatic';
export type TaskStatus = 'Not started' | 'In progress' | 'Completed' | 'Skipped' | 'Missed';
export type SyncStatus = 'Saved on this device' | 'Sync pending' | 'Synced' | 'Sync error';
export type DeadlineCategory = 
  | 'Registration and filing' 
  | 'Required documents' 
  | 'Preboards' 
  | 'Study milestones' 
  | 'Examination dates' 
  | 'Results and follow-up';
export type VerificationStatus = 'Estimated' | 'User-target' | 'Confirmed' | 'Auto-calculated';

export interface UserProfile {
  id: string;
  fullName: string;
  nickname: string;
  takerType: TakerType;
  isWorking: boolean;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamPlan {
  title?: string;
  description?: string;
  studyStartDate: string; // YYYY-MM-DD
  examDay1: string;       // YYYY-MM-DD
  examDay2: string;       // YYYY-MM-DD (calculated: Day 1 + 1 day)
  examDay3: string;       // YYYY-MM-DD (calculated: Day 1 + 2 days)
  day1Subjects: string;   // e.g. "MS & AUD"
  day2Subjects: string;   // e.g. "TAX & RFBT"
  day3Subjects: string;   // e.g. "FAR & AFAR"
  targetFinishDate: string; // YYYY-MM-DD
  firstPreboardStart: string; // YYYY-MM-DD
  firstPreboardEnd: string;   // YYYY-MM-DD
  finalPreboardStart: string; // YYYY-MM-DD
  finalPreboardEnd: string;   // YYYY-MM-DD
  topicOrderMode: TopicOrderMode;
}

export interface DayRoutine {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  workSetup: WorkSetup;
  studyPlan: StudyPlanDay;
}

export interface WorkPeriod {
  monthEndCloseStartDay?: number; // 1-31
  monthEndCloseEndDay?: number;   // 1-31
  busySeasonStart?: string;       // YYYY-MM-DD
  busySeasonEnd?: string;         // YYYY-MM-DD
  peakWeek1Start?: string;        // YYYY-MM-DD
  peakWeek1End?: string;          // YYYY-MM-DD
  peakWeek2Start?: string;        // YYYY-MM-DD
  peakWeek2End?: string;          // YYYY-MM-DD
  notes?: string;
  peakWeekTargetMinutes: number;  // Default 25
}

export interface RestDay {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  notes?: string;
}

export interface StudyMaterial {
  subject: SubjectCode;
  materialText: string;
  provider?: string;
  url?: string;
  notes?: string;
}

export interface Topic {
  id: string;
  code: string;
  subject: SubjectCode;
  name: string;
  subtopics: string[];
  estimatedDuration: number; // in minutes
  difficulty: 'Light' | 'Medium' | 'Heavy';
  tosArea?: string;
  items?: number;
  studyDays: number; // 1 or 2 days
  status: TaskStatus;
  orderIndex?: number;
  dateAssigned?: string; // YYYY-MM-DD
  dateCompleted?: string; // ISO string
  confidence?: number; // 1 to 5
  isDifficult?: boolean;
  notes?: string;
  resources?: string[];
  archived?: boolean;
}

export interface PracticeAttempt {
  id: string;
  sessionId?: string;
  date: string;
  subject?: SubjectCode;
  topicCode?: string;
  attempted: number;
  correct: number;
  timeSpentMinutes: number;
  notes?: string;
  topicsToRevisit?: string[];
}

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'STUDY' | 'REVIEW' | 'PREBOARD' | 'EXAM' | 'REST' | 'MASTERY';
  subject?: SubjectCode;
  topicId?: string;
  topicCode?: string;
  topicName?: string;
  part?: string; // "1/1", "1/2", "2/2"
  plannedDuration: number; // minutes
  actualDuration: number;  // minutes
  actualDurationSeconds?: number; // total seconds studied
  status: TaskStatus;
  workloadTag?: 'Onsite' | 'Busy season · light study' | 'Peak week (25m target)';
  materials?: string;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  practiceAttempt?: PracticeAttempt;
  confidenceRating?: number;
  difficultConcepts?: string;
  followUpAction?: string;
}

export interface Deadline {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  category: DeadlineCategory;
  verificationStatus: VerificationStatus;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
  reminderDays: number[]; // e.g. [7, 3, 1, 0]
}

export interface UserPreferences {
  motivationalQuotesEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  notificationsEnabled: boolean;
  timeZone: string;
  theme: 'system' | 'light' | 'dark';
}

export interface SyncMetadata {
  lastSyncedAt?: string;
  syncStatus: SyncStatus;
  pendingChangesCount: number;
  errorMessage?: string;
}

// Badge & Achievement Types
export type BadgeCategory = 
  | 'Getting Started' 
  | 'Consistency' 
  | 'Study Progress' 
  | 'Practice and Mastery' 
  | 'Planning and Milestones';

export type BadgeTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  tier?: BadgeTier;
  isHidden?: boolean;
  targetValue?: number;
  criteriaDescription: string;
}

export interface BadgeRecord {
  id: string;
  badgeId: string;
  unlockedAt: string; // ISO date string
  currentValue: number;
  targetValue?: number;
  isUnlocked: boolean;
  isHistorical?: boolean;
}

export interface AchievementNotification {
  id: string;
  badgeId: string;
  badgeName: string;
  description: string;
  icon: string;
  unlockedAt: string;
  dismissed: boolean;
}

// Assessment & Preboard Coverage Types
export type AssessmentType = 'monthly' | 'first_preboard' | 'final_preboard';

export interface AssessmentTopicItem {
  id: string;
  topicCode: string;
  name: string;
  subject: SubjectCode;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export interface AssessmentRecord {
  id: string;
  title: string;
  type: AssessmentType;
  date?: string; // YYYY-MM-DD
  notes?: string;
  topics: AssessmentTopicItem[];
}

// Import Types
export type ImportStrategy = 'add' | 'update' | 'replace';
export type ImportCategory = 'setup' | 'topics' | 'deadlines' | 'sessions' | 'materials' | 'assessments' | 'auto';

export interface ImportValidationIssue {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  rawValue?: any;
}

export interface ImportHistoryRecord {
  id: string;
  timestamp: string;
  filename: string;
  sheetName?: string;
  category: ImportCategory;
  strategy: ImportStrategy;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  issues: ImportValidationIssue[];
}

export interface AppStateData {
  userProfile: UserProfile;
  examPlan: ExamPlan;
  weeklySchedule: DayRoutine[];
  workPeriod: WorkPeriod;
  restDays: RestDay[];
  studyMaterials: Record<SubjectCode, StudyMaterial>;
  weeklyReviewTask: string;
  topics: Topic[];
  sessions: StudySession[];
  deadlines: Deadline[];
  practiceAttempts: PracticeAttempt[];
  preferences: UserPreferences;
  syncMetadata: SyncMetadata;
  hasCompletedOnboarding: boolean;
  badges?: BadgeRecord[];
  achievementNotifications?: AchievementNotification[];
  importHistory?: ImportHistoryRecord[];
  assessments?: AssessmentRecord[];
  customCategories?: string[];
}


// Zod Schemas for Validation
export const UserProfileSchema = z.object({
  id: z.string().min(1),
  fullName: z.string(),
  nickname: z.string().min(1, 'Nickname is required'),
  takerType: z.enum(['First-timer', 'Repeater']),
  isWorking: z.boolean(),
  timeZone: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ExamPlanSchema = z.object({
  studyStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date YYYY-MM-DD required'),
  examDay1: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date YYYY-MM-DD required'),
  examDay2: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  examDay3: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day1Subjects: z.string().min(1),
  day2Subjects: z.string().min(1),
  day3Subjects: z.string().min(1),
  targetFinishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  firstPreboardStart: z.string().optional().or(z.literal('')),
  firstPreboardEnd: z.string().optional().or(z.literal('')),
  finalPreboardStart: z.string().optional().or(z.literal('')),
  finalPreboardEnd: z.string().optional().or(z.literal('')),
  topicOrderMode: z.enum(['Recommended', 'Automatic']),
}).refine(data => {
  return data.studyStartDate <= data.targetFinishDate;
}, {
  message: 'Target finish date must be on or after study start date',
  path: ['targetFinishDate']
}).refine(data => {
  return data.targetFinishDate <= data.examDay1;
}, {
  message: 'Target finish date should be on or before CPALE Day 1',
  path: ['targetFinishDate']
});

export const DeadlineSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
  category: z.enum([
    'Registration and filing',
    'Required documents',
    'Preboards',
    'Study milestones',
    'Examination dates',
    'Results and follow-up'
  ]),
  verificationStatus: z.enum(['Estimated', 'User-target', 'Confirmed', 'Auto-calculated']),
  isCompleted: z.boolean(),
  completedAt: z.string().optional(),
  notes: z.string().optional(),
  reminderDays: z.array(z.number()),
});
