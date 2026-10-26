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
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { SearchField } from '../components/ui/SearchField';
import { PageHero } from '../components/ui/PageHero';
import { SUBJECTS_META } from '../constants/subjects';
import { SubjectCode, SubjectCodes, Topic } from '../types';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Star, 
  AlertTriangle, 
  BookOpen, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  Sparkles,
  Tag
} from 'lucide-react-native';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export default function SyllabusScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isCompactMobile = width < 640;
  const { colors, isDark } = useTheme();
  const { state, updateTopic, toggleTopicComplete, addTopic, deleteTopic, addCustomCategory } = useApp();

  const [selectedSubject, setSelectedSubject] = useState<SubjectCode | 'ALL'>('FAR');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter] = useState<'ALL' | 'Light' | 'Medium' | 'Heavy'>('ALL');
  const [weakOnlyFilter, setWeakOnlyFilter] = useState(false);
  const [expandedTopicIds, setExpandedTopicIds] = useState<Record<string, boolean>>({});

  const toggleTopicExpanded = (id: string) => {
    setExpandedTopicIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Delete topic confirmation state
  const [deleteConfirmTopic, setDeleteConfirmTopic] = useState<Topic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New topic modal
  const [newTopicModalVisible, setNewTopicModalVisible] = useState(false);
  const [newTopicSubject, setNewTopicSubject] = useState<SubjectCode>('FAR');
  const [newTopicCode, setNewTopicCode] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDifficulty] = useState<'Light' | 'Medium' | 'Heavy'>('Medium');
  const [newTopicStudyDays] = useState('1');
  const [newTopicTosArea, setNewTopicTosArea] = useState('');
  const [isCustomCategoryInput, setIsCustomCategoryInput] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');

  // Code Suggestions by subject
  const subjectCodeSuggestions = useMemo(() => {
    const subTopics = state.topics.filter(t => t.subject === newTopicSubject);
    let maxNum = 0;
    for (const t of subTopics) {
      const match = t.code.match(new RegExp(`^${newTopicSubject}-(\\d+)$`, 'i'));
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const nextNum = maxNum + 1;
    const nextCode = `${newTopicSubject}-${String(nextNum).padStart(2, '0')}`;
    const altCodes = [
      nextCode,
      `${newTopicSubject}-${String(nextNum + 1).padStart(2, '0')}`,
      `${newTopicSubject}-${String(nextNum + 2).padStart(2, '0')}`,
    ];
    return { nextCode, altCodes };
  }, [newTopicSubject, state.topics]);

  // When subject changes, automatically set suggested code without cascading effect
  const [prevSubject, setPrevSubject] = useState(newTopicSubject);
  if (newTopicSubject !== prevSubject) {
    setPrevSubject(newTopicSubject);
    setNewTopicCode(subjectCodeSuggestions.nextCode);
  }

  // Categories available for the selected subject (case & whitespace deduplicated)
  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    state.topics
      .filter(t => t.subject === newTopicSubject && t.tosArea && t.tosArea.trim())
      .forEach(t => {
        const trimmed = t.tosArea!.trim();
        const lower = trimmed.toLowerCase();
        if (!map.has(lower)) map.set(lower, trimmed);
      });
    (state.customCategories || []).forEach(c => {
      if (c && c.trim()) {
        const trimmed = c.trim();
        const lower = trimmed.toLowerCase();
        if (!map.has(lower)) map.set(lower, trimmed);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [state.topics, state.customCategories, newTopicSubject]);

  // Filter topics
  const filteredTopics = useMemo(() => {
    return state.topics.filter(t => {
      if (t.archived) return false;
      if (selectedSubject !== 'ALL' && t.subject !== selectedSubject) return false;
      if (difficultyFilter !== 'ALL' && t.difficulty !== difficultyFilter) return false;
      if (weakOnlyFilter && !t.isDifficult && (t.confidence && t.confidence > 2)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = t.code.toLowerCase().includes(q);
        const matchName = t.name.toLowerCase().includes(q);
        const matchTos = (t.tosArea || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchTos) return false;
      }
      return true;
    });
  }, [state.topics, selectedSubject, difficultyFilter, weakOnlyFilter, searchQuery]);

  // Subject Stats
  const subjectStats = useMemo(() => {
    if (selectedSubject === 'ALL') {
      const active = state.topics.filter(t => !t.archived);
      const done = active.filter(t => t.status === 'Completed').length;
      return {
        total: active.length,
        done,
        remaining: active.length - done,
        percentage: active.length > 0 ? Math.round((done / active.length) * 100) : 0,
        weakCount: active.filter(t => t.isDifficult || (t.confidence && t.confidence <= 2)).length,
      };
    } else {
      const subTopics = state.topics.filter(t => t.subject === selectedSubject && !t.archived);
      const done = subTopics.filter(t => t.status === 'Completed').length;
      return {
        total: subTopics.length,
        done,
        remaining: subTopics.length - done,
        percentage: subTopics.length > 0 ? Math.round((done / subTopics.length) * 100) : 0,
        weakCount: subTopics.filter(t => t.isDifficult || (t.confidence && t.confidence <= 2)).length,
      };
    }
  }, [state.topics, selectedSubject]);

  const handleCreateTopic = async () => {
    if (!newTopicCode.trim() || !newTopicName.trim()) {
      alert('Topic code and name are required');
      return;
    }

    const finalTosArea = isCustomCategoryInput ? customCategoryText.trim() : newTopicTosArea.trim();
    if (isCustomCategoryInput && customCategoryText.trim()) {
      await addCustomCategory(customCategoryText.trim());
    }

    await addTopic({
      code: newTopicCode.trim().toUpperCase(),
      subject: newTopicSubject,
      name: newTopicName.trim(),
      subtopics: [],
      estimatedDuration: 60,
      difficulty: newTopicDifficulty,
      tosArea: finalTosArea,
      studyDays: parseInt(newTopicStudyDays, 10) || 1,
      status: 'Not started',
      confidence: 3,
    });
    setNewTopicCode('');
    setNewTopicName('');
    setNewTopicTosArea('');
    setCustomCategoryText('');
    setIsCustomCategoryInput(false);
    setNewTopicModalVisible(false);
  };

  const handleConfirmDeleteTopic = async () => {
    if (!deleteConfirmTopic) return;
    setIsDeleting(true);
    try {
      await deleteTopic(deleteConfirmTopic.id);
      setDeleteConfirmTopic(null);
    } catch {
      alert('Failed to delete topic');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      <PageHero
        title="Syllabus Manager"
        subtitle="Comprehensive CPALE Table of Specifications (TOS) topics for all 6 subjects"
        action={
          <Button
            title="Add Topic"
            variant="primary"
            size="sm"
            icon={<Plus size={14} color="#FFF" />}
            iconOnly={isCompactMobile}
            accessibilityLabel="Add Topic"
            onPress={() => {
              setNewTopicCode(subjectCodeSuggestions.nextCode);
              setNewTopicModalVisible(true);
            }}
          />
        }
      />

      {/* 2. Subject Tabs Bar — matches Checklist & Calendar filter chip styling */}
      <View style={styles.subjectWrap}>
        <TouchableOpacity
          style={[
            styles.subjectTab,
            {
              backgroundColor: selectedSubject === 'ALL'
                ? (isDark ? colors.cardElevated : colors.backgroundSoft)
                : colors.card,
              borderColor: selectedSubject === 'ALL' ? colors.accent : colors.border,
              borderWidth: selectedSubject === 'ALL' ? 1.5 : 1,
            },
          ]}
          onPress={() => setSelectedSubject('ALL')}
          accessibilityLabel={`All subjects (${state.topics.length})`}
        >
          <Text style={[
            styles.subjectTabText,
            { color: selectedSubject === 'ALL' ? colors.accent : colors.textSecondary },
            selectedSubject === 'ALL' && { fontWeight: '700' },
          ]}>
            All ({state.topics.length})
          </Text>
        </TouchableOpacity>

        {SubjectCodes.map(code => {
          const isSelected = selectedSubject === code;
          return (
            <TouchableOpacity
              key={code}
              style={[
                styles.subjectTab,
                {
                  backgroundColor: isSelected
                    ? (isDark ? colors.cardElevated : colors.backgroundSoft)
                    : colors.card,
                  borderColor: isSelected ? colors.accent : colors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                },
              ]}
              onPress={() => setSelectedSubject(code)}
              accessibilityLabel={`Subject ${code}`}
            >
              <Text style={[
                styles.subjectTabText,
                { color: isSelected ? colors.accent : colors.textSecondary },
                isSelected && { fontWeight: '700' },
              ]}>
                {code}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Subject Summary Card */}
      <Card style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.statsRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.statsSubjectTitle, { color: colors.textPrimary }]}>
              {selectedSubject === 'ALL' ? 'Complete CPALE Syllabus' : SUBJECTS_META[selectedSubject].fullName}
            </Text>
            <Text style={[styles.statsNumbers, { color: colors.textMuted }]}>
              {subjectStats.done} of {subjectStats.total} covered ({subjectStats.percentage}%)
            </Text>
            <ProgressBar progress={subjectStats.percentage} style={{ marginTop: 8 }} />
          </View>
          <View style={styles.statsBadgeCol}>
            <Badge 
              label={`${subjectStats.weakCount} Weak / Difficult`} 
              variant={subjectStats.weakCount > 0 ? 'warning' : 'default'} 
            />
          </View>
        </View>
      </Card>

      {/* 4. Search, Filter and View Mode Bar */}
      <View style={styles.filterRow}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search code, topic name, or TOS area..."
          style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, flex: 1, minWidth: 160 }}
          accessibilityLabel="Search syllabus topics"
        />

        <TouchableOpacity 
          style={[
            styles.filterToggle, 
            { backgroundColor: colors.card, borderColor: colors.border },
            weakOnlyFilter && { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }
          ]}
          onPress={() => setWeakOnlyFilter(!weakOnlyFilter)}
          accessibilityRole="button"
          accessibilityState={{ selected: weakOnlyFilter }}
          accessibilityLabel="Filter weak topics only"
        >
          <AlertTriangle size={14} color={weakOnlyFilter ? colors.warningText : colors.textSecondary} />
          <Text style={[
            styles.filterToggleText, 
            { color: colors.textSecondary },
            weakOnlyFilter && { color: colors.warningText, fontWeight: AcademicTheme.typography.weights.bold }
          ]}>
            Weak Topics
          </Text>
        </TouchableOpacity>

      </View>

      {/* 5. Topics: Compact Vertical Cards in Single Column */}
      <View style={styles.topicList}>
        {filteredTopics.map((topic) => {
          const isExpanded = !!expandedTopicIds[topic.id];
          const isDone = topic.status === 'Completed';

          return (
            <View 
              key={topic.id} 
              style={[
                styles.compactVerticalCard, 
                { 
                  width: isDesktop ? '48.9%' : '100%',
                  backgroundColor: colors.card, 
                  borderColor: isDone ? colors.successBorder : colors.cardBorder 
                },
                isDone && { backgroundColor: isDark ? colors.backgroundSoft : '#F8FAF9' }
              ]}
            >
              <View style={styles.compactCardMain}>
                {/* Completion Checkbox */}
                <TouchableOpacity 
                  onPress={() => toggleTopicComplete(topic.id)} 
                  style={[styles.checkTouchable, { flexShrink: 0 }]}
                  accessibilityLabel={`Toggle complete for ${topic.name}`}
                >
                  {isDone ? (
                    <CheckCircle2 size={20} color={colors.success} />
                  ) : (
                    <Circle size={20} color={colors.cardBorder} />
                  )}
                </TouchableOpacity>

                {/* Topic Info */}
                <TouchableOpacity 
                  style={{ flex: 1, marginHorizontal: 8, minWidth: 0 }}
                  onPress={() => toggleTopicExpanded(topic.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  accessibilityLabel={`Toggle details for ${topic.name}`}
                >
                  <View style={styles.compactMetaLine}>
                    <Badge label={topic.code} variant="default" size="sm" />
                    <Badge label={topic.subject} variant="subject" subject={topic.subject} size="sm" />
                    <Badge label={topic.difficulty} variant={topic.difficulty === 'Heavy' ? 'danger' : 'default'} size="sm" />
                    {topic.isDifficult && (
                      <Badge label="Needs Review" variant="warning" size="sm" />
                    )}
                  </View>

                  <Text style={[
                    styles.compactTopicTitle, 
                    { color: colors.textPrimary },
                    isDone && [styles.topicNameDone, { color: colors.textMuted }]
                  ]}>
                    {topic.name}
                  </Text>

                  {topic.tosArea ? (
                    <Text style={[styles.compactSubtext, { color: colors.textMuted }]}>
                      {topic.tosArea}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                {/* Actions — dedicated column so icons never cover titles */}
                <View style={styles.compactCardActions}>
                  <TouchableOpacity 
                    onPress={() => setDeleteConfirmTopic(topic)}
                    style={styles.compactActionBtn}
                    accessibilityLabel={`Delete topic ${topic.code}`}
                  >
                    <Trash2 size={15} color={colors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => toggleTopicExpanded(topic.id)}
                    style={styles.compactActionBtn}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    accessibilityLabel={isExpanded ? `Collapse ${topic.code}` : `Expand ${topic.code}`}
                  >
                    {isExpanded ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Expandable details when necessary */}
              {isExpanded && (
                <View style={[styles.compactExpandedContent, { borderTopColor: colors.borderLight }]}>
                  {topic.tosArea ? (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>TOS Area:</Text>
                      <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{topic.tosArea}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Exam Weight:</Text>
                    <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{topic.items || 0} items · {topic.difficulty} weight</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Confidence Rating:</Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <TouchableOpacity 
                          key={s} 
                          onPress={() => updateTopic(topic.id, { confidence: s })}
                        >
                          <Star 
                            size={16} 
                            color={s <= (topic.confidence || 3) ? colors.accent : colors.cardBorder}
                            fill={s <= (topic.confidence || 3) ? colors.accent : 'none'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.actionBtnRow}>
                    <Button
                      title={topic.isDifficult ? 'Flagged as Difficult ⚠' : 'Flag as Difficult'}
                      variant={topic.isDifficult ? 'danger' : 'outline'}
                      size="sm"
                      onPress={() => updateTopic(topic.id, { isDifficult: !topic.isDifficult })}
                      style={{ marginRight: 8 }}
                    />
                    <Button
                      title={isDone ? 'Reopen for Revision' : 'Mark Reviewed'}
                      variant={isDone ? 'secondary' : 'success'}
                      size="sm"
                      onPress={() => toggleTopicComplete(topic.id)}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {filteredTopics.length === 0 && (
          <Card style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <BookOpen size={32} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matching topics found</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Adjust search filters or import spreadsheet topics above.</Text>
          </Card>
        )}
      </View>

      {/* Add Custom Topic Modal */}
      <Modal visible={newTopicModalVisible} animationType="none" transparent>
        <View style={styles.modalOverlay}>
          <Card style={[styles.newTopicCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Custom Syllabus Topic</Text>
            
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Subject</Text>
            <View style={styles.pickerWrap}>
              {SubjectCodes.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.subPickBtn, 
                    { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                    newTopicSubject === c && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setNewTopicSubject(c)}
                  accessibilityLabel={`Subject ${c}`}
                  accessibilityRole="button"
                >
                  <Text style={[
                    styles.subPickText, 
                    { color: colors.textSecondary },
                    newTopicSubject === c && { color: colors.primaryForeground, fontWeight: AcademicTheme.typography.weights.bold }
                  ]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 0 }]}>Topic Code</Text>
              <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>
                Suggested: {subjectCodeSuggestions.nextCode}
              </Text>
            </View>

            {/* Quick suggested codes pills */}
            <View style={styles.pickerWrap}>
              {subjectCodeSuggestions.altCodes.map(code => (
                <TouchableOpacity
                  key={code}
                  onPress={() => setNewTopicCode(code)}
                  style={[
                    styles.codeSuggestionChip,
                    { backgroundColor: newTopicCode === code ? colors.accentLight : colors.backgroundSoft, borderColor: newTopicCode === code ? colors.accent : colors.border }
                  ]}
                  accessibilityLabel={`Suggested code ${code}`}
                  accessibilityRole="button"
                >
                  <Sparkles size={11} color={colors.accent} />
                  <Text style={[styles.codeSuggestionText, { color: colors.textPrimary }]}>{code}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder={`e.g. ${subjectCodeSuggestions.nextCode}`}
              placeholderTextColor={colors.textLight}
              value={newTopicCode}
              onChangeText={setNewTopicCode}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Topic Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder="e.g. Special Topics in Financial Reporting"
              placeholderTextColor={colors.textLight}
              value={newTopicName}
              onChangeText={setNewTopicName}
            />

            {/* Category / TOS Area with Custom Category option */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 0 }]}>Category / TOS Area</Text>
              <TouchableOpacity onPress={() => setIsCustomCategoryInput(!isCustomCategoryInput)}>
                <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>
                  {isCustomCategoryInput ? 'Choose Existing' : '+ Custom Category'}
                </Text>
              </TouchableOpacity>
            </View>

            {isCustomCategoryInput ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.accent, color: colors.textPrimary }]}
                placeholder="Enter custom category name..."
                placeholderTextColor={colors.textLight}
                value={customCategoryText}
                onChangeText={setCustomCategoryText}
              />
            ) : (
              <View style={styles.pickerWrap}>
                {availableCategories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewTopicTosArea(cat)}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: newTopicTosArea === cat ? colors.accentLight : colors.backgroundSoft, borderColor: newTopicTosArea === cat ? colors.accent : colors.border }
                    ]}
                    accessibilityLabel={`Category ${cat}`}
                    accessibilityRole="button"
                  >
                    <Tag size={11} color={colors.accent} />
                    <Text style={[styles.categoryChipText, { color: colors.textPrimary }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!isCustomCategoryInput && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="Select from above or type category name"
                placeholderTextColor={colors.textLight}
                value={newTopicTosArea}
                onChangeText={setNewTopicTosArea}
              />
            )}

            <View style={styles.modalBtns}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setNewTopicModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Create Topic"
                variant="primary"
                onPress={handleCreateTopic}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Delete Topic Confirmation Dialog */}
      <ConfirmDialog
        visible={!!deleteConfirmTopic}
        title="Delete Syllabus Topic?"
        message={`Are you sure you want to delete topic "${deleteConfirmTopic?.code}"?`}
        itemDetail={deleteConfirmTopic?.name}
        consequence="This topic will be removed from your syllabus checklist and upcoming review assignments."
        confirmText="Delete Topic"
        confirmVariant="danger"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDeleteTopic}
        onCancel={() => setDeleteConfirmTopic(null)}
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
    maxWidth: 480,
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: AcademicTheme.spacing.md,
    width: '100%',
    maxWidth: '100%',
  },
  subjectTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  subjectTabText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  statsCard: {
    marginBottom: AcademicTheme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsSubjectTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    flexShrink: 1,
  },
  statsNumbers: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
  },
  statsBadgeCol: {
    marginLeft: 0,
    flexShrink: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: AcademicTheme.spacing.md,
    width: '100%',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    flexShrink: 0,
    minHeight: 44,
  },
  filterToggleText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  topicList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  topicCard: {
    padding: 12,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkTouchable: {
    padding: 2,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  topicCode: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  topicName: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  topicNameDone: {
    textDecorationLine: 'line-through',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 4,
  },
  detailLabel: {
    minWidth: 120,
    fontSize: 13,
  },
  detailVal: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.medium,
    flex: 1,
    minWidth: 140,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtnRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
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
  newTopicCard: {
    width: '100%',
    maxWidth: 440,
  },
  modalTitle: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
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
  pickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    width: '100%',
  },
  subPickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  subPickText: {
    fontSize: 13,
  },
  modalBtns: {
    flexDirection: 'row',
    marginTop: 20,
  },
  compactVerticalCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    minWidth: 0,
    maxWidth: '100%',
  },
  compactCardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  compactMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  compactTopicTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.semibold,
    lineHeight: 22,
    flexShrink: 1,
  },
  compactSubtext: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    lineHeight: 20,
  },
  compactCardActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
    flexShrink: 0,
    paddingTop: 2,
  },
  compactActionBtn: {
    padding: 6,
  },
  compactExpandedContent: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
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
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  categoryChipText: {
    fontSize: 13,
  },
});
