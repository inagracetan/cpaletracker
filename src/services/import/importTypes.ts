import { 
  SubjectCode, 
  Deadline, 
  StudyMaterial, 
  UserProfile, 
  ExamPlan, 
  DayRoutine, 
  WorkPeriod, 
  RestDay,
  ImportStrategy,
  ImportCategory,
  ImportValidationIssue
} from '../../types';

export interface FieldMappingDefinition {
  appField: string;
  label: string;
  required: boolean;
  aliases: string[];
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'subject';
  enumValues?: string[];
  description?: string;
}

export interface ColumnMappingItem {
  appField: string;
  spreadsheetColumn: string; // Column header name or index
  spreadsheetColumnIndex: number;
  sampleValue?: any;
}

export interface SheetDetectionInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  detectedCategory: ImportCategory;
  confidence: number; // 0 to 1
  headers: string[];
  rawRows: any[][];
}

export interface DuplicateMatch {
  rowIndex: number;
  recordIdentifier: string;
  matchedId: string;
  matchedTitle: string;
  reason: string;
  isExact: boolean;
}

export interface MappedImportRecord {
  rowIndex: number;
  originalRow: any[];
  parsedData: Record<string, any>;
  isValid: boolean;
  issues: ImportValidationIssue[];
  duplicateMatch?: DuplicateMatch;
}

export interface ParsedWorkbookData {
  filename: string;
  fileSize: number;
  fileType: 'xlsx' | 'xls' | 'csv';
  sheets: SheetDetectionInfo[];
  selectedSheetIndex: number;
}

export interface ImportPreviewResult {
  filename: string;
  sheetName: string;
  category: ImportCategory;
  headers: string[];
  columnMappings: ColumnMappingItem[];
  availableFields: FieldMappingDefinition[];
  records: MappedImportRecord[];
  summary: {
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
    duplicateRows: number;
  };
}

export interface ImportExecutionPayload {
  filename: string;
  sheetName?: string;
  category: ImportCategory;
  strategy: ImportStrategy;
  records: MappedImportRecord[];
  // For setup sheet imports
  setupData?: {
    userProfile?: Partial<UserProfile>;
    examPlan?: Partial<ExamPlan>;
    weeklySchedule?: DayRoutine[];
    workPeriod?: Partial<WorkPeriod>;
    restDays?: RestDay[];
    materials?: Partial<Record<SubjectCode, StudyMaterial>>;
    weeklyReviewTask?: string;
    deadlines?: Deadline[];
  };
}

export interface SheetProcessingPlan {
  sheetName: string;
  category: ImportCategory | 'skip';
  enabled: boolean;
  rowCount: number;
  detectedRecordsCount: number;
  subject?: SubjectCode;
  description: string;
  previewSummary: string;
  warnings: string[];
  errors: string[];
  columnMappings?: ColumnMappingItem[];
  records?: MappedImportRecord[];
  assessmentsData?: any[];
  setupData?: ImportExecutionPayload['setupData'];
}

export interface WorkbookWidePreview {
  filename: string;
  fileSize: number;
  fileType: 'xlsx' | 'xls' | 'csv';
  sheets: SheetProcessingPlan[];
  overallSummary: {
    totalSheets: number;
    enabledSheets: number;
    expectedTopics: number;
    expectedDeadlines: number;
    expectedAssessments: number;
    hasSetupData: boolean;
    hasStudyOrder: boolean;
    totalWarnings: number;
    totalErrors: number;
  };
}

export interface WorkbookImportExecutionPayload {
  filename: string;
  strategy: ImportStrategy;
  sheets: SheetProcessingPlan[];
}

export interface WorkbookImportResultSummary {
  id: string;
  timestamp: string;
  filename: string;
  strategy: ImportStrategy;
  sheetsProcessed: number;
  topicsImported: number;
  deadlinesImported: number;
  assessmentsImported: number;
  setupImported: boolean;
  studyOrderImported: boolean;
  totalSkipped: number;
  totalDuplicates: number;
  errors: string[];
}
