import { AssessmentRecord, AssessmentTopicItem, SubjectCode, SubjectCodes } from '../../types';

export interface SubjectAssessmentProgress {
  subject: SubjectCode;
  total: number;
  completed: number;
  remaining: number;
  percent: number; // 0 to 100, full precision
  percentage: number; // alias for percent
  formattedPercent: string; // e.g. "45.8%" or "0%"
}

export interface AssessmentProgress {
  assessmentId: string;
  title: string;
  total: number;
  completed: number;
  remaining: number;
  percent: number; // 0 to 100, full precision internally
  percentage: number; // alias for percent
  formattedPercent: string; // rounded to max 2 decimals e.g. "52.5%" or "100%"
  bySubject: Record<SubjectCode, SubjectAssessmentProgress>;
}

export class AssessmentService {
  /**
   * Calculate progress metrics with exact mathematical precision, zero-denominator safety,
   * deduplication, and completed + remaining = total reconciliation.
   */
  public static calculateProgress(assessment?: AssessmentRecord | null): AssessmentProgress {
    if (!assessment || !Array.isArray(assessment.topics)) {
      return this.getEmptyProgress(assessment?.id || '', assessment?.title || 'No data');
    }

    // Filter valid topics and prevent duplicate codes from inflating totals
    const seenCodes = new Set<string>();
    const validTopics: AssessmentTopicItem[] = [];

    for (const topic of assessment.topics) {
      if (!topic || !topic.name) continue;
      const key = `${topic.subject}-${topic.topicCode || topic.name}`.toLowerCase().trim();
      if (!seenCodes.has(key)) {
        seenCodes.add(key);
        validTopics.push(topic);
      }
    }

    const total = validTopics.length;
    const completed = validTopics.filter(t => t.isCompleted).length;
    const remaining = Math.max(0, total - completed);

    // Calculate percentage at full precision, guarded against zero division
    const rawPercent = total > 0 ? (completed / total) * 100 : 0;
    const boundedPercent = Math.min(100, Math.max(0, rawPercent));
    const percentRounded = Number(boundedPercent.toFixed(2));
    const formattedPercent = total > 0 ? `${percentRounded}%` : '0%';

    // Subject level calculations
    const bySubject = {} as Record<SubjectCode, SubjectAssessmentProgress>;
    for (const subj of SubjectCodes) {
      const subjTopics = validTopics.filter(t => t.subject === subj);
      bySubject[subj] = this.calculateSubjectListProgress(subjTopics, subj) as SubjectAssessmentProgress;
    }

    return {
      assessmentId: assessment.id,
      title: assessment.title,
      total,
      completed,
      remaining,
      percent: percentRounded,
      percentage: percentRounded,
      formattedPercent,
      bySubject,
    };
  }

  /**
   * Calculate progress for a single subject or all six subjects
   */
  public static calculateSubjectListProgress(topics: AssessmentTopicItem[], subject: SubjectCode): SubjectAssessmentProgress;
  public static calculateSubjectListProgress(topics: AssessmentTopicItem[]): SubjectAssessmentProgress[];
  public static calculateSubjectListProgress(topics: AssessmentTopicItem[], subject?: SubjectCode): SubjectAssessmentProgress | SubjectAssessmentProgress[] {
    if (!subject) {
      return SubjectCodes.map(s => {
        const subjTopics = topics.filter(t => t.subject === s);
        return this.calculateSubjectListProgress(subjTopics, s) as SubjectAssessmentProgress;
      });
    }

    const total = topics.length;
    const completed = topics.filter(t => t.isCompleted).length;
    const remaining = Math.max(0, total - completed);
    const rawPercent = total > 0 ? (completed / total) * 100 : 0;
    const boundedPercent = Math.min(100, Math.max(0, rawPercent));
    const percentRounded = Number(boundedPercent.toFixed(2));
    const formattedPercent = total > 0 ? `${percentRounded}%` : '0%';

    return {
      subject,
      total,
      completed,
      remaining,
      percent: percentRounded,
      percentage: percentRounded,
      formattedPercent,
    };
  }

  /**
   * Find the next upcoming assessment or preboard based on actual date.
   * If no upcoming date or no assessments, returns null (no invented dates).
   */
  public static getNextUpcomingAssessment(
    assessments?: AssessmentRecord[] | null,
    referenceDateStr?: string
  ): AssessmentRecord | null {
    if (!assessments || !Array.isArray(assessments) || assessments.length === 0) {
      return null;
    }

    const today = referenceDateStr || new Date().toISOString().split('T')[0];

    // Filter assessments with dates that are today or in the future
    const upcomingWithDates = assessments
      .filter(a => a.date && /^\d{4}-\d{2}-\d{2}$/.test(a.date) && a.date >= today)
      .sort((a, b) => (a.date! > b.date! ? 1 : -1));

    if (upcomingWithDates.length > 0) {
      return upcomingWithDates[0];
    }

    return null;
  }

  /**
   * Calculate days remaining between today and assessment date
   */
  public static getDaysRemaining(targetDateStr?: string, referenceDateStr?: string): number | null {
    if (!targetDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) return null;
    
    const today = referenceDateStr ? new Date(`${referenceDateStr}T00:00:00Z`) : new Date();
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    const parts = targetDateStr.split('-').map(Number);
    const targetUTC = Date.UTC(parts[0], parts[1] - 1, parts[2]);

    const diffMs = targetUTC - todayUTC;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  private static getEmptyProgress(id: string, title: string): AssessmentProgress {
    const bySubject = {} as Record<SubjectCode, SubjectAssessmentProgress>;
    for (const subj of SubjectCodes) {
      bySubject[subj] = {
        subject: subj,
        total: 0,
        completed: 0,
        remaining: 0,
        percent: 0,
        percentage: 0,
        formattedPercent: '0%',
      };
    }

    return {
      assessmentId: id,
      title,
      total: 0,
      completed: 0,
      remaining: 0,
      percent: 0,
      percentage: 0,
      formattedPercent: '0%',
      bySubject,
    };
  }
}
