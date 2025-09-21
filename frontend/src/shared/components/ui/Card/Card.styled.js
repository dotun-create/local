/**
 * Styled Card Component
 * Replaces CSS with styled-components for better theme integration
 */

import styled, { css } from 'styled-components';

// Card variant styles
const variantStyles = {
  default: css`
    background-color: ${({ theme }) => theme.colors.surface.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  `,

  elevated: css`
    background-color: ${({ theme }) => theme.colors.surface.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    box-shadow: ${({ theme }) => theme.shadows.md};

    &:hover {
      box-shadow: ${({ theme }) => theme.shadows.lg};
      transform: translateY(-2px);
    }
  `,

  outlined: css`
    background-color: ${({ theme }) => theme.colors.surface.primary};
    border: 2px solid ${({ theme }) => theme.colors.border.primary};
    box-shadow: none;
  `,

  ghost: css`
    background-color: transparent;
    border: 1px solid transparent;
    box-shadow: none;
  `,

  filled: css`
    background-color: ${({ theme }) => theme.colors.surface.secondary};
    border: 1px solid transparent;
    box-shadow: none;
  `,
};

// Card size styles
const sizeStyles = {
  sm: css`
    padding: ${({ theme }) => theme.space[3]};
  `,
  md: css`
    padding: ${({ theme }) => theme.space[4]};
  `,
  lg: css`
    padding: ${({ theme }) => theme.space[5]};
  `,
};

// Base card component
export const StyledCard = styled.div`
  border-radius: ${({ theme }) => theme.radii.lg};
  transition: all ${({ theme }) => theme.transitions.normal};
  position: relative;
  overflow: hidden;

  /* Variant styles */
  ${({ variant = 'default' }) => variantStyles[variant]};

  /* Size styles */
  ${({ size = 'md' }) => sizeStyles[size]};

  /* Interactive state */
  ${({ interactive }) =>
    interactive &&
    css`
      cursor: pointer;

      &:hover {
        transform: translateY(-2px);
        box-shadow: ${({ theme }) => theme.shadows.lg};
      }

      &:active {
        transform: translateY(0);
        box-shadow: ${({ theme }) => theme.shadows.md};
      }

      &:focus {
        outline: 2px solid ${({ theme }) => theme.colors.border.focus};
        outline-offset: 2px;
      }
    `}

  /* Full width */
  ${({ fullWidth }) =>
    fullWidth &&
    css`
      width: 100%;
    `}

  /* No padding */
  ${({ noPadding }) =>
    noPadding &&
    css`
      padding: 0;
    `}
`;

// Card header
export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.space[4]};
  padding-bottom: ${({ theme }) => theme.space[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};

  ${({ noBorder }) =>
    noBorder &&
    css`
      border-bottom: none;
      padding-bottom: 0;
    `}

  ${({ center }) =>
    center &&
    css`
      justify-content: center;
      text-align: center;
    `}
`;

// Card title
export const CardTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: ${({ theme }) => theme.lineHeights.tight};

  ${({ size }) =>
    size === 'sm' &&
    css`
      font-size: ${({ theme }) => theme.fontSizes.md};
    `}

  ${({ size }) =>
    size === 'lg' &&
    css`
      font-size: ${({ theme }) => theme.fontSizes.xl};
    `}
`;

// Card description
export const CardDescription = styled.p`
  margin: ${({ theme }) => theme.space[1]} 0 0 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.lineHeights.normal};
`;

// Card content
export const CardContent = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};

  ${({ center }) =>
    center &&
    css`
      text-align: center;
    `}
`;

// Card footer
export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[4]};
  padding-top: ${({ theme }) => theme.space[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};

  ${({ noBorder }) =>
    noBorder &&
    css`
      border-top: none;
      padding-top: 0;
    `}

  ${({ spaceBetween }) =>
    spaceBetween &&
    css`
      justify-content: space-between;
    `}

  ${({ center }) =>
    center &&
    css`
      justify-content: center;
    `}
`;

// Card image
export const CardImage = styled.div`
  width: 100%;
  height: 200px;
  background-image: url(${({ src }) => src});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.space[3]};

  ${({ height }) =>
    height &&
    css`
      height: ${height};
    `}

  ${({ objectFit }) =>
    objectFit &&
    css`
      background-size: ${objectFit};
    `}

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: ${({ theme }) => theme.radii.md};
  }
`;

// Card actions (for buttons, etc.)
export const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};

  ${({ direction }) =>
    direction === 'column' &&
    css`
      flex-direction: column;
      align-items: stretch;
    `}

  ${({ justify }) =>
    justify &&
    css`
      justify-content: ${justify};
    `}
`;

// Card badge (for status indicators)
export const CardBadge = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space[3]};
  right: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[2]};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border-radius: ${({ theme }) => theme.radii.full};

  ${({ variant }) =>
    variant === 'success' &&
    css`
      background-color: ${({ theme }) => theme.colors.success};
    `}

  ${({ variant }) =>
    variant === 'warning' &&
    css`
      background-color: ${({ theme }) => theme.colors.warning};
    `}

  ${({ variant }) =>
    variant === 'error' &&
    css`
      background-color: ${({ theme }) => theme.colors.error};
    `}

  ${({ variant }) =>
    variant === 'info' &&
    css`
      background-color: ${({ theme }) => theme.colors.info};
    `}
`;

// Loading overlay
export const CardLoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }) => theme.colors.surface.primary}e6;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: ${({ theme }) => theme.radii.lg};
`;

export default {
  StyledCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardImage,
  CardActions,
  CardBadge,
  CardLoadingOverlay,
};