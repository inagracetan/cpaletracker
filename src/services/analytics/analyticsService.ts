import { Topic, StudySession, PracticeAttempt, SubjectCode, SubjectCodes } from '../../types';
import { SchedulingEngine } from '../scheduler/schedulingEngine';

export interface SubjectProgress {
  subject: SubjectCode;
  totalTopics: number;
  completedTopics: number;
  remainingTopics: number;
  percentage: number;
  totalStudyMinutes: number;
  weakTopicsCount: number;
}

export interface ProgressAnalytics {
  overallTopicPercentage: number;
  completedTopicsCount: number;
  totalTopicsCount: number;
  remainingTopicsCount: number;
  subjectProgress: Record<SubjectCode, SubjectProgress>;
  totalStudySeconds: number;
  totalStudyMinutes: number;
  totalStudyHoursFormatted: string;
  currentStreakDays: number;
  overdueTasksCount: number;
  practiceAccuracyPercentage: number;
  totalQuestionsAttempted: number;
  totalQuestionsCorrect: number;
  difficultyDistribution: {
    Light: { completed: number; total: number };
    Medium: { completed: number; total: number };
    Heavy: { completed: number; total: number };
  };
  weakTopics: Array<{
    code: string;
    subject: SubjectCode;
    name: string;
    reason: string;
  }>;
  projectedFinishDate?: string;
  isBehindSchedule: boolean;
  daysAheadOrBehind: number;
}

export class AnalyticsService {
  /**
   * Calculate comprehensive CPALE progress analytics safely with 0 denominator guards
   */
  public static calculateAnalytics(params: {
    topics: Topic[];
    sessions: StudySession[];
    practiceAttempts: PracticeAttempt[];
    targetFinishDate?: string;
    currentDate?: string;
  }): ProgressAnalytics {
    const {
      topics,
      sessions,
      practiceAttempts,
      targetFinishDate,
      currentDate = SchedulingEngine.formatDate(new Date()),
    } = params;

    // Filter active topics
    const activeTopics = topics.filter(t => !t.archived);
    const completedTopics = activeTopics.filter(t => t.status === 'Completed');

    // Overall topic percentage
    const overallTopicPercentage = activeTopics.length > 0 
      ? Math.round((completedTopics.length / activeTopics.length) * 1000) / 10 
      : 0;

    // Subject breakdown
    const subjectProgress: Record<SubjectCode, SubjectProgress> = {
      FAR: { subject: 'FAR', totalTopics: 0, completedTopics: 0, remainingTopics: 0, percentage: 0, totalStudyMinutes: 0, weakTopicsCount: 0 },
      AFAR: { subject: 'AFAR', totalTopics: 0, completedTopics: 0, remainingTopics: 0, percentage: 0, totalStudyMinutes: 0, weakTopicsCount: 0 },
      MS: { subject: 'MS', totalTopics: 0, completedTopics: 0, remainingTopics: 0, percentage: 0, totalStudyMinutes: 0, weakTopicsCount: 0 },
      TAX: { subject: 'TAX', totalTopics: 0, completedTopics: 0, remainingTopics: 0, percentage: 0, totalStudyMinutes: 0, weakTopicsCount: 0 },
      AUD: { subject: 'AUD', totalTopics: 0, completedTopics: 0, remainingTopics: 0, percentage: 0, totalStudyMinutes: 0, weakTopicsCount: 0 },
      RFBT: { subject: 'RFBT', totalTopics: 0, completedTopics: 0, remainingTopics: 0, percentage: 0, totalStudyMinutes: 0, weakTopicsCount: 0 },
    };

    // Calculate topics per subject
    for (const t of activeTopics) {
      if (subjectProgress[t.subject]) {
        subjectProgress[t.subject].totalTopics++;
        if (t.status === 'Completed') {
          subjectProgress[t.subject].completedTopics++;
        }
      }
    }

    // Study minutes and percentages per subject
    for (const s of sessions) {
      if (s.subject && subjectProgress[s.subject] && s.actualDuration > 0) {
        subjectProgress[s.subject].totalStudyMinutes += s.actualDuration;
      }
    }

    for (const code of SubjectCodes) {
      const sp = subjectProgress[code];
      sp.remainingTopics = sp.totalTopics - sp.completedTopics;
      sp.percentage = sp.totalTopics > 0 
        ? Math.round((sp.completedTopics / sp.totalTopics) * 1000) / 10 
        : 0;
    }

    // Total study duration derived from authoritative session records
    let totalStudySeconds = 0;
    for (const s of sessions) {
      if (s.status === 'Completed' || (s.actualDurationSeconds && s.actualDurationSeconds > 0) || (s.actualDuration && s.actualDuration > 0)) {
        if (typeof s.actualDurationSeconds === 'number' && s.actualDurationSeconds > 0) {
          totalStudySeconds += Math.floor(s.actualDurationSeconds);
        } else if (typeof s.actualDuration === 'number' && s.actualDuration > 0) {
          totalStudySeconds += Math.floor(s.actualDuration * 60);
        }
      }
    }
    const totalStudyMinutes = Math.floor(totalStudySeconds / 60);
    const hours = Math.floor(totalStudySeconds / 3600);
    const mins = Math.floor((totalStudySeconds % 3600) / 60);
    const secs = totalStudySeconds % 60;
    const totalStudyHoursFormatted = `${hours}h ${mins}m ${secs}s`;

    // Streak calculation from completed study sessions
    const completedDates = new Set<string>();
    for (const s of sessions) {
      if (s.status === 'Completed' && (s.type === 'STUDY' || s.type === 'REVIEW')) {
        completedDates.add(s.date);
      }
    }

    let streak = 0;
    let checkDate = currentDate;

    // If today is completed, start streak counting from today; otherwise from yesterday
    if (!completedDates.has(checkDate)) {
      checkDate = SchedulingEngine.addDays(checkDate, -1);
    }

    while (completedDates.has(checkDate)) {
      streak++;
      checkDate = SchedulingEngine.addDays(checkDate, -1);
    }

    // Overdue tasks count
    let overdueCount = 0;
    for (const s of sessions) {
      if (s.date < currentDate && s.status !== 'Completed' && s.status !== 'Skipped' && s.type !== 'REST') {
        overdueCount++;
      }
    }

    // Practice question accuracy
    let totalAttempted = 0;
    let totalCorrect = 0;
    for (const p of practiceAttempts) {
      totalAttempted += (p.attempted || 0);
      totalCorrect += (p.correct || 0);
    }
    // Also include session practice attempts
    for (const s of sessions) {
      if (s.practiceAttempt) {
        totalAttempted += (s.practiceAttempt.attempted || 0);
        totalCorrect += (s.practiceAttempt.correct || 0);
      }
    }

    const practiceAccuracyPercentage = totalAttempted > 0
      ? Math.round((totalCorrect / totalAttempted) * 1000) / 10
      : 0;

    // Difficulty distribution
    const difficultyDistribution = {
      Light: { completed: 0, total: 0 },
      Medium: { completed: 0, total: 0 },
      Heavy: { completed: 0, total: 0 },
    };

    for (const t of activeTopics) {
      const diff = t.difficulty || 'Medium';
      difficultyDistribution[diff].total++;
      if (t.status === 'Completed') {
        difficultyDistribution[diff].completed++;
      }
    }

    // Weak topics identification
    const weakTopics: Array<{ code: string; subject: SubjectCode; name: string; reason: string }> = [];
    for (const t of activeTopics) {
      let isWeak = false;
      let reason = '';
      if (t.isDifficult) {
        isWeak = true;
        reason = 'Flagged as difficult';
      } else if (t.confidence && t.confidence <= 2) {
        isWeak = true;
        reason = `Low confidence rating (${t.confidence}/5)`;
      }
      if (isWeak) {
        weakTopics.push({
          code: t.code,
          subject: t.subject,
          name: t.name,
          reason,
        });
        if (subjectProgress[t.subject]) {
          subjectProgress[t.subject].weakTopicsCount++;
        }
      }
    }

    // Schedule projection: planned vs actual
    let plannedSessionsToDate = 0;
    let doneSessionsToDate = 0;
    for (const s of sessions) {
      if (s.date <= currentDate && s.type === 'STUDY') {
        plannedSessionsToDate++;
        if (s.status === 'Completed') {
          doneSessionsToDate++;
        }
      }
    }

    const daysAheadOrBehind = doneSessionsToDate - plannedSessionsToDate;
    const isBehindSchedule = daysAheadOrBehind < 0;

    return {
      overallTopicPercentage,
      completedTopicsCount: completedTopics.length,
      totalTopicsCount: activeTopics.length,
      remainingTopicsCount: activeTopics.length - completedTopics.length,
      subjectProgress,
      totalStudySeconds,
      totalStudyMinutes,
      totalStudyHoursFormatted,
      currentStreakDays: streak,
      overdueTasksCount: overdueCount,
      practiceAccuracyPercentage,
      totalQuestionsAttempted: totalAttempted,
      totalQuestionsCorrect: totalCorrect,
      difficultyDistribution,
      weakTopics,
      projectedFinishDate: targetFinishDate,
      isBehindSchedule,
      daysAheadOrBehind,
    };
  }
}
