import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { EvaluatedBadge } from '../../services/achievements/achievementEngine';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  Footprints, 
  Compass, 
  CalendarCheck, 
  BookOpen, 
  Flame, 
  Zap, 
  Shield, 
  Crown, 
  Repeat, 
  CheckCircle2, 
  Award, 
  PieChart, 
  Medal, 
  Star, 
  Trophy, 
  FileQuestion, 
  Target, 
  Crosshair, 
  CheckCheck, 
  Dumbbell, 
  Clock, 
  GraduationCap, 
  Sparkles, 
  Lock 
} from 'lucide-react-native';

const ICON_MAP: Record<string, any> = {
  Footprints,
  Compass,
  CalendarCheck,
  BookOpen,
  Flame,
  Zap,
  Shield,
  Crown,
  Repeat,
  CheckCircle2,
  Award,
  PieChart,
  Medal,
  Star,
  Trophy,
  FileQuestion,
  Target,
  Crosshair,
  CheckCheck,
  Dumbbell,
  Clock,
  GraduationCap,
  Sparkles,
};

export interface BadgeCardProps {
  badge: EvaluatedBadge;
  compact?: boolean;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge, compact = false }) => {
  const { colors, isDark } = useTheme();
  const { definition, isUnlocked, progressPercent, progressText, record } = badge;

  const IconComponent = ICON_MAP[definition.icon] || Award;

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'Platinum': return '#3B4480'; // Brand Indigo Navy
      case 'Gold': return '#5664B5';     // Muted Indigo Accent
      case 'Silver': return '#7E88C8';   // Soft Indigo Slate
      case 'Bronze':
      default: return '#64748B';         // Slate
    }
  };

  const tierColor = getTierColor(definition.tier);
  const isStreak = definition.category === 'Consistency';
  const isSyllabus = definition.category === 'Study Progress';
  const isRare = definition.tier === 'Gold' || definition.tier === 'Platinum';

  if (compact) {
    return (
      <View style={[
        styles.compactCard, 
        { 
          backgroundColor: isUnlocked 
            ? (isStreak ? (isDark ? '#232A4E' : '#EEF0FA') : (isDark ? colors.cardElevated : colors.card)) 
            : (isDark ? '#191D34' : colors.backgroundSoft),
          borderColor: isUnlocked 
            ? (isRare || isSyllabus ? colors.accent : colors.primary) 
            : (isDark ? '#363D60' : colors.border) 
        }
      ]}>
        <View style={[
          styles.compactIconContainer,
          { 
            backgroundColor: isUnlocked 
              ? (isSyllabus ? colors.accent : colors.primary) 
              : (isDark ? '#191D34' : colors.backgroundSubtle),
            borderColor: isUnlocked 
              ? (isRare ? colors.accent : colors.primary) 
              : (isDark ? '#363D60' : colors.border)
          }
        ]}>
          {isUnlocked ? (
            <IconComponent size={18} color={isSyllabus ? colors.accentForeground : '#FFFFFF'} />
          ) : (
            <Lock size={14} color={colors.textLight} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
          <Text style={[styles.compactTitle, { color: isUnlocked ? colors.textPrimary : colors.textMuted }]}>
            {definition.name}
          </Text>
          <Text style={[styles.compactDesc, { color: colors.textMuted }]}>
            {isUnlocked ? 'Earned' : progressText}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: isUnlocked 
          ? (isStreak ? (isDark ? '#232A4E' : '#FAFBFD') : (isDark ? colors.card : colors.card)) 
          : (isDark ? '#191D34' : colors.backgroundSoft),
        borderColor: isUnlocked 
          ? (isRare || isSyllabus ? colors.accent : (isDark ? '#4F5B9B' : '#C9CEDF')) 
          : (isDark ? '#363D60' : colors.cardBorder),
        opacity: isUnlocked ? 1 : 0.85,
        borderWidth: isRare && isUnlocked ? 2 : 1,
      }
    ]}>
      {/* Top Row: Badge icon on the left, Title beside it vertically centered, Status tags on the right */}
      <View style={styles.topRow}>
        <View style={styles.iconAndTitleGroup}>
          <View style={[
            styles.iconContainer,
            {
              backgroundColor: isUnlocked 
                ? (isStreak ? colors.successLight : (isSyllabus ? colors.accent : colors.primary)) 
                : (isDark ? '#202642' : colors.backgroundSubtle),
              borderColor: isUnlocked ? (isStreak ? colors.success : (isRare || isSyllabus ? colors.accent : colors.primary)) : (isDark ? '#363D60' : colors.border),
            }
          ]}>
            {isUnlocked ? (
              <IconComponent size={22} color={isSyllabus ? colors.accentForeground : (isStreak ? colors.success : '#FFFFFF')} />
            ) : (
              <Lock size={18} color={colors.textLight} />
            )}
          </View>

          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: isUnlocked ? colors.textPrimary : colors.textSecondary }]}>
              {definition.name}
            </Text>
          </View>
        </View>

        <View style={styles.badgeTags}>
          {definition.tier && (
            <View style={[styles.tierPill, { borderColor: tierColor, backgroundColor: isDark ? colors.backgroundSoft : '#FFF' }]}>
              <Text style={[styles.tierText, { color: tierColor }]}>{definition.tier}</Text>
            </View>
          )}
          {isUnlocked ? (
            <View style={[
              styles.statusPill, 
              { 
                backgroundColor: isSyllabus ? colors.accentLight : colors.successLight, 
                borderColor: isSyllabus ? colors.accent : colors.successBorder 
              }
            ]}>
              <Text style={[styles.statusText, { color: isSyllabus ? colors.warningText : colors.successText }]}>Earned</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, { backgroundColor: isDark ? '#202642' : colors.backgroundSubtle, borderColor: isDark ? '#363D60' : colors.border }]}>
              <Text style={[styles.statusText, { color: colors.textMuted }]}>Locked</Text>
            </View>
          )}
        </View>
      </View>

      {/* Description beneath the icon/title row */}
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {definition.description}
      </Text>

      {/* Progress for locked badge */}
      {!isUnlocked && (
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Progress</Text>
            <Text style={[styles.progressVal, { color: colors.textSecondary }]}>{progressPercent}%</Text>
          </View>
          <ProgressBar progress={progressPercent} height={6} />
          <Text style={[styles.progressDesc, { color: colors.textMuted }]}>
            {progressText}
          </Text>
        </View>
      )}

      {/* Unlocked date timestamp */}
      {isUnlocked && record?.unlockedAt && (
        <View style={styles.unlockedRow}>
          <Text style={[styles.unlockedText, { color: colors.textMuted }]}>
            Earned {new Date(record.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    padding: 14,
    ...AcademicTheme.shadows.subtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  iconAndTitleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleContainer: {
    marginLeft: 10,
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  badgeTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
  },
  tierText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  title: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    lineHeight: 22,
    flexShrink: 1,
  },
  description: {
    fontSize: AcademicTheme.typography.sizes.sm,
    lineHeight: 20,
    marginBottom: 10,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 4,
  },
  progressLabel: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
    flexShrink: 1,
  },
  progressVal: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  progressDesc: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 6,
    lineHeight: 20,
  },
  unlockedRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  unlockedText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  compactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  compactTitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
    lineHeight: 20,
    flexShrink: 1,
  },
  compactDesc: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 1,
    lineHeight: 18,
  },
});
