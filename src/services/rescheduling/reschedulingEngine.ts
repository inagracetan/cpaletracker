import { StudySession, Topic, ExamPlan, DayRoutine, RestDay, WorkPeriod, SubjectCode } from '../../types';
import { SchedulingEngine } from '../scheduler/schedulingEngine';

export interface ReschedulePreview {
  missedSessionId: string;
  topicCode?: string;
  topicTitle?: string;
  originalDate: string;
  proposedDate: string;
  affectedDaysCount: number;
  newCompletionDate?: string;
  previousSessionsSnapshot: StudySession[];
}

export class ReschedulingEngine {
  /**
   * Propose a reschedule preview for a missed session
   */
  public static previewRescheduleMissedSession(params: {
    sessions: StudySession[];
    missedSessionId: string;
    examPlan: ExamPlan;
  }): ReschedulePreview | null {
    const { sessions, missedSessionId } = params;
    const missedIndex = sessions.findIndex(s => s.id === missedSessionId);
    if (missedIndex === -1) return null;

    const missed = sessions[missedIndex];
    if (missed.type !== 'STUDY' || !missed.topicCode) return null;

    // Find the next available study slot or mastery slot on or after tomorrow
    const nextSlotIndex = sessions.findIndex((s, idx) => {
      return idx > missedIndex && (s.type === 'MASTERY' || (s.type === 'STUDY' && s.status === 'Not started'));
    });

    const proposedDate = nextSlotIndex !== -1 ? sessions[nextSlotIndex].date : SchedulingEngine.addDays(missed.date, 1);

    return {
      missedSessionId: missed.id,
      topicCode: missed.topicCode,
      topicTitle: missed.topicName,
      originalDate: missed.date,
      proposedDate,
      affectedDaysCount: 1,
      newCompletionDate: sessions[sessions.length - 1]?.date,
      previousSessionsSnapshot: JSON.parse(JSON.stringify(sessions)),
    };
  }

  /**
   * Apply rescheduling:
   * 1. Keeps original session in history marked as 'Missed' (never erased).
   * 2. Inserts a catch-up study session at the earliest available slot.
   * 3. Preserves all completed sessions.
   */
  public static applyRescheduleMissedSession(params: {
    sessions: StudySession[];
    missedSessionId: string;
    newTargetDate?: string;
    plannedDuration?: number;
  }): { updatedSessions: StudySession[]; previousSnapshot: StudySession[] } {
    const { sessions, missedSessionId, newTargetDate, plannedDuration } = params;
    const snapshot = JSON.parse(JSON.stringify(sessions));
    const updated = sessions.map(s => {
      if (s.id === missedSessionId) {
        return {
          ...s,
          status: 'Missed' as const,
          notes: `${s.notes ? s.notes + ' · ' : ''}Session missed; rescheduled.`,
        };
      }
      return { ...s };
    });

    const missed = sessions.find(s => s.id === missedSessionId);
    if (!missed || !missed.topicCode) {
      return { updatedSessions: updated, previousSnapshot: snapshot };
    }

    // Determine target slot
    const targetDate = newTargetDate || SchedulingEngine.addDays(missed.date, 1);
    const duration = plannedDuration && plannedDuration > 0
      ? plannedDuration
      : (missed.plannedDuration || 60);

    // Look for a MASTERY session to replace, or append new catch-up session
    const masteryIdx = updated.findIndex(s => s.date >= targetDate && s.type === 'MASTERY');
    if (masteryIdx !== -1) {
      updated[masteryIdx] = {
        ...updated[masteryIdx],
        type: 'STUDY',
        subject: missed.subject,
        topicId: missed.topicId,
        topicCode: missed.topicCode,
        topicName: missed.topicName,
        part: missed.part,
        plannedDuration: duration,
        actualDuration: 0,
        status: 'Not started',
        materials: missed.materials,
        notes: `[Catch-up] Rescheduled from ${missed.date}`,
      };
    } else {
      // Insert catch-up session
      const newSession: StudySession = {
        id: `sess_catchup_${targetDate}_${missed.topicCode}`,
        date: targetDate,
        type: 'STUDY',
        subject: missed.subject,
        topicId: missed.topicId,
        topicCode: missed.topicCode,
        topicName: missed.topicName,
        part: missed.part,
        plannedDuration: duration,
        actualDuration: 0,
        status: 'Not started',
        materials: missed.materials,
        notes: `[Catch-up] Rescheduled from ${missed.date}`,
      };
      updated.push(newSession);
      updated.sort((a, b) => a.date.localeCompare(b.date));
    }

    return {
      updatedSessions: updated,
      previousSnapshot: snapshot,
    };
  }

  /**
   * Undo a recent reschedule using previous snapshot
   */
  public static undoReschedule(previousSnapshot: StudySession[]): StudySession[] {
    return JSON.parse(JSON.stringify(previousSnapshot));
  }
}
