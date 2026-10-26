import { StudySession, Deadline } from '../../types';

export class ICSService {
  public static generateICS(params: {
    sessions: StudySession[];
    deadlines: Deadline[];
    userNickname?: string;
  }): string {
    const { sessions, deadlines, userNickname = 'Future CPA' } = params;
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const events: string[] = [];

    // Study sessions
    for (const s of sessions) {
      if (s.type === 'REST') continue;
      const dateClean = s.date.replace(/-/g, '');
      const summary = s.type === 'EXAM' 
        ? `[CPALE EXAM] ${s.notes || 'Board Exam'}`
        : s.type === 'PREBOARD'
        ? `[PREBOARD] ${s.notes}`
        : s.type === 'REVIEW'
        ? `[REVIEW] CPALE Weekly Review`
        : `[STUDY] ${s.subject ? s.subject + ': ' : ''}${s.topicName || s.topicCode}`;

      const desc = `Target duration: ${s.plannedDuration} min. ${s.notes || ''} ${s.materials ? 'Materials: ' + s.materials : ''}`;

      events.push([
        'BEGIN:VEVENT',
        `UID:session-${s.id}@cpaletracker.app`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dateClean}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc.replace(/\n/g, '\\n')}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ].join('\r\n'));
    }

    // Deadlines
    for (const d of deadlines) {
      const dateClean = d.dueDate.replace(/-/g, '');
      events.push([
        'BEGIN:VEVENT',
        `UID:deadline-${d.id}@cpaletracker.app`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dateClean}`,
        `SUMMARY:[DEADLINE] ${d.title}`,
        `DESCRIPTION:${(d.notes || '').replace(/\n/g, '\\n')}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ].join('\r\n'));
    }

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CPALE Tracker Future CPA//EN',
      'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:CPALE Tracker (${userNickname})`,
      ...events,
      'END:VCALENDAR'
    ].join('\r\n');
  }
}
