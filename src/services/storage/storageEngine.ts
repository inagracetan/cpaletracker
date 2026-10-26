import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppStateData } from '../../types';
import {
  DEFAULT_USER_PROFILE,
  DEFAULT_EXAM_PLAN,
  DEFAULT_WEEKLY_SCHEDULE,
  DEFAULT_WORK_PERIOD,
  DEFAULT_STUDY_MATERIALS,
  DEFAULT_WEEKLY_REVIEW_TASK,
  DEFAULT_PREFERENCES,
  DEFAULT_SYNC_METADATA,
} from '../../data/defaultSetup';
import { IndexedDbStorage, STORES } from './indexedDbStorage';

export const STORAGE_KEY = '@cpale_tracker_state_v1';
const IDB_STATE_KEY = 'current_state';

/** Tracker / reminder keys that must be wiped on Reset (nav order UI prefs are kept). */
const TRACKER_LOCAL_KEYS = [
  STORAGE_KEY,
  '@cpale_scheduled_reminders_v1',
];

function isTrackerStorageKey(key: string): boolean {
  if (TRACKER_LOCAL_KEYS.includes(key)) return true;
  if (key.startsWith('@cpale_tracker')) return true;
  if (key.startsWith('@cpale_scheduled')) return true;
  return false;
}

/**
 * StorageEngine — persistence for CPALE Tracker.
 *
 * Bootstrap state is intentionally EMPTY of syllabus/sessions/deadlines/assessments.
 * Tracker records are created only via explicit user import or in-app edits.
 */
export class StorageEngine {
  private static memoryCache: AppStateData | null = null;

  /**
   * Empty app bootstrap: preferences / profile shell only — no sample curriculum.
   */
  public static getEmptyState(): AppStateData {
    const now = new Date().toISOString();
    return {
      userProfile: {
        ...DEFAULT_USER_PROFILE,
        createdAt: now,
        updatedAt: now,
      },
      examPlan: { ...DEFAULT_EXAM_PLAN },
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE.map((d) => ({ ...d })),
      workPeriod: { ...DEFAULT_WORK_PERIOD },
      restDays: [],
      studyMaterials: {
        FAR: { ...DEFAULT_STUDY_MATERIALS.FAR },
        AFAR: { ...DEFAULT_STUDY_MATERIALS.AFAR },
        MS: { ...DEFAULT_STUDY_MATERIALS.MS },
        TAX: { ...DEFAULT_STUDY_MATERIALS.TAX },
        AUD: { ...DEFAULT_STUDY_MATERIALS.AUD },
        RFBT: { ...DEFAULT_STUDY_MATERIALS.RFBT },
      },
      weeklyReviewTask: DEFAULT_WEEKLY_REVIEW_TASK,
      topics: [],
      sessions: [],
      deadlines: [],
      practiceAttempts: [],
      preferences: { ...DEFAULT_PREFERENCES },
      syncMetadata: { ...DEFAULT_SYNC_METADATA },
      hasCompletedOnboarding: false,
      badges: [],
      achievementNotifications: [],
      importHistory: [],
      assessments: [],
      customCategories: [],
    };
  }

  /** Alias used throughout the app — always empty of sample tracker data. */
  public static getDefaultState(): AppStateData {
    return this.getEmptyState();
  }

  private static normalizeLoadedState(raw: Partial<AppStateData> | null | undefined): AppStateData {
    const empty = this.getEmptyState();
    if (!raw || typeof raw !== 'object') return empty;

    return {
      ...empty,
      ...raw,
      userProfile: { ...empty.userProfile, ...(raw.userProfile || {}) },
      examPlan: { ...empty.examPlan, ...(raw.examPlan || {}) },
      workPeriod: { ...empty.workPeriod, ...(raw.workPeriod || {}) },
      preferences: { ...empty.preferences, ...(raw.preferences || {}) },
      syncMetadata: { ...empty.syncMetadata, ...(raw.syncMetadata || {}) },
      weeklySchedule: Array.isArray(raw.weeklySchedule) && raw.weeklySchedule.length > 0
        ? raw.weeklySchedule
        : empty.weeklySchedule,
      studyMaterials: raw.studyMaterials
        ? { ...empty.studyMaterials, ...raw.studyMaterials }
        : empty.studyMaterials,
      // Never re-seed sample curriculum when arrays are missing or empty
      topics: Array.isArray(raw.topics) ? raw.topics : [],
      // Sessions without an imported topic bank are treated as phantom schedule data
      // (legacy Recommended-mode used DEFAULT_STUDY_ORDER even with empty topics).
      sessions:
        Array.isArray(raw.topics) && raw.topics.length > 0 && Array.isArray(raw.sessions)
          ? raw.sessions
          : [],
      deadlines: Array.isArray(raw.deadlines) ? raw.deadlines : [],
      practiceAttempts: Array.isArray(raw.practiceAttempts) ? raw.practiceAttempts : [],
      restDays: Array.isArray(raw.restDays) ? raw.restDays : [],
      badges: Array.isArray(raw.badges) ? raw.badges : [],
      achievementNotifications: Array.isArray(raw.achievementNotifications)
        ? raw.achievementNotifications
        : [],
      importHistory: Array.isArray(raw.importHistory) ? raw.importHistory : [],
      assessments: Array.isArray(raw.assessments) ? raw.assessments : [],
      customCategories: Array.isArray(raw.customCategories) ? raw.customCategories : [],
      hasCompletedOnboarding: Boolean(raw.hasCompletedOnboarding),
    };
  }

  public static async loadState(): Promise<AppStateData> {
    try {
      const idbState = await IndexedDbStorage.getItem<AppStateData>(STORES.APP_STATE, IDB_STATE_KEY);
      if (idbState) {
        const state = this.normalizeLoadedState(idbState);
        this.memoryCache = state;
        // Persist sanitized state when legacy phantom sessions were stripped
        const rawSessions = Array.isArray(idbState.sessions) ? idbState.sessions.length : 0;
        if (state.topics.length === 0 && rawSessions > 0) {
          this.saveState(state).catch(() => {});
        }
        return state;
      }

      let raw: string | null = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(STORAGE_KEY);
      }
      if (!raw) {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
      }

      if (raw) {
        const parsed = JSON.parse(raw) as AppStateData;
        const state = this.normalizeLoadedState(parsed);
        this.memoryCache = state;
        // Always write normalized state to IDB (and strip phantoms from localStorage)
        this.saveState(state).catch(() => {});
        return state;
      }
    } catch (error) {
      console.warn('StorageEngine: Error loading state, falling back to empty', error);
    }

    const initial = this.getEmptyState();
    this.memoryCache = initial;
    return initial;
  }

  public static async saveState(state: AppStateData): Promise<void> {
    this.memoryCache = state;
    try {
      IndexedDbStorage.setItem(STORES.APP_STATE, IDB_STATE_KEY, state).catch((err) => {
        console.warn('StorageEngine: IndexedDB save background error', err);
      });

      const json = JSON.stringify(state);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, json);
      }
      await AsyncStorage.setItem(STORAGE_KEY, json);
    } catch (error) {
      console.error('StorageEngine: Error saving state', error);
      throw error;
    }
  }

  public static getCachedState(): AppStateData {
    return this.memoryCache || this.getEmptyState();
  }

  /**
   * Permanently wipe tracker data from memory, IndexedDB, localStorage,
   * sessionStorage, and AsyncStorage. Does not restore sample records.
   * Preserves UI-only keys such as nav order (`cpale_nav_order`).
   */
  public static async clearAll(): Promise<void> {
    this.memoryCache = null;

    try {
      await IndexedDbStorage.clearStore(STORES.APP_STATE);
      await IndexedDbStorage.clearStore(STORES.REMINDERS);
      await IndexedDbStorage.clearStore(STORES.OFFLINE_QUEUE);
      await IndexedDbStorage.deleteDatabase();
    } catch (e) {
      console.warn('StorageEngine: IndexedDB clear error', e);
    }

    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          const toRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && isTrackerStorageKey(key)) toRemove.push(key);
          }
          for (const key of toRemove) {
            window.localStorage.removeItem(key);
          }
        }
        if (window.sessionStorage) {
          const toRemove: string[] = [];
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            if (key && isTrackerStorageKey(key)) toRemove.push(key);
          }
          for (const key of toRemove) {
            window.sessionStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.warn('StorageEngine: Web storage clear error', e);
    }

    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem('@cpale_scheduled_reminders_v1');
      if (typeof (AsyncStorage as { getAllKeys?: () => Promise<readonly string[]> }).getAllKeys === 'function') {
        const allKeys = await AsyncStorage.getAllKeys();
        const trackerKeys = allKeys.filter((key) => isTrackerStorageKey(key));
        await Promise.all(trackerKeys.map((key) => AsyncStorage.removeItem(key)));
      }
    } catch (e) {
      console.warn('StorageEngine: AsyncStorage clear error', e);
    }
  }
}
