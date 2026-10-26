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
  MoreHorizontal,
  User,
  ChevronRight,
} from 'lucide-react-native';
import { AchievementToast } from '../achievements/AchievementToast';
import { selectHeaderLogo } from '../../utils/logoContrast';

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

  const logoSrc = selectHeaderLogo({ isDark, isDesktop });

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AchievementToast />
      <View style={[styles.rootContainer, { backgroundColor: colors.background }, isDesktop ? styles.rowContainer : styles.colContainer]}>
        
        {/* ───── Desktop Sidebar ───── */}
        {isDesktop && (
          <View style={[styles.sidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
            {/* Branding */}
            <View style={styles.brandContainer}>
              <Image
                key={`desktop-logo-${logoSrc}`}
                source={{ uri: logoSrc }}
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

            {/* Navigation Links with Drag & Drop */}
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
                      {/* Active indicator stripe */}
                      {isActive && (
                        <View style={[styles.sidebarActiveStripe, { backgroundColor: colors.accent }]} />
                      )}
                      <IconComponent
                        size={18}
                        color={isActive ? colors.accent : colors.textMuted}
                      />
                      <Text style={[
                        styles.sidebarLinkText,
                        { color: isActive ? colors.accent : colors.textSecondary },
                        isActive && styles.sidebarLinkTextActive
                      ]}>
                        {item.name}
                      </Text>
                      {isActive && (
                        <ChevronRight size={14} color={colors.accent} style={{ marginLeft: 'auto' }} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Sync Status Badge in Sidebar Footer */}
            <View style={[styles.sidebarFooter, { borderTopColor: colors.borderLight }]}>
              <View style={[styles.syncPill, { backgroundColor: colors.accentLight, borderColor: colors.border, borderWidth: 1 }]}>
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

        {/* ───── Main Content Area ───── */}
        <View style={[styles.mainContent, { backgroundColor: colors.background }]}>
          {/* Mobile Header — Gradient */}
          {!isDesktop && (
            <View style={styles.mobileHeader}>
              {/* Blue gradient background */}
              <View style={[styles.mobileHeaderGradient, { backgroundColor: colors.primary }]} />
              {/* Brand on left */}
              <View style={styles.mobileBrandGroup}>
                <Image
                  key={`mobile-logo-${logoSrc}`}
                  source={{ uri: logoSrc }}
                  style={styles.mobileLogoBadgeImage}
                  accessibilityLabel="CPALE Tracker logo"
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.mobileBrandTitle}>CPALE Tracker</Text>
                  <Text style={styles.mobileBrandSubtitle}>Plan · Practice · Pass</Text>
                </View>
              </View>

              {/* Profile Pill */}
              <View
                style={styles.mobileProfileContainer}
                accessibilityRole="header"
                accessibilityLabel={`Logged in user: ${state.userProfile.nickname || 'Future CPA'}`}
              >
                <View style={styles.mobileProfilePill}>
                  <View style={styles.mobileAvatarCircle}>
                    <User size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.mobileGreetingText} numberOfLines={1}>
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

          {/* Floating Study Timer Banner */}
          {(activeTimer.isRunning || activeTimer.elapsedSeconds > 0) && (
            <View style={[styles.floatingTimer, { backgroundColor: isDark ? colors.cardElevated : '#1E3A8A' }]}>
              <View style={styles.timerInfo}>
                <Clock size={18} color="#60A5FA" style={{ flexShrink: 0 }} />
                <View style={{ marginLeft: 8, flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={styles.timerTitle}>
                    {activeTimer.topicTitle || 'Review Session'}
                  </Text>
                  <Text style={[styles.timerTime, { color: '#60A5FA' }]}>{formatTimerTime(activeTimer.elapsedSeconds)}</Text>
                </View>
              </View>
              <View style={styles.timerControls}>
                {activeTimer.isRunning ? (
                  <TouchableOpacity style={[styles.timerBtn, { backgroundColor: '#3B82F6' }]} onPress={pauseTimer}>
                    <Pause size={16} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.timerBtn, { backgroundColor: '#3B82F6' }]} onPress={resumeTimer}>
                    <Play size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.timerBtn, { backgroundColor: colors.success, marginLeft: 8 }]}
                  onPress={() => stopTimer(activeTimer.topicId)}
                >
                  <Square size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ───── Mobile Bottom Navigation Bar ───── */}
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
                    {/* Active dot indicator */}
                    <View style={[styles.bottomNavDot, isActive && { backgroundColor: colors.accent }]} />
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
                      numberOfLines={1}
                    >
                      {item.shortName || item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* 5th Tab: More */}
              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => setIsMoreOpen(true)}
                activeOpacity={0.7}
                accessibilityLabel="More Navigation Sections"
              >
                <View style={[styles.bottomNavDot, isMoreActive && { backgroundColor: colors.accent }]} />
                <MoreHorizontal
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

      {/* ───── Mobile "More" Bottom Sheet ───── */}
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
            {/* Sheet handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            
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
                        { backgroundColor: isActive ? colors.accentLight : colors.backgroundSoft, borderColor: isActive ? colors.accent : colors.border },
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
                      <View style={[
                        styles.moreItemIcon,
                        { backgroundColor: isActive ? colors.accent : colors.accentLight }
                      ]}>
                        <IconComponent size={18} color={isActive ? '#FFFFFF' : colors.accent} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                        <Text style={[styles.moreItemTitle, { color: isActive ? colors.accent : colors.textPrimary }, isActive && { fontWeight: '700' }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.moreItemSub, { color: colors.textMuted }]}>
                          Tap to navigate
                        </Text>
                      </View>
                      <ChevronRight size={16} color={colors.textMuted} />
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

  // ───── Sidebar (Desktop) ─────
  sidebar: {
    width: 256,
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
    paddingBottom: AcademicTheme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,232,240,0.7)',
  },
  logoBadgeImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.bold,
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: AcademicTheme.typography.sizes.xs,
    marginTop: 2,
    lineHeight: 18,
    flexShrink: 1,
  },
  sidebarNav: {
    flex: 1,
  },
  sidebarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: AcademicTheme.borderRadius.md,
    marginBottom: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  sidebarActiveStripe: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
  },
  sidebarLinkText: {
    marginLeft: 10,
    fontSize: AcademicTheme.typography.sizes.sm,
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
    marginTop: 8,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  syncText: {
    fontSize: AcademicTheme.typography.sizes.xs,
    fontWeight: AcademicTheme.typography.weights.medium,
    flexShrink: 1,
  },

  // ───── Main Content ─────
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

  // ───── Mobile Header ─────
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 58,
    width: '100%',
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  mobileHeaderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // We set backgroundColor dynamically; CSS gradient applied via style prop on web
  },
  mobileBrandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
    minWidth: 0,
  },
  mobileLogoBadgeImage: {
    width: 38,
    height: 38,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  mobileBrandTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    flexShrink: 1,
    lineHeight: 20,
  },
  mobileBrandSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500' as const,
    lineHeight: 15,
  },
  mobileProfileContainer: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mobileProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  mobileAvatarCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  mobileGreetingText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    flexShrink: 1,
    maxWidth: 100,
  },

  // ───── Bottom Navigation ─────
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    width: '100%',
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  bottomNavDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  bottomNavLabel: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: AcademicTheme.typography.weights.medium,
    textAlign: 'center',
    lineHeight: 14,
    width: '100%',
  },
  bottomNavLabelActive: {
    fontWeight: AcademicTheme.typography.weights.bold,
  },

  // ───── Floating Timer ─────
  floatingTimer: {
    position: 'absolute',
    bottom: 68,
    left: 12,
    right: 12,
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
    color: '#E2E8F0',
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

  // ───── Drop Indicator ─────
  dropIndicatorLine: {
    height: 2,
    borderRadius: 1,
    marginVertical: 2,
    width: '100%',
  },

  // ───── More Sheet ─────
  moreOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  moreSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 16,
    paddingTop: 12,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  moreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  moreSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  moreSheetSub: {
    fontSize: AcademicTheme.typography.sizes.xs,
    marginTop: 2,
    lineHeight: 18,
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
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  moreItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  moreItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  moreItemSub: {
    fontSize: 12,
    marginTop: 1,
    flexShrink: 1,
  },
});
