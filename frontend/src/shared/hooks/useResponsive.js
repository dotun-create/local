/**
 * Responsive Hooks
 * React hooks for responsive behavior and breakpoint detection
 */

import { useState, useEffect, useCallback } from 'react';

// Breakpoint values (matching our theme)
const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Get current breakpoint
const getCurrentBreakpoint = (width) => {
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
};

// Hook for detecting current breakpoint
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 'md'; // SSR fallback
    return getCurrentBreakpoint(window.innerWidth);
  });

  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return 768; // SSR fallback
    return window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWidth(newWidth);
      setBreakpoint(getCurrentBreakpoint(newWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAbove = useCallback((bp) => {
    return width >= breakpoints[bp];
  }, [width]);

  const isBelow = useCallback((bp) => {
    return width < breakpoints[bp];
  }, [width]);

  const isBetween = useCallback((minBp, maxBp) => {
    return width >= breakpoints[minBp] && width < breakpoints[maxBp];
  }, [width]);

  return {
    breakpoint,
    width,
    isAbove,
    isBelow,
    isBetween,
    // Convenience getters
    isXs: breakpoint === 'xs',
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    is2xl: breakpoint === '2xl',
    // Device type helpers
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
  };
};

// Hook for media queries
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (e) => setMatches(e.matches);

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [query]);

  return matches;
};

// Hook for viewport dimensions
export const useViewport = () => {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768 }; // SSR fallback
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
};

// Hook for orientation detection
export const useOrientation = () => {
  const [orientation, setOrientation] = useState(() => {
    if (typeof window === 'undefined') return 'landscape';
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  });

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    const handleOrientationChange = () => {
      // Use a timeout to ensure we get the updated dimensions
      setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return {
    orientation,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
  };
};

// Hook for reduced motion preference
export const useReducedMotion = () => {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
};

// Hook for dark mode preference
export const useDarkMode = () => {
  return useMediaQuery('(prefers-color-scheme: dark)');
};

// Hook for high contrast preference
export const useHighContrast = () => {
  return useMediaQuery('(prefers-contrast: high)');
};

// Hook for container queries (experimental)
export const useContainerQuery = (ref, query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;

    const element = ref.current;

    // Fallback implementation for browsers without container query support
    const checkQuery = () => {
      if (query.includes('min-width')) {
        const minWidth = parseInt(query.match(/min-width:\s*(\d+)px/)?.[1] || '0');
        setMatches(element.offsetWidth >= minWidth);
      } else if (query.includes('max-width')) {
        const maxWidth = parseInt(query.match(/max-width:\s*(\d+)px/)?.[1] || '999999');
        setMatches(element.offsetWidth <= maxWidth);
      }
    };

    // Use ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(checkQuery);
    resizeObserver.observe(element);

    // Initial check
    checkQuery();

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, query]);

  return matches;
};

// Hook for responsive values
export const useResponsiveValue = (values) => {
  const { breakpoint } = useBreakpoint();

  if (typeof values === 'string' || typeof values === 'number') {
    return values;
  }

  // Return the value for the current breakpoint, with fallbacks
  return (
    values[breakpoint] ||
    values.xl ||
    values.lg ||
    values.md ||
    values.sm ||
    values.xs ||
    values.base ||
    null
  );
};

// Hook for responsive grid columns
export const useResponsiveColumns = (columnConfig) => {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  if (typeof columnConfig === 'number') {
    if (isMobile) return 1;
    if (isTablet) return Math.min(columnConfig, 2);
    return columnConfig;
  }

  if (typeof columnConfig === 'object') {
    if (isMobile) return columnConfig.mobile || columnConfig.xs || 1;
    if (isTablet) return columnConfig.tablet || columnConfig.md || 2;
    return columnConfig.desktop || columnConfig.lg || columnConfig.xl || 3;
  }

  return 1;
};

// Hook for scroll direction
export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState('up');
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY) {
        setScrollDirection('up');
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return {
    scrollDirection,
    isScrollingDown: scrollDirection === 'down',
    isScrollingUp: scrollDirection === 'up',
  };
};

// Hook for element visibility
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return {
    isIntersecting,
    hasIntersected,
    isVisible: isIntersecting,
  };
};

export default {
  useBreakpoint,
  useMediaQuery,
  useViewport,
  useOrientation,
  useReducedMotion,
  useDarkMode,
  useHighContrast,
  useContainerQuery,
  useResponsiveValue,
  useResponsiveColumns,
  useScrollDirection,
  useIntersectionObserver,
};