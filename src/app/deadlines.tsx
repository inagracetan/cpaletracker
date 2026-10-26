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
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DeadlineCategory, Deadline, VerificationStatus } from '../types';
import { SchedulingEngine } from '../services/scheduler/schedulingEngine';
import { DatePickerModal } from '../components/ui/DatePickerModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHero } from '../components/ui/PageHero';
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Download, 
  Upload,
  Trash2, 
  Clock,
  Edit3,
  Save,
  X,
  AlertTriangle 
} from 'lucide-react-native';

const CATEGORIES: DeadlineCategory[] = [
  'Registration and filing',
  'Required documents',
  'Preboards',
  'Study milestones',
  'Examination dates',
  'Results and follow-up'
];

export default function DeadlinesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isCompactMobile = width < 640;
  const { colors, isDark } = useTheme();
  const { state, addDeadline, updateDeadline, toggleDeadlineComplete, deleteDeadline } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<DeadlineCategory | 'ALL'>('ALL');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [deleteConfirmDeadline, setDeleteConfirmDeadline] = useState<Deadline | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New deadline form state
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCategory, setNewCategory] = useState<DeadlineCategory>('Registration and filing');
  const [newStatus] = useState<VerificationStatus>('User-target');
  const [newNotes, setNewNotes] = useState('');

  // Edit deadline form state
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCategory, setEditCategory] = useState<DeadlineCategory>('Registration and filing');
  const [editStatus, setEditStatus] = useState<VerificationStatus>('User-target');
  const [editNotes, setEditNotes] = useState('');
  const [editReminderDays, setEditReminderDays] = useState<number[]>([7, 3, 1, 0]);
  const [editIsCompleted, setEditIsCompleted] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isEditDatePickerOpen, setIsEditDatePickerOpen] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState('');

  const todayStr = SchedulingEngine.formatDate(new Date());

  const handleOpenEdit = (d: Deadline) => {
    setEditingDeadline(d);
    setEditTitle(d.title);
    setEditDueDate(d.dueDate);
    setEditCategory(d.category);
    setEditStatus(d.verificationStatus);
    setEditNotes(d.notes || '');
    setEditReminderDays(d.reminderDays || [7, 3, 1, 0]);
    setEditIsCompleted(d.isCompleted);
    setEditErrorMessage('');
    setIsEditModalVisible(true);
  };

  const handleSaveEditDeadline = async () => {
    if (!editingDeadline) return;
    setEditErrorMessage('');
    if (!editTitle.trim()) {
      setEditErrorMessage('Please enter a deadline title.');
      return;
    }
    if (!editDueDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(editDueDate.trim())) {
      setEditErrorMessage('Please enter a valid due date in YYYY-MM-DD format.');
      return;
    }

    try {
      await updateDeadline(editingDeadline.id, {
        title: editTitle.trim(),
        dueDate: editDueDate.trim(),
        category: editCategory,
        verificationStatus: editStatus,
        notes: editNotes.trim(),
        reminderDays: editReminderDays,
        isCompleted: editIsCompleted,
        completedAt: editIsCompleted ? (editingDeadline.completedAt || new Date().toISOString()) : undefined,
      });
      setIsEditModalVisible(false);
      setEditingDeadline(null);
    } catch (err: any) {
      setEditErrorMessage(err?.message || 'Failed to update deadline.');
    }
  };

  const toggleReminderDay = (day: number) => {
    if (editReminderDays.includes(day)) {
      setEditReminderDays(editReminderDays.filter(d => d !== day));
    } else {
      setEditReminderDays([...editReminderDays, day].sort((a, b) => b - a));
    }
  };

  const filteredDeadlines = useMemo(() => {
    return state.deadlines
      .filter(d => selectedCategory === 'ALL' || d.category === selectedCategory)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [state.deadlines, selectedCategory]);

  const handleCreateDeadline = async () => {
    if (!newTitle.trim() || !newDueDate.trim()) {
      alert('Please enter a deadline title and choose a due date before saving.');
      return;
    }
    if (newDueDate.trim() < todayStr) {
      alert('Please select a valid upcoming deadline date (today or in the future).');
      return;
    }
    await addDeadline({
      title: newTitle.trim(),
      dueDate: newDueDate.trim(),
      category: newCategory,
      verificationStatus: newStatus,
      isCompleted: false,
      notes: newNotes.trim(),
      reminderDays: [7, 3, 1, 0],
    });
    setNewTitle('');
    setNewDueDate('');
    setNewNotes('');
    setAddModalVisible(false);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      <PageHero
        title="Key Dates & Deadlines"
        subtitle="PRC schedules, LERIS filing, NBI clearance, preboards, and examination dates"
        action={
          <Button
            title="Add Deadline"
            variant="primary"
            size="sm"
            icon={<Plus size={14} color="#FFF" />}
            iconOnly={isCompactMobile}
            accessibilityLabel="Add Deadline"
            onPress={() => setAddModalVisible(true)}
          />
        }
      />

      {/* 2. Category Filter Tabs */}
      <View style={styles.categoryWrap}>
        <TouchableOpacity
          style={[
            styles.categoryChip, 
            { backgroundColor: colors.card, borderColor: colors.border },
            selectedCategory === 'ALL' && { backgroundColor: colors.accentLight, borderColor: colors.accent }
          ]}
          onPress={() => setSelectedCategory('ALL')}
          accessibilityLabel={`All categories (${state.deadlines.length})`}
        >
          <Text style={[
            styles.categoryChipText, 
            { color: colors.textSecondary },
            selectedCategory === 'ALL' && { color: colors.accent, fontWeight: AcademicTheme.typography.weights.bold }
          ]}>
            All ({state.deadlines.length})
          </Text>
        </TouchableOpacity>

        {CATEGORIES.map(cat => {
          const count = state.deadlines.filter(d => d.category === cat).length;
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip, 
                { backgroundColor: colors.card, borderColor: colors.border },
                isSelected && { backgroundColor: colors.accentLight, borderColor: colors.accent }
              ]}
              onPress={() => setSelectedCategory(cat)}
              accessibilityLabel={`Category ${cat} (${count})`}
            >
              <Text style={[
                styles.categoryChipText, 
                { color: colors.textSecondary },
                isSelected && { color: colors.accent, fontWeight: AcademicTheme.typography.weights.bold }
              ]}>
                {cat} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Deadlines List */}
      <View style={styles.list}>
        {filteredDeadlines.map(deadline => {
          const daysLeft = SchedulingEngine.calculateDaysRemaining(deadline.dueDate, todayStr);
          const isOverdue = daysLeft < 0 && !deadline.isCompleted;
          const isDone = deadline.isCompleted;

          return (
            <Card 
              key={deadline.id} 
              style={[
                styles.deadlineCard, 
                { 
                  width: isDesktop ? '48.9%' : '100%',
                  backgroundColor: colors.card, 
                  borderColor: colors.cardBorder 
                },
                isDone && { backgroundColor: isDark ? colors.backgroundSoft : '#F8FAF9', borderColor: colors.successBorder }
              ]}
            >
              <View style={styles.cardRow}>
                {/* Checkbox */}
                <TouchableOpacity 
                  onPress={() => toggleDeadlineComplete(deadline.id)}
                  style={styles.checkBtn}
                  accessibilityLabel={`Toggle completion for ${deadline.title}`}
                >
                  {isDone ? (
                    <CheckCircle2 size={24} color={colors.success} />
                  ) : (
                    <Circle size={24} color={colors.cardBorder} />
                  )}
                </TouchableOpacity>

                {/* Content */}
                <View style={{ flex: 1, marginHorizontal: 12, minWidth: 0 }}>
                  <View style={styles.badgeRow}>
                    <Badge label={deadline.category} variant="info" size="sm" />
                    <Badge label={deadline.verificationStatus} variant="default" size="sm" />
                    {isOverdue && <Badge label={`${Math.abs(daysLeft)}d overdue`} variant="danger" size="sm" />}
                    {!isOverdue && !isDone && (
                      <Badge 
                        label={daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`} 
                        variant={daysLeft <= 7 ? 'warning' : 'default'} 
                        size="sm" 
                      />
                    )}
                  </View>

                  <Text style={[
                    styles.deadlineTitle, 
                    { color: colors.textPrimary },
                    isDone && [styles.titleDone, { color: colors.textMuted }]
                  ]}>
                    {deadline.title}
                  </Text>

                  <View style={styles.metaRow}>
                    <Calendar size={14} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>{deadline.dueDate}</Text>
                  </View>

                  {deadline.notes ? (
                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>{deadline.notes}</Text>
                  ) : null}
                </View>

                {/* Actions: Edit and Delete */}
                <View style={styles.cardActionsCol}>
                  <TouchableOpacity 
                    onPress={() => handleOpenEdit(deadline)}
                    style={[styles.actionIconBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                    accessibilityLabel={`Edit deadline ${deadline.title}`}
                  >
                    <Edit3 size={15} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setDeleteConfirmDeadline(deadline)}
                    style={[styles.actionIconBtn, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                    accessibilityLabel={`Delete deadline ${deadline.title}`}
                  >
                    <Trash2 size={15} color={colors.textLight} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        })}

        {filteredDeadlines.length === 0 && (
          <Card style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Clock size={32} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No deadlines in this category</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Use the buttons above to add or import upcoming events.</Text>
          </Card>
        )}
      </View>

      {/* Add Custom Deadline Modal */}
      <Modal visible={addModalVisible} animationType="none" transparent>
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add New Deadline</Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Title / Event Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder="e.g. LERIS Online Application Deadline"
              placeholderTextColor={colors.textLight}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Due Date (YYYY-MM-DD)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="e.g. 2027-04-15"
                placeholderTextColor={colors.textLight}
                value={newDueDate}
                onChangeText={setNewDueDate}
              />
              <Button
                title="Calendar"
                variant="outline"
                size="sm"
                icon={<Calendar size={15} color={colors.primary} />}
                onPress={() => setIsDatePickerOpen(true)}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Category</Text>
            <View style={styles.categoryPickerWrap}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPickBtn,
                    { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                    newCategory === cat && { backgroundColor: colors.accent, borderColor: colors.accent }
                  ]}
                  onPress={() => setNewCategory(cat)}
                  accessibilityLabel={`Select category ${cat}`}
                  accessibilityRole="button"
                >
                  <Text style={[
                    styles.categoryPickText, 
                    { color: colors.textSecondary },
                    newCategory === cat && { color: '#FFF', fontWeight: AcademicTheme.typography.weights.bold }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Notes & Details (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder="Additional reminders or instructions"
              placeholderTextColor={colors.textLight}
              value={newNotes}
              onChangeText={setNewNotes}
            />

            <View style={styles.modalBtns}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setAddModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Create Deadline"
                variant="primary"
                onPress={handleCreateDeadline}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Confirmation Dialog for Delete Deadline */}
      <ConfirmDialog
        visible={!!deleteConfirmDeadline}
        title="Delete Deadline?"
        message={`Are you sure you want to delete "${deleteConfirmDeadline?.title}"?`}
        itemDetail={deleteConfirmDeadline?.dueDate}
        consequence="This deadline will be removed from your calendar and reminder timeline."
        confirmText="Delete Deadline"
        confirmVariant="danger"
        isProcessing={isDeleting}
        onConfirm={async () => {
          if (!deleteConfirmDeadline) return;
          setIsDeleting(true);
          await deleteDeadline(deleteConfirmDeadline.id);
          setIsDeleting(false);
          setDeleteConfirmDeadline(null);
        }}
        onCancel={() => setDeleteConfirmDeadline(null)}
      />

      {/* Calendar Date Picker Modal for Add */}
      <DatePickerModal
        visible={isDatePickerOpen}
        initialDate={newDueDate || todayStr}
        selectedDate={newDueDate || todayStr}
        title="Select Deadline Date"
        onConfirm={(date: string) => {
          setNewDueDate(date);
          setIsDatePickerOpen(false);
        }}
        onCancel={() => setIsDatePickerOpen(false)}
      />

      {/* Edit Deadline Modal */}
      <Modal visible={isEditModalVisible} animationType="none" transparent>
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, maxWidth: 460 }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Deadline</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Modify deadline schedule or details. Historical dates are permitted.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.modalCloseBtn} accessibilityLabel="Close Edit Deadline">
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {editErrorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder }]}>
                <AlertTriangle size={15} color={colors.danger} />
                <Text style={[styles.errorBoxText, { color: colors.dangerText }]}>{editErrorMessage}</Text>
              </View>
            ) : null}

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Title / Event Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="e.g. LERIS Online Application Deadline"
                placeholderTextColor={colors.textLight}
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Due Date (YYYY-MM-DD)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="e.g. 2027-04-15"
                  placeholderTextColor={colors.textLight}
                  value={editDueDate}
                  onChangeText={setEditDueDate}
                />
                <Button
                  title="Calendar"
                  variant="outline"
                  size="sm"
                  icon={<Calendar size={15} color={colors.primary} />}
                  onPress={() => setIsEditDatePickerOpen(true)}
                />
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Category</Text>
              <View style={styles.categoryPickerWrap}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPickBtn,
                      { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                      editCategory === cat && { backgroundColor: colors.accent, borderColor: colors.accent }
                    ]}
                    onPress={() => setEditCategory(cat)}
                    accessibilityLabel={`Select category ${cat}`}
                    accessibilityRole="button"
                  >
                    <Text style={[
                      styles.categoryPickText, 
                      { color: colors.textSecondary },
                      editCategory === cat && { color: '#FFF', fontWeight: AcademicTheme.typography.weights.bold }
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Verification Status</Text>
              <View style={styles.statusChipsRow}>
                {(['Estimated', 'User-target', 'Confirmed'] as VerificationStatus[]).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusChipBtn,
                      { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                      editStatus === st && { backgroundColor: colors.accent, borderColor: colors.accent }
                    ]}
                    onPress={() => setEditStatus(st)}
                  >
                    <Text style={[
                      styles.statusChipText,
                      { color: editStatus === st ? '#FFF' : colors.textSecondary }
                    ]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Reminders Schedule</Text>
              <View style={styles.remindersRow}>
                {[
                  { days: 7, label: '7d before' },
                  { days: 3, label: '3d before' },
                  { days: 1, label: '1d before' },
                  { days: 0, label: 'On due date' },
                ].map(r => {
                  const isChecked = editReminderDays.includes(r.days);
                  return (
                    <TouchableOpacity
                      key={r.days}
                      style={[
                        styles.reminderChip,
                        { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                        isChecked && { backgroundColor: colors.accentLight, borderColor: colors.accent }
                      ]}
                      onPress={() => toggleReminderDay(r.days)}
                    >
                      <Text style={[
                        styles.reminderChipText,
                        { color: isChecked ? colors.accent : colors.textSecondary, fontWeight: isChecked ? '700' : '500' }
                      ]}>
                        {isChecked ? '✓ ' : ''}{r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.completeToggleRow}>
                <TouchableOpacity
                  style={styles.completeToggleBtn}
                  onPress={() => setEditIsCompleted(!editIsCompleted)}
                >
                  {editIsCompleted ? (
                    <CheckCircle2 size={20} color={colors.success} />
                  ) : (
                    <Circle size={20} color={colors.cardBorder} />
                  )}
                  <Text style={[styles.completeToggleText, { color: colors.textPrimary }]}>
                    Mark as Completed
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Notes & Details (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary, minHeight: 60 }]}
                placeholder="Additional reminders or instructions"
                placeholderTextColor={colors.textLight}
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
              />
            </ScrollView>

            <View style={styles.modalBtns}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setIsEditModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Changes"
                variant="primary"
                icon={<Save size={14} color="#FFF" />}
                onPress={handleSaveEditDeadline}
                style={{ flex: 1.2 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* DatePickerModal for Edit Deadline (Allows historical dates) */}
      <DatePickerModal
        visible={isEditDatePickerOpen}
        selectedDate={editDueDate || todayStr}
        initialDate={editDueDate || todayStr}
        title="Select Due Date"
        onConfirm={(date: string) => {
          setEditDueDate(date);
          setIsEditDatePickerOpen(false);
        }}
        onCancel={() => setIsEditDatePickerOpen(false)}
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
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: AcademicTheme.spacing.md,
    width: '100%',
  },
  categoryChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  deadlineCard: {
    padding: 14,
    minWidth: 0,
    maxWidth: '100%',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  checkBtn: {
    paddingTop: 2,
    flexShrink: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  deadlineTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginBottom: 4,
  },
  titleDone: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  notesText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 20,
  },
  cardActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: AcademicTheme.borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginTop: 8,
  },
  emptySub: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  modalSubtitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    padding: 12,
    fontSize: 15,
  },
  categoryPickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    width: '100%',
  },
  categoryPickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  categoryPickText: {
    fontSize: 13,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  statusChipBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: AcademicTheme.borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  remindersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  reminderChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.sm,
    borderWidth: 1,
  },
  reminderChipText: {
    fontSize: 13,
  },
  completeToggleRow: {
    marginTop: 10,
    marginBottom: 4,
  },
  completeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeToggleText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  modalBtns: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
