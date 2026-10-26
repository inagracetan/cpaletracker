import { 
  AppStateData, 
  BadgeRecord, 
  AchievementNotification, 
  BadgeDefinition 
} from '../../types';
import { BADGE_CATALOG } from './badgeCatalog';

export interface EvaluatedBadge {
  definition: BadgeDefinition;
  record?: BadgeRecord;
  isUnlocked: boolean;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  progressText: string;
}

export interface AchievementEvaluationResult {
  evaluatedBadges: EvaluatedBadge[];
  newlyUnlocked: BadgeRecord[];
  newNotifications: AchievementNotification[];
  currentStreak: number;
  longestStreak: number;
  totalCompletedSessions: number;
  totalCompletedTopics: number;
}

export class AchievementEngine {
  /**
   * Calculate consecutive study streak with timezone and scheduled rest day protection
   */
  public static calculateStreak(state: AppStateData): { currentStreak: number; longestStreak: number; completedDates: string[] } {
    const completedDatesSet = new Set<string>();

    // Completed sessions
    state.sessions.forEach(s => {
      if (s.status === 'Completed' && s.date) {
        completedDatesSet.add(s.date);
      }
    });

    // Also practice attempts with date
    state.practiceAttempts.forEach(p => {
      if (p.date) {
        completedDatesSet.add(p.date.split('T')[0]);
      }
    });

    const completedDates = Array.from(completedDatesSet).sort();
    if (completedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, completedDates: [] };
    }

    // Set of protected rest day dates
    const restDayDatesSet = new Set<string>();
    state.restDays.forEach(r => restDayDatesSet.add(r.date));

    // Weekly rest day pattern
    const weeklyRestDays = new Set(
      state.weeklySchedule
        .filter(w => w.studyPlan === 'Rest day')
        .map(w => w.dayOfWeek.toLowerCase())
    );

    const isDateProtectedRest = (dateStr: string): boolean => {
      if (restDayDatesSet.has(dateStr)) return true;
      const d = new Date(dateStr + 'T12:00:00Z');
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[d.getUTCDay()];
      return weeklyRestDays.has(dayName);
    };

    // Calculate longest and current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Helper to get next day string YYYY-MM-DD
    const addDays = (dStr: string, n: number): string => {
      const dt = new Date(dStr + 'T12:00:00Z');
      dt.setUTCDate(dt.getUTCDate() + n);
      return dt.toISOString().split('T')[0];
    };

    // Scan backwards from today / yesterday for current streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = addDays(today, -1);

    let checkDate = completedDatesSet.has(today) ? today : (completedDatesSet.has(yesterday) ? yesterday : null);

    if (checkDate) {
      let cur = checkDate;
      while (true) {
        if (completedDatesSet.has(cur)) {
          currentStreak++;
          cur = addDays(cur, -1);
        } else if (isDateProtectedRest(cur)) {
          // Protected rest day does not break streak!
          cur = addDays(cur, -1);
        } else {
          break;
        }
      }
    }

    // Longest streak calculation across history
    let prevDate: string | null = null;
    for (const d of completedDates) {
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const nextExpected = addDays(prevDate, 1);
        if (d === nextExpected) {
          tempStreak++;
        } else {
          // Check if intervening days were all protected rest days
          let allRest = true;
          let step = addDays(prevDate, 1);
          while (step < d) {
            if (!isDateProtectedRest(step)) {
              allRest = false;
              break;
            }
            step = addDays(step, 1);
          }
          if (allRest) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
        }
      }
      prevDate = d;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }

    if (currentStreak > longestStreak) longestStreak = currentStreak;

    return { currentStreak, longestStreak, completedDates };
  }

  /**
   * Check for gaps >= 7 days between study sessions for "Comeback Champion"
   */
  public static hasComeback(completedDates: string[]): boolean {
    if (completedDates.length < 2) return false;
    for (let i = 1; i < completedDates.length; i++) {
      const prev = new Date(completedDates[i - 1] + 'T00:00:00Z').getTime();
      const curr = new Date(completedDates[i] + 'T00:00:00Z').getTime();
      const diffDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays >= 7) {
        return true;
      }
    }
    return false;
  }

  /**
   * Evaluate all badges against current application state
   */
  public static evaluateAllBadges(state: AppStateData): AchievementEvaluationResult {
    const existingBadgesMap = new Map<string, BadgeRecord>();
    (state.badges || []).forEach(b => existingBadgesMap.set(b.badgeId, b));

    const { currentStreak, longestStreak, completedDates } = this.calculateStreak(state);

    // Compute metrics
    const completedSessions = state.sessions.filter(s => s.status === 'Completed');
    const totalCompletedSessions = completedSessions.length;

    const completedTopics = state.topics.filter(t => t.status === 'Completed');
    const totalCompletedTopics = completedTopics.length;
    const totalTopics = state.topics.length || 1;
    const topicPercent = Math.round((totalCompletedTopics / totalTopics) * 100);

    // Practice questions stats
    let totalQuestionsAttempted = 0;
    let totalQuestionsCorrect = 0;
    state.practiceAttempts.forEach(p => {
      totalQuestionsAttempted += p.attempted || 0;
      totalQuestionsCorrect += p.correct || 0;
    });
    const practiceAccuracy = totalQuestionsAttempted > 0 
      ? Math.round((totalQuestionsCorrect / totalQuestionsAttempted) * 100) 
      : 0;

    // Weekly review sessions completed
    const weeklyReviews = completedSessions.filter(s => s.type === 'REVIEW');
    const weeklyReviewWeeks = new Set(weeklyReviews.map(s => {
      const d = new Date(s.date + 'T00:00:00Z');
      const onejan = new Date(d.getUTCFullYear(), 0, 1);
      const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getUTCDay() + 1) / 7);
      return `${d.getUTCFullYear()}-W${week}`;
    })).size;

    // Difficult topics
    const difficultTopicsDone = state.topics.filter(t => t.isDifficult && t.status === 'Completed').length;

    // Deadlines completed
    const completedDeadlines = state.deadlines.filter(d => d.isCompleted).length;

    // Preboard done
    const preboardDone = state.deadlines.some(d => d.category === 'Preboards' && d.isCompleted) ||
      completedSessions.some(s => s.type === 'PREBOARD');

    // Organized scholar (materials in >= 3 subjects)
    const subjectsWithMaterials = Object.values(state.studyMaterials || {}).filter(m => 
      m && m.materialText && m.materialText.trim() !== ''
    ).length;

    // Early finisher
    const today = new Date().toISOString().split('T')[0];
    const isEarlyFinished = totalCompletedTopics >= totalTopics && totalTopics > 0 && today <= state.examPlan.targetFinishDate;

    // Comeback champion
    const hasComebackGap = this.hasComeback(completedDates);

    const evaluatedBadges: EvaluatedBadge[] = [];
    const newlyUnlocked: BadgeRecord[] = [];
    const newNotifications: AchievementNotification[] = [];

    BADGE_CATALOG.forEach(def => {
      const existing = existingBadgesMap.get(def.id);
      let currentValue = 0;
      let targetValue = def.targetValue || 1;
      let isUnlocked = existing ? existing.isUnlocked : false;
      let progressText = '';

      switch (def.id) {
        // Getting Started
        case 'first-step':
          currentValue = totalCompletedSessions;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentValue} of ${targetValue} session completed`;
          break;
        case 'syllabus-explorer':
          currentValue = state.topics.length > 0 ? 1 : 0;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : 'View the syllabus to unlock';
          break;
        case 'plan-ready':
          currentValue = state.sessions.length > 0 ? 1 : 0;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : 'Generate your study plan';
          break;
        case 'organized-scholar':
          currentValue = subjectsWithMaterials;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentValue} of ${targetValue} subjects with materials`;
          break;

        // Consistency
        case 'streak-3':
          currentValue = longestStreak;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentStreak} of ${targetValue} consecutive days`;
          break;
        case 'streak-7':
          currentValue = longestStreak;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentStreak} of ${targetValue} consecutive days`;
          break;
        case 'streak-14':
          currentValue = longestStreak;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentStreak} of ${targetValue} consecutive days`;
          break;
        case 'streak-30':
          currentValue = longestStreak;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentStreak} of ${targetValue} consecutive days`;
          break;
        case 'weekly-warrior':
          currentValue = weeklyReviewWeeks;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentValue} of ${targetValue} review weeks completed`;
          break;

        // Study Progress
        case 'first-five':
          currentValue = totalCompletedTopics;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentValue} of ${targetValue} topics completed`;
          break;
        case 'ten-topics':
          currentValue = totalCompletedTopics;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentValue} of ${targetValue} topics completed`;
          break;
        case 'quarter-way':
          currentValue = topicPercent;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${totalCompletedTopics} of ${Math.ceil(totalTopics * 0.25)} topics completed (${topicPercent}%)`;
          break;
        case 'halfway-hero':
          currentValue = topicPercent;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${totalCompletedTopics} of ${Math.ceil(totalTopics * 0.50)} topics completed (${topicPercent}%)`;
          break;
        case 'almost-there':
          currentValue = topicPercent;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${totalCompletedTopics} of ${Math.ceil(totalTopics * 0.75)} topics completed (${topicPercent}%)`;
          break;
        case 'syllabus-complete':
          currentValue = topicPercent;
          isUnlocked = isUnlocked || (totalCompletedTopics >= totalTopics && totalTopics > 0);
          progressText = isUnlocked ? 'Unlocked' : `${totalCompletedTopics} of ${totalTopics} topics completed (${topicPercent}%)`;
          break;

        // Practice and Mastery
        case 'practice-starter':
          currentValue = state.practiceAttempts.length;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : 'Complete 1 practice session';
          break;
        case 'hundred-questions':
          currentValue = totalQuestionsAttempted;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentValue} of ${targetValue} questions attempted`;
          break;
        case 'five-hundred-questions':
          currentValue = totalQuestionsAttempted;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentValue} of ${targetValue} questions attempted`;
          break;
        case 'accuracy-builder':
          currentValue = totalQuestionsAttempted >= 30 ? practiceAccuracy : 0;
          isUnlocked = isUnlocked || (totalQuestionsAttempted >= 30 && practiceAccuracy >= targetValue);
          progressText = isUnlocked 
            ? 'Unlocked' 
            : `${practiceAccuracy}% accuracy (${totalQuestionsAttempted}/30 min questions attempted)`;
          break;
        case 'weakness-crusher':
          currentValue = difficultTopicsDone;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentValue} of ${targetValue} difficult topics finished`;
          break;

        // Planning and Milestones
        case 'deadline-keeper':
          currentValue = completedDeadlines;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `${currentValue} of ${targetValue} deadlines completed`;
          break;
        case 'preboard-ready':
          currentValue = preboardDone ? 1 : 0;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : 'Complete a preboard exam';
          break;
        case 'early-finisher':
          currentValue = isEarlyFinished ? 1 : 0;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : `Finish syllabus before ${state.examPlan.targetFinishDate}`;
          break;
        case 'comeback-champion':
          currentValue = hasComebackGap ? 1 : 0;
          isUnlocked = isUnlocked || currentValue >= targetValue;
          progressText = isUnlocked ? 'Unlocked' : 'Resume studying after a 7+ day break';
          break;
      }

      // Check if newly unlocked
      if (isUnlocked && (!existing || !existing.isUnlocked)) {
        const newRecord: BadgeRecord = {
          id: `badge_rec_${def.id}`,
          badgeId: def.id,
          unlockedAt: new Date().toISOString(),
          currentValue,
          targetValue,
          isUnlocked: true,
        };
        newlyUnlocked.push(newRecord);

        // Check if notification already exists to prevent duplicate
        const notifExists = (state.achievementNotifications || []).some(n => n.badgeId === def.id);
        if (!notifExists) {
          newNotifications.push({
            id: `notif_${def.id}_${Date.now()}`,
            badgeId: def.id,
            badgeName: def.name,
            description: def.description,
            icon: def.icon,
            unlockedAt: new Date().toISOString(),
            dismissed: false,
          });
        }
      }

      const percent = Math.min(100, Math.round((currentValue / targetValue) * 100));

      evaluatedBadges.push({
        definition: def,
        record: existing || (isUnlocked ? {
          id: `badge_rec_${def.id}`,
          badgeId: def.id,
          unlockedAt: new Date().toISOString(),
          currentValue,
          targetValue,
          isUnlocked: true,
        } : undefined),
        isUnlocked,
        currentValue,
        targetValue,
        progressPercent: percent,
        progressText,
      });
    });

    return {
      evaluatedBadges,
      newlyUnlocked,
      newNotifications,
      currentStreak,
      longestStreak,
      totalCompletedSessions,
      totalCompletedTopics,
    };
  }
}
