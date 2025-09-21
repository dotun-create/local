import React, { createContext, useContext, useEffect, useState } from 'react';
import { lightTheme, darkTheme, themes } from './themes';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Create Theme Context
const ThemeContext = createContext();

// Theme Provider Component
export const ThemeProvider = ({
  children,
  defaultTheme = 'light',
  storageKey = 'app-theme',
  enableSystemTheme = true
}) => {
  const [storedTheme, setStoredTheme] = useLocalStorage(storageKey, defaultTheme);
  const [currentTheme, setCurrentTheme] = useState(storedTheme);
  const [systemTheme, setSystemTheme] = useState('light');

  // Detect system theme preference
  useEffect(() => {
    if (!enableSystemTheme) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enableSystemTheme]);

  // Determine active theme
  const activeThemeName = currentTheme === 'system' ? systemTheme : currentTheme;
  const activeTheme = themes[activeThemeName] || lightTheme;

  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    const theme = activeTheme;

    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-light-high-contrast', 'theme-dark-high-contrast');

    // Add current theme class
    root.classList.add(`theme-${activeThemeName}`);

    // Set CSS custom properties
    const setCSSVariable = (name, value) => {
      root.style.setProperty(`--${name}`, value);
    };

    // Background colors
    setCSSVariable('color-background-primary', theme.colors.background.primary);
    setCSSVariable('color-background-secondary', theme.colors.background.secondary);
    setCSSVariable('color-background-tertiary', theme.colors.background.tertiary);
    setCSSVariable('color-background-inverse', theme.colors.background.inverse);

    // Surface colors
    setCSSVariable('color-surface-primary', theme.colors.surface.primary);
    setCSSVariable('color-surface-secondary', theme.colors.surface.secondary);
    setCSSVariable('color-surface-tertiary', theme.colors.surface.tertiary);
    setCSSVariable('color-surface-overlay', theme.colors.surface.overlay);

    // Text colors
    setCSSVariable('color-text-primary', theme.colors.text.primary);
    setCSSVariable('color-text-secondary', theme.colors.text.secondary);
    setCSSVariable('color-text-tertiary', theme.colors.text.tertiary);
    setCSSVariable('color-text-inverse', theme.colors.text.inverse);
    setCSSVariable('color-text-disabled', theme.colors.text.disabled);

    // Border colors
    setCSSVariable('color-border-primary', theme.colors.border.primary);
    setCSSVariable('color-border-secondary', theme.colors.border.secondary);
    setCSSVariable('color-border-tertiary', theme.colors.border.tertiary);
    setCSSVariable('color-border-focus', theme.colors.border.focus);

    // Interactive colors
    setCSSVariable('color-interactive-primary', theme.colors.interactive.primary);
    setCSSVariable('color-interactive-primary-hover', theme.colors.interactive.primaryHover);
    setCSSVariable('color-interactive-primary-active', theme.colors.interactive.primaryActive);
    setCSSVariable('color-interactive-secondary', theme.colors.interactive.secondary);
    setCSSVariable('color-interactive-secondary-hover', theme.colors.interactive.secondaryHover);
    setCSSVariable('color-interactive-secondary-active', theme.colors.interactive.secondaryActive);

    // State colors
    setCSSVariable('color-state-success', theme.colors.state.success);
    setCSSVariable('color-state-success-background', theme.colors.state.successBackground);
    setCSSVariable('color-state-success-border', theme.colors.state.successBorder);
    setCSSVariable('color-state-warning', theme.colors.state.warning);
    setCSSVariable('color-state-warning-background', theme.colors.state.warningBackground);
    setCSSVariable('color-state-warning-border', theme.colors.state.warningBorder);
    setCSSVariable('color-state-error', theme.colors.state.error);
    setCSSVariable('color-state-error-background', theme.colors.state.errorBackground);
    setCSSVariable('color-state-error-border', theme.colors.state.errorBorder);
    setCSSVariable('color-state-info', theme.colors.state.info);
    setCSSVariable('color-state-info-background', theme.colors.state.infoBackground);
    setCSSVariable('color-state-info-border', theme.colors.state.infoBorder);

    // Typography
    setCSSVariable('font-family-sans', theme.typography.fontFamily.sans.join(', '));
    setCSSVariable('font-family-serif', theme.typography.fontFamily.serif.join(', '));
    setCSSVariable('font-family-mono', theme.typography.fontFamily.mono.join(', '));

    // Spacing (most commonly used)
    setCSSVariable('spacing-1', theme.spacing['1']);
    setCSSVariable('spacing-2', theme.spacing['2']);
    setCSSVariable('spacing-3', theme.spacing['3']);
    setCSSVariable('spacing-4', theme.spacing['4']);
    setCSSVariable('spacing-6', theme.spacing['6']);
    setCSSVariable('spacing-8', theme.spacing['8']);
    setCSSVariable('spacing-12', theme.spacing['12']);
    setCSSVariable('spacing-16', theme.spacing['16']);

    // Border radius
    setCSSVariable('border-radius-sm', theme.borderRadius.sm);
    setCSSVariable('border-radius-base', theme.borderRadius.base);
    setCSSVariable('border-radius-md', theme.borderRadius.md);
    setCSSVariable('border-radius-lg', theme.borderRadius.lg);
    setCSSVariable('border-radius-xl', theme.borderRadius.xl);
    setCSSVariable('border-radius-full', theme.borderRadius.full);

    // Box shadows
    setCSSVariable('box-shadow-sm', theme.boxShadow.sm);
    setCSSVariable('box-shadow-base', theme.boxShadow.base);
    setCSSVariable('box-shadow-md', theme.boxShadow.md);
    setCSSVariable('box-shadow-lg', theme.boxShadow.lg);
    setCSSVariable('box-shadow-xl', theme.boxShadow.xl);

    // Transitions
    setCSSVariable('transition-duration-fast', theme.transitions.duration.fast);
    setCSSVariable('transition-duration-normal', theme.transitions.duration.normal);
    setCSSVariable('transition-duration-slow', theme.transitions.duration.slow);

  }, [activeTheme, activeThemeName]);

  // Theme switching functions
  const setTheme = (themeName) => {
    setCurrentTheme(themeName);
    setStoredTheme(themeName);
  };

  const toggleTheme = () => {
    const newTheme = activeThemeName === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  // Context value
  const contextValue = {
    // Current theme state
    theme: activeTheme,
    themeName: activeThemeName,
    currentTheme,
    systemTheme,

    // Available themes
    availableThemes: Object.keys(themes),
    themes,

    // Theme switching
    setTheme,
    toggleTheme,
    resetTheme,

    // Configuration
    enableSystemTheme,
    defaultTheme,

    // Utilities
    isDark: activeThemeName.includes('dark'),
    isLight: activeThemeName.includes('light'),
    isHighContrast: activeThemeName.includes('high-contrast'),
    isSystemTheme: currentTheme === 'system'
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

// Higher-order component for theme injection
export const withTheme = (Component) => {
  return React.forwardRef((props, ref) => {
    const theme = useTheme();
    return <Component {...props} ref={ref} theme={theme} />;
  });
};

export default ThemeProvider;