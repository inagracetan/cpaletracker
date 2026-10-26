import { describe, it, expect, beforeEach } from 'vitest';
import { StorageEngine, STORAGE_KEY } from '../src/services/storage/storageEngine';
import { DEFAULT_TOPICS } from '../src/data/defaultTopics';
import { DEFAULT_DEADLINES } from '../src/data/defaultDeadlines';

describe('StorageEngine empty bootstrap & Reset', () => {
  beforeEach(async () => {
    await StorageEngine.clearAll();
  });

  it('starts with completely empty tracker collections (no sample curriculum)', () => {
    const empty = StorageEngine.getEmptyState();
    expect(empty.topics).toEqual([]);
    expect(empty.sessions).toEqual([]);
    expect(empty.deadlines).toEqual([]);
    expect(empty.assessments).toEqual([]);
    expect(empty.practiceAttempts).toEqual([]);
    expect(empty.restDays).toEqual([]);
    expect(empty.importHistory).toEqual([]);
    expect(empty.badges).toEqual([]);
  });

  it('getDefaultState matches empty bootstrap (no auto-seed)', () => {
    const def = StorageEngine.getDefaultState();
    expect(def.topics.length).toBe(0);
    expect(def.assessments?.length ?? 0).toBe(0);
    expect(def.deadlines.length).toBe(0);
  });

  it('loadState returns empty when nothing is stored', async () => {
    const loaded = await StorageEngine.loadState();
    expect(loaded.topics).toEqual([]);
    expect(loaded.sessions).toEqual([]);
    expect(loaded.deadlines).toEqual([]);
    expect(loaded.assessments).toEqual([]);
  });

  it('persists imported-like data and clears it permanently on clearAll', async () => {
    const state = StorageEngine.getEmptyState();
    state.topics = JSON.parse(JSON.stringify(DEFAULT_TOPICS.slice(0, 3)));
    state.deadlines = JSON.parse(JSON.stringify(DEFAULT_DEADLINES.slice(0, 2)));
    state.sessions = [
      {
        id: 's1',
        date: '2026-10-01',
        type: 'STUDY',
        plannedDuration: 60,
        actualDuration: 0,
        status: 'Not started',
        topicCode: 'FAR-01',
      },
    ];
    state.importHistory = [
      {
        id: 'imp1',
        timestamp: new Date().toISOString(),
        filename: 'test.xlsx',
        category: 'topics',
        strategy: 'replace',
        addedCount: 3,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        issues: [],
      },
    ];

    await StorageEngine.saveState(state);
    const loaded = await StorageEngine.loadState();
    expect(loaded.topics.length).toBe(3);
    expect(loaded.deadlines.length).toBe(2);
    expect(loaded.sessions.length).toBe(1);
    expect(loaded.importHistory?.length).toBe(1);

    await StorageEngine.clearAll();
    const afterReset = await StorageEngine.loadState();
    expect(afterReset.topics).toEqual([]);
    expect(afterReset.sessions).toEqual([]);
    expect(afterReset.deadlines).toEqual([]);
    expect(afterReset.assessments).toEqual([]);
    expect(afterReset.importHistory).toEqual([]);

    if (typeof window !== 'undefined' && window.localStorage) {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    }
  });

  it('does not re-seed assessments when saved assessments array is empty', async () => {
    const state = StorageEngine.getEmptyState();
    state.assessments = [];
    await StorageEngine.saveState(state);
    const loaded = await StorageEngine.loadState();
    expect(loaded.assessments).toEqual([]);
  });

  it('strips phantom sessions when topics are empty (legacy schedule bug)', async () => {
    const state = StorageEngine.getEmptyState();
    state.topics = [];
    state.sessions = [
      {
        id: 'phantom',
        date: '2026-10-01',
        type: 'MASTERY',
        plannedDuration: 60,
        actualDuration: 0,
        status: 'Not started',
      },
    ];
    await StorageEngine.saveState(state);
    const loaded = await StorageEngine.loadState();
    expect(loaded.topics).toEqual([]);
    expect(loaded.sessions).toEqual([]);
  });
});
