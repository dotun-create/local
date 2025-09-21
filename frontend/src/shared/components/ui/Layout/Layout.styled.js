/**
 * Styled Layout Components
 * Common layout patterns and utilities using styled-components
 */

import styled, { css } from 'styled-components';

// Container component
export const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.space[4]};

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

  ${({ size }) =>
    size === '2xl' &&
    css`
      max-width: 1536px;
    `}

  ${({ fluid }) =>
    fluid &&
    css`
      max-width: none;
    `}

  ${({ noPadding }) =>
    noPadding &&
    css`
      padding: 0;
    `}

  /* Responsive padding */
  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.space[3]};
  }
`;

// Flex components
export const Flex = styled.div`
  display: flex;

  ${({ direction }) =>
    direction &&
    css`
      flex-direction: ${direction};
    `}

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
      flex-wrap: ${typeof wrap === 'boolean' ? 'wrap' : wrap};
    `}

  ${({ gap }) =>
    gap &&
    css`
      gap: ${({ theme }) => theme.space[gap] || gap};
    `}

  ${({ flex }) =>
    flex &&
    css`
      flex: ${flex};
    `}
`;

// Grid components
export const Grid = styled.div`
  display: grid;

  ${({ columns }) =>
    columns &&
    css`
      grid-template-columns: ${typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns};
    `}

  ${({ rows }) =>
    rows &&
    css`
      grid-template-rows: ${typeof rows === 'number' ? `repeat(${rows}, 1fr)` : rows};
    `}

  ${({ gap }) =>
    gap &&
    css`
      gap: ${({ theme }) => theme.space[gap] || gap};
    `}

  ${({ columnGap }) =>
    columnGap &&
    css`
      column-gap: ${({ theme }) => theme.space[columnGap] || columnGap};
    `}

  ${({ rowGap }) =>
    rowGap &&
    css`
      row-gap: ${({ theme }) => theme.space[rowGap] || rowGap};
    `}

  ${({ areas }) =>
    areas &&
    css`
      grid-template-areas: ${areas};
    `}

  /* Responsive grid */
  ${({ responsive }) =>
    responsive &&
    css`
      grid-template-columns: repeat(auto-fit, minmax(${responsive.minWidth || '250px'}, 1fr));
    `}
`;

// Grid item
export const GridItem = styled.div`
  ${({ colSpan }) =>
    colSpan &&
    css`
      grid-column: span ${colSpan};
    `}

  ${({ rowSpan }) =>
    rowSpan &&
    css`
      grid-row: span ${rowSpan};
    `}

  ${({ area }) =>
    area &&
    css`
      grid-area: ${area};
    `}

  ${({ colStart }) =>
    colStart &&
    css`
      grid-column-start: ${colStart};
    `}

  ${({ colEnd }) =>
    colEnd &&
    css`
      grid-column-end: ${colEnd};
    `}

  ${({ rowStart }) =>
    rowStart &&
    css`
      grid-row-start: ${rowStart};
    `}

  ${({ rowEnd }) =>
    rowEnd &&
    css`
      grid-row-end: ${rowEnd};
    `}
`;

// Stack component (vertical layout)
export const Stack = styled.div`
  display: flex;
  flex-direction: column;

  ${({ gap }) =>
    gap &&
    css`
      gap: ${({ theme }) => theme.space[gap] || gap};
    `}

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

// HStack component (horizontal layout)
export const HStack = styled.div`
  display: flex;
  flex-direction: row;

  ${({ gap }) =>
    gap &&
    css`
      gap: ${({ theme }) => theme.space[gap] || gap};
    `}

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
`;

// Center component
export const Center = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  ${({ direction }) =>
    direction === 'column' &&
    css`
      flex-direction: column;
    `}

  ${({ minHeight }) =>
    minHeight &&
    css`
      min-height: ${minHeight};
    `}
`;

// Spacer component
export const Spacer = styled.div`
  flex: 1;
`;

// Divider component
export const Divider = styled.div`
  width: 100%;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.border.primary};
  margin: ${({ theme }) => theme.space[4]} 0;

  ${({ orientation }) =>
    orientation === 'vertical' &&
    css`
      width: 1px;
      height: 100%;
      margin: 0 ${({ theme }) => theme.space[4]};
    `}

  ${({ thickness }) =>
    thickness &&
    css`
      height: ${thickness}px;
    `}

  ${({ color }) =>
    color &&
    css`
      background-color: ${({ theme }) => theme.colors[color] || color};
    `}
`;

// Box component (generic container with spacing)
export const Box = styled.div`
  ${({ p }) =>
    p &&
    css`
      padding: ${({ theme }) => theme.space[p] || p};
    `}

  ${({ px }) =>
    px &&
    css`
      padding-left: ${({ theme }) => theme.space[px] || px};
      padding-right: ${({ theme }) => theme.space[px] || px};
    `}

  ${({ py }) =>
    py &&
    css`
      padding-top: ${({ theme }) => theme.space[py] || py};
      padding-bottom: ${({ theme }) => theme.space[py] || py};
    `}

  ${({ pt }) =>
    pt &&
    css`
      padding-top: ${({ theme }) => theme.space[pt] || pt};
    `}

  ${({ pr }) =>
    pr &&
    css`
      padding-right: ${({ theme }) => theme.space[pr] || pr};
    `}

  ${({ pb }) =>
    pb &&
    css`
      padding-bottom: ${({ theme }) => theme.space[pb] || pb};
    `}

  ${({ pl }) =>
    pl &&
    css`
      padding-left: ${({ theme }) => theme.space[pl] || pl};
    `}

  ${({ m }) =>
    m &&
    css`
      margin: ${({ theme }) => theme.space[m] || m};
    `}

  ${({ mx }) =>
    mx &&
    css`
      margin-left: ${({ theme }) => theme.space[mx] || mx};
      margin-right: ${({ theme }) => theme.space[mx] || mx};
    `}

  ${({ my }) =>
    my &&
    css`
      margin-top: ${({ theme }) => theme.space[my] || my};
      margin-bottom: ${({ theme }) => theme.space[my] || my};
    `}

  ${({ mt }) =>
    mt &&
    css`
      margin-top: ${({ theme }) => theme.space[mt] || mt};
    `}

  ${({ mr }) =>
    mr &&
    css`
      margin-right: ${({ theme }) => theme.space[mr] || mr};
    `}

  ${({ mb }) =>
    mb &&
    css`
      margin-bottom: ${({ theme }) => theme.space[mb] || mb};
    `}

  ${({ ml }) =>
    ml &&
    css`
      margin-left: ${({ theme }) => theme.space[ml] || ml};
    `}

  ${({ width }) =>
    width &&
    css`
      width: ${width};
    `}

  ${({ height }) =>
    height &&
    css`
      height: ${height};
    `}

  ${({ maxWidth }) =>
    maxWidth &&
    css`
      max-width: ${maxWidth};
    `}

  ${({ maxHeight }) =>
    maxHeight &&
    css`
      max-height: ${maxHeight};
    `}

  ${({ bg }) =>
    bg &&
    css`
      background-color: ${({ theme }) => theme.colors[bg] || bg};
    `}

  ${({ color }) =>
    color &&
    css`
      color: ${({ theme }) => theme.colors[color] || color};
    `}

  ${({ rounded }) =>
    rounded &&
    css`
      border-radius: ${({ theme }) => theme.radii[rounded] || rounded};
    `}

  ${({ shadow }) =>
    shadow &&
    css`
      box-shadow: ${({ theme }) => theme.shadows[shadow] || shadow};
    `}

  ${({ border }) =>
    border &&
    css`
      border: 1px solid ${({ theme }) => theme.colors.border.primary};
    `}

  ${({ borderColor }) =>
    borderColor &&
    css`
      border-color: ${({ theme }) => theme.colors[borderColor] || borderColor};
    `}
`;

// Aspect ratio component
export const AspectRatio = styled.div`
  position: relative;
  width: 100%;

  &::before {
    content: '';
    display: block;
    padding-bottom: ${({ ratio = 1 }) => (1 / ratio) * 100}%;
  }

  > * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

// Sticky component
export const Sticky = styled.div`
  position: sticky;
  top: ${({ top = 0 }) => top};
  z-index: ${({ zIndex = 10 }) => zIndex};
`;

// Hide component (responsive visibility)
export const Hide = styled.div`
  ${({ below }) =>
    below &&
    css`
      @media (max-width: ${({ theme }) => theme.breakpoints[below]}) {
        display: none;
      }
    `}

  ${({ above }) =>
    above &&
    css`
      @media (min-width: ${({ theme }) => theme.breakpoints[above]}) {
        display: none;
      }
    `}
`;

// Show component (responsive visibility)
export const Show = styled.div`
  display: none;

  ${({ below }) =>
    below &&
    css`
      @media (max-width: ${({ theme }) => theme.breakpoints[below]}) {
        display: block;
      }
    `}

  ${({ above }) =>
    above &&
    css`
      @media (min-width: ${({ theme }) => theme.breakpoints[above]}) {
        display: block;
      }
    `}
`;

export default {
  Container,
  Flex,
  Grid,
  GridItem,
  Stack,
  HStack,
  Center,
  Spacer,
  Divider,
  Box,
  AspectRatio,
  Sticky,
  Hide,
  Show,
};