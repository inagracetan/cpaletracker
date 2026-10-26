import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Platform 
} from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { FileDropzone } from './FileDropzone';
import { ImportEngine } from '../../services/import/importEngine';
import { CSVService } from '../../services/csv/csvService';
import { 
  ParsedWorkbookData, 
  SheetDetectionInfo, 
  ImportPreviewResult, 
  ColumnMappingItem,
  WorkbookWidePreview,
  WorkbookImportResultSummary
} from '../../services/import/importTypes';
import { 
  ImportCategory, 
  ImportStrategy, 
  ImportHistoryRecord 
} from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  Layers, 
  Eye, 
  Check, 
  FolderCheck,
  CheckSquare,
  Square,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react-native';

export interface ImportWizardModalProps {
  visible: boolean;
  onClose: () => void;
  initialCategory?: ImportCategory;
}

type WizardStep = 'upload' | 'workbook_preview' | 'sheet' | 'mapping' | 'preview' | 'strategy' | 'result';

export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({
  visible,
  onClose,
  initialCategory = 'auto',
}) => {
  const { colors } = useTheme();
  const { state, executeImport, executeWorkbookImport } = useApp();

  const [step, setStep] = useState<WizardStep>('upload');
  const [workbookData, setWorkbookData] = useState<ParsedWorkbookData | null>(null);
  const [workbookWidePreview, setWorkbookWidePreview] = useState<WorkbookWidePreview | null>(null);
  const [workbookResult, setWorkbookResult] = useState<WorkbookImportResultSummary | null>(null);

  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [category, setCategory] = useState<ImportCategory>(initialCategory);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingItem[]>([]);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [strategy, setStrategy] = useState<ImportStrategy>('add');
  const [confirmReplace, setConfirmReplace] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportHistoryRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [setupParsedData, setSetupParsedData] = useState<any>(null);

  const resetState = () => {
    setStep('upload');
    setWorkbookData(null);
    setWorkbookWidePreview(null);
    setWorkbookResult(null);
    setSelectedSheetIndex(0);
    setCategory(initialCategory);
    setColumnMappings([]);
    setPreviewResult(null);
    setStrategy('add');
    setConfirmReplace(false);
    setImportResult(null);
    setIsProcessing(false);
    setSetupParsedData(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // 1. File loaded
  const handleFileLoaded = (data: ArrayBuffer | string, filename: string, fileSize: number) => {
    try {
      const parsedWb = ImportEngine.readWorkbook(data, filename);
      setWorkbookData(parsedWb);

      // Check if multi-sheet or single sheet
      if (parsedWb.sheets.length > 1) {
        // Multi-sheet Excel workbook -> default directly to Whole-Workbook consolidated preview!
        const widePreview = ImportEngine.analyzeWorkbookWide(data, filename, state);
        setWorkbookWidePreview(widePreview);
        setStep('workbook_preview');
      } else {
        // Single sheet (.csv or single-sheet .xlsx)
        selectSheet(parsedWb.sheets[0], 0, parsedWb);
      }
    } catch (err: any) {
      alert(err.message || 'Error parsing spreadsheet');
    }
  };

  // Toggle sheet enabled state in Whole-Workbook preview
  const toggleSheetEnabled = (sheetName: string) => {
    if (!workbookWidePreview) return;
    const updatedSheets = workbookWidePreview.sheets.map(s => 
      s.sheetName === sheetName ? { ...s, enabled: !s.enabled } : s
    );
    const enabledCount = updatedSheets.filter(s => s.enabled && s.category !== 'skip').length;
    
    // Recalculate summary metrics
    let expectedTopics = 0;
    let expectedDeadlines = 0;
    let expectedAssessments = 0;

    updatedSheets.forEach(s => {
      if (s.enabled) {
        if (s.category === 'topics' && s.records) {
          expectedTopics += s.records.filter(r => r.isValid).length;
        } else if (s.category === 'assessments' && s.assessmentsData) {
          expectedAssessments += s.assessmentsData.length;
        } else if (s.category === 'setup' && s.setupData) {
          expectedDeadlines += s.setupData.deadlines?.length || 0;
        }
      }
    });

    setWorkbookWidePreview({
      ...workbookWidePreview,
      sheets: updatedSheets,
      overallSummary: {
        ...workbookWidePreview.overallSummary,
        enabledSheets: enabledCount,
        expectedTopics,
        expectedDeadlines,
        expectedAssessments,
      }
    });
  };

  // 2. Single Sheet selection
  const selectSheet = (sheetInfo: SheetDetectionInfo, sheetIdx: number, wb: ParsedWorkbookData = workbookData!) => {
    setSelectedSheetIndex(sheetIdx);
    const detectedCat = sheetInfo.detectedCategory;
    const finalCat = (initialCategory !== 'auto' && detectedCat !== 'setup') ? initialCategory : detectedCat;
    setCategory(finalCat);

    // If Setup CSV / sheet detected, parse with CSVService dedicated setup profile
    if (finalCat === 'setup') {
      const csvContent = sheetInfo.rawRows.map(r => (r || []).map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const setupResult = CSVService.parseSetupCSV(csvContent);
      setSetupParsedData(setupResult);
      setStep('preview');
      return;
    }

    // Regular tabular import (topics, deadlines, sessions)
    const availableFields = finalCat === 'deadlines' 
      ? ImportEngine.DEADLINE_FIELDS 
      : (finalCat === 'sessions' ? ImportEngine.SESSION_FIELDS : ImportEngine.TOPIC_FIELDS);

    const initialMappings = ImportEngine.suggestColumnMappings(sheetInfo.headers, availableFields, sheetInfo.rawRows[0]);
    setColumnMappings(initialMappings);

    // Generate preview
    const preview = ImportEngine.generatePreview(sheetInfo, finalCat, initialMappings, state);
    setPreviewResult(preview);

    setStep('mapping');
  };

  // Re-generate preview after mapping adjustment
  const updateMapping = (appField: string, spreadsheetColName: string) => {
    if (!workbookData) return;
    const sheetInfo = workbookData.sheets[selectedSheetIndex];
    const colIdx = sheetInfo.headers.indexOf(spreadsheetColName);

    const updated = columnMappings.filter(m => m.appField !== appField);
    if (colIdx >= 0) {
      updated.push({
        appField,
        spreadsheetColumn: spreadsheetColName,
        spreadsheetColumnIndex: colIdx,
      });
    }
    setColumnMappings(updated);

    const preview = ImportEngine.generatePreview(sheetInfo, category, updated, state);
    setPreviewResult(preview);
  };

  // Execute single sheet import
  const handleExecuteSingleImport = async () => {
    if (strategy === 'replace' && !confirmReplace) {
      alert('Please confirm that you want to replace existing data in this category.');
      return;
    }

    setIsProcessing(true);
    try {
      if (category === 'setup' && setupParsedData) {
        const historyRecord = await executeImport({
          filename: workbookData?.filename || 'setup.csv',
          sheetName: workbookData?.sheets[selectedSheetIndex]?.name,
          category: 'setup',
          strategy,
          records: [],
          setupData: setupParsedData,
        });
        setImportResult(historyRecord);
      } else if (previewResult) {
        const historyRecord = await executeImport({
          filename: previewResult.filename,
          sheetName: previewResult.sheetName,
          category,
          strategy,
          records: previewResult.records,
        });
        setImportResult(historyRecord);
      }
      setStep('result');
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Whole-Workbook Import
  const handleExecuteWorkbookWideImport = async () => {
    if (!workbookWidePreview) return;
    if (strategy === 'replace' && !confirmReplace) {
      alert('Please confirm that you understand "Clean Replace" will replace matching subjects/assessments with imported data.');
      return;
    }

    setIsProcessing(true);
    try {
      const summary = await executeWorkbookImport({
        filename: workbookWidePreview.filename,
        strategy,
        sheets: workbookWidePreview.sheets,
      });
      setWorkbookResult(summary);
      setStep('result');
    } catch (err: any) {
      alert(`Whole-workbook import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download error report
  const downloadErrorReport = () => {
    if (!importResult) return;
    const csvContent = ImportEngine.generateErrorReportCSV(importResult);
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `import_errors_${importResult.category}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Error report download is supported on web browsers.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.primary }]}>
                <FileSpreadsheet size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {step === 'workbook_preview' ? 'Whole-Workbook Excel Import' : 'Import Data'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {step === 'upload' && 'Select spreadsheet file (.xlsx, .xls, .csv)'}
                  {step === 'workbook_preview' && 'Consolidated workbook review & multi-sheet processing'}
                  {step === 'sheet' && 'Choose worksheet to import'}
                  {step === 'mapping' && 'Verify and map spreadsheet columns'}
                  {step === 'preview' && 'Review parsed records and validation'}
                  {step === 'strategy' && 'Choose import strategy & confirm'}
                  {step === 'result' && 'Import completion report'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

            {/* STEP 1: Upload */}
            {step === 'upload' && (
              <View style={styles.stepContainer}>
                <FileDropzone onFileLoaded={handleFileLoaded} />
                
                <View style={[styles.infoBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Sparkles size={18} color={colors.accent} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.infoBannerTitle, { color: colors.textPrimary }]}>Whole-Workbook Automatic Detection</Text>
                    <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                      Upload your entire CPALE workbook (.xlsx). The importer automatically detects all sheets — Setup, FAR, AFAR, MS, TAX, AUD, RFBT, Preboards coverage, and Study Order — and imports them all together in one coordinated operation!
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 2: WHOLE-WORKBOOK PREVIEW (Default for multi-sheet workbooks) */}
            {step === 'workbook_preview' && workbookWidePreview && (
              <View style={styles.stepContainer}>
                
                {/* Consolidated Summary Banner */}
                <View style={[styles.wbSummaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <FolderCheck size={22} color={colors.accent} />
                      <Text style={[styles.wbFileName, { color: colors.textPrimary }]}>
                        {workbookWidePreview.filename}
                      </Text>
                    </View>
                    <Badge 
                      label={`${workbookWidePreview.overallSummary.enabledSheets} of ${workbookWidePreview.overallSummary.totalSheets} Sheets Enabled`}
                      variant="primary" 
                    />
                  </View>

                  {/* Summary Metric Pills */}
                  <View style={styles.metricPillsGrid}>
                    <View style={[styles.metricPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.metricPillNum, { color: colors.primary }]}>
                        {workbookWidePreview.overallSummary.expectedTopics}
                      </Text>
                      <Text style={[styles.metricPillLabel, { color: colors.textSecondary }]}>Syllabus Topics</Text>
                    </View>

                    <View style={[styles.metricPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.metricPillNum, { color: colors.primary }]}>
                        {workbookWidePreview.overallSummary.expectedAssessments}
                      </Text>
                      <Text style={[styles.metricPillLabel, { color: colors.textSecondary }]}>Assessments / PBs</Text>
                    </View>

                    <View style={[styles.metricPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.metricPillNum, { color: colors.primary }]}>
                        {workbookWidePreview.overallSummary.expectedDeadlines}
                      </Text>
                      <Text style={[styles.metricPillLabel, { color: colors.textSecondary }]}>Key Deadlines</Text>
                    </View>

                    <View style={[styles.metricPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.metricPillNum, { color: colors.primary }]}>
                        {workbookWidePreview.overallSummary.hasSetupData ? '✓' : '—'}
                      </Text>
                      <Text style={[styles.metricPillLabel, { color: colors.textSecondary }]}>Study Plan & Profile</Text>
                    </View>
                  </View>
                </View>

                {/* Section Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 }}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginVertical: 0 }]}>
                    Detected Worksheets ({workbookWidePreview.sheets.length})
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.textSecondary, marginBottom: 0 }]}>
                    All relevant sheets selected by default
                  </Text>
                </View>

                {/* Worksheet Checklist Table */}
                <View style={styles.wbSheetsList}>
                  {workbookWidePreview.sheets.map(sheet => {
                    const isEnabled = sheet.enabled;

                    return (
                      <TouchableOpacity
                        key={sheet.sheetName}
                        onPress={() => toggleSheetEnabled(sheet.sheetName)}
                        style={[
                          styles.wbSheetRow,
                          {
                            backgroundColor: isEnabled ? colors.card : colors.surfaceElevated,
                            borderColor: isEnabled ? colors.primary : colors.border,
                            opacity: isEnabled ? 1 : 0.65,
                          }
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          {isEnabled ? (
                            <CheckSquare size={20} color={colors.primary} />
                          ) : (
                            <Square size={20} color={colors.textSecondary} />
                          )}

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={[styles.wbSheetTitle, { color: colors.textPrimary }]}>
                                {sheet.sheetName}
                              </Text>

                              {sheet.category === 'setup' && <Badge label="Setup" variant="primary" />}
                              {sheet.category === 'topics' && (
                                <Badge 
                                  label={sheet.subject ? `Topics (${sheet.subject})` : 'Topics'} 
                                  variant="primary" 
                                />
                              )}
                              {sheet.category === 'assessments' && <Badge label="Assessments" variant="accent" />}
                              {sheet.category === 'sessions' && <Badge label="Schedule / Sessions" variant="default" />}
                              {sheet.category === 'skip' && <Badge label="Skipped (dynamic)" variant="default" />}
                            </View>

                            <Text style={[styles.wbSheetDesc, { color: colors.textSecondary }]}>
                              {sheet.description}
                            </Text>

                            <Text style={[styles.wbSheetPreview, { color: colors.textPrimary }]}>
                              {sheet.previewSummary}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Import Strategy Picker for Whole-Workbook */}
                <View style={[styles.wbStrategySection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 16 }]}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: 16 }]}>
                    Import Strategy
                  </Text>
                  
                  <View style={styles.strategyCardsRow}>
                    <TouchableOpacity
                      onPress={() => setStrategy('add')}
                      style={[
                        styles.strategyOptionBtn,
                        {
                          backgroundColor: strategy === 'add' ? colors.card : 'transparent',
                          borderColor: strategy === 'add' ? colors.primary : colors.border,
                        }
                      ]}
                    >
                      <Text style={[styles.strategyOptionTitle, { color: colors.textPrimary }]}>
                        Append New Records
                      </Text>
                      <Text style={[styles.strategyOptionDesc, { color: colors.textSecondary }]}>
                        Safely adds new topics, deadlines, and assessments without changing existing data.
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setStrategy('update')}
                      style={[
                        styles.strategyOptionBtn,
                        {
                          backgroundColor: strategy === 'update' ? colors.card : 'transparent',
                          borderColor: strategy === 'update' ? colors.accent : colors.border,
                        }
                      ]}
                    >
                      <Text style={[styles.strategyOptionTitle, { color: colors.textPrimary }]}>
                        Merge & Update Existing
                      </Text>
                      <Text style={[styles.strategyOptionDesc, { color: colors.textSecondary }]}>
                        Updates matching topics and preboard checklist statuses with spreadsheet data.
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setStrategy('replace')}
                      style={[
                        styles.strategyOptionBtn,
                        {
                          backgroundColor: strategy === 'replace' ? colors.dangerLight : 'transparent',
                          borderColor: strategy === 'replace' ? colors.danger : colors.border,
                        }
                      ]}
                    >
                      <Text style={[styles.strategyOptionTitle, { color: colors.dangerText }]}>
                        Clean Replace
                      </Text>
                      <Text style={[styles.strategyOptionDesc, { color: colors.textSecondary }]}>
                        Replaces enabled subjects and assessments with fresh workbook records.
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {strategy === 'replace' && (
                    <TouchableOpacity
                      onPress={() => setConfirmReplace(!confirmReplace)}
                      style={[styles.confirmReplaceBox, { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder, marginTop: 12 }]}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkbox, { borderColor: colors.danger, backgroundColor: confirmReplace ? colors.danger : 'transparent' }]}>
                        {confirmReplace && <Check size={14} color="#FFF" />}
                      </View>
                      <Text style={[styles.confirmReplaceText, { color: colors.dangerText }]}>
                        I understand that Clean Replace will overwrite enabled subjects & assessment coverage.
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Option to switch to manual single-sheet custom mode */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSheetIndex(0);
                    setStep('sheet');
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 14 }}
                >
                  <SlidersHorizontal size={14} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                    Need custom column mapping? Switch to Single-Sheet Mode
                  </Text>
                </TouchableOpacity>

              </View>
            )}

            {/* STEP 3: Single Sheet Selection (for manual single-sheet custom flow) */}
            {step === 'sheet' && workbookData && (
              <View style={styles.stepContainer}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  {'Select Worksheet from "' + workbookData.filename + '"'}
                </Text>

                <View style={styles.sheetList}>
                  {workbookData.sheets.map((s, idx) => (
                    <TouchableOpacity
                      key={s.name}
                      onPress={() => selectSheet(s, idx)}
                      style={[
                        styles.sheetItem,
                        { 
                          backgroundColor: selectedSheetIndex === idx ? colors.surfaceElevated : colors.card,
                          borderColor: selectedSheetIndex === idx ? colors.primary : colors.border,
                        }
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Layers size={18} color={selectedSheetIndex === idx ? colors.primary : colors.textSecondary} />
                        <View>
                          <Text style={[styles.sheetName, { color: colors.textPrimary }]}>{s.name}</Text>
                          <Text style={[styles.sheetMeta, { color: colors.textSecondary }]}>
                            {s.rowCount} rows · {s.headers.length} columns · Category: {s.detectedCategory.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* STEP 4: Column Mapping (Single Sheet) */}
            {step === 'mapping' && previewResult && (
              <View style={styles.stepContainer}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  {'Map Columns for "' + previewResult.sheetName + '" (' + category.toUpperCase() + ')'}
                </Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Confirm or modify column assignments before importing.
                </Text>

                <View style={styles.mappingList}>
                  {previewResult.availableFields.map(field => {
                    const mapped = columnMappings.find(m => m.appField === field.appField);
                    return (
                      <View 
                        key={field.appField} 
                        style={[styles.mappingCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.mappingFieldLabel, { color: colors.textPrimary }]}>
                              {field.label}
                            </Text>
                            {field.required && (
                              <Text style={{ color: colors.danger, fontWeight: '700' }}>*</Text>
                            )}
                          </View>
                          {field.description && (
                            <Text style={[styles.mappingFieldDesc, { color: colors.textSecondary }]}>
                              {field.description}
                            </Text>
                          )}
                        </View>

                        <View style={styles.mappingDropdownWrap}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity
                                onPress={() => updateMapping(field.appField, '')}
                                style={[
                                  styles.colChip,
                                  {
                                    backgroundColor: !mapped ? colors.primary : colors.card,
                                    borderColor: colors.border,
                                  }
                                ]}
                              >
                                <Text style={{ fontSize: 12, color: !mapped ? '#FFF' : colors.textSecondary }}>
                                  (None)
                                </Text>
                              </TouchableOpacity>

                              {previewResult.headers.map(h => (
                                <TouchableOpacity
                                  key={h}
                                  onPress={() => updateMapping(field.appField, h)}
                                  style={[
                                    styles.colChip,
                                    {
                                      backgroundColor: mapped?.spreadsheetColumn === h ? colors.primary : colors.card,
                                      borderColor: mapped?.spreadsheetColumn === h ? colors.primary : colors.border,
                                    }
                                  ]}
                                >
                                  <Text style={{ 
                                    fontSize: 12, 
                                    fontWeight: mapped?.spreadsheetColumn === h ? '600' : '400',
                                    color: mapped?.spreadsheetColumn === h ? '#FFF' : colors.textPrimary 
                                  }}>
                                    {h}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* STEP 5: Single Sheet Data Preview */}
            {step === 'preview' && (
              <View style={styles.stepContainer}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Preview Records</Text>
                
                {category === 'setup' && setupParsedData ? (
                  <View style={[styles.setupCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={[styles.setupCardTitle, { color: colors.textPrimary }]}>Setup Configuration Summary</Text>
                    <Text style={[styles.setupCardItem, { color: colors.textPrimary }]}>
                      • Nickname: {setupParsedData.userProfile?.nickname || 'Future CPA'}
                    </Text>
                    <Text style={[styles.setupCardItem, { color: colors.textPrimary }]}>
                      • Review Start Date: {setupParsedData.examPlan?.studyStartDate || '2026-08-24'}
                    </Text>
                    <Text style={[styles.setupCardItem, { color: colors.textPrimary }]}>
                      • Exam Day 1: {setupParsedData.examPlan?.examDay1 || '2027-05-23'}
                    </Text>
                    <Text style={[styles.setupCardItem, { color: colors.textPrimary }]}>
                      • Deadlines: {setupParsedData.deadlines?.length || 0} preboards and key dates
                    </Text>
                  </View>
                ) : previewResult ? (
                  <View>
                    <View style={styles.previewStatsRow}>
                      <Badge label={`${previewResult.summary.totalRows} Total`} variant="default" />
                      <Badge label={`${previewResult.summary.validRows} Valid`} variant="success" />
                      {previewResult.summary.duplicateRows > 0 && (
                        <Badge label={`${previewResult.summary.duplicateRows} Duplicates`} variant="warning" />
                      )}
                      {previewResult.summary.errorRows > 0 && (
                        <Badge label={`${previewResult.summary.errorRows} Errors`} variant="danger" />
                      )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                      <View>
                        <View style={[styles.tableHeaderRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                          <Text style={[styles.tableCellHead, styles.colStatus, { color: colors.textSecondary }]}>Status</Text>
                          <Text style={[styles.tableCellHead, styles.colRow, { color: colors.textSecondary }]}>Row</Text>
                          {columnMappings.map(m => (
                            <Text key={m.appField} style={[styles.tableCellHead, styles.colData, { color: colors.textSecondary }]}>
                              {m.appField}
                            </Text>
                          ))}
                        </View>

                        {previewResult.records.slice(0, 50).map(rec => (
                          <View 
                            key={rec.rowIndex} 
                            style={[
                              styles.tableDataRow, 
                              { 
                                backgroundColor: rec.isValid ? colors.card : colors.dangerLight,
                                borderBottomColor: colors.border 
                              }
                            ]}
                          >
                            <View style={styles.colStatus}>
                              {rec.isValid ? (
                                rec.duplicateMatch ? (
                                  <Copy size={16} color={colors.warning} />
                                ) : (
                                  <Check size={16} color={colors.success} />
                                )
                              ) : (
                                <AlertCircle size={16} color={colors.danger} />
                              )}
                            </View>
                            <Text style={[styles.tableCell, styles.colRow, { color: colors.textSecondary }]}>
                              {rec.rowIndex}
                            </Text>
                            {columnMappings.map(m => (
                              <Text 
                                key={m.appField} 
                                style={[styles.tableCell, styles.colData, { color: colors.textPrimary }]} 
                              >
                                {String(rec.parsedData[m.appField] ?? '')}
                              </Text>
                            ))}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            )}

            {/* STEP 6: Strategy Selection (Single Sheet) */}
            {step === 'strategy' && (
              <View style={styles.stepContainer}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Choose Import Strategy</Text>
                
                <View style={styles.strategyCards}>
                  <TouchableOpacity
                    onPress={() => setStrategy('add')}
                    style={[
                      styles.strategyCard,
                      {
                        backgroundColor: strategy === 'add' ? colors.surfaceElevated : colors.card,
                        borderColor: strategy === 'add' ? colors.primary : colors.border,
                      }
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.strategyTitle, { color: colors.textPrimary }]}>Append New Only</Text>
                      <Text style={[styles.strategyDesc, { color: colors.textSecondary }]}>
                        Safely adds new records and ignores duplicates.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setStrategy('update')}
                    style={[
                      styles.strategyCard,
                      {
                        backgroundColor: strategy === 'update' ? colors.surfaceElevated : colors.card,
                        borderColor: strategy === 'update' ? colors.accent : colors.border,
                      }
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.strategyTitle, { color: colors.textPrimary }]}>Update Existing</Text>
                      <Text style={[styles.strategyDesc, { color: colors.textSecondary }]}>
                        Updates matching records with incoming data.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 7: Result / Completion Report */}
            {step === 'result' && (
              <View style={styles.stepContainer}>
                {workbookResult ? (
                  // Whole-Workbook completion report
                  <View>
                    <View style={styles.resultHeader}>
                      <View style={[styles.successIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                        <CheckCircle2 size={40} color={colors.primary} />
                      </View>
                      <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
                        Whole-Workbook Import Successful!
                      </Text>
                      <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                        All {workbookResult.sheetsProcessed} worksheets were processed and saved safely.
                      </Text>
                    </View>

                    <View style={[styles.resultStatsCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <View style={styles.resultStatRow}>
                        <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Worksheets Processed:</Text>
                        <Text style={[styles.resultStatVal, { color: colors.primary }]}>{workbookResult.sheetsProcessed}</Text>
                      </View>
                      <View style={styles.resultStatRow}>
                        <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Syllabus Topics Imported:</Text>
                        <Text style={[styles.resultStatVal, { color: colors.successText }]}>{workbookResult.topicsImported}</Text>
                      </View>
                      <View style={styles.resultStatRow}>
                        <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Assessments & Preboards:</Text>
                        <Text style={[styles.resultStatVal, { color: colors.primary }]}>{workbookResult.assessmentsImported}</Text>
                      </View>
                      <View style={styles.resultStatRow}>
                        <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Deadlines & Dates:</Text>
                        <Text style={[styles.resultStatVal, { color: colors.textPrimary }]}>{workbookResult.deadlinesImported}</Text>
                      </View>
                      <View style={styles.resultStatRow}>
                        <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Setup & Plan Settings:</Text>
                        <Text style={[styles.resultStatVal, { color: workbookResult.setupImported ? colors.successText : colors.textSecondary }]}>
                          {workbookResult.setupImported ? 'Configured' : 'Skipped'}
                        </Text>
                      </View>
                      <View style={styles.resultStatRow}>
                        <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Duplicates Handled:</Text>
                        <Text style={[styles.resultStatVal, { color: colors.warningText }]}>{workbookResult.totalDuplicates}</Text>
                      </View>
                      {workbookResult.errors.length > 0 && (
                        <View style={styles.resultStatRow}>
                          <Text style={[styles.resultStatLabel, { color: colors.dangerText }]}>Errors / Issues:</Text>
                          <Text style={[styles.resultStatVal, { color: colors.dangerText }]}>{workbookResult.errors.length}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : importResult ? (
                  // Single sheet completion report
                  <View>
                    <View style={styles.resultHeader}>
                      <View style={[styles.successIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                        <CheckCircle2 size={40} color={colors.primary} />
                      </View>
                      <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>Import Completed</Text>
                      <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                        Your database has been updated safely.
                      </Text>
                    </View>

                    <View style={[styles.resultStatsCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <View style={styles.resultStatRow}>
                        <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Records Added:</Text>
                        <Text style={[styles.resultStatVal, { color: colors.successText }]}>{importResult.addedCount}</Text>
                      </View>
                      <View style={styles.resultStatRow}>
                        <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Records Updated:</Text>
                        <Text style={[styles.resultStatVal, { color: colors.primary }]}>{importResult.updatedCount}</Text>
                      </View>
                      <View style={styles.resultStatRow}>
                        <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Records Skipped:</Text>
                        <Text style={[styles.resultStatVal, { color: colors.warningText }]}>{importResult.skippedCount}</Text>
                      </View>
                    </View>

                    {importResult.issues.length > 0 && (
                      <Button
                        title="Download Issue Report (CSV)"
                        variant="secondary"
                        icon={<Download size={16} color={colors.textPrimary} />}
                        onPress={downloadErrorReport}
                        style={{ marginTop: 12 }}
                      />
                    )}
                  </View>
                ) : null}
              </View>
            )}

          </ScrollView>

          {/* Modal Footer Controls */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            {step !== 'upload' && step !== 'result' && (
              <Button
                title="Back"
                variant="ghost"
                icon={<ChevronLeft size={16} color={colors.textSecondary} />}
                onPress={() => {
                  if (step === 'workbook_preview') setStep('upload');
                  else if (step === 'sheet') setStep(workbookWidePreview ? 'workbook_preview' : 'upload');
                  else if (step === 'mapping') setStep(workbookData && workbookData.sheets.length > 1 ? 'sheet' : 'upload');
                  else if (step === 'preview') setStep(category === 'setup' ? 'upload' : 'mapping');
                  else if (step === 'strategy') setStep('preview');
                }}
              />
            )}

            <View style={{ flex: 1 }} />

            {/* Whole Workbook Preview Action */}
            {step === 'workbook_preview' && workbookWidePreview && (
              <Button
                title={isProcessing ? "Importing Entire Workbook..." : `Import Entire Workbook (${workbookWidePreview.overallSummary.enabledSheets} Sheets)`}
                variant="primary"
                loading={isProcessing}
                icon={<CheckCircle2 size={16} color="#FFF" />}
                onPress={handleExecuteWorkbookWideImport}
              />
            )}

            {step === 'mapping' && (
              <Button
                title="Next: Preview Records"
                variant="primary"
                icon={<Eye size={16} color="#FFF" />}
                onPress={() => setStep('preview')}
              />
            )}

            {step === 'preview' && (
              <Button
                title="Next: Choose Strategy"
                variant="primary"
                icon={<ChevronRight size={16} color="#FFF" />}
                onPress={() => setStep('strategy')}
              />
            )}

            {step === 'strategy' && (
              <Button
                title={isProcessing ? "Importing..." : "Confirm & Import"}
                variant="primary"
                loading={isProcessing}
                icon={<CheckCircle2 size={16} color="#FFF" />}
                onPress={handleExecuteSingleImport}
              />
            )}

            {step === 'result' && (
              <Button
                title="Done"
                variant="primary"
                onPress={handleClose}
              />
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 820,
    maxHeight: '92%',
    borderRadius: AcademicTheme.borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: AcademicTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: AcademicTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  stepContainer: {
    gap: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Whole-Workbook Preview Styles
  wbSummaryCard: {
    padding: 16,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
  },
  wbFileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  metricPill: {
    flex: 1,
    minWidth: 110,
    padding: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricPillNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricPillLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  wbSheetsList: {
    gap: 8,
  },
  wbSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  wbSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  wbSheetDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  wbSheetPreview: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  wbStrategySection: {
    padding: 16,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
  },
  strategyCardsRow: {
    gap: 10,
    marginTop: 10,
  },
  strategyOptionBtn: {
    padding: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  strategyOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  strategyOptionDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  // Single-sheet styles
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 13,
    marginBottom: 8,
  },
  sheetList: {
    gap: 8,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  sheetName: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  mappingList: {
    gap: 10,
  },
  mappingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    gap: 12,
  },
  mappingFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  mappingFieldDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  mappingDropdownWrap: {
    maxWidth: '55%',
  },
  colChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AcademicTheme.borderRadius.sm,
    borderWidth: 1,
  },
  setupCard: {
    padding: 16,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    gap: 6,
  },
  setupCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  setupCardItem: {
    fontSize: 13,
  },
  previewStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tableScroll: {
    maxHeight: 300,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.sm,
    paddingVertical: 8,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  tableCellHead: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: '700',
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  tableCell: {
    fontSize: AcademicTheme.typography.sizes.sm,
    paddingHorizontal: 8,
    lineHeight: 20,
    flexShrink: 1,
  },
  colStatus: {
    width: 50,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexShrink: 0,
    paddingTop: 2,
  },
  colRow: {
    width: 50,
    flexShrink: 0,
  },
  colData: {
    width: 140,
    minWidth: 100,
    flexShrink: 1,
  },
  strategyCards: {
    gap: 10,
  },
  strategyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
  },
  strategyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  strategyDesc: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    lineHeight: 20,
    flexShrink: 1,
  },
  confirmReplaceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmReplaceText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  resultStatsCard: {
    padding: 16,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1,
    gap: 8,
  },
  resultStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: 14,
  },
  resultStatVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
});
