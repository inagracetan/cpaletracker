import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AppStateData, 
  UserProfile, 
  ExamPlan, 
  DayRoutine, 
  WorkPeriod, 
  RestDay, 
  StudyMaterial, 
  Topic, 
  StudySession, 
  Deadline, 
  PracticeAttempt, 
  UserPreferences, 
  SubjectCode, 
  TaskStatus,
  SyncStatus,
  AchievementNotification,
  ImportHistoryRecord,
  AssessmentRecord,
  AssessmentTopicItem
} from '../types';
import { StorageEngine } from '../services/storage/storageEngine';
import { SchedulingEngine } from '../services/scheduler/schedulingEngine';
import { ReschedulingEngine } from '../services/rescheduling/reschedulingEngine';
import { AnalyticsService, ProgressAnalytics } from '../services/analytics/analyticsService';
import { SupabaseService } from '../services/supabase/supabaseService';
import { CSVService, SetupCSVParseResult } from '../services/csv/csvService';
import { AchievementEngine, EvaluatedBadge } from '../services/achievements/achievementEngine';
import { ImportEngine } from '../services/import/importEngine';
import { 
  ImportExecutionPayload, 
  WorkbookImportExecutionPayload, 
  WorkbookImportResultSummary 
} from '../services/import/importTypes';
import { ReminderEngine } from '../services/notifications/reminderEngine';
import { OfflineService } from '../services/offline/offlineService';

interface ActiveTimerState {
  topicId?: string;
  topicCode?: string;
  topicTitle?: string;
  subject?: SubjectCode;
  isRunning: boolean;
  elapsedSeconds: number;
  startTimestamp?: number; // millisecond timestamp when timer started/resumed for background tolerance
}

interface AppContextType {
  state: AppStateData;
  isLoaded: boolean;
  analytics: ProgressAnalytics;
  activeTimer: ActiveTimerState;

  // Achievements & Badges
  achievements: {
    badges: EvaluatedBadge[];
    currentStreak: number;
    longestStreak: number;
    unlockedCount: number;
    totalCount: number;
  };
  achievementNotifications: AchievementNotification[];
  dismissAchievementNotification: (id: string) => Promise<void>;
  
  // Profile & Plan
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateExamPlan: (plan: Partial<ExamPlan>) => Promise<void>;
  updateWeeklySchedule: (routine: DayRoutine[]) => Promise<void>;
  updateWorkPeriod: (workPeriod: Partial<WorkPeriod>) => Promise<void>;
  
  // Rest Days
  addRestDay: (restDay: Omit<RestDay, 'id'>) => Promise<void>;
  updateRestDay: (id: string, updates: Partial<RestDay>) => Promise<void>;
  removeRestDay: (id: string) => Promise<void>;
  
  // Materials & Tasks
  updateStudyMaterial: (subject: SubjectCode, updates: Partial<StudyMaterial>) => Promise<void>;
  updateWeeklyReviewTask: (task: string) => Promise<void>;
  
  // Topics & Syllabus
  addTopic: (topic: Omit<Topic, 'id'>) => Promise<void>;
  updateTopic: (id: string, updates: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  toggleTopicComplete: (topicIdOrCode: string) => Promise<void>;
  importTopicsList: (newTopics: Topic[], mode: 'merge' | 'replace') => Promise<void>;
  addCustomCategory: (category: string) => Promise<void>;
  
  // Sessions & Plan Generation
  regeneratePlan: () => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<StudySession>) => Promise<void>;
  completeSession: (sessionId: string, actualMinutes?: number, practiceAttempt?: PracticeAttempt, actualSeconds?: number) => Promise<void>;
  rescheduleMissedSession: (sessionId: string, newDate?: string, plannedDuration?: number) => Promise<void>;
  
  // Deadlines
  addDeadline: (deadline: Omit<Deadline, 'id'>) => Promise<void>;
  updateDeadline: (id: string, updates: Partial<Deadline>) => Promise<void>;
  toggleDeadlineComplete: (id: string) => Promise<void>;
  deleteDeadline: (id: string) => Promise<void>;
  
  // Practice Tracker
  logPracticeAttempt: (attempt: Omit<PracticeAttempt, 'id'>) => Promise<void>;
  
  // Assessments & Preboards Coverage Tracking
  toggleAssessmentTopic: (assessmentId: string, topicIdOrCode: string) => Promise<void>;
  addAssessment: (assessment: Omit<AssessmentRecord, 'id'>) => Promise<void>;
  updateAssessment: (id: string, updates: Partial<AssessmentRecord>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  addTopicToAssessment: (assessmentId: string, topic: Omit<AssessmentTopicItem, 'id'>) => Promise<void>;
  removeTopicFromAssessment: (assessmentId: string, topicId: string) => Promise<void>;
  importAssessmentsList: (assessments: AssessmentRecord[], mode: 'merge' | 'replace') => Promise<void>;
  
  // Timer Actions (with background tolerance)
  startTimer: (session?: StudySession) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: (saveToSessionId?: string) => Promise<number>;
  resetTimer: () => void;
  
  // Preferences & Cloud Sync
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  triggerCloudSync: () => Promise<SyncStatus>;
  
  // CSV / Excel Import / Export / Reset
  importFromSetupCSV: (csvText: string) => Promise<SetupCSVParseResult>;
  executeImport: (payload: ImportExecutionPayload) => Promise<ImportHistoryRecord>;
  executeWorkbookImport: (payload: WorkbookImportExecutionPayload) => Promise<WorkbookImportResultSummary>;
  resetAllData: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}


const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppStateData>(() => StorageEngine.getDefaultState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState>({
    isRunning: false,
    elapsedSeconds: 0,
  });

  // Background tolerance interval for timer
  useEffect(() => {
    let interval: any = null;
    if (activeTimer.isRunning && activeTimer.startTimestamp) {
      interval = setInterval(() => {
        const now = Date.now();
        const deltaSec = Math.floor((now - (activeTimer.startTimestamp || now)) / 1000);
        setActiveTimer(prev => ({
          ...prev,
          elapsedSeconds: (prev.elapsedSeconds || 0) + 1,
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer.isRunning, activeTimer.startTimestamp]);

  // Initial Load from persistent storage — never auto-seed sample curriculum
  useEffect(() => {
    StorageEngine.loadState().then(loadedState => {
      // Sessions stay empty until the user imports data or explicitly regenerates a plan.
      setState(loadedState);
      setIsLoaded(true);
      SupabaseService.initialize();
      OfflineService.initialize();
      ReminderEngine.syncReminders(loadedState).catch(() => {});
      ReminderEngine.startForegroundScheduler(() => loadedState.preferences);
    });
  }, []);

  // Save helper with automatic badge evaluation and reminder synchronization
  const saveUpdatedState = useCallback(async (stateToSave: AppStateData) => {
    const evalResult = AchievementEngine.evaluateAllBadges(stateToSave);
    let finalState = stateToSave;

    if (evalResult.newlyUnlocked.length > 0 || evalResult.newNotifications.length > 0) {
      finalState = {
        ...stateToSave,
        badges: [...(stateToSave.badges || []), ...evalResult.newlyUnlocked],
        achievementNotifications: [
          ...(stateToSave.achievementNotifications || []),
          ...evalResult.newNotifications,
        ],
      };
    }

    setState(finalState);
    await StorageEngine.saveState(finalState);
    ReminderEngine.syncReminders(finalState).catch(() => {});
  }, []);

  // Recalculate analytics
  const analytics = useMemo(() => {
    return AnalyticsService.calculateAnalytics({
      topics: state.topics,
      sessions: state.sessions,
      practiceAttempts: state.practiceAttempts,
      targetFinishDate: state.examPlan.targetFinishDate,
    });
  }, [state.topics, state.sessions, state.practiceAttempts, state.examPlan.targetFinishDate]);

  // Recalculate achievements
  const achievements = useMemo(() => {
    const evalResult = AchievementEngine.evaluateAllBadges(state);
    return {
      badges: evalResult.evaluatedBadges,
      currentStreak: evalResult.currentStreak,
      longestStreak: evalResult.longestStreak,
      unlockedCount: evalResult.evaluatedBadges.filter(b => b.isUnlocked).length,
      totalCount: evalResult.evaluatedBadges.length,
    };
  }, [state]);

  const achievementNotifications = useMemo(() => {
    return (state.achievementNotifications || []).filter(n => !n.dismissed);
  }, [state.achievementNotifications]);

  const dismissAchievementNotification = useCallback(async (id: string) => {
    const updatedNotifs = (state.achievementNotifications || []).map(n => 
      n.id === id ? { ...n, dismissed: true } : n
    );
    const updated = {
      ...state,
      achievementNotifications: updatedNotifs,
    };
    setState(updated);
    await StorageEngine.saveState(updated);
  }, [state]);

  const executeImport = useCallback(async (payload: ImportExecutionPayload): Promise<ImportHistoryRecord> => {
    const { newState, result } = ImportEngine.executeImport(payload, state);
    
    // If topics or schedule changed, recalculate plan sessions if needed
    if (payload.category === 'setup' || payload.strategy === 'replace') {
      const res = SchedulingEngine.generateSchedule({
        examPlan: newState.examPlan,
        weeklySchedule: newState.weeklySchedule,
        workPeriod: newState.workPeriod,
        isWorking: newState.userProfile.isWorking,
        restDays: newState.restDays,
        topics: newState.topics,
        studyMaterials: newState.studyMaterials,
        weeklyReviewTask: newState.weeklyReviewTask,
      });
      newState.sessions = res.sessions;
    }

    await saveUpdatedState(newState);
    return result;
  }, [state, saveUpdatedState]);

  const executeWorkbookImport = useCallback(async (payload: WorkbookImportExecutionPayload): Promise<WorkbookImportResultSummary> => {
    const { newState, result } = ImportEngine.executeWorkbookWideImport(payload, state);
    
    // If setup was imported, recalculate plan sessions
    if (result.setupImported || payload.strategy === 'replace') {
      const res = SchedulingEngine.generateSchedule({
        examPlan: newState.examPlan,
        weeklySchedule: newState.weeklySchedule,
        workPeriod: newState.workPeriod,
        isWorking: newState.userProfile.isWorking,
        restDays: newState.restDays,
        topics: newState.topics,
        studyMaterials: newState.studyMaterials,
        weeklyReviewTask: newState.weeklyReviewTask,
      });
      newState.sessions = res.sessions;
    }

    await saveUpdatedState(newState);
    return result;
  }, [state, saveUpdatedState]);


  // User Profile
  const updateUserProfile = useCallback(async (profileUpdates: Partial<UserProfile>) => {
    const updated = {
      ...state,
      userProfile: {
        ...state.userProfile,
        ...profileUpdates,
        updatedAt: new Date().toISOString(),
      }
    };
    await saveUpdatedState(updated);
  }, [state, saveUpdatedState]);

  // Exam Plan with auto-calculated Day 2 and Day 3
  const updateExamPlan = useCallback(async (planUpdates: Partial<ExamPlan>) => {
    let finalUpdates = { ...planUpdates };
    if (planUpdates.examDay1) {
      const { examDay2, examDay3 } = SchedulingEngine.calculateExamDates(planUpdates.examDay1);
      finalUpdates.examDay2 = examDay2;
      finalUpdates.examDay3 = examDay3;
    }

    const updatedExamPlan = { ...state.examPlan, ...finalUpdates };

    // Update auto-calculated examination deadlines
    const updatedDeadlines = state.deadlines.map(d => {
      if (d.title.includes('CPALE Day 1') && updatedExamPlan.examDay1) {
        return { ...d, dueDate: updatedExamPlan.examDay1 };
      }
      if (d.title.includes('CPALE Day 2') && updatedExamPlan.examDay2) {
        return { ...d, dueDate: updatedExamPlan.examDay2 };
      }
      if (d.title.includes('CPALE Day 3') && updatedExamPlan.examDay3) {
        return { ...d, dueDate: updatedExamPlan.examDay3 };
      }
      if ((d.title.toLowerCase().includes('first preboard') || d.title.toLowerCase().includes('1st preboard')) && updatedExamPlan.firstPreboardStart) {
        return { ...d, dueDate: updatedExamPlan.firstPreboardStart };
      }
      if ((d.title.toLowerCase().includes('final preboard') || d.title.toLowerCase().includes('2nd preboard')) && updatedExamPlan.finalPreboardStart) {
        return { ...d, dueDate: updatedExamPlan.finalPreboardStart };
      }
      return d;
    });

    // Regenerate schedule preserving completed work
    const scheduleRes = SchedulingEngine.generateSchedule({
      examPlan: updatedExamPlan,
      weeklySchedule: state.weeklySchedule,
      workPeriod: state.workPeriod,
      isWorking: state.userProfile.isWorking,
      restDays: state.restDays,
      topics: state.topics,
      existingSessions: state.sessions,
      studyMaterials: state.studyMaterials,
      weeklyReviewTask: state.weeklyReviewTask,
    });

    const newState: AppStateData = {
      ...state,
      examPlan: updatedExamPlan,
      deadlines: updatedDeadlines,
      sessions: scheduleRes.sessions,
    };
    await saveUpdatedState(newState);
  }, [state, saveUpdatedState]);

  // Weekly Schedule
  const updateWeeklySchedule = useCallback(async (routine: DayRoutine[]) => {
    const scheduleRes = SchedulingEngine.generateSchedule({
      examPlan: state.examPlan,
      weeklySchedule: routine,
      workPeriod: state.workPeriod,
      isWorking: state.userProfile.isWorking,
      restDays: state.restDays,
      topics: state.topics,
      existingSessions: state.sessions,
      studyMaterials: state.studyMaterials,
      weeklyReviewTask: state.weeklyReviewTask,
    });

    const newState: AppStateData = {
      ...state,
      weeklySchedule: routine,
      sessions: scheduleRes.sessions,
    };
    await saveUpdatedState(newState);
  }, [state, saveUpdatedState]);

  // Work Period
  const updateWorkPeriod = useCallback(async (workPeriodUpdates: Partial<WorkPeriod>) => {
    const updatedWorkPeriod = { ...state.workPeriod, ...workPeriodUpdates };
    const scheduleRes = SchedulingEngine.generateSchedule({
      examPlan: state.examPlan,
      weeklySchedule: state.weeklySchedule,
      workPeriod: updatedWorkPeriod,
      isWorking: state.userProfile.isWorking,
      restDays: state.restDays,
      topics: state.topics,
      existingSessions: state.sessions,
      studyMaterials: state.studyMaterials,
      weeklyReviewTask: state.weeklyReviewTask,
    });

    const newState: AppStateData = {
      ...state,
      workPeriod: updatedWorkPeriod,
      sessions: scheduleRes.sessions,
    };
    await saveUpdatedState(newState);
  }, [state, saveUpdatedState]);

  // Rest Days
  const addRestDay = useCallback(async (restDayData: Omit<RestDay, 'id'>) => {
    const newRestDay: RestDay = {
      ...restDayData,
      id: `rest_${Date.now()}`,
    };
    const updatedRestDays = [...state.restDays, newRestDay];

    const scheduleRes = SchedulingEngine.generateSchedule({
      examPlan: state.examPlan,
      weeklySchedule: state.weeklySchedule,
      workPeriod: state.workPeriod,
      isWorking: state.userProfile.isWorking,
      restDays: updatedRestDays,
      topics: state.topics,
      existingSessions: state.sessions,
      studyMaterials: state.studyMaterials,
      weeklyReviewTask: state.weeklyReviewTask,
    });

    await saveUpdatedState({
      ...state,
      restDays: updatedRestDays,
      sessions: scheduleRes.sessions,
    });
  }, [state, saveUpdatedState]);

  const updateRestDay = useCallback(async (id: string, updates: Partial<RestDay>) => {
    const updatedRestDays = state.restDays.map(r => r.id === id ? { ...r, ...updates } : r);
    const scheduleRes = SchedulingEngine.generateSchedule({
      examPlan: state.examPlan,
      weeklySchedule: state.weeklySchedule,
      workPeriod: state.workPeriod,
      isWorking: state.userProfile.isWorking,
      restDays: updatedRestDays,
      topics: state.topics,
      existingSessions: state.sessions,
      studyMaterials: state.studyMaterials,
      weeklyReviewTask: state.weeklyReviewTask,
    });

    await saveUpdatedState({
      ...state,
      restDays: updatedRestDays,
      sessions: scheduleRes.sessions,
    });
  }, [state, saveUpdatedState]);

  const removeRestDay = useCallback(async (id: string) => {
    const updatedRestDays = state.restDays.filter(r => r.id !== id);
    const scheduleRes = SchedulingEngine.generateSchedule({
      examPlan: state.examPlan,
      weeklySchedule: state.weeklySchedule,
      workPeriod: state.workPeriod,
      isWorking: state.userProfile.isWorking,
      restDays: updatedRestDays,
      topics: state.topics,
      existingSessions: state.sessions,
      studyMaterials: state.studyMaterials,
      weeklyReviewTask: state.weeklyReviewTask,
    });

    await saveUpdatedState({
      ...state,
      restDays: updatedRestDays,
      sessions: scheduleRes.sessions,
    });
  }, [state, saveUpdatedState]);

  // Materials & Tasks
  const updateStudyMaterial = useCallback(async (subject: SubjectCode, updates: Partial<StudyMaterial>) => {
    const updatedMaterials = {
      ...state.studyMaterials,
      [subject]: { ...state.studyMaterials[subject], ...updates }
    };
    await saveUpdatedState({
      ...state,
      studyMaterials: updatedMaterials,
    });
  }, [state, saveUpdatedState]);

  const updateWeeklyReviewTask = useCallback(async (task: string) => {
    await saveUpdatedState({
      ...state,
      weeklyReviewTask: task,
    });
  }, [state, saveUpdatedState]);

  // Topics
  const addTopic = useCallback(async (topicData: Omit<Topic, 'id'>) => {
    const newTopic: Topic = {
      ...topicData,
      id: topicData.code,
    };
    const updatedTopics = [...state.topics, newTopic];
    await saveUpdatedState({ ...state, topics: updatedTopics });
  }, [state, saveUpdatedState]);

  const updateTopic = useCallback(async (id: string, updates: Partial<Topic>) => {
    const updatedTopics = state.topics.map(t => (t.id === id || t.code === id) ? { ...t, ...updates } : t);
    await saveUpdatedState({ ...state, topics: updatedTopics });
  }, [state, saveUpdatedState]);

  const deleteTopic = useCallback(async (id: string) => {
    const updatedTopics = state.topics.filter(t => t.id !== id && t.code !== id);
    await saveUpdatedState({ ...state, topics: updatedTopics });
  }, [state, saveUpdatedState]);

  const addCustomCategory = useCallback(async (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    const existing = state.customCategories || [];
    if (existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = [...existing, trimmed];
    await saveUpdatedState({ ...state, customCategories: updated });
  }, [state, saveUpdatedState]);

  const toggleTopicComplete = useCallback(async (topicIdOrCode: string) => {
    const targetTopic = state.topics.find(t => t.id === topicIdOrCode || t.code === topicIdOrCode);
    if (!targetTopic) return;

    const newStatus: TaskStatus = targetTopic.status === 'Completed' ? 'Not started' : 'Completed';
    const completionDate = newStatus === 'Completed' ? new Date().toISOString() : undefined;

    const updatedTopics = state.topics.map(t => {
      if (t.id === topicIdOrCode || t.code === topicIdOrCode) {
        return {
          ...t,
          status: newStatus,
          dateCompleted: completionDate,
        };
      }
      return t;
    });

    // Also update any matching session
    const updatedSessions = state.sessions.map(s => {
      if (s.topicCode === targetTopic.code) {
        return {
          ...s,
          status: newStatus,
          completedAt: completionDate,
        };
      }
      return s;
    });

    await saveUpdatedState({
      ...state,
      topics: updatedTopics,
      sessions: updatedSessions,
    });
  }, [state, saveUpdatedState]);

  const importTopicsList = useCallback(async (newTopics: Topic[], mode: 'merge' | 'replace') => {
    let finalTopics: Topic[] = [];
    if (mode === 'replace') {
      finalTopics = newTopics;
    } else {
      const existingMap = new Map(state.topics.map(t => [t.code, t]));
      for (const nt of newTopics) {
        existingMap.set(nt.code, { ...existingMap.get(nt.code), ...nt });
      }
      finalTopics = Array.from(existingMap.values());
    }

    const scheduleRes = SchedulingEngine.generateSchedule({
      examPlan: state.examPlan,
      weeklySchedule: state.weeklySchedule,
      workPeriod: state.workPeriod,
      isWorking: state.userProfile.isWorking,
      restDays: state.restDays,
      topics: finalTopics,
      existingSessions: state.sessions,
      studyMaterials: state.studyMaterials,
      weeklyReviewTask: state.weeklyReviewTask,
    });

    await saveUpdatedState({
      ...state,
      topics: finalTopics,
      sessions: scheduleRes.sessions,
    });
  }, [state, saveUpdatedState]);

  // Plan generation
  const regeneratePlan = useCallback(async () => {
    const scheduleRes = SchedulingEngine.generateSchedule({
      examPlan: state.examPlan,
      weeklySchedule: state.weeklySchedule,
      workPeriod: state.workPeriod,
      isWorking: state.userProfile.isWorking,
      restDays: state.restDays,
      topics: state.topics,
      existingSessions: state.sessions,
      studyMaterials: state.studyMaterials,
      weeklyReviewTask: state.weeklyReviewTask,
    });

    await saveUpdatedState({
      ...state,
      sessions: scheduleRes.sessions,
    });
  }, [state, saveUpdatedState]);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<StudySession>) => {
    const updatedSessions = state.sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s);
    await saveUpdatedState({ ...state, sessions: updatedSessions });
  }, [state, saveUpdatedState]);

  const completeSession = useCallback(async (sessionId: string, actualMinutes?: number, practiceAttempt?: PracticeAttempt, actualSeconds?: number) => {
    const nowIso = new Date().toISOString();
    let completedTopicCode: string | undefined;

    const updatedSessions = state.sessions.map(s => {
      if (s.id === sessionId) {
        completedTopicCode = s.topicCode;
        let durationMinutes: number;
        let durationSeconds: number;

        if (typeof actualSeconds === 'number' && actualSeconds >= 0) {
          durationSeconds = Math.floor(actualSeconds);
          durationMinutes = actualMinutes !== undefined ? actualMinutes : Math.max(1, Math.round(durationSeconds / 60));
        } else if (typeof actualMinutes === 'number' && actualMinutes > 0) {
          durationMinutes = actualMinutes;
          durationSeconds = actualMinutes * 60;
        } else {
          durationMinutes = s.plannedDuration || 60;
          durationSeconds = durationMinutes * 60;
        }

        return {
          ...s,
          status: 'Completed' as const,
          actualDuration: durationMinutes,
          actualDurationSeconds: durationSeconds,
          completedAt: nowIso,
          practiceAttempt: practiceAttempt || s.practiceAttempt,
        };
      }
      return s;
    });

    // Update topic completion if applicable
    let updatedTopics = state.topics;
    if (completedTopicCode) {
      updatedTopics = state.topics.map(t => {
        if (t.code === completedTopicCode) {
          return {
            ...t,
            status: 'Completed' as const,
            dateCompleted: nowIso,
          };
        }
        return t;
      });
    }

    let updatedAttempts = state.practiceAttempts;
    if (practiceAttempt) {
      updatedAttempts = [...state.practiceAttempts, practiceAttempt];
    }

    await saveUpdatedState({
      ...state,
      sessions: updatedSessions,
      topics: updatedTopics,
      practiceAttempts: updatedAttempts,
    });
  }, [state, saveUpdatedState]);

  const rescheduleMissedSession = useCallback(async (sessionId: string, newDate?: string, plannedDuration?: number) => {
    const { updatedSessions } = ReschedulingEngine.applyRescheduleMissedSession({
      sessions: state.sessions,
      missedSessionId: sessionId,
      newTargetDate: newDate,
      plannedDuration,
    });

    await saveUpdatedState({
      ...state,
      sessions: updatedSessions,
    });
  }, [state, saveUpdatedState]);

  // Deadlines
  const addDeadline = useCallback(async (deadlineData: Omit<Deadline, 'id'>) => {
    const newDeadline: Deadline = {
      ...deadlineData,
      id: `dl_${Date.now()}`,
    };
    await saveUpdatedState({
      ...state,
      deadlines: [...state.deadlines, newDeadline],
    });
  }, [state, saveUpdatedState]);

  const updateDeadline = useCallback(async (id: string, updates: Partial<Deadline>) => {
    const updated = state.deadlines.map(d => d.id === id ? { ...d, ...updates } : d);
    await saveUpdatedState({ ...state, deadlines: updated });
  }, [state, saveUpdatedState]);

  const toggleDeadlineComplete = useCallback(async (id: string) => {
    const updated = state.deadlines.map(d => {
      if (d.id === id) {
        const next = !d.isCompleted;
        return {
          ...d,
          isCompleted: next,
          completedAt: next ? new Date().toISOString() : undefined,
        };
      }
      return d;
    });
    await saveUpdatedState({ ...state, deadlines: updated });
  }, [state, saveUpdatedState]);

  const deleteDeadline = useCallback(async (id: string) => {
    const updated = state.deadlines.filter(d => d.id !== id);
    await saveUpdatedState({ ...state, deadlines: updated });
  }, [state, saveUpdatedState]);

  // Practice Attempts
  const logPracticeAttempt = useCallback(async (attemptData: Omit<PracticeAttempt, 'id'>) => {
    const newAttempt: PracticeAttempt = {
      ...attemptData,
      id: `pa_${Date.now()}`,
    };
    await saveUpdatedState({
      ...state,
      practiceAttempts: [...state.practiceAttempts, newAttempt],
    });
  }, [state, saveUpdatedState]);

  // Assessments & Preboards Coverage Tracking
  const toggleAssessmentTopic = useCallback(async (assessmentId: string, topicIdOrCode: string) => {
    const assessments = state.assessments || [];
    const updated = assessments.map(a => {
      if (a.id === assessmentId) {
        const updatedTopics = a.topics.map(t => {
          if (t.id === topicIdOrCode || t.topicCode === topicIdOrCode) {
            const nextCompleted = !t.isCompleted;
            return {
              ...t,
              isCompleted: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : undefined,
            };
          }
          return t;
        });
        return { ...a, topics: updatedTopics };
      }
      return a;
    });
    await saveUpdatedState({ ...state, assessments: updated });
  }, [state, saveUpdatedState]);

  const addAssessment = useCallback(async (assessmentData: Omit<AssessmentRecord, 'id'>) => {
    const newAssessment: AssessmentRecord = {
      ...assessmentData,
      id: `assessment_${Date.now()}`,
    };
    const current = state.assessments || [];
    await saveUpdatedState({
      ...state,
      assessments: [...current, newAssessment],
    });
  }, [state, saveUpdatedState]);

  const updateAssessment = useCallback(async (id: string, updates: Partial<AssessmentRecord>) => {
    const current = state.assessments || [];
    const updated = current.map(a => a.id === id ? { ...a, ...updates } : a);
    await saveUpdatedState({ ...state, assessments: updated });
  }, [state, saveUpdatedState]);

  const deleteAssessment = useCallback(async (id: string) => {
    const current = state.assessments || [];
    const updated = current.filter(a => a.id !== id);
    await saveUpdatedState({ ...state, assessments: updated });
  }, [state, saveUpdatedState]);

  const addTopicToAssessment = useCallback(async (assessmentId: string, topicData: Omit<AssessmentTopicItem, 'id'>) => {
    const current = state.assessments || [];
    const updated = current.map(a => {
      if (a.id === assessmentId) {
        const newTopic: AssessmentTopicItem = {
          ...topicData,
          id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        };
        return {
          ...a,
          topics: [...a.topics, newTopic],
        };
      }
      return a;
    });
    await saveUpdatedState({ ...state, assessments: updated });
  }, [state, saveUpdatedState]);

  const removeTopicFromAssessment = useCallback(async (assessmentId: string, topicId: string) => {
    const current = state.assessments || [];
    const updated = current.map(a => {
      if (a.id === assessmentId) {
        return {
          ...a,
          topics: a.topics.filter(t => t.id !== topicId),
        };
      }
      return a;
    });
    await saveUpdatedState({ ...state, assessments: updated });
  }, [state, saveUpdatedState]);

  const importAssessmentsList = useCallback(async (newAssessments: AssessmentRecord[], mode: 'merge' | 'replace') => {
    const current = state.assessments || [];
    let finalAssessments: AssessmentRecord[];
    if (mode === 'replace') {
      finalAssessments = newAssessments;
    } else {
      const map = new Map<string, AssessmentRecord>();
      for (const a of current) map.set(a.id, a);
      for (const a of newAssessments) {
        if (map.has(a.id)) {
          const existing = map.get(a.id)!;
          const topicMap = new Map<string, AssessmentTopicItem>();
          for (const t of existing.topics) topicMap.set(t.topicCode || t.id, t);
          for (const t of a.topics) {
            const key = t.topicCode || t.id;
            if (!topicMap.has(key)) {
              topicMap.set(key, t);
            }
          }
          map.set(a.id, { ...existing, ...a, topics: Array.from(topicMap.values()) });
        } else {
          map.set(a.id, a);
        }
      }
      finalAssessments = Array.from(map.values());
    }
    await saveUpdatedState({ ...state, assessments: finalAssessments });
  }, [state, saveUpdatedState]);

  // Timer Handlers (with background tolerance)
  const startTimer = useCallback((session?: StudySession) => {
    setActiveTimer({
      topicId: session?.topicId,
      topicCode: session?.topicCode,
      topicTitle: session?.topicName || 'CPALE Review Session',
      subject: session?.subject,
      isRunning: true,
      elapsedSeconds: 0,
      startTimestamp: Date.now(),
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setActiveTimer(prev => ({
      ...prev,
      isRunning: false,
      startTimestamp: undefined,
    }));
  }, []);

  const resumeTimer = useCallback(() => {
    setActiveTimer(prev => ({
      ...prev,
      isRunning: true,
      startTimestamp: Date.now(),
    }));
  }, []);

  const stopTimer = useCallback(async (saveToSessionId?: string): Promise<number> => {
    const totalSeconds = activeTimer.elapsedSeconds;
    const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));

    if (saveToSessionId) {
      await completeSession(saveToSessionId, totalMinutes, undefined, totalSeconds);
    }

    setActiveTimer({
      isRunning: false,
      elapsedSeconds: 0,
      startTimestamp: undefined,
    });

    return totalMinutes;
  }, [activeTimer.elapsedSeconds, completeSession]);

  const resetTimer = useCallback(() => {
    setActiveTimer({
      isRunning: false,
      elapsedSeconds: 0,
      startTimestamp: undefined,
    });
  }, []);

  // Preferences
  const updatePreferences = useCallback(async (prefsUpdates: Partial<UserPreferences>) => {
    await saveUpdatedState({
      ...state,
      preferences: { ...state.preferences, ...prefsUpdates },
    });
  }, [state, saveUpdatedState]);

  // Cloud Sync
  const triggerCloudSync = useCallback(async (): Promise<SyncStatus> => {
    const res = await SupabaseService.syncUserData(state);
    const updatedSync: AppStateData = {
      ...state,
      syncMetadata: {
        lastSyncedAt: res.status === 'Synced' ? new Date().toISOString() : state.syncMetadata.lastSyncedAt,
        syncStatus: res.status,
        pendingChangesCount: res.status === 'Synced' ? 0 : state.syncMetadata.pendingChangesCount,
        errorMessage: res.message,
      }
    };
    await saveUpdatedState(updatedSync);
    return res.status;
  }, [state, saveUpdatedState]);

  // Setup CSV Importer
  const importFromSetupCSV = useCallback(async (csvText: string): Promise<SetupCSVParseResult> => {
    const parsed = CSVService.parseSetupCSV(csvText);

    const mergedProfile = { ...state.userProfile, ...(parsed.userProfile || {}) };
    const mergedPlan = { ...state.examPlan, ...(parsed.examPlan || {}) };
    const mergedRoutine = parsed.weeklySchedule || state.weeklySchedule;
    const mergedWorkPeriod = { ...state.workPeriod, ...(parsed.workPeriod || {}) };
    const mergedRestDays = parsed.restDays || state.restDays;
    const mergedMaterials = { ...state.studyMaterials, ...(parsed.materials || {}) };
    const mergedReviewTask = parsed.weeklyReviewTask || state.weeklyReviewTask;
    const mergedDeadlines = parsed.deadlines ? [...parsed.deadlines] : state.deadlines;

    // Regenerate plan with imported values
    const scheduleRes = SchedulingEngine.generateSchedule({
      examPlan: mergedPlan,
      weeklySchedule: mergedRoutine,
      workPeriod: mergedWorkPeriod,
      isWorking: mergedProfile.isWorking,
      restDays: mergedRestDays,
      topics: state.topics,
      existingSessions: state.sessions,
      studyMaterials: mergedMaterials,
      weeklyReviewTask: mergedReviewTask,
    });

    const newState: AppStateData = {
      ...state,
      userProfile: mergedProfile,
      examPlan: mergedPlan,
      weeklySchedule: mergedRoutine,
      workPeriod: mergedWorkPeriod,
      restDays: mergedRestDays,
      studyMaterials: mergedMaterials,
      weeklyReviewTask: mergedReviewTask,
      deadlines: mergedDeadlines,
      sessions: scheduleRes.sessions,
    };

    await saveUpdatedState(newState);
    return parsed;
  }, [state, saveUpdatedState]);

  const resetAllData = useCallback(async () => {
    // Permanently wipe tracker data from every persistence layer.
    await ReminderEngine.clearAllReminders();
    await StorageEngine.clearAll();

    // Empty shell only — never re-seed topics/sessions/deadlines/assessments.
    // Schedule regeneration is skipped because topics are empty (SchedulingEngine guard).
    const empty = StorageEngine.getEmptyState();
    setActiveTimer({
      isRunning: false,
      elapsedSeconds: 0,
      topicId: undefined,
      topicTitle: undefined,
      startTimestamp: undefined,
    });
    setState(empty);
    // Persist empty state so reload / offline reopen cannot resurrect wiped records.
    await StorageEngine.saveState(empty);
    ReminderEngine.syncReminders(empty).catch(() => {});
  }, []);

  const completeOnboarding = useCallback(async () => {
    await saveUpdatedState({
      ...state,
      hasCompletedOnboarding: true,
    });
  }, [state, saveUpdatedState]);

  return (
    <AppContext.Provider
      value={{
        state,
        isLoaded,
        analytics,
        activeTimer,
        achievements,
        achievementNotifications,
        dismissAchievementNotification,
        executeImport,
        executeWorkbookImport,
        updateUserProfile,
        updateExamPlan,
        updateWeeklySchedule,
        updateWorkPeriod,
        addRestDay,
        updateRestDay,
        removeRestDay,
        updateStudyMaterial,
        updateWeeklyReviewTask,
        addTopic,
        updateTopic,
        deleteTopic,
        toggleTopicComplete,
        importTopicsList,
        addCustomCategory,
        regeneratePlan,
        updateSession,
        completeSession,
        rescheduleMissedSession,
        addDeadline,
        updateDeadline,
        toggleDeadlineComplete,
        deleteDeadline,
        logPracticeAttempt,
        toggleAssessmentTopic,
        addAssessment,
        updateAssessment,
        deleteAssessment,
        addTopicToAssessment,
        removeTopicFromAssessment,
        importAssessmentsList,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        resetTimer,
        updatePreferences,
        triggerCloudSync,
        importFromSetupCSV,
        resetAllData,
        completeOnboarding,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
