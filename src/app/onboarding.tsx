import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput 
} from 'react-native';
import { useRouter } from 'expo-router';
import { AcademicTheme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SchedulingEngine } from '../services/scheduler/schedulingEngine';
import { SubjectCodes, TakerType, WorkSetup, StudyPlanDay, DayRoutine } from '../types';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Calendar, 
  Briefcase, 
  Coffee, 
  BookOpen, 
  AlertCircle,
  Sparkles
} from 'lucide-react-native';

export default function OnboardingScreen() {
  const router = useRouter();
  const { 
    state, 
    updateUserProfile, 
    updateExamPlan, 
    updateWeeklySchedule, 
    updateWorkPeriod, 
    updateStudyMaterial,
    updateWeeklyReviewTask,
    completeOnboarding 
  } = useApp();
  const { theme, isDark } = useTheme();

  const [step, setStep] = useState(1);

  // Form State
  const [fullName, setFullName] = useState(state.userProfile.fullName || '');
  const [nickname, setNickname] = useState(state.userProfile.nickname || 'Future CPA');
  const [takerType, setTakerType] = useState<TakerType>(state.userProfile.takerType || 'First-timer');
  const [isWorking, setIsWorking] = useState(state.userProfile.isWorking);

  const [studyStartDate, setStudyStartDate] = useState(state.examPlan.studyStartDate || '2026-08-24');
  const [examDay1, setExamDay1] = useState(state.examPlan.examDay1 || '2027-05-23');
  const [day1Subjects, setDay1Subjects] = useState(state.examPlan.day1Subjects || 'MS & AUD');
  const [day2Subjects, setDay2Subjects] = useState(state.examPlan.day2Subjects || 'TAX & RFBT');
  const [day3Subjects, setDay3Subjects] = useState(state.examPlan.day3Subjects || 'FAR & AFAR');
  const [targetFinishDate, setTargetFinishDate] = useState(state.examPlan.targetFinishDate || '2027-03-31');
  const [firstPreboardStart, setFirstPreboardStart] = useState(state.examPlan.firstPreboardStart || '2027-02-20');
  const [firstPreboardEnd, setFirstPreboardEnd] = useState(state.examPlan.firstPreboardEnd || '2027-02-21');
  const [finalPreboardStart, setFinalPreboardStart] = useState(state.examPlan.finalPreboardStart || '2027-04-23');
  const [finalPreboardEnd, setFinalPreboardEnd] = useState(state.examPlan.finalPreboardEnd || '2027-04-25');
  const [topicOrderMode, setTopicOrderMode] = useState(state.examPlan.topicOrderMode || 'Recommended');

  const [weeklySchedule, setWeeklySchedule] = useState<DayRoutine[]>(state.weeklySchedule);
  const [reviewTask, setReviewTask] = useState(state.weeklyReviewTask);

  const handleNext = async () => {
    if (step === 1) {
      await updateUserProfile({ fullName, nickname, takerType, isWorking });
      setStep(2);
    } else if (step === 2) {
      const { examDay2, examDay3 } = SchedulingEngine.calculateExamDates(examDay1);
      await updateExamPlan({
        studyStartDate,
        examDay1,
        examDay2,
        examDay3,
        day1Subjects,
        day2Subjects,
        day3Subjects,
        targetFinishDate,
        firstPreboardStart,
        firstPreboardEnd,
        finalPreboardStart,
        finalPreboardEnd,
        topicOrderMode,
      });
      setStep(3);
    } else if (step === 3) {
      await updateWeeklySchedule(weeklySchedule);
      setStep(isWorking ? 4 : 5);
    } else if (step === 4) {
      setStep(5);
    } else if (step === 5) {
      setStep(6);
    } else if (step === 6) {
      await updateWeeklyReviewTask(reviewTask);
      setStep(7);
    } else if (step === 7) {
      await completeOnboarding();
      router.replace('/' as any);
    }
  };

  const handleBack = () => {
    if (step === 5 && !isWorking) {
      setStep(3);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      
      {/* Wizard Header */}
      <View style={styles.header}>
        <View style={[styles.stepBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.25)' : AcademicTheme.colors.accentLight }]}>
          <Text style={[styles.stepBadgeText, { color: theme.accent }]}>Section {step} of 7</Text>
        </View>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {step === 1 && 'Section 1 · About You'}
          {step === 2 && 'Section 2 · Exam & Planning Dates'}
          {step === 3 && 'Section 3 · Your Weekly Routine'}
          {step === 4 && 'Section 4 · Busy Times at Work'}
          {step === 5 && 'Section 5 · Configured Rest Days'}
          {step === 6 && 'Section 6 · Study Materials & Review Day'}
          {step === 7 && 'Section 7 · Key Dates & Deadlines Review'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Make this tracker yours. Configured values match the official Setup workbook and can be updated anytime.
        </Text>
      </View>

      {/* Step 1: About You */}
      {step === 1 && (
        <Card style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="e.g. Juan Dela Cruz"
            placeholderTextColor={theme.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Nickname / Study Handle</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Future CPA"
            placeholderTextColor={theme.textMuted}
            value={nickname}
            onChangeText={setNickname}
          />
          <Text style={[styles.hintText, { color: theme.textMuted }]}>{'Used in supportive greetings like "Hello, Future CPA!".'}</Text>

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Taker Type</Text>
          <View style={styles.choiceRow}>
            {(['First-timer', 'Repeater'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.choiceBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }, takerType === t && [styles.choiceBtnActive, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                onPress={() => setTakerType(t)}
              >
                <Text style={[styles.choiceBtnText, { color: theme.textSecondary }, takerType === t && styles.choiceBtnTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.hintText, { color: theme.textMuted }]}>Influences LERIS filing reminders and document checklist.</Text>

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Working while reviewing?</Text>
          <View style={styles.choiceRow}>
            {[
              { label: 'No (Full-time review)', val: false },
              { label: 'Yes (Working reviewee)', val: true },
            ].map(item => (
              <TouchableOpacity
                key={String(item.val)}
                style={[styles.choiceBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }, isWorking === item.val && [styles.choiceBtnActive, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                onPress={() => setIsWorking(item.val)}
              >
                <Text style={[styles.choiceBtnText, { color: theme.textSecondary }, isWorking === item.val && styles.choiceBtnTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.hintText, { color: theme.textMuted }]}>Yes enables workload tags (Onsite, Month-end close, Busy season light study).</Text>
        </Card>
      )}

      {/* Step 2: Exam & Planning Dates */}
      {step === 2 && (
        <Card style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Study Start Date (Day 1 of review)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            value={studyStartDate}
            onChangeText={setStudyStartDate}
            placeholder="2026-08-24"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>CPALE Day 1 (Tentative examination date)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            value={examDay1}
            onChangeText={setExamDay1}
            placeholder="2027-05-23"
            placeholderTextColor={theme.textMuted}
          />
          <Text style={[styles.hintText, { color: theme.textMuted }]}>Exam is 3 consecutive days. Day 2 and Day 3 update automatically.</Text>

          <View style={styles.inputGrid}>
            <View style={styles.gridCol}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Day 1 Subjects</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]} value={day1Subjects} onChangeText={setDay1Subjects} />
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Day 2 Subjects</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]} value={day2Subjects} onChangeText={setDay2Subjects} />
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Day 3 Subjects</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]} value={day3Subjects} onChangeText={setDay3Subjects} />
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Target Date to Finish All Topics</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            value={targetFinishDate}
            onChangeText={setTargetFinishDate}
            placeholder="2027-03-31"
            placeholderTextColor={theme.textMuted}
          />

          <View style={styles.inputGrid}>
            <View style={styles.gridCol2}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>1st Preboard (From - To)</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]} value={`${firstPreboardStart} to ${firstPreboardEnd}`} editable={false} />
            </View>
            <View style={styles.gridCol2}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Final Preboard (From - To)</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]} value={`${finalPreboardStart} to ${finalPreboardEnd}`} editable={false} />
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Topic Order Mode</Text>
          <View style={styles.choiceRow}>
            {[
              { id: 'Recommended', label: 'Recommended Study Order' },
              { id: 'Automatic', label: 'Automatic (All 165 Topics)' },
            ].map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.choiceBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }, topicOrderMode === m.id && [styles.choiceBtnActive, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                onPress={() => setTopicOrderMode(m.id as any)}
              >
                <Text style={[styles.choiceBtnText, { color: theme.textSecondary }, topicOrderMode === m.id && styles.choiceBtnTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      )}

      {/* Step 3: Weekly Routine */}
      {step === 3 && (
        <Card style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.configDesc, { color: theme.textSecondary }]}>
            Configure your standard weekly schedule. Weekdays default to 1 topic and Sunday to Weekly review.
          </Text>

          {weeklySchedule.map((routine, idx) => (
            <View key={routine.dayOfWeek} style={[styles.routineRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.routineDay, { color: theme.textPrimary }]}>{routine.dayOfWeek}</Text>

              <View style={styles.routineSelectCol}>
                <TouchableOpacity 
                  style={[styles.routineBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  onPress={() => {
                    const choices: StudyPlanDay[] = ['1 topic', '2 topics', '3 topics', 'Weekly review', 'Rest day'];
                    const nextIdx = (choices.indexOf(routine.studyPlan) + 1) % choices.length;
                    const updated = [...weeklySchedule];
                    updated[idx].studyPlan = choices[nextIdx];
                    setWeeklySchedule(updated);
                  }}
                >
                  <Text style={[styles.routineBtnText, { color: theme.textPrimary }]}>{routine.studyPlan}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Step 4: Busy Times (Only if working) */}
      {step === 4 && (
        <Card style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.configDesc, { color: theme.textSecondary }]}>
            Working reviewee settings: Month-end close days and busy season tags ensure reasonable study expectations.
          </Text>

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Month-end close (Day of month from - to)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="e.g. 5 to 10 (weekdays only)"
            placeholderTextColor={theme.textMuted}
            value={state.workPeriod.monthEndCloseStartDay ? `${state.workPeriod.monthEndCloseStartDay} to ${state.workPeriod.monthEndCloseEndDay}` : ''}
            onChangeText={(txt) => {
              const parts = txt.split(/[–\-to]/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
              if (parts.length >= 2) {
                updateWorkPeriod({ monthEndCloseStartDay: parts[0], monthEndCloseEndDay: parts[1] });
              }
            }}
          />

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Peak Week Target Duration (Default: 25 minutes)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            keyboardType="numeric"
            defaultValue="25"
            placeholderTextColor={theme.textMuted}
            onChangeText={(txt) => updateWorkPeriod({ peakWeekTargetMinutes: parseInt(txt, 10) || 25 })}
          />
        </Card>
      )}

      {/* Step 5: Rest Days */}
      {step === 5 && (
        <Card style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.configDesc, { color: theme.textSecondary }]}>
            Configured rest days receive no normal study topic assignments, preserving your personal time.
          </Text>

          {state.restDays.map((r, i) => (
            <View key={r.id} style={[styles.restDayItem, { borderBottomColor: theme.border }]}>
              <Coffee size={16} color={theme.accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.restDayDate, { color: theme.textPrimary }]}>{r.date}</Text>
                <Text style={[styles.restDayName, { color: theme.textMuted }]}>{r.name}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Step 6: Materials & Review Day */}
      {step === 6 && (
        <Card style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.configDesc, { color: theme.textSecondary }]}>
            Default learning materials per subject and weekly review activity:
          </Text>

          {SubjectCodes.map(code => (
            <View key={code} style={styles.matRow}>
              <Badge label={code} variant="subject" subject={code} />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10, backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                defaultValue={state.studyMaterials[code]?.materialText || 'practice questions'}
                onChangeText={(txt) => updateStudyMaterial(code, { materialText: txt })}
              />
            </View>
          ))}

          <Text style={[styles.inputLabel, { marginTop: 14, color: theme.textPrimary }]}>Weekly Review Task</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            value={reviewTask}
            onChangeText={setReviewTask}
          />
        </Card>
      )}

      {/* Step 7: Key Dates Summary */}
      {step === 7 && (
        <Card style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.configDesc, { color: theme.textSecondary }]}>
            12 key exam milestones imported from the setup reference. Verified and updated automatically:
          </Text>

          <ScrollView style={{ maxHeight: 300 }}>
            {state.deadlines.map(d => (
              <View key={d.id} style={[styles.deadlineReviewRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deadlineReviewTitle, { color: theme.textPrimary }]}>{d.title}</Text>
                  <Text style={[styles.deadlineReviewDate, { color: theme.textMuted }]}>{d.dueDate} · {d.verificationStatus}</Text>
                </View>
                <Badge label={d.category} variant="info" size="sm" />
              </View>
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Navigation Buttons */}
      <View style={styles.btnRow}>
        {step > 1 && (
          <Button
            title="Previous"
            variant="outline"
            icon={<ChevronLeft size={16} color={theme.textPrimary} />}
            onPress={handleBack}
            style={{ flex: 1, marginRight: 8 }}
          />
        )}
        <Button
          title={step === 7 ? 'Complete Setup & Open App' : 'Save & Continue'}
          variant="primary"
          icon={step === 7 ? <Sparkles size={16} color="#FFF" /> : <ChevronRight size={16} color="#FFF" />}
          onPress={handleNext}
          style={{ flex: 1 }}
        />
      </View>

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
  stepBadge: {
    backgroundColor: AcademicTheme.colors.accentLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: AcademicTheme.borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  stepBadgeText: {
    fontSize: 13,
    color: AcademicTheme.colors.accent,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  title: {
    fontSize: AcademicTheme.typography.sizes.xl,
    fontWeight: AcademicTheme.typography.weights.bold,
    color: AcademicTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: AcademicTheme.colors.textMuted,
    marginTop: 2,
    lineHeight: 20,
  },
  stepCard: {
    backgroundColor: '#FFF',
    marginBottom: AcademicTheme.spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    color: AcademicTheme.colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: AcademicTheme.colors.backgroundSoft,
    borderWidth: 1,
    borderColor: AcademicTheme.colors.cardBorder,
    borderRadius: AcademicTheme.borderRadius.md,
    padding: 10,
    fontSize: 15,
    color: AcademicTheme.colors.textPrimary,
  },
  hintText: {
    fontSize: 13,
    color: AcademicTheme.colors.textMuted,
    marginTop: 3,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  choiceBtn: {
    flex: 1,
    minWidth: 120,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    backgroundColor: AcademicTheme.colors.backgroundSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBtnActive: {
    backgroundColor: AcademicTheme.colors.accent,
  },
  choiceBtnText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.medium,
    color: AcademicTheme.colors.textSecondary,
  },
  choiceBtnTextActive: {
    color: '#FFF',
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  gridCol: {
    flex: 1,
    minWidth: 95,
  },
  gridCol2: {
    flex: 1,
    minWidth: 140,
  },
  configDesc: {
    fontSize: 14,
    color: AcademicTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AcademicTheme.colors.borderLight,
  },
  routineDay: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
    color: AcademicTheme.colors.textPrimary,
    width: 90,
  },
  routineSelectCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  routineBtn: {
    backgroundColor: AcademicTheme.colors.backgroundSoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: AcademicTheme.colors.border,
  },
  routineBtnText: {
    fontSize: 14,
    color: AcademicTheme.colors.textPrimary,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  restDayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AcademicTheme.colors.borderLight,
  },
  restDayDate: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.bold,
    color: AcademicTheme.colors.textPrimary,
  },
  restDayName: {
    fontSize: 13,
    color: AcademicTheme.colors.textMuted,
  },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deadlineReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AcademicTheme.colors.borderLight,
  },
  deadlineReviewTitle: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    color: AcademicTheme.colors.textPrimary,
  },
  deadlineReviewDate: {
    fontSize: 13,
    color: AcademicTheme.colors.textMuted,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
});
