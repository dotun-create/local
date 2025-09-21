/**
 * Theme Mode Hook
 * Custom hook for managing theme state and preferences
 */

import { useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { useTheme } from '../theme/ThemeProvider';

export const useThemeMode = () => {
  const zustandTheme = useStore((state) => state.app.theme);
  const setZustandTheme = useStore((state) => state.app.actions.setTheme);
  const toggleZustandTheme = useStore((state) => state.app.actions.toggleTheme);

  const {
    theme,
    themeName,
    setTheme: setDesignTheme,
    toggleTheme: toggleDesignTheme,
    isDark,
    isLight,
    isSystemTheme,
    systemTheme,
    availableThemes
  } = useTheme();

  // Sync themes between providers
  useEffect(() => {
    if (themeName !== zustandTheme) {
      setZustandTheme(themeName);
    }
  }, [themeName, zustandTheme, setZustandTheme]);

  // Theme switching functions that update both providers
  const setThemeMode = useCallback((newTheme) => {
    setDesignTheme(newTheme);
    setZustandTheme(newTheme);
  }, [setDesignTheme, setZustandTheme]);

  const toggleThemeMode = useCallback(() => {
    toggleDesignTheme();
    // The Zustand theme will be synced via useEffect
  }, [toggleDesignTheme]);

  // System theme detection
  const useSystemTheme = useCallback(() => {
    setThemeMode('system');
  }, [setThemeMode]);

  // Theme preference persistence
  const saveThemePreference = useCallback((themeToSave = themeName) => {
    try {
      localStorage.setItem('theme', themeToSave);
      localStorage.setItem('theme-preference', JSON.stringify({
        theme: themeToSave,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }, [themeName]);

  const loadThemePreference = useCallback(() => {
    try {
      const saved = localStorage.getItem('theme');
      const savedPreference = localStorage.getItem('theme-preference');

      if (saved) {
        setThemeMode(saved);
      }

      if (savedPreference) {
        const preference = JSON.parse(savedPreference);
        // Optional: Check if preference is recent (e.g., within 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (preference.timestamp > thirtyDaysAgo) {
          setThemeMode(preference.theme);
        }
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  }, [setThemeMode]);

  // Auto-save theme changes
  useEffect(() => {
    if (themeName) {
      saveThemePreference(themeName);
    }
  }, [themeName, saveThemePreference]);

  // Color scheme media query helper
  const getSystemColorScheme = useCallback(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Accessibility helpers
  const getContrastRatio = useCallback((color1, color2) => {
    // Simple contrast ratio calculation (you might want to use a more robust library)
    const getLuminance = (color) => {
      // Basic luminance calculation for hex colors
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);

    return (brightest + 0.05) / (darkest + 0.05);
  }, []);

  // High contrast mode detection
  const prefersHighContrast = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  }, []);

  // Reduced motion detection
  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return {
    // Current theme state
    theme,
    themeName,
    isDark,
    isLight,
    isSystemTheme,
    systemTheme,

    // Available themes
    availableThemes,

    // Theme switching
    setTheme: setThemeMode,
    toggleTheme: toggleThemeMode,
    useSystemTheme,

    // Persistence
    saveThemePreference,
    loadThemePreference,

    // System preferences
    getSystemColorScheme,
    prefersHighContrast,
    prefersReducedMotion,

    // Accessibility
    getContrastRatio,

    // Convenience flags
    isAutoTheme: isSystemTheme,
    isDarkMode: isDark,
    isLightMode: isLight,
    currentSystemTheme: systemTheme
  };
};

export default useThemeMode;