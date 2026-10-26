import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { StudySession } from '../../types';
import { SchedulingEngine } from '../../services/scheduler/schedulingEngine';
import { ReschedulingEngine } from '../../services/rescheduling/reschedulingEngine';
import { Button } from './Button';
import { Card } from './Card';
import { DatePickerModal } from './DatePickerModal';
import { Calendar, Clock } from 'lucide-react-native';

const DURATION_OPTIONS = [25, 45, 60, 90, 120];

export interface RescheduleSessionModalProps {
  visible: boolean;
  session: StudySession | null;
  suggestedDate?: string;
  onCancel: () => void;
  onConfirm: (payload: { newDate: string; plannedDuration: number }) => void | Promise<void>;
}

/**
 * Manual reschedule dialog — pick a preferred date and study duration
 * before confirming. Nothing is saved until Confirm Reschedule.
 */
export const RescheduleSessionModal: React.FC<RescheduleSessionModalProps> = ({
  visible,
  session,
  suggestedDate,
  onCancel,
  onConfirm,
}) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  const todayStr = useMemo(() => SchedulingEngine.formatDate(new Date()), []);

  const defaultDate = useMemo(() => {
    if (suggestedDate && suggestedDate >= todayStr) return suggestedDate;
    if (session?.date && session.date >= todayStr) {
      return SchedulingEngine.addDays(session.date, 1);
    }
    return todayStr;
  }, [suggestedDate, session?.date, todayStr]);

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [plannedDuration, setPlannedDuration] = useState(session?.plannedDuration || 60);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible || !session) return;
    setSelectedDate(defaultDate);
    setPlannedDuration(session.plannedDuration || 60);
    setError('');
    setIsSaving(false);
  }, [visible, session, defaultDate]);

  if (!session) return null;

  const handleConfirm = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      setError('Please select a valid date.');
      return;
    }
    if (selectedDate < todayStr) {
      setError('Choose today or a future date.');
      return;
    }
    if (!plannedDuration || plannedDuration < 15) {
      setError('Choose a study duration of at least 15 minutes.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onConfirm({ newDate: selectedDate, plannedDuration });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
        <View style={styles.overlay}>
          <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }, isCompact && styles.cardCompact]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.title, { color: colors.textPrimary }]}>Reschedule Session</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {session.topicCode ? `${session.topicCode}: ` : ''}
                {session.topicName || session.notes || session.type}
              </Text>

              <View style={[styles.compareBox, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}>
                <Text style={[styles.compareLabel, { color: colors.textMuted }]}>Original schedule</Text>
                <Text style={[styles.compareValue, { color: colors.textPrimary }]}>{session.date}</Text>
                <Text style={[styles.compareMeta, { color: colors.textSecondary }]}>
                  {session.plannedDuration || 60} minutes planned
                </Text>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Text style={[styles.compareLabel, { color: colors.textMuted }]}>New schedule</Text>
                <Text style={[styles.compareValue, { color: colors.accent }]}>{selectedDate}</Text>
                <Text style={[styles.compareMeta, { color: colors.textSecondary }]}>
                  {plannedDuration} minutes planned
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Preferred new date</Text>
              <TouchableOpacity
                style={[styles.dateBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={() => setDatePickerVisible(true)}
                accessibilityLabel="Select preferred reschedule date"
              >
                <Calendar size={16} color={colors.accent} />
                <Text style={[styles.dateBtnText, { color: colors.textPrimary }]}>{selectedDate}</Text>
              </TouchableOpacity>
              {suggestedDate ? (
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  Suggested earliest slot: {suggestedDate}
                </Text>
              ) : null}

              <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                Study session duration
              </Text>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((mins) => {
                  const active = plannedDuration === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.durationChip,
                        {
                          backgroundColor: active
                            ? (isDark ? colors.cardElevated : colors.accentLight)
                            : colors.surfaceElevated,
                          borderColor: active ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => setPlannedDuration(mins)}
                      accessibilityLabel={`${mins} minutes`}
                      accessibilityState={{ selected: active }}
                    >
                      <Clock size={12} color={active ? colors.accent : colors.textMuted} />
                      <Text
                        style={[
                          styles.durationText,
                          { color: active ? colors.accent : colors.textSecondary },
                          active && { fontWeight: '700' },
                        ]}
                      >
                        {mins}m
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.note, { color: colors.textSecondary }]}>
                The original session is kept as Missed. A catch-up session is added on your selected date. Nothing is saved until you confirm.
              </Text>

              {error ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              ) : null}

              <View style={[styles.actions, isCompact && styles.actionsStack]}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={onCancel}
                  disabled={isSaving}
                  style={isCompact ? { width: '100%' } : { flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Confirm Reschedule"
                  variant="primary"
                  onPress={handleConfirm}
                  loading={isSaving}
                  disabled={isSaving}
                  style={isCompact ? { width: '100%' } : { flex: 1 }}
                />
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      <DatePickerModal
        visible={datePickerVisible}
        title="Select New Study Date"
        selectedDate={selectedDate}
        minDate={todayStr}
        onClose={() => setDatePickerVisible(false)}
        onSelectDate={(dateStr) => {
          setSelectedDate(dateStr);
          setDatePickerVisible(false);
          setError('');
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    padding: 18,
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.xl,
  },
  cardCompact: {
    padding: 14,
  },
  title: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  compareBox: {
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    padding: 12,
    marginBottom: 14,
  },
  compareLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  compareValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  compareMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  durationText: {
    fontSize: 13,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 14,
  },
  errorText: {
    fontSize: 13,
    marginTop: 10,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  actionsStack: {
    flexDirection: 'column',
    gap: 8,
  },
});

/** Helper to build a suggested date using existing engine preview. */
export function getSuggestedRescheduleDate(
  sessions: StudySession[],
  sessionId: string,
  examPlan: Parameters<typeof ReschedulingEngine.previewRescheduleMissedSession>[0]['examPlan'],
): string | undefined {
  const preview = ReschedulingEngine.previewRescheduleMissedSession({
    sessions,
    missedSessionId: sessionId,
    examPlan,
  });
  return preview?.proposedDate;
}
