import { 
  UserProfile, 
  ExamPlan, 
  DayRoutine, 
  WorkPeriod, 
  RestDay, 
  StudyMaterial, 
  Deadline, 
  Topic, 
  StudySession,
  SubjectCode, 
  AppStateData,
  AssessmentRecord 
} from '../../types';
import { SchedulingEngine } from '../scheduler/schedulingEngine';

export interface SetupCSVParseResult {
  userProfile?: Partial<UserProfile>;
  examPlan?: Partial<ExamPlan>;
  weeklySchedule?: DayRoutine[];
  workPeriod?: Partial<WorkPeriod>;
  restDays?: RestDay[];
  materials?: Partial<Record<SubjectCode, StudyMaterial>>;
  weeklyReviewTask?: string;
  deadlines?: Deadline[];
  warnings: string[];
  rawSummary: string;
}

export class CSVService {
  /**
   * Parse a date string like "Aug 24, 2026", "May 23, 2027", "2026-08-24" into "YYYY-MM-DD"
   */
  public static parseDateString(dateStr: string): string | null {
    if (!dateStr || !dateStr.trim()) return null;
    const clean = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    // Handle Excel serial date numbers (e.g. 46258)
    const num = Number(clean);
    if (!isNaN(num) && num > 30000 && num < 70000) {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  /**
   * Split a CSV text into rows and columns, correctly handling quoted commas and quotes
   */
  public static parseCSVRows(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
    }

    return rows;
  }

  /**
   * Parse the Setup CSV: `CPALE Tracker (MAY 2027 CPA) - Setup.csv`
   */
  public static parseSetupCSV(csvText: string): SetupCSVParseResult {
    const rows = this.parseCSVRows(csvText);
    const warnings: string[] = [];

    const userProfile: Partial<UserProfile> = {};
    const examPlan: Partial<ExamPlan> = {};
    const weeklySchedule: DayRoutine[] = [];
    const workPeriod: Partial<WorkPeriod> = { peakWeekTargetMinutes: 25 };
    const restDays: RestDay[] = [];
    const materials: Partial<Record<SubjectCode, StudyMaterial>> = {};
    const deadlines: Deadline[] = [];
    let weeklyReviewTask: string | undefined;

    let currentSection = '';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;

      const rowText = row.join(' ').toLowerCase();

      // Check section headers
      if (rowText.includes('1 · about you') || rowText.includes('about you')) {
        currentSection = 'about_you';
        continue;
      } else if (rowText.includes('2 · exam & plan dates') || rowText.includes('exam & plan dates')) {
        currentSection = 'exam_dates';
        continue;
      } else if (rowText.includes('3 · your week') || rowText.includes('your week')) {
        currentSection = 'your_week';
        continue;
      } else if (rowText.includes('4 · busy times at work') || rowText.includes('busy times')) {
        currentSection = 'busy_times';
        continue;
      } else if (rowText.includes('5 · rest days') || rowText.includes('rest days')) {
        currentSection = 'rest_days';
        continue;
      } else if (rowText.includes('6 · your materials') || rowText.includes('your materials')) {
        currentSection = 'materials';
        continue;
      } else if (rowText.includes('7 · key dates & deadlines') || rowText.includes('key dates')) {
        currentSection = 'deadlines';
        continue;
      }

      // Process section rows
      // Handle both 0-indexed rows (from XLSX) and indented rows (from CSV with empty col A)
      const normalizedRow = (row[0] === '' || row[0] === undefined) && row.length > 1
        ? row.slice(1)
        : row;
      const col1 = (normalizedRow[0] || '').trim();
      const col2 = (normalizedRow[1] !== undefined ? normalizedRow[1] : '').trim();
      const col3 = (normalizedRow[2] !== undefined ? normalizedRow[2] : '').trim();
      const col4 = (normalizedRow[3] !== undefined ? normalizedRow[3] : '').trim();

      if (currentSection === 'about_you') {
        if (col1.toLowerCase().includes('full name')) {
          userProfile.fullName = col2;
        } else if (col1.toLowerCase().includes('nickname')) {
          userProfile.nickname = col2 || 'Future CPA';
        } else if (col1.toLowerCase().includes('taker type')) {
          userProfile.takerType = col2.toLowerCase().includes('repeater') ? 'Repeater' : 'First-timer';
        } else if (col1.toLowerCase().includes('working while reviewing')) {
          userProfile.isWorking = col2.toLowerCase().startsWith('y');
        }
      } else if (currentSection === 'exam_dates') {
        if (col1.toLowerCase().includes('study start date')) {
          const d = this.parseDateString(col2);
          if (d) examPlan.studyStartDate = d;
        } else if (col1.toLowerCase().includes('cpale day 1')) {
          const d = this.parseDateString(col2);
          if (d) {
            examPlan.examDay1 = d;
            const calculated = SchedulingEngine.calculateExamDates(d);
            examPlan.examDay2 = calculated.examDay2;
            examPlan.examDay3 = calculated.examDay3;
          }
        } else if (col1.toLowerCase().includes('day 1 subjects')) {
          examPlan.day1Subjects = col2 || 'MS & AUD';
        } else if (col1.toLowerCase().includes('day 2 subjects')) {
          examPlan.day2Subjects = col2 || 'TAX & RFBT';
        } else if (col1.toLowerCase().includes('day 3 subjects')) {
          examPlan.day3Subjects = col2 || 'FAR & AFAR';
        } else if (col1.toLowerCase().includes('finish all topics by')) {
          const d = this.parseDateString(col2);
          if (d) examPlan.targetFinishDate = d;
        } else if (col1.toLowerCase().includes('1st preboard')) {
          const d1 = this.parseDateString(col2);
          const d2 = this.parseDateString(col3);
          if (d1) examPlan.firstPreboardStart = d1;
          if (d2) examPlan.firstPreboardEnd = d2;
        } else if (col1.toLowerCase().includes('final preboard')) {
          const d1 = this.parseDateString(col2);
          const d2 = this.parseDateString(col3);
          if (d1) examPlan.finalPreboardStart = d1;
          if (d2) examPlan.finalPreboardEnd = d2;
        } else if (col1.toLowerCase().includes('topic order')) {
          examPlan.topicOrderMode = col2.toLowerCase().includes('auto') ? 'Automatic' : 'Recommended';
        }
      } else if (currentSection === 'your_week') {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayMatch = days.find(d => col1.toLowerCase().startsWith(d));
        if (dayMatch) {
          const capitalized = (dayMatch.charAt(0).toUpperCase() + dayMatch.slice(1)) as DayRoutine['dayOfWeek'];
          weeklySchedule.push({
            dayOfWeek: capitalized,
            workSetup: (col2 as any) || 'Day off',
            studyPlan: (col3 as any) || (capitalized === 'Sunday' ? 'Weekly review' : '1 topic'),
          });
        }
      } else if (currentSection === 'busy_times') {
        if (col1.toLowerCase().includes('month-end close')) {
          const parts = col2.split(/[–\-to]/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
          if (parts.length >= 2) {
            workPeriod.monthEndCloseStartDay = parts[0];
            workPeriod.monthEndCloseEndDay = parts[1];
          }
        } else if (col1.toLowerCase().includes('busy season')) {
          const d1 = this.parseDateString(col2);
          const d2 = this.parseDateString(col3);
          if (d1) workPeriod.busySeasonStart = d1;
          if (d2) workPeriod.busySeasonEnd = d2;
        } else if (col1.toLowerCase().includes('peak week 1')) {
          const d1 = this.parseDateString(col2);
          const d2 = this.parseDateString(col3);
          if (d1) workPeriod.peakWeek1Start = d1;
          if (d2) workPeriod.peakWeek1End = d2;
        } else if (col1.toLowerCase().includes('peak week 2')) {
          const d1 = this.parseDateString(col2);
          const d2 = this.parseDateString(col3);
          if (d1) workPeriod.peakWeek2Start = d1;
          if (d2) workPeriod.peakWeek2End = d2;
        }
      } else if (currentSection === 'rest_days') {
        if (col1.toLowerCase().startsWith('rest day')) {
          const d = this.parseDateString(col2);
          if (d) {
            restDays.push({
              id: `rest_${d}`,
              date: d,
              name: col3 || 'Rest Day',
              notes: col4 || '',
            });
          }
        }
      } else if (currentSection === 'materials') {
        const subjects: SubjectCode[] = ['FAR', 'AFAR', 'MS', 'TAX', 'AUD', 'RFBT'];
        const matchedSub = subjects.find(s => s === col1.toUpperCase());
        if (matchedSub) {
          materials[matchedSub] = {
            subject: matchedSub,
            materialText: col2 || 'practice questions',
            notes: col4 || '',
          };
        } else if (col1.toLowerCase().includes('review day task')) {
          weeklyReviewTask = col2;
        }
      } else if (currentSection === 'deadlines') {
        if (col1.toLowerCase().startsWith('date')) {
          const parsedDate = this.parseDateString(col2);
          const what = col3;
          const note = col4 || '';

          if (parsedDate && what) {
            let cat: Deadline['category'] = 'Registration and filing';
            const lowerWhat = what.toLowerCase();
            if (lowerWhat.includes('cpale day') || lowerWhat.includes('exam')) {
              cat = 'Examination dates';
            } else if (lowerWhat.includes('nbi') || lowerWhat.includes('admission') || lowerWhat.includes('requirements')) {
              cat = 'Required documents';
            } else if (lowerWhat.includes('result')) {
              cat = 'Results and follow-up';
            }

            let status: Deadline['verificationStatus'] = 'Estimated';
            if (note.includes('(target)')) status = 'User-target';
            else if (note.includes('(est.)')) status = 'Estimated';
            if (col1.toLowerCase().includes('auto')) status = 'Auto-calculated';

            deadlines.push({
              id: `csv_dl_${parsedDate}_${deadlines.length + 1}`,
              title: what,
              dueDate: parsedDate,
              category: cat,
              verificationStatus: status,
              isCompleted: false,
              notes: note,
              reminderDays: [7, 3, 1, 0],
            });
          }
        }
      }
    }

    const summary = `Imported: Nickname "${userProfile.nickname || 'Future CPA'}", Exam Day 1: ${examPlan.examDay1 || 'none'}, ${weeklySchedule.length} weekday routines, ${restDays.length} rest days, ${deadlines.length} deadlines.`;

    return {
      userProfile,
      examPlan,
      weeklySchedule: weeklySchedule.length > 0 ? weeklySchedule : undefined,
      workPeriod,
      restDays: restDays.length > 0 ? restDays : undefined,
      materials: Object.keys(materials).length > 0 ? materials : undefined,
      weeklyReviewTask,
      deadlines: deadlines.length > 0 ? deadlines : undefined,
      warnings,
      rawSummary: summary,
    };
  }

  /**
   * Export topics to CSV string
   */
  public static exportTopicsToCSV(topics: Topic[]): string {
    const headers = ['Subject', 'Code', 'Topic Name', 'Difficulty', 'Estimated Minutes', 'TOS Area', 'Items', 'Study Days', 'Status', 'Confidence'];
    const rows = topics.map(t => [
      t.subject,
      `"${t.code}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      t.difficulty,
      t.estimatedDuration,
      `"${(t.tosArea || '').replace(/"/g, '""')}"`,
      t.items || 0,
      t.studyDays || 1,
      t.status,
      t.confidence || 3,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Export study sessions to CSV
   */
  public static exportStudySessionsToCSV(sessions: StudySession[]): string {
    const headers = ['Date', 'Type', 'Subject', 'Topic Code', 'Topic Name', 'Status', 'Planned Min', 'Actual Min', 'Workload Tag', 'Notes'];
    const rows = sessions.map(s => [
      s.date,
      s.type,
      s.subject || '',
      `"${s.topicCode || ''}"`,
      `"${(s.topicName || '').replace(/"/g, '""')}"`,
      s.status,
      s.plannedDuration,
      s.actualDuration,
      `"${s.workloadTag || ''}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Export deadlines to CSV
   */
  public static exportDeadlinesToCSV(deadlines: Deadline[]): string {
    const headers = ['Due Date', 'Title', 'Category', 'Status', 'Completed', 'Notes'];
    const rows = deadlines.map(d => [
      d.dueDate,
      `"${d.title.replace(/"/g, '""')}"`,
      d.category,
      d.verificationStatus,
      d.isCompleted ? 'Yes' : 'No',
      `"${(d.notes || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Export assessments / preboards to CSV
   */
  public static exportAssessmentsToCSV(assessments: AssessmentRecord[]): string {
    const headers = ['Assessment Title', 'Type', 'Date', 'Topics Covered', 'Topics Total', 'Coverage %', 'Notes'];
    const rows = assessments.map(a => {
      const completedTopics = a.topics ? a.topics.filter(t => t.isCompleted).length : 0;
      const totalTopics = a.topics ? a.topics.length : 0;
      const coveragePct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
      return [
        `"${(a.title || '').replace(/"/g, '""')}"`,
        a.type || '',
        a.date || '',
        completedTopics,
        totalTopics,
        `${coveragePct}%`,
        `"${(a.notes || '').replace(/"/g, '""')}"`,
      ];
    });
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Generate a downloadable topic import template CSV
   */
  public static generateTopicTemplateCSV(): string {
    return [
      'Subject,Code,Topic Name,Difficulty,Estimated Minutes,TOS Area,Items,Study Days',
      'FAR,FAR-01,Introduction to Accountancy Profession,Heavy,60,Non-financial Liabilities & Provisions,4,1',
      'AFAR,AFAR-01,Partnership Accounting,Heavy,60,Partnership Formation & Operations,10,1',
      'MS,MS-01,Basic Considerations in MAS,Medium,60,Management Advisory Services,4.8,1',
      'TAX,TAX-01,General Principles,Heavy,60,Principles of Taxation,4,1',
      'AUD,AUD-01,Practice and Regulation,Light,60,Code of Professional Conduct,1,1',
      'RFBT,RFBT-01,Obligation,Medium,60,Law on Obligations,6,1',
    ].join('\n');
  }
}
