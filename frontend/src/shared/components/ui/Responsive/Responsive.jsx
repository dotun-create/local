/**
 * Responsive Components
 * Components that adapt to different screen sizes
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { media, responsive, responsivePatterns } from '../../../styles/responsive';

// Responsive Container
export const ResponsiveContainer = styled.div`
  width: 100%;
  margin: 0 auto;
  padding: 0 1rem;

  ${media.sm(css`
    padding: 0 1.5rem;
    max-width: 640px;
  `)}

  ${media.md(css`
    padding: 0 2rem;
    max-width: 768px;
  `)}

  ${media.lg(css`
    padding: 0 2rem;
    max-width: 1024px;
  `)}

  ${media.xl(css`
    padding: 0 2rem;
    max-width: 1280px;
  `)}

  ${media['2xl'](css`
    max-width: 1536px;
  `)}

  ${({ fluid }) =>
    fluid &&
    css`
      max-width: none;
    `}

  ${({ size }) =>
    size === 'sm' &&
    css`
      max-width: 640px;
    `}

  ${({ size }) =>
    size === 'md' &&
    css`
      max-width: 768px;
    `}

  ${({ size }) =>
    size === 'lg' &&
    css`
      max-width: 1024px;
    `}

  ${({ size }) =>
    size === 'xl' &&
    css`
      max-width: 1280px;
    `}
`;

// Responsive Grid
export const ResponsiveGrid = styled.div`
  display: grid;
  gap: 1rem;

  ${({ columns }) => {
    if (typeof columns === 'number') {
      return css`
        grid-template-columns: repeat(${columns}, 1fr);

        ${media.maxSm(css`
          grid-template-columns: 1fr;
        `)}

        ${media.maxMd(css`
          grid-template-columns: repeat(${Math.min(columns, 2)}, 1fr);
        `)}
      `;
    }

    if (typeof columns === 'object') {
      return css`
        grid-template-columns: 1fr;

        ${columns.xs && media.xs(css`
          grid-template-columns: repeat(${columns.xs}, 1fr);
        `)}

        ${columns.sm && media.sm(css`
          grid-template-columns: repeat(${columns.sm}, 1fr);
        `)}

        ${columns.md && media.md(css`
          grid-template-columns: repeat(${columns.md}, 1fr);
        `)}

        ${columns.lg && media.lg(css`
          grid-template-columns: repeat(${columns.lg}, 1fr);
        `)}

        ${columns.xl && media.xl(css`
          grid-template-columns: repeat(${columns.xl}, 1fr);
        `)}
      `;
    }

    return responsivePatterns.cardGrid;
  }}

  ${({ gap }) =>
    gap &&
    css`
      gap: ${({ theme }) => theme.space[gap] || gap};

      ${media.md(css`
        gap: ${({ theme }) => theme.space[gap + 1] || `calc(${gap} * 1.5)`};
      `)}
    `}

  ${({ autoFit }) =>
    autoFit &&
    css`
      grid-template-columns: repeat(auto-fit, minmax(${autoFit.minWidth || '280px'}, 1fr));
    `}

  ${({ autoFill }) =>
    autoFill &&
    css`
      grid-template-columns: repeat(auto-fill, minmax(${autoFill.minWidth || '280px'}, 1fr));
    `}
`;

// Responsive Flex
export const ResponsiveFlex = styled.div`
  display: flex;
  gap: 1rem;

  ${({ direction }) => {
    if (typeof direction === 'string') {
      return css`
        flex-direction: ${direction};
      `;
    }

    if (typeof direction === 'object') {
      return css`
        flex-direction: column;

        ${direction.xs && media.xs(css`
          flex-direction: ${direction.xs};
        `)}

        ${direction.sm && media.sm(css`
          flex-direction: ${direction.sm};
        `)}

        ${direction.md && media.md(css`
          flex-direction: ${direction.md};
        `)}

        ${direction.lg && media.lg(css`
          flex-direction: ${direction.lg};
        `)}

        ${direction.xl && media.xl(css`
          flex-direction: ${direction.xl};
        `)}
      `;
    }

    return responsivePatterns.stackToRow;
  }}

  ${({ align }) =>
    align &&
    css`
      align-items: ${align};
    `}

  ${({ justify }) =>
    justify &&
    css`
      justify-content: ${justify};
    `}

  ${({ wrap }) =>
    wrap &&
    css`
      flex-wrap: wrap;
    `}

  ${({ gap }) =>
    gap &&
    css`
      gap: ${({ theme }) => theme.space[gap] || gap};
    `}
`;

// Responsive Stack (always column)
export const ResponsiveStack = styled.div`
  display: flex;
  flex-direction: column;

  ${({ gap }) => {
    if (typeof gap === 'string' || typeof gap === 'number') {
      return css`
        gap: ${({ theme }) => theme.space[gap] || gap};
      `;
    }

    if (typeof gap === 'object') {
      return css`
        gap: ${({ theme }) => theme.space[gap.base] || gap.base || '1rem'};

        ${gap.sm && media.sm(css`
          gap: ${({ theme }) => theme.space[gap.sm] || gap.sm};
        `)}

        ${gap.md && media.md(css`
          gap: ${({ theme }) => theme.space[gap.md] || gap.md};
        `)}

        ${gap.lg && media.lg(css`
          gap: ${({ theme }) => theme.space[gap.lg] || gap.lg};
        `)}
      `;
    }
  }}

  ${({ align }) =>
    align &&
    css`
      align-items: ${align};
    `}

  ${({ justify }) =>
    justify &&
    css`
      justify-content: ${justify};
    `}
`;

// Responsive Text
export const ResponsiveText = styled.div`
  ${({ fontSize }) => {
    if (typeof fontSize === 'string') {
      return css`
        font-size: ${({ theme }) => theme.fontSizes[fontSize] || fontSize};
      `;
    }

    if (typeof fontSize === 'object') {
      return css`
        font-size: ${({ theme }) => theme.fontSizes[fontSize.base] || fontSize.base || '1rem'};

        ${fontSize.sm && media.sm(css`
          font-size: ${({ theme }) => theme.fontSizes[fontSize.sm] || fontSize.sm};
        `)}

        ${fontSize.md && media.md(css`
          font-size: ${({ theme }) => theme.fontSizes[fontSize.md] || fontSize.md};
        `)}

        ${fontSize.lg && media.lg(css`
          font-size: ${({ theme }) => theme.fontSizes[fontSize.lg] || fontSize.lg};
        `)}
      `;
    }
  }}

  ${({ align }) => {
    if (typeof align === 'string') {
      return css`
        text-align: ${align};
      `;
    }

    if (typeof align === 'object') {
      return css`
        text-align: ${align.base || 'left'};

        ${align.sm && media.sm(css`
          text-align: ${align.sm};
        `)}

        ${align.md && media.md(css`
          text-align: ${align.md};
        `)}

        ${align.lg && media.lg(css`
          text-align: ${align.lg};
        `)}
      `;
    }
  }}

  ${({ lineHeight }) =>
    lineHeight &&
    css`
      line-height: ${({ theme }) => theme.lineHeights[lineHeight] || lineHeight};
    `}
`;

// Show/Hide components
export const ShowAt = styled.div`
  display: none;

  ${({ breakpoint }) =>
    breakpoint &&
    media[breakpoint](css`
      display: block;
    `)}

  ${({ breakpoints }) =>
    breakpoints &&
    breakpoints.map(bp => media[bp](css`
      display: block;
    `))}
`;

export const HideAt = styled.div`
  display: block;

  ${({ breakpoint }) =>
    breakpoint &&
    media[breakpoint](css`
      display: none;
    `)}

  ${({ breakpoints }) =>
    breakpoints &&
    breakpoints.map(bp => media[bp](css`
      display: none;
    `))}
`;

// Mobile-first show/hide
export const ShowFrom = styled.div`
  display: none;

  ${({ breakpoint }) =>
    breakpoint &&
    media[breakpoint](css`
      display: block;
    `)}
`;

export const HideFrom = styled.div`
  display: block;

  ${({ breakpoint }) =>
    breakpoint &&
    media[breakpoint](css`
      display: none;
    `)}
`;

// Responsive Image
export const ResponsiveImage = styled.img`
  width: 100%;
  height: auto;
  object-fit: ${({ objectFit = 'cover' }) => objectFit};

  ${({ aspectRatio }) =>
    aspectRatio &&
    css`
      aspect-ratio: ${aspectRatio};

      @supports not (aspect-ratio: 1) {
        height: ${({ height = 'auto' }) => height};
      }
    `}

  ${({ rounded }) =>
    rounded &&
    css`
      border-radius: ${({ theme }) => theme.radii[rounded] || rounded};
    `}
`;

// Responsive Iframe (for videos, maps, etc.)
export const ResponsiveIframe = styled.div`
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: ${({ aspectRatio = '56.25%' }) => aspectRatio}; /* 16:9 by default */
  overflow: hidden;

  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
`;

// Responsive Sidebar Layout
export const ResponsiveSidebar = styled.div`
  ${responsivePatterns.sidebarLayout}

  ${({ sidebarWidth = '300px' }) => css`
    ${media.lg(css`
      .sidebar {
        flex: 0 0 ${sidebarWidth};
      }
    `)}
  `}

  ${({ reverse }) =>
    reverse &&
    css`
      ${media.lg(css`
        flex-direction: row-reverse;
      `)}
    `}
`;

// Responsive Card Grid
export const ResponsiveCardGrid = styled.div`
  ${responsivePatterns.cardGrid}

  ${({ minCardWidth = '280px' }) => css`
    grid-template-columns: repeat(auto-fit, minmax(${minCardWidth}, 1fr));
  `}
`;

export default {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveFlex,
  ResponsiveStack,
  ResponsiveText,
  ShowAt,
  HideAt,
  ShowFrom,
  HideFrom,
  ResponsiveImage,
  ResponsiveIframe,
  ResponsiveSidebar,
  ResponsiveCardGrid,
};