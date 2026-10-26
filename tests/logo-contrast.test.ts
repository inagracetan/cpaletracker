import { describe, it, expect } from 'vitest';
import { selectHeaderLogo } from '../src/utils/logoContrast';

describe('selectHeaderLogo', () => {
  it('maps desktop light → cpadark.png and desktop dark → cpabg.png', () => {
    expect(selectHeaderLogo({ isDark: false, isDesktop: true })).toBe('/cpadark.png');
    expect(selectHeaderLogo({ isDark: true, isDesktop: true })).toBe('/cpabg.png');
  });

  it('maps mobile light → cpabg.png and mobile dark → cpadark.png', () => {
    expect(selectHeaderLogo({ isDark: false, isDesktop: false })).toBe('/cpabg.png');
    expect(selectHeaderLogo({ isDark: true, isDesktop: false })).toBe('/cpadark.png');
  });

  it('switches immediately when theme or breakpoint changes', () => {
    expect(selectHeaderLogo({ isDark: true, isDesktop: true })).toBe('/cpabg.png');
    expect(selectHeaderLogo({ isDark: true, isDesktop: false })).toBe('/cpadark.png');
    expect(selectHeaderLogo({ isDark: false, isDesktop: false })).toBe('/cpabg.png');
    expect(selectHeaderLogo({ isDark: false, isDesktop: true })).toBe('/cpadark.png');
  });
});
