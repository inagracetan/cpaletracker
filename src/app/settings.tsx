import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Switch 
} from 'react-native';
import { AcademicTheme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { NotificationService } from '../services/notifications/notificationService';
import { ReminderEngine, PermissionStatus } from '../services/notifications/reminderEngine';
import { OfflineService, OfflineStatus } from '../services/offline/offlineService';
import { SupabaseService } from '../services/supabase/supabaseService';
import { CSVService } from '../services/csv/csvService';
import { ICSService } from '../services/ics/icsService';
import { ImportEngine } from '../services/import/importEngine';
import { ImportWizardModal } from '../components/import/ImportWizardModal';
import { 
  User, 
  Calendar, 
  Bell, 
  Cloud, 
  Download, 
  Upload, 
  RotateCcw, 
  FileSpreadsheet, 
  History, 
  Clock,
  Sun,
  Moon,
  Send,
  AlertTriangle,
  Wifi,
  WifiOff,
  Smartphone,
  CheckCircle2,
  Settings
} from 'lucide-react-native';
import { TimePickerModal } from '../components/ui/TimePickerModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHero } from '../components/ui/PageHero';
import { formatTo12Hour } from '../utils/timeFormat';

export default function SettingsScreen() {
  const { colors, isDark, setThemePreference } = useTheme();
  const { 
    state, 
    updateUserProfile, 
    updatePreferences, 
    triggerCloudSync, 
    resetAllData 
  } = useApp();

  const [nicknameInput, setNicknameInput] = useState(state.userProfile.nickname || 'Future CPA');
  const [fullNameInput, setFullNameInput] = useState(state.userProfile.fullName || '');
  
  // 12-Hour Time Picker State
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end'>('start');

  // Confirmation Dialog State
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Import Wizard Modal state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  // Reminders & Offline status state
  const [reminderPermission, setReminderPermission] = useState<PermissionStatus>(() => ReminderEngine.getPermissionStatus());
  const [activeRemindersCount, setActiveRemindersCount] = useState<number>(0);
  const [reminderNotice, setReminderNotice] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(() => OfflineService.isOnline());
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(() => OfflineService.getStatus());
  const installTips = OfflineService.getInstallInstructions();
  const cloudConfigured = SupabaseService.isCloudSyncConfigured();

  React.useEffect(() => {
    // Check initial reminders count
    ReminderEngine.getScheduledReminders().then((rems) => {
      setActiveRemindersCount(rems.filter(r => !r.isDelivered).length);
    }).catch(() => {});

    // Listen to network / offline-readiness changes
    const unsubNet = OfflineService.addListener(setIsOnline);
    const unsubStatus = OfflineService.addStatusListener(setOfflineStatus);
    return () => {
      unsubNet();
      unsubStatus();
    };
  }, [state]);

  const handleInstallApp = async () => {
    const result = await OfflineService.promptInstall();
    if (result === 'unavailable') {
      alert(
        'Install prompt is not available in this browser right now.\n\n' +
          'Windows/macOS: use the browser install icon in the address bar.\n' +
          'Android: Chrome menu → Install app / Add to Home screen.\n' +
          'iPhone/iPad: Safari → Share → Add to Home Screen.'
      );
    }
  };

  const handleSaveProfile = async () => {
    await updateUserProfile({
      nickname: nicknameInput.trim() || 'Future CPA',
      fullName: fullNameInput.trim(),
    });
    alert('Profile updated successfully!');
  };

  const handleToggleNotifications = async (val: boolean) => {
    if (val) {
      const res = await ReminderEngine.requestPermission();
      setReminderPermission(res.status);
      setReminderNotice(res.message);

      if (!res.granted) {
        await updatePreferences({ notificationsEnabled: false });
        alert(res.message);
        return;
      }

      await updatePreferences({ notificationsEnabled: true });
      const syncRes = await ReminderEngine.syncReminders({
        ...state,
        preferences: { ...state.preferences, notificationsEnabled: true }
      });
      setActiveRemindersCount(syncRes.activeCount);
    } else {
      await updatePreferences({ notificationsEnabled: false });
      await ReminderEngine.syncReminders({
        ...state,
        preferences: { ...state.preferences, notificationsEnabled: false }
      });
      setActiveRemindersCount(0);
      setReminderNotice('Study reminders disabled.');
    }
  };

  const handleSendTestReminder = async () => {
    const res = await ReminderEngine.sendTestReminder(state.preferences);
    setReminderNotice(res.message);
    alert(res.message);
  };

  const handleExportFullJSON = () => {
    const json = JSON.stringify(state, null, 2);
    if (typeof window !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `CPALE_Tracker_Backup_${state.userProfile.nickname}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Full JSON backup generated!');
    }
  };

  const handleExportTopicsCSV = () => {
    const csv = CSVService.exportTopicsToCSV(state.topics);
    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'CPALE_Topics_Syllabus.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportDeadlinesCSV = () => {
    const csv = CSVService.exportDeadlinesToCSV(state.deadlines);
    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'CPALE_Deadlines.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportSessionsCSV = () => {
    const csv = CSVService.exportStudySessionsToCSV(state.sessions);
    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'CPALE_Study_Sessions.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportICS = () => {
    const ics = ICSService.generateICS({
      sessions: state.sessions,
      deadlines: state.deadlines,
      userNickname: state.userProfile.nickname,
    });
    if (typeof window !== 'undefined') {
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'CPALE_Study_Calendar.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Calendar exported as .ICS!');
    }
  };

  const handleExportAssessmentsCSV = () => {
    const csv = CSVService.exportAssessmentsToCSV(state.assessments || []);
    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'CPALE_Assessments_Preboards.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Assessments exported to CSV!');
    }
  };

  const handleCloudSync = async () => {
    setSyncStatusMsg('Syncing with Supabase Cloud...');
    const status = await triggerCloudSync();
    setSyncStatusMsg(status === 'Synced' ? 'Synced successfully!' : state.syncMetadata.errorMessage || 'Local-only mode active.');
  };

  const handleSelectQuietTime = async (time24: string) => {
    if (timePickerTarget === 'start') {
      await updatePreferences({ quietHoursStart: time24 });
    } else {
      await updatePreferences({ quietHoursEnd: time24 });
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      setResetConfirmVisible(false);
      alert('All tracker data was permanently deleted. The app is empty until you import a file.');
    } catch (_err) {
      alert('Failed to reset application data.');
    } finally {
      setIsResetting(false);
    }
  };

  const downloadHistoryErrorReport = (historyItem: any) => {
    const csv = ImportEngine.generateErrorReportCSV(historyItem);
    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `import_report_${historyItem.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#F0F4FF' }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      <PageHero
        title="Settings & Preferences"
        subtitle="Manage candidate profile, import spreadsheets, set quiet hours, and back up your data"
      />

      {/* Theme Toggle Pill */}
      <TouchableOpacity
        style={[styles.themeToggleRow, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: isDark ? colors.border : '#E8EEFF', borderWidth: 1 }]}
        onPress={() => setThemePreference(isDark ? 'light' : 'dark')}
        accessibilityLabel={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        activeOpacity={0.8}
      >
        <View style={[styles.themeIconWrap, { backgroundColor: colors.accentLight }]}>
          {isDark ? <Sun size={18} color={colors.accent} /> : <Moon size={18} color={colors.primary} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.themeToggleLabel, { color: colors.textPrimary }]}>
            {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </Text>
          <Text style={[styles.themeToggleSub, { color: colors.textMuted }]}>Current: {isDark ? 'Dark' : 'Light'}</Text>
        </View>
        <View style={[styles.themeTogglePill, { backgroundColor: isDark ? colors.accent : colors.backgroundSoft }]}>
          <Text style={[styles.themeTogglePillText, { color: isDark ? '#FFF' : colors.textSecondary }]}>{isDark ? 'Dark' : 'Light'}</Text>
        </View>
      </TouchableOpacity>

      {/* 2. Candidate Profile */}
      <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <User size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Candidate Profile</Text>
        </View>

        <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Study Handle / Nickname</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
          value={nicknameInput}
          onChangeText={setNicknameInput}
          placeholder="e.g. Grace CPA"
          placeholderTextColor={colors.textLight}
        />

        <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Full Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder, color: colors.textPrimary }]}
          value={fullNameInput}
          onChangeText={setFullNameInput}
          placeholder="e.g. Juan Dela Cruz"
          placeholderTextColor={colors.textLight}
        />

        <Button
          title="Save Profile"
          variant="primary"
          size="sm"
          onPress={handleSaveProfile}
          style={{ alignSelf: 'flex-start', marginTop: 12 }}
        />
      </Card>

      {/* 5. Notification Preferences */}
      <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <Bell size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Notifications & Reminders</Text>
        </View>

        <View style={[styles.switchRow, { borderBottomColor: colors.borderLight }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Daily Study & Assessment Reminders</Text>
              {state.preferences.notificationsEnabled && reminderPermission === 'granted' ? (
                <Badge label={`Active • ${activeRemindersCount} Scheduled`} variant="success" size="sm" />
              ) : reminderPermission === 'denied' ? (
                <Badge label="Permission Blocked" variant="danger" size="sm" />
              ) : (
                <Badge label="Disabled" variant="default" size="sm" />
              )}
            </View>
            <Text style={[styles.switchSub, { color: colors.textMuted }]}>
              Automated alerts for scheduled study sessions, upcoming preboards, and PRC deadlines
            </Text>
          </View>
          <Switch
            value={state.preferences.notificationsEnabled && reminderPermission === 'granted'}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>

        {reminderPermission === 'denied' && (
          <View style={[styles.reminderAlertBox, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
            <AlertTriangle size={18} color={colors.warning} />
            <Text style={[styles.reminderAlertText, { color: colors.warningText }]}>
              Browser notification permission is blocked. Click the lock/settings icon in your browser address bar, set Notifications to &quot;Allow&quot;, and re-enable this switch.
            </Text>
          </View>
        )}

        {reminderNotice ? (
          <Text style={[styles.reminderNoticeText, { color: colors.textSecondary }]}>
            {reminderNotice}
          </Text>
        ) : null}

        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button
            title="Send Test Reminder"
            variant="outline"
            size="sm"
            icon={<Send size={14} color={colors.accent} />}
            onPress={handleSendTestReminder}
          />
        </View>

        <View style={[styles.switchRow, { borderBottomColor: colors.borderLight, marginTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Daily Motivational Quotes</Text>
            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Show streak and encouraging progress lines in greeting</Text>
          </View>
          <Switch
            value={state.preferences.motivationalQuotesEnabled}
            onValueChange={(val) => updatePreferences({ motivationalQuotesEnabled: val })}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Quiet Hours Start (12-Hour)</Text>
            <TouchableOpacity
              onPress={() => { setTimePickerTarget('start'); setTimePickerVisible(true); }}
              style={[styles.timePickerButton, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder }]}
              accessibilityLabel="Select Quiet Hours Start Time"
            >
              <Clock size={16} color={colors.accent} />
              <Text style={[styles.timePickerText, { color: colors.textPrimary }]}>
                {formatTo12Hour(state.preferences.quietHoursStart || '22:00')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Quiet Hours End (12-Hour)</Text>
            <TouchableOpacity
              onPress={() => { setTimePickerTarget('end'); setTimePickerVisible(true); }}
              style={[styles.timePickerButton, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder }]}
              accessibilityLabel="Select Quiet Hours End Time"
            >
              <Clock size={16} color={colors.accent} />
              <Text style={[styles.timePickerText, { color: colors.textPrimary }]}>
                {formatTo12Hour(state.preferences.quietHoursEnd || '07:00')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.platformDisclaimer, { color: colors.textMuted }]}>
          Platform Note: Web notifications deliver when the application is running in a browser tab. To receive reminders when the device is locked, keep the tab open or install as an offline PWA.
        </Text>
      </Card>

      {/* 6. Cloud Sync & Offline Mode */}
      <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <Cloud size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Cloud Sync & Offline Persistence</Text>
        </View>

        <View style={styles.networkStatusRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
            {isOnline ? <Wifi size={16} color={colors.success} /> : <WifiOff size={16} color={colors.warning} />}
            <Text style={[styles.networkStatusText, { color: isOnline ? colors.success : colors.warning }]}>
              {isOnline ? 'Online (Network Connected)' : 'Offline (Local Persistence Active)'}
            </Text>
          </View>
          <Badge 
            label={state.syncMetadata.syncStatus} 
            variant={state.syncMetadata.syncStatus === 'Synced' ? 'success' : 'default'} 
          />
        </View>

        <View style={[styles.offlineReadyRow, { backgroundColor: offlineStatus.offlineReady ? colors.successLight : colors.backgroundSoft, borderColor: offlineStatus.offlineReady ? colors.successBorder : colors.border }]}>
          {offlineStatus.offlineReady ? (
            <CheckCircle2 size={16} color={colors.success} style={{ flexShrink: 0 }} />
          ) : (
            <WifiOff size={16} color={colors.textMuted} style={{ flexShrink: 0 }} />
          )}
          <Text style={[styles.offlineReadyText, { color: offlineStatus.offlineReady ? colors.successText : colors.textSecondary }]}>
            {offlineStatus.offlineReady
              ? `Offline setup complete${offlineStatus.cacheVersion ? ` (${offlineStatus.cacheVersion})` : ''}. You can reopen this app without internet on this device.`
              : 'Offline setup pending. Keep the app open online once so the service worker can cache the app shell.'}
          </Text>
        </View>

        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
          Study plans, syllabus checklists, assessments, deadlines, sessions, and progress are saved locally in IndexedDB on this browser/device. They survive refresh and reopen. Local data is not shared automatically across devices
          {cloudConfigured ? ' unless optional cloud sync is connected and signed in.' : '.'}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.textMuted, marginTop: 8 }]}>
          {OfflineService.getOfflineNotice()}
        </Text>

        {syncStatusMsg ? <Text style={[styles.syncMsgText, { color: colors.textSecondary }]}>{syncStatusMsg}</Text> : null}

        <Button
          title={cloudConfigured ? 'Synchronize Cloud Data' : 'Check Cloud Sync Status'}
          variant="outline"
          size="sm"
          onPress={handleCloudSync}
          style={{ alignSelf: 'flex-start', marginTop: 10 }}
        />
      </Card>

      {/* 6b. Install as App */}
      <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <Smartphone size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Install CPALE Tracker</Text>
        </View>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
          Install as a Progressive Web App where supported. The site also works in a normal browser tab.
        </Text>
        <View style={styles.installTips}>
          <Text style={[styles.installTip, { color: colors.textSecondary }]}>Windows: {installTips.windows}</Text>
          <Text style={[styles.installTip, { color: colors.textSecondary }]}>macOS: {installTips.macos}</Text>
          <Text style={[styles.installTip, { color: colors.textSecondary }]}>Android: {installTips.android}</Text>
          <Text style={[styles.installTip, { color: colors.textSecondary }]}>iPhone / iPad: {installTips.ios}</Text>
        </View>
        <Button
          title={offlineStatus.canInstall ? 'Install App' : 'Show Install Help'}
          variant="primary"
          size="sm"
          onPress={handleInstallApp}
          style={{ alignSelf: 'flex-start', marginTop: 10 }}
          accessibilityLabel="Install CPALE Tracker as an app"
        />
      </Card>

      {/* 7. Import & Export Data Station — single Import entry point */}
      <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <FileSpreadsheet size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Import & Export Data</Text>
        </View>

        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
          Import multi-sheet Excel/CSV workbooks, syllabus topics, deadlines, schedules, and assessments. Export live tracker data for backup.
        </Text>

        {/* Single Import section */}
        <View style={[styles.importSubSection, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Upload size={16} color={colors.accent} />
            <Text style={[styles.subSectionTitle, { color: colors.textPrimary }]}>Import</Text>
          </View>
          <Text style={[styles.subSectionDesc, { color: colors.textSecondary }]}>
            Supports .xlsx, .xls, and .csv with automatic field mapping, duplicate detection, and whole-workbook import.
          </Text>
          <Button
            title="Import Spreadsheet"
            variant="primary"
            size="sm"
            icon={<Upload size={14} color="#FFF" />}
            onPress={() => setImportModalVisible(true)}
            accessibilityLabel="Import spreadsheet"
            style={{ alignSelf: 'flex-start', marginTop: 10 }}
          />
        </View>

        {/* Import History */}
        {(state.importHistory || []).length > 0 && (
          <View style={[styles.historyContainer, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <History size={16} color={colors.accent} />
              <Text style={[styles.historyHeading, { color: colors.textPrimary }]}>Recent Import History</Text>
            </View>

            <View style={{ gap: 8 }}>
              {(state.importHistory || []).slice(0, 5).map(item => (
                <View
                  key={item.id}
                  style={[styles.historyItem, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.historyFilename, { color: colors.textPrimary }]}>
                      {item.filename} {item.sheetName ? `(${item.sheetName})` : ''}
                    </Text>
                    <Text style={[styles.historyMeta, { color: colors.textMuted }]}>
                      {new Date(item.timestamp).toLocaleString()} · Strategy: {item.strategy} · {item.addedCount} added, {item.updatedCount} updated, {item.skippedCount} skipped
                    </Text>
                  </View>

                  {item.issues && item.issues.length > 0 ? (
                    <TouchableOpacity
                      style={[styles.reportBtn, { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder }]}
                      onPress={() => downloadHistoryErrorReport(item)}
                      accessibilityLabel={`Download error report (${item.errorCount} errors)`}
                    >
                      <Download size={14} color={colors.danger} />
                      <Text style={[styles.reportBtnText, { color: colors.dangerText }]}>Errors ({item.errorCount})</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Export Hub */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Download size={16} color={colors.accent} />
            <Text style={[styles.subSectionTitle, { color: colors.textPrimary }]}>Export & Data Backup</Text>
          </View>
          <Text style={[styles.subSectionDesc, { color: colors.textSecondary, marginBottom: 12 }]}>
            Download verified study records, progress, schedules, and deadlines in open standard formats reflecting live saved application data.
          </Text>

          <View style={styles.exportBtnsGrid}>
            <Button
              title="Export Topics CSV"
              variant="outline"
              size="sm"
              icon={<Download size={14} color={colors.accent} />}
              onPress={handleExportTopicsCSV}
            />
            <Button
              title="Export Deadlines CSV"
              variant="outline"
              size="sm"
              icon={<Download size={14} color={colors.accent} />}
              onPress={handleExportDeadlinesCSV}
            />
            <Button
              title="Export Sessions CSV"
              variant="outline"
              size="sm"
              icon={<Download size={14} color={colors.accent} />}
              onPress={handleExportSessionsCSV}
            />
            <Button
              title="Export Assessments CSV"
              variant="outline"
              size="sm"
              icon={<Download size={14} color={colors.accent} />}
              onPress={handleExportAssessmentsCSV}
            />
            <Button
              title="Export JSON Backup"
              variant="outline"
              size="sm"
              icon={<Download size={14} color={colors.accent} />}
              onPress={handleExportFullJSON}
            />
            <Button
              title="Export Calendar (.ICS)"
              variant="outline"
              size="sm"
              icon={<Calendar size={14} color={colors.accent} />}
              onPress={handleExportICS}
            />
          </View>
        </View>

        <View style={[styles.dangerZone, { borderTopColor: colors.dangerLight }]}>
          <Text style={[styles.dangerTitle, { color: colors.danger }]}>Reset Application Data</Text>
          <Text style={[styles.dangerDesc, { color: colors.textMuted }]}>
            Permanently delete all imported records, topics, sessions, deadlines, assessments, and progress. The app will stay empty until you import a file again.
          </Text>
          <Button
            title="Reset All Tracker Data"
            variant="danger"
            size="sm"
            icon={<RotateCcw size={14} color="#FFF" />}
            onPress={() => setResetConfirmVisible(true)}
            style={{ alignSelf: 'flex-start', marginTop: 8 }}
          />
        </View>
      </Card>

      {/* 12-Hour Time Picker Modal */}
      <TimePickerModal
        visible={timePickerVisible}
        onClose={() => setTimePickerVisible(false)}
        initialTime24={timePickerTarget === 'start' ? (state.preferences.quietHoursStart || '22:00') : (state.preferences.quietHoursEnd || '07:00')}
        title={timePickerTarget === 'start' ? 'Quiet Hours Start' : 'Quiet Hours End'}
        onSelectTime={handleSelectQuietTime}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        visible={resetConfirmVisible}
        title="Permanently Delete All Tracker Data?"
        message="This permanently deletes all imported records and tracker data (topics, checklists, calendar sessions, deadlines, assessments, practice logs, badges, and import history) from this device."
        consequence="This cannot be undone. Sample or previously imported data will not come back after refresh. You will need to import a file again to restore tracker records."
        confirmText="Delete Everything"
        confirmVariant="danger"
        isProcessing={isResetting}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetConfirmVisible(false)}
      />

      {/* Import Wizard Modal */}
      <ImportWizardModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        initialCategory="auto"
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
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
  },
  headerThemeToggleText: {
    fontSize: 13,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  title: {
    fontSize: AcademicTheme.typography.sizes.xl,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  sectionCard: {
    marginBottom: AcademicTheme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  compactThemeToggle: {
    flexDirection: 'row',
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    padding: 3,
    marginTop: 10,
  },
  themeToggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.sm,
    gap: 6,
  },
  themeToggleOptionActive: {
    borderWidth: 1,
    ...AcademicTheme.shadows.subtle,
  },
  themeToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  timePickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.semibold,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    padding: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  switchSub: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  syncStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  offlineReadyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  offlineReadyText: {
    flex: 1,
    minWidth: 0,
    fontSize: AcademicTheme.typography.sizes.sm,
    lineHeight: 20,
  },
  installTips: {
    gap: 8,
    marginTop: 4,
  },
  installTip: {
    fontSize: AcademicTheme.typography.sizes.sm,
    lineHeight: 20,
  },
  syncMsgText: {
    fontSize: 13,
  },
  exportBtnsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  importSubSection: {
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  subSectionDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  dangerZone: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  dangerDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  historyContainer: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  historyHeading: {
    fontSize: 15,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
  },
  historyFilename: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
    lineHeight: 20,
    flexShrink: 1,
  },
  historyMeta: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    lineHeight: 20,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: AcademicTheme.borderRadius.sm,
    borderWidth: 1,
    flexShrink: 0,
  },
  reportBtnText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  reminderAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    borderWidth: 1,
    marginTop: 10,
  },
  reminderAlertText: {
    flex: 1,
    minWidth: 0,
    fontSize: AcademicTheme.typography.sizes.sm,
    lineHeight: 20,
  },
  reminderNoticeText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  platformDisclaimer: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 14,
    lineHeight: 20,
  },
  networkStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  networkStatusText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
    flexShrink: 1,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Theme toggle row (replaces old compact button)
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: AcademicTheme.borderRadius.xl,
    marginBottom: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  themeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  themeToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  themeToggleSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  themeTogglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AcademicTheme.borderRadius.full,
    flexShrink: 0,
  },
  themeTogglePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
