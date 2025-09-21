/**
 * Theme Definitions
 * Light and dark theme configurations using design tokens
 */

import { colors, typography, spacing, borderRadius, boxShadow, zIndex, breakpoints, transitions, components } from './tokens';

// Light Theme
export const lightTheme = {
  name: 'light',

  // Colors
  colors: {
    // Background colors
    background: {
      primary: colors.white,
      secondary: colors.neutral[50],
      tertiary: colors.neutral[100],
      inverse: colors.neutral[900]
    },

    // Surface colors (cards, modals, etc.)
    surface: {
      primary: colors.white,
      secondary: colors.neutral[50],
      tertiary: colors.neutral[100],
      overlay: 'rgba(0, 0, 0, 0.5)'
    },

    // Text colors
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[600],
      tertiary: colors.neutral[500],
      inverse: colors.white,
      disabled: colors.neutral[400]
    },

    // Border colors
    border: {
      primary: colors.neutral[200],
      secondary: colors.neutral[300],
      tertiary: colors.neutral[400],
      focus: colors.primary[500]
    },

    // Interactive colors
    interactive: {
      primary: colors.primary[600],
      primaryHover: colors.primary[700],
      primaryActive: colors.primary[800],
      secondary: colors.secondary[600],
      secondaryHover: colors.secondary[700],
      secondaryActive: colors.secondary[800]
    },

    // State colors
    state: {
      success: colors.success[600],
      successBackground: colors.success[50],
      successBorder: colors.success[200],
      warning: colors.warning[600],
      warningBackground: colors.warning[50],
      warningBorder: colors.warning[200],
      error: colors.error[600],
      errorBackground: colors.error[50],
      errorBorder: colors.error[200],
      info: colors.info[600],
      infoBackground: colors.info[50],
      infoBorder: colors.info[200]
    }
  },

  // Include all other tokens
  typography,
  spacing,
  borderRadius,
  boxShadow,
  zIndex,
  breakpoints,
  transitions,
  components
};

// Dark Theme
export const darkTheme = {
  name: 'dark',

  // Colors (adapted for dark mode)
  colors: {
    // Background colors
    background: {
      primary: colors.neutral[900],
      secondary: colors.neutral[800],
      tertiary: colors.neutral[700],
      inverse: colors.white
    },

    // Surface colors
    surface: {
      primary: colors.neutral[800],
      secondary: colors.neutral[700],
      tertiary: colors.neutral[600],
      overlay: 'rgba(0, 0, 0, 0.7)'
    },

    // Text colors
    text: {
      primary: colors.neutral[100],
      secondary: colors.neutral[300],
      tertiary: colors.neutral[400],
      inverse: colors.neutral[900],
      disabled: colors.neutral[600]
    },

    // Border colors
    border: {
      primary: colors.neutral[700],
      secondary: colors.neutral[600],
      tertiary: colors.neutral[500],
      focus: colors.primary[400]
    },

    // Interactive colors
    interactive: {
      primary: colors.primary[500],
      primaryHover: colors.primary[400],
      primaryActive: colors.primary[300],
      secondary: colors.secondary[400],
      secondaryHover: colors.secondary[300],
      secondaryActive: colors.secondary[200]
    },

    // State colors
    state: {
      success: colors.success[500],
      successBackground: colors.success[900],
      successBorder: colors.success[700],
      warning: colors.warning[500],
      warningBackground: colors.warning[900],
      warningBorder: colors.warning[700],
      error: colors.error[500],
      errorBackground: colors.error[900],
      errorBorder: colors.error[700],
      info: colors.info[500],
      infoBackground: colors.info[900],
      infoBorder: colors.info[700]
    }
  },

  // Include all other tokens
  typography,
  spacing,
  borderRadius,
  boxShadow,
  zIndex,
  breakpoints,
  transitions,
  components
};

// Theme variants for specific use cases
export const themes = {
  light: lightTheme,
  dark: darkTheme,

  // High contrast variants
  lightHighContrast: {
    ...lightTheme,
    name: 'light-high-contrast',
    colors: {
      ...lightTheme.colors,
      text: {
        primary: colors.black,
        secondary: colors.neutral[800],
        tertiary: colors.neutral[700],
        inverse: colors.white,
        disabled: colors.neutral[500]
      },
      border: {
        primary: colors.neutral[400],
        secondary: colors.neutral[500],
        tertiary: colors.neutral[600],
        focus: colors.primary[700]
      }
    }
  },

  darkHighContrast: {
    ...darkTheme,
    name: 'dark-high-contrast',
    colors: {
      ...darkTheme.colors,
      text: {
        primary: colors.white,
        secondary: colors.neutral[200],
        tertiary: colors.neutral[300],
        inverse: colors.black,
        disabled: colors.neutral[500]
      },
      border: {
        primary: colors.neutral[500],
        secondary: colors.neutral[400],
        tertiary: colors.neutral[300],
        focus: colors.primary[300]
      }
    }
  }
};

export default themes;