import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity 
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Button } from './Button';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  X,
  Check
} from 'lucide-react-native';

export interface DatePickerModalProps {
  visible: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onSelectDate?: (dateStr: string) => void;
  onConfirm?: (dateStr: string) => void;
  selectedDate?: string; // 'YYYY-MM-DD'
  initialDate?: string;
  title?: string;
  minDate?: string;
  maxDate?: string;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onCancel,
  onSelectDate,
  onConfirm,
  selectedDate,
  initialDate,
  title = 'Select Date',
  minDate,
  maxDate,
}) => {
  const { colors } = useTheme();

  const closeHandler = onClose || onCancel || (() => {});
  const confirmHandler = onSelectDate || onConfirm || (() => {});
  const effectiveInitialDate = selectedDate || initialDate;

  // Helper to get today's date formatted
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = useMemo(() => getTodayStr(), []);

  // Internal state for selected date and currently viewed month
  const [activeDate, setActiveDate] = useState<string>(() => {
    return effectiveInitialDate && /^\d{4}-\d{2}-\d{2}$/.test(effectiveInitialDate)
      ? effectiveInitialDate
      : todayStr;
  });

  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const base = effectiveInitialDate && /^\d{4}-\d{2}-\d{2}$/.test(effectiveInitialDate)
      ? new Date(effectiveInitialDate + 'T00:00:00')
      : new Date();
    return { year: base.getFullYear(), month: base.getMonth() }; // month is 0-indexed
  });

  // Adjust state when effectiveInitialDate changes without cascading effect
  const [prevDate, setPrevDate] = useState(effectiveInitialDate);
  if (effectiveInitialDate !== prevDate) {
    setPrevDate(effectiveInitialDate);
    const valid = effectiveInitialDate && /^\d{4}-\d{2}-\d{2}$/.test(effectiveInitialDate);
    const chosen = valid ? effectiveInitialDate : todayStr;
    setActiveDate(chosen);
    const base = new Date(chosen + 'T00:00:00');
    if (!isNaN(base.getTime())) {
      setCurrentYearMonth({ year: base.getFullYear(), month: base.getMonth() });
    }
  }

  const { daysInMonth, startWeekday, monthName } = useMemo(() => {
    const d = new Date(currentYearMonth.year, currentYearMonth.month, 1);
    const mName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const startDay = d.getDay(); // 0 is Sun
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

  const handlePrevYear = () => {
    setCurrentYearMonth(prev => ({ ...prev, year: prev.year - 1 }));
  };

  const handleNextYear = () => {
    setCurrentYearMonth(prev => ({ ...prev, year: prev.year + 1 }));
  };

  const handleConfirm = () => {
    if (minDate && activeDate < minDate) {
      alert(`Please select a date on or after ${minDate}.`);
      return;
    }
    if (maxDate && activeDate > maxDate) {
      alert(`Please select a date on or before ${maxDate}.`);
      return;
    }
    confirmHandler(activeDate);
    closeHandler();
  };

  const formattedDisplay = useMemo(() => {
    if (!activeDate || !/^\d{4}-\d{2}-\d{2}$/.test(activeDate)) return '';
    try {
      const d = new Date(activeDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return activeDate;
    }
  }, [activeDate]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeHandler}>
      <View style={styles.modalOverlay}>
        <View style={[styles.dialogCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          
          {/* Header */}
          <View style={[styles.dialogHeader, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <CalendarIcon size={18} color={colors.accent} />
              <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={closeHandler} style={[styles.closeBtn, { backgroundColor: colors.backgroundSoft }]}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Selected Date Summary Display */}
          <View style={[styles.selectionPreview, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.selectionLabel, { color: colors.textMuted }]}>Selected Date</Text>
              <Text style={[styles.selectionValue, { color: colors.textPrimary }]}>{formattedDisplay || activeDate}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.todayJumpBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setActiveDate(todayStr);
                const now = new Date();
                setCurrentYearMonth({ year: now.getFullYear(), month: now.getMonth() });
              }}
            >
              <Text style={[styles.todayJumpText, { color: colors.accent }]}>Today</Text>
            </TouchableOpacity>
          </View>

          {/* Month & Year Navigation Row */}
          <View style={styles.navRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity onPress={handlePrevYear} style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}>
                <ChevronsLeft size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePrevMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}>
                <ChevronLeft size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.monthTitleText, { color: colors.textPrimary }]}>{monthName}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity onPress={handleNextMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}>
                <ChevronRight size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextYear} style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}>
                <ChevronsRight size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdaysRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd, i) => (
              <Text key={i} style={[styles.weekdayLabel, { color: colors.textMuted }]}>{wd}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {/* Empty slots before month start */}
            {Array.from({ length: startWeekday }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCellEmpty} />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYearMonth.year}-${String(currentYearMonth.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dateStr === activeDate;
              const isToday = dateStr === todayStr;

              const isBeforeMin = minDate ? dateStr < minDate : false;
              const isAfterMax = maxDate ? dateStr > maxDate : false;
              const isDisabled = isBeforeMin || isAfterMax;

              return (
                <TouchableOpacity
                  key={dateStr}
                  disabled={isDisabled}
                  onPress={() => setActiveDate(dateStr)}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    !isSelected && isToday && { borderColor: colors.accent, borderWidth: 1.5 },
                    isDisabled && [styles.dayCellDisabled, { backgroundColor: colors.backgroundSoft }]
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayNumText,
                    { color: colors.textPrimary },
                    isSelected && { color: colors.primaryForeground, fontWeight: '700' },
                    !isSelected && isToday && { color: colors.accent, fontWeight: '700' },
                    isDisabled && { color: colors.textLight, textDecorationLine: 'line-through' }
                  ]}>
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={[styles.dialogActions, { borderTopColor: colors.borderLight }]}>
            <Button
              title="Cancel"
              variant="outline"
              size="sm"
              onPress={closeHandler}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Confirm Date"
              variant="primary"
              size="sm"
              icon={<Check size={14} color="#FFF" />}
              onPress={handleConfirm}
              style={{ flex: 1 }}
            />
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  selectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  selectionValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  todayJumpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  todayJumpText: {
    fontSize: 13,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    height: 38,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayNumText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dialogActions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
