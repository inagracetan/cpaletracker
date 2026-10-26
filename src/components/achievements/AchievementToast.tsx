import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Trophy } from 'lucide-react-native';

const VISIBLE_MS = 3000;
const FADE_OUT_MS = 400;

export const AchievementToast: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { achievementNotifications, dismissAchievementNotification } = useApp();
  const dismissedRef = useRef<Set<string>>(new Set());
  const opacity = useRef(new Animated.Value(0)).current;

  const current = achievementNotifications[0];

  useEffect(() => {
    if (!current) {
      opacity.setValue(0);
      return;
    }
    if (dismissedRef.current.has(current.id)) {
      dismissAchievementNotification(current.id);
      return;
    }

    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    const dismissTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          dismissedRef.current.add(current.id);
          dismissAchievementNotification(current.id);
        }
      });
    }, VISIBLE_MS);

    return () => clearTimeout(dismissTimer);
  }, [current, dismissAchievementNotification, opacity]);

  if (!current) return null;

  return (
    <View
      pointerEvents="none"
      style={styles.overlay}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Achievement unlocked: ${current.badgeName}. ${current.description}`}
    >
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: isDark ? colors.cardElevated : '#FFFFFF',
            borderColor: colors.accent,
            shadowColor: '#000',
            opacity,
          },
        ]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: colors.accentLight }]}>
          <Trophy size={18} color={colors.accent} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.heading, { color: colors.accent }]}>Achievement Unlocked</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {current.badgeName}
          </Text>
          {current.description ? (
            <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
              {current.description}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'web' ? 72 : 56,
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: 340,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: AcademicTheme.borderRadius.lg,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    gap: 10,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  heading: {
    fontSize: 11,
    fontWeight: AcademicTheme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 14,
    fontWeight: AcademicTheme.typography.weights.bold,
    marginTop: 2,
    lineHeight: 18,
  },
  desc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
