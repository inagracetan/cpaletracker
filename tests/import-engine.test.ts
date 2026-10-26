import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ImportEngine } from '../src/services/import/importEngine';
import { StorageEngine } from '../src/services/storage/storageEngine';
import { CSVService } from '../src/services/csv/csvService';
import { DEFAULT_TOPICS } from '../src/data/defaultTopics';

describe('ImportEngine', () => {
  // Empty bootstrap (production behavior). Seed fixtures only inside tests that need them.
  const emptyState = StorageEngine.getEmptyState();
  const seededState = {
    ...StorageEngine.getEmptyState(),
    topics: JSON.parse(JSON.stringify(DEFAULT_TOPICS)),
  };

  it('reads and parses Setup.csv correctly', () => {
    const csvPath = path.resolve(__dirname, '../docs-and-source/CPALE Tracker (MAY 2027 CPA) - Setup.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const wbData = ImportEngine.readWorkbook(csvContent, 'CPALE Tracker (MAY 2027 CPA) - Setup.csv');
    expect(wbData.fileType).toBe('csv');
    expect(wbData.sheets.length).toBe(1);
    expect(wbData.sheets[0].detectedCategory).toBe('setup');

    const setupResult = CSVService.parseSetupCSV(csvContent);
    expect(setupResult.userProfile?.nickname).toBe('Future CPA');
    expect(setupResult.examPlan?.studyStartDate).toBe('2026-08-24');
    expect(setupResult.examPlan?.examDay1).toBe('2027-05-23');
    expect(setupResult.weeklySchedule?.length).toBeGreaterThan(0);
    expect(setupResult.deadlines?.length).toBeGreaterThan(0);
  });

  it('reads and parses multi-sheet Excel workbook .xlsx correctly', () => {
    const xlsxPath = path.resolve(__dirname, '../docs-and-source/CPALE Tracker (MAY 2027 CPA).xlsx');
    const buffer = fs.readFileSync(xlsxPath);

    const wbData = ImportEngine.readWorkbook(buffer, 'CPALE Tracker (MAY 2027 CPA).xlsx');
    expect(wbData.fileType).toBe('xlsx');
    expect(wbData.sheets.length).toBeGreaterThan(10);

    const farSheet = wbData.sheets.find(s => s.name === 'FAR');
    expect(farSheet).toBeDefined();
    expect(farSheet?.detectedCategory).toBe('topics');

    const mappings = ImportEngine.suggestColumnMappings(farSheet!.headers, ImportEngine.TOPIC_FIELDS);
    expect(mappings.some(m => m.appField === 'code')).toBe(true);
    expect(mappings.some(m => m.appField === 'name')).toBe(true);

    const preview = ImportEngine.generatePreview(farSheet!, 'topics', mappings, emptyState);
    expect(preview.records.length).toBeGreaterThan(5);
    expect(preview.summary.totalRows).toBeGreaterThan(5);
    expect(preview.records[0].parsedData.code).toBe('FAR-01');
    expect(preview.records[0].parsedData.subject).toBe('FAR');
  });

  it('handles duplicate detection and import strategies properly', () => {
    const testSheetInfo = {
      name: 'Topics',
      rowCount: 3,
      columnCount: 3,
      detectedCategory: 'topics' as const,
      confidence: 1,
      headers: ['Code', 'Topic Name', 'Subject'],
      rawRows: [
        ['FAR-01', 'Intro to Accountancy (Updated)', 'FAR'],
        ['NEW-99', 'Brand New Topic', 'FAR'],
      ]
    };

    const mappings = [
      { appField: 'code', spreadsheetColumn: 'Code', spreadsheetColumnIndex: 0 },
      { appField: 'name', spreadsheetColumn: 'Topic Name', spreadsheetColumnIndex: 1 },
      { appField: 'subject', spreadsheetColumn: 'Subject', spreadsheetColumnIndex: 2 },
    ];

    const preview = ImportEngine.generatePreview(testSheetInfo, 'topics', mappings, seededState);
    expect(preview.records[0].duplicateMatch).toBeDefined();
    expect(preview.records[0].duplicateMatch?.isExact).toBe(true);
    expect(preview.records[1].duplicateMatch).toBeUndefined();

    // Test 'add' strategy - existing should be skipped
    const addResult = ImportEngine.executeImport({
      filename: 'test.csv',
      category: 'topics',
      strategy: 'add',
      records: preview.records,
    }, seededState);
    expect(addResult.result.addedCount).toBe(1);
    expect(addResult.result.skippedCount).toBe(1);

    // Test 'update' strategy - existing should be updated
    const updateResult = ImportEngine.executeImport({
      filename: 'test.csv',
      category: 'topics',
      strategy: 'update',
      records: preview.records,
    }, seededState);
    expect(updateResult.result.addedCount).toBe(1);
    expect(updateResult.result.updatedCount).toBe(1);
    const updatedTopic = updateResult.newState.topics.find(t => t.code === 'FAR-01');
    expect(updatedTopic?.name).toBe('Intro to Accountancy (Updated)');

    // Test 'replace' strategy - replaces only topics, other data intact
    const replaceResult = ImportEngine.executeImport({
      filename: 'test.csv',
      category: 'topics',
      strategy: 'replace',
      records: preview.records,
    }, seededState);
    expect(replaceResult.newState.topics.length).toBe(2);
    expect(replaceResult.newState.deadlines.length).toBe(seededState.deadlines.length); // Deadlines untouched!
  });

  it('generates downloadable error report CSV when there are errors', () => {
    const errorHistory = {
      id: 'import_123',
      timestamp: new Date().toISOString(),
      filename: 'bad_data.csv',
      category: 'deadlines' as const,
      strategy: 'add' as const,
      addedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 2,
      issues: [
        { row: 2, field: 'dueDate', severity: 'error' as const, message: 'Invalid due date: "not-a-date"', rawValue: 'not-a-date' },
        { row: 5, field: 'title', severity: 'error' as const, message: 'Deadline title is required' }
      ]
    };

    const csvReport = ImportEngine.generateErrorReportCSV(errorHistory);
    expect(csvReport).toContain('Row Number');
    expect(csvReport).toContain('not-a-date');
    expect(csvReport).toContain('Deadline title is required');
  });

  it('performs whole-workbook wide analysis across all 17 worksheets', () => {
    const xlsxPath = path.resolve(__dirname, '../docs-and-source/CPALE Tracker (MAY 2027 CPA).xlsx');
    const buffer = fs.readFileSync(xlsxPath);

    const widePreview = ImportEngine.analyzeWorkbookWide(buffer, 'CPALE Tracker (MAY 2027 CPA).xlsx', emptyState);
    expect(widePreview.sheets.length).toBe(17);
    expect(widePreview.overallSummary.totalSheets).toBe(17);

    // Setup sheet
    const setupPlan = widePreview.sheets.find(s => s.sheetName === 'Setup');
    expect(setupPlan).toBeDefined();
    expect(setupPlan?.category).toBe('setup');
    expect(setupPlan?.enabled).toBe(true);
    expect(setupPlan?.setupData?.userProfile?.nickname).toBe('Future CPA');

    // Subject topic sheets
    const subjectCodes = ['FAR', 'AFAR', 'MS', 'TAX', 'AUD', 'RFBT'];
    subjectCodes.forEach(code => {
      const topicPlan = widePreview.sheets.find(s => s.sheetName === code);
      expect(topicPlan).toBeDefined();
      expect(topicPlan?.category).toBe('topics');
      expect(topicPlan?.subject).toBe(code);
      expect(topicPlan?.enabled).toBe(true);
      expect(topicPlan?.detectedRecordsCount).toBeGreaterThan(10);
    });

    // Total expected topics across all 6 subjects in the workbook
    expect(widePreview.overallSummary.expectedTopics).toBe(147);

    // Preboards sheet
    const pbPlan = widePreview.sheets.find(s => s.sheetName === 'Preboards');
    expect(pbPlan).toBeDefined();
    expect(pbPlan?.category).toBe('assessments');
    expect(pbPlan?.enabled).toBe(true);
    expect(pbPlan?.assessmentsData?.length).toBe(2); // First Preboard & Final Preboard
    const firstPb = pbPlan?.assessmentsData?.find(a => a.type === 'first_preboard');
    expect(firstPb?.topics.length).toBe(80);

    // Skipped auxiliary sheets
    const howToUse = widePreview.sheets.find(s => s.sheetName === 'How to Use');
    expect(howToUse?.category).toBe('skip');
    expect(howToUse?.enabled).toBe(false);

    const badgesHall = widePreview.sheets.find(s => s.sheetName === 'Badges Hall');
    expect(badgesHall?.category).toBe('skip');
    expect(badgesHall?.enabled).toBe(false);

    const planEngine = widePreview.sheets.find(s => s.sheetName === 'Plan Engine');
    expect(planEngine?.category).toBe('skip');
    expect(planEngine?.enabled).toBe(false);
  });

  it('executes whole-workbook import atomically across all relevant sheets', () => {
    const xlsxPath = path.resolve(__dirname, '../docs-and-source/CPALE Tracker (MAY 2027 CPA).xlsx');
    const buffer = fs.readFileSync(xlsxPath);

    const widePreview = ImportEngine.analyzeWorkbookWide(buffer, 'CPALE Tracker (MAY 2027 CPA).xlsx', emptyState);
    
    // Execute whole-workbook import into an empty app — only file data is loaded
    const { newState, result } = ImportEngine.executeWorkbookWideImport({
      filename: 'CPALE Tracker (MAY 2027 CPA).xlsx',
      strategy: 'replace',
      sheets: widePreview.sheets,
    }, emptyState);

    expect(result.sheetsProcessed).toBeGreaterThanOrEqual(8);
    expect(result.topicsImported).toBeGreaterThanOrEqual(0);
    expect(result.assessmentsImported).toBeGreaterThanOrEqual(1);
    expect(result.setupImported).toBe(true);

    // Only workbook topics (147), not previously seeded curriculum (165)
    expect(newState.topics.length).toBe(147);
    expect(newState.assessments?.length).toBeGreaterThanOrEqual(2);
    
    // Check First Preboard has 80 topics
    const firstPb = newState.assessments?.find(a => a.type === 'first_preboard');
    expect(firstPb).toBeDefined();
    expect(firstPb?.topics.length).toBe(80);

    // History record added
    expect(newState.importHistory?.length).toBeGreaterThan(0);
    expect(newState.importHistory?.[0].filename).toBe('CPALE Tracker (MAY 2027 CPA).xlsx');
  });
});

