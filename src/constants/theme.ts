export interface ThemeTokens {
  // Brand Core
  primary: string;             // Deep Navy Blue #1E3A8A
  primaryForeground: string;   // White #FFFFFF
  accent: string;              // Royal Blue #3B82F6
  accentForeground: string;    // Clean contrast text #FFFFFF
  accentHover: string;
  accentLight: string;
  accentSubtle: string;

  // Backgrounds
  background: string;          // Main app background
  backgroundSoft: string;      // Slightly elevated / softer background
  backgroundSubtle: string;    // Inner section / alternate row background
  card: string;                // Card surface
  cardElevated: string;        // Modals / dropdowns / popovers
  surface: string;             // Component surface / card
  surfaceElevated: string;     // Modals / popovers / elevated surface
  cardBorder: string;          // Card border
  cardHover: string;           // Hover / pressed state

  // Text
  textPrimary: string;         // High-contrast primary text
  textSecondary: string;       // Secondary body text
  textMuted: string;           // Muted captions / subtext
  textLight: string;           // Subtle hint / disabled text

  // Functional State Colors
  success: string;             // Green for completed work
  successLight: string;
  successBorder: string;
  successText: string;

  warning: string;             // Amber-free slate for attention
  warningLight: string;
  warningBorder: string;
  warningText: string;

  danger: string;              // Red for overdue / urgent
  dangerLight: string;
  dangerBorder: string;
  dangerText: string;
  error: string;

  info: string;                // Blue for informational tags
  infoLight: string;
  infoBorder: string;
  infoText: string;

  // Focus Ring
  focusRing: string;

  // Subject Badges
  subjectFAR: string;
  subjectAFAR: string;
  subjectMS: string;
  subjectTAX: string;
  subjectAUD: string;
  subjectRFBT: string;

  // Form Controls & Inputs
  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;

  // Neutral UI
  border: string;
  borderLight: string;
  divider: string;
  disabled: string;
  disabledBg: string;

  // Gradients
  gradients: ThemeGradients;

  // Charts
  chartGrid: string;
  chartLabel: string;
  chartAxis: string;
}

export interface ThemeGradients {
  hero: string[];
  heroCss: string;
  progressFill: string[];
  progressFillCss: string;
  cardSurface: string[];
  cardSurfaceCss: string;
  achievement: string[];
  achievementCss: string;
}

export const LightTokens: ThemeTokens = {
  // Brand Core — Blue-White Identity
  primary: '#1E3A8A',             // Deep Navy Blue
  primaryForeground: '#FFFFFF',
  accent: '#3B82F6',              // Royal/Accent Blue
  accentForeground: '#FFFFFF',
  accentHover: '#2563EB',
  accentLight: '#EEF2FF',         // Very light blue tint
  accentSubtle: '#DBEAFE',

  // Backgrounds
  background: '#F8FAFC',          // Clean off-white
  backgroundSoft: '#F1F5F9',      // Slightly elevated
  backgroundSubtle: '#E2E8F0',
  card: '#FFFFFF',                // Pure white card
  cardElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  cardBorder: '#E2E8F0',          // Light slate border
  cardHover: '#F1F5F9',

  // Text — High Contrast WCAG AA+ compliant
  textPrimary: '#0F172A',         // Deep slate
  textSecondary: '#334155',       // Readable secondary
  textMuted: '#64748B',           // Slate muted
  textLight: '#94A3B8',

  // Functional State Colors
  success: '#059669',             // Emerald green
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#065F46',

  warning: '#D97706',             // Amber
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',

  danger: '#DC2626',              // Red
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#991B1B',
  error: '#DC2626',

  info: '#1E3A8A',                // Navy for informational
  infoLight: '#EEF2FF',
  infoBorder: '#BFDBFE',
  infoText: '#1E40AF',

  // Focus Ring
  focusRing: '#3B82F6',

  // Subject Badges — vibrant but harmonious
  subjectFAR: '#2563EB',          // Blue
  subjectAFAR: '#7C3AED',         // Violet
  subjectMS: '#0D9488',           // Teal
  subjectTAX: '#0284C7',          // Sky blue
  subjectAUD: '#059669',          // Emerald
  subjectRFBT: '#BE185D',         // Pink

  // Form Controls
  inputBackground: '#FFFFFF',
  inputBorder: '#CBD5E1',
  inputPlaceholder: '#94A3B8',

  // Neutral UI
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',
  disabled: '#94A3B8',
  disabledBg: '#F1F5F9',

  // Gradients
  gradients: {
    hero: ['#1E3A8A', '#1E40AF'],
    heroCss: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
    progressFill: ['#1E3A8A', '#3B82F6'],
    progressFillCss: 'linear-gradient(90deg, #1E3A8A 0%, #3B82F6 100%)',
    cardSurface: ['#FFFFFF', '#F8FAFC'],
    cardSurfaceCss: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
    achievement: ['#1E3A8A', '#1D4ED8'],
    achievementCss: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',
  },

  // Charts
  chartGrid: '#E2E8F0',
  chartLabel: '#334155',
  chartAxis: '#64748B',
};

export const DarkTokens: ThemeTokens = {
  // Brand Core — Dark mode Blue
  primary: '#3B82F6',             // Accent blue becomes primary in dark
  primaryForeground: '#FFFFFF',
  accent: '#60A5FA',              // Lighter blue for dark mode
  accentForeground: '#FFFFFF',
  accentHover: '#93C5FD',
  accentLight: '#1E3A5F',         // Dark blue surface
  accentSubtle: '#1E3057',

  // Backgrounds
  background: '#0F172A',          // Deep navy dark
  backgroundSoft: '#1E293B',      // Slightly lighter
  backgroundSubtle: '#1E293B',
  card: '#1E293B',                // Dark card
  cardElevated: '#293548',        // Elevated dark surface
  surface: '#1E293B',
  surfaceElevated: '#293548',
  cardBorder: '#334155',          // Dark border
  cardHover: '#293548',

  // Text
  textPrimary: '#F1F5F9',         // Near white
  textSecondary: '#CBD5E1',       // Light slate
  textMuted: '#94A3B8',
  textLight: '#64748B',

  // Functional State Colors
  success: '#34D399',             // Emerald (bright)
  successLight: '#064E3B',
  successBorder: '#065F46',
  successText: '#A7F3D0',

  warning: '#FBBF24',             // Amber (bright)
  warningLight: '#451A03',
  warningBorder: '#78350F',
  warningText: '#FDE68A',

  danger: '#F87171',              // Red (bright)
  dangerLight: '#450A0A',
  dangerBorder: '#7F1D1D',
  dangerText: '#FECACA',
  error: '#F87171',

  info: '#60A5FA',
  infoLight: '#1E3A5F',
  infoBorder: '#1D4ED8',
  infoText: '#BFDBFE',

  // Focus Ring
  focusRing: '#60A5FA',

  // Subject Badges — bright for dark mode
  subjectFAR: '#60A5FA',          // Blue
  subjectAFAR: '#A78BFA',         // Violet
  subjectMS: '#2DD4BF',           // Teal
  subjectTAX: '#38BDF8',          // Sky blue
  subjectAUD: '#34D399',          // Emerald
  subjectRFBT: '#F472B6',         // Pink

  // Form Controls
  inputBackground: '#1E293B',
  inputBorder: '#334155',
  inputPlaceholder: '#64748B',

  // Neutral UI
  border: '#334155',
  borderLight: '#293548',
  divider: '#334155',
  disabled: '#64748B',
  disabledBg: '#1E293B',

  // Gradients
  gradients: {
    hero: ['#1E3A8A', '#1E40AF'],
    heroCss: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',
    progressFill: ['#3B82F6', '#60A5FA'],
    progressFillCss: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
    cardSurface: ['#1E293B', '#162032'],
    cardSurfaceCss: 'linear-gradient(180deg, #1E293B 0%, #162032 100%)',
    achievement: ['#1E3A8A', '#1D4ED8'],
    achievementCss: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',
  },

  // Charts
  chartGrid: '#293548',
  chartLabel: '#CBD5E1',
  chartAxis: '#64748B',
};

export const AcademicTheme = {
  colors: LightTokens,
  darkColors: DarkTokens,

  typography: {
    fontFamily: 'System',
    // Readable scale: body/controls ~16, supporting ≥14, captions ≥13
    sizes: {
      xs: 13,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 22,
      xxl: 26,
      title: 30,
      display: 36,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.65,
    }
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    section: 32,
  },

  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
  },

  shadows: {
    subtle: {
      shadowColor: '#1E3A8A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    card: {
      shadowColor: '#1E3A8A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    elevated: {
      shadowColor: '#1E3A8A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 4,
    },
  }
};

export const Colors = {
  light: {
    text: LightTokens.textPrimary,
    background: LightTokens.background,
    tint: LightTokens.accent,
    icon: LightTokens.textSecondary,
    tabIconDefault: LightTokens.textMuted,
    tabIconSelected: LightTokens.accent,
    backgroundElement: LightTokens.card,
  },
  dark: {
    text: DarkTokens.textPrimary,
    background: DarkTokens.background,
    tint: DarkTokens.accent,
    icon: DarkTokens.textSecondary,
    tabIconDefault: DarkTokens.textMuted,
    tabIconSelected: DarkTokens.accent,
    backgroundElement: DarkTokens.card,
  }
};
