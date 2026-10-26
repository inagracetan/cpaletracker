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
import { parse12HourTo24 } from '../../utils/timeFormat';
import { Clock, X, Check } from 'lucide-react-native';

export interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (time24: string) => void;
  initialTime24?: string; // e.g. "22:00"
  title?: string;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onClose,
  onSelectTime,
  initialTime24 = '22:00',
  title = 'Select Time',
}) => {
  const { colors } = useTheme();

  // Internal state: hour (1-12), minute (0-59), period ('AM' | 'PM')
  const [selectedHour, setSelectedHour] = useState<number>(10);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');

  // Adjust state when initialTime24 changes without cascading effect
  const [prevTime, setPrevTime] = useState(initialTime24);
  if (initialTime24 !== prevTime) {
    setPrevTime(initialTime24);
    const parts = (initialTime24 || '22:00').split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h)) h = 22;
    if (isNaN(m)) m = 0;

    const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    setSelectedHour(displayH);
    setSelectedMinute(m);
    setSelectedPeriod(p);
  }

  const preview12 = useMemo(() => {
    const minStr = String(selectedMinute).padStart(2, '0');
    return `${selectedHour}:${minStr} ${selectedPeriod}`;
  }, [selectedHour, selectedMinute, selectedPeriod]);

  const handleConfirm = () => {
    const time24 = parse12HourTo24(preview12);
    onSelectTime(time24);
    onClose();
  };

  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.dialogCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          
          {/* Header */}
          <View style={[styles.dialogHeader, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <Clock size={18} color={colors.accent} />
              <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.backgroundSoft }]}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Time Preview Display & AM/PM Toggle */}
          <View style={[styles.previewBox, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}>
            <Text style={[styles.timePreviewText, { color: colors.textPrimary }]}>
              {preview12}
            </Text>

            <View style={[styles.periodToggle, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.periodBtn,
                  selectedPeriod === 'AM' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedPeriod('AM')}
              >
                <Text style={[
                  styles.periodBtnText,
                  { color: colors.textSecondary },
                  selectedPeriod === 'AM' && { color: colors.primaryForeground, fontWeight: '700' }
                ]}>AM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.periodBtn,
                  selectedPeriod === 'PM' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedPeriod('PM')}
              >
                <Text style={[
                  styles.periodBtnText,
                  { color: colors.textSecondary },
                  selectedPeriod === 'PM' && { color: colors.primaryForeground, fontWeight: '700' }
                ]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Selectors */}
          <View style={styles.selectorSection}>
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Hour</Text>
            <View style={styles.gridRow}>
              {hoursList.map(h => {
                const isSelected = selectedHour === h;
                return (
                  <TouchableOpacity
                    key={`h-${h}`}
                    style={[
                      styles.gridItem,
                      { backgroundColor: isSelected ? colors.primary : colors.surfaceElevated, borderColor: colors.border },
                    ]}
                    onPress={() => setSelectedHour(h)}
                  >
                    <Text style={[
                      styles.gridItemText,
                      { color: isSelected ? colors.primaryForeground : colors.textPrimary },
                      isSelected && { fontWeight: '700' }
                    ]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 12 }]}>Minute</Text>
            <View style={styles.gridRow}>
              {minutesList.map(m => {
                const isSelected = selectedMinute === m;
                return (
                  <TouchableOpacity
                    key={`m-${m}`}
                    style={[
                      styles.gridItem,
                      { backgroundColor: isSelected ? colors.primary : colors.surfaceElevated, borderColor: colors.border },
                    ]}
                    onPress={() => setSelectedMinute(m)}
                  >
                    <Text style={[
                      styles.gridItemText,
                      { color: isSelected ? colors.primaryForeground : colors.textPrimary },
                      isSelected && { fontWeight: '700' }
                    ]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Actions */}
          <View style={[styles.dialogActions, { borderTopColor: colors.borderLight }]}>
            <Button
              title="Cancel"
              variant="outline"
              size="sm"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Set Time"
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
    maxWidth: 360,
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
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  timePreviewText: {
    fontSize: 22,
    fontWeight: '700',
  },
  periodToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  periodBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectorSection: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridItem: {
    width: '14.5%',
    minWidth: 42,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dialogActions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
