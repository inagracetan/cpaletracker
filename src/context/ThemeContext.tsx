import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeTokens, LightTokens, DarkTokens } from '../constants/theme';
import { useApp } from './AppContext';

interface ThemeContextType {
  colors: ThemeTokens;
  theme: ThemeTokens;
  isDark: boolean;
  themePreference: 'system' | 'light' | 'dark';
  setThemePreference: (pref: 'system' | 'light' | 'dark') => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: LightTokens,
  theme: LightTokens,
  isDark: false,
  themePreference: 'system',
  setThemePreference: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { state, updatePreferences } = useApp();

  const themePreference = state.preferences.theme || 'system';

  const isDark = useMemo(() => {
    if (themePreference === 'dark') return true;
    if (themePreference === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themePreference, systemColorScheme]);

  const colors = useMemo(() => {
    return isDark ? DarkTokens : LightTokens;
  }, [isDark]);

  const setThemePreference = useCallback(async (pref: 'system' | 'light' | 'dark') => {
    await updatePreferences({ theme: pref });
  }, [updatePreferences]);

  const value = useMemo(() => ({
    colors,
    theme: colors,
    isDark,
    themePreference,
    setThemePreference,
  }), [colors, isDark, themePreference, setThemePreference]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
