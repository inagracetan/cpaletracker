import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  useWindowDimensions, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  SafeAreaView,
  Modal,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import { AcademicTheme } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  Clock, 
  Home, 
  ListChecks, 
  Play, 
  Pause, 
  Square, 
  Settings, 
  TrendingUp, 
  AlertCircle,
  Award,
  ClipboardCheck,
  X,
  GripVertical,
  Menu,
  User
} from 'lucide-react-native';
import { AchievementToast } from '../achievements/AchievementToast';

export interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

interface NavItemDef {
  name: string;
  /** Compact label for the mobile bottom bar only */
  shortName?: string;
  path: string;
  icon: any;
}

const DEFAULT_NAV_ITEMS: NavItemDef[] = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Checklist & Calendar', shortName: 'Checklist', path: '/checklist', icon: CalendarIcon },
  { name: 'Plan', path: '/plan', icon: ListChecks },
  { name: 'Assessments', shortName: 'Assess', path: '/assessments', icon: ClipboardCheck },
  { name: 'Syllabus', path: '/syllabus', icon: BookOpen },
  { name: 'Progress', path: '/progress', icon: TrendingUp },
  { name: 'Review', path: '/review', icon: Award },
  { name: 'Deadlines', path: '/deadlines', icon: AlertCircle },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const NAV_STORAGE_KEY = 'cpale_nav_order';

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const router = useRouter();
  const pathname = usePathname();
  const { colors, isDark } = useTheme();
  const { state, activeTimer, pauseTimer, resumeTimer, stopTimer } = useApp();

  const [navItems, setNavItems] = useState<NavItemDef[]>(DEFAULT_NAV_ITEMS);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Load saved navigation order from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(NAV_STORAGE_KEY);
        if (saved) {
          const orderedPaths: string[] = JSON.parse(saved);
          if (Array.isArray(orderedPaths) && orderedPaths.length > 0) {
            const reordered: NavItemDef[] = [];
            // Map legacy /calendar to /checklist
            const cleanedPaths = orderedPaths.map(p => p === '/calendar' ? '/checklist' : p);
            // Add items that match saved order
            for (const path of cleanedPaths) {
              const found = DEFAULT_NAV_ITEMS.find(item => item.path === path);
              if (found && !reordered.some(r => r.path === found.path)) {
                reordered.push(found);
              }
            }
            // Add any newly introduced items not yet in saved order
            for (const item of DEFAULT_NAV_ITEMS) {
              if (!reordered.some(r => r.path === item.path)) {
                reordered.push(item);
              }
            }
            setNavItems(reordered);
          }
        }
      } catch (err) {
        console.error('Failed to load navigation order:', err);
      }
    })();
  }, []);

  // Save new navigation order
  const saveNavOrder = async (newItems: NavItemDef[]) => {
    setNavItems(newItems);
    try {
      const paths = newItems.map(item => item.path);
      await AsyncStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(paths));
    } catch (err) {
      console.error('Failed to save navigation order:', err);
    }
  };

  const handleDropReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= navItems.length || toIndex >= navItems.length) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      return;
    }
    const copy = [...navItems];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    saveNavOrder(copy);
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const isMoreActive = isMoreOpen || navItems.slice(4).some(it => pathname === it.path || (it.path !== '/' && pathname.startsWith(it.path)));

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AchievementToast />
      <View style={[styles.rootContainer, { backgroundColor: colors.background }, isDesktop ? styles.rowContainer : styles.colContainer]}>
        
        {/* Desktop Sidebar */}
        {isDesktop && (
          <View style={[styles.sidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
            {/* Header / Branding - Clean, no customization icon */}
            <View style={styles.brandContainer}>
              <Image
                source={{ uri: isDark ? '/cpadark.png' : '/cpabg.png' }}
                style={styles.logoBadgeImage}
                accessibilityLabel="CPALE Tracker logo"
              />
              <View style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
                <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>CPALE Tracker</Text>
                <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
                  {state.userProfile.nickname || 'Future CPA'} · {state.userProfile.takerType}
                </Text>
              </View>
            </View>

            {/* Navigation Links with Direct Drag & Drop */}
            <ScrollView style={styles.sidebarNav} showsVerticalScrollIndicator={false}>
              {navItems.map((item, index) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                const IconComponent = item.icon;
                const isDragging = draggedIndex === index;
                const isDropTarget = dropTargetIndex === index && draggedIndex !== index;

                return (
                  <View key={item.path}>
                    {isDropTarget && (
                      <View style={[styles.dropIndicatorLine, { backgroundColor: colors.accent }]} />
                    )}
                    <TouchableOpacity
                      style={[
                        styles.sidebarLink, 
                        isActive && { backgroundColor: colors.accentLight },
                        isDragging && { opacity: 0.5, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.accentLight },
                      ]}
                      onPress={() => {
                        if (draggedIndex !== null && draggedIndex !== index) {
                          handleDropReorder(draggedIndex, index);
                        } else {
                          router.push(item.path as any);
                        }
                      }}
                      onLongPress={() => {
                        setDraggedIndex(index);
                      }}
                      delayLongPress={250}
                      {...(Platform.OS === 'web' ? {
                        draggable: true,
                        onDragStart: (e: any) => {
                          if (e?.dataTransfer) {
                            e.dataTransfer.setData('text/plain', String(index));
                            e.dataTransfer.effectAllowed = 'move';
                          }
                          setDraggedIndex(index);
                        },
                        onDragOver: (e: any) => {
                          e.preventDefault();
                          if (e?.dataTransfer) e.dataTransfer.dropEffect = 'move';
                          if (dropTargetIndex !== index) setDropTargetIndex(index);
                        },
                        onDrop: (e: any) => {
                          e.preventDefault();
                          const fromStr = e?.dataTransfer?.getData('text/plain');
                          const fromIdx = fromStr ? parseInt(fromStr, 10) : draggedIndex;
                          if (fromIdx !== null && fromIdx !== undefined && !isNaN(fromIdx)) {
                            handleDropReorder(fromIdx, index);
                          }
                          setDraggedIndex(null);
                          setDropTargetIndex(null);
                        },
                        onDragEnd: () => {
                          setDraggedIndex(null);
                          setDropTargetIndex(null);
                        },
                      } as any : {})}
                      activeOpacity={0.7}
                    >
                      <IconComponent
                        size={20}
                        color={isActive ? colors.accent : colors.textSecondary}
                      />
                      <Text style={[
                        styles.sidebarLinkText, 
                        { color: isActive ? colors.accent : colors.textSecondary },
                        isActive && styles.sidebarLinkTextActive
                      ]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Sync Status Badge in Sidebar Footer */}
            <View style={[styles.sidebarFooter, { borderTopColor: colors.borderLight }]}>
              <View style={[styles.syncPill, { backgroundColor: colors.backgroundSubtle }]}>
                <View style={[
                  styles.syncDot, 
                  { backgroundColor: state.syncMetadata.syncStatus === 'Synced' ? colors.success : colors.warning }
                ]} />
                <Text style={[styles.syncText, { color: colors.textSecondary }]}>
                  {state.syncMetadata.syncStatus}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Main Content Area */}
        <View style={[styles.mainContent, { backgroundColor: colors.background }]}>
          {/* Top header on mobile: Clean, no duplicate Settings and no customization icon */}
          {!isDesktop && (
            <View style={[styles.mobileHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              {/* Brand on left */}
              <View style={styles.mobileBrandGroup}>
                <Image
                  source={{ uri: isDark ? '/cpadark.png' : '/cpabg.png' }}
                  style={styles.mobileLogoBadgeImage}
                  accessibilityLabel="CPALE Tracker logo"
                />
                <Text style={[styles.mobileBrandTitle, { color: colors.textPrimary }]}>CPALE Tracker</Text>
              </View>

              {/* Profile / Nickname — wraps fully; never clipped by fixed max widths */}
              <View
                style={styles.mobileProfileContainer}
                accessibilityRole="header"
                accessibilityLabel={`Logged in user: ${state.userProfile.nickname || 'Future CPA'}`}
              >
                <View style={[styles.mobileProfilePill, { backgroundColor: colors.backgroundSoft, borderColor: colors.cardBorder }]}>
                  <View style={[styles.mobileAvatarCircle, { backgroundColor: colors.accentLight }]}>
                    <User size={13} color={colors.accent} />
                  </View>
                  <Text style={[styles.mobileGreetingText, { color: colors.textPrimary }]}>
                    {state.userProfile.nickname || 'Future CPA'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Children Screen Content */}
          <View style={styles.contentWrapper}>
            {children}
          </View>

          {/* Floating Study Timer Banner if active */}
          {(activeTimer.isRunning || activeTimer.elapsedSeconds > 0) && (
            <View style={[styles.floatingTimer, { backgroundColor: isDark ? colors.cardElevated : '#0F172A' }]}>
              <View style={styles.timerInfo}>
                <Clock size={18} color={colors.accent} style={{ flexShrink: 0 }} />
                <View style={{ marginLeft: 8, flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={styles.timerTitle}>
                    {activeTimer.topicTitle || 'Review Session'}
                  </Text>
                  <Text style={[styles.timerTime, { color: colors.accent }]}>{formatTimerTime(activeTimer.elapsedSeconds)}</Text>
                </View>
              </View>
              <View style={styles.timerControls}>
                {activeTimer.isRunning ? (
                  <TouchableOpacity style={[styles.timerBtn, { backgroundColor: colors.accent }]} onPress={pauseTimer}>
                    <Pause size={18} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.timerBtn, { backgroundColor: colors.accent }]} onPress={resumeTimer}>
                    <Play size={18} color="#FFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.timerBtn, { backgroundColor: colors.success, marginLeft: 8 }]} 
                  onPress={() => stopTimer(activeTimer.topicId)}
                >
                  <Square size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mobile Bottom Navigation Bar: Top 4 destinations + More */}
          {!isDesktop && (
            <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              {navItems.slice(0, 4).map((item, index) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                const IconComponent = item.icon;
                const isDragging = draggedIndex === index;
                const isDropTarget = dropTargetIndex === index && draggedIndex !== index;

                return (
                  <TouchableOpacity
                    key={item.path}
                    style={[
                      styles.bottomNavItem,
                      isDragging && { opacity: 0.5 },
                      isDropTarget && { borderTopWidth: 2, borderTopColor: colors.accent },
                    ]}
                    onPress={() => {
                      if (draggedIndex !== null && draggedIndex !== index) {
                        handleDropReorder(draggedIndex, index);
                      } else {
                        router.push(item.path as any);
                      }
                    }}
                    onLongPress={() => setDraggedIndex(index)}
                    delayLongPress={250}
                    {...(Platform.OS === 'web' ? {
                      draggable: true,
                      onDragStart: (e: any) => {
                        if (e?.dataTransfer) {
                          e.dataTransfer.setData('text/plain', String(index));
                          e.dataTransfer.effectAllowed = 'move';
                        }
                        setDraggedIndex(index);
                      },
                      onDragOver: (e: any) => {
                        e.preventDefault();
                        if (dropTargetIndex !== index) setDropTargetIndex(index);
                      },
                      onDrop: (e: any) => {
                        e.preventDefault();
                        const fromStr = e?.dataTransfer?.getData('text/plain');
                        const fromIdx = fromStr ? parseInt(fromStr, 10) : draggedIndex;
                        if (fromIdx !== null && fromIdx !== undefined && !isNaN(fromIdx)) {
                          handleDropReorder(fromIdx, index);
                        }
                        setDraggedIndex(null);
                        setDropTargetIndex(null);
                      },
                      onDragEnd: () => {
                        setDraggedIndex(null);
                        setDropTargetIndex(null);
                      },
                    } as any : {})}
                    activeOpacity={0.7}
                  >
                    <IconComponent
                      size={22}
                      color={isActive ? colors.accent : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.bottomNavLabel,
                        { color: isActive ? colors.accent : colors.textMuted },
                        isActive && styles.bottomNavLabelActive
                      ]}
                      numberOfLines={2}
                    >
                      {item.shortName || item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* 5th Tab: More (Opens full menu of remaining destinations without duplicating Settings) */}
              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => setIsMoreOpen(true)}
                activeOpacity={0.7}
                accessibilityLabel="More Navigation Sections"
              >
                <Menu
                  size={22}
                  color={isMoreActive ? colors.accent : colors.textMuted}
                />
                <Text style={[
                  styles.bottomNavLabel,
                  { color: isMoreActive ? colors.accent : colors.textMuted },
                  isMoreActive && styles.bottomNavLabelActive
                ]}>
                  More
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </View>

      {/* Mobile "More" Sections Drawer / Sheet - Instant, No Animation */}
      <Modal visible={isMoreOpen} transparent animationType="none" onRequestClose={() => setIsMoreOpen(false)}>
        <TouchableOpacity 
          style={styles.moreOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMoreOpen(false)}
        >
          <View 
            style={[styles.moreSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.moreHeader, { borderBottomColor: colors.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moreSheetTitle, { color: colors.textPrimary }]}>More Sections</Text>
                <Text style={[styles.moreSheetSub, { color: colors.textMuted }]}>
                  All available sections in CPALE Tracker
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsMoreOpen(false)} 
                style={[styles.moreCloseBtn, { backgroundColor: colors.backgroundSoft }]}
                accessibilityLabel="Close Navigation Menu"
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 6, paddingVertical: 8 }}>
                {navItems.slice(4).map((item, sliceIdx) => {
                  const actualIdx = sliceIdx + 4;
                  const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                  const IconComponent = item.icon;
                  const isDragging = draggedIndex === actualIdx;
                  const isDropTarget = dropTargetIndex === actualIdx && draggedIndex !== actualIdx;

                  return (
                    <TouchableOpacity
                      key={item.path}
                      style={[
                        styles.moreSheetItem,
                        { backgroundColor: isActive ? colors.accentLight : colors.backgroundSoft, borderColor: colors.border },
                        isActive && { borderColor: colors.accent },
                        isDragging && { opacity: 0.5, borderColor: colors.accent, borderWidth: 1.5 },
                        isDropTarget && { borderTopWidth: 3, borderTopColor: colors.accent },
                      ]}
                      onPress={() => {
                        if (draggedIndex !== null && draggedIndex !== actualIdx) {
                          handleDropReorder(draggedIndex, actualIdx);
                        } else {
                          setIsMoreOpen(false);
                          router.push(item.path as any);
                        }
                      }}
                      onLongPress={() => {
                        setDraggedIndex(actualIdx);
                      }}
                      delayLongPress={250}
                      {...(Platform.OS === 'web' ? {
                        draggable: true,
                        onDragStart: (e: any) => {
                          if (e?.dataTransfer) {
                            e.dataTransfer.setData('text/plain', String(actualIdx));
                            e.dataTransfer.effectAllowed = 'move';
                          }
                          setDraggedIndex(actualIdx);
                        },
                        onDragOver: (e: any) => {
                          e.preventDefault();
                          if (dropTargetIndex !== actualIdx) setDropTargetIndex(actualIdx);
                        },
                        onDrop: (e: any) => {
                          e.preventDefault();
                          const fromStr = e?.dataTransfer?.getData('text/plain');
                          const fromIdx = fromStr ? parseInt(fromStr, 10) : draggedIndex;
                          if (fromIdx !== null && fromIdx !== undefined && !isNaN(fromIdx)) {
                            handleDropReorder(fromIdx, actualIdx);
                          }
                          setDraggedIndex(null);
                          setDropTargetIndex(null);
                        },
                        onDragEnd: () => {
                          setDraggedIndex(null);
                          setDropTargetIndex(null);
                        },
                      } as any : {})}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.moreItemIcon, { backgroundColor: isActive ? colors.accent : colors.surfaceElevated }]}>
                        <IconComponent size={18} color={isActive ? '#FFFFFF' : colors.textPrimary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                        <Text style={[styles.moreItemTitle, { color: isActive ? colors.accent : colors.textPrimary }, isActive && { fontWeight: '700' }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.moreItemSub, { color: colors.textMuted }]}>
                          {item.path}
                        </Text>
                      </View>
                      <View style={[styles.dragHintGrip, { flexShrink: 0 }]}>
                        <GripVertical size={16} color={colors.textLight} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  rootContainer: {
    flex: 1,
  },
  rowContainer: {
    flexDirection: 'row',
  },
  colContainer: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 250,
    borderRightWidth: 1,
    paddingVertical: AcademicTheme.spacing.lg,
    paddingHorizontal: AcademicTheme.spacing.md,
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: AcademicTheme.spacing.xl,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: AcademicTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  logoBadgeText: {
    fontWeight: AcademicTheme.typography.weights.bold,
    fontSize: 14,
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: AcademicTheme.typography.sizes.lg,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  brandSubtitle: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    lineHeight: 20,
    flexShrink: 1,
  },
  reorderNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarNav: {
    flex: 1,
  },
  sidebarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.md,
    marginBottom: 4,
  },
  sidebarLinkText: {
    marginLeft: 12,
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.medium,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  sidebarLinkTextActive: {
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  sidebarFooter: {
    paddingTop: AcademicTheme.spacing.md,
    borderTopWidth: 1,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: AcademicTheme.borderRadius.full,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
    flexShrink: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AcademicTheme.spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 52,
    width: '100%',
    gap: 8,
  },
  mobileBrandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 4,
    minWidth: 0,
  },
  mobileLogoBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mobileLogoBadgeImage: {
    width: 30,
    height: 30,
    borderRadius: 6,
    marginRight: 8,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  mobileLogoBadgeText: {
    fontSize: 12,
    fontWeight: AcademicTheme.typography.weights.bold,
    letterSpacing: 0.5,
  },
  mobileBrandTitle: {
    fontSize: 17,
    fontWeight: AcademicTheme.typography.weights.bold,
    flexShrink: 1,
  },
  mobileProfileContainer: {
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 0,
    maxWidth: '48%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mobileProfilePill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    maxWidth: '100%',
  },
  mobileAvatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  mobileGreetingText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
    flexShrink: 1,
    lineHeight: 18,
  },
  mobileHeaderBtn: {
    padding: 6,
    borderRadius: AcademicTheme.borderRadius.sm,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    width: '100%',
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  bottomNavLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: AcademicTheme.typography.weights.medium,
    textAlign: 'center',
    lineHeight: 15,
    width: '100%',
  },
  bottomNavLabelActive: {
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  floatingTimer: {
    position: 'absolute',
    bottom: 64,
    left: 16,
    right: 16,
    borderRadius: AcademicTheme.borderRadius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    ...AcademicTheme.shadows.elevated,
  },
  timerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  timerTitle: {
    color: '#FFF',
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
    lineHeight: 20,
    flexShrink: 1,
  },
  timerTime: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  timerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropIndicatorLine: {
    height: 3,
    borderRadius: 1.5,
    marginVertical: 2,
    width: '100%',
  },
  moreOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  moreSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 16,
    maxHeight: '80%',
  },
  moreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  moreSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  moreSheetSub: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 2,
    lineHeight: 20,
  },
  moreCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  moreItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  moreItemSub: {
    fontSize: AcademicTheme.typography.sizes.sm,
    marginTop: 1,
    flexShrink: 1,
  },
  dragHintGrip: {
    padding: 4,
  },
});

