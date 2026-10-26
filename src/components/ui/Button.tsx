import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'accent' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconOnly?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title = '',
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconOnly = false,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.primary };
      case 'accent':
        return { backgroundColor: colors.accent };
      case 'gold':
        return { backgroundColor: '#F59E0B' };
      case 'secondary':
        return { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'danger':
        return { backgroundColor: colors.danger };
      case 'success':
        return { backgroundColor: colors.success };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
      case 'accent':
        return { color: '#FFFFFF' };
      case 'gold':
        return { color: '#FFFFFF' };
      case 'secondary':
        return { color: colors.textPrimary };
      case 'outline':
        return { color: colors.accent };
      case 'ghost':
        return { color: colors.textSecondary };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    if (iconOnly) {
      switch (size) {
        case 'sm':
          return styles.iconOnlySm;
        case 'lg':
          return styles.iconOnlyLg;
        default:
          return styles.iconOnlyMd;
      }
    }
    switch (size) {
      case 'sm':
        return styles.smSize;
      case 'lg':
        return styles.lgSize;
      default:
        return styles.mdSize;
    }
  };

  const showLabel = Boolean(title) && !iconOnly;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      {...({ title: accessibilityLabel || title } as any)}
      style={[
        styles.base,
        getContainerStyle(),
        getSizeStyle(),
        disabled && styles.disabledBtn,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? colors.accent : '#FFF'} />
      ) : (
        <>
          {icon && <>{icon}</>}
          {showLabel ? (
            <Text
              style={[
                styles.baseText,
                getTextStyle(),
                textStyle,
                icon ? { marginLeft: 7 } : undefined,
                { flexShrink: 1 },
              ]}
            >
              {title}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AcademicTheme.borderRadius.lg,
    maxWidth: '100%',
  },
  baseText: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.semibold,
    textAlign: 'center',
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  smSize: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  mdSize: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    minHeight: 44,
  },
  lgSize: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  iconOnlySm: {
    width: 36,
    minWidth: 36,
    height: 36,
    minHeight: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnlyMd: {
    width: 44,
    minWidth: 44,
    height: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnlyLg: {
    width: 52,
    minWidth: 52,
    height: 52,
    minHeight: 52,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.45,
  },
});
