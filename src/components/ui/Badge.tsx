import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { SUBJECTS_META } from '../../constants/subjects';
import { SubjectCode } from '../../types';
import { useTheme } from '../../context/ThemeContext';

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'subject' | 'primary' | 'accent' | 'gold';
  subject?: SubjectCode;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  subject,
  size = 'md',
  style,
  textStyle,
}) => {
  const { colors, isDark } = useTheme();

  let bgColor = colors.backgroundSubtle;
  let textColor = colors.textPrimary;
  let borderColor = colors.border;

  if (variant === 'subject' && subject && SUBJECTS_META[subject]) {
    bgColor = isDark ? colors.backgroundSoft : SUBJECTS_META[subject].bgLight;
    textColor = (colors as any)[`subject${subject}`] || SUBJECTS_META[subject].color;
    borderColor = isDark ? colors.cardBorder : SUBJECTS_META[subject].border;
  } else if (variant === 'primary') {
    bgColor = isDark ? '#1E3A5F' : '#EEF2FF';
    textColor = isDark ? '#93C5FD' : colors.primary;
    borderColor = isDark ? '#1D4ED8' : '#BFDBFE';
  } else if (variant === 'accent' || (variant as any) === 'gold') {
    bgColor = colors.accentLight;
    textColor = colors.accent;
    borderColor = colors.accentSubtle;
  } else if (variant === 'success') {
    bgColor = colors.successLight;
    textColor = colors.successText;
    borderColor = colors.successBorder;
  } else if (variant === 'warning') {
    bgColor = colors.warningLight;
    textColor = colors.warningText;
    borderColor = colors.warningBorder;
  } else if (variant === 'danger') {
    bgColor = colors.dangerLight;
    textColor = colors.dangerText;
    borderColor = colors.dangerBorder;
  } else if (variant === 'info') {
    bgColor = colors.infoLight;
    textColor = colors.infoText;
    borderColor = colors.infoBorder;
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor, borderColor: borderColor },
        isSmall ? styles.smBadge : styles.mdBadge,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColor },
          isSmall ? styles.smText : styles.mdText,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: AcademicTheme.borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  smBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  mdBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: {
    fontWeight: AcademicTheme.typography.weights.semibold,
    flexShrink: 1,
  },
  smText: {
    fontSize: AcademicTheme.typography.sizes.xs,
    lineHeight: 18,
    flexShrink: 1,
  },
  mdText: {
    fontSize: AcademicTheme.typography.sizes.sm,
    lineHeight: 20,
    flexShrink: 1,
  },
});
