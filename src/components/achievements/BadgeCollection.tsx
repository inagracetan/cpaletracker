import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { BadgeCard } from './BadgeCard';
import { BadgeCategory } from '../../types';
import { Flame, Zap, Trophy } from 'lucide-react-native';

const CATEGORIES: ('All' | BadgeCategory)[] = [
  'All',
  'Getting Started',
  'Consistency',
  'Study Progress',
  'Practice and Mastery',
  'Planning and Milestones',
];

export const BadgeCollection: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { achievements } = useApp();
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState<'All' | BadgeCategory>('All');

  // Responsive column sizing to fill available horizontal width without empty right gap
  const itemFlexBasis = useMemo(() => {
    if (width >= 1200) return '23.8%'; // 4 columns
    if (width >= 860) return '31.8%';  // 3 columns
    if (width >= 560) return '48.6%';  // 2 columns
    return '100%';                     // 1 column on narrow mobile
  }, [width]);

  const filteredBadges = useMemo(() => {
    if (selectedCategory === 'All') return achievements.badges;
    return achievements.badges.filter(b => b.definition.category === selectedCategory);
  }, [achievements.badges, selectedCategory]);

  const earnedCount = achievements.unlockedCount;
  const totalCount = achievements.totalCount;
  const completionPercent = Math.round((earnedCount / (totalCount || 1)) * 100);

  return (
    <View style={styles.container}>
      {/* Header Summary Banner */}
      <View style={[styles.summaryBanner, { backgroundColor: isDark ? colors.cardElevated : colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.summaryStatsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.accentLight }]}>
              <Trophy size={20} color={colors.accent} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{earnedCount} / {totalCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Badges Earned ({completionPercent}%)</Text>
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: achievements.currentStreak > 0 ? colors.successLight : colors.backgroundSoft }]}>
              <Flame size={20} color={achievements.currentStreak > 0 ? colors.success : colors.textMuted} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{achievements.currentStreak} Days</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Current Streak</Text>
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.infoLight }]}>
              <Zap size={20} color={colors.info} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{achievements.longestStreak} Days</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best Record</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Category Pills - Responsive wrapping chips */}
      <View style={styles.categoryWrap}>
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isSelected ? colors.accent : (isDark ? colors.card : colors.backgroundSoft),
                  borderColor: isSelected ? colors.accent : colors.cardBorder,
                }
              ]}
              activeOpacity={0.7}
              accessibilityLabel={`Category ${cat}`}
              accessibilityRole="button"
            >
              <Text style={[
                styles.categoryPillText,
                { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                isSelected && styles.categoryPillTextSelected
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Badges Grid */}
      <View style={styles.grid}>
        {filteredBadges.map(badge => (
          <View key={badge.definition.id} style={[styles.gridItem, { flexBasis: itemFlexBasis }]}>
            <BadgeCard badge={badge} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  summaryBanner: {
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...AcademicTheme.shadows.subtle,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  categoryPillTextSelected: {
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  gridItem: {
    flexGrow: 1,
    minWidth: 200,
  },
});
