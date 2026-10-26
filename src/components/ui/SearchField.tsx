import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  showClear?: boolean;
  accessibilityLabel?: string;
}

/**
 * Shared search input with icon spacing that never overlaps typed text.
 * Uses content-driven height (minHeight) so OS text scaling does not clip.
 */
export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder = 'Search…',
  style,
  inputStyle,
  showClear = true,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const hasClear = showClear && value.length > 0;

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.iconSlot} accessible={false}>
        <Search size={16} color={colors.textMuted} />
      </View>
      <TextInput
        style={[styles.input, { color: colors.textPrimary }, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel || placeholder}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />
      {hasClear ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={styles.clearBtn}
          accessibilityLabel="Clear search"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    paddingLeft: 10,
    paddingRight: 6,
    minHeight: 44,
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
  },
  iconSlot: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 6,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 0,
    fontSize: AcademicTheme.typography.sizes.md,
    lineHeight: 22,
  },
  clearBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
