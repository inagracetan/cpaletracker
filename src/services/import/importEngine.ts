import * as XLSX from 'xlsx';
import { 
  SubjectCode, 
  Topic, 
  Deadline, 
  AppStateData,
  ImportCategory,
  ImportValidationIssue,
  ImportHistoryRecord,
  AssessmentRecord,
  AssessmentTopicItem
} from '../../types';
import { 
  FieldMappingDefinition, 
  ColumnMappingItem, 
  SheetDetectionInfo, 
  ParsedWorkbookData, 
  ImportPreviewResult, 
  MappedImportRecord, 
  DuplicateMatch,
  ImportExecutionPayload,
  SheetProcessingPlan,
  WorkbookWidePreview,
  WorkbookImportExecutionPayload,
  WorkbookImportResultSummary
} from './importTypes';
import { CSVService } from '../csv/csvService';

export class ImportEngine {
  private static MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  // Field definitions per category
  public static TOPIC_FIELDS: FieldMappingDefinition[] = [
    { appField: 'code', label: 'Topic Code', required: true, aliases: ['code', 'topic code', 'topic_code', 'id', 'topic id', '#'], type: 'string', description: 'Unique topic code e.g. FAR-01' },
    { appField: 'name', label: 'Topic Name / Title', required: true, aliases: ['topic', 'topic name', 'topic title', 'title', 'name', 'topic (auto)', 'description'], type: 'string' },
    { appField: 'subject', label: 'Subject', required: true, aliases: ['subject', 'subject code', 'subj', 'course'], type: 'subject' },
    { appField: 'difficulty', label: 'Difficulty / Weight', required: false, aliases: ['difficulty', 'exam weight', 'weight', 'level', 'complexity'], type: 'enum', enumValues: ['Light', 'Medium', 'Heavy'] },
    { appField: 'estimatedDuration', label: 'Estimated Minutes', required: false, aliases: ['estimated minutes', 'duration', 'minutes', 'est min', 'est duration', 'time'], type: 'number' },
    { appField: 'tosArea', label: 'TOS Area', required: false, aliases: ['tos area', 'tos', 'tos area (items)', 'coverage', 'area'], type: 'string' },
    { appField: 'items', label: 'Approx Items', required: false, aliases: ['items', 'approx items', '≈ items', '≈ items this topic', 'num items', 'item count'], type: 'number' },
    { appField: 'studyDays', label: 'Study Days (1 or 2)', required: false, aliases: ['study days', 'study days (1 or 2)', 'days', 'day count'], type: 'number' },
    { appField: 'status', label: 'Completion Status', required: false, aliases: ['status', 'studied', 'studied (auto)', 'done', 'state'], type: 'enum', enumValues: ['Not started', 'In progress', 'Completed', 'Skipped', 'Missed'] },
    { appField: 'notes', label: 'Notes / Remarks', required: false, aliases: ['notes', 'remarks', 'comment', 'extra note (optional)', 'comments'], type: 'string' },
  ];

  public static DEADLINE_FIELDS: FieldMappingDefinition[] = [
    { appField: 'title', label: 'Event / Title', required: true, aliases: ['title', 'event', 'event name', 'what', 'deadline', 'name', 'description'], type: 'string' },
    { appField: 'dueDate', label: 'Due Date', required: true, aliases: ['due date', 'date', 'due', 'deadline date', 'target date', 'end date'], type: 'date' },
    { appField: 'category', label: 'Category', required: false, aliases: ['category', 'type', 'event category', 'group'], type: 'enum', enumValues: ['Registration and filing', 'Required documents', 'Preboards', 'Study milestones', 'Examination dates', 'Results and follow-up'] },
    { appField: 'verificationStatus', label: 'Verification Status', required: false, aliases: ['verification status', 'status', 'verified', 'official verification status', 'tag'], type: 'enum', enumValues: ['Estimated', 'User-target', 'Confirmed', 'Auto-calculated'] },
    { appField: 'isCompleted', label: 'Completed?', required: false, aliases: ['completed', 'is completed', 'done', 'finished'], type: 'boolean' },
    { appField: 'notes', label: 'Notes', required: false, aliases: ['notes', 'remarks', 'details', 'comment'], type: 'string' },
  ];

  public static SESSION_FIELDS: FieldMappingDefinition[] = [
    { appField: 'date', label: 'Study Date', required: true, aliases: ['date', 'study date', 'session date', 'day'], type: 'date' },
    { appField: 'subject', label: 'Subject', required: false, aliases: ['subject', 'assigned subject', 'subj', 'course'], type: 'subject' },
    { appField: 'topicCode', label: 'Topic Code', required: false, aliases: ['topic code', 'code', 'assigned topic code'], type: 'string' },
    { appField: 'topicName', label: 'Topic Name', required: false, aliases: ['topic name', 'topic', 'assigned topic', 'title'], type: 'string' },
    { appField: 'plannedDuration', label: 'Planned Minutes', required: false, aliases: ['planned duration', 'planned min', 'planned minutes', 'target min'], type: 'number' },
    { appField: 'actualDuration', label: 'Actual Minutes', required: false, aliases: ['actual duration', 'actual min', 'actual minutes', 'time spent'], type: 'number' },
    { appField: 'status', label: 'Session Status', required: false, aliases: ['status', 'session status', 'state', 'done'], type: 'enum', enumValues: ['Not started', 'In progress', 'Completed', 'Skipped', 'Missed'] },
    { appField: 'notes', label: 'Notes', required: false, aliases: ['notes', 'remarks', 'session notes'], type: 'string' },
    { appField: 'materials', label: 'Study Materials', required: false, aliases: ['materials', 'study materials', 'resource', 'book'], type: 'string' },
  ];

  /**
   * Parse any Date string or Excel serial number safely into 'YYYY-MM-DD'
   */
  public static parseDateSafely(val: any): { dateStr: string | null; warning?: string } {
    if (val === null || val === undefined || val === '') {
      return { dateStr: null };
    }

    // Number = Excel serial date
    if (typeof val === 'number') {
      try {
        const formatted = XLSX.SSF.format('yyyy-mm-dd', val);
        if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
          return { dateStr: formatted };
        }
      } catch (_e) {
        // Fallback calculation for excel serial date
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          const y = date.getUTCFullYear();
          const m = String(date.getUTCMonth() + 1).padStart(2, '0');
          const d = String(date.getUTCDate()).padStart(2, '0');
          return { dateStr: `${y}-${m}-${d}` };
        }
      }
    }

    const str = String(val).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return { dateStr: str };
    }

    // Try standard date parsing
    const parsed = CSVService.parseDateString(str);
    if (parsed) {
      return { dateStr: parsed };
    }

    // Try parsing numeric string serial date
    const num = Number(str);
    if (!isNaN(num) && num > 30000 && num < 70000) {
      try {
        const formatted = XLSX.SSF.format('yyyy-mm-dd', num);
        if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
          return { dateStr: formatted, warning: `Parsed serial number "${str}" as ${formatted}` };
        }
      } catch {}
    }

    return { dateStr: null, warning: `Unable to interpret date value "${str}"` };
  }

  /**
   * Normalize Subject Code from aliases
   */
  public static normalizeSubject(val: any): SubjectCode | null {
    if (!val) return null;
    const str = String(val).trim().toUpperCase();

    if (['FAR', 'AFAR', 'MS', 'TAX', 'AUD', 'RFBT'].includes(str)) {
      return str as SubjectCode;
    }

    if (str.includes('FINANCIAL ACCOUNTING') && str.includes('ADVANCED')) return 'AFAR';
    if (str.includes('FINANCIAL ACCOUNTING')) return 'FAR';
    if (str.includes('MANAGEMENT') || str.includes('MAS')) return 'MS';
    if (str.includes('TAX')) return 'TAX';
    if (str.includes('AUDIT')) return 'AUD';
    if (str.includes('LAW') || str.includes('REGULATORY') || str.includes('RFBT') || str.includes('BL')) return 'RFBT';

    return null;
  }

  /**
   * Normalize Difficulty
   */
  public static normalizeDifficulty(val: any): 'Light' | 'Medium' | 'Heavy' {
    if (!val) return 'Medium';
    const str = String(val).trim().toLowerCase();
    if (str.includes('heavy') || str.includes('hard') || str.includes('high') || str === '3') return 'Heavy';
    if (str.includes('light') || str.includes('easy') || str.includes('low') || str === '1') return 'Light';
    return 'Medium';
  }

  /**
   * Parse Raw Workbook from ArrayBuffer or Base64
   */
  public static readWorkbook(data: ArrayBuffer | Uint8Array | string, filename: string): ParsedWorkbookData {
    let workbook: XLSX.WorkBook;
    try {
      if (typeof data === 'string') {
        // Base64 or CSV string
        if (data.startsWith('data:') || data.length > 500 && !data.includes('\n')) {
          const base64 = data.includes(',') ? data.split(',')[1] : data;
          workbook = XLSX.read(base64, { type: 'base64', cellDates: false, raw: false });
        } else {
          workbook = XLSX.read(data, { type: 'string', cellDates: false, raw: false });
        }
      } else {
        workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: false });
      }
    } catch (err: any) {
      throw new Error(`Failed to read spreadsheet file: ${err.message || 'Corrupt or unsupported format'}`);
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    const fileType = ext === 'csv' ? 'csv' : (ext === 'xls' ? 'xls' : 'xlsx');

    const sheets: SheetDetectionInfo[] = workbook.SheetNames.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      return this.detectSheetInfo(sheetName, rawRows);
    });

    return {
      filename,
      fileSize: typeof data === 'string' ? data.length : data.byteLength,
      fileType,
      sheets,
      selectedSheetIndex: 0,
    };
  }

  /**
   * Detect sheet structure, headers, and category
   */
  public static detectSheetInfo(sheetName: string, rawRows: any[][]): SheetDetectionInfo {
    const rowCount = rawRows.length;
    let columnCount = 0;
    for (const r of rawRows) {
      if (r && r.length > columnCount) columnCount = r.length;
    }

    const lowerName = sheetName.toLowerCase();

    // Check if this is an instructional sheet
    if (lowerName.includes('how to use') || lowerName.includes('readme') || lowerName.includes('instruction')) {
      return {
        name: sheetName,
        rowCount,
        columnCount,
        detectedCategory: 'auto',
        confidence: 0,
        headers: [],
        rawRows,
      };
    }

    // Check if this is the Setup sheet / CSV
    const firstFewRowsText = rawRows.slice(0, 15).map(r => (r || []).join(' ')).join(' ').toLowerCase();
    const isSetupSheet = lowerName.includes('setup') ||
      firstFewRowsText.includes('1 · about you') ||
      firstFewRowsText.includes('setup · start here');

    if (isSetupSheet) {
      return {
        name: sheetName,
        rowCount,
        columnCount,
        detectedCategory: 'setup',
        confidence: 0.95,
        headers: ['Section / Key', 'Value', 'Details', 'Notes'],
        rawRows,
      };
    }

    const isAssessmentSheet = lowerName.includes('preboard') || lowerName.includes('assessment');
    if (isAssessmentSheet) {
      return {
        name: sheetName,
        rowCount,
        columnCount,
        detectedCategory: 'assessments',
        confidence: 0.95,
        headers: ['FAR', 'AFAR', 'MS', 'TAX', 'AUD', 'RFBT'],
        rawRows,
      };
    }

    // Find Header Row (first non-empty row that contains candidate column names)
    let headerRowIndex = -1;
    let detectedCategory: ImportCategory = 'topics';
    let maxMatches = 0;

    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i] || [];
      const rowStr = row.map(c => String(c || '').trim().toLowerCase());

      // Check Topic matches
      const topicMatches = this.TOPIC_FIELDS.filter(f => 
        rowStr.some(c => f.aliases.includes(c) || c.includes(f.appField))
      ).length;

      // Check Deadline matches
      const deadlineMatches = this.DEADLINE_FIELDS.filter(f => 
        rowStr.some(c => f.aliases.includes(c))
      ).length;

      // Check Session matches
      const sessionMatches = this.SESSION_FIELDS.filter(f => 
        rowStr.some(c => f.aliases.includes(c))
      ).length;

      const currentMax = Math.max(topicMatches, deadlineMatches, sessionMatches);
      if (currentMax > maxMatches && currentMax >= 2) {
        maxMatches = currentMax;
        headerRowIndex = i;
        if (topicMatches >= deadlineMatches && topicMatches >= sessionMatches) {
          detectedCategory = 'topics';
        } else if (deadlineMatches > topicMatches && deadlineMatches >= sessionMatches) {
          detectedCategory = 'deadlines';
        } else {
          detectedCategory = 'sessions';
        }
      }
    }

    // Sheet name heuristics if header detection had low confidence
    if (['far', 'afar', 'ms', 'tax', 'aud', 'rfbt', 'topics', 'syllabus'].includes(lowerName)) {
      detectedCategory = 'topics';
    } else if (lowerName.includes('preboard') || lowerName.includes('assessment')) {
      const hasSubjectHeaders = rawRows.slice(0, 10).some(r => 
        (r || []).some(c => ['FAR', 'AFAR', 'MS', 'TAX', 'AUD', 'RFBT'].includes(String(c || '').trim().toUpperCase()))
      );
      detectedCategory = hasSubjectHeaders ? 'assessments' : 'deadlines';
    } else if (lowerName.includes('deadline') || lowerName.includes('key date')) {
      detectedCategory = 'deadlines';
    } else if (lowerName.includes('session') || lowerName.includes('plan') || lowerName.includes('checklist') || lowerName.includes('study order')) {
      detectedCategory = 'sessions';
    }

    // Extract headers
    let headers: string[] = [];
    if (headerRowIndex >= 0) {
      headers = (rawRows[headerRowIndex] || []).map((c, idx) => String(c || '').trim() || `Column ${idx + 1}`);
    } else if (rawRows.length > 0) {
      headers = (rawRows[0] || []).map((c, idx) => String(c || '').trim() || `Column ${idx + 1}`);
    }

    return {
      name: sheetName,
      rowCount,
      columnCount,
      detectedCategory,
      confidence: headerRowIndex >= 0 ? 0.85 : 0.5,
      headers,
      rawRows: headerRowIndex >= 0 ? rawRows.slice(headerRowIndex + 1) : rawRows,
    };
  }

  /**
   * Suggest automatic column mappings based on headers
   */
  public static suggestColumnMappings(
    headers: string[], 
    fields: FieldMappingDefinition[], 
    sampleRow?: any[]
  ): ColumnMappingItem[] {
    const mappings: ColumnMappingItem[] = [];

    fields.forEach(field => {
      let matchedIdx = -1;

      // 1. Exact match on aliases
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i].toLowerCase().trim().replace(/[\n\r]+/g, ' ');
        if (field.aliases.includes(h) || h === field.appField.toLowerCase() || h === field.label.toLowerCase()) {
          matchedIdx = i;
          break;
        }
      }

      // 2. Partial match if no exact match
      if (matchedIdx === -1) {
        for (let i = 0; i < headers.length; i++) {
          const h = headers[i].toLowerCase().trim().replace(/[\n\r]+/g, ' ');
          if (field.aliases.some(alias => h.includes(alias))) {
            matchedIdx = i;
            break;
          }
        }
      }

      if (matchedIdx !== -1) {
        mappings.push({
          appField: field.appField,
          spreadsheetColumn: headers[matchedIdx],
          spreadsheetColumnIndex: matchedIdx,
          sampleValue: sampleRow ? sampleRow[matchedIdx] : undefined,
        });
      }
    });

    return mappings;
  }

  /**
   * Build preview records with validation and duplicate detection
   */
  public static generatePreview(
    sheetInfo: SheetDetectionInfo,
    category: ImportCategory,
    columnMappings: ColumnMappingItem[],
    existingState: AppStateData
  ): ImportPreviewResult {
    const fields = category === 'deadlines' 
      ? this.DEADLINE_FIELDS 
      : (category === 'sessions' ? this.SESSION_FIELDS : this.TOPIC_FIELDS);

    const mappingMap = new Map<string, number>();
    columnMappings.forEach(m => mappingMap.set(m.appField, m.spreadsheetColumnIndex));

    const records: MappedImportRecord[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // Filter out completely blank rows
    const activeRows = sheetInfo.rawRows.filter(r => r && r.some(c => c !== null && c !== undefined && String(c).trim() !== ''));

    for (let r = 0; r < activeRows.length; r++) {
      const row = activeRows[r];
      const parsedData: Record<string, any> = {};
      const issues: ImportValidationIssue[] = [];

      // Extract values according to mapping
      fields.forEach(f => {
        const colIdx = mappingMap.get(f.appField);
        if (colIdx !== undefined && colIdx < row.length) {
          parsedData[f.appField] = row[colIdx];
        }
      });

      // If category is topics and subject is not in sheet but sheet name is a subject code
      if (category === 'topics' && !parsedData.subject) {
        const sheetSubject = this.normalizeSubject(sheetInfo.name);
        if (sheetSubject) {
          parsedData.subject = sheetSubject;
        }
      }

      // Validation per category
      if (category === 'topics') {
        this.validateTopicRecord(parsedData, r + 1, issues);
      } else if (category === 'deadlines') {
        this.validateDeadlineRecord(parsedData, r + 1, issues);
      } else if (category === 'sessions') {
        this.validateSessionRecord(parsedData, r + 1, issues);
      }

      // Duplicate detection
      const duplicateMatch = this.detectDuplicate(parsedData, category, existingState, r + 1);
      if (duplicateMatch) {
        duplicateCount++;
      }

      const hasError = issues.some(i => i.severity === 'error');
      const hasWarning = issues.some(i => i.severity === 'warning');

      if (hasError) errorCount++;
      else if (hasWarning) warningCount++;
      else validCount++;

      records.push({
        rowIndex: r + 1,
        originalRow: row,
        parsedData,
        isValid: !hasError,
        issues,
        duplicateMatch,
      });
    }

    return {
      filename: sheetInfo.name,
      sheetName: sheetInfo.name,
      category,
      headers: sheetInfo.headers,
      columnMappings,
      availableFields: fields,
      records,
      summary: {
        totalRows: records.length,
        validRows: validCount,
        warningRows: warningCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
      },
    };
  }

  /**
   * Validate single topic record
   */
  private static validateTopicRecord(data: Record<string, any>, rowNum: number, issues: ImportValidationIssue[]): void {
    // 1. Code
    if (!data.code || String(data.code).trim() === '') {
      issues.push({ row: rowNum, field: 'code', message: 'Topic Code is required', severity: 'error' });
    } else {
      // Preserve leading zeros as string
      data.code = String(data.code).trim();
    }

    // 2. Name
    if (!data.name || String(data.name).trim() === '') {
      issues.push({ row: rowNum, field: 'name', message: 'Topic Name is required', severity: 'error' });
    } else {
      data.name = String(data.name).trim();
    }

    // 3. Subject
    const normalizedSub = this.normalizeSubject(data.subject);
    if (!normalizedSub) {
      issues.push({ row: rowNum, field: 'subject', message: `Unrecognized subject: "${data.subject || 'blank'}"`, severity: 'error', rawValue: data.subject });
    } else {
      data.subject = normalizedSub;
    }

    // 4. Difficulty
    data.difficulty = this.normalizeDifficulty(data.difficulty);

    // 5. Estimated Duration
    const dur = parseInt(String(data.estimatedDuration || '60'), 10);
    data.estimatedDuration = isNaN(dur) || dur <= 0 ? 60 : dur;

    // 6. Approx Items
    if (data.items !== undefined && data.items !== '') {
      const items = parseFloat(String(data.items));
      data.items = isNaN(items) ? 0 : items;
    }

    // 7. Study Days
    if (data.studyDays !== undefined && data.studyDays !== '') {
      const days = parseInt(String(data.studyDays), 10);
      data.studyDays = days === 2 ? 2 : 1;
    } else {
      data.studyDays = 1;
    }

    // 8. Status
    const rawStatus = String(data.status || '').toLowerCase();
    if (rawStatus.includes('done') || rawStatus.includes('complete')) {
      data.status = 'Completed';
    } else if (rawStatus.includes('progress')) {
      data.status = 'In progress';
    } else {
      data.status = 'Not started';
    }
  }

  /**
   * Validate single deadline record
   */
  private static validateDeadlineRecord(data: Record<string, any>, rowNum: number, issues: ImportValidationIssue[]): void {
    if (!data.title || String(data.title).trim() === '') {
      issues.push({ row: rowNum, field: 'title', message: 'Deadline title is required', severity: 'error' });
    } else {
      data.title = String(data.title).trim();
    }

    const { dateStr, warning } = this.parseDateSafely(data.dueDate);
    if (!dateStr) {
      issues.push({ row: rowNum, field: 'dueDate', message: `Invalid due date: "${data.dueDate || ''}"`, severity: 'error', rawValue: data.dueDate });
    } else {
      data.dueDate = dateStr;
      if (warning) {
        issues.push({ row: rowNum, field: 'dueDate', message: warning, severity: 'warning', rawValue: data.dueDate });
      }
    }

    // Category
    const rawCat = String(data.category || '').toLowerCase();
    if (rawCat.includes('exam')) data.category = 'Examination dates';
    else if (rawCat.includes('preboard')) data.category = 'Preboards';
    else if (rawCat.includes('document') || rawCat.includes('nbi')) data.category = 'Required documents';
    else if (rawCat.includes('milestone')) data.category = 'Study milestones';
    else if (rawCat.includes('result')) data.category = 'Results and follow-up';
    else data.category = 'Registration and filing';

    // Status
    const rawStatus = String(data.verificationStatus || '').toLowerCase();
    if (rawStatus.includes('confirm')) data.verificationStatus = 'Confirmed';
    else if (rawStatus.includes('target')) data.verificationStatus = 'User-target';
    else if (rawStatus.includes('auto')) data.verificationStatus = 'Auto-calculated';
    else data.verificationStatus = 'Estimated';

    // Completed boolean
    const rawComp = String(data.isCompleted || '').toLowerCase();
    data.isCompleted = rawComp === 'true' || rawComp === 'yes' || rawComp === '1' || rawComp === 'y';
  }

  /**
   * Validate single study session record
   */
  private static validateSessionRecord(data: Record<string, any>, rowNum: number, issues: ImportValidationIssue[]): void {
    const { dateStr, warning } = this.parseDateSafely(data.date);
    if (!dateStr) {
      issues.push({ row: rowNum, field: 'date', message: `Invalid study date: "${data.date || ''}"`, severity: 'error', rawValue: data.date });
    } else {
      data.date = dateStr;
      if (warning) {
        issues.push({ row: rowNum, field: 'date', message: warning, severity: 'warning', rawValue: data.date });
      }
    }

    if (data.subject) {
      const sub = this.normalizeSubject(data.subject);
      if (sub) data.subject = sub;
    }

    const planned = parseInt(String(data.plannedDuration || '60'), 10);
    data.plannedDuration = isNaN(planned) || planned < 0 ? 60 : planned;

    const actual = parseInt(String(data.actualDuration || '0'), 10);
    data.actualDuration = isNaN(actual) || actual < 0 ? 0 : actual;

    const rawStatus = String(data.status || '').toLowerCase();
    if (rawStatus.includes('done') || rawStatus.includes('complete')) data.status = 'Completed';
    else if (rawStatus.includes('skip')) data.status = 'Skipped';
    else if (rawStatus.includes('miss')) data.status = 'Missed';
    else if (rawStatus.includes('progress')) data.status = 'In progress';
    else data.status = 'Not started';
  }

  /**
   * Detect duplicates against current app state
   */
  private static detectDuplicate(
    data: Record<string, any>, 
    category: ImportCategory, 
    state: AppStateData, 
    rowNum: number
  ): DuplicateMatch | undefined {
    if (category === 'topics') {
      const code = String(data.code || '').trim().toUpperCase();
      const name = String(data.name || '').trim().toLowerCase();
      const subject = data.subject as SubjectCode;

      // Exact match by Code
      const matchedByCode = state.topics.find(t => t.code.toUpperCase() === code);
      if (matchedByCode) {
        return {
          rowIndex: rowNum,
          recordIdentifier: code,
          matchedId: matchedByCode.id,
          matchedTitle: `${matchedByCode.code}: ${matchedByCode.name}`,
          reason: `Topic code "${code}" already exists`,
          isExact: true,
        };
      }

      // Match by subject + normalized title
      if (subject && name) {
        const matchedByName = state.topics.find(t => 
          t.subject === subject && t.name.trim().toLowerCase() === name
        );
        if (matchedByName) {
          return {
            rowIndex: rowNum,
            recordIdentifier: `${subject} - ${data.name}`,
            matchedId: matchedByName.id,
            matchedTitle: `${matchedByName.code}: ${matchedByName.name}`,
            reason: `Topic with identical title exists in ${subject}`,
            isExact: false,
          };
        }
      }
    } else if (category === 'deadlines') {
      const title = String(data.title || '').trim().toLowerCase();
      const dueDate = data.dueDate;

      const matched = state.deadlines.find(d => 
        d.title.trim().toLowerCase() === title && d.dueDate === dueDate
      );
      if (matched) {
        return {
          rowIndex: rowNum,
          recordIdentifier: `${data.title} (${dueDate})`,
          matchedId: matched.id,
          matchedTitle: matched.title,
          reason: `Deadline with matching title and date exists`,
          isExact: true,
        };
      }
    } else if (category === 'sessions') {
      const date = data.date;
      const topicCode = String(data.topicCode || '').trim().toUpperCase();

      if (date && topicCode) {
        const matched = state.sessions.find(s => 
          s.date === date && (s.topicCode || '').toUpperCase() === topicCode
        );
        if (matched) {
          return {
            rowIndex: rowNum,
            recordIdentifier: `${date} - ${topicCode}`,
            matchedId: matched.id,
            matchedTitle: `${matched.date}: ${matched.topicName || matched.topicCode}`,
            reason: `Session for ${topicCode} on ${date} already exists`,
            isExact: true,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Execute Import transactionally and return updated AppStateData + History Record
   */
  public static executeImport(
    payload: ImportExecutionPayload, 
    currentState: AppStateData
  ): { newState: AppStateData; result: ImportHistoryRecord } {
    const { filename, sheetName, category, strategy, records, setupData } = payload;

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const issues: ImportValidationIssue[] = [];

    // Clone current state to avoid direct mutation
    const newState: AppStateData = JSON.parse(JSON.stringify(currentState));

    // Handle Setup sheet import directly
    if (category === 'setup' && setupData) {
      if (setupData.userProfile) {
        newState.userProfile = { ...newState.userProfile, ...setupData.userProfile, updatedAt: new Date().toISOString() };
        addedCount++;
      }
      if (setupData.examPlan) {
        newState.examPlan = { ...newState.examPlan, ...setupData.examPlan };
        addedCount++;
      }
      if (setupData.weeklySchedule && setupData.weeklySchedule.length > 0) {
        newState.weeklySchedule = setupData.weeklySchedule;
        addedCount++;
      }
      if (setupData.workPeriod) {
        newState.workPeriod = { ...newState.workPeriod, ...setupData.workPeriod };
        addedCount++;
      }
      if (setupData.restDays && setupData.restDays.length > 0) {
        if (strategy === 'replace') {
          newState.restDays = setupData.restDays;
        } else {
          setupData.restDays.forEach(rd => {
            const exists = newState.restDays.some(r => r.date === rd.date);
            if (!exists) newState.restDays.push(rd);
          });
        }
        addedCount++;
      }
      if (setupData.materials) {
        newState.studyMaterials = { ...newState.studyMaterials, ...setupData.materials };
        addedCount++;
      }
      if (setupData.deadlines && setupData.deadlines.length > 0) {
        if (strategy === 'replace') {
          newState.deadlines = setupData.deadlines;
        } else {
          setupData.deadlines.forEach(dl => {
            const existsIdx = newState.deadlines.findIndex(d => d.title.toLowerCase() === dl.title.toLowerCase() && d.dueDate === dl.dueDate);
            if (existsIdx >= 0) {
              if (strategy === 'update') {
                newState.deadlines[existsIdx] = { ...newState.deadlines[existsIdx], ...dl };
                updatedCount++;
              } else {
                skippedCount++;
              }
            } else {
              newState.deadlines.push(dl);
              addedCount++;
            }
          });
        }
      }
    } else if (category === 'topics') {
      const validRecords = records.filter(r => r.isValid);
      errorCount = records.length - validRecords.length;
      records.filter(r => !r.isValid).forEach(r => issues.push(...r.issues));

      if (strategy === 'replace') {
        // Replace only topics
        const newTopicList: Topic[] = validRecords.map((r, i) => ({
          id: `topic_${r.parsedData.code}_${Date.now()}_${i}`,
          code: r.parsedData.code,
          subject: r.parsedData.subject,
          name: r.parsedData.name,
          subtopics: r.parsedData.subtopics || [],
          estimatedDuration: r.parsedData.estimatedDuration || 60,
          difficulty: r.parsedData.difficulty || 'Medium',
          tosArea: r.parsedData.tosArea,
          items: r.parsedData.items,
          studyDays: r.parsedData.studyDays || 1,
          status: r.parsedData.status || 'Not started',
          notes: r.parsedData.notes,
          orderIndex: i,
        }));
        newState.topics = newTopicList;
        addedCount = newTopicList.length;
      } else {
        // Add or Update
        validRecords.forEach((r, i) => {
          const code = String(r.parsedData.code).trim().toUpperCase();
          const existingIdx = newState.topics.findIndex(t => t.code.toUpperCase() === code);

          if (existingIdx >= 0) {
            if (strategy === 'update') {
              newState.topics[existingIdx] = {
                ...newState.topics[existingIdx],
                name: r.parsedData.name,
                subject: r.parsedData.subject,
                difficulty: r.parsedData.difficulty || newState.topics[existingIdx].difficulty,
                estimatedDuration: r.parsedData.estimatedDuration || newState.topics[existingIdx].estimatedDuration,
                tosArea: r.parsedData.tosArea || newState.topics[existingIdx].tosArea,
                items: r.parsedData.items !== undefined ? r.parsedData.items : newState.topics[existingIdx].items,
                studyDays: r.parsedData.studyDays || newState.topics[existingIdx].studyDays,
                status: r.parsedData.status || newState.topics[existingIdx].status,
                notes: r.parsedData.notes || newState.topics[existingIdx].notes,
              };
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            newState.topics.push({
              id: `topic_${r.parsedData.code}_${Date.now()}_${i}`,
              code: r.parsedData.code,
              subject: r.parsedData.subject,
              name: r.parsedData.name,
              subtopics: r.parsedData.subtopics || [],
              estimatedDuration: r.parsedData.estimatedDuration || 60,
              difficulty: r.parsedData.difficulty || 'Medium',
              tosArea: r.parsedData.tosArea,
              items: r.parsedData.items,
              studyDays: r.parsedData.studyDays || 1,
              status: r.parsedData.status || 'Not started',
              notes: r.parsedData.notes,
              orderIndex: newState.topics.length,
            });
            addedCount++;
          }
        });
      }
    } else if (category === 'deadlines') {
      const validRecords = records.filter(r => r.isValid);
      errorCount = records.length - validRecords.length;
      records.filter(r => !r.isValid).forEach(r => issues.push(...r.issues));

      if (strategy === 'replace') {
        const newDeadlines: Deadline[] = validRecords.map((r, i) => ({
          id: `dl_${Date.now()}_${i}`,
          title: r.parsedData.title,
          dueDate: r.parsedData.dueDate,
          category: r.parsedData.category,
          verificationStatus: r.parsedData.verificationStatus || 'Estimated',
          isCompleted: !!r.parsedData.isCompleted,
          notes: r.parsedData.notes,
          reminderDays: [7, 3, 1, 0],
        }));
        newState.deadlines = newDeadlines;
        addedCount = newDeadlines.length;
      } else {
        validRecords.forEach((r, i) => {
          const title = String(r.parsedData.title).trim().toLowerCase();
          const dueDate = r.parsedData.dueDate;
          const existingIdx = newState.deadlines.findIndex(d => 
            d.title.trim().toLowerCase() === title && d.dueDate === dueDate
          );

          if (existingIdx >= 0) {
            if (strategy === 'update') {
              newState.deadlines[existingIdx] = {
                ...newState.deadlines[existingIdx],
                category: r.parsedData.category,
                verificationStatus: r.parsedData.verificationStatus || newState.deadlines[existingIdx].verificationStatus,
                isCompleted: r.parsedData.isCompleted !== undefined ? r.parsedData.isCompleted : newState.deadlines[existingIdx].isCompleted,
                notes: r.parsedData.notes || newState.deadlines[existingIdx].notes,
              };
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            newState.deadlines.push({
              id: `dl_${Date.now()}_${i}`,
              title: r.parsedData.title,
              dueDate: r.parsedData.dueDate,
              category: r.parsedData.category,
              verificationStatus: r.parsedData.verificationStatus || 'Estimated',
              isCompleted: !!r.parsedData.isCompleted,
              notes: r.parsedData.notes,
              reminderDays: [7, 3, 1, 0],
            });
            addedCount++;
          }
        });
      }
    } else if (category === 'sessions') {
      const validRecords = records.filter(r => r.isValid);
      errorCount = records.length - validRecords.length;
      records.filter(r => !r.isValid).forEach(r => issues.push(...r.issues));

      if (strategy === 'replace') {
        newState.sessions = validRecords.map((r, i) => ({
          id: `session_import_${Date.now()}_${i}`,
          date: r.parsedData.date,
          type: 'STUDY',
          subject: r.parsedData.subject,
          topicCode: r.parsedData.topicCode,
          topicName: r.parsedData.topicName,
          plannedDuration: r.parsedData.plannedDuration || 60,
          actualDuration: r.parsedData.actualDuration || 0,
          status: r.parsedData.status || 'Not started',
          notes: r.parsedData.notes,
          materials: r.parsedData.materials,
        }));
        addedCount = newState.sessions.length;
      } else {
        validRecords.forEach((r, i) => {
          const date = r.parsedData.date;
          const topicCode = String(r.parsedData.topicCode || '').trim().toUpperCase();
          const existingIdx = newState.sessions.findIndex(s => 
            s.date === date && (s.topicCode || '').toUpperCase() === topicCode
          );

          if (existingIdx >= 0) {
            if (strategy === 'update') {
              newState.sessions[existingIdx] = {
                ...newState.sessions[existingIdx],
                plannedDuration: r.parsedData.plannedDuration || newState.sessions[existingIdx].plannedDuration,
                actualDuration: r.parsedData.actualDuration || newState.sessions[existingIdx].actualDuration,
                status: r.parsedData.status || newState.sessions[existingIdx].status,
                notes: r.parsedData.notes || newState.sessions[existingIdx].notes,
              };
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            newState.sessions.push({
              id: `session_import_${Date.now()}_${i}`,
              date: r.parsedData.date,
              type: 'STUDY',
              subject: r.parsedData.subject,
              topicCode: r.parsedData.topicCode,
              topicName: r.parsedData.topicName,
              plannedDuration: r.parsedData.plannedDuration || 60,
              actualDuration: r.parsedData.actualDuration || 0,
              status: r.parsedData.status || 'Not started',
              notes: r.parsedData.notes,
              materials: r.parsedData.materials,
            });
            addedCount++;
          }
        });
      }
    }

    const historyRecord: ImportHistoryRecord = {
      id: `import_${Date.now()}`,
      timestamp: new Date().toISOString(),
      filename,
      sheetName,
      category,
      strategy,
      addedCount,
      updatedCount,
      skippedCount,
      errorCount,
      issues,
    };

    if (!newState.importHistory) newState.importHistory = [];
    newState.importHistory.unshift(historyRecord);

    return { newState, result: historyRecord };
  }

  /**
   * Generate downloadable CSV error report
   */
  public static generateErrorReportCSV(history: ImportHistoryRecord): string {
    const header = ['Row Number', 'Field', 'Severity', 'Error Reason', 'Original Value'];
    const rows = history.issues.map(iss => [
      iss.row,
      `"${iss.field}"`,
      iss.severity.toUpperCase(),
      `"${iss.message.replace(/"/g, '""')}"`,
      `"${String(iss.rawValue ?? '').replace(/"/g, '""')}"`
    ]);

    return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Parse Preboards & Assessments Sheet into structured AssessmentRecord[]
   */
  public static parsePreboardsSheet(
    rawRows: any[][],
    existingTopics: Topic[] = []
  ): AssessmentRecord[] {
    const subjects: SubjectCode[] = ['FAR', 'AFAR', 'MS', 'TAX', 'AUD', 'RFBT'];
    const subColMap: Partial<Record<SubjectCode, number>> = {};

    // 1. Locate subject header row
    for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
      const row = rawRows[r] || [];
      subjects.forEach(s => {
        const idx = row.findIndex(c => String(c || '').trim().toUpperCase() === s);
        if (idx >= 0 && subColMap[s] === undefined) {
          subColMap[s] = idx;
        }
      });
      if (Object.keys(subColMap).length >= 4) break;
    }

    // Fallback standard 3-column spacing: FAR=0, AFAR=3, MS=6, TAX=9, AUD=12, RFBT=15
    if (Object.keys(subColMap).length < 4) {
      subColMap.FAR = 0;
      subColMap.AFAR = 3;
      subColMap.MS = 6;
      subColMap.TAX = 9;
      subColMap.AUD = 12;
      subColMap.RFBT = 15;
    }

    const firstPbTopics: AssessmentTopicItem[] = [];
    const finalPbTopics: AssessmentTopicItem[] = [];

    subjects.forEach(sub => {
      const startCol = subColMap[sub];
      if (startCol === undefined) return;
      const colStatus = startCol;
      const colName = startCol + 1;
      let inFinal = false;

      for (let r = 5; r < rawRows.length; r++) {
        const row = rawRows[r] || [];
        const valStatus = String(row[colStatus] || '').trim();
        const valName = String(row[colName] || '').trim();

        if (
          valName.toLowerCase().includes('final preboard') ||
          valStatus.toLowerCase().includes('final preboard')
        ) {
          inFinal = true;
          continue;
        }

        if (
          !valName ||
          valName.toLowerCase() === 'topic' ||
          valName.toLowerCase() === 'status' ||
          valName.toLowerCase().includes('first preboard')
        ) {
          continue;
        }

        const isCompleted = valStatus.toLowerCase() === 'done';

        // Match topic code from existing topics if possible
        let matchedCode = '';
        if (existingTopics.length > 0) {
          const match = existingTopics.find(
            t =>
              t.subject === sub &&
              (t.name.trim().toLowerCase() === valName.toLowerCase() ||
                t.name.toLowerCase().includes(valName.toLowerCase()) ||
                valName.toLowerCase().includes(t.name.toLowerCase()))
          );
          if (match) matchedCode = match.code;
        }

        const item: AssessmentTopicItem = {
          id: `${inFinal ? 'finalpb' : 'firstpb'}-${sub.toLowerCase()}-${inFinal ? finalPbTopics.length + 1 : firstPbTopics.length + 1}`,
          topicCode: matchedCode,
          name: valName,
          subject: sub,
          isCompleted,
        };

        if (inFinal) {
          finalPbTopics.push(item);
        } else {
          firstPbTopics.push(item);
        }
      }
    });

    const assessments: AssessmentRecord[] = [];
    if (firstPbTopics.length > 0) {
      assessments.push({
        id: 'assessment-first-preboard',
        title: 'First Preboard',
        type: 'first_preboard',
        date: '2027-02-27',
        topics: firstPbTopics,
        notes: 'Imported First Preboard examination coverage checklist',
      });
    }

    if (finalPbTopics.length > 0) {
      assessments.push({
        id: 'assessment-final-preboard',
        title: 'Final Preboard',
        type: 'final_preboard',
        date: '2027-04-24',
        topics: finalPbTopics,
        notes: 'Imported Final Preboard examination coverage checklist',
      });
    }

    return assessments;
  }

  /**
   * Analyze entire Excel workbook across all worksheets
   */
  public static analyzeWorkbookWide(
    data: ArrayBuffer | Uint8Array | string,
    filename: string,
    existingState: AppStateData
  ): WorkbookWidePreview {
    const parsedWb = this.readWorkbook(data, filename);
    const plans: SheetProcessingPlan[] = [];

    let expectedTopics = 0;
    let expectedDeadlines = 0;
    let expectedAssessments = 0;
    let hasSetupData = false;
    let hasStudyOrder = false;
    let totalWarnings = 0;
    let totalErrors = 0;

    for (const sheetInfo of parsedWb.sheets) {
      const lowerName = sheetInfo.name.toLowerCase().trim();
      const activeRowCount = sheetInfo.rawRows.filter(
        r => r && r.some(c => c !== null && c !== undefined && String(c).trim() !== '')
      ).length;

      // 1. Setup Sheet
      if (sheetInfo.detectedCategory === 'setup') {
        const csvContent = sheetInfo.rawRows
          .map(r => (r || []).map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
          .join('\n');
        const setupResult = CSVService.parseSetupCSV(csvContent);
        const dlCount = setupResult.deadlines?.length || 0;
        expectedDeadlines += dlCount;
        hasSetupData = true;

        plans.push({
          sheetName: sheetInfo.name,
          category: 'setup',
          enabled: true,
          rowCount: sheetInfo.rowCount,
          detectedRecordsCount: (setupResult.weeklySchedule?.length || 0) + dlCount + (setupResult.materials ? 6 : 0),
          description: 'Profile settings, study calendar parameters, weekly routine & official deadlines',
          previewSummary: `${dlCount} deadlines, ${setupResult.weeklySchedule?.length || 0} routines, profile data`,
          warnings: [],
          errors: [],
          setupData: {
            userProfile: setupResult.userProfile,
            examPlan: setupResult.examPlan,
            weeklySchedule: setupResult.weeklySchedule,
            workPeriod: setupResult.workPeriod,
            restDays: setupResult.restDays,
            materials: setupResult.materials,
            weeklyReviewTask: setupResult.weeklyReviewTask,
            deadlines: setupResult.deadlines,
          },
        });
        continue;
      }

      // 2. Preboard / Assessment Coverage Sheet
      if (lowerName.includes('preboard') || lowerName.includes('assessment')) {
        const assessments = this.parsePreboardsSheet(sheetInfo.rawRows, existingState.topics);
        const totalAssessmentTopics = assessments.reduce((acc, a) => acc + a.topics.length, 0);
        expectedAssessments += assessments.length;

        plans.push({
          sheetName: sheetInfo.name,
          category: 'assessments',
          enabled: true,
          rowCount: sheetInfo.rowCount,
          detectedRecordsCount: totalAssessmentTopics,
          description: 'First Preboard and Final Preboard topic coverage & completion checklists',
          previewSummary: `${assessments.length} assessments (${totalAssessmentTopics} total topic items)`,
          warnings: assessments.length === 0 ? ['No topic items parsed from preboard sheet'] : [],
          errors: [],
          assessmentsData: assessments,
        });
        continue;
      }

      // 3. Auxiliary / Informative Sheets to skip safely
      const isAuxiliary = 
        sheetInfo.confidence === 0 ||
        lowerName.includes('how to use') ||
        lowerName.includes('progress tracker') ||
        lowerName.includes('badges') ||
        lowerName.includes('calendar') ||
        lowerName.includes('mastery') ||
        lowerName.includes('chart data') ||
        lowerName.includes('plan engine') ||
        activeRowCount === 0;

      if (isAuxiliary) {
        let skipDescription = 'Auxiliary sheet skipped by default';
        if (lowerName.includes('how to use')) skipDescription = 'Spreadsheet guide & instructions (not stored in database)';
        else if (lowerName.includes('progress tracker')) skipDescription = 'Spreadsheet calculation table (dynamically generated in app dashboard)';
        else if (lowerName.includes('badges')) skipDescription = 'Spreadsheet badge table (badges are dynamically evaluated by achievement engine)';
        else if (lowerName.includes('calendar')) skipDescription = 'Spreadsheet calendar matrix (dynamically rendered by interactive calendar)';
        else if (lowerName.includes('mastery')) skipDescription = 'Optional reference materials sheet';
        else if (lowerName.includes('chart data')) skipDescription = 'Spreadsheet graph series data (dynamically computed in app)';
        else if (lowerName.includes('plan engine')) skipDescription = 'Hidden formula calculation engine';
        else if (activeRowCount === 0) skipDescription = 'Empty worksheet';

        plans.push({
          sheetName: sheetInfo.name,
          category: 'skip',
          enabled: false,
          rowCount: sheetInfo.rowCount,
          detectedRecordsCount: activeRowCount,
          description: skipDescription,
          previewSummary: 'Skipped by default — app features handle this dynamically',
          warnings: [],
          errors: [],
        });
        continue;
      }

      // 4. Subject Syllabus Sheets (FAR, AFAR, MS, TAX, AUD, RFBT)
      const subjectCode = this.normalizeSubject(sheetInfo.name);
      if (subjectCode || sheetInfo.detectedCategory === 'topics') {
        const targetSubject = subjectCode || 'FAR';
        const mappings = this.suggestColumnMappings(sheetInfo.headers, this.TOPIC_FIELDS, sheetInfo.rawRows[0]);
        const preview = this.generatePreview(sheetInfo, 'topics', mappings, existingState);

        const validCount = preview.summary.validRows;
        expectedTopics += validCount;
        totalWarnings += preview.summary.warningRows;
        totalErrors += preview.summary.errorRows;

        plans.push({
          sheetName: sheetInfo.name,
          category: 'topics',
          enabled: true,
          rowCount: sheetInfo.rowCount,
          detectedRecordsCount: validCount,
          subject: targetSubject,
          description: `${targetSubject} syllabus topics, items, weights, and completion status`,
          previewSummary: `${validCount} valid topics (${preview.summary.warningRows} warnings, ${preview.summary.duplicateRows} existing)`,
          warnings: preview.records
            .flatMap(r => r.issues.filter(i => i.severity === 'warning').map(i => `Row ${i.row}: ${i.message}`))
            .slice(0, 5),
          errors: preview.records
            .flatMap(r => r.issues.filter(i => i.severity === 'error').map(i => `Row ${i.row}: ${i.message}`))
            .slice(0, 5),
          columnMappings: mappings,
          records: preview.records,
        });
        continue;
      }

      // 5. Study Order / Sessions Sheet
      if (
        lowerName.includes('study order') ||
        lowerName.includes('order') ||
        lowerName.includes('session') ||
        lowerName.includes('daily checklist')
      ) {
        const mappings = this.suggestColumnMappings(sheetInfo.headers, this.SESSION_FIELDS, sheetInfo.rawRows[0]);
        const preview = this.generatePreview(sheetInfo, 'sessions', mappings, existingState);

        if (lowerName.includes('order')) hasStudyOrder = true;
        totalWarnings += preview.summary.warningRows;
        totalErrors += preview.summary.errorRows;

        plans.push({
          sheetName: sheetInfo.name,
          category: 'sessions',
          enabled: true,
          rowCount: sheetInfo.rowCount,
          detectedRecordsCount: preview.summary.validRows,
          description: lowerName.includes('order')
            ? 'Recommended sequence of study sessions & topic sequencing'
            : 'Scheduled daily study sessions and checklist records',
          previewSummary: `${preview.summary.validRows} sessions (${preview.summary.duplicateRows} matched)`,
          warnings: preview.records
            .flatMap(r => r.issues.filter(i => i.severity === 'warning').map(i => `Row ${i.row}: ${i.message}`))
            .slice(0, 5),
          errors: preview.records
            .flatMap(r => r.issues.filter(i => i.severity === 'error').map(i => `Row ${i.row}: ${i.message}`))
            .slice(0, 5),
          columnMappings: mappings,
          records: preview.records,
        });
        continue;
      }

      // Default fallback: skip unsupported sheet
      plans.push({
        sheetName: sheetInfo.name,
        category: 'skip',
        enabled: false,
        rowCount: sheetInfo.rowCount,
        detectedRecordsCount: activeRowCount,
        description: 'Unsupported or unmapped worksheet',
        previewSummary: 'Skipped by default',
        warnings: [],
        errors: [],
      });
    }

    const enabledSheetsCount = plans.filter(p => p.enabled).length;

    return {
      filename,
      fileSize: parsedWb.fileSize,
      fileType: parsedWb.fileType,
      sheets: plans,
      overallSummary: {
        totalSheets: plans.length,
        enabledSheets: enabledSheetsCount,
        expectedTopics,
        expectedDeadlines,
        expectedAssessments,
        hasSetupData,
        hasStudyOrder,
        totalWarnings,
        totalErrors,
      },
    };
  }

  /**
   * Execute Whole-Workbook Import in a single coordinated operation
   */
  public static executeWorkbookWideImport(
    payload: WorkbookImportExecutionPayload,
    currentState: AppStateData
  ): { newState: AppStateData; result: WorkbookImportResultSummary } {
    const { filename, strategy, sheets } = payload;
    const newState: AppStateData = JSON.parse(JSON.stringify(currentState));

    let sheetsProcessed = 0;
    let topicsImported = 0;
    let deadlinesImported = 0;
    let assessmentsImported = 0;
    let setupImported = false;
    let studyOrderImported = false;
    let totalSkipped = 0;
    let totalDuplicates = 0;
    const errors: string[] = [];

    // Filter enabled sheets only
    const activeSheets = sheets.filter(s => s.enabled && s.category !== 'skip');

    // Step 1: Process Setup Sheet first if present
    const setupSheet = activeSheets.find(s => s.category === 'setup');
    if (setupSheet && setupSheet.setupData) {
      try {
        const sd = setupSheet.setupData;
        if (sd.userProfile) {
          newState.userProfile = { ...newState.userProfile, ...sd.userProfile, updatedAt: new Date().toISOString() };
        }
        if (sd.examPlan) {
          newState.examPlan = { ...newState.examPlan, ...sd.examPlan };
        }
        if (sd.weeklySchedule && sd.weeklySchedule.length > 0) {
          newState.weeklySchedule = sd.weeklySchedule;
        }
        if (sd.workPeriod) {
          newState.workPeriod = { ...newState.workPeriod, ...sd.workPeriod };
        }
        if (sd.restDays && sd.restDays.length > 0) {
          if (strategy === 'replace') {
            newState.restDays = sd.restDays;
          } else {
            sd.restDays.forEach(rd => {
              if (!newState.restDays.some(r => r.date === rd.date)) newState.restDays.push(rd);
            });
          }
        }
        if (sd.materials) {
          newState.studyMaterials = { ...newState.studyMaterials, ...sd.materials };
        }
        if (sd.weeklyReviewTask) {
          newState.weeklyReviewTask = sd.weeklyReviewTask;
        }
        if (sd.deadlines && sd.deadlines.length > 0) {
          if (strategy === 'replace') {
            newState.deadlines = sd.deadlines;
            deadlinesImported += sd.deadlines.length;
          } else {
            sd.deadlines.forEach(dl => {
              const existingIdx = newState.deadlines.findIndex(
                d => d.title.toLowerCase() === dl.title.toLowerCase() && d.dueDate === dl.dueDate
              );
              if (existingIdx >= 0) {
                totalDuplicates++;
                if (strategy === 'update') {
                  newState.deadlines[existingIdx] = { ...newState.deadlines[existingIdx], ...dl };
                } else {
                  totalSkipped++;
                }
              } else {
                newState.deadlines.push(dl);
                deadlinesImported++;
              }
            });
          }
        }
        setupImported = true;
        sheetsProcessed++;
      } catch (err: any) {
        errors.push(`Error importing Setup sheet: ${err.message}`);
      }
    }

    // Step 2: Process Topics Sheets
    const topicSheets = activeSheets.filter(s => s.category === 'topics');
    if (topicSheets.length > 0) {
      topicSheets.forEach(ts => {
        try {
          const validRecords = (ts.records || []).filter(r => r.isValid);
          if (strategy === 'replace' && ts.subject) {
            // Replace only topics for this subject
            newState.topics = newState.topics.filter(t => t.subject !== ts.subject);
            validRecords.forEach((r, idx) => {
              newState.topics.push({
                id: `topic_${ts.subject}_${Date.now()}_${idx}`,
                code: r.parsedData.code,
                name: r.parsedData.name,
                subject: r.parsedData.subject || ts.subject,
                difficulty: r.parsedData.difficulty || 'Medium',
                estimatedDuration: r.parsedData.estimatedDuration || 60,
                tosArea: r.parsedData.tosArea,
                items: r.parsedData.items,
                studyDays: r.parsedData.studyDays || 1,
                status: r.parsedData.status || 'Not started',
                subtopics: [],
                notes: r.parsedData.notes,
              });
              topicsImported++;
            });
          } else {
            validRecords.forEach((r, idx) => {
              const code = String(r.parsedData.code || '').trim().toUpperCase();
              const existingIdx = newState.topics.findIndex(t => t.code.toUpperCase() === code);

              if (existingIdx >= 0) {
                totalDuplicates++;
                if (strategy === 'update') {
                  newState.topics[existingIdx] = {
                    ...newState.topics[existingIdx],
                    name: r.parsedData.name || newState.topics[existingIdx].name,
                    difficulty: r.parsedData.difficulty || newState.topics[existingIdx].difficulty,
                    estimatedDuration: r.parsedData.estimatedDuration || newState.topics[existingIdx].estimatedDuration,
                    tosArea: r.parsedData.tosArea || newState.topics[existingIdx].tosArea,
                    items: r.parsedData.items !== undefined ? r.parsedData.items : newState.topics[existingIdx].items,
                    studyDays: r.parsedData.studyDays || newState.topics[existingIdx].studyDays,
                    status: r.parsedData.status || newState.topics[existingIdx].status,
                    notes: r.parsedData.notes || newState.topics[existingIdx].notes,
                  };
                } else {
                  totalSkipped++;
                }
              } else {
                newState.topics.push({
                  id: `topic_${r.parsedData.subject || ts.subject}_${Date.now()}_${idx}`,
                  code: r.parsedData.code,
                  name: r.parsedData.name,
                  subject: r.parsedData.subject || ts.subject,
                  difficulty: r.parsedData.difficulty || 'Medium',
                  estimatedDuration: r.parsedData.estimatedDuration || 60,
                  tosArea: r.parsedData.tosArea,
                  items: r.parsedData.items,
                  studyDays: r.parsedData.studyDays || 1,
                  status: r.parsedData.status || 'Not started',
                  subtopics: [],
                  notes: r.parsedData.notes,
                });
                topicsImported++;
              }
            });
          }
          sheetsProcessed++;
        } catch (err: any) {
          errors.push(`Error importing topic sheet ${ts.sheetName}: ${err.message}`);
        }
      });
    }

    // Step 3: Process Assessments Sheets (Preboards, Monthly Assessments)
    const assessmentSheets = activeSheets.filter(s => s.category === 'assessments');
    if (assessmentSheets.length > 0) {
      if (!newState.assessments) newState.assessments = [];

      assessmentSheets.forEach(asSheet => {
        try {
          const assessmentsToImport: AssessmentRecord[] = asSheet.assessmentsData || [];
          assessmentsToImport.forEach(importedAssessment => {
            const existingIdx = newState.assessments!.findIndex(
              a =>
                a.id === importedAssessment.id ||
                a.title.toLowerCase() === importedAssessment.title.toLowerCase() ||
                a.type === importedAssessment.type
            );

            if (existingIdx >= 0) {
              totalDuplicates++;
              if (strategy === 'replace') {
                newState.assessments![existingIdx] = {
                  ...newState.assessments![existingIdx],
                  ...importedAssessment,
                  topics: importedAssessment.topics,
                };
                assessmentsImported++;
              } else if (strategy === 'update') {
                // Merge topics: preserve existing completion unless imported has done
                const currentTopics = newState.assessments![existingIdx].topics;
                const mergedTopics: AssessmentTopicItem[] = [...currentTopics];

                importedAssessment.topics.forEach(newTop => {
                  const topIdx = mergedTopics.findIndex(
                    t =>
                      (newTop.topicCode && t.topicCode === newTop.topicCode) ||
                      t.name.trim().toLowerCase() === newTop.name.trim().toLowerCase()
                  );
                  if (topIdx >= 0) {
                    mergedTopics[topIdx] = {
                      ...mergedTopics[topIdx],
                      isCompleted: newTop.isCompleted || mergedTopics[topIdx].isCompleted,
                    };
                  } else {
                    mergedTopics.push(newTop);
                  }
                });

                newState.assessments![existingIdx] = {
                  ...newState.assessments![existingIdx],
                  topics: mergedTopics,
                };
                assessmentsImported++;
              } else {
                totalSkipped++;
              }
            } else {
              newState.assessments!.push(importedAssessment);
              assessmentsImported++;
            }
          });
          sheetsProcessed++;
        } catch (err: any) {
          errors.push(`Error importing assessment sheet ${asSheet.sheetName}: ${err.message}`);
        }
      });
    }

    // Step 4: Process Sessions Sheets (Study Order, Daily Checklist)
    const sessionSheets = activeSheets.filter(s => s.category === 'sessions');
    if (sessionSheets.length > 0) {
      sessionSheets.forEach(ss => {
        try {
          const validRecords = (ss.records || []).filter(r => r.isValid);
          if (validRecords.length > 0) {
            if (strategy === 'replace') {
              newState.sessions = validRecords.map((r, i) => ({
                id: `session_wb_${Date.now()}_${i}`,
                date: r.parsedData.date || new Date().toISOString().split('T')[0],
                type: 'STUDY',
                subject: r.parsedData.subject,
                topicCode: r.parsedData.topicCode,
                topicName: r.parsedData.topicName,
                plannedDuration: r.parsedData.plannedDuration || 60,
                actualDuration: r.parsedData.actualDuration || 0,
                status: r.parsedData.status || 'Not started',
                notes: r.parsedData.notes,
                materials: r.parsedData.materials,
              }));
            } else {
              validRecords.forEach((r, i) => {
                const date = r.parsedData.date;
                const topicCode = String(r.parsedData.topicCode || '').trim().toUpperCase();
                const existingIdx = newState.sessions.findIndex(
                  s => s.date === date && (s.topicCode || '').toUpperCase() === topicCode
                );

                if (existingIdx >= 0) {
                  totalDuplicates++;
                  if (strategy === 'update') {
                    newState.sessions[existingIdx] = {
                      ...newState.sessions[existingIdx],
                      plannedDuration: r.parsedData.plannedDuration || newState.sessions[existingIdx].plannedDuration,
                      actualDuration: r.parsedData.actualDuration || newState.sessions[existingIdx].actualDuration,
                      status: r.parsedData.status || newState.sessions[existingIdx].status,
                      notes: r.parsedData.notes || newState.sessions[existingIdx].notes,
                    };
                  } else {
                    totalSkipped++;
                  }
                } else {
                  newState.sessions.push({
                    id: `session_wb_${Date.now()}_${i}`,
                    date: date || new Date().toISOString().split('T')[0],
                    type: 'STUDY',
                    subject: r.parsedData.subject,
                    topicCode: r.parsedData.topicCode,
                    topicName: r.parsedData.topicName,
                    plannedDuration: r.parsedData.plannedDuration || 60,
                    actualDuration: r.parsedData.actualDuration || 0,
                    status: r.parsedData.status || 'Not started',
                    notes: r.parsedData.notes,
                    materials: r.parsedData.materials,
                  });
                }
              });
            }
            studyOrderImported = true;
          }
          sheetsProcessed++;
        } catch (err: any) {
          errors.push(`Error importing session sheet ${ss.sheetName}: ${err.message}`);
        }
      });
    }

    const summary: WorkbookImportResultSummary = {
      id: `wb_import_${Date.now()}`,
      timestamp: new Date().toISOString(),
      filename,
      strategy,
      sheetsProcessed,
      topicsImported,
      deadlinesImported,
      assessmentsImported,
      setupImported,
      studyOrderImported,
      totalSkipped,
      totalDuplicates,
      errors,
    };

    // Record in import history
    if (!newState.importHistory) newState.importHistory = [];
    newState.importHistory.unshift({
      id: summary.id,
      timestamp: summary.timestamp,
      filename,
      sheetName: `Whole Workbook (${sheetsProcessed} sheets)`,
      category: 'auto',
      strategy,
      addedCount: topicsImported + deadlinesImported + assessmentsImported,
      updatedCount: 0,
      skippedCount: totalSkipped,
      errorCount: errors.length,
      issues: errors.map((msg, idx) => ({
        row: idx + 1,
        field: 'workbook',
        message: msg,
        severity: 'error',
      })),
    });

    return { newState, result: summary };
  }
}
