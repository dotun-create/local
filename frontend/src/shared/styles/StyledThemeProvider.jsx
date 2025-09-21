/**
 * Unified Theme Provider
 * Integrates styled-components theme with design token themes and Zustand store
 */

import React, { useEffect } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { ThemeProvider } from '../theme/ThemeProvider';
import { useStore } from '../store';
import { lightTheme, darkTheme } from './theme';
import { lightTheme as designLightTheme, darkTheme as designDarkTheme } from '../theme/themes';

// Inner provider that connects styled-components to design tokens
const StyledThemeProviderInner = ({ children }) => {
  const zustandTheme = useStore((state) => state.app.theme);
  const setZustandTheme = useStore((state) => state.app.actions.setTheme);

  // Map design token themes to styled-components themes
  const getStyledTheme = (themeName) => {
    const baseTheme = themeName === 'dark' ? darkTheme : lightTheme;
    const designTheme = themeName === 'dark' ? designDarkTheme : designLightTheme;

    // Merge design tokens into styled-components theme
    return {
      ...baseTheme,
      // Override with design token colors while keeping styled-components structure
      colors: {
        ...baseTheme.colors,
        background: designTheme.colors.background,
        surface: designTheme.colors.surface,
        text: designTheme.colors.text,
        border: designTheme.colors.border,
        interactive: designTheme.colors.interactive,
        state: designTheme.colors.state,
        // Keep styled-components specific colors
        primary: baseTheme.colors.primary,
        secondary: baseTheme.colors.secondary,
        accent: baseTheme.colors.accent,
        neutral: baseTheme.colors.neutral,
        success: baseTheme.colors.success,
        warning: baseTheme.colors.warning,
        error: baseTheme.colors.error,
        info: baseTheme.colors.info
      },
      // Use design token spacing, typography, etc.
      spacing: designTheme.spacing,
      typography: designTheme.typography,
      borderRadius: designTheme.borderRadius,
      boxShadow: designTheme.boxShadow,
      zIndex: designTheme.zIndex,
      transitions: designTheme.transitions
    };
  };

  const currentStyledTheme = getStyledTheme(zustandTheme);

  return (
    <StyledThemeProvider theme={currentStyledTheme}>
      {children}
    </StyledThemeProvider>
  );
};

// Main provider that wraps both theme systems
const UnifiedThemeProvider = ({ children, defaultTheme = 'light' }) => {
  const initializeSettings = useStore((state) => state.app.actions.initializeSettings);

  // Initialize theme settings on mount
  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);

  return (
    <ThemeProvider defaultTheme={defaultTheme} enableSystemTheme={true}>
      <StyledThemeProviderInner>
        {children}
      </StyledThemeProviderInner>
    </ThemeProvider>
  );
};

export default UnifiedThemeProvider;