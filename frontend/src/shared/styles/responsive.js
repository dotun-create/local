/**
 * Responsive Design System
 * Utilities and components for responsive design
 */

import { css } from 'styled-components';

// Breakpoint values (matching theme)
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Media query helpers
export const media = {
  // Min-width queries (mobile-first)
  xs: (styles) => css`
    @media (min-width: ${breakpoints.xs}) {
      ${styles}
    }
  `,
  sm: (styles) => css`
    @media (min-width: ${breakpoints.sm}) {
      ${styles}
    }
  `,
  md: (styles) => css`
    @media (min-width: ${breakpoints.md}) {
      ${styles}
    }
  `,
  lg: (styles) => css`
    @media (min-width: ${breakpoints.lg}) {
      ${styles}
    }
  `,
  xl: (styles) => css`
    @media (min-width: ${breakpoints.xl}) {
      ${styles}
    }
  `,
  '2xl': (styles) => css`
    @media (min-width: ${breakpoints['2xl']}) {
      ${styles}
    }
  `,

  // Max-width queries
  maxXs: (styles) => css`
    @media (max-width: ${parseInt(breakpoints.sm) - 1}px) {
      ${styles}
    }
  `,
  maxSm: (styles) => css`
    @media (max-width: ${parseInt(breakpoints.md) - 1}px) {
      ${styles}
    }
  `,
  maxMd: (styles) => css`
    @media (max-width: ${parseInt(breakpoints.lg) - 1}px) {
      ${styles}
    }
  `,
  maxLg: (styles) => css`
    @media (max-width: ${parseInt(breakpoints.xl) - 1}px) {
      ${styles}
    }
  `,
  maxXl: (styles) => css`
    @media (max-width: ${parseInt(breakpoints['2xl']) - 1}px) {
      ${styles}
    }
  `,

  // Between breakpoints
  between: (min, max) => (styles) => css`
    @media (min-width: ${breakpoints[min]}) and (max-width: ${parseInt(breakpoints[max]) - 1}px) {
      ${styles}
    }
  `,

  // Device-specific queries
  mobile: (styles) => css`
    @media (max-width: ${parseInt(breakpoints.md) - 1}px) {
      ${styles}
    }
  `,
  tablet: (styles) => css`
    @media (min-width: ${breakpoints.md}) and (max-width: ${parseInt(breakpoints.lg) - 1}px) {
      ${styles}
    }
  `,
  desktop: (styles) => css`
    @media (min-width: ${breakpoints.lg}) {
      ${styles}
    }
  `,

  // Orientation queries
  landscape: (styles) => css`
    @media (orientation: landscape) {
      ${styles}
    }
  `,
  portrait: (styles) => css`
    @media (orientation: portrait) {
      ${styles}
    }
  `,

  // High DPI displays
  retina: (styles) => css`
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      ${styles}
    }
  `,

  // Reduced motion preference
  reducedMotion: (styles) => css`
    @media (prefers-reduced-motion: reduce) {
      ${styles}
    }
  `,

  // Dark mode preference
  dark: (styles) => css`
    @media (prefers-color-scheme: dark) {
      ${styles}
    }
  `,

  // Light mode preference
  light: (styles) => css`
    @media (prefers-color-scheme: light) {
      ${styles}
    }
  `,

  // Print styles
  print: (styles) => css`
    @media print {
      ${styles}
    }
  `,
};

// Responsive value helper
export const responsive = (property, values) => {
  if (typeof values === 'string' || typeof values === 'number') {
    return css`
      ${property}: ${values};
    `;
  }

  return css`
    ${values.base && css`${property}: ${values.base};`}
    ${values.xs && media.xs(css`${property}: ${values.xs};`)}
    ${values.sm && media.sm(css`${property}: ${values.sm};`)}
    ${values.md && media.md(css`${property}: ${values.md};`)}
    ${values.lg && media.lg(css`${property}: ${values.lg};`)}
    ${values.xl && media.xl(css`${property}: ${values.xl};`)}
    ${values['2xl'] && media['2xl'](css`${property}: ${values['2xl']};`)}
  `;
};

// Fluid typography helper
export const fluidType = (minSize, maxSize, minVw = 320, maxVw = 1200) => css`
  font-size: ${minSize}px;

  @media (min-width: ${minVw}px) {
    font-size: calc(${minSize}px + ${maxSize - minSize} * ((100vw - ${minVw}px) / ${maxVw - minVw}));
  }

  @media (min-width: ${maxVw}px) {
    font-size: ${maxSize}px;
  }
`;

// Container queries (when supported)
export const containerQuery = (size, styles) => css`
  @container (min-width: ${size}) {
    ${styles}
  }
`;

// Aspect ratio helper
export const aspectRatio = (ratio) => css`
  aspect-ratio: ${ratio};

  /* Fallback for browsers that don't support aspect-ratio */
  @supports not (aspect-ratio: 1) {
    &::before {
      content: '';
      display: block;
      padding-bottom: ${(1 / ratio) * 100}%;
    }

    > * {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  }
`;

// Grid helpers
export const gridCols = (cols) => {
  if (typeof cols === 'number') {
    return css`
      grid-template-columns: repeat(${cols}, 1fr);
    `;
  }

  return responsive('grid-template-columns', cols);
};

export const gridResponsive = (minWidth = '250px') => css`
  grid-template-columns: repeat(auto-fit, minmax(${minWidth}, 1fr));
`;

// Flex helpers
export const flexDirection = (direction) => {
  return responsive('flex-direction', direction);
};

export const alignItems = (align) => {
  return responsive('align-items', align);
};

export const justifyContent = (justify) => {
  return responsive('justify-content', justify);
};

// Spacing helpers
export const spacing = (property, values, theme) => {
  if (typeof values === 'string' || typeof values === 'number') {
    const value = theme?.space?.[values] || values;
    return css`
      ${property}: ${value};
    `;
  }

  return css`
    ${values.base && css`${property}: ${theme?.space?.[values.base] || values.base};`}
    ${values.xs && media.xs(css`${property}: ${theme?.space?.[values.xs] || values.xs};`)}
    ${values.sm && media.sm(css`${property}: ${theme?.space?.[values.sm] || values.sm};`)}
    ${values.md && media.md(css`${property}: ${theme?.space?.[values.md] || values.md};`)}
    ${values.lg && media.lg(css`${property}: ${theme?.space?.[values.lg] || values.lg};`)}
    ${values.xl && media.xl(css`${property}: ${theme?.space?.[values.xl] || values.xl};`)}
    ${values['2xl'] && media['2xl'](css`${property}: ${theme?.space?.[values['2xl']] || values['2xl']};`)}
  `;
};

// Typography helpers
export const fontSize = (sizes) => {
  return responsive('font-size', sizes);
};

export const lineHeight = (heights) => {
  return responsive('line-height', heights);
};

// Visibility helpers
export const show = (breakpoints) => {
  if (typeof breakpoints === 'string') {
    return media[breakpoints](css`display: block;`);
  }

  return css`
    display: none;
    ${breakpoints.map(bp => media[bp](css`display: block;`))}
  `;
};

export const hide = (breakpoints) => {
  if (typeof breakpoints === 'string') {
    return media[breakpoints](css`display: none;`);
  }

  return css`
    ${breakpoints.map(bp => media[bp](css`display: none;`))}
  `;
};

// Common responsive patterns
export const responsivePatterns = {
  // Stack on mobile, side-by-side on desktop
  stackToRow: css`
    display: flex;
    flex-direction: column;
    gap: 1rem;

    ${media.md(css`
      flex-direction: row;
      gap: 2rem;
    `)}
  `,

  // Grid that stacks on mobile
  responsiveGrid: (cols = 3) => css`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    ${media.sm(css`
      grid-template-columns: repeat(2, 1fr);
    `)}

    ${media.lg(css`
      grid-template-columns: repeat(${cols}, 1fr);
    `)}
  `,

  // Card grid
  cardGrid: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;

    ${media.md(css`
      gap: 2rem;
    `)}
  `,

  // Full width on mobile, centered on desktop
  centerOnDesktop: css`
    width: 100%;

    ${media.lg(css`
      max-width: 1200px;
      margin: 0 auto;
    `)}
  `,

  // Sidebar layout
  sidebarLayout: css`
    display: flex;
    flex-direction: column;
    gap: 2rem;

    ${media.lg(css`
      flex-direction: row;
      gap: 3rem;
    `)}

    .sidebar {
      ${media.lg(css`
        flex: 0 0 300px;
      `)}
    }

    .main {
      flex: 1;
    }
  `,
};

export default {
  breakpoints,
  media,
  responsive,
  fluidType,
  containerQuery,
  aspectRatio,
  gridCols,
  gridResponsive,
  flexDirection,
  alignItems,
  justifyContent,
  spacing,
  fontSize,
  lineHeight,
  show,
  hide,
  responsivePatterns,
};