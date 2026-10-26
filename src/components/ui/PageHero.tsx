import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface PageHeroProps {
  title: string;
  subtitle: string;
  /** Optional top-right action (e.g. Add button) — stays non-shrinking */
  action?: React.ReactNode;
  /** @deprecated Decorative left icons are no longer shown */
  icon?: React.ReactNode;
  /** @deprecated Right illustrations omitted for consistent title cards */
  illustration?: React.ReactNode;
  /** Override background color */
  backgroundColor?: string;
}

/**
 * Shared page title card — used across all content pages.
 * Title + subtitle on the left; optional action on the right.
 */
export const PageHero: React.FC<PageHeroProps> = ({
  title,
  subtitle,
  action,
  backgroundColor,
}) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;

  const heroBg = backgroundColor ?? (isDark ? colors.card : '#FFFFFF');

  return (
    <View style={[styles.heroCard, { backgroundColor: heroBg, borderColor: isDark ? colors.border : '#E8EDFB' }]}>
      <View style={styles.heroContent}>
        <View style={styles.textGroup}>
          <Text
            style={[styles.heroTitle, { color: colors.textPrimary }, isNarrow && styles.heroTitleNarrow]}
          >
            {title}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>

        {action ? (
          <View style={styles.actionWrap}>
            {action}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: AcademicTheme.borderRadius.xl,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
    width: '100%',
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 4,
    flexShrink: 1,
  },
  heroTitleNarrow: {
    fontSize: 18,
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
    flexShrink: 1,
  },
  actionWrap: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
});
