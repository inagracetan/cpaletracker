import React, { useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useWindowDimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { AcademicTheme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { SchedulingEngine } from '../services/scheduler/schedulingEngine';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { BadgeCard } from '../components/achievements/BadgeCard';
import { ImportWizardModal } from '../components/import/ImportWizardModal';
import { SUBJECTS_META } from '../constants/subjects';
import { AssessmentService } from '../services/assessments/assessmentService';
import { 
  Clock, 
  CheckCircle, 
  Play, 
  Flame, 
  ChevronRight, 
  Coffee, 
  Award, 
  CheckSquare,
  Sparkles,
  BookOpen,
  Trophy,
  Upload,
  ClipboardCheck,
  AlertCircle,
} from 'lucide-react-native';

export default function HomeDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { colors, isDark } = useTheme();
  const [importModalVisible, setImportModalVisible] = useState(false);
  const { 
    state, 
    analytics, 
    achievements, 
    completeSession, 
    startTimer, 
    toggleDeadlineComplete 
  } = useApp();

  const todayStr = SchedulingEngine.formatDate(new Date());

  // Find today's sessions
  const todaySessions = state.sessions.filter(s => s.date === todayStr);
  const primarySession = todaySessions[0] || state.sessions.find(s => s.date >= todayStr && s.type === 'STUDY') || state.sessions[0];

  // Countdowns
  const daysToExam = SchedulingEngine.calculateDaysRemaining(state.examPlan.examDay1, todayStr);
  const daysToTarget = SchedulingEngine.calculateDaysRemaining(state.examPlan.targetFinishDate, todayStr);

  // Upcoming Assessment calculation
  const nextAssessment = AssessmentService.getNextUpcomingAssessment(state.assessments, todayStr);
  const nextAssessmentProgress = nextAssessment ? AssessmentService.calculateProgress(nextAssessment) : null;
  const nextAssessmentDays = nextAssessment?.date ? AssessmentService.getDaysRemaining(nextAssessment.date, todayStr) : null;

  // Review stage
  let currentStage = 'Syllabus Coverage';
  if (todayStr >= state.examPlan.finalPreboardStart) {
    currentStage = 'Final Revisions & Preboard';
  } else if (todayStr >= state.examPlan.firstPreboardStart) {
    currentStage = 'Preboard Phase & Weak Areas';
  } else if (todayStr >= state.examPlan.targetFinishDate) {
    currentStage = 'Mastery & Mock Exams';
  }

  // Greeting Message
  const getGreeting = () => {
    const hours = new Date().getHours();
    let timeGreeting = 'Hello';
    if (hours < 12) timeGreeting = 'Good morning';
    else if (hours < 18) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    const nickname = state.userProfile.nickname || 'Future CPA';
    if (!state.preferences.motivationalQuotesEnabled) {
      return `${timeGreeting}, ${nickname}!`;
    }

    if (achievements.currentStreak >= 3) {
      return `${timeGreeting}, ${nickname}! You're on a ${achievements.currentStreak}-day study streak. Keep the momentum going!`;
    }
    if (analytics.isBehindSchedule) {
      return `${timeGreeting}, ${nickname}! A small step today makes a big difference tomorrow. Consistency matters.`;
    }
    return `${timeGreeting}, ${nickname}! Here is your personalized CPALE review plan.`;
  };

  // Overdue calculations
  const overdueDeadlines = useMemo(() => {
    return state.deadlines.filter(d => !d.isCompleted && d.dueDate < todayStr);
  }, [state.deadlines, todayStr]);

  const overdueSessions = useMemo(() => {
    return state.sessions.filter(s => s.status !== 'Completed' && s.date < todayStr && s.type === 'STUDY');
  }, [state.sessions, todayStr]);

  const totalOverdue = overdueDeadlines.length + overdueSessions.length;

  // Assessments tier breakdown
  const monthlyAssessments = useMemo(() => {
    return (state.assessments || []).filter(a => a.type === 'monthly');
  }, [state.assessments]);

  const monthlyCoverage = useMemo(() => {
    let completed = 0;
    let total = 0;
    monthlyAssessments.forEach(a => {
      const p = AssessmentService.calculateProgress(a);
      completed += p.completed;
      total += p.total;
    });
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, remaining: total - completed, percent, count: monthlyAssessments.length };
  }, [monthlyAssessments]);

  const firstPreboard = useMemo(() => {
    return (state.assessments || []).find(a => a.type === 'first_preboard');
  }, [state.assessments]);
  const firstPreboardProgress = useMemo(() => {
    return firstPreboard ? AssessmentService.calculateProgress(firstPreboard) : null;
  }, [firstPreboard]);

  const finalPreboard = useMemo(() => {
    return (state.assessments || []).find(a => a.type === 'final_preboard');
  }, [state.assessments]);
  const finalPreboardProgress = useMemo(() => {
    return finalPreboard ? AssessmentService.calculateProgress(finalPreboard) : null;
  }, [finalPreboard]);

  // Next 4 upcoming deadlines
  const upcomingDeadlines = state.deadlines
    .filter(d => !d.isCompleted)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  // Recent / Upcoming Badges preview for Dashboard
  const dashboardBadges = achievements.badges.slice(0, 3);

  return (
    <ScrollView 
      style={[styles.scrollContainer, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header Greeting & Motivation with subtle Indigo Gradient */}
      <View 
        style={[
          styles.headerSection, 
          { 
            backgroundColor: colors.primary,
            borderColor: colors.cardBorder,
            // @ts-ignore Web gradient support
            backgroundImage: colors.gradients?.heroCss,
          }
        ]}
      >
        {isDesktop ? (
          <View style={styles.greetingRow}>
            <View style={styles.greetingTextCol}>
              <Text style={[styles.greetingDate, { color: 'rgba(255,255,255,0.7)' }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              <Text style={[styles.greetingTitle, { color: '#FFFFFF' }]}>
                {getGreeting()}
              </Text>
            </View>
            <View
              style={[
                styles.streakBadge,
                {
                  flexShrink: 0,
                  backgroundColor: achievements.currentStreak > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.12)',
                  borderColor: achievements.currentStreak > 0 ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.2)',
                },
              ]}
            >
              <Flame size={18} color={achievements.currentStreak > 0 ? '#34D399' : 'rgba(255,255,255,0.5)'} />
              <Text style={[styles.streakText, { color: achievements.currentStreak > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.7)' }]}>
                {achievements.currentStreak}d streak
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.greetingMobileStack}>
            {/* Top row: date left, streak right */}
            <View style={styles.greetingMobileTopRow}>
              <Text style={[styles.greetingDate, styles.greetingDateMobile, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              <View
                style={[
                  styles.streakBadge,
                  {
                    flexShrink: 0,
                    backgroundColor: achievements.currentStreak > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.12)',
                    borderColor: achievements.currentStreak > 0 ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.2)',
                  },
                ]}
              >
                <Flame size={16} color={achievements.currentStreak > 0 ? '#34D399' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.streakText, { color: achievements.currentStreak > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.7)' }]}>
                  {achievements.currentStreak}d streak
                </Text>
              </View>
            </View>
            {/* Welcome: centered block, justified text (not center-aligned lines) */}
            <View style={styles.greetingMessageWrap}>
              <Text style={[styles.greetingTitle, styles.greetingTitleJustified, { color: '#FFFFFF' }]}>
                {getGreeting()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Overdue Items Alert Banner */}
      {totalOverdue > 0 && (
        <TouchableOpacity
          style={[styles.overdueBanner, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}
          onPress={() => router.push(overdueDeadlines.length > 0 ? ('/deadlines' as any) : ('/checklist' as any))}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
            <AlertCircle size={20} color={colors.warningText} style={{ flexShrink: 0, marginTop: 2 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.overdueBannerTitle, { color: colors.warningText }]}>
                {totalOverdue} Overdue {totalOverdue === 1 ? 'Task' : 'Tasks'} Need Attention
              </Text>
              <Text style={[styles.overdueBannerSub, { color: colors.textSecondary }]}>
                {overdueSessions.length > 0 ? `${overdueSessions.length} incomplete study session(s)` : ''}
                {overdueSessions.length > 0 && overdueDeadlines.length > 0 ? ' · ' : ''}
                {overdueDeadlines.length > 0 ? `${overdueDeadlines.length} passed deadline(s)` : ''}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.warningText} style={{ flexShrink: 0 }} />
        </TouchableOpacity>
      )}

      {/* 2. Exam Countdown & Planning Horizon Banner */}
      <Card style={[styles.countdownCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.countdownGrid, isDesktop ? styles.countdownGridDesktop : styles.countdownGridMobile]}>
          <View style={styles.countdownItem}>
            <Text style={[styles.countdownValue, { color: colors.accent }]}>{daysToExam > 0 ? daysToExam : 0}</Text>
            <Text style={[styles.countdownLabel, { color: colors.textPrimary }]}>Days until CPALE Day 1</Text>
            <Text style={[styles.countdownSub, { color: colors.textMuted }]}>Target: {state.examPlan.examDay1}</Text>
          </View>
          
          <View style={[styles.countdownDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.countdownItem}>
            <Text style={[styles.countdownValue, { color: daysToTarget <= 30 ? colors.warning : colors.accent }]}>
              {daysToTarget > 0 ? daysToTarget : 0}
            </Text>
            <Text style={[styles.countdownLabel, { color: colors.textPrimary }]}>Days to Finish Syllabus</Text>
            <Text style={[styles.countdownSub, { color: colors.textMuted }]}>Target: {state.examPlan.targetFinishDate}</Text>
          </View>

          <View style={[styles.countdownDivider, { backgroundColor: colors.borderLight }]} />

          <View style={[styles.countdownItem, styles.planStageItem]}>
            <View style={styles.planStageStack}>
              <Badge label={currentStage} variant="info" style={styles.planStageBadge} />
              <Text style={[styles.countdownLabel, styles.planStageHeading, { color: colors.textPrimary }]}>
                Current Plan Stage
              </Text>
              <Text style={[styles.countdownSub, styles.planStageStatus, { color: colors.textMuted }]}>
                {analytics.isBehindSchedule
                  ? `Behind by ${Math.abs(analytics.daysAheadOrBehind)} session(s)`
                  : 'On track with study order'}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Quick Import Prompt if syllabus has very few topics */}
      {state.topics.length === 0 && (
        <Card style={[styles.sectionCard, { backgroundColor: colors.accentLight, borderColor: colors.accentSubtle, marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 160, marginRight: 0 }}>
              <Text style={[styles.cardHeaderTitle, { color: colors.accent }]}>Populate Your Syllabus</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2, lineHeight: 20 }}>
                Import topics directly from your Excel or CSV spreadsheet to begin scheduling.
              </Text>
            </View>
            <Button
              title="Import Spreadsheet"
              variant="primary"
              size="sm"
              icon={<Upload size={14} color="#FFF" />}
              onPress={() => setImportModalVisible(true)}
              accessibilityLabel="Import spreadsheet"
              style={{ flexShrink: 0 }}
            />
          </View>
        </Card>
      )}

      {/* 3. Core Dashboard Grid */}
      <View style={[styles.dashboardGrid, isDesktop ? styles.row : styles.col]}>
        
        {/* Left Column: Today's Assignment & Tonight Card */}
        <View style={[styles.gridCol, isDesktop && { flex: 3 }]}>
          
          {/* Today's Assignment */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <BookOpen size={20} color={colors.accent} />
                <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>{"Today's Assignment"}</Text>
              </View>
              {primarySession?.workloadTag && (
                <Badge label={primarySession.workloadTag} variant="warning" />
              )}
            </View>

            {primarySession ? (
              <View style={styles.todayDetails}>
                {primarySession.type === 'REST' ? (
                  <View style={styles.specialSessionBox}>
                    <Coffee size={32} color={colors.textMuted} />
                    <Text style={[styles.specialSessionTitle, { color: colors.textPrimary }]}>Rest Day Scheduled</Text>
                    <Text style={[styles.specialSessionDesc, { color: colors.textSecondary }]}>
                      Take time to recharge. Your study streak is protected on scheduled rest days.
                    </Text>
                  </View>
                ) : primarySession.type === 'REVIEW' ? (
                  <View style={styles.specialSessionBox}>
                    <Award size={32} color={colors.accent} />
                    <Text style={[styles.specialSessionTitle, { color: colors.textPrimary }]}>Weekly Review Day</Text>
                    <Text style={[styles.specialSessionDesc, { color: colors.textSecondary }]}>{primarySession.notes || state.weeklyReviewTask}</Text>
                    <Button 
                      title="Open Practice Set"
                      onPress={() => router.push('/review' as any)}
                      style={{ marginTop: 12 }}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.topicRow}>
                      {primarySession.subject && (
                        <Badge label={primarySession.subject} variant="subject" subject={primarySession.subject} />
                      )}
                      <Text style={[styles.topicCodeText, { color: colors.textSecondary }]}>{primarySession.topicCode}</Text>
                      {primarySession.part && (
                        <Text style={[styles.partText, { color: colors.textMuted }]}>Part {primarySession.part}</Text>
                      )}
                    </View>

                    <Text style={[styles.topicTitleText, { color: colors.textPrimary }]}>{primarySession.topicName || 'Review Session'}</Text>
                    
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Clock size={16} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>{primarySession.plannedDuration} minutes target</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <CheckSquare size={16} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>{primarySession.materials || 'Practice questions'}</Text>
                      </View>
                    </View>

                    {primarySession.notes ? (
                      <Text style={[styles.notesText, { color: colors.textSecondary }]}>{primarySession.notes}</Text>
                    ) : null}

                    {/* Action buttons */}
                    <View style={styles.actionsRow}>
                      <Button
                        title="Start Timer"
                        icon={<Play size={16} color="#FFF" />}
                        onPress={() => startTimer(primarySession)}
                        style={styles.actionBtnItem}
                      />
                      <Button
                        title={primarySession.status === 'Completed' ? 'Completed ✓' : 'Mark Complete'}
                        variant={primarySession.status === 'Completed' ? 'success' : 'outline'}
                        onPress={() => completeSession(primarySession.id)}
                        style={styles.actionBtnItem}
                      />
                    </View>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.emptySessionBox}>
                <CheckCircle size={32} color={colors.success} />
                <Text style={[styles.emptySessionTitle, { color: colors.textPrimary }]}>All tasks for today completed!</Text>
                <Text style={[styles.emptySessionDesc, { color: colors.textSecondary }]}>{"Great work. You're building solid CPALE preparation habits."}</Text>
              </View>
            )}
          </Card>

          {/* Tonight Card */}
          <Card style={[styles.sectionCard, styles.tonightCard, { backgroundColor: isDark ? colors.cardElevated : colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Sparkles size={18} color={colors.accent} />
                <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>{"Tonight's Summary"}</Text>
              </View>
              <Text style={[styles.tonightDuration, { color: colors.accent }]}>
                {primarySession?.status !== 'Completed' ? `${primarySession?.plannedDuration || 45} mins left` : 'Completed'}
              </Text>
            </View>

            <Text style={[styles.tonightBody, { color: colors.textSecondary }]}>
              {primarySession?.status === 'Completed' 
                ? "You've fulfilled today's review goal. Sleep well and stay fresh for tomorrow's topics."
                : `Focus on ${primarySession?.topicName || 'your assigned topic'} with ${primarySession?.materials || 'practice questions'}. Complete it to keep your streak!`}
            </Text>

            <View style={styles.tonightFooter}>
              <TouchableOpacity onPress={() => router.push('/checklist' as any)} style={styles.textLink}>
                <Text style={[styles.textLinkText, { color: colors.accent }]}>Go to Daily Checklist</Text>
                <ChevronRight size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Upcoming Assessment & Preboard Card */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <ClipboardCheck size={20} color={colors.primary} />
                <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>Next Assessment & Preboard</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/assessments' as any)}>
                <Text style={[styles.headerLink, { color: colors.primary }]}>Checklist</Text>
              </TouchableOpacity>
            </View>

            {nextAssessment && nextAssessmentProgress ? (
              <View style={{ marginTop: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 0, marginRight: 0 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, lineHeight: 22 }}>
                      {nextAssessment.title}
                    </Text>
                    {nextAssessment.date ? (
                      <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2, lineHeight: 20 }}>
                        {nextAssessment.date}
                        {nextAssessmentDays !== null ? (
                          <Text style={{ color: nextAssessmentDays <= 7 ? colors.warning : colors.primary, fontWeight: '600' }}>
                            {' '}· {nextAssessmentDays === 0 ? 'Today!' : `${nextAssessmentDays} days remaining`}
                          </Text>
                        ) : null}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary, flexShrink: 0 }}>
                    {nextAssessmentProgress.formattedPercent}
                  </Text>
                </View>

                <ProgressBar progress={nextAssessmentProgress.percent} height={8} style={{ marginVertical: 8 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4, gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, flexShrink: 1, lineHeight: 20 }}>
                    {nextAssessmentProgress.completed} of {nextAssessmentProgress.total} topics covered
                  </Text>
                  <Text style={{ fontSize: 14, color: nextAssessmentProgress.remaining > 0 ? colors.warning : colors.success, fontWeight: '600', flexShrink: 1, lineHeight: 20 }}>
                    {nextAssessmentProgress.remaining === 0 ? '✓ All topics covered' : `${nextAssessmentProgress.remaining} topics remaining`}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                  No upcoming assessment or preboard scheduled.
                </Text>
              </View>
            )}

            {/* 3 Compact Progress Cards for Assessment Tiers */}
            <View style={[styles.tierCardsRow, { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
              {/* Monthly Reviews */}
              <TouchableOpacity
                style={[styles.tierCard, { backgroundColor: isDark ? colors.backgroundSoft : colors.accentLight, borderColor: colors.accent + '30' }]}
                onPress={() => router.push('/assessments' as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tierTitle, { color: colors.textPrimary }]}>
                  Monthly ({monthlyCoverage.count})
                </Text>
                <Text style={[styles.tierPercent, { color: colors.accent }]}>
                  {monthlyCoverage.percent}%
                </Text>
                <ProgressBar progress={monthlyCoverage.percent} height={4} style={{ marginVertical: 4 }} />
                <Text style={[styles.tierCount, { color: colors.textMuted }]}>
                  {monthlyCoverage.completed}/{monthlyCoverage.total} topics
                </Text>
              </TouchableOpacity>

              {/* 1st Preboard */}
              <TouchableOpacity
                style={[styles.tierCard, { backgroundColor: isDark ? colors.backgroundSoft : colors.accentLight, borderColor: colors.accent + '30' }]}
                onPress={() => router.push('/assessments' as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tierTitle, { color: colors.textPrimary }]}>
                  1st Preboard
                </Text>
                <Text style={[styles.tierPercent, { color: colors.accent }]}>
                  {firstPreboardProgress?.formattedPercent || '0%'}
                </Text>
                <ProgressBar progress={firstPreboardProgress?.percent || 0} height={4} style={{ marginVertical: 4 }} />
                <Text style={[styles.tierCount, { color: colors.textMuted }]}>
                  {firstPreboardProgress ? `${firstPreboardProgress.completed}/${firstPreboardProgress.total} topics` : 'Not set'}
                </Text>
              </TouchableOpacity>

              {/* Final Preboard */}
              <TouchableOpacity
                style={[styles.tierCard, { backgroundColor: isDark ? colors.backgroundSoft : colors.accentLight, borderColor: colors.accent + '30' }]}
                onPress={() => router.push('/assessments' as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tierTitle, { color: colors.textPrimary }]}>
                  Final Preboard
                </Text>
                <Text style={[styles.tierPercent, { color: colors.accent }]}>
                  {finalPreboardProgress?.formattedPercent || '0%'}
                </Text>
                <ProgressBar progress={finalPreboardProgress?.percent || 0} height={4} style={{ marginVertical: 4 }} />
                <Text style={[styles.tierCount, { color: colors.textMuted }]}>
                  {finalPreboardProgress ? `${finalPreboardProgress.completed}/${finalPreboardProgress.total} topics` : 'Not set'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

        </View>

        {/* Right Column: Progress, Badges & Deadlines */}
        <View style={[styles.gridCol, isDesktop && { flex: 2 }]}>
          
          {/* Syllabus Coverage — centered to align with Current Plan Stage */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.syllabusCoverageHeader}>
              <Text style={[styles.cardHeaderTitle, styles.syllabusCoverageTitle, { color: colors.textPrimary }]}>
                Syllabus Coverage
              </Text>
              <TouchableOpacity onPress={() => router.push('/progress' as any)}>
                <Text style={[styles.headerLink, { color: colors.accent, textAlign: 'center' }]}>Details</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.progressSummary}>
              <Text style={[styles.progressLargeText, { color: colors.textPrimary }]}>{analytics.overallTopicPercentage}%</Text>
              <Text style={[styles.progressSubText, { color: colors.textMuted, textAlign: 'center' }]}>
                {analytics.completedTopicsCount} of {analytics.totalTopicsCount} topics covered
              </Text>
            </View>

            <ProgressBar progress={analytics.overallTopicPercentage} style={{ marginBottom: 16 }} />

            {/* Subject Breakdown Mini Bars */}
            <View style={styles.subjectMiniList}>
              {(['FAR', 'AFAR', 'MS', 'TAX', 'AUD', 'RFBT'] as const).map(sub => {
                const sp = analytics.subjectProgress[sub];
                const meta = SUBJECTS_META[sub];
                return (
                  <View key={sub} style={styles.subjectMiniRow}>
                    <Text style={[styles.subjectMiniCode, { color: colors.textSecondary }]}>{sub}</Text>
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <ProgressBar progress={sp?.percentage || 0} color={(colors as any)[`subject${sub}`] || meta.color} height={6} />
                    </View>
                    <Text style={[styles.subjectMiniPercent, { color: colors.textSecondary }]}>{sp?.percentage || 0}%</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Compact Badges & Milestones Section */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Trophy size={18} color={colors.accent} />
                <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>Study Milestones</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/progress' as any)}>
                <Text style={[styles.headerLink, { color: colors.accent }]}>
                  {achievements.unlockedCount} / {achievements.totalCount}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginTop: 4 }}>
              {dashboardBadges.map(b => (
                <BadgeCard key={b.definition.id} badge={b} compact />
              ))}
            </View>

            <TouchableOpacity 
              onPress={() => router.push('/progress' as any)} 
              style={[styles.viewBadgesBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
            >
              <Text style={[styles.viewBadgesText, { color: colors.textPrimary }]}>View All Achievements & Badges</Text>
              <ChevronRight size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </Card>

          {/* Approaching Deadlines */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>Approaching Deadlines</Text>
              <TouchableOpacity onPress={() => router.push('/deadlines' as any)}>
                <Text style={[styles.headerLink, { color: colors.accent }]}>View all</Text>
              </TouchableOpacity>
            </View>

            {upcomingDeadlines.length > 0 ? (
              <View style={styles.deadlineList}>
                {upcomingDeadlines.map(d => {
                  const daysLeft = SchedulingEngine.calculateDaysRemaining(d.dueDate, todayStr);
                  const isOverdue = daysLeft < 0;
                  return (
                    <TouchableOpacity 
                      key={d.id} 
                      style={[styles.deadlineItem, { borderBottomColor: colors.borderLight }]}
                      onPress={() => toggleDeadlineComplete(d.id)}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.deadlineTitle, { color: colors.textPrimary }]}>{d.title}</Text>
                        <Text style={[styles.deadlineDate, { color: colors.textMuted }]}>{d.dueDate} · {d.verificationStatus}</Text>
                      </View>
                      <Badge 
                        label={isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                        variant={isOverdue ? 'danger' : daysLeft <= 7 ? 'warning' : 'default'}
                        size="sm"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.emptyDeadlinesText, { color: colors.textMuted }]}>No immediate pending deadlines.</Text>
            )}
          </Card>

        </View>

      </View>

      <ImportWizardModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        initialCategory="auto"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: AcademicTheme.spacing.lg,
    paddingBottom: 40,
  },
  headerSection: {
    padding: AcademicTheme.spacing.xl,
    borderRadius: AcademicTheme.borderRadius.xl,
    marginBottom: AcademicTheme.spacing.lg,
    borderWidth: 0,
    overflow: 'hidden',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  greetingTextCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  greetingMobileStack: {
    width: '100%',
    gap: 10,
  },
  greetingMobileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  greetingDate: {
    fontSize: AcademicTheme.typography.sizes.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  greetingDateMobile: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
    marginRight: 8,
    textAlign: 'left',
    lineHeight: 18,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: AcademicTheme.typography.weights.bold,
    lineHeight: 28,
    flexShrink: 1,
    color: '#FFFFFF',
  },
  greetingMessageWrap: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 2,
  },
  greetingTitleJustified: {
    textAlign: 'justify' as const,
    width: '100%',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.full,
    flexShrink: 0,
  },
  streakText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginLeft: 4,
  },
  countdownCard: {
    marginBottom: AcademicTheme.spacing.lg,
  },
  countdownGrid: {
    justifyContent: 'space-between',
  },
  countdownGridDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownGridMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  countdownItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  planStageItem: {
    width: '100%',
  },
  planStageStack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  planStageBadge: {
    alignSelf: 'center',
    marginBottom: 0,
  },
  planStageHeading: {
    textAlign: 'center',
    width: '100%',
    marginTop: 0,
  },
  planStageStatus: {
    textAlign: 'center',
    width: '100%',
    marginTop: 0,
  },
  countdownValue: {
    fontSize: 32,
    fontWeight: AcademicTheme.typography.weights.bold,
    textAlign: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    marginTop: 2,
    textAlign: 'center',
  },
  countdownSub: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 20,
  },
  countdownDivider: {
    width: 1,
    height: 40,
  },
  dashboardGrid: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flexDirection: 'column',
  },
  gridCol: {
    gap: 16,
    minWidth: 0,
  },
  sectionCard: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: AcademicTheme.typography.weights.bold,
    flexShrink: 1,
  },
  headerLink: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  todayDetails: {
    gap: 10,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicCodeText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  partText: {
    fontSize: 13,
  },
  topicTitleText: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginVertical: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionBtnItem: {
    flex: 1,
    minWidth: 130,
  },
  specialSessionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  specialSessionTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  specialSessionDesc: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  emptySessionBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptySessionTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  emptySessionDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  tonightCard: {
    marginTop: 4,
  },
  tonightDuration: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  tonightBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  tonightFooter: {
    marginTop: 12,
    paddingTop: 8,
  },
  textLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textLinkText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  syllabusCoverageHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 2,
    width: '100%',
  },
  syllabusCoverageTitle: {
    textAlign: 'center',
    width: '100%',
  },
  progressSummary: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  progressLargeText: {
    fontSize: 32,
    fontWeight: AcademicTheme.typography.weights.bold,
    textAlign: 'center',
  },
  progressSubText: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  subjectMiniList: {
    gap: 8,
  },
  subjectMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectMiniCode: {
    width: 48,
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  subjectMiniPercent: {
    width: 42,
    fontSize: 13,
    textAlign: 'right',
  },
  viewBadgesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    marginTop: 10,
  },
  viewBadgesText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  deadlineList: {
    gap: 10,
  },
  deadlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  deadlineTitle: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    flexWrap: 'wrap',
  },
  deadlineDate: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyDeadlinesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    marginBottom: AcademicTheme.spacing.md,
    gap: 8,
  },
  overdueBannerTitle: {
    fontSize: 15,
    fontWeight: AcademicTheme.typography.weights.bold,
    lineHeight: 22,
    flexShrink: 1,
  },
  overdueBannerSub: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    lineHeight: 20,
  },
  tierCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tierCard: {
    flex: 1,
    minWidth: 90,
    padding: 8,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  tierTitle: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  tierPercent: {
    fontSize: 15,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginTop: 2,
  },
  tierCount: {
    fontSize: 13,
    marginTop: 2,
  },
});
