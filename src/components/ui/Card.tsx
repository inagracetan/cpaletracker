import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'flat' | 'accent';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: variant === 'flat' ? colors.backgroundSoft : variant === 'accent' ? colors.accentLight : colors.card,
          borderColor: variant === 'accent' ? colors.accent + '40' : colors.cardBorder,
        },
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        variant === 'accent' && styles.accentCard,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: AcademicTheme.borderRadius.lg,
    padding: AcademicTheme.spacing.lg,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  elevated: {
    ...AcademicTheme.shadows.card,
    borderWidth: 1,
  },
  outlined: {
    borderWidth: 1.5,
  },
  accentCard: {
    borderWidth: 1.5,
    ...AcademicTheme.shadows.subtle,
  },
});
