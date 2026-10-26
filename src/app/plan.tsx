import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Modal,
  useWindowDimensions 
} from 'react-native';
import { AcademicTheme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DatePickerModal } from '../components/ui/DatePickerModal';
import { RescheduleSessionModal, getSuggestedRescheduleDate } from '../components/ui/RescheduleSessionModal';
import { SchedulingEngine } from '../services/scheduler/schedulingEngine';
import { ReschedulingEngine } from '../services/rescheduling/reschedulingEngine';
import { StudySession, TopicOrderMode } from '../types';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RotateCcw, 
  Settings2, 
  BookOpen, 
  ChevronRight, 
  Undo2,
  ListOrdered,
  ListChecks,
  Shuffle,
  Upload,
  Edit3,
  Save,
  X,
  CheckCircle2
} from 'lucide-react-native';
import { PageHero } from '../components/ui/PageHero';

export default function StudyPlanScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isCompactMobile = width < 640;
  const { colors, isDark } = useTheme();
  const { 
    state, 
    updateExamPlan, 
    regeneratePlan, 
    rescheduleMissedSession, 
    completeSession 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedSessionForReschedule, setSelectedSessionForReschedule] = useState<StudySession | null>(null);
  const [rescheduleSuggestedDate, setRescheduleSuggestedDate] = useState<string | undefined>(undefined);
  const [undoSnapshot, setUndoSnapshot] = useState<StudySession[] | null>(null);

  // Edit Plan modal state
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planStartDate, setPlanStartDate] = useState('');
  const [planFinishDate, setPlanFinishDate] = useState('');
  const [planExamDay1, setPlanExamDay1] = useState('');
  const [planDay1Subjects, setPlanDay1Subjects] = useState('');
  const [planDay2Subjects, setPlanDay2Subjects] = useState('');
  const [planDay3Subjects, setPlanDay3Subjects] = useState('');
  const [planFirstPBStart, setPlanFirstPBStart] = useState('');
  const [planFirstPBEnd, setPlanFirstPBEnd] = useState('');
  const [planFinalPBStart, setPlanFinalPBStart] = useState('');
  const [planFinalPBEnd, setPlanFinalPBEnd] = useState('');
  const [planTopicOrderMode, setPlanTopicOrderMode] = useState<TopicOrderMode>('Recommended');
  const [activeDatePickerField, setActiveDatePickerField] = useState<string | null>(null);
  const [planErrorMessage, setPlanErrorMessage] = useState('');
  const [planSuccessNotice, setPlanSuccessNotice] = useState('');

  const todayStr = SchedulingEngine.formatDate(new Date());

  const handleOpenEditPlan = () => {
    setPlanTitle(state.examPlan.title || 'CPALE 2027 Mastery Plan');
    setPlanDescription(state.examPlan.description || 'Adaptive CPA Licensure Examination Preparation Plan');
    setPlanStartDate(state.examPlan.studyStartDate);
    setPlanFinishDate(state.examPlan.targetFinishDate);
    setPlanExamDay1(state.examPlan.examDay1);
    setPlanDay1Subjects(state.examPlan.day1Subjects || 'MS & AUD');
    setPlanDay2Subjects(state.examPlan.day2Subjects || 'TAX & RFBT');
    setPlanDay3Subjects(state.examPlan.day3Subjects || 'FAR & AFAR');
    setPlanFirstPBStart(state.examPlan.firstPreboardStart || '');
    setPlanFirstPBEnd(state.examPlan.firstPreboardEnd || '');
    setPlanFinalPBStart(state.examPlan.finalPreboardStart || '');
    setPlanFinalPBEnd(state.examPlan.finalPreboardEnd || '');
    setPlanTopicOrderMode(state.examPlan.topicOrderMode || 'Recommended');
    setPlanErrorMessage('');
    setIsEditPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    setPlanErrorMessage('');
    if (!planStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(planStartDate)) {
      setPlanErrorMessage('Please enter a valid study start date (YYYY-MM-DD).');
      return;
    }
    if (!planExamDay1 || !/^\d{4}-\d{2}-\d{2}$/.test(planExamDay1)) {
      setPlanErrorMessage('Please enter a valid examination day 1 date (YYYY-MM-DD).');
      return;
    }
    if (planStartDate > planExamDay1) {
      setPlanErrorMessage('Study start date cannot be after examination day 1.');
      return;
    }
    if (planFinishDate && planFinishDate < planStartDate) {
      setPlanErrorMessage('Target finish date cannot be earlier than study start date.');
      return;
    }

    try {
      const { examDay2, examDay3 } = SchedulingEngine.calculateExamDates(planExamDay1);
      await updateExamPlan({
        title: planTitle.trim() || 'CPALE 2027 Mastery Plan',
        description: planDescription.trim() || 'Adaptive CPA Licensure Examination Preparation Plan',
        studyStartDate: planStartDate,
        targetFinishDate: planFinishDate || planExamDay1,
        examDay1: planExamDay1,
        examDay2,
        examDay3,
        day1Subjects: planDay1Subjects.trim() || 'MS & AUD',
        day2Subjects: planDay2Subjects.trim() || 'TAX & RFBT',
        day3Subjects: planDay3Subjects.trim() || 'FAR & AFAR',
        firstPreboardStart: planFirstPBStart || undefined,
        firstPreboardEnd: planFirstPBEnd || undefined,
        finalPreboardStart: planFinalPBStart || undefined,
        finalPreboardEnd: planFinalPBEnd || undefined,
        topicOrderMode: planTopicOrderMode,
      });
      setIsEditPlanModalOpen(false);
      setPlanSuccessNotice('Plan updated and upcoming schedule recalculated successfully!');
      setTimeout(() => setPlanSuccessNotice(''), 4000);
    } catch (err: any) {
      setPlanErrorMessage(err?.message || 'Failed to update plan. Please review your inputs.');
    }
  };

  // Run validation and capacity check
  const capacityReport = SchedulingEngine.generateSchedule({
    examPlan: state.examPlan,
    weeklySchedule: state.weeklySchedule,
    workPeriod: state.workPeriod,
    isWorking: state.userProfile.isWorking,
    restDays: state.restDays,
    topics: state.topics,
    existingSessions: state.sessions,
    studyMaterials: state.studyMaterials,
    weeklyReviewTask: state.weeklyReviewTask,
  });

  const handleToggleMode = async (mode: TopicOrderMode) => {
    await updateExamPlan({ topicOrderMode: mode });
  };

  const handleOpenReschedule = (session: StudySession) => {
    setSelectedSessionForReschedule(session);
    setRescheduleSuggestedDate(
      getSuggestedRescheduleDate(state.sessions, session.id, state.examPlan)
    );
    setRescheduleModalVisible(true);
  };

  const handleConfirmReschedule = async (payload: { newDate: string; plannedDuration: number }) => {
    if (!selectedSessionForReschedule) return;
    const { previousSnapshot } = ReschedulingEngine.applyRescheduleMissedSession({
      sessions: state.sessions,
      missedSessionId: selectedSessionForReschedule.id,
      newTargetDate: payload.newDate,
      plannedDuration: payload.plannedDuration,
    });
    setUndoSnapshot(previousSnapshot);
    await rescheduleMissedSession(
      selectedSessionForReschedule.id,
      payload.newDate,
      payload.plannedDuration
    );
    setRescheduleModalVisible(false);
    setSelectedSessionForReschedule(null);
  };

  const handleUndo = async () => {
    if (undoSnapshot) {
      setUndoSnapshot(null);
      await regeneratePlan();
    }
  };

  // Filter sessions
  const filteredSessions = state.sessions.filter(s => {
    if (activeTab === 'upcoming') {
      return s.date >= todayStr;
    } else if (activeTab === 'completed') {
      return s.status === 'Completed';
    }
    return true;
  });

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#F0F4FF' }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      <PageHero
        title="Study Plan Generator"
        subtitle="Adaptive CPALE schedule engine with conflict resolution, workload tags, and pacing intelligence"
      />

      {/* Undo Reschedule button (conditonal) */}
      {undoSnapshot && (
        <View style={{ marginBottom: 12 }}>
          <Button
            title="Undo Reschedule"
            variant="outline"
            size="md"
            icon={<Undo2 size={16} color={colors.accent} />}
            onPress={handleUndo}
            accessibilityLabel="Undo Reschedule"
          />
        </View>
      )}

      {/* Success Feedback Notice */}
      {planSuccessNotice ? (
        <Card style={[styles.successBanner, { backgroundColor: colors.successLight, borderColor: colors.successBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <CheckCircle2 size={18} color={colors.success} style={{ flexShrink: 0, marginTop: 1 }} />
            <Text style={{ color: colors.successText, fontSize: 14, fontWeight: '600', flex: 1, minWidth: 0, lineHeight: 20 }}>
              {planSuccessNotice}
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Plan Overview & Reschedule Card */}
      <Card style={[styles.planOverviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.planOverviewHeader}>
          <View style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <Text style={[styles.planTitleText, { color: colors.textPrimary }]}>
              {state.examPlan.title || 'CPALE 2027 Mastery Plan'}
            </Text>
            <Text style={[styles.planDescText, { color: colors.textSecondary }]}>
              {state.examPlan.description || 'Adaptive CPA Licensure Examination Preparation Plan'}
            </Text>
          </View>
          <Button
            title="Edit Plan"
            variant="primary"
            size="md"
            icon={<Edit3 size={16} color="#FFF" />}
            iconOnly={isCompactMobile}
            onPress={handleOpenEditPlan}
            accessibilityLabel="Edit Plan"
          />
        </View>

        <View style={[styles.planDatesGrid, { borderTopColor: colors.borderLight }]}>
          <View style={styles.planDateItem}>
            <Text style={[styles.planDateLabel, { color: colors.textMuted }]}>Study Start</Text>
            <Text style={[styles.planDateValue, { color: colors.textPrimary }]}>{state.examPlan.studyStartDate}</Text>
          </View>
          <View style={styles.planDateItem}>
            <Text style={[styles.planDateLabel, { color: colors.textMuted }]}>Target Finish</Text>
            <Text style={[styles.planDateValue, { color: colors.textPrimary }]}>{state.examPlan.targetFinishDate}</Text>
          </View>
          <View style={styles.planDateItem}>
            <Text style={[styles.planDateLabel, { color: colors.textMuted }]}>Exam Day 1</Text>
            <Text style={[styles.planDateValue, { color: colors.accent }]}>{state.examPlan.examDay1}</Text>
          </View>
          <View style={styles.planDateItem}>
            <Text style={[styles.planDateLabel, { color: colors.textMuted }]}>Day 1 Subjects</Text>
            <Text style={[styles.planDateValue, { color: colors.textPrimary }]}>{state.examPlan.day1Subjects || 'MS & AUD'}</Text>
          </View>
        </View>
      </Card>

      {/* 2. Scheduling Mode Card */}
      <Card style={[styles.modeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={isDesktop ? styles.modeRow : styles.modeCardInnerMobile}>
          <View style={{ flex: 1, paddingRight: isDesktop ? 12 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>Active Scheduling Mode</Text>
              {!isDesktop && (
                <View style={styles.modeSelectorCompact}>
                  <TouchableOpacity
                    style={[
                      styles.modeBtnCompact, 
                      { backgroundColor: colors.backgroundSoft, borderColor: colors.border },
                      state.examPlan.topicOrderMode === 'Recommended' && { backgroundColor: colors.accent, borderColor: colors.accent }
                    ]}
                    onPress={() => handleToggleMode('Recommended')}
                    accessibilityLabel="Recommended Study Order"
                  >
                    <ListOrdered size={15} color={state.examPlan.topicOrderMode === 'Recommended' ? '#FFF' : colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeBtnCompact, 
                      { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                      state.examPlan.topicOrderMode === 'Automatic' && { backgroundColor: colors.accent, borderColor: colors.accent }
                    ]}
                    onPress={() => handleToggleMode('Automatic')}
                    accessibilityLabel="Automatic Distribution"
                  >
                    <Shuffle size={15} color={state.examPlan.topicOrderMode === 'Automatic' ? '#FFF' : colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]}>
              {state.examPlan.topicOrderMode === 'Recommended' 
                ? 'Following curated CPALE study order sequence from setup workbook.' 
                : 'Distributing all 165 syllabus topics evenly across study days.'}
            </Text>
          </View>

          {isDesktop && (
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeBtn, 
                  { backgroundColor: colors.backgroundSoft },
                  state.examPlan.topicOrderMode === 'Recommended' && { backgroundColor: colors.accent }
                ]}
                onPress={() => handleToggleMode('Recommended')}
                accessibilityLabel="Recommended Study Order"
              >
                <ListOrdered size={16} color={state.examPlan.topicOrderMode === 'Recommended' ? '#FFF' : colors.textSecondary} />
                <Text style={[
                  styles.modeBtnText, 
                  { color: state.examPlan.topicOrderMode === 'Recommended' ? '#FFF' : colors.textSecondary },
                  state.examPlan.topicOrderMode === 'Recommended' && styles.modeBtnTextActive
                ]}>
                  Recommended
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeBtn, 
                  { backgroundColor: colors.backgroundSubtle },
                  state.examPlan.topicOrderMode === 'Automatic' && { backgroundColor: colors.accent }
                ]}
                onPress={() => handleToggleMode('Automatic')}
                accessibilityLabel="Automatic Distribution"
              >
                <Shuffle size={16} color={state.examPlan.topicOrderMode === 'Automatic' ? '#FFF' : colors.textSecondary} />
                <Text style={[
                  styles.modeBtnText, 
                  { color: state.examPlan.topicOrderMode === 'Automatic' ? '#FFF' : colors.textSecondary },
                  state.examPlan.topicOrderMode === 'Automatic' && styles.modeBtnTextActive
                ]}>
                  Automatic
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Card>

      {/* 3. Feasibility and Warnings Banner */}
      {capacityReport.warnings.length > 0 && (
        <Card style={[styles.warningCard, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={20} color={colors.warning} />
            <Text style={[styles.warningTitle, { color: colors.warningText }]}>Schedule Engine Notice</Text>
          </View>
          {capacityReport.warnings.map((w, idx) => (
            <Text key={idx} style={[styles.warningText, { color: colors.warningText }]}>• {w}</Text>
          ))}
          {capacityReport.validation.missingFromStudyOrderCount > 0 && state.examPlan.topicOrderMode === 'Recommended' && (
            <Button
              title="Switch to Automatic Mode (Covers All 165 Topics)"
              variant="outline"
              size="sm"
              onPress={() => handleToggleMode('Automatic')}
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
            />
          )}
        </Card>
      )}

      {/* 4. Capacity & Engine Stats */}
      <Card style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.statsGrid}>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>{capacityReport.capacity.studySessionsCapacity}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Available Slots</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>{capacityReport.capacity.topicsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Topics to Schedule</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: capacityReport.capacity.isFeasible ? colors.success : colors.danger }]}>
              {capacityReport.capacity.isFeasible ? 'Feasible ✓' : `-${capacityReport.capacity.shortfall} slots`}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Plan Feasibility</Text>
          </View>
        </View>
      </Card>

      {/* 5. Sessions Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[
            styles.tabBtn, 
            { backgroundColor: colors.card, borderColor: colors.border },
            activeTab === 'upcoming' && { backgroundColor: colors.accentLight, borderColor: colors.accent }
          ]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[
            styles.tabBtnText, 
            { color: colors.textSecondary },
            activeTab === 'upcoming' && { color: colors.accent, fontWeight: AcademicTheme.typography.weights.bold }
          ]}>
            Upcoming ({state.sessions.filter(s => s.date >= todayStr).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.tabBtn, 
            { backgroundColor: colors.card, borderColor: colors.border },
            activeTab === 'completed' && { backgroundColor: colors.accentLight, borderColor: colors.accent }
          ]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[
            styles.tabBtnText, 
            { color: colors.textSecondary },
            activeTab === 'completed' && { color: colors.accent, fontWeight: AcademicTheme.typography.weights.bold }
          ]}>
            Completed ({state.sessions.filter(s => s.status === 'Completed').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.tabBtn, 
            { backgroundColor: colors.card, borderColor: colors.border },
            activeTab === 'all' && { backgroundColor: colors.accentLight, borderColor: colors.accent }
          ]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[
            styles.tabBtnText, 
            { color: colors.textSecondary },
            activeTab === 'all' && { color: colors.accent, fontWeight: AcademicTheme.typography.weights.bold }
          ]}>
            Full Plan ({state.sessions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 6. Scheduled Sessions List */}
      <View style={styles.sessionsList}>
        {filteredSessions.slice(0, 50).map((session) => {
          const isDone = session.status === 'Completed';
          const isMissed = session.status === 'Missed';
          return (
            <Card 
              key={session.id} 
              style={[
                styles.sessionCard, 
                { 
                  width: isDesktop ? '48.9%' : '100%',
                  backgroundColor: colors.card, 
                  borderColor: colors.cardBorder 
                },
                isDone && { backgroundColor: isDark ? colors.backgroundSoft : '#F8FAF9', borderColor: colors.successBorder }
              ]}
            >
              <View style={styles.sessionHeader}>
                <View style={styles.dateBadge}>
                  <Calendar size={14} color={colors.textMuted} />
                  <Text style={[styles.sessionDateText, { color: colors.textPrimary }]}>{session.date}</Text>
                  <Text style={[styles.sessionDayText, { color: colors.textMuted }]}>
                    {SchedulingEngine.getWeekdayName(session.date).slice(0, 3)}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  {session.subject && (
                    <Badge label={session.subject} variant="subject" subject={session.subject} size="sm" />
                  )}
                  {session.type !== 'STUDY' && (
                    <Badge label={session.type} variant="info" size="sm" />
                  )}
                  {session.workloadTag && (
                    <Badge label={session.workloadTag} variant="warning" size="sm" />
                  )}
                  <Badge 
                    label={session.status} 
                    variant={isDone ? 'success' : isMissed ? 'danger' : 'default'} 
                    size="sm" 
                  />
                  {!isDone && !isDesktop && (
                    <TouchableOpacity 
                      style={[styles.compactUpperRightBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                      onPress={() => handleOpenReschedule(session)}
                      accessibilityLabel="Reschedule Session"
                    >
                      <RotateCcw size={13} color={colors.accent} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={[
                styles.sessionTitle, 
                { color: colors.textPrimary },
                isDone && [styles.sessionTitleDone, { color: colors.textMuted }]
              ]}>
                {session.topicName || session.notes || session.type}
              </Text>

              {session.materials ? (
                <Text style={[styles.sessionMaterials, { color: colors.textSecondary }]}>Materials: {session.materials}</Text>
              ) : null}

              <View style={styles.sessionFooter}>
                <View style={styles.footerCol}>
                  <Clock size={14} color={colors.textMuted} />
                  <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>{session.plannedDuration} min target</Text>
                </View>

                <View style={styles.footerActions}>
                  {!isDone && isDesktop && (
                    <TouchableOpacity 
                      style={[styles.rescheduleBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                      onPress={() => handleOpenReschedule(session)}
                    >
                      <RotateCcw size={14} color={colors.accent} />
                      <Text style={[styles.rescheduleBtnText, { color: colors.accent }]}>Reschedule</Text>
                    </TouchableOpacity>
                  )}
                  <Button
                    title={isDone ? 'Done ✓' : 'Mark Complete'}
                    variant={isDone ? 'success' : 'outline'}
                    size="sm"
                    onPress={() => completeSession(session.id)}
                  />
                </View>
              </View>
            </Card>
          );
        })}

        {filteredSessions.length > 50 && (
          <Text style={[styles.moreText, { color: colors.textMuted }]}>
            Showing first 50 sessions of {filteredSessions.length}. Adjust filters or check Calendar view for full timeline.
          </Text>
        )}
      </View>

      <RescheduleSessionModal
        visible={rescheduleModalVisible}
        session={selectedSessionForReschedule}
        suggestedDate={rescheduleSuggestedDate}
        onCancel={() => {
          setRescheduleModalVisible(false);
          setSelectedSessionForReschedule(null);
        }}
        onConfirm={handleConfirmReschedule}
      />

      {/* Edit Plan & Reschedule Modal */}
      <Modal visible={isEditPlanModalOpen} animationType="none" transparent>
        <View style={styles.modalOverlay}>
          <Card style={[styles.editPlanModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.editModalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Study Plan & Schedule</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Modify dates or subjects. Completed sessions and study progress are preserved.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditPlanModalOpen(false)} style={styles.closeBtn} accessibilityLabel="Close Edit Plan">
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {planErrorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder }]}>
                <AlertTriangle size={15} color={colors.danger} />
                <Text style={[styles.errorBoxText, { color: colors.dangerText }]}>{planErrorMessage}</Text>
              </View>
            ) : null}

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Plan Title */}
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Plan Title</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                value={planTitle}
                onChangeText={setPlanTitle}
                placeholder="e.g. CPALE 2027 Mastery Plan"
                placeholderTextColor={colors.textLight}
              />

              {/* Plan Description */}
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Description / Goal</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                value={planDescription}
                onChangeText={setPlanDescription}
                placeholder="e.g. Adaptive CPA Licensure Examination Preparation Plan"
                placeholderTextColor={colors.textLight}
              />

              {/* Date pickers row */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Study Start Date</Text>
                  <TouchableOpacity
                    style={[styles.datePickerBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                    onPress={() => setActiveDatePickerField('studyStartDate')}
                  >
                    <Calendar size={14} color={colors.textMuted} />
                    <Text style={[styles.datePickerBtnText, { color: colors.textPrimary }]}>{planStartDate || 'Select date'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Target Finish Date</Text>
                  <TouchableOpacity
                    style={[styles.datePickerBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                    onPress={() => setActiveDatePickerField('targetFinishDate')}
                  >
                    <Calendar size={14} color={colors.textMuted} />
                    <Text style={[styles.datePickerBtnText, { color: colors.textPrimary }]}>{planFinishDate || 'Select date'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Official CPALE Day 1 */}
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Official Exam Day 1</Text>
              <TouchableOpacity
                style={[styles.datePickerBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, marginBottom: 4 }]}
                onPress={() => setActiveDatePickerField('examDay1')}
              >
                <Calendar size={14} color={colors.textMuted} />
                <Text style={[styles.datePickerBtnText, { color: colors.textPrimary }]}>{planExamDay1 || 'Select date'}</Text>
              </TouchableOpacity>
              <Text style={[styles.helperNote, { color: colors.textMuted }]}>
                Days 2 and 3 (+1 day, +2 days) are calculated automatically.
              </Text>

              {/* Assigned Subjects per Exam Day */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Day 1 Subjects</Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                    value={planDay1Subjects}
                    onChangeText={setPlanDay1Subjects}
                    placeholder="MS & AUD"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Day 2 Subjects</Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                    value={planDay2Subjects}
                    onChangeText={setPlanDay2Subjects}
                    placeholder="TAX & RFBT"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Day 3 Subjects</Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                    value={planDay3Subjects}
                    onChangeText={setPlanDay3Subjects}
                    placeholder="FAR & AFAR"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>

              {/* Preboards */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>1st Preboard Start</Text>
                  <TouchableOpacity
                    style={[styles.datePickerBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                    onPress={() => setActiveDatePickerField('firstPBStart')}
                  >
                    <Calendar size={14} color={colors.textMuted} />
                    <Text style={[styles.datePickerBtnText, { color: colors.textPrimary }]}>{planFirstPBStart || 'None'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Final Preboard Start</Text>
                  <TouchableOpacity
                    style={[styles.datePickerBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                    onPress={() => setActiveDatePickerField('finalPBStart')}
                  >
                    <Calendar size={14} color={colors.textMuted} />
                    <Text style={[styles.datePickerBtnText, { color: colors.textPrimary }]}>{planFinalPBStart || 'None'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Topic order mode */}
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Scheduling Order Mode</Text>
              <View style={styles.modePickerRow}>
                <TouchableOpacity
                  style={[
                    styles.modePickerOption,
                    { backgroundColor: colors.backgroundSoft, borderColor: colors.border },
                    planTopicOrderMode === 'Recommended' && { backgroundColor: colors.accent, borderColor: colors.accent }
                  ]}
                  onPress={() => setPlanTopicOrderMode('Recommended')}
                >
                  <Text style={[
                    styles.modePickerOptionText,
                    { color: planTopicOrderMode === 'Recommended' ? '#FFF' : colors.textSecondary }
                  ]}>
                    Recommended Sequence
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modePickerOption,
                    { backgroundColor: colors.backgroundSoft, borderColor: colors.border },
                    planTopicOrderMode === 'Automatic' && { backgroundColor: colors.accent, borderColor: colors.accent }
                  ]}
                  onPress={() => setPlanTopicOrderMode('Automatic')}
                >
                  <Text style={[
                    styles.modePickerOptionText,
                    { color: planTopicOrderMode === 'Automatic' ? '#FFF' : colors.textSecondary }
                  ]}>
                    Automatic Distribution
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.noticeNote, { color: colors.textMuted }]}>
                Rescheduling updates upcoming study sessions from your new dates while preserving all completed sessions, topic progress, and historical study records.
              </Text>
            </ScrollView>

            <View style={styles.editModalBtns}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setIsEditPlanModalOpen(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save & Reschedule"
                variant="primary"
                icon={<Save size={14} color="#FFF" />}
                onPress={handleSavePlan}
                style={{ flex: 1.4 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* DatePickerModal for Edit Plan */}
      <DatePickerModal
        visible={activeDatePickerField !== null}
        onClose={() => setActiveDatePickerField(null)}
        selectedDate={
          activeDatePickerField === 'studyStartDate' ? planStartDate :
          activeDatePickerField === 'targetFinishDate' ? planFinishDate :
          activeDatePickerField === 'examDay1' ? planExamDay1 :
          activeDatePickerField === 'firstPBStart' ? planFirstPBStart :
          activeDatePickerField === 'finalPBStart' ? planFinalPBStart : undefined
        }
        title={
          activeDatePickerField === 'studyStartDate' ? 'Select Study Start Date' :
          activeDatePickerField === 'targetFinishDate' ? 'Select Target Finish Date' :
          activeDatePickerField === 'examDay1' ? 'Select Exam Day 1' :
          activeDatePickerField === 'firstPBStart' ? 'Select 1st Preboard Date' :
          'Select Final Preboard Date'
        }
        onConfirm={(dStr) => {
          if (activeDatePickerField === 'studyStartDate') setPlanStartDate(dStr);
          else if (activeDatePickerField === 'targetFinishDate') setPlanFinishDate(dStr);
          else if (activeDatePickerField === 'examDay1') setPlanExamDay1(dStr);
          else if (activeDatePickerField === 'firstPBStart') setPlanFirstPBStart(dStr);
          else if (activeDatePickerField === 'finalPBStart') setPlanFinalPBStart(dStr);
          setActiveDatePickerField(null);
        }}
      />

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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: AcademicTheme.spacing.md,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: AcademicTheme.typography.sizes.xl,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  subtitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    maxWidth: 520,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successBanner: {
    borderWidth: 1,
    padding: 12,
    marginBottom: AcademicTheme.spacing.md,
  },
  planOverviewCard: {
    padding: 14,
    marginBottom: AcademicTheme.spacing.md,
  },
  planOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  planTitleText: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
    flexWrap: 'wrap',
  },
  planDescText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  planDatesGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  planDateItem: {
    flex: 1,
    minWidth: 110,
  },
  planDateLabel: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  planDateValue: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginTop: 2,
  },
  modeCard: {
    marginBottom: AcademicTheme.spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  modeCardInnerMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  modeSelectorCompact: {
    flexDirection: 'row',
    gap: 6,
  },
  modeBtnCompact: {
    padding: 8,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  modeTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  modeSubtitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: AcademicTheme.borderRadius.md,
  },
  modeBtnText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  modeBtnTextActive: {
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  warningCard: {
    borderWidth: 1,
    marginBottom: AcademicTheme.spacing.md,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsCard: {
    marginBottom: AcademicTheme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCol: {
    alignItems: 'center',
    minWidth: 80,
  },
  statVal: {
    fontSize: 22,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: AcademicTheme.spacing.md,
    flexWrap: 'wrap',
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  sessionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  sessionCard: {
    padding: 14,
    minWidth: 0,
    maxWidth: '100%',
  },
  compactUpperRightBtn: {
    padding: 6,
    borderRadius: AcademicTheme.borderRadius.sm,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDateText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  sessionDayText: {
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sessionTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginBottom: 4,
    flexWrap: 'wrap',
    lineHeight: 22,
  },
  sessionTitleDone: {
    textDecorationLine: 'line-through',
  },
  sessionMaterials: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  footerCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLabel: {
    fontSize: 13,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  rescheduleBtnText: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  moreText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  rescheduleModalCard: {
    width: '100%',
    maxWidth: 440,
  },
  editPlanModalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: AcademicTheme.borderRadius.sm,
    borderWidth: 1,
    marginBottom: 10,
  },
  errorBoxText: {
    fontSize: 13,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    marginBottom: 4,
    marginTop: 8,
  },
  inputField: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    fontSize: 15,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  datePickerBtnText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  helperNote: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 4,
  },
  modePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modePickerOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePickerOptionText: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.semibold,
    textAlign: 'center',
  },
  noticeNote: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 4,
  },
  editModalBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  modalTitle: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  modalSubtitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    marginBottom: 8,
  },
  previewBox: {
    padding: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 13,
  },
  previewVal: {
    fontSize: 16,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginTop: 2,
  },
  previewNote: {
    fontSize: 13,
    marginTop: 10,
    lineHeight: 18,
  },
  modalBtns: {
    flexDirection: 'row',
  },
  // Hero illustration
  heroIllust: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
  },
  heroIllustBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroIllustDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
