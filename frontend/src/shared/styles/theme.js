/**
 * Styled Components Theme Configuration
 * Provides theme tokens for styled-components across the application
 */

// Import design tokens from the existing design system
import { DESIGN_TOKENS } from '../design-system/tokens';

// Base theme configuration
const baseTheme = {
  // Colors from design tokens
  colors: {
    primary: DESIGN_TOKENS.colors.primary[500],
    primaryLight: DESIGN_TOKENS.colors.primary[400],
    primaryDark: DESIGN_TOKENS.colors.primary[600],

    secondary: DESIGN_TOKENS.colors.secondary[500],
    secondaryLight: DESIGN_TOKENS.colors.secondary[400],
    secondaryDark: DESIGN_TOKENS.colors.secondary[600],

    success: DESIGN_TOKENS.colors.success[500],
    warning: DESIGN_TOKENS.colors.warning[500],
    error: DESIGN_TOKENS.colors.error[500],

    neutral: DESIGN_TOKENS.colors.gray,
    gray: DESIGN_TOKENS.colors.gray,

    text: {
      primary: DESIGN_TOKENS.colors.gray[900],
      secondary: DESIGN_TOKENS.colors.gray[600],
      muted: DESIGN_TOKENS.colors.gray[400],
      inverse: DESIGN_TOKENS.colors.gray[50],
    },

    background: {
      primary: DESIGN_TOKENS.colors.gray[50],
      secondary: DESIGN_TOKENS.colors.gray[100],
      tertiary: DESIGN_TOKENS.colors.gray[200],
    },

    border: {
      primary: DESIGN_TOKENS.colors.gray[200],
      secondary: DESIGN_TOKENS.colors.gray[300],
      focus: DESIGN_TOKENS.colors.primary[500],
    },

    surface: {
      primary: '#ffffff',
      secondary: DESIGN_TOKENS.colors.gray[50],
      tertiary: DESIGN_TOKENS.colors.gray[100],
    },

    interactive: {
      primary: DESIGN_TOKENS.colors.primary[500],
      hover: DESIGN_TOKENS.colors.primary[600],
      active: DESIGN_TOKENS.colors.primary[700],
    },
  },

  // Typography
  fonts: {
    primary: DESIGN_TOKENS.typography.fontFamily.sans.join(', '),
    monospace: DESIGN_TOKENS.typography.fontFamily.mono.join(', '),
  },

  fontSizes: DESIGN_TOKENS.typography.fontSize,
  fontWeights: DESIGN_TOKENS.typography.fontWeight,
  lineHeights: DESIGN_TOKENS.typography.lineHeight,

  // Spacing
  space: DESIGN_TOKENS.spacing,

  // Border radius
  radii: DESIGN_TOKENS.borderRadius,

  // Shadows
  shadows: DESIGN_TOKENS.shadows,

  // Breakpoints
  breakpoints: DESIGN_TOKENS.breakpoints,

  // Animation
  transitions: {
    fast: `${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.ease}`,
    normal: `${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.ease}`,
    slow: `${DESIGN_TOKENS.animation.duration.slow} ${DESIGN_TOKENS.animation.easing.ease}`,
  },

  // Z-index values
  zIndices: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
};

// Light theme (default)
export const lightTheme = {
  ...baseTheme,
  mode: 'light',
  colors: {
    ...baseTheme.colors,
    // Light theme specific overrides if needed
  },
};

// Dark theme
export const darkTheme = {
  ...baseTheme,
  mode: 'dark',
  colors: {
    ...baseTheme.colors,
    // Dark theme color overrides
    primary: DESIGN_TOKENS.colors.primary[400],
    primaryLight: DESIGN_TOKENS.colors.primary[300],
    primaryDark: DESIGN_TOKENS.colors.primary[500],

    text: {
      primary: DESIGN_TOKENS.colors.gray[50],
      secondary: DESIGN_TOKENS.colors.gray[300],
      muted: DESIGN_TOKENS.colors.gray[400],
      inverse: DESIGN_TOKENS.colors.gray[900],
    },

    background: {
      primary: DESIGN_TOKENS.colors.gray[900],
      secondary: DESIGN_TOKENS.colors.gray[800],
      tertiary: DESIGN_TOKENS.colors.gray[700],
    },

    surface: {
      primary: DESIGN_TOKENS.colors.gray[800],
      secondary: DESIGN_TOKENS.colors.gray[700],
      tertiary: DESIGN_TOKENS.colors.gray[600],
    },

    border: {
      primary: DESIGN_TOKENS.colors.gray[700],
      secondary: DESIGN_TOKENS.colors.gray[600],
      focus: DESIGN_TOKENS.colors.primary[400],
    },

    interactive: {
      primary: DESIGN_TOKENS.colors.primary[400],
      hover: DESIGN_TOKENS.colors.primary[300],
      active: DESIGN_TOKENS.colors.primary[200],
    },
  },
};

// Media queries helper
export const media = {
  xs: `@media (min-width: ${baseTheme.breakpoints.xs})`,
  sm: `@media (min-width: ${baseTheme.breakpoints.sm})`,
  md: `@media (min-width: ${baseTheme.breakpoints.md})`,
  lg: `@media (min-width: ${baseTheme.breakpoints.lg})`,
  xl: `@media (min-width: ${baseTheme.breakpoints.xl})`,
  '2xl': `@media (min-width: ${baseTheme.breakpoints['2xl']})`,

  // Max width queries
  maxXs: `@media (max-width: ${parseInt(baseTheme.breakpoints.sm) - 1}px)`,
  maxSm: `@media (max-width: ${parseInt(baseTheme.breakpoints.md) - 1}px)`,
  maxMd: `@media (max-width: ${parseInt(baseTheme.breakpoints.lg) - 1}px)`,
  maxLg: `@media (max-width: ${parseInt(baseTheme.breakpoints.xl) - 1}px)`,
  maxXl: `@media (max-width: ${parseInt(baseTheme.breakpoints['2xl']) - 1}px)`,

  // Dark mode
  dark: '@media (prefers-color-scheme: dark)',
  light: '@media (prefers-color-scheme: light)',

  // Reduced motion
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
};

// Theme utilities
export const getTheme = (mode = 'light') => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

export default {
  lightTheme,
  darkTheme,
  getTheme,
  media,
};