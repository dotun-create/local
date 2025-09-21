/**
 * Theme System Barrel Export
 * Centralized exports for the complete design system
 */

// Theme Provider and Hooks
export { default as ThemeProvider, useTheme, withTheme } from './ThemeProvider';

// Design Tokens
export * from './tokens';

// Theme Definitions
export { lightTheme, darkTheme, themes } from './themes';

// Utility Functions
export const getThemeValue = (theme, path) => {
  return path.split('.').reduce((obj, key) => obj?.[key], theme);
};

export const createCustomTheme = (baseTheme, overrides = {}) => {
  const merge = (target, source) => {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = merge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  };

  return merge(baseTheme, overrides);
};

export const getCSSVariable = (name) => {
  return `var(--${name})`;
};

export const setCSSVariable = (name, value) => {
  document.documentElement.style.setProperty(`--${name}`, value);
};

// Media Query Helpers
export const mediaQueries = {
  xs: '(min-width: 475px)',
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',

  // Utility queries
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',

  // Accessibility queries
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: high)',
  darkMode: '(prefers-color-scheme: dark)',
  lightMode: '(prefers-color-scheme: light)'
};

// Theme utilities for CSS-in-JS
export const styled = {
  // Responsive helper
  responsive: (breakpoint, styles) => `
    @media ${mediaQueries[breakpoint]} {
      ${styles}
    }
  `,

  // Theme value helper
  theme: (path) => (props) => getThemeValue(props.theme, path),

  // Color helpers
  color: (colorPath) => getCSSVariable(`color-${colorPath.replace('.', '-')}`),

  // Spacing helpers
  spacing: (size) => getCSSVariable(`spacing-${size}`),

  // Typography helpers
  fontSize: (size) => getCSSVariable(`font-size-${size}`),
  fontWeight: (weight) => getCSSVariable(`font-weight-${weight}`),

  // Border helpers
  borderRadius: (size) => getCSSVariable(`border-radius-${size}`),

  // Shadow helpers
  boxShadow: (size) => getCSSVariable(`box-shadow-${size}`),

  // Transition helpers
  transition: (property = 'all', duration = 'normal', timing = 'ease') =>
    `${property} ${getCSSVariable(`transition-duration-${duration}`)} ${timing}`
};