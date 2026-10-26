import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface PageTabBarProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabPress: (key: T) => void;
  /** Show first tab filled (navy), rest outlined. Default: true */
  firstTabFilled?: boolean;
  /** Horizontal scroll on desktop; ignored when stackFirstOnMobile is active on narrow screens */
  scrollable?: boolean;
  /**
   * On mobile: first tab full-width on its own row; remaining tabs wrap below.
   * Prevents horizontal scrolling for long assessment labels.
   */
  stackFirstOnMobile?: boolean;
}

/**
 * Page tab bar styled to match Checklist & Calendar filter chips.
 */
export function PageTabBar<T extends string>({
  tabs,
  activeTab,
  onTabPress,
  scrollable = true,
  stackFirstOnMobile = false,
}: PageTabBarProps<T>) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const renderTab = (tab: TabItem<T>, opts?: { fullWidth?: boolean; allowWrap?: boolean }) => {
    const isActive = tab.key === activeTab;
    const fullWidth = opts?.fullWidth;
    const allowWrap = opts?.allowWrap;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.tab,
          fullWidth && styles.tabFullWidth,
          {
            backgroundColor: isActive
              ? (isDark ? colors.cardElevated : colors.backgroundSoft)
              : colors.card,
            borderColor: isActive ? colors.accent : colors.border,
            borderWidth: isActive ? 1.5 : 1,
          },
        ]}
        onPress={() => onTabPress(tab.key)}
        activeOpacity={0.75}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        {tab.icon && (
          <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
            {tab.icon}
          </View>
        )}
        <Text
          style={[
            styles.tabLabel,
            fullWidth && styles.tabLabelCentered,
            {
              color: isActive ? colors.accent : colors.textSecondary,
              fontWeight: isActive ? '700' : '600',
            },
          ]}
          numberOfLines={allowWrap ? 2 : 1}
        >
          {tab.label}
        </Text>
        {tab.count !== undefined && (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: isActive
                  ? colors.accentLight
                  : isDark
                    ? colors.backgroundSubtle
                    : '#F1F5F9',
              },
            ]}
          >
            <Text style={[styles.countText, { color: isActive ? colors.accent : colors.textMuted }]}>
              {tab.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Mobile stacked layout: first tab on top, rest wrapping below
  if (stackFirstOnMobile && isMobile && tabs.length > 0) {
    const [first, ...rest] = tabs;
    return (
      <View style={styles.stackContainer}>
        {renderTab(first, { fullWidth: true, allowWrap: true })}
        {rest.length > 0 && (
          <View style={styles.wrapRow}>
            {rest.map((tab) => renderTab(tab, { allowWrap: true }))}
          </View>
        )}
      </View>
    );
  }

  if (scrollable && !isMobile) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollContainer}
      >
        {tabs.map((tab) => renderTab(tab))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.rowContainer}>
      {tabs.map((tab) => renderTab(tab, { allowWrap: isMobile }))}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    marginBottom: 14,
    maxWidth: '100%',
  },
  scrollContent: {
    gap: 6,
    paddingBottom: 2,
    alignItems: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
    width: '100%',
    maxWidth: '100%',
  },
  stackContainer: {
    width: '100%',
    maxWidth: '100%',
    gap: 6,
    marginBottom: 14,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: AcademicTheme.borderRadius.full,
    gap: 6,
    minHeight: 36,
    flexShrink: 1,
    maxWidth: '100%',
  },
  tabFullWidth: {
    width: '100%',
    flexShrink: 0,
  },
  tabIconWrap: {
    opacity: 0.7,
    flexShrink: 0,
  },
  tabIconWrapActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: AcademicTheme.typography.sizes.sm,
    lineHeight: 18,
    flexShrink: 1,
  },
  tabLabelCentered: {
    textAlign: 'center',
  },
  countBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    flexShrink: 0,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});
