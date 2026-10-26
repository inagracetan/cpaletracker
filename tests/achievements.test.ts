import { describe, it, expect } from 'vitest';
import { AchievementEngine } from '../src/services/achievements/achievementEngine';
import { StorageEngine } from '../src/services/storage/storageEngine';
import { DEFAULT_TOPICS } from '../src/data/defaultTopics';
import { AppStateData } from '../src/types';

describe('AchievementEngine', () => {
  it('calculates streaks correctly with rest day protection', () => {
    const state = StorageEngine.getDefaultState();
    
    // Day 1: 2026-08-24 (Monday) completed
    // Day 2: 2026-08-25 (Tuesday) completed
    // Day 3: 2026-08-26 (Wednesday) scheduled rest day
    // Day 4: 2026-08-27 (Thursday) completed
    state.sessions = [
      { id: 's1', date: '2026-08-24', type: 'STUDY', plannedDuration: 60, actualDuration: 60, status: 'Completed' },
      { id: 's2', date: '2026-08-25', type: 'STUDY', plannedDuration: 60, actualDuration: 60, status: 'Completed' },
      { id: 's4', date: '2026-08-27', type: 'STUDY', plannedDuration: 60, actualDuration: 60, status: 'Completed' },
    ];
    state.restDays = [
      { id: 'rd1', date: '2026-08-26', name: 'Midweek Rest' }
    ];

    const result = AchievementEngine.calculateStreak(state);
    expect(result.longestStreak).toBe(3); // 24th, 25th, and 27th connected by protected rest day!
  });

  it('awards First Step badge when first session is completed', () => {
    const state = StorageEngine.getDefaultState();
    state.sessions = [
      { id: 's1', date: '2026-08-24', type: 'STUDY', plannedDuration: 60, actualDuration: 60, status: 'Completed' }
    ];

    const result = AchievementEngine.evaluateAllBadges(state);
    const firstStep = result.evaluatedBadges.find(b => b.definition.id === 'first-step');
    expect(firstStep?.isUnlocked).toBe(true);
    expect(result.newlyUnlocked.some(b => b.badgeId === 'first-step')).toBe(true);
    expect(result.newNotifications.some(n => n.badgeId === 'first-step')).toBe(true);
  });

  it('prevents duplicate badge awards if already unlocked', () => {
    const state = StorageEngine.getDefaultState();
    state.badges = [
      {
        id: 'badge_rec_first-step',
        badgeId: 'first-step',
        unlockedAt: '2026-08-24T10:00:00Z',
        currentValue: 1,
        targetValue: 1,
        isUnlocked: true,
      }
    ];
    state.sessions = [
      { id: 's1', date: '2026-08-24', type: 'STUDY', plannedDuration: 60, actualDuration: 60, status: 'Completed' }
    ];

    const result = AchievementEngine.evaluateAllBadges(state);
    const firstStep = result.evaluatedBadges.find(b => b.definition.id === 'first-step');
    expect(firstStep?.isUnlocked).toBe(true);
    expect(result.newlyUnlocked.some(b => b.badgeId === 'first-step')).toBe(false); // No duplicate unlock!
  });

  it('calculates real progress text for locked badges', () => {
    const state = StorageEngine.getDefaultState();
    // Fixture topics (app bootstrap is empty — seed only inside this test)
    state.topics = JSON.parse(JSON.stringify(DEFAULT_TOPICS.slice(0, 5)));
    state.topics[0].status = 'Completed';
    state.topics[1].status = 'Completed';
    state.topics[2].status = 'Completed';

    const result = AchievementEngine.evaluateAllBadges(state);
    const firstFive = result.evaluatedBadges.find(b => b.definition.id === 'first-five');
    expect(firstFive?.isUnlocked).toBe(false);
    expect(firstFive?.progressText).toContain('3 of 5 topics completed');
  });

  it('detects comeback after a gap of 7 or more days', () => {
    const hasComeback = AchievementEngine.hasComeback(['2026-08-01', '2026-08-10']);
    expect(hasComeback).toBe(true);

    const noComeback = AchievementEngine.hasComeback(['2026-08-01', '2026-08-03']);
    expect(noComeback).toBe(false);
  });
});
