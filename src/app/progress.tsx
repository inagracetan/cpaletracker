import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useWindowDimensions 
} from 'react-native';
import { AcademicTheme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { BadgeCollection } from '../components/achievements/BadgeCollection';
import { SUBJECTS_META } from '../constants/subjects';
import { SubjectCodes } from '../types';
import { 
  Award, 
  Clock, 
  Flame, 
  Target, 
  Calendar,
  Layers,
  Percent,
  Trophy,
  BarChart3
} from 'lucide-react-native';

export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  // Narrow mobile: 320–390px need tighter layouts
  const isNarrow = width < 400;
  const { colors } = useTheme();
  const { state, analytics, achievements, activeTimer } = useApp();

  const [activeTab, setActiveTab] = useState<'analytics' | 'badges'>('analytics');

  // Derive live total study duration with accurate seconds (e.g. 0h 0m 0s, 1h 25m 9s)
  const activeTimerExtraSeconds = (activeTimer?.isRunning && typeof activeTimer.elapsedSeconds === 'number') 
    ? activeTimer.elapsedSeconds 
    : 0;
  const currentTotalSeconds = (analytics.totalStudySeconds || 0) + activeTimerExtraSeconds;
  const studyHours = Math.floor(currentTotalSeconds / 3600);
  const studyMins = Math.floor((currentTotalSeconds % 3600) / 60);
  const studySecs = currentTotalSeconds % 60;
  const liveTotalStudyTime = `${studyHours}h ${studyMins}m ${studySecs}s`;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={[styles.header, isNarrow && styles.headerNarrow]}>
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.title, { color: colors.textPrimary }, isNarrow && styles.titleNarrow]}>
            Progress & Milestones
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Real performance analytics and study badges computed from verified completed study records
          </Text>
        </View>

        {/* Tab switch between Analytics and Badges */}
        {/* On mobile: icons only. On desktop: icons + labels. */}
        <View style={[styles.tabSwitch, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              isDesktop && styles.tabBtnDesktop,
              activeTab === 'analytics' && { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }
            ]}
            onPress={() => setActiveTab('analytics')}
            activeOpacity={0.7}
            accessibilityLabel="Analytics tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'analytics' }}
          >
            <BarChart3 size={16} color={activeTab === 'analytics' ? colors.accent : colors.textMuted} />
            {isDesktop && (
              <Text style={[
                styles.tabBtnText,
                { color: activeTab === 'analytics' ? colors.accent : colors.textSecondary },
                activeTab === 'analytics' && styles.tabBtnTextActive
              ]}>
                Analytics
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              isDesktop && styles.tabBtnDesktop,
              activeTab === 'badges' && { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }
            ]}
            onPress={() => setActiveTab('badges')}
            activeOpacity={0.7}
            accessibilityLabel={`Badges tab — ${achievements.unlockedCount} of ${achievements.totalCount} unlocked`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'badges' }}
          >
            <Trophy size={16} color={activeTab === 'badges' ? colors.accent : colors.textMuted} />
            {isDesktop && (
              <Text style={[
                styles.tabBtnText,
                { color: activeTab === 'badges' ? colors.accent : colors.textSecondary },
                activeTab === 'badges' && styles.tabBtnTextActive
              ]}>
                Badges ({achievements.unlockedCount}/{achievements.totalCount})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB 1: ANALYTICS & COVERAGE */}
      {activeTab === 'analytics' && (
        <View>
          {/* Key Metrics Row — on mobile stacked in 2×2 grid, on desktop single row */}
          <View style={[
            styles.statsRow,
            isDesktop ? styles.statsRowDesktop : isNarrow ? styles.statsRowMobileNarrow : styles.statsRowMobile
          ]}>
            {/* Overall Syllabus Coverage */}
            <Card style={[
              styles.metricCard,
              isDesktop ? styles.metricCardDesktop : styles.metricCardMobile,
              { backgroundColor: colors.card, borderColor: colors.cardBorder }
            ]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={2}>
                  Overall Syllabus Coverage
                </Text>
                <Percent size={16} color={colors.accent} style={styles.metricIcon} />
              </View>
              <Text style={[styles.metricVal, { color: colors.textPrimary }, isNarrow && styles.metricValNarrow]}>
                {analytics.overallTopicPercentage}%
              </Text>
              <Text style={[styles.metricSub, { color: colors.textSecondary }]} numberOfLines={2}>
                {analytics.completedTopicsCount} of {analytics.totalTopicsCount} topics
              </Text>
              <ProgressBar progress={analytics.overallTopicPercentage} style={{ marginTop: 8 }} />
            </Card>

            {/* Total Study Time */}
            <Card style={[
              styles.metricCard,
              isDesktop ? styles.metricCardDesktop : styles.metricCardMobile,
              { backgroundColor: colors.card, borderColor: colors.cardBorder }
            ]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={2}>
                  Total Study Time
                </Text>
                <Clock size={16} color={colors.accent} style={styles.metricIcon} />
              </View>
              <Text style={[styles.metricVal, { color: colors.textPrimary }, isNarrow && styles.metricValNarrow]}>
                {liveTotalStudyTime}
              </Text>
              <Text style={[styles.metricSub, { color: colors.textSecondary }]} numberOfLines={2}>
                Recorded across all review sessions
              </Text>
            </Card>

            {/* Practice Set Accuracy */}
            <Card style={[
              styles.metricCard,
              isDesktop ? styles.metricCardDesktop : styles.metricCardMobile,
              { backgroundColor: colors.card, borderColor: colors.cardBorder }
            ]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={2}>
                  Practice Set Accuracy
                </Text>
                <Target size={16} color={colors.success} style={styles.metricIcon} />
              </View>
              <Text style={[styles.metricVal, { color: colors.success }, isNarrow && styles.metricValNarrow]}>
                {analytics.practiceAccuracyPercentage}%
              </Text>
              <Text style={[styles.metricSub, { color: colors.textSecondary }]} numberOfLines={2}>
                {analytics.totalQuestionsCorrect}/{analytics.totalQuestionsAttempted} items correct
              </Text>
              <ProgressBar progress={analytics.practiceAccuracyPercentage} color={colors.success} style={{ marginTop: 8 }} />
            </Card>

            {/* Study Streak */}
            <Card style={[
              styles.metricCard,
              isDesktop ? styles.metricCardDesktop : styles.metricCardMobile,
              { backgroundColor: colors.card, borderColor: colors.cardBorder }
            ]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={2}>
                  Study Streak
                </Text>
                <Flame size={16} color={achievements.currentStreak > 0 ? colors.success : colors.textLight} style={styles.metricIcon} />
              </View>
              <Text style={[
                styles.metricVal,
                { color: achievements.currentStreak > 0 ? colors.success : colors.textLight },
                isNarrow && styles.metricValNarrow
              ]}>
                {achievements.currentStreak}d {achievements.currentStreak > 0 ? '🔥' : ''}
              </Text>
              <Text style={[styles.metricSub, { color: colors.textSecondary }]} numberOfLines={2}>
                Longest: {achievements.longestStreak}d · Rest-day protected
              </Text>
            </Card>
          </View>

          {/* Subject-by-Subject Breakdown */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <Layers size={18} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Syllabus Coverage by Subject</Text>
            </View>

            <View style={[styles.subjectGrid, isDesktop ? styles.subjectGridDesktop : styles.subjectGridMobile]}>
              {SubjectCodes.map(code => {
                const sp = analytics.subjectProgress[code];
                const meta = SUBJECTS_META[code];
                return (
                  <View 
                    key={code} 
                    style={[
                      styles.subjectCard, 
                      { 
                        backgroundColor: colors.backgroundSoft,
                        width: isDesktop ? '31.5%' : '100%',
                      }
                    ]}
                  >
                    {/* Top row: badge + name on left, percent on right */}
                    <View style={styles.subjectCardTop}>
                      <View style={styles.subjectIdentGroup}>
                        <Badge label={code} variant="subject" subject={code} />
                        <Text
                          style={[styles.subjectFullName, { color: colors.textPrimary }]}
                          numberOfLines={2}
                        >
                          {meta.name}
                        </Text>
                      </View>
                      <Text style={[styles.subjectPercentText, { color: colors.textPrimary }]}>
                        {sp.totalTopics === 0 ? '0%' : `${sp.percentage}%`}
                      </Text>
                    </View>

                    {/* Ratio line */}
                    <Text style={[styles.subjectRatio, { color: colors.textMuted }]} numberOfLines={2}>
                      {sp.completedTopics}/{sp.totalTopics} topics · {sp.remainingTopics} remaining
                    </Text>

                    <ProgressBar 
                      progress={sp.percentage} 
                      color={(colors as any)[`subject${code}`] || meta.color} 
                      height={6} 
                      style={{ marginVertical: 8 }} 
                    />

                    <View style={styles.subjectFooterRow}>
                      <Text style={[styles.subjectTimeText, { color: colors.textMuted }]} numberOfLines={1}>
                        {Math.floor(sp.totalStudyMinutes / 60)}h {sp.totalStudyMinutes % 60}m studied
                      </Text>
                      {sp.weakTopicsCount > 0 && (
                        <Badge label={`${sp.weakTopicsCount} weak`} variant="warning" size="sm" />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Difficulty Distribution & Pacing Analysis */}
          <View style={[styles.twoColRow, isDesktop ? styles.row : styles.col]}>
            {/* Difficulty breakdown */}
            <Card style={[styles.sectionCard, { flex: isDesktop ? 1 : undefined, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Difficulty Distribution</Text>
              <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
                Topic breakdown by examination weight from PRC Table of Specifications:
              </Text>

              {(['Heavy', 'Medium', 'Light'] as const).map(diff => {
                const data = analytics.difficultyDistribution[diff];
                const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                return (
                  <View key={diff} style={styles.diffRow}>
                    <View style={styles.diffTop}>
                      <Badge 
                        label={diff} 
                        variant={diff === 'Heavy' ? 'danger' : diff === 'Medium' ? 'warning' : 'default'} 
                        size="sm" 
                      />
                      <Text style={[styles.diffRatio, { color: colors.textMuted }]} numberOfLines={1}>
                        {data.completed}/{data.total} ({pct}%)
                      </Text>
                    </View>
                    <ProgressBar 
                      progress={pct} 
                      color={diff === 'Heavy' ? colors.danger : diff === 'Medium' ? colors.warning : colors.info} 
                      style={{ marginTop: 4 }} 
                    />
                  </View>
                );
              })}
            </Card>

            {/* Schedule & Pacing */}
            <Card style={[styles.sectionCard, { flex: isDesktop ? 1 : undefined, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pacing & Planning Horizon</Text>
              
              <View style={[styles.paceBox, { backgroundColor: colors.backgroundSoft }]}>
                <View style={styles.paceItem}>
                  <Calendar size={16} color={colors.accent} style={styles.paceIcon} />
                  <View style={styles.paceTextGroup}>
                    <Text style={[styles.paceLabel, { color: colors.textMuted }]}>Target Syllabus Finish Date</Text>
                    <Text style={[styles.paceVal, { color: colors.textPrimary }]} numberOfLines={2}>
                      {state.examPlan.targetFinishDate}
                    </Text>
                  </View>
                </View>

                <View style={[styles.paceItem, { marginTop: 14 }]}>
                  <Award size={16} color={colors.accent} style={styles.paceIcon} />
                  <View style={styles.paceTextGroup}>
                    <Text style={[styles.paceLabel, { color: colors.textMuted }]}>First Preboard Examination</Text>
                    <Text style={[styles.paceVal, { color: colors.textPrimary }]} numberOfLines={2}>
                      {state.examPlan.firstPreboardStart} to {state.examPlan.firstPreboardEnd}
                    </Text>
                  </View>
                </View>

                <View style={[styles.paceItem, { marginTop: 14 }]}>
                  <Target size={16} color={colors.accent} style={styles.paceIcon} />
                  <View style={styles.paceTextGroup}>
                    <Text style={[styles.paceLabel, { color: colors.textMuted }]}>CPALE Examination Dates</Text>
                    <Text style={[styles.paceVal, { color: colors.textPrimary }]} numberOfLines={2}>
                      {state.examPlan.examDay1} — {state.examPlan.examDay3}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                Note: Analytics metrics reflect saved records. Pass rate probabilities are not fabricated without standardized proctored results.
              </Text>
            </Card>
          </View>
        </View>
      )}

      {/* TAB 2: BADGES & STUDY MILESTONES */}
      {activeTab === 'badges' && (
        <BadgeCollection />
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: AcademicTheme.spacing.lg,
    paddingBottom: 60,
    maxWidth: '100%',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: AcademicTheme.spacing.md,
    gap: 12,
    flexWrap: 'wrap',
  },
  headerNarrow: {
    // On very narrow screens keep header in row but allow title to shrink more
    gap: 8,
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: AcademicTheme.typography.sizes.xl,
    fontWeight: AcademicTheme.typography.weights.bold,
    lineHeight: 28,
  },
  titleNarrow: {
    fontSize: AcademicTheme.typography.sizes.lg, // 18 instead of 22 on 320px
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 19,
  },

  // ── Tab Switch ──────────────────────────────────────────────────────────────
  tabSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.full,
    padding: 3,
    gap: 2,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Mobile: square-ish icon-only button with adequate touch target
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: AcademicTheme.borderRadius.full,
    gap: 6,
  },
  tabBtnDesktop: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 0,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  tabBtnTextActive: {
    fontWeight: AcademicTheme.typography.weights.bold,
  },

  // ── Stats / Metric Cards ────────────────────────────────────────────────────
  statsRow: {
    marginBottom: AcademicTheme.spacing.md,
    gap: 10,
  },
  statsRowDesktop: {
    flexDirection: 'row',
  },
  // Mobile: 2×2 grid
  statsRowMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Narrow mobile (< 400px): single column
  statsRowMobileNarrow: {
    flexDirection: 'column',
  },
  metricCard: {
    padding: 12,
    minWidth: 0,
  },
  metricCardDesktop: {
    flex: 1,
  },
  // Mobile: two-per-row
  metricCardMobile: {
    // On mobile with flex-wrap, each takes ~50% minus gap
    flexBasis: '47%',
    flexGrow: 1,
    flexShrink: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 4,
  },
  metricIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: AcademicTheme.typography.weights.semibold,
    flex: 1,
    minWidth: 0,
    lineHeight: 17,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: AcademicTheme.typography.weights.bold,
    lineHeight: 26,
    flexShrink: 1,
  },
  metricValNarrow: {
    fontSize: 17,
    lineHeight: 22,
  },
  metricSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },

  // ── Layout helpers ──────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
  },
  col: {
    flexDirection: 'column',
  },

  // ── Section cards ───────────────────────────────────────────────────────────
  sectionCard: {
    marginBottom: AcademicTheme.spacing.md,
    minWidth: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: AcademicTheme.typography.weights.bold,
    flex: 1,
    minWidth: 0,
    lineHeight: 22,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 19,
  },

  // ── Subject Grid ────────────────────────────────────────────────────────────
  subjectGrid: {
    gap: 10,
  },
  subjectGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subjectGridMobile: {
    flexDirection: 'column',
  },
  subjectCard: {
    borderRadius: AcademicTheme.borderRadius.md,
    padding: 12,
    minWidth: 0,
  },
  subjectCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    minWidth: 0,
  },
  subjectIdentGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    flexWrap: 'nowrap',
  },
  subjectPercentText: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.bold,
    flexShrink: 0,
    lineHeight: 18,
  },
  subjectFullName: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.semibold,
    flex: 1,
    minWidth: 0,
    lineHeight: 18,
  },
  subjectRatio: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  subjectFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  subjectTimeText: {
    fontSize: 12,
    flexShrink: 1,
    lineHeight: 18,
  },

  // ── Two-column row (Difficulty + Pacing) ────────────────────────────────────
  twoColRow: {
    gap: 12,
  },
  diffRow: {
    marginBottom: 12,
  },
  diffTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  diffRatio: {
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
    textAlign: 'right',
  },

  // ── Pacing Box ──────────────────────────────────────────────────────────────
  paceBox: {
    borderRadius: AcademicTheme.borderRadius.md,
    padding: 12,
    marginVertical: 10,
  },
  paceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },
  paceIcon: {
    flexShrink: 0,
    marginTop: 2,
  },
  paceTextGroup: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  paceLabel: {
    fontSize: 12,
    lineHeight: 17,
  },
  paceVal: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginTop: 2,
    lineHeight: 19,
    flexWrap: 'wrap',
  },
  disclaimerText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
});
