import { 
  ExamPlan, 
  DayRoutine, 
  RestDay, 
  WorkPeriod, 
  Topic, 
  StudySession, 
  SubjectCode 
} from '../../types';
import { DEFAULT_STUDY_ORDER, RecommendedOrderItem } from '../../data/defaultStudyOrder';

export interface ScheduleGenerationResult {
  sessions: StudySession[];
  warnings: string[];
  capacity: {
    totalEligibleDays: number;
    studySessionsCapacity: number;
    topicsCount: number;
    shortfall: number;
    isFeasible: boolean;
  };
  validation: {
    missingFromStudyOrderCount: number;
    unmatchedTopicCodes: string[];
  };
}

export class SchedulingEngine {
  /**
   * Helper: Add calendar days to a YYYY-MM-DD string without timezone skew
   */
  public static addDays(dateStr: string, days: number): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Helper: Calculate integer calendar days remaining between fromDate and targetDate
   */
  public static calculateDaysRemaining(targetDateStr: string, fromDateStr?: string): number {
    const todayStr = fromDateStr || this.formatDate(new Date());
    const [y1, m1, d1] = todayStr.split('-').map(Number);
    const [y2, m2, d2] = targetDateStr.split('-').map(Number);
    
    // Use UTC date to get exact calendar day delta without timezone/DST offset
    const date1 = Date.UTC(y1, m1 - 1, d1);
    const date2 = Date.UTC(y2, m2 - 1, d2);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((date2 - date1) / msPerDay);
  }

  /**
   * Format JS Date to YYYY-MM-DD
   */
  public static formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Calculate 3 consecutive CPALE examination dates from Day 1
   */
  public static calculateExamDates(day1Str: string): { examDay1: string; examDay2: string; examDay3: string } {
    return {
      examDay1: day1Str,
      examDay2: this.addDays(day1Str, 1),
      examDay3: this.addDays(day1Str, 2),
    };
  }

  /**
   * Get weekday name (Monday..Sunday)
   */
  public static getWeekdayName(dateStr: string): 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const names: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ];
    return names[d.getDay()] as any;
  }

  /**
   * Check if date falls in [startDate, endDate] inclusive
   */
  public static isDateInRange(dateStr: string, startStr?: string, endStr?: string): boolean {
    if (!startStr || !endStr) return false;
    return dateStr >= startStr && dateStr <= endStr;
  }

  /**
   * Check if date falls in Month-end close range (weekdays only)
   */
  public static isMonthEndClose(dateStr: string, startDay?: number, endDay?: number): boolean {
    if (!startDay || !endDay) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) return false; // weekdays only
    return day >= startDay && day <= endDay;
  }

  /**
   * Generate schedule adhering to all 10 scheduling constraints
   */
  public static generateSchedule(params: {
    examPlan: ExamPlan;
    weeklySchedule: DayRoutine[];
    workPeriod: WorkPeriod;
    isWorking: boolean;
    restDays: RestDay[];
    topics: Topic[];
    existingSessions?: StudySession[];
    studyMaterials: Record<SubjectCode, { materialText: string }>;
    weeklyReviewTask: string;
    customStudyOrder?: RecommendedOrderItem[];
  }): ScheduleGenerationResult {
    const {
      examPlan,
      weeklySchedule,
      workPeriod,
      isWorking,
      restDays,
      topics,
      existingSessions = [],
      studyMaterials,
      weeklyReviewTask,
      customStudyOrder = DEFAULT_STUDY_ORDER,
    } = params;

    const warnings: string[] = [];

    // No imported topics → no tracker schedule. Never invent sessions from DEFAULT_STUDY_ORDER alone.
    if (!topics || topics.length === 0) {
      return {
        sessions: [],
        warnings: ['No topics imported yet. Import a syllabus file to generate a study schedule.'],
        capacity: {
          totalEligibleDays: 0,
          studySessionsCapacity: 0,
          topicsCount: 0,
          shortfall: 0,
          isFeasible: true,
        },
        validation: { missingFromStudyOrderCount: 0, unmatchedTopicCodes: [] },
      };
    }

    // Map existing completed sessions by date and topic to preserve historical records (Rule 1)
    const completedSessionsMap = new Map<string, StudySession>();
    for (const s of existingSessions) {
      if (s.status === 'Completed') {
        completedSessionsMap.set(`${s.date}_${s.topicCode || s.type}`, s);
      }
    }

    // Build rest day lookup
    const restDayMap = new Map<string, RestDay>();
    for (const r of restDays) {
      if (r.date) restDayMap.set(r.date, r);
    }

    // Exam dates calculation
    const { examDay1, examDay2, examDay3 } = this.calculateExamDates(examPlan.examDay1);
    const examDatesSet = new Set([examDay1, examDay2, examDay3]);

    // Validation for Recommended Mode (Sections 6 & 20)
    const topicsMap = new Map<string, Topic>();
    for (const t of topics) {
      topicsMap.set(t.code, t);
    }

    const unmatchedTopicCodes: string[] = [];
    const studyOrderCodesSet = new Set<string>();

    for (const item of customStudyOrder) {
      studyOrderCodesSet.add(item.code);
      if (!topicsMap.has(item.code)) {
        unmatchedTopicCodes.push(item.code);
      }
    }

    let missingFromStudyOrderCount = 0;
    for (const t of topics) {
      if (!t.archived && !studyOrderCodesSet.has(t.code)) {
        missingFromStudyOrderCount++;
      }
    }

    if (unmatchedTopicCodes.length > 0) {
      warnings.push(`⚠ ${unmatchedTopicCodes.length} code(s) in study order do not match any known topic: ${unmatchedTopicCodes.join(', ')}`);
    }
    if (missingFromStudyOrderCount > 0) {
      warnings.push(`⚠ ${missingFromStudyOrderCount} topic(s) not in Study Order. Switch to Automatic mode or add them to Study Order.`);
    }

    // Determine planning horizon
    const startDate = examPlan.studyStartDate;
    const targetFinish = examPlan.targetFinishDate;
    const examDayFinal = examDay3;

    // Build day routine lookup
    const routineMap = new Map<string, DayRoutine>();
    for (const r of weeklySchedule) {
      routineMap.set(r.dayOfWeek, r);
    }

    // Collect calendar days from studyStartDate to examDayFinal
    const totalDays = this.calculateDaysRemaining(examDayFinal, startDate) + 1;
    if (totalDays <= 0) {
      return {
        sessions: [],
        warnings: ['Study start date cannot be after examination day.'],
        capacity: { totalEligibleDays: 0, studySessionsCapacity: 0, topicsCount: topics.length, shortfall: topics.length, isFeasible: false },
        validation: { missingFromStudyOrderCount, unmatchedTopicCodes }
      };
    }

    // Build topics queue
    let topicsQueue: Array<{
      code: string;
      topic?: Topic;
      part: string;
      subject: SubjectCode;
      title: string;
      weight: string;
      items: number;
    }> = [];

    if (examPlan.topicOrderMode === 'Recommended') {
      // Only schedule codes that exist in the imported topic bank — never invent topics from the seed order file.
      for (const item of customStudyOrder) {
        const top = topicsMap.get(item.code);
        if (!top || top.archived) continue;
        topicsQueue.push({
          code: item.code,
          topic: top,
          part: item.part || '1/1',
          subject: (item.subject || top.subject || 'FAR') as SubjectCode,
          title: item.title || top.name || item.code,
          weight: top.difficulty || 'Medium',
          items: top.items || 0,
        });
      }
    } else {
      // Automatic Mode: distribute all uncompleted topics
      for (const t of topics) {
        if (t.archived) continue;
        const days = t.studyDays || 1;
        if (days === 2) {
          topicsQueue.push({
            code: t.code,
            topic: t,
            part: '1/2',
            subject: t.subject,
            title: t.name,
            weight: t.difficulty,
            items: t.items || 0,
          });
          topicsQueue.push({
            code: t.code,
            topic: t,
            part: '2/2',
            subject: t.subject,
            title: t.name,
            weight: t.difficulty,
            items: t.items || 0,
          });
        } else {
          topicsQueue.push({
            code: t.code,
            topic: t,
            part: '1/1',
            subject: t.subject,
            title: t.name,
            weight: t.difficulty,
            items: t.items || 0,
          });
        }
      }
    }

    const newSessions: StudySession[] = [];
    let queueIndex = 0;
    let studySlotsCapacity = 0;
    let eligibleStudyDaysCount = 0;

    let currentDate = startDate;
    while (currentDate <= examDayFinal) {
      const weekday = this.getWeekdayName(currentDate);
      const routine = routineMap.get(weekday) || { dayOfWeek: weekday, workSetup: 'Day off', studyPlan: '1 topic' };

      // Determine workload tags
      let workloadTag: StudySession['workloadTag'] = undefined;
      let plannedMinutes = 60;

      if (isWorking) {
        if (routine.workSetup === 'Onsite') {
          workloadTag = 'Onsite';
        }
        if (this.isDateInRange(currentDate, workPeriod.busySeasonStart, workPeriod.busySeasonEnd)) {
          workloadTag = 'Busy season · light study';
        }
        const isPeakWeek = 
          this.isDateInRange(currentDate, workPeriod.peakWeek1Start, workPeriod.peakWeek1End) ||
          this.isDateInRange(currentDate, workPeriod.peakWeek2Start, workPeriod.peakWeek2End);
        
        if (isPeakWeek) {
          workloadTag = 'Peak week (25m target)';
          plannedMinutes = workPeriod.peakWeekTargetMinutes || 25; // 25-minute target recommendation
        }
      }

      // 1. Check Examination Day (Rule 2)
      if (examDatesSet.has(currentDate)) {
        let examSubject = '';
        if (currentDate === examDay1) examSubject = examPlan.day1Subjects;
        else if (currentDate === examDay2) examSubject = examPlan.day2Subjects;
        else if (currentDate === examDay3) examSubject = examPlan.day3Subjects;

        newSessions.push({
          id: `sess_exam_${currentDate}`,
          date: currentDate,
          type: 'EXAM',
          plannedDuration: 300,
          actualDuration: 0,
          status: 'Not started',
          notes: `Official CPALE Exam Day: ${examSubject}`,
          workloadTag,
        });
        currentDate = this.addDays(currentDate, 1);
        continue;
      }

      // 2. Check Preboards (Rule 3)
      const is1stPreboard = this.isDateInRange(currentDate, examPlan.firstPreboardStart, examPlan.firstPreboardEnd);
      const isFinalPreboard = this.isDateInRange(currentDate, examPlan.finalPreboardStart, examPlan.finalPreboardEnd);

      if (is1stPreboard || isFinalPreboard) {
        newSessions.push({
          id: `sess_preboard_${currentDate}`,
          date: currentDate,
          type: 'PREBOARD',
          plannedDuration: 240,
          actualDuration: 0,
          status: 'Not started',
          notes: is1stPreboard ? '1st Preboard Examination' : 'Final Preboard Examination',
          workloadTag,
        });
        currentDate = this.addDays(currentDate, 1);
        continue;
      }

      // 3. Check Rest Days (Rule 4)
      if (restDayMap.has(currentDate)) {
        const rest = restDayMap.get(currentDate)!;
        newSessions.push({
          id: `sess_rest_${currentDate}`,
          date: currentDate,
          type: 'REST',
          plannedDuration: 0,
          actualDuration: 0,
          status: 'Not started',
          notes: `Rest Day: ${rest.name}`,
          workloadTag,
        });
        currentDate = this.addDays(currentDate, 1);
        continue;
      }

      // 4. Check Weekly Review Day (Rule 5)
      if (routine.studyPlan === 'Weekly review') {
        const completedKey = `${currentDate}_REVIEW`;
        const preserved = completedSessionsMap.get(completedKey);

        newSessions.push(preserved || {
          id: `sess_rev_${currentDate}`,
          date: currentDate,
          type: 'REVIEW',
          plannedDuration: 50,
          actualDuration: 0,
          status: 'Not started',
          notes: weeklyReviewTask,
          workloadTag,
        });
        currentDate = this.addDays(currentDate, 1);
        continue;
      }

      // 5. Rest Day from weekly routine
      if (routine.studyPlan === 'Rest day') {
        newSessions.push({
          id: `sess_sched_rest_${currentDate}`,
          date: currentDate,
          type: 'REST',
          plannedDuration: 0,
          actualDuration: 0,
          status: 'Not started',
          notes: 'Scheduled rest day',
          workloadTag,
        });
        currentDate = this.addDays(currentDate, 1);
        continue;
      }

      // 6. Eligible Study Day
      eligibleStudyDaysCount++;
      const slotsCount = routine.studyPlan === '3 topics' ? 3 : routine.studyPlan === '2 topics' ? 2 : 1;
      studySlotsCapacity += slotsCount;

      for (let s = 0; s < slotsCount; s++) {
        if (queueIndex < topicsQueue.length) {
          const item = topicsQueue[queueIndex];
          const completedKey = `${currentDate}_${item.code}`;
          const preserved = completedSessionsMap.get(completedKey);

          const matText = studyMaterials[item.subject]?.materialText || 'practice questions';

          if (preserved) {
            newSessions.push(preserved);
          } else {
            newSessions.push({
              id: `sess_${currentDate}_${item.code}_${item.part}_${s}`,
              date: currentDate,
              type: 'STUDY',
              subject: item.subject,
              topicId: item.topic?.id || item.code,
              topicCode: item.code,
              topicName: item.title,
              part: item.part,
              plannedDuration: plannedMinutes,
              actualDuration: 0,
              status: 'Not started',
              materials: `Study + ${matText}`,
              notes: item.topic?.tosArea ? `TOS Area: ${item.topic.tosArea}` : '',
              workloadTag,
            });
          }
          queueIndex++;
        } else if (topicsQueue.length > 0) {
          // Extra days after covering an imported syllabus become Mastery / Revision days (Rule 8).
          // Never invent mastery filler when the topic queue was empty (no curriculum imported).
          newSessions.push({
            id: `sess_mastery_${currentDate}_${s}`,
            date: currentDate,
            type: 'MASTERY',
            plannedDuration: plannedMinutes,
            actualDuration: 0,
            status: 'Not started',
            notes: 'Mastery day · Weak topics revision & practice sets',
            workloadTag,
          });
        }
      }

      currentDate = this.addDays(currentDate, 1);
    }

    // Ensure ALL completed sessions from existing history are strictly preserved
    const sessionIds = new Set(newSessions.map(s => s.id));
    for (const s of existingSessions) {
      if (s.status === 'Completed' && !sessionIds.has(s.id)) {
        newSessions.push(s);
        sessionIds.add(s.id);
      }
    }
    newSessions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    // Capacity & feasibility calculation
    const totalRemainingTopics = topicsQueue.length;
    const shortfall = Math.max(0, totalRemainingTopics - studySlotsCapacity);
    const isFeasible = shortfall === 0;

    if (!isFeasible) {
      warnings.push(`⚠ Study capacity shortfall: ${shortfall} topics cannot fit before the exam date. Consider increasing topics per day (e.g. 2 topics on weekends) or extending the study target.`);
    }

    return {
      sessions: newSessions,
      warnings,
      capacity: {
        totalEligibleDays: eligibleStudyDaysCount,
        studySessionsCapacity: studySlotsCapacity,
        topicsCount: totalRemainingTopics,
        shortfall,
        isFeasible,
      },
      validation: {
        missingFromStudyOrderCount,
        unmatchedTopicCodes,
      }
    };
  }
}
