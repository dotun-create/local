/**
 * Responsive Typography Components
 * Styled typography components with responsive behavior
 */

import styled, { css } from 'styled-components';
import { media, fluidType } from '../../../styles/responsive';

// Base text component
const BaseText = styled.div`
  font-family: ${({ theme }) => theme.fonts.primary};
  color: ${({ theme, color }) =>
    color ? (theme.colors.text[color] || theme.colors[color] || color) : theme.colors.text.primary
  };
  line-height: ${({ theme, lineHeight = 'normal' }) => theme.lineHeights[lineHeight] || lineHeight};

  ${({ align }) =>
    align &&
    css`
      text-align: ${align};
    `}

  ${({ weight }) =>
    weight &&
    css`
      font-weight: ${({ theme }) => theme.fontWeights[weight] || weight};
    `}

  ${({ transform }) =>
    transform &&
    css`
      text-transform: ${transform};
    `}

  ${({ decoration }) =>
    decoration &&
    css`
      text-decoration: ${decoration};
    `}

  ${({ truncate }) =>
    truncate &&
    css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `}

  ${({ clamp }) =>
    clamp &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: ${clamp};
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`;

// Display heading (largest)
export const Display = styled(BaseText).attrs({ as: 'h1' })`
  ${fluidType(36, 64)}
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  letter-spacing: -0.025em;

  ${media.sm(css`
    ${fluidType(42, 72)}
  `)}

  ${media.lg(css`
    ${fluidType(48, 96)}
  `)}
`;

// Headings
export const Heading1 = styled(BaseText).attrs({ as: 'h1' })`
  ${fluidType(28, 48)}
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  letter-spacing: -0.025em;

  ${media.sm(css`
    ${fluidType(32, 56)}
  `)}

  ${media.lg(css`
    ${fluidType(36, 64)}
  `)}
`;

export const Heading2 = styled(BaseText).attrs({ as: 'h2' })`
  ${fluidType(24, 36)}
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  letter-spacing: -0.025em;

  ${media.sm(css`
    ${fluidType(28, 42)}
  `)}

  ${media.lg(css`
    ${fluidType(32, 48)}
  `)}
`;

export const Heading3 = styled(BaseText).attrs({ as: 'h3' })`
  ${fluidType(20, 28)}
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  letter-spacing: -0.025em;

  ${media.sm(css`
    ${fluidType(24, 32)}
  `)}

  ${media.lg(css`
    ${fluidType(28, 36)}
  `)}
`;

export const Heading4 = styled(BaseText).attrs({ as: 'h4' })`
  ${fluidType(18, 24)}
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};

  ${media.sm(css`
    ${fluidType(20, 28)}
  `)}

  ${media.lg(css`
    ${fluidType(24, 32)}
  `)}
`;

export const Heading5 = styled(BaseText).attrs({ as: 'h5' })`
  ${fluidType(16, 20)}
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};

  ${media.sm(css`
    ${fluidType(18, 24)}
  `)}

  ${media.lg(css`
    ${fluidType(20, 28)}
  `)}
`;

export const Heading6 = styled(BaseText).attrs({ as: 'h6' })`
  ${fluidType(14, 18)}
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  text-transform: uppercase;
  letter-spacing: 0.1em;

  ${media.sm(css`
    ${fluidType(16, 20)}
  `)}

  ${media.lg(css`
    ${fluidType(18, 24)}
  `)}
`;

// Body text
export const Body = styled(BaseText).attrs({ as: 'p' })`
  font-size: ${({ theme, size = 'md' }) => theme.fontSizes[size]};
  line-height: ${({ theme }) => theme.lineHeights.normal};
  margin-bottom: ${({ theme, noMargin }) => noMargin ? 0 : theme.space[3]};

  ${({ size }) =>
    size === 'lg' &&
    css`
      ${fluidType(18, 22)}

      ${media.sm(css`
        ${fluidType(20, 24)}
      `)}
    `}

  ${({ size }) =>
    size === 'sm' &&
    css`
      font-size: ${({ theme }) => theme.fontSizes.sm};
    `}

  ${({ size }) =>
    size === 'xs' &&
    css`
      font-size: ${({ theme }) => theme.fontSizes.xs};
    `}
`;

// Lead text (larger body text)
export const Lead = styled(BaseText).attrs({ as: 'p' })`
  ${fluidType(18, 24)}
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
  font-weight: ${({ theme }) => theme.fontWeights.normal};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.space[4]};

  ${media.sm(css`
    ${fluidType(20, 28)}
  `)}

  ${media.lg(css`
    ${fluidType(22, 32)}
  `)}
`;

// Small text
export const Small = styled(BaseText).attrs({ as: 'small' })`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: ${({ theme }) => theme.lineHeights.normal};
  color: ${({ theme }) => theme.colors.text.muted};

  ${media.sm(css`
    font-size: ${({ theme }) => theme.fontSizes.md};
  `)}
`;

// Caption text
export const Caption = styled(BaseText).attrs({ as: 'span' })`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: ${({ theme }) => theme.lineHeights.normal};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: ${({ theme }) => theme.fontWeights.normal};

  ${media.sm(css`
    font-size: ${({ theme }) => theme.fontSizes.sm};
  `)}
`;

// Code text
export const Code = styled(BaseText).attrs({ as: 'code' })`
  font-family: ${({ theme }) => theme.fonts.monospace};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  background-color: ${({ theme }) => theme.colors.surface.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radii.sm};

  ${({ block }) =>
    block &&
    css`
      display: block;
      padding: ${({ theme }) => theme.space[3]};
      border-radius: ${({ theme }) => theme.radii.md};
      overflow-x: auto;
      white-space: pre;
    `}
`;

// Responsive blockquote
export const Blockquote = styled.blockquote`
  font-family: ${({ theme }) => theme.fonts.primary};
  ${fluidType(18, 24)}
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-left: 4px solid ${({ theme }) => theme.colors.primary};
  padding-left: ${({ theme }) => theme.space[4]};
  margin: ${({ theme }) => theme.space[5]} 0;

  ${media.sm(css`
    ${fluidType(20, 28)}
    padding-left: ${({ theme }) => theme.space[6]};
  `)}

  cite {
    display: block;
    font-style: normal;
    font-size: ${({ theme }) => theme.fontSizes.sm};
    color: ${({ theme }) => theme.colors.text.muted};
    margin-top: ${({ theme }) => theme.space[2]};

    &::before {
      content: '— ';
    }
  }
`;

// Responsive list
export const List = styled.ul`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: ${({ theme }) => theme.lineHeights.normal};
  color: ${({ theme }) => theme.colors.text.primary};
  padding-left: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[3]};

  ${media.sm(css`
    padding-left: ${({ theme }) => theme.space[5]};
  `)}

  li {
    margin-bottom: ${({ theme }) => theme.space[1]};

    &:last-child {
      margin-bottom: 0;
    }
  }

  ${({ variant }) =>
    variant === 'ordered' &&
    css`
      list-style-type: decimal;
    `}

  ${({ variant }) =>
    variant === 'none' &&
    css`
      list-style: none;
      padding-left: 0;
    `}
`;

// Responsive text with gradient
export const GradientText = styled(BaseText)`
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.primary} 0%,
    ${({ theme }) => theme.colors.secondary} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  /* Fallback for browsers that don't support background-clip: text */
  @supports not (-webkit-background-clip: text) {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

// Text with custom responsive sizing
export const ResponsiveText = styled(BaseText)`
  ${({ fontSize }) => {
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

        ${fontSize.xl && media.xl(css`
          font-size: ${({ theme }) => theme.fontSizes[fontSize.xl] || fontSize.xl};
        `)}
      `;
    }

    return css`
      font-size: ${({ theme }) => theme.fontSizes[fontSize] || fontSize};
    `;
  }}
`;

export default {
  Display,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Body,
  Lead,
  Small,
  Caption,
  Code,
  Blockquote,
  List,
  GradientText,
  ResponsiveText,
};