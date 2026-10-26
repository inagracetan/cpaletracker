import { describe, it, expect, beforeEach } from 'vitest';
import { StorageEngine } from '../src/services/storage/storageEngine';
import { SchedulingEngine } from '../src/services/scheduler/schedulingEngine';
import { ImportEngine } from '../src/services/import/importEngine';
import { DEFAULT_TOPICS } from '../src/data/defaultTopics';
import { DEFAULT_STUDY_MATERIALS, DEFAULT_WEEKLY_REVIEW_TASK } from '../src/data/defaultSetup';

/**
 * End-to-end persistence flow:
 * empty → import topics → schedule → reset → still empty after reload → re-import only new data
 */
describe('Empty → Import → Reset → Reload flow', () => {
  beforeEach(async () => {
    await StorageEngine.clearAll();
  });

  it('starts empty, keeps only imported data, and stays empty after reset + reload', async () => {
    // 1. Start with no data
    let state = await StorageEngine.loadState();
    expect(state.topics).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.deadlines).toEqual([]);
    expect(state.assessments).toEqual([]);

    // 2. Import-like write (topics only)
    const importedTopics = JSON.parse(JSON.stringify(DEFAULT_TOPICS.slice(0, 5)));
    state = {
      ...state,
      topics: importedTopics,
      importHistory: [
        {
          id: 'imp-flow-1',
          timestamp: new Date().toISOString(),
          filename: 'topics.xlsx',
          category: 'topics',
          strategy: 'replace',
          addedCount: 5,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          issues: [],
        },
      ],
    };

    const schedule = SchedulingEngine.generateSchedule({
      examPlan: state.examPlan,
      weeklySchedule: state.weeklySchedule,
      workPeriod: state.workPeriod,
      isWorking: state.userProfile.isWorking,
      restDays: state.restDays,
      topics: state.topics,
      studyMaterials: state.studyMaterials,
      weeklyReviewTask: state.weeklyReviewTask,
    });
    state.sessions = schedule.sessions;
    expect(state.sessions.length).toBeGreaterThan(0);
    expect(state.sessions.filter((s) => s.type === 'STUDY').every((s) =>
      importedTopics.some((t: { code: string }) => t.code === s.topicCode)
    )).toBe(true);

    await StorageEngine.saveState(state);

    // 3. Reload still has imported data only
    let loaded = await StorageEngine.loadState();
    expect(loaded.topics.length).toBe(5);
    expect(loaded.sessions.length).toBeGreaterThan(0);
    expect(loaded.topics.map((t) => t.code).sort()).toEqual(
      importedTopics.map((t: { code: string }) => t.code).sort()
    );

    // 4. Reset clears everything
    await StorageEngine.clearAll();
    const empty = StorageEngine.getEmptyState();
    await StorageEngine.saveState(empty);

    loaded = await StorageEngine.loadState();
    expect(loaded.topics).toEqual([]);
    expect(loaded.sessions).toEqual([]);
    expect(loaded.importHistory).toEqual([]);
    expect(loaded.deadlines).toEqual([]);
    expect(loaded.assessments).toEqual([]);

    // 5. Schedule regen after reset cannot invent curriculum
    const afterResetSchedule = SchedulingEngine.generateSchedule({
      examPlan: loaded.examPlan,
      weeklySchedule: loaded.weeklySchedule,
      workPeriod: loaded.workPeriod,
      isWorking: loaded.userProfile.isWorking,
      restDays: loaded.restDays,
      topics: loaded.topics,
      studyMaterials: DEFAULT_STUDY_MATERIALS,
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
    });
    expect(afterResetSchedule.sessions).toEqual([]);

    // 6. Re-import a different subset — only that data appears
    const secondImport = JSON.parse(JSON.stringify(DEFAULT_TOPICS.slice(10, 13)));
    loaded = {
      ...loaded,
      topics: secondImport,
    };
    const secondSchedule = SchedulingEngine.generateSchedule({
      examPlan: loaded.examPlan,
      weeklySchedule: loaded.weeklySchedule,
      workPeriod: loaded.workPeriod,
      isWorking: loaded.userProfile.isWorking,
      restDays: loaded.restDays,
      topics: loaded.topics,
      studyMaterials: loaded.studyMaterials,
      weeklyReviewTask: loaded.weeklyReviewTask,
    });
    loaded.sessions = secondSchedule.sessions;
    await StorageEngine.saveState(loaded);

    const finalLoad = await StorageEngine.loadState();
    expect(finalLoad.topics.length).toBe(3);
    expect(finalLoad.topics.map((t) => t.code).sort()).toEqual(
      secondImport.map((t: { code: string }) => t.code).sort()
    );
    expect(finalLoad.topics.some((t) => importedTopics.some((x: { code: string }) => x.code === t.code))).toBe(false);
  });

  it('rejects empty sheet import without inventing sample rows', () => {
    const empty = StorageEngine.getEmptyState();
    const preview = ImportEngine.generatePreview(
      {
        name: 'Topics',
        headers: ['Subject', 'Code', 'Topic Name'],
        rawRows: [],
        rowCount: 0,
      } as any,
      'topics',
      [
        { appField: 'subject', spreadsheetColumn: 'Subject', spreadsheetColumnIndex: 0 },
        { appField: 'code', spreadsheetColumn: 'Code', spreadsheetColumnIndex: 1 },
        { appField: 'name', spreadsheetColumn: 'Topic Name', spreadsheetColumnIndex: 2 },
      ],
      empty
    );
    expect(preview.summary.validRows).toBe(0);
    expect(preview.summary.errorRows).toBe(0);
    expect(preview.records?.length ?? 0).toBe(0);
  });
});
