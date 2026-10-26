import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { AcademicTheme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { SubjectCode, SubjectCodes, AssessmentRecord, AssessmentType } from '../types';
import { SUBJECTS_META } from '../constants/subjects';
import { AssessmentService } from '../services/assessments/assessmentService';
import { SchedulingEngine } from '../services/scheduler/schedulingEngine';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SearchField } from '../components/ui/SearchField';
import { DatePickerModal } from '../components/ui/DatePickerModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHero } from '../components/ui/PageHero';
import { PageTabBar } from '../components/ui/PageTabBar';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  AlertCircle,
  X,
  Sparkles,
  LayoutGrid,
  FileText,
} from 'lucide-react-native';

export default function AssessmentsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isCompactMobile = width < 640;
  const { colors, isDark } = useTheme();
  const {
    state,
    toggleAssessmentTopic,
    addAssessment,
    updateAssessment,
    deleteAssessment,
    addTopicToAssessment,
    removeTopicFromAssessment,
  } = useApp();

  const assessments = useMemo(() => state.assessments || [], [state.assessments]);

  // Selected assessment state
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(() => {
    return assessments[0]?.id || '';
  });

  // Effective selected assessment
  const activeAssessment = useMemo(() => {
    return assessments.find(a => a.id === selectedAssessmentId) || assessments[0] || null;
  }, [assessments, selectedAssessmentId]);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'monthly' | 'preboard'>('all');
  const [subjectFilter, setSubjectFilter] = useState<SubjectCode | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INCOMPLETE' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddAssessmentModalOpen, setIsAddAssessmentModalOpen] = useState(false);
  const [isEditAssessmentModalOpen, setIsEditAssessmentModalOpen] = useState(false);
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);

  // Form states - Assessment
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('monthly');
  const [assessmentDate, setAssessmentDate] = useState('');
  const [assessmentNotes, setAssessmentNotes] = useState('');

  // Form states - Topic
  const [newTopicSubject, setNewTopicSubject] = useState<SubjectCode>('FAR');
  const [newTopicCode, setNewTopicCode] = useState('');
  const [newTopicName, setNewTopicName] = useState('');

  // UI Improvements: Date Picker, Confirmation
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'add' | 'edit'>('add');
  const [deleteAssessmentConfirm, setDeleteAssessmentConfirm] = useState<AssessmentRecord | null>(null);
  const [deleteTopicConfirm, setDeleteTopicConfirm] = useState<{ assessmentId: string; topicId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Suggested topic codes for selected subject
  const subjectCodeSuggestions = useMemo(() => {
    const existingCodes = (state.topics || [])
      .concat((activeAssessment?.topics || []).map(t => ({ code: t.topicCode, subject: t.subject } as any)))
      .filter(t => t.subject === newTopicSubject && t.code)
      .map(t => t.code);
    
    let maxNum = 0;
    const prefix = newTopicSubject;
    existingCodes.forEach(c => {
      const match = c.match(new RegExp(`^${prefix}[-_ ]?(\\d+)`, 'i'));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    const nextCode = `${newTopicSubject}-${maxNum + 1}`;
    return {
      nextCode,
      altCodes: [nextCode, `${newTopicSubject}-${maxNum + 2}`],
    };
  }, [state.topics, activeAssessment?.topics, newTopicSubject]);

  // Filtered list of assessments for tabs
  const filteredAssessments = useMemo(() => {
    if (categoryFilter === 'monthly') {
      return assessments.filter(a => a.type === 'monthly');
    }
    if (categoryFilter === 'preboard') {
      return assessments.filter(a => a.type === 'first_preboard' || a.type === 'final_preboard');
    }
    return assessments;
  }, [assessments, categoryFilter]);

  // Calculated progress metrics for active assessment
  const progressMetrics = useMemo(() => {
    return AssessmentService.calculateProgress(activeAssessment);
  }, [activeAssessment]);

  // Filtered topics for current checklist
  const filteredTopics = useMemo(() => {
    if (!activeAssessment || !Array.isArray(activeAssessment.topics)) return [];
    return activeAssessment.topics.filter(t => {
      // Subject match
      if (subjectFilter !== 'ALL' && t.subject !== subjectFilter) return false;
      // Status match
      if (statusFilter === 'INCOMPLETE' && t.isCompleted) return false;
      if (statusFilter === 'COMPLETED' && !t.isCompleted) return false;
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesCode = t.topicCode ? t.topicCode.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesCode) return false;
      }
      return true;
    });
  }, [activeAssessment, subjectFilter, statusFilter, searchQuery]);

  // Handle opening Edit Modal
  const openEditModal = () => {
    if (!activeAssessment) return;
    setAssessmentTitle(activeAssessment.title);
    setAssessmentType(activeAssessment.type);
    setAssessmentDate(activeAssessment.date || '');
    setAssessmentNotes(activeAssessment.notes || '');
    setIsEditAssessmentModalOpen(true);
  };

  // Handle Save New Assessment
  const handleCreateAssessment = async () => {
    if (!assessmentTitle.trim()) {
      alert('Please enter an assessment title before saving.');
      return;
    }
    const todayStr = SchedulingEngine.formatDate(new Date());
    if (assessmentDate.trim() && assessmentDate.trim() < todayStr) {
      alert('Please select a target date today or in the future for this new upcoming assessment.');
      return;
    }
    await addAssessment({
      title: assessmentTitle.trim(),
      type: assessmentType,
      date: assessmentDate.trim() || undefined,
      notes: assessmentNotes.trim() || undefined,
      topics: [],
    });
    setAssessmentTitle('');
    setAssessmentDate('');
    setAssessmentNotes('');
    setIsAddAssessmentModalOpen(false);
  };

  // Handle Save Edit Assessment
  const handleUpdateAssessment = async () => {
    if (!activeAssessment) return;
    if (!assessmentTitle.trim()) {
      alert('Please enter an assessment title before saving changes.');
      return;
    }
    await updateAssessment(activeAssessment.id, {
      title: assessmentTitle.trim(),
      type: assessmentType,
      date: assessmentDate.trim() || undefined,
      notes: assessmentNotes.trim() || undefined,
    });
    setIsEditAssessmentModalOpen(false);
  };

  // Handle Confirmed Delete Assessment
  const handleConfirmDeleteAssessment = async () => {
    if (!deleteAssessmentConfirm) return;
    setIsDeleting(true);
    await deleteAssessment(deleteAssessmentConfirm.id);
    setIsDeleting(false);
    setDeleteAssessmentConfirm(null);
  };

  // Handle Confirmed Remove Topic
  const handleConfirmDeleteTopic = async () => {
    if (!deleteTopicConfirm) return;
    setIsDeleting(true);
    await removeTopicFromAssessment(deleteTopicConfirm.assessmentId, deleteTopicConfirm.topicId);
    setIsDeleting(false);
    setDeleteTopicConfirm(null);
  };

  // Handle Add Topic
  const handleCreateTopic = async () => {
    if (!activeAssessment) return;
    if (!newTopicName.trim()) {
      alert('Please enter a topic name before saving.');
      return;
    }
    await addTopicToAssessment(activeAssessment.id, {
      subject: newTopicSubject,
      topicCode: newTopicCode.trim() || subjectCodeSuggestions.nextCode,
      name: newTopicName.trim(),
      isCompleted: false,
    });
    setNewTopicCode('');
    setNewTopicName('');
    setIsAddTopicModalOpen(false);
  };

  const daysRemaining = activeAssessment?.date
    ? AssessmentService.getDaysRemaining(activeAssessment.date)
    : null;

  const categoryTabs = [
    {
      key: 'all' as const,
      label: 'All Assessments',
      icon: <LayoutGrid size={14} color={categoryFilter === 'all' ? colors.accent : colors.textMuted} />,
      count: assessments.length,
    },
    {
      key: 'monthly' as const,
      label: 'Monthly Assessments',
      icon: <Calendar size={14} color={categoryFilter === 'monthly' ? colors.accent : colors.textMuted} />,
      count: assessments.filter(a => a.type === 'monthly').length,
    },
    {
      key: 'preboard' as const,
      label: 'Preboards',
      icon: <FileText size={14} color={categoryFilter === 'preboard' ? colors.accent : colors.textMuted} />,
      count: assessments.filter(a => a.type === 'first_preboard' || a.type === 'final_preboard').length,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#F0F4FF' }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <PageHero
        title="Assessments & Preboards"
        subtitle="Checklist coverage across monthly reviews, first preboard, and final preboard."
        action={
          assessments.length > 0 ? (
            <Button
              title="Add Assessment"
              variant="primary"
              size="sm"
              icon={<Plus size={14} color="#FFF" />}
              iconOnly={isCompactMobile}
              accessibilityLabel="Add Assessment"
              onPress={() => {
                setAssessmentTitle('');
                setAssessmentDate('');
                setAssessmentNotes('');
                setIsAddAssessmentModalOpen(true);
              }}
            />
          ) : undefined
        }
      />

      {/* CATEGORY TABS — on mobile: All Assessments on top, others wrap below */}
      <PageTabBar
        tabs={categoryTabs}
        activeTab={categoryFilter}
        onTabPress={setCategoryFilter}
        stackFirstOnMobile
      />

      {/* ASSESSMENT SELECTOR GRID / RESPONSIVE CARDS */}
      <View style={styles.assessmentGrid}>
        {filteredAssessments.map(a => {
          const isSelected = activeAssessment?.id === a.id;
          const metric = AssessmentService.calculateProgress(a);
          return (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.assessmentCardPill,
                {
                  width: isDesktop ? '31.8%' : width >= 600 ? '48.5%' : '100%',
                  backgroundColor: isSelected ? colors.accentLight : colors.card,
                  borderColor: isSelected ? colors.accent : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedAssessmentId(a.id)}
              activeOpacity={0.7}
              accessibilityLabel={`Select assessment ${a.title}`}
              accessibilityRole="button"
            >
              <View style={styles.pillHeader}>
                <Badge
                  label={a.type === 'monthly' ? 'Monthly' : a.type === 'first_preboard' ? '1st Preboard' : 'Final Preboard'}
                  variant={a.type === 'monthly' ? 'default' : 'primary'}
                  size="sm"
                />
                {a.date && (
                  <Text style={[styles.pillDate, { color: colors.textMuted }]}>
                    {a.date}
                  </Text>
                )}
              </View>

              <Text style={[styles.pillTitle, { color: isSelected ? colors.accent : colors.textPrimary }]}>
                {a.title}
              </Text>

              <View style={styles.pillProgressRow}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <ProgressBar progress={metric.percent} height={6} />
                </View>
                <Text style={[styles.pillPercent, { color: isSelected ? colors.accent : colors.textSecondary }]}>
                  {metric.formattedPercent}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeAssessment ? (
        <>
          {/* ACTIVE ASSESSMENT SUMMARY BANNER */}
          <Card style={[styles.activeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.activeCardTop}>
              <View style={styles.activeCardTextCol}>
                <View style={styles.activeMetaRow}>
                  <Badge
                    label={activeAssessment.type === 'monthly' ? 'Monthly Assessment' : activeAssessment.type === 'first_preboard' ? 'First Preboard' : 'Final Preboard'}
                    variant={activeAssessment.type === 'monthly' ? 'default' : 'primary'}
                    size="sm"
                  />
                  {activeAssessment.date && (
                    <View style={styles.dateTag}>
                      <Calendar size={14} color={colors.textSecondary} />
                      <Text style={[styles.dateTagText, { color: colors.textSecondary }]} numberOfLines={2}>
                        {activeAssessment.date}
                        {daysRemaining !== null && (
                          <Text style={{ color: daysRemaining < 0 ? colors.danger : colors.primary, fontWeight: '700' }}>
                            {' '}· {daysRemaining < 0 ? 'Past date' : daysRemaining === 0 ? 'Today!' : `${daysRemaining} days left`}
                          </Text>
                        )}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.activeTitle, { color: colors.textPrimary }]}>
                  {activeAssessment.title}
                </Text>
                {activeAssessment.notes && (
                  <Text style={[styles.activeNotes, { color: colors.textSecondary }]}>
                    {activeAssessment.notes}
                  </Text>
                )}
              </View>

              <View style={styles.activeActions}>
                <TouchableOpacity onPress={openEditModal} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]} accessibilityLabel="Edit assessment details">
                  <Edit3 size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDeleteAssessmentConfirm(activeAssessment)} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]} accessibilityLabel="Delete assessment">
                  <Trash2 size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>

            {/* PROGRESS BAR & ACCURATE STATS */}
            <View style={styles.metricsBox}>
              <View style={styles.metricRow}>
                <View>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Coverage Progress</Text>
                  <Text style={[styles.metricBigPercent, { color: colors.primary }]}>
                    {progressMetrics.formattedPercent}
                  </Text>
                </View>

                <View style={styles.metricCountsRow}>
                  <View style={styles.countItem}>
                    <Text style={[styles.countVal, { color: colors.success }]}>{progressMetrics.completed}</Text>
                    <Text style={[styles.countLabel, { color: colors.textMuted }]}>Completed</Text>
                  </View>
                  <View style={[styles.countDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.countItem}>
                    <Text style={[styles.countVal, { color: colors.warning }]}>{progressMetrics.remaining}</Text>
                    <Text style={[styles.countLabel, { color: colors.textMuted }]}>Remaining</Text>
                  </View>
                  <View style={[styles.countDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.countItem}>
                    <Text style={[styles.countVal, { color: colors.textPrimary }]}>{progressMetrics.total}</Text>
                    <Text style={[styles.countLabel, { color: colors.textMuted }]}>Total Topics</Text>
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 10 }}>
                <ProgressBar progress={progressMetrics.percent} height={10} />
              </View>
            </View>
          </Card>

          {/* SUBJECT-LEVEL COVERAGE BREAKDOWN CARDS */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Subject Coverage Breakdown
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
              Tap any subject card to filter the checklist
            </Text>
          </View>

          <View style={styles.subjectGrid}>
            {SubjectCodes.map(code => {
              const subjMeta = SUBJECTS_META[code];
              const sProgress = progressMetrics.bySubject[code];
              const isSelected = subjectFilter === code;

              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.subjectCard,
                    {
                      width: isDesktop ? '31.5%' : width >= 600 ? '48.5%' : '100%',
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSubjectFilter(isSelected ? 'ALL' : code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subjectCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Badge label={code} variant="subject" subject={code} size="sm" />
                        <Text style={[styles.subjectCardName, { color: colors.textPrimary }]}>
                          {subjMeta.name}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.subjectPercent, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                      {sProgress.total === 0 ? '0%' : sProgress.formattedPercent}
                    </Text>
                  </View>

                  <View style={{ marginVertical: 6 }}>
                    <ProgressBar 
                      progress={sProgress.percent} 
                      color={(colors as any)[`subject${code}`] || subjMeta.color}
                      height={6} 
                    />
                  </View>

                  <View style={styles.subjectFractionRow}>
                    <Text style={[styles.subjectFraction, { color: colors.textSecondary }]}>
                      {sProgress.completed} of {sProgress.total} covered
                    </Text>
                    <Text style={[styles.subjectRemaining, { color: sProgress.remaining > 0 ? colors.warning : colors.success }]}>
                      {sProgress.total === 0 ? '0 topics' : sProgress.remaining === 0 ? '✓ Complete' : `${sProgress.remaining} to go`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* TOPIC CHECKLIST SECTION */}
          <Card style={[styles.checklistCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.checklistHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.checklistTitle, { color: colors.textPrimary }]}>
                  Topic Checklist ({filteredTopics.length})
                </Text>
                <Text style={[styles.checklistSub, { color: colors.textMuted }]}>
                  Tick to mark completed for this assessment. Progress stays 100% independent.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Button
                  title="Add Topic"
                  variant="primary"
                  size="sm"
                  icon={<Plus size={15} color="#FFFFFF" />}
                  iconOnly={isCompactMobile}
                  accessibilityLabel="Add Topic"
                  onPress={() => setIsAddTopicModalOpen(true)}
                />
              </View>
            </View>

            {/* FILTER CONTROLS */}
            <View style={styles.filterControls}>
              <SearchField
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search topic code or title..."
                accessibilityLabel="Search assessment topics"
              />

              {/* Status Filter Chips */}
              <View style={styles.statusChipsRow}>
                {(['ALL', 'INCOMPLETE', 'COMPLETED'] as const).map(st => {
                  const isActive = statusFilter === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: isActive ? colors.primary : colors.surfaceElevated,
                          borderColor: isActive ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setStatusFilter(st)}
                    >
                      <Text style={[styles.statusChipText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}>
                        {st === 'ALL' ? 'All' : st === 'INCOMPLETE' ? 'Remaining / To Cover' : 'Completed'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* TOPIC LIST */}
            {filteredTopics.length > 0 ? (
              <View style={styles.topicsList}>
                {filteredTopics.map((topic, idx) => {
                  return (
                    <View
                      key={topic.id || `t_${idx}`}
                      style={[
                        styles.compactTopicCard,
                        {
                          width: isDesktop ? '48.9%' : '100%',
                          backgroundColor: topic.isCompleted ? (isDark ? '#192038' : '#FAFBFD') : colors.card,
                          borderColor: topic.isCompleted ? colors.successBorder : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.compactTopicHeaderRow}>
                        <View style={styles.compactTopicMetaLeft}>
                          <TouchableOpacity
                            style={styles.compactCheckboxTouch}
                            onPress={() => toggleAssessmentTopic(activeAssessment.id, topic.id || topic.topicCode)}
                            accessibilityLabel={`Mark ${topic.name} as ${topic.isCompleted ? 'incomplete' : 'completed'}`}
                          >
                            {topic.isCompleted ? (
                              <CheckCircle2 size={18} color={colors.success} />
                            ) : (
                              <Circle size={18} color={colors.textLight} />
                            )}
                          </TouchableOpacity>

                          <Badge label={topic.subject} variant="subject" subject={topic.subject} size="sm" />

                          {topic.topicCode ? (
                            <Text style={[styles.compactTopicCode, { color: colors.textSecondary }]}>
                              {topic.topicCode}
                            </Text>
                          ) : null}

                          {topic.isCompleted ? (
                            <Badge label="Covered" variant="success" size="sm" />
                          ) : null}
                        </View>

                        <TouchableOpacity
                          style={styles.compactDeleteTouch}
                          onPress={() => setDeleteTopicConfirm({
                            assessmentId: activeAssessment.id,
                            topicId: topic.id,
                            name: topic.name,
                          })}
                          accessibilityLabel={`Delete topic ${topic.topicCode || topic.name}`}
                        >
                          <Trash2 size={15} color={colors.textLight} />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => toggleAssessmentTopic(activeAssessment.id, topic.id || topic.topicCode)}
                        style={styles.compactTopicBody}
                      >
                        <Text
                          style={[
                            styles.compactTopicTitle,
                            { color: colors.textPrimary },
                            topic.isCompleted && [styles.topicTitleDone, { color: colors.textMuted }],
                          ]}
                        >
                          {topic.name}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyChecklist}>
                <AlertCircle size={32} color={colors.textLight} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No topics match your filters</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {activeAssessment.topics.length === 0
                    ? 'No topics have been added to this assessment yet. Click "Add Topic" or import from workbook.'
                    : 'Try clearing the search query or changing your subject filter.'}
                </Text>
              </View>
            )}
          </Card>
        </>
      ) : (
        <View style={[styles.noAssessmentCard, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: isDark ? colors.border : '#E8EEFF', borderWidth: 1 }]}>
          {/* Decorative stacked illustration */}
          <View style={styles.noAssessmentIllustWrap}>
            <View style={[styles.noAssessmentIllustBg, { backgroundColor: isDark ? colors.accentLight : '#EEF0FB' }]}>
              <View style={[styles.noAssessmentIllustInner, { backgroundColor: isDark ? colors.primary : '#C7D1F8' }]} />
              <Layers size={52} color={isDark ? colors.accent : colors.primary} />
              <View style={[styles.noAssessmentPlusDot, { backgroundColor: colors.accent }]}>
                <Plus size={14} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <Text style={[styles.noAssessmentTitle, { color: colors.textPrimary }]}>No Assessments Configured</Text>
          <Text style={[styles.noAssessmentSub, { color: colors.textMuted }]}>
            Create your first monthly assessment or preboard checklist to track your preparation.
          </Text>

          {/* Full-width pill CTA button matching reference design */}
          <TouchableOpacity
            style={[styles.noAssessmentCta, { backgroundColor: colors.primary }]}
            onPress={() => setIsAddAssessmentModalOpen(true)}
            activeOpacity={0.85}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.noAssessmentCtaText}>Create Assessment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL: ADD ASSESSMENT */}
      <Modal visible={isAddAssessmentModalOpen} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Add New Assessment</Text>
              <TouchableOpacity onPress={() => setIsAddAssessmentModalOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Title / Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Monthly Assessment 6 or Pre-week Mock"
              placeholderTextColor={colors.textLight}
              value={assessmentTitle}
              onChangeText={setAssessmentTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Category</Text>
            <View style={styles.typeRow}>
              {(['monthly', 'first_preboard', 'final_preboard'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: assessmentType === t ? colors.primary : colors.surfaceElevated,
                      borderColor: assessmentType === t ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setAssessmentType(t)}
                >
                  <Text style={[styles.typeBtnText, { color: assessmentType === t ? '#FFFFFF' : colors.textSecondary }]}>
                    {t === 'monthly' ? 'Monthly' : t === 'first_preboard' ? '1st Preboard' : 'Final Preboard'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Target Date (YYYY-MM-DD)</Text>
            <View style={styles.datePickerInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. 2027-03-27"
                placeholderTextColor={colors.textLight}
                value={assessmentDate}
                onChangeText={setAssessmentDate}
              />
              <Button
                title="Calendar"
                variant="outline"
                size="sm"
                icon={<Calendar size={15} color={colors.primary} />}
                onPress={() => {
                  setDatePickerField('add');
                  setIsDatePickerOpen(true);
                }}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Coverage notes, target score, or review center"
              placeholderTextColor={colors.textLight}
              value={assessmentNotes}
              onChangeText={setAssessmentNotes}
            />

            <View style={styles.modalFooter}>
              <Button title="Cancel" variant="outline" onPress={() => setIsAddAssessmentModalOpen(false)} style={{ flex: 1, marginRight: 8 }} />
              <Button title="Create" variant="primary" onPress={handleCreateAssessment} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>

      {/* MODAL: EDIT ASSESSMENT */}
      <Modal visible={isEditAssessmentModalOpen} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Edit Assessment Details</Text>
              <TouchableOpacity onPress={() => setIsEditAssessmentModalOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Title / Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              value={assessmentTitle}
              onChangeText={setAssessmentTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Target Date (YYYY-MM-DD)</Text>
            <View style={styles.datePickerInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={assessmentDate}
                onChangeText={setAssessmentDate}
              />
              <Button
                title="Calendar"
                variant="outline"
                size="sm"
                icon={<Calendar size={15} color={colors.primary} />}
                onPress={() => {
                  setDatePickerField('edit');
                  setIsDatePickerOpen(true);
                }}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Notes</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              value={assessmentNotes}
              onChangeText={setAssessmentNotes}
            />

            <View style={styles.modalFooter}>
              <Button title="Cancel" variant="outline" onPress={() => setIsEditAssessmentModalOpen(false)} style={{ flex: 1, marginRight: 8 }} />
              <Button title="Save Changes" variant="primary" onPress={handleUpdateAssessment} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>

      {/* MODAL: ADD TOPIC */}
      <Modal visible={isAddTopicModalOpen} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Add Topic to Checklist</Text>
              <TouchableOpacity onPress={() => setIsAddTopicModalOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Subject</Text>
            <View style={styles.typeRow}>
              {SubjectCodes.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: newTopicSubject === s ? colors.primary : colors.surfaceElevated,
                      borderColor: newTopicSubject === s ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setNewTopicSubject(s);
                    setNewTopicCode('');
                  }}
                >
                  <Text style={[styles.typeBtnText, { color: newTopicSubject === s ? '#FFFFFF' : colors.textSecondary }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 0 }]}>Topic Code</Text>
              <Text style={{ fontSize: 14, color: colors.accent, fontWeight: '600' }}>
                Suggested: {subjectCodeSuggestions.nextCode}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {subjectCodeSuggestions.altCodes.map(code => (
                <TouchableOpacity
                  key={code}
                  onPress={() => setNewTopicCode(code)}
                  style={[
                    styles.codeSuggestionChip,
                    { backgroundColor: newTopicCode === code ? colors.accentLight : colors.surfaceElevated, borderColor: newTopicCode === code ? colors.accent : colors.border }
                  ]}
                >
                  <Sparkles size={11} color={colors.accent} />
                  <Text style={[styles.codeSuggestionText, { color: colors.textPrimary }]}>{code}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder={`e.g. ${subjectCodeSuggestions.nextCode}`}
              placeholderTextColor={colors.textLight}
              value={newTopicCode}
              onChangeText={setNewTopicCode}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Topic Name / Coverage Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Consolidated Financial Statements Part 2"
              placeholderTextColor={colors.textLight}
              value={newTopicName}
              onChangeText={setNewTopicName}
            />

            <View style={styles.modalFooter}>
              <Button title="Cancel" variant="outline" onPress={() => setIsAddTopicModalOpen(false)} style={{ flex: 1, marginRight: 8 }} />
              <Button title="Add Topic" variant="primary" onPress={handleCreateTopic} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>

      {/* CONFIRM DELETE ASSESSMENT DIALOG */}
      <ConfirmDialog
        visible={!!deleteAssessmentConfirm}
        title="Delete Assessment?"
        message={`Are you sure you want to delete "${deleteAssessmentConfirm?.title}"?`}
        itemDetail={deleteAssessmentConfirm?.title}
        consequence="This will remove this assessment and its progress tracking from your study plan."
        confirmText="Delete Assessment"
        confirmVariant="danger"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDeleteAssessment}
        onCancel={() => setDeleteAssessmentConfirm(null)}
      />

      {/* CONFIRM REMOVE TOPIC DIALOG */}
      <ConfirmDialog
        visible={!!deleteTopicConfirm}
        title="Remove Topic from Assessment?"
        message="Are you sure you want to remove this topic from the assessment checklist?"
        itemDetail={deleteTopicConfirm?.name}
        consequence="This topic will be removed from this assessment's coverage list."
        confirmText="Remove Topic"
        confirmVariant="danger"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDeleteTopic}
        onCancel={() => setDeleteTopicConfirm(null)}
      />

      {/* DATE PICKER POPUP MODAL */}
      <DatePickerModal
        visible={isDatePickerOpen}
        initialDate={assessmentDate || SchedulingEngine.formatDate(new Date())}
        minDate={datePickerField === 'add' ? SchedulingEngine.formatDate(new Date()) : undefined}
        title={datePickerField === 'add' ? "Select Assessment Target Date" : "Edit Assessment Date"}
        onConfirm={(date: string) => {
          setAssessmentDate(date);
          setIsDatePickerOpen(false);
        }}
        onCancel={() => setIsDatePickerOpen(false)}
      />

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  // Hero illustration
  heroIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
  },
  heroIllustCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroIllustTarget: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Full-width add button
  addAssessmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: AcademicTheme.borderRadius.full,
    marginBottom: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  addAssessmentBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: AcademicTheme.typography.sizes.xl,
    fontWeight: AcademicTheme.typography.weights.bold,
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    lineHeight: 20,
    flexShrink: 1,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  assessmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  assessmentCardPill: {
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.md,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  pillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  pillDate: {
    fontSize: 13,
    flexShrink: 1,
  },
  pillTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.semibold,
    marginBottom: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  pillProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minWidth: 0,
  },
  pillPercent: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.bold,
    flexShrink: 0,
  },
  activeCard: {
    padding: 16,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  activeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    flexWrap: 'nowrap',
    gap: 12,
    width: '100%',
  },
  activeCardTextCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  activeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
    minWidth: 0,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  dateTagText: {
    fontSize: 13,
    flexShrink: 1,
  },
  activeTitle: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginTop: 2,
    flexShrink: 1,
  },
  activeNotes: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 4,
    lineHeight: 20,
    flexShrink: 1,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
    alignItems: 'flex-start',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricsBox: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E5F0',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricBigPercent: {
    fontSize: AcademicTheme.typography.sizes.xxl,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  metricCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countItem: {
    alignItems: 'center',
  },
  countVal: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  countLabel: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    lineHeight: 18,
    textAlign: 'center',
  },
  countDivider: {
    width: 1,
    height: 24,
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  sectionSub: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  subjectCard: {
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.md,
    minWidth: 0,
    maxWidth: '100%',
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectCardName: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.medium,
    flexShrink: 1,
  },
  subjectPercent: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  subjectFractionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectFraction: {
    fontSize: 13,
  },
  subjectRemaining: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  checklistCard: {
    padding: 16,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  checklistSub: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
  },
  filterControls: {
    marginBottom: 14,
    gap: 10,
    width: '100%',
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    gap: 12,
  },
  checkboxTouch: {
    padding: 2,
  },
  topicInfo: {
    flex: 1,
    minWidth: 0,
  },
  topicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  topicCode: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  topicTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  topicTitleDone: {
    textDecorationLine: 'line-through',
  },
  deleteTouch: {
    padding: 6,
  },
  emptyChecklist: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  emptySub: {
    fontSize: AcademicTheme.typography.sizes.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  categoryChipCount: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 5,
  },
  categoryChipCountText: {
    fontSize: 11,
    fontWeight: AcademicTheme.typography.weights.bold,
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  inputLabel: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    minHeight: 44,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: AcademicTheme.typography.sizes.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 20,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactTopicCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    marginBottom: 6,
    minWidth: 0,
    maxWidth: '100%',
  },
  compactTopicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  compactTopicMetaLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactCheckboxTouch: {
    padding: 2,
    flexShrink: 0,
  },
  compactTopicCode: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
    flexShrink: 1,
  },
  compactDeleteTouch: {
    padding: 4,
    flexShrink: 0,
  },
  compactTopicBody: {
    paddingLeft: 0,
    minWidth: 0,
  },
  compactTopicTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.medium,
    lineHeight: 22,
    flexShrink: 1,
  },
  datePickerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeSuggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  codeSuggestionText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  // ─── Empty State ──────────────────────────────────────────────────────────
  noAssessmentCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AcademicTheme.borderRadius.xl,
    gap: 10,
    marginBottom: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  noAssessmentIllustWrap: {
    marginBottom: 8,
  },
  noAssessmentIllustBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  noAssessmentIllustInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.4,
  },
  noAssessmentPlusDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  noAssessmentTitle: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
    textAlign: 'center',
  },
  noAssessmentSub: {
    fontSize: AcademicTheme.typography.sizes.sm,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  noAssessmentCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: AcademicTheme.borderRadius.full,
    marginTop: 8,
    width: '100%',
    maxWidth: 280,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  noAssessmentCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
