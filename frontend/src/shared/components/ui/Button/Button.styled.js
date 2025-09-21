/**
 * Styled Button Component
 * Replaces CSS with styled-components for better theme integration
 */

import styled, { css } from 'styled-components';

// Button size variants
const sizeStyles = {
  sm: css`
    padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[3]};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    min-height: 32px;
  `,
  md: css`
    padding: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[4]};
    font-size: ${({ theme }) => theme.fontSizes.md};
    min-height: 40px;
  `,
  lg: css`
    padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[6]};
    font-size: ${({ theme }) => theme.fontSizes.lg};
    min-height: 48px;
  `,
};

// Button variant styles
const variantStyles = {
  primary: css`
    background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary} 0%, ${({ theme }) => theme.colors.primaryDark} 100%);
    color: white;
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, ${({ theme }) => theme.colors.primaryDark} 0%, ${({ theme }) => theme.colors.primary} 100%);
      transform: translateY(-1px);
      box-shadow: ${({ theme }) => theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${({ theme }) => theme.shadows.sm};
    }

    &:focus {
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}40;
    }
  `,

  secondary: css`
    background-color: ${({ theme }) => theme.colors.surface.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
    border: 2px solid ${({ theme }) => theme.colors.border.primary};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.surface.tertiary};
      border-color: ${({ theme }) => theme.colors.border.secondary};
      transform: translateY(-1px);
      box-shadow: ${({ theme }) => theme.shadows.sm};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      background-color: ${({ theme }) => theme.colors.surface.primary};
    }

    &:focus {
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.neutral[300]}40;
    }
  `,

  outline: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.primary};
    border: 2px solid ${({ theme }) => theme.colors.primary};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.primary};
      color: white;
      transform: translateY(-1px);
      box-shadow: ${({ theme }) => theme.shadows.sm};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:focus {
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}40;
    }
  `,

  ghost: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.surface.secondary};
      color: ${({ theme }) => theme.colors.text.primary};
    }

    &:active:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.surface.tertiary};
    }

    &:focus {
      background-color: ${({ theme }) => theme.colors.surface.secondary};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.neutral[300]}40;
    }
  `,

  text: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.primary};
    border: 2px solid transparent;
    padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[2]};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.primaryLight}20;
      color: ${({ theme }) => theme.colors.primaryDark};
    }

    &:active:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.primaryLight}30;
    }

    &:focus {
      background-color: ${({ theme }) => theme.colors.primaryLight}20;
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}40;
    }
  `,

  danger: css`
    background-color: ${({ theme }) => theme.colors.error};
    color: white;
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.error}dd;
      transform: translateY(-1px);
      box-shadow: ${({ theme }) => theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${({ theme }) => theme.shadows.sm};
    }

    &:focus {
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.error}40;
    }
  `,

  success: css`
    background-color: ${({ theme }) => theme.colors.success};
    color: white;
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.success}dd;
      transform: translateY(-1px);
      box-shadow: ${({ theme }) => theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${({ theme }) => theme.shadows.sm};
    }

    &:focus {
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.success}40;
    }
  `,

  warning: css`
    background-color: ${({ theme }) => theme.colors.warning};
    color: ${({ theme }) => theme.colors.text.primary};
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.warning}dd;
      transform: translateY(-1px);
      box-shadow: ${({ theme }) => theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${({ theme }) => theme.shadows.sm};
    }

    &:focus {
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.warning}40;
    }
  `,
};

// Base button component
export const StyledButton = styled.button`
  /* Reset */
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  text-decoration: none;
  cursor: pointer;

  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
  font-family: ${({ theme }) => theme.fonts.primary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  line-height: 1;
  border-radius: ${({ theme }) => theme.radii.md};
  transition: all ${({ theme }) => theme.transitions.fast};
  position: relative;
  overflow: hidden;
  user-select: none;
  white-space: nowrap;

  /* Size variants */
  ${({ size = 'md' }) => sizeStyles[size]};

  /* Variant styles */
  ${({ variant = 'primary' }) => variantStyles[variant]};

  /* Full width */
  ${({ fullWidth }) =>
    fullWidth &&
    css`
      width: 100%;
    `}

  /* Loading state */
  ${({ loading }) =>
    loading &&
    css`
      pointer-events: none;
      opacity: 0.7;
    `}

  /* Disabled state */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  /* Icon only */
  ${({ iconOnly }) =>
    iconOnly &&
    css`
      padding: ${({ theme }) => theme.space[2]};
      aspect-ratio: 1;
    `}

  /* Focus styles for accessibility */
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.border.focus};
    outline-offset: 2px;
  }

  /* Animation */
  &:not(:disabled) {
    &:hover {
      animation: none;
    }
  }
`;

// Button content wrapper
export const ButtonContent = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
  position: relative;
  z-index: 1;

  ${({ loading }) =>
    loading &&
    css`
      opacity: 0;
    `}
`;

// Loading spinner
export const LoadingSpinner = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    0% {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    100% {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }
`;

// Icon wrapper
export const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  ${({ position }) =>
    position === 'left' &&
    css`
      margin-right: ${({ theme }) => theme.space[1]};
    `}

  ${({ position }) =>
    position === 'right' &&
    css`
      margin-left: ${({ theme }) => theme.space[1]};
    `}
`;

export default {
  StyledButton,
  ButtonContent,
  LoadingSpinner,
  IconWrapper,
};