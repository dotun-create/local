/**
 * Theme Utilities
 * Utility functions for theme management and system integration
 */

// Update meta theme-color for mobile browsers
export const updateMetaThemeColor = (theme) => {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const backgroundColor = theme?.colors?.background?.primary || '#ffffff';

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', backgroundColor);
  } else {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = backgroundColor;
    document.head.appendChild(meta);
  }
};

// Update document class for theme-aware CSS
export const updateDocumentThemeClass = (themeName) => {
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove('theme-light', 'theme-dark', 'theme-system');

  // Add current theme class
  root.classList.add(`theme-${themeName}`);

  // Set data attribute for CSS targeting
  root.setAttribute('data-theme', themeName);
};

// Get system color scheme preference
export const getSystemColorScheme = () => {
  if (typeof window === 'undefined') return 'light';

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

// Create media query listener for system theme changes
export const createSystemThemeListener = (callback) => {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (e) => {
    callback(e.matches ? 'dark' : 'light');
  };

  // Use the newer API if available, fallback to deprecated one
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }
};

// Check if user prefers reduced motion
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Check if user prefers high contrast
export const prefersHighContrast = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
};

// Calculate contrast ratio between two colors
export const getContrastRatio = (color1, color2) => {
  const getLuminance = (color) => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const [rs, gs, bs] = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  return (brightest + 0.05) / (darkest + 0.05);
};

// Get accessibility compliance level
export const getAccessibilityLevel = (contrastRatio) => {
  if (contrastRatio >= 7) return 'AAA';
  if (contrastRatio >= 4.5) return 'AA';
  if (contrastRatio >= 3) return 'A';
  return 'FAIL';
};

// Theme persistence utilities
export const saveThemeToStorage = (theme, options = {}) => {
  const {
    storageKey = 'app-theme',
    includeTimestamp = true,
    includeBrowserInfo = false
  } = options;

  try {
    const data = {
      theme,
      ...(includeTimestamp && { timestamp: Date.now() }),
      ...(includeBrowserInfo && {
        userAgent: navigator.userAgent,
        colorScheme: getSystemColorScheme(),
        reducedMotion: prefersReducedMotion(),
        highContrast: prefersHighContrast()
      })
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
    localStorage.setItem('theme', theme); // Simple fallback
  } catch (error) {
    console.warn('Failed to save theme to storage:', error);
  }
};

export const loadThemeFromStorage = (options = {}) => {
  const {
    storageKey = 'app-theme',
    fallback = 'light',
    maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
  } = options;

  try {
    // Try to load full data first
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      const data = JSON.parse(storedData);

      // Check if data is still valid (not too old)
      if (data.timestamp && (Date.now() - data.timestamp) > maxAge) {
        return fallback;
      }

      return data.theme || fallback;
    }

    // Fallback to simple theme storage
    const simpleTheme = localStorage.getItem('theme');
    return simpleTheme || fallback;
  } catch (error) {
    console.warn('Failed to load theme from storage:', error);
    return fallback;
  }
};

// Theme validation
export const isValidTheme = (theme, availableThemes = ['light', 'dark', 'system']) => {
  return availableThemes.includes(theme);
};

// Generate theme-aware CSS variables
export const generateThemeVariables = (theme) => {
  const variables = {};

  if (theme.colors) {
    Object.entries(theme.colors).forEach(([category, colors]) => {
      if (typeof colors === 'object') {
        Object.entries(colors).forEach(([variant, color]) => {
          variables[`--color-${category}-${variant}`] = color;
        });
      } else {
        variables[`--color-${category}`] = colors;
      }
    });
  }

  if (theme.spacing) {
    Object.entries(theme.spacing).forEach(([key, value]) => {
      variables[`--spacing-${key}`] = value;
    });
  }

  if (theme.typography) {
    if (theme.typography.fontSize) {
      Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
        variables[`--font-size-${key}`] = value;
      });
    }

    if (theme.typography.fontWeight) {
      Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
        variables[`--font-weight-${key}`] = value;
      });
    }
  }

  return variables;
};

// Apply CSS variables to document
export const applyThemeVariables = (theme) => {
  const variables = generateThemeVariables(theme);
  const root = document.documentElement;

  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

// Theme debugging utilities
export const logThemeInfo = (theme, themeName) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🎨 Theme: ${themeName}`);
    console.log('Theme object:', theme);
    console.log('System preferences:', {
      colorScheme: getSystemColorScheme(),
      reducedMotion: prefersReducedMotion(),
      highContrast: prefersHighContrast()
    });

    if (theme.colors?.background?.primary && theme.colors?.text?.primary) {
      const contrast = getContrastRatio(
        theme.colors.background.primary,
        theme.colors.text.primary
      );
      console.log(`Contrast ratio: ${contrast.toFixed(2)} (${getAccessibilityLevel(contrast)})`);
    }

    console.groupEnd();
  }
};

export default {
  updateMetaThemeColor,
  updateDocumentThemeClass,
  getSystemColorScheme,
  createSystemThemeListener,
  prefersReducedMotion,
  prefersHighContrast,
  getContrastRatio,
  getAccessibilityLevel,
  saveThemeToStorage,
  loadThemeFromStorage,
  isValidTheme,
  generateThemeVariables,
  applyThemeVariables,
  logThemeInfo
};