import React, { useState, useMemo } from 'react';
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
import { SchedulingEngine } from '../services/scheduler/schedulingEngine';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageHero } from '../components/ui/PageHero';
import { RescheduleSessionModal, getSuggestedRescheduleDate } from '../components/ui/RescheduleSessionModal';
import { StudySession, SubjectCode, SubjectCodes } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Flame, 
  Play, 
  Pause, 
  Square, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Edit3, 
  BookOpen,
  Award,
  RotateCcw,
  CheckSquare,
  X,
  AlertCircle
} from 'lucide-react-native';

export default function UnifiedChecklistCalendarScreen() {
  const { 
    state, 
    analytics, 
    completeSession, 
    updateSession, 
    activeTimer, 
    startTimer, 
    pauseTimer, 
    resumeTimer, 
    stopTimer, 
    rescheduleMissedSession 
  } = useApp();
  
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;
  const isCompactMobile = width < 640;
  const { colors, isDark } = useTheme();

  // Shared synchronized selected date
  const [selectedDate, setSelectedDate] = useState<string>(() => SchedulingEngine.formatDate(new Date()));
  
  const isNarrowPhone = width < 380;
  const weekdayLabels = isNarrowPhone
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar month state
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Calendar view mode & subject filter
  const [calViewMode, setCalViewMode] = useState<'month' | 'agenda'>('month');
  const [subjectFilter, setSubjectFilter] = useState<SubjectCode | 'ALL'>('ALL');

  // Advanced practice logger modal state
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] = useState<StudySession | null>(null);
  const [rescheduleSuggestedDate, setRescheduleSuggestedDate] = useState<string | undefined>(undefined);
  const [actualMinutesInput, setActualMinutesInput] = useState('60');
  const [attemptedInput, setAttemptedInput] = useState('');
  const [correctInput, setCorrectInput] = useState('');
  const [confidenceRating, setConfidenceRating] = useState(3);
  const [sessionNotes, setSessionNotes] = useState('');
  const [difficultConcepts, setDifficultConcepts] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');

  // Month calculations
  const { daysInMonth, startWeekday, monthName } = useMemo(() => {
    const d = new Date(currentYearMonth.year, currentYearMonth.month, 1);
    const mName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const startDay = d.getDay();
    const totalDays = new Date(currentYearMonth.year, currentYearMonth.month + 1, 0).getDate();
    return { daysInMonth: totalDays, startWeekday: startDay, monthName: mName };
  }, [currentYearMonth]);

  const handlePrevMonth = () => {
    setCurrentYearMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  // Sessions and Deadlines by date maps
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    for (const s of state.sessions) {
      if (subjectFilter !== 'ALL' && s.subject !== subjectFilter && s.type === 'STUDY') {
        continue;
      }
      const existing = map.get(s.date) || [];
      existing.push(s);
      map.set(s.date, existing);
    }
    return map;
  }, [state.sessions, subjectFilter]);

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const d of state.deadlines) {
      const existing = map.get(d.dueDate) || [];
      existing.push(d);
      map.set(d.dueDate, existing);
    }
    return map;
  }, [state.deadlines]);

  // Selected date sessions
  const sessionsForDate = useMemo(() => {
    const list = sessionsByDate.get(selectedDate) || [];
    return list;
  }, [sessionsByDate, selectedDate]);

  const deadlinesForDate = useMemo(() => {
    return deadlinesByDate.get(selectedDate) || [];
  }, [deadlinesByDate, selectedDate]);

  // Date navigation handlers (keeps calendar month in sync if year/month changes)
  const handleSelectDate = (newDate: string) => {
    setSelectedDate(newDate);
    const [y, m] = newDate.split('-').map(Number);
    if (y && m) {
      setCurrentYearMonth({ year: y, month: m - 1 });
    }
  };

  const handlePrevDay = () => {
    const prev = SchedulingEngine.addDays(selectedDate, -1);
    handleSelectDate(prev);
  };

  const handleNextDay = () => {
    const next = SchedulingEngine.addDays(selectedDate, 1);
    handleSelectDate(next);
  };

  const handleToday = () => {
    const today = SchedulingEngine.formatDate(new Date());
    handleSelectDate(today);
  };

  const openAdvancedLogger = (session: StudySession) => {
    setEditingSession(session);
    setActualMinutesInput(String(session.actualDuration || session.plannedDuration || 60));
    setAttemptedInput(session.practiceAttempt?.attempted ? String(session.practiceAttempt.attempted) : '');
    setCorrectInput(session.practiceAttempt?.correct ? String(session.practiceAttempt.correct) : '');
    setConfidenceRating(session.confidenceRating || 3);
    setSessionNotes(session.notes || '');
    setDifficultConcepts(session.difficultConcepts || '');
    setFollowUpAction(session.followUpAction || '');
    setLogModalVisible(true);
  };

  const openRescheduleModal = (session: StudySession) => {
    setSessionToReschedule(session);
    setRescheduleSuggestedDate(
      getSuggestedRescheduleDate(state.sessions, session.id, state.examPlan)
    );
    setRescheduleModalVisible(true);
  };

  const handleConfirmReschedule = async (payload: { newDate: string; plannedDuration: number }) => {
    if (!sessionToReschedule) return;
    await rescheduleMissedSession(sessionToReschedule.id, payload.newDate, payload.plannedDuration);
    setRescheduleModalVisible(false);
    setSessionToReschedule(null);
  };

  const saveAdvancedLog = async () => {
    if (!editingSession) return;

    const attempted = parseInt(attemptedInput, 10);
    const correct = parseInt(correctInput, 10);
    const actualMins = parseInt(actualMinutesInput, 10) || editingSession.plannedDuration || 60;

    const practiceAttempt = (!isNaN(attempted) && attempted > 0) ? {
      id: `pa_${Date.now()}`,
      sessionId: editingSession.id,
      date: editingSession.date,
      subject: editingSession.subject,
      topicCode: editingSession.topicCode,
      attempted,
      correct: !isNaN(correct) ? correct : 0,
      timeSpentMinutes: actualMins,
      notes: sessionNotes,
    } : undefined;

    await completeSession(editingSession.id, actualMins, practiceAttempt);
    await updateSession(editingSession.id, {
      confidenceRating,
      difficultConcepts,
      followUpAction,
      notes: sessionNotes,
    });

    setLogModalVisible(false);
  };

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const sundayReviewSessions = state.sessions.filter(s => s.type === 'REVIEW');
  const completedSundayReviews = sundayReviewSessions.filter(s => s.status === 'Completed').length;

  /* -------------------------------------------------------------------------- */
  /* Render Subcomponents                                                       */
  /* -------------------------------------------------------------------------- */

  // 1. Interactive Calendar Grid
  const renderCalendarSection = () => {
    return (
      <View style={styles.calendarSectionWrapper}>
        {/* Month Navigation & Title */}
        <Card style={[styles.monthHeaderCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={[styles.navArrowBtn, { backgroundColor: colors.backgroundSoft }]} accessibilityLabel="Previous Month">
              <ChevronLeft size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.monthCenterContainer}>
              <Text style={[styles.monthTitleText, { color: colors.textPrimary }]}>{monthName}</Text>
              <TouchableOpacity onPress={handleToday} style={[styles.todayHeaderBtn, { backgroundColor: colors.accentLight, borderColor: colors.accent }]} accessibilityLabel="Jump to Today">
                <Text style={[styles.todayHeaderBtnText, { color: colors.accent }]}>Today</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleNextMonth} style={[styles.navArrowBtn, { backgroundColor: colors.backgroundSoft }]} accessibilityLabel="Next Month">
              <ChevronRight size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* 7-column Weekday Row */}
          <View style={styles.weekdaysRow}>
            {weekdayLabels.map((wd, i) => (
              <View key={`${wd}-${i}`} style={styles.weekdayCol}>
                <Text
                  style={[
                    styles.weekdayLabel,
                    { color: colors.textMuted },
                    isNarrowPhone && styles.weekdayLabelNarrow,
                  ]}
                >
                  {wd}
                </Text>
              </View>
            ))}
          </View>

          {/* 7-column Calendar Grid */}
          <View style={styles.calendarGrid}>
            {Array.from({ length: startWeekday }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCellEmpty} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYearMonth.year}-${String(currentYearMonth.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === SchedulingEngine.formatDate(new Date());

              const sessions = sessionsByDate.get(dateStr) || [];
              const deadlines = deadlinesByDate.get(dateStr) || [];

              const hasExam = sessions.some(s => s.type === 'EXAM');
              const hasPreboard = sessions.some(s => s.type === 'PREBOARD' || (s.topicName && s.topicName.toLowerCase().includes('preboard')));
              const allCompleted = sessions.length > 0 && sessions.every(s => s.status === 'Completed');
              const hasStudy = sessions.some(s => s.type === 'STUDY' && s.status !== 'Completed');
              const hasReview = sessions.some(s => s.type === 'REVIEW' && s.status !== 'Completed');
              const hasRest = sessions.some(s => s.type === 'REST');

              // Semantic circled indicator rules
              let circleBg = 'transparent';
              let circleBorder = 'transparent';
              let circleBorderWidth = 0;
              let numColor = colors.textPrimary;
              let numFontWeight: any = '500';

              if (isSelected) {
                circleBg = colors.primary;
                circleBorder = colors.primary;
                circleBorderWidth = 2;
                numColor = '#FFFFFF';
                numFontWeight = '700';
              } else if (deadlines.length > 0) {
                circleBg = isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2';
                circleBorder = colors.danger;
                circleBorderWidth = 1.5;
                numColor = colors.danger;
                numFontWeight = '700';
              } else if (hasExam || hasPreboard) {
                circleBg = isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE';
                circleBorder = '#7C3AED';
                circleBorderWidth = 1.5;
                numColor = isDark ? '#C4B5FD' : '#6D28D9';
                numFontWeight = '700';
              } else if (allCompleted) {
                circleBg = isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7';
                circleBorder = colors.success;
                circleBorderWidth = 1.5;
                numColor = colors.success;
                numFontWeight = '700';
              } else if (hasStudy || hasReview) {
                circleBg = isDark ? 'rgba(59, 68, 128, 0.2)' : '#EEF2FF';
                circleBorder = colors.accent;
                circleBorderWidth = 1.5;
                numColor = isDark ? '#C7D2FE' : colors.accent;
                numFontWeight = '600';
              } else if (hasRest) {
                circleBg = isDark ? 'rgba(100, 116, 139, 0.15)' : '#F1F5F9';
                circleBorder = '#94A3B8';
                circleBorderWidth = 1;
                numColor = isDark ? '#94A3B8' : '#64748B';
              } else if (isToday) {
                circleBorder = colors.accent;
                circleBorderWidth = 1.5;
                numColor = colors.accent;
                numFontWeight = '700';
              }

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={styles.dayCell}
                  onPress={() => handleSelectDate(dateStr)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Date ${dateStr}`}
                >
                  <View style={[
                    styles.dateCircle,
                    {
                      backgroundColor: circleBg,
                      borderColor: circleBorder,
                      borderWidth: circleBorderWidth,
                    }
                  ]}>
                    <Text style={[styles.dayNumText, { color: numColor, fontWeight: numFontWeight }]}>
                      {dayNum}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={[styles.legendRow, { borderTopColor: colors.borderLight }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, { borderColor: colors.primary, backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, { borderColor: colors.success, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(59, 68, 128, 0.2)' : '#EEF2FF' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Scheduled</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, { borderColor: '#7C3AED', backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Preboard/Exam</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, { borderColor: colors.danger, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Deadline</Text>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  // 2. Daily Checklist Section for Selected Date
  const renderChecklistSection = () => {
    return (
      <View style={styles.checklistSectionWrapper}>
        {/* Date Navigator Bar */}
        <Card style={[styles.dateNavCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.dateNavRow}>
            <TouchableOpacity onPress={handlePrevDay} style={[styles.navArrowBtn, { backgroundColor: colors.backgroundSoft }]} accessibilityLabel="Previous Day">
              <ChevronLeft size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.dateCenter}>
              <Text style={[styles.selectedDateText, { color: colors.textPrimary }]}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              {selectedDate === SchedulingEngine.formatDate(new Date()) ? (
                <View style={[styles.todayBadgeContainer, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
                  <Text style={[styles.todayBadgeText, { color: colors.accent }]}>Today</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={handleToday} style={[styles.jumpTodayBtn, { backgroundColor: colors.accentLight, borderColor: colors.accent }]} accessibilityLabel="Jump to Today">
                  <Text style={[styles.jumpTodayText, { color: colors.accent }]}>Jump to Today</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={handleNextDay} style={[styles.navArrowBtn, { backgroundColor: colors.backgroundSoft }]} accessibilityLabel="Next Day">
              <ChevronRight size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Active Study Timer Card */}
        <Card style={[styles.timerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.timerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.timerTopicName, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {activeTimer.topicTitle || 'Ready to Study'}
              </Text>
              <Text style={[styles.timerClockDisplay, { color: colors.accent }, isNarrowPhone && { fontSize: 20 }]}>
                {formatTimerTime(activeTimer.elapsedSeconds)}
              </Text>
            </View>

            <View style={styles.timerButtons}>
              {activeTimer.isRunning ? (
                <Button
                  title="Pause"
                  icon={<Pause size={15} color="#FFF" />}
                  iconOnly={isCompactMobile}
                  accessibilityLabel="Pause Timer"
                  variant="primary"
                  size="sm"
                  onPress={pauseTimer}
                  style={{ marginRight: 6 }}
                />
              ) : (
                <Button
                  title={activeTimer.elapsedSeconds > 0 ? 'Resume' : 'Start'}
                  icon={<Play size={15} color="#FFF" />}
                  iconOnly={isCompactMobile}
                  accessibilityLabel={activeTimer.elapsedSeconds > 0 ? 'Resume Timer' : 'Start Timer'}
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    if (activeTimer.elapsedSeconds > 0) resumeTimer();
                    else if (sessionsForDate[0]) startTimer(sessionsForDate[0]);
                    else startTimer();
                  }}
                  style={{ marginRight: 6 }}
                />
              )}
              {activeTimer.elapsedSeconds > 0 && (
                <Button
                  title="Done"
                  icon={<Square size={15} color="#FFF" />}
                  iconOnly={isCompactMobile}
                  accessibilityLabel="Finish Session"
                  variant="success"
                  size="sm"
                  onPress={async () => {
                    const mins = await stopTimer(activeTimer.topicId);
                    alert(`Session logged: ${mins} minutes!`);
                  }}
                />
              )}
            </View>
          </View>
        </Card>

        {/* Deadlines for this date if any */}
        {deadlinesForDate.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            {deadlinesForDate.map((dl) => (
              <Card key={dl.id} style={[styles.deadlineAlertCard, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={16} color={colors.warning} style={{ flexShrink: 0, marginTop: 2 }} />
                  <Text style={[styles.deadlineAlertTitle, { color: colors.warningText, flex: 1, minWidth: 0 }]}>
                    Filing Deadline: {dl.title}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Sessions / Tasks for this date */}
        <View style={styles.tasksSection}>
          <View style={styles.tasksSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Checklist Tasks ({sessionsForDate.length})
            </Text>
            {sessionsForDate.length > 0 && (
              <Badge 
                label={`${sessionsForDate.filter(s => s.status === 'Completed').length} / ${sessionsForDate.length} Covered`} 
                variant={sessionsForDate.every(s => s.status === 'Completed') ? 'success' : 'default'} 
                size="sm"
              />
            )}
          </View>

          {sessionsForDate.length > 0 ? (
            <View style={styles.tasksList}>
              {sessionsForDate.map((session) => {
                const isCompleted = session.status === 'Completed';
                return (
                  <Card 
                    key={session.id} 
                    style={[
                      styles.taskCard, 
                      { 
                        width: '100%',
                        backgroundColor: isCompleted ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#F8FAF9') : colors.card, 
                        borderColor: isCompleted ? colors.successBorder : colors.cardBorder 
                      }
                    ]}
                  >
                    <View style={styles.taskTopRow}>
                      <TouchableOpacity 
                        style={styles.checkboxTouchable}
                        onPress={() => completeSession(session.id)}
                        activeOpacity={0.7}
                        accessibilityLabel={`Mark session ${session.topicName || session.topicCode} complete`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={24} color={colors.success} />
                        ) : (
                          <Circle size={24} color={colors.border} />
                        )}
                      </TouchableOpacity>

                      <View style={styles.taskContentCol}>
                        <View style={styles.badgeRow}>
                          {session.subject ? (
                            <Badge label={session.subject} variant="subject" subject={session.subject} size="sm" />
                          ) : null}
                          {session.topicCode ? (
                            <Text style={[styles.taskCode, { color: colors.textSecondary }]}>{session.topicCode}</Text>
                          ) : null}
                          {session.part ? (
                            <Text style={[styles.taskPart, { color: colors.textMuted }]}>Part {session.part}</Text>
                          ) : null}
                          {session.workloadTag ? (
                            <Badge label={session.workloadTag} variant="warning" size="sm" />
                          ) : null}
                        </View>

                        <Text style={[styles.taskTitle, { color: colors.textPrimary }, isCompleted && [styles.taskTitleCompleted, { color: colors.textMuted }]]}>
                          {session.topicName || session.notes || session.type}
                        </Text>

                        <View style={styles.taskMetaRow}>
                          <View style={styles.metaCol}>
                            <Clock size={13} color={colors.textMuted} />
                            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{session.plannedDuration}m target</Text>
                          </View>
                          {session.materials ? (
                            <View style={[styles.metaCol, { flex: 1, minWidth: 0 }]}>
                              <BookOpen size={13} color={colors.textMuted} style={{ flexShrink: 0 }} />
                              <Text style={[styles.metaLabel, { color: colors.textMuted, flexShrink: 1 }]}>{session.materials}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {/* Dedicated action column — never overlaps title */}
                      {!isCompleted ? (
                        <TouchableOpacity 
                          style={[styles.compactUpperRightBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                          onPress={() => openRescheduleModal(session)}
                          accessibilityLabel="Reschedule Session"
                        >
                          <RotateCcw size={13} color={colors.accent} />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Bottom action bar */}
                    <View style={[styles.taskBottomBar, { borderTopColor: colors.borderLight }]}>
                      <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => openAdvancedLogger(session)}
                        accessibilityLabel="Log Results & Confidence"
                        {...({ title: 'Log Practice & Score' } as any)}
                      >
                        <Edit3 size={14} color={colors.textSecondary} />
                        <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                          {isCompactMobile ? 'Log Score' : 'Log Practice & Score'}
                        </Text>
                      </TouchableOpacity>

                      {session.status !== 'Completed' && isDesktop && (
                        <TouchableOpacity 
                          style={styles.actionBtn}
                          onPress={() => openRescheduleModal(session)}
                          accessibilityLabel="Reschedule Session"
                        >
                          <RotateCcw size={14} color={colors.accent} />
                          <Text style={[styles.actionBtnText, { color: colors.accent }]}>Reschedule</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Card style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <CheckSquare size={32} color={colors.textLight} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Sessions Scheduled</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                This date has no scheduled study topics. You can take a well-deserved rest or select another date from the calendar.
              </Text>
              <Button
                title="Go to Today's Tasks"
                variant="outline"
                size="sm"
                onPress={handleToday}
                style={{ marginTop: 10 }}
              />
            </Card>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#F0F4FF' }]} 
      contentContainerStyle={[
        styles.contentContainer,
        isNarrowPhone && { paddingHorizontal: 10 },
      ]} 
      showsVerticalScrollIndicator={false}
    >
      <PageHero
        title="Checklist & Calendar"
        subtitle={`Unified review station · Track topics, dates, and preboards for ${state.userProfile.nickname || 'Future CPA'}`}
      />

      {/* Status Pills Row — title left, icon right, single-row alignment on mobile */}
      <View style={[styles.statusPillsRow, { marginBottom: 12 }]}>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: analytics.currentStreakDays > 0 ? (isDark ? 'rgba(37, 132, 91, 0.2)' : colors.successLight) : colors.surfaceElevated,
              borderColor: analytics.currentStreakDays > 0 ? colors.successBorder : colors.border,
              borderWidth: 1,
            },
          ]}
          accessibilityLabel={`${analytics.currentStreakDays} day streak`}
        >
          <Text
            style={[
              styles.pillText,
              {
                color: analytics.currentStreakDays > 0 ? (isDark ? '#A8EDCC' : colors.successText) : colors.textPrimary,
                fontWeight: analytics.currentStreakDays > 0 ? '600' : '400',
              },
            ]}
            numberOfLines={1}
          >
            {isNarrowPhone ? `${analytics.currentStreakDays}d` : `${analytics.currentStreakDays}d streak`}
          </Text>
          <Flame
            size={isNarrowPhone ? 14 : 16}
            color={analytics.currentStreakDays > 0 ? colors.success : colors.textLight}
            style={styles.pillIcon}
          />
        </View>

        <View
          style={[
            styles.pill,
            {
              backgroundColor: analytics.isBehindSchedule ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2') : (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5'),
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          accessibilityLabel={analytics.isBehindSchedule ? `Behind ${Math.abs(analytics.daysAheadOrBehind)} days` : 'On Track'}
        >
          <Text
            style={[styles.pillText, { color: analytics.isBehindSchedule ? '#EF4444' : '#10B981', fontWeight: '600' }]}
            numberOfLines={1}
          >
            {analytics.isBehindSchedule
              ? (isNarrowPhone ? `-${Math.abs(analytics.daysAheadOrBehind)}d` : `Behind ${Math.abs(analytics.daysAheadOrBehind)}d`)
              : 'On Track'}
          </Text>
        </View>

        <View
          style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
          accessibilityLabel={`Reviews ${completedSundayReviews} of ${sundayReviewSessions.length}`}
        >
          <Text style={[styles.pillText, { color: colors.textPrimary }]} numberOfLines={1}>
            {isNarrowPhone
              ? `${completedSundayReviews}/${sundayReviewSessions.length}`
              : `Reviews ${completedSundayReviews}/${sundayReviewSessions.length}`}
          </Text>
          <Award size={isNarrowPhone ? 14 : 16} color={colors.accent} style={styles.pillIcon} />
        </View>
      </View>

      {/* 2. Unified Controls: All Subjects above subject chips on mobile; switcher centered below */}
      <View style={styles.controlsBar}>
        {isMobile && (
          <TouchableOpacity
            style={[
              styles.filterChip,
              styles.filterChipAllMobile,
              { backgroundColor: colors.card, borderColor: colors.border },
              subjectFilter === 'ALL' && [styles.filterChipActive, { backgroundColor: isDark ? colors.cardElevated : colors.backgroundSoft, borderColor: colors.accent }],
            ]}
            onPress={() => setSubjectFilter('ALL')}
            accessibilityLabel="All Subjects"
            accessibilityRole="button"
          >
            <Text style={[styles.filterChipText, { color: colors.textSecondary }, subjectFilter === 'ALL' && { color: colors.accent, fontWeight: '700' }]}>
              All Subjects
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.filterWrap, isMobile && { justifyContent: 'center' }]}>
          {!isMobile && (
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                subjectFilter === 'ALL' && [styles.filterChipActive, { backgroundColor: isDark ? colors.cardElevated : colors.backgroundSoft, borderColor: colors.accent }],
              ]}
              onPress={() => setSubjectFilter('ALL')}
              accessibilityLabel="All Subjects"
              accessibilityRole="button"
            >
              <Text style={[styles.filterChipText, { color: colors.textSecondary }, subjectFilter === 'ALL' && { color: colors.accent, fontWeight: '700' }]}>
                All Subjects
              </Text>
            </TouchableOpacity>
          )}
          {SubjectCodes.map(code => (
            <TouchableOpacity
              key={code}
              style={[
                styles.filterChip,
                isNarrowPhone && styles.filterChipNarrow,
                { backgroundColor: colors.card, borderColor: colors.border },
                subjectFilter === code && [styles.filterChipActive, { backgroundColor: isDark ? colors.cardElevated : colors.backgroundSoft, borderColor: colors.accent }]
              ]}
              onPress={() => setSubjectFilter(code)}
              accessibilityLabel={`Filter by subject ${code}`}
              accessibilityRole="button"
            >
              <Text style={[
                styles.filterChipText,
                isNarrowPhone && styles.filterChipTextNarrow,
                { color: colors.textSecondary },
                subjectFilter === code && { color: colors.accent, fontWeight: '700' },
              ]}>
                {code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </View>

      {/* 3. Main Unified Body Layout */}
      {isDesktop ? (
        // Desktop: High-productivity side-by-side split layout
        <View style={styles.desktopSplitLayout}>
          <View style={styles.desktopLeftCol}>
            {renderCalendarSection()}
          </View>
          <View style={styles.desktopRightCol}>
            {renderChecklistSection()}
          </View>
        </View>
      ) : (
        // Mobile / Tablet: always show calendar + checklist (no section tabs)
        <View style={styles.mobileStackedLayout}>
          {renderCalendarSection()}
          {renderChecklistSection()}
        </View>
      )}

      {/* 4. Modal: Advanced Practice & Confidence Logger (animationType="none") */}
      <Modal visible={logModalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Log Practice & Notes</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {editingSession?.topicCode} · {editingSession?.topicName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLogModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Actual study minutes */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Actual Minutes Studied</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                keyboardType="numeric"
                value={actualMinutesInput}
                onChangeText={setActualMinutesInput}
                placeholder="60"
                placeholderTextColor={colors.textLight}
              />

              {/* Practice Questions attempted & correct */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>MCQs Attempted</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                    keyboardType="numeric"
                    value={attemptedInput}
                    onChangeText={setAttemptedInput}
                    placeholder="e.g. 30"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>MCQs Correct</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                    keyboardType="numeric"
                    value={correctInput}
                    onChangeText={setCorrectInput}
                    placeholder="e.g. 24"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>

              {/* Confidence Rating (1 to 5 Stars) */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Topic Confidence (1 to 5)</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setConfidenceRating(star)}
                    style={styles.starTouch}
                    accessibilityLabel={`Rate confidence ${star} of 5`}
                  >
                    <Star
                      size={24}
                      color={star <= confidenceRating ? colors.accent : colors.border}
                      fill={star <= confidenceRating ? colors.accent : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Difficult Concepts */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Difficult Concepts Encountered</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                value={difficultConcepts}
                onChangeText={setDifficultConcepts}
                placeholder="Specific rules, formulas, or exceptions to review"
                placeholderTextColor={colors.textLight}
              />

              {/* Notes & Follow up */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Review Notes & Next Steps</Text>
              <TextInput
                style={[styles.modalInputMulti, { backgroundColor: colors.backgroundSoft, borderColor: colors.border, color: colors.textPrimary }]}
                multiline
                numberOfLines={3}
                value={sessionNotes}
                onChangeText={setSessionNotes}
                placeholder="Key takeaways or flashcard items"
                placeholderTextColor={colors.textLight}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setLogModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save & Mark Done"
                variant="success"
                onPress={saveAdvancedLog}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      <RescheduleSessionModal
        visible={rescheduleModalVisible}
        session={sessionToReschedule}
        suggestedDate={rescheduleSuggestedDate}
        onCancel={() => {
          setRescheduleModalVisible(false);
          setSessionToReschedule(null);
        }}
        onConfirm={handleConfirmReschedule}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 40,
    width: '100%',
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
    width: '100%',
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  title: {
    fontSize: AcademicTheme.typography.sizes.xl,
    fontWeight: AcademicTheme.typography.weights.bold,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    lineHeight: 20,
    flexShrink: 1,
  },
  statusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  statusPillsRowMobile: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: AcademicTheme.borderRadius.full,
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  pillText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    flexShrink: 1,
    minWidth: 0,
  },
  pillIcon: {
    flexShrink: 0,
  },
  controlsBar: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
    marginBottom: 14,
  },
  filterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
    maxWidth: '100%',
  },
  filterChipAllMobile: {
    alignSelf: 'stretch',
    width: '100%',
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  filterChipActive: {
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: '600',
  },
  filterChipNarrow: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 34,
  },
  filterChipTextNarrow: {
    fontSize: 12,
  },
  desktopSplitLayout: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    width: '100%',
  },
  desktopLeftCol: {
    flex: 1.1,
    minWidth: 0,
  },
  desktopRightCol: {
    flex: 1.3,
    minWidth: 0,
  },
  mobileStackedLayout: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  calendarSectionWrapper: {
    width: '100%',
    marginBottom: 8,
  },
  monthHeaderCard: {
    padding: 12,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
    width: '100%',
  },
  monthCenterContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleText: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    textAlign: 'center',
    flexShrink: 1,
  },
  todayHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
    marginTop: 4,
  },
  todayHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 6,
    marginBottom: 4,
  },
  weekdayCol: {
    width: '14.2857%',
    maxWidth: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  weekdayLabel: {
    textAlign: 'center',
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: '600',
  },
  weekdayLabelNarrow: {
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayCellEmpty: {
    width: '14.2857%',
    maxWidth: '14.2857%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  dayCell: {
    width: '14.2857%',
    maxWidth: '14.2857%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingVertical: 2,
  },
  dateCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  legendCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    flexShrink: 0,
  },
  legendText: {
    fontSize: 12,
    flexShrink: 1,
  },
  checklistSectionWrapper: {
    width: '100%',
  },
  dateNavCard: {
    padding: 12,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    marginBottom: 12,
    width: '100%',
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  navArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: AcademicTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  selectedDateText: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    textAlign: 'center',
    flexShrink: 1,
  },
  todayBadgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
    marginTop: 4,
  },
  todayBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  jumpTodayBtn: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
  },
  jumpTodayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timerCard: {
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    marginBottom: 14,
    width: '100%',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  timerTopicName: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: '500',
    lineHeight: 20,
    flexShrink: 1,
  },
  timerClockDisplay: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  timerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineAlertCard: {
    padding: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  deadlineAlertTitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: '600',
    lineHeight: 20,
  },
  tasksSection: {
    width: '100%',
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    flexShrink: 1,
    minWidth: 0,
  },
  tasksList: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  taskCard: {
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  checkboxTouchable: {
    padding: 2,
    marginTop: 2,
    flexShrink: 0,
  },
  taskContentCol: {
    flex: 1,
    minWidth: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
    width: '100%',
  },
  taskCode: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
  taskPart: {
    fontSize: AcademicTheme.typography.sizes.sm,
    flexShrink: 1,
  },
  compactUpperRightBtn: {
    padding: 6,
    borderRadius: AcademicTheme.borderRadius.sm,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  taskTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.medium,
    lineHeight: 22,
    marginBottom: 6,
    flexShrink: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 13,
  },
  taskBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    gap: 6,
  },
  emptyTitle: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalInputMulti: {
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  starTouch: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 16,
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
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
