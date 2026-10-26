import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput 
} from 'react-native';
import { AcademicTheme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { PageHero } from '../components/ui/PageHero';
import { SubjectCode, SubjectCodes } from '../types';
import { 
  Award, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  BookOpen, 
  Check, 
  X,
  Target
} from 'lucide-react-native';

export default function WeeklyReviewScreen() {
  const { state, analytics, logPracticeAttempt } = useApp();
  const { theme, isDark } = useTheme();

  // Practice session configuration
  const [questionCountInput, setQuestionCountInput] = useState('20');
  const [timeLimitMinutesInput, setTimeLimitMinutesInput] = useState('50');
  const [selectedSubject, setSelectedSubject] = useState<SubjectCode>('FAR');

  // Practice test live state
  const [isTestActive, setIsTestActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(50 * 60);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [practiceNotes, setPracticeNotes] = useState('');

  // Live timer interval
  useEffect(() => {
    let interval: any = null;
    if (isTestActive && !isPaused && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            setIsTestActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTestActive, isPaused, secondsRemaining]);

  const handleStartTest = () => {
    const mins = parseInt(timeLimitMinutesInput, 10) || 50;
    setSecondsRemaining(mins * 60);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsTestActive(true);
    setIsPaused(false);
  };

  const handleFinishTest = async () => {
    const totalAttempted = correctCount + incorrectCount;
    const timeLimitMins = parseInt(timeLimitMinutesInput, 10) || 50;
    const timeSpentMins = Math.max(1, Math.round((timeLimitMins * 60 - secondsRemaining) / 60));

    await logPracticeAttempt({
      date: new Date().toISOString().split('T')[0],
      subject: selectedSubject,
      attempted: totalAttempted,
      correct: correctCount,
      timeSpentMinutes: timeSpentMins,
      notes: practiceNotes,
    });

    setIsTestActive(false);
    alert(`Practice Set Completed! ${correctCount}/${totalAttempted} correct (${totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0}% accuracy)`);
    setPracticeNotes('');
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalAttempted = correctCount + incorrectCount;
  const currentAccuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      
      <PageHero
        title="Weekly Review & Practice Tracker"
        subtitle={state.weeklyReviewTask || 'Track weekly practice sets and Sunday review progress'}
      />

      {/* 2. Practice Set Simulator */}
      <Card style={[styles.simulatorCard, { backgroundColor: theme.surface, borderColor: isDark ? 'rgba(5, 150, 105, 0.4)' : AcademicTheme.colors.accentLight }]}>
        <View style={styles.simHeader}>
          <View style={styles.simHeaderLeft}>
            <Target size={22} color={theme.accent} />
            <Text style={[styles.simTitle, { color: theme.textPrimary }]}>Timed Practice Set Simulator</Text>
          </View>
          {isTestActive && (
            <Badge label={isPaused ? 'Paused' : 'In Progress'} variant={isPaused ? 'warning' : 'success'} />
          )}
        </View>

        {!isTestActive ? (
          <View style={styles.configSection}>
            <Text style={[styles.configDesc, { color: theme.textSecondary }]}>
              Simulate actual board examination pacing. Default standard is 20 multiple-choice items in 50 minutes.
            </Text>

            <View style={styles.configInputsRow}>
              <View style={styles.configCol}>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Subject</Text>
                <View style={styles.subjectWrap}>
                  {SubjectCodes.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.subjectBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }, selectedSubject === c && [styles.subjectBtnActive, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                      onPress={() => setSelectedSubject(c)}
                      accessibilityLabel={`Select subject ${c}`}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.subjectBtnText, { color: theme.textSecondary }, selectedSubject === c && styles.subjectBtnTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.questionTimeRow}>
              <View style={styles.questionTimeCol}>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]} numberOfLines={2}>
                  Question Count
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                  keyboardType="numeric"
                  value={questionCountInput}
                  onChangeText={setQuestionCountInput}
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel="Question Count"
                />
              </View>

              <View style={styles.questionTimeCol}>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]} numberOfLines={2}>
                  Time Limit (Minutes)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                  keyboardType="numeric"
                  value={timeLimitMinutesInput}
                  onChangeText={setTimeLimitMinutesInput}
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel="Time Limit in Minutes"
                />
              </View>
            </View>

            <Button
              title="Start Timed Practice Set"
              icon={<Play size={16} color="#FFF" />}
              variant="primary"
              onPress={handleStartTest}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <View style={styles.activeTestSection}>
            {/* Live Clock Display */}
            <View style={[styles.liveClockRow, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}>
              <View>
                <Text style={[styles.clockLabel, { color: theme.textMuted }]}>Time Remaining</Text>
                <Text style={[styles.clockDisplay, { color: theme.accent }, secondsRemaining <= 300 && { color: theme.danger }]}>
                  {formatTimer(secondsRemaining)}
                </Text>
              </View>

              <View style={styles.liveScoreBadge}>
                <Text style={[styles.liveAccuracy, { color: theme.textPrimary }]}>{currentAccuracy}%</Text>
                <Text style={[styles.liveAccuracySub, { color: theme.textMuted }]}>{correctCount} / {totalAttempted} items</Text>
              </View>
            </View>

            {/* Live score buttons */}
            <View style={styles.scoreTallyRow}>
              <TouchableOpacity
                style={[styles.tallyBtn, styles.tallyCorrect]}
                onPress={() => setCorrectCount(prev => prev + 1)}
              >
                <Check size={20} color="#FFF" />
                <Text style={styles.tallyBtnText}>Correct (+1)</Text>
                <Text style={styles.tallyCount}>{correctCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tallyBtn, styles.tallyIncorrect]}
                onPress={() => setIncorrectCount(prev => prev + 1)}
              >
                <X size={20} color="#FFF" />
                <Text style={styles.tallyBtnText}>Incorrect (+1)</Text>
                <Text style={styles.tallyCount}>{incorrectCount}</Text>
              </TouchableOpacity>
            </View>

            {/* Notes on mistakes */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Mistakes & Concepts to Revisit</Text>
            <TextInput
              style={[styles.input, { minHeight: 60, textAlignVertical: 'top', backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
              multiline
              placeholder="Record problem numbers, tricky distractor choices, or formulas to review..."
              placeholderTextColor={theme.textMuted}
              value={practiceNotes}
              onChangeText={setPracticeNotes}
            />

            {/* Controls */}
            <View style={styles.testControlsRow}>
              <Button
                title={isPaused ? 'Resume Timer' : 'Pause Timer'}
                variant="outline"
                onPress={() => setIsPaused(!isPaused)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Finish & Log Results"
                variant="success"
                onPress={handleFinishTest}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </Card>

      {/* 3. Targeted Revision: Weak Topics List */}
      <Card style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <AlertTriangle size={20} color={theme.accent} />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Targeted Weak-Topic Revision List</Text>
        </View>

        {analytics.weakTopics.length > 0 ? (
          <View style={styles.weakList}>
            {analytics.weakTopics.map(w => (
              <View key={w.code} style={[styles.weakItem, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.weakMeta}>
                    <Badge label={w.subject} variant="subject" subject={w.subject} size="sm" />
                    <Text style={[styles.weakCode, { color: theme.textSecondary }]}>{w.code}</Text>
                    <Badge label={w.reason} variant="warning" size="sm" />
                  </View>
                  <Text style={[styles.weakName, { color: theme.textPrimary }]}>{w.name}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <CheckCircle size={28} color={theme.success} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No topics flagged as difficult yet. Keep rating your confidence during daily study!</Text>
          </View>
        )}
      </Card>

      {/* 4. Practice Attempts History */}
      <Card style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Practice Attempts</Text>

        {state.practiceAttempts.length > 0 ? (
          <View style={styles.attemptsList}>
            {state.practiceAttempts.slice().reverse().map(attempt => {
              const acc = attempt.attempted > 0 ? Math.round((attempt.correct / attempt.attempted) * 100) : 0;
              return (
                <View key={attempt.id} style={[styles.attemptItem, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.attemptTop}>
                      {attempt.subject && <Badge label={attempt.subject} variant="subject" subject={attempt.subject} size="sm" />}
                      <Text style={[styles.attemptDate, { color: theme.textMuted }]}>{attempt.date}</Text>
                      <Text style={[styles.attemptTime, { color: theme.textMuted }]}>{attempt.timeSpentMinutes} mins</Text>
                    </View>
                    <Text style={[styles.attemptScore, { color: theme.textPrimary }]}>
                      {attempt.correct} / {attempt.attempted} correct ({acc}% accuracy)
                    </Text>
                    {attempt.notes ? <Text style={[styles.attemptNotes, { color: theme.textSecondary }]}>{attempt.notes}</Text> : null}
                  </View>
                  <Badge 
                    label={`${acc}%`} 
                    variant={acc >= 75 ? 'success' : acc >= 50 ? 'warning' : 'danger'} 
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.emptyHistoryText, { color: theme.textMuted }]}>No practice test attempts recorded yet. Complete your first practice set above!</Text>
        )}
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AcademicTheme.colors.background,
  },
  contentContainer: {
    padding: AcademicTheme.spacing.lg,
    paddingBottom: 60,
  },
  header: {
    marginBottom: AcademicTheme.spacing.md,
  },
  title: {
    fontSize: AcademicTheme.typography.sizes.xl,
    fontWeight: AcademicTheme.typography.weights.bold,
    color: AcademicTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: AcademicTheme.colors.accent,
    fontWeight: AcademicTheme.typography.weights.semibold,
    marginTop: 2,
  },
  simulatorCard: {
    backgroundColor: '#FFF',
    marginBottom: AcademicTheme.spacing.md,
    borderWidth: 1,
    borderColor: AcademicTheme.colors.accentLight,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  simHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simTitle: {
    fontSize: 18,
    fontWeight: AcademicTheme.typography.weights.bold,
    color: AcademicTheme.colors.textPrimary,
  },
  configSection: {},
  configDesc: {
    fontSize: 14,
    color: AcademicTheme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  configInputsRow: {
    marginBottom: 12,
  },
  configCol: {},
  questionTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    width: '100%',
    maxWidth: '100%',
  },
  questionTimeCol: {
    flex: 1,
    minWidth: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    color: AcademicTheme.colors.textPrimary,
    marginBottom: 6,
    lineHeight: 18,
    flexShrink: 1,
  },
  input: {
    backgroundColor: AcademicTheme.colors.backgroundSoft,
    borderWidth: 1,
    borderColor: AcademicTheme.colors.cardBorder,
    borderRadius: AcademicTheme.borderRadius.md,
    padding: 10,
    fontSize: 15,
    color: AcademicTheme.colors.textPrimary,
    width: '100%',
    minWidth: 0,
  },
  subjectWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  subjectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: AcademicTheme.borderRadius.sm,
    backgroundColor: AcademicTheme.colors.backgroundSubtle,
  },
  subjectBtnActive: {
    backgroundColor: AcademicTheme.colors.accent,
  },
  subjectBtnText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.medium,
    color: AcademicTheme.colors.textSecondary,
  },
  subjectBtnTextActive: {
    color: '#FFF',
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  activeTestSection: {},
  liveClockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AcademicTheme.colors.backgroundSoft,
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.md,
    marginBottom: 14,
  },
  clockLabel: {
    fontSize: 13,
    color: AcademicTheme.colors.textMuted,
  },
  clockDisplay: {
    fontSize: 32,
    fontWeight: AcademicTheme.typography.weights.bold,
    color: AcademicTheme.colors.accent,
  },
  liveScoreBadge: {
    alignItems: 'flex-end',
  },
  liveAccuracy: {
    fontSize: 24,
    fontWeight: AcademicTheme.typography.weights.bold,
    color: AcademicTheme.colors.textPrimary,
  },
  liveAccuracySub: {
    fontSize: 13,
    color: AcademicTheme.colors.textMuted,
  },
  scoreTallyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  tallyBtn: {
    flex: 1,
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tallyCorrect: {
    backgroundColor: AcademicTheme.colors.success,
  },
  tallyIncorrect: {
    backgroundColor: AcademicTheme.colors.danger,
  },
  tallyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    marginTop: 4,
  },
  tallyCount: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  testControlsRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    marginBottom: AcademicTheme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: AcademicTheme.typography.weights.bold,
    color: AcademicTheme.colors.textPrimary,
    marginBottom: 10,
  },
  weakList: {
    gap: 8,
  },
  weakItem: {
    padding: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    backgroundColor: AcademicTheme.colors.backgroundSoft,
  },
  weakMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  weakCode: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.bold,
    color: AcademicTheme.colors.textSecondary,
  },
  weakName: {
    fontSize: 15,
    fontWeight: AcademicTheme.typography.weights.semibold,
    color: AcademicTheme.colors.textPrimary,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 14,
    color: AcademicTheme.colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  attemptsList: {
    gap: 8,
  },
  attemptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    backgroundColor: AcademicTheme.colors.backgroundSoft,
  },
  attemptTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  attemptDate: {
    fontSize: 13,
    color: AcademicTheme.colors.textMuted,
  },
  attemptTime: {
    fontSize: 13,
    color: AcademicTheme.colors.textMuted,
  },
  attemptScore: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    color: AcademicTheme.colors.textPrimary,
  },
  attemptNotes: {
    fontSize: 13,
    color: AcademicTheme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: AcademicTheme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
