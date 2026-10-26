/**
 * Header logo selection for CPALE Tracker.
 *
 * Source of truth (web static files, lowercase paths for Linux/Vercel):
 * - /cpabg.png   → public/cpabg.png   (brighter / white letterforms)
 * - /cpadark.png → public/cpadark.png (darker letterforms)
 *
 * Exact mapping:
 * | Screen   | Light mode   | Dark mode    |
 * | Desktop  | cpadark.png  | cpabg.png    |
 * | Mobile   | cpabg.png    | cpadark.png  |
 */

export type LogoAsset = '/cpabg.png' | '/cpadark.png';

export interface SelectHeaderLogoOptions {
  isDark: boolean;
  /** Same breakpoint as ResponsiveLayout (`width >= 768`). */
  isDesktop: boolean;
}

/**
 * Select the logo from live theme + viewport breakpoint only.
 */
export function selectHeaderLogo(options: SelectHeaderLogoOptions): LogoAsset {
  const { isDark, isDesktop } = options;

  if (isDesktop) {
    return isDark ? '/cpabg.png' : '/cpadark.png';
  }

  // Mobile
  return isDark ? '/cpadark.png' : '/cpabg.png';
}

/** @deprecated Prefer selectHeaderLogo with an explicit isDesktop flag */
export function getThemeLogoSrc(isDark: boolean): LogoAsset {
  return selectHeaderLogo({ isDark, isDesktop: true });
}
