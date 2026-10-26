import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider } from '../context/AppContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ResponsiveLayout } from '../components/layout/ResponsiveLayout';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AcademicTheme } from '../constants/theme';
import { OfflineService, OfflineStatus } from '../services/offline/offlineService';
import { SupabaseService } from '../services/supabase/supabaseService';
import { WifiOff, CheckCircle2 } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

function LayoutContent() {
  const { colors, isDark } = useTheme();
  const [isOnline, setIsOnline] = React.useState(() => OfflineService.isOnline());
  const [offlineStatus, setOfflineStatus] = React.useState<OfflineStatus>(() => OfflineService.getStatus());
  const [showReadyBanner, setShowReadyBanner] = React.useState(false);
  const cloudConfigured = SupabaseService.isCloudSyncConfigured();
  const readyAnnouncedRef = React.useRef(false);

  useEffect(() => {
    const unsubNet = OfflineService.addListener(setIsOnline);
    const unsubStatus = OfflineService.addStatusListener((status) => {
      setOfflineStatus(status);
      if (status.offlineReady && !readyAnnouncedRef.current) {
        readyAnnouncedRef.current = true;
        setShowReadyBanner(true);
      }
    });
    if (typeof document !== 'undefined') {
      const styleId = 'cpale-global-responsive-reset';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body, #root {
            max-width: 100vw;
            overflow-x: hidden !important;
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
          }
          *, *:before, *:after {
            box-sizing: border-box;
          }
          p, span, label, h1, h2, h3, h4, h5, h6, li, td, th, button, a {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          input, textarea {
            min-width: 0;
            max-width: 100%;
          }
        `;
        document.head.appendChild(style);
      }
    }
    return () => {
      unsubNet();
      unsubStatus();
    };
  }, []);

  useEffect(() => {
    if (!showReadyBanner) return;
    const timer = setTimeout(() => setShowReadyBanner(false), 5000);
    return () => clearTimeout(timer);
  }, [showReadyBanner]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.surfaceElevated, borderBottomColor: colors.warningBorder }]}>
          <WifiOff size={14} color={colors.warning} style={{ flexShrink: 0 }} />
          <Text style={[styles.offlineText, { color: colors.warningText }]}>
            {offlineStatus.offlineReady
              ? `Offline Mode • Study data is saved on this device${cloudConfigured ? ' and will sync when you reconnect (if signed in)' : ''}`
              : 'Offline Mode • Limited shell available. Reconnect once so offline caching can finish.'}
          </Text>
        </View>
      )}
      {isOnline && showReadyBanner && offlineStatus.offlineReady && (
        <View
          style={[
            styles.readyBanner,
            { backgroundColor: colors.successLight, borderBottomColor: colors.successBorder },
          ]}
          accessibilityLiveRegion="polite"
        >
          <CheckCircle2 size={14} color={colors.success} style={{ flexShrink: 0 }} />
          <Text style={[styles.offlineText, { color: colors.successText }]}>
            Offline setup complete • App shell cached for this device
          </Text>
        </View>
      )}
      <ResponsiveLayout>
        <Slot />
      </ResponsiveLayout>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AppProvider>
      <ThemeProvider>
        <LayoutContent />
      </ThemeProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 8,
    zIndex: 9999,
    width: '100%',
  },
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 8,
    width: '100%',
  },
  offlineText: {
    flex: 1,
    minWidth: 0,
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: '500',
    lineHeight: 20,
  },
});
