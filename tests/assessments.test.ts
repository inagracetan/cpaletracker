import { describe, it, expect } from 'vitest';
import { AssessmentService } from '../src/services/assessments/assessmentService';
import { AssessmentRecord, AssessmentTopicItem } from '../src/types';

describe('AssessmentService', () => {
  describe('calculateProgress', () => {
    it('handles zero topics gracefully without NaN or division by zero', () => {
      const emptyAssessment: AssessmentRecord = {
        id: 'test-zero',
        title: 'Empty Assessment',
        type: 'monthly',
        topics: [],
      };

      const progress = AssessmentService.calculateProgress(emptyAssessment);
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.remaining).toBe(0);
      expect(progress.percentage).toBe(0);
      expect(progress.completed + progress.remaining).toBe(progress.total);
    });

    it('calculates 0% completion when all topics are incomplete', () => {
      const assessment: AssessmentRecord = {
        id: 'test-incomplete',
        title: 'Incomplete Assessment',
        type: 'monthly',
        topics: [
          { id: 't1', topicCode: 'FAR-01', name: 'Topic 1', subject: 'FAR', isCompleted: false },
          { id: 't2', topicCode: 'FAR-02', name: 'Topic 2', subject: 'FAR', isCompleted: false },
          { id: 't3', topicCode: 'FAR-03', name: 'Topic 3', subject: 'FAR', isCompleted: false },
        ],
      };

      const progress = AssessmentService.calculateProgress(assessment);
      expect(progress.total).toBe(3);
      expect(progress.completed).toBe(0);
      expect(progress.remaining).toBe(3);
      expect(progress.percentage).toBe(0);
      expect(progress.completed + progress.remaining).toBe(progress.total);
    });

    it('calculates partial completion percentage rounded to 2 decimal places with strict reconciliation', () => {
      const assessment: AssessmentRecord = {
        id: 'test-partial',
        title: 'Partial Assessment',
        type: 'first_preboard',
        topics: [
          { id: 't1', topicCode: 'FAR-01', name: 'Topic 1', subject: 'FAR', isCompleted: true },
          { id: 't2', topicCode: 'FAR-02', name: 'Topic 2', subject: 'FAR', isCompleted: false },
          { id: 't3', topicCode: 'FAR-03', name: 'Topic 3', subject: 'FAR', isCompleted: false },
        ],
      };

      const progress = AssessmentService.calculateProgress(assessment);
      expect(progress.total).toBe(3);
      expect(progress.completed).toBe(1);
      expect(progress.remaining).toBe(2);
      // (1 / 3) * 100 = 33.33333... rounded to 2 decimal places = 33.33
      expect(progress.percentage).toBe(33.33);
      expect(progress.completed + progress.remaining).toBe(progress.total);
    });

    it('calculates 100% completion when all topics are completed', () => {
      const assessment: AssessmentRecord = {
        id: 'test-full',
        title: 'Full Assessment',
        type: 'final_preboard',
        topics: [
          { id: 't1', topicCode: 'FAR-01', name: 'Topic 1', subject: 'FAR', isCompleted: true },
          { id: 't2', topicCode: 'AFAR-01', name: 'Topic 2', subject: 'AFAR', isCompleted: true },
          { id: 't3', topicCode: 'MS-01', name: 'Topic 3', subject: 'MS', isCompleted: true },
          { id: 't4', topicCode: 'TAX-01', name: 'Topic 4', subject: 'TAX', isCompleted: true },
        ],
      };

      const progress = AssessmentService.calculateProgress(assessment);
      expect(progress.total).toBe(4);
      expect(progress.completed).toBe(4);
      expect(progress.remaining).toBe(0);
      expect(progress.percentage).toBe(100);
      expect(progress.completed + progress.remaining).toBe(progress.total);
    });

    it('prevents duplicate topics from inflating count', () => {
      const assessment: AssessmentRecord = {
        id: 'test-duplicates',
        title: 'Duplicate Assessment',
        type: 'monthly',
        topics: [
          { id: 't1', topicCode: 'FAR-01', name: 'Intro', subject: 'FAR', isCompleted: true },
          { id: 't1', topicCode: 'FAR-01', name: 'Intro', subject: 'FAR', isCompleted: true }, // exact duplicate
          { id: 't2', topicCode: 'FAR-02', name: 'PFRS', subject: 'FAR', isCompleted: false },
        ],
      };

      const progress = AssessmentService.calculateProgress(assessment);
      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(1);
      expect(progress.remaining).toBe(1);
      expect(progress.percentage).toBe(50);
      expect(progress.completed + progress.remaining).toBe(progress.total);
    });
  });

  describe('calculateSubjectListProgress', () => {
    it('returns progress breakdown for all six CPALE subjects', () => {
      const topics: AssessmentTopicItem[] = [
        { id: '1', topicCode: 'FAR-01', name: 'FAR 1', subject: 'FAR', isCompleted: true },
        { id: '2', topicCode: 'FAR-02', name: 'FAR 2', subject: 'FAR', isCompleted: false },
        { id: '3', topicCode: 'AFAR-01', name: 'AFAR 1', subject: 'AFAR', isCompleted: true },
        { id: '4', topicCode: 'MS-01', name: 'MS 1', subject: 'MS', isCompleted: true },
        { id: '5', topicCode: 'TAX-01', name: 'TAX 1', subject: 'TAX', isCompleted: false },
        { id: '6', topicCode: 'AUD-01', name: 'AUD 1', subject: 'AUD', isCompleted: true },
        { id: '7', topicCode: 'RFBT-01', name: 'RFBT 1', subject: 'RFBT', isCompleted: false },
      ];

      const breakdown = AssessmentService.calculateSubjectListProgress(topics);
      expect(breakdown.length).toBe(6);

      const far = breakdown.find(b => b.subject === 'FAR')!;
      expect(far.total).toBe(2);
      expect(far.completed).toBe(1);
      expect(far.percentage).toBe(50);

      const afar = breakdown.find(b => b.subject === 'AFAR')!;
      expect(afar.total).toBe(1);
      expect(afar.completed).toBe(1);
      expect(afar.percentage).toBe(100);

      // Verify overall sum reconciliation
      const totalSum = breakdown.reduce((acc, b) => acc + b.total, 0);
      const completedSum = breakdown.reduce((acc, b) => acc + b.completed, 0);
      expect(totalSum).toBe(7);
      expect(completedSum).toBe(4);
    });
  });

  describe('getNextUpcomingAssessment & getDaysRemaining', () => {
    it('identifies the next upcoming assessment based on date', () => {
      const assessments: AssessmentRecord[] = [
        { id: 'past', title: 'Past Exam', type: 'monthly', date: '2026-08-01', topics: [] },
        { id: 'next', title: 'Next Upcoming Exam', type: 'monthly', date: '2026-11-20', topics: [] },
        { id: 'future', title: 'Future Preboard', type: 'first_preboard', date: '2027-02-27', topics: [] },
      ];

      // With reference date 2026-10-25
      const upcoming = AssessmentService.getNextUpcomingAssessment(assessments, '2026-10-25');
      expect(upcoming).toBeDefined();
      expect(upcoming?.id).toBe('next');
      expect(upcoming?.title).toBe('Next Upcoming Exam');

      const days = AssessmentService.getDaysRemaining('2026-11-20', '2026-10-25');
      expect(days).toBe(26);
    });

    it('returns undefined if no assessments have scheduled dates in the future', () => {
      const assessments: AssessmentRecord[] = [
        { id: 'past', title: 'Past Exam', type: 'monthly', date: '2026-05-01', topics: [] },
        { id: 'no-date', title: 'Undated Exam', type: 'monthly', topics: [] },
      ];

      const upcoming = AssessmentService.getNextUpcomingAssessment(assessments, '2026-10-25');
      expect(upcoming).toBeNull();
    });
  });

  describe('Coverage independence', () => {
    it('marking a topic done in one assessment leaves other assessments independent', () => {
      const assessment1: AssessmentRecord = {
        id: 'ma-1',
        title: 'Monthly Assessment 1',
        type: 'monthly',
        topics: [
          { id: 'ma1-t1', topicCode: 'FAR-01', name: 'Intro', subject: 'FAR', isCompleted: true },
        ],
      };

      const assessment2: AssessmentRecord = {
        id: 'fpb-1',
        title: 'First Preboard',
        type: 'first_preboard',
        topics: [
          { id: 'fpb1-t1', topicCode: 'FAR-01', name: 'Intro', subject: 'FAR', isCompleted: false },
        ],
      };

      const p1 = AssessmentService.calculateProgress(assessment1);
      const p2 = AssessmentService.calculateProgress(assessment2);

      expect(p1.completed).toBe(1);
      expect(p1.percentage).toBe(100);

      expect(p2.completed).toBe(0);
      expect(p2.percentage).toBe(0);
    });
  });
});
