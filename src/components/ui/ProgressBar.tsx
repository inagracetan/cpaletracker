import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  height = 8,
  style,
}) => {
  const { colors } = useTheme();
  const isCustomColor = Boolean(color);
  const fillColor = color || colors.accent;
  const clamped = Math.max(0, Math.min(100, isNaN(progress) ? 0 : progress));

  return (
    <View style={[styles.container, { height, backgroundColor: colors.backgroundSubtle }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: fillColor,
            height,
          },
          !isCustomColor && {
            // @ts-ignore Web gradient support
            backgroundImage: colors.gradients?.progressFillCss,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: AcademicTheme.borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: AcademicTheme.borderRadius.full,
  },
});
