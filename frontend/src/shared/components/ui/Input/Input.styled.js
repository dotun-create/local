/**
 * Styled Input Component
 * Replaces CSS with styled-components for better theme integration
 */

import styled, { css } from 'styled-components';

// Input size variants
const sizeStyles = {
  sm: css`
    padding: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[3]};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    min-height: 36px;
  `,
  md: css`
    padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
    font-size: ${({ theme }) => theme.fontSizes.md};
    min-height: 44px;
  `,
  lg: css`
    padding: ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[5]};
    font-size: ${({ theme }) => theme.fontSizes.lg};
    min-height: 52px;
  `,
};

// Input variant styles
const variantStyles = {
  default: css`
    background-color: ${({ theme }) => theme.colors.surface.primary};
    border: 2px solid ${({ theme }) => theme.colors.border.primary};
    color: ${({ theme }) => theme.colors.text.primary};

    &:hover:not(:disabled):not(:focus) {
      border-color: ${({ theme }) => theme.colors.border.secondary};
    }

    &:focus {
      border-color: ${({ theme }) => theme.colors.border.focus};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
      outline: none;
    }
  `,

  filled: css`
    background-color: ${({ theme }) => theme.colors.surface.secondary};
    border: 2px solid transparent;
    color: ${({ theme }) => theme.colors.text.primary};

    &:hover:not(:disabled):not(:focus) {
      background-color: ${({ theme }) => theme.colors.surface.tertiary};
    }

    &:focus {
      background-color: ${({ theme }) => theme.colors.surface.primary};
      border-color: ${({ theme }) => theme.colors.border.focus};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
      outline: none;
    }
  `,

  outlined: css`
    background-color: transparent;
    border: 2px solid ${({ theme }) => theme.colors.border.primary};
    color: ${({ theme }) => theme.colors.text.primary};

    &:hover:not(:disabled):not(:focus) {
      border-color: ${({ theme }) => theme.colors.border.secondary};
    }

    &:focus {
      border-color: ${({ theme }) => theme.colors.border.focus};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
      outline: none;
    }
  `,
};

// Base input styles
const inputBaseStyles = css`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-weight: ${({ theme }) => theme.fontWeights.normal};
  line-height: ${({ theme }) => theme.lineHeights.normal};
  border-radius: ${({ theme }) => theme.radii.md};
  transition: all ${({ theme }) => theme.transitions.fast};
  width: 100%;
  display: block;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
    opacity: 1;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.colors.surface.secondary};
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &:read-only {
    background-color: ${({ theme }) => theme.colors.surface.secondary};
    cursor: default;
  }

  /* Error state */
  ${({ hasError }) =>
    hasError &&
    css`
      border-color: ${({ theme }) => theme.colors.error} !important;
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.error}20 !important;

      &:focus {
        border-color: ${({ theme }) => theme.colors.error} !important;
        box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.error}20 !important;
      }
    `}

  /* Success state */
  ${({ hasSuccess }) =>
    hasSuccess &&
    css`
      border-color: ${({ theme }) => theme.colors.success} !important;
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.success}20 !important;

      &:focus {
        border-color: ${({ theme }) => theme.colors.success} !important;
        box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.success}20 !important;
      }
    `}
`;

// Input wrapper
export const InputWrapper = styled.div`
  position: relative;
  width: 100%;

  ${({ fullWidth }) =>
    fullWidth &&
    css`
      width: 100%;
    `}
`;

// Standard input
export const StyledInput = styled.input`
  ${inputBaseStyles}
  ${({ size = 'md' }) => sizeStyles[size]};
  ${({ variant = 'default' }) => variantStyles[variant]};

  /* Icon spacing */
  ${({ hasLeftIcon }) =>
    hasLeftIcon &&
    css`
      padding-left: ${({ theme }) => theme.space[10]};
    `}

  ${({ hasRightIcon }) =>
    hasRightIcon &&
    css`
      padding-right: ${({ theme }) => theme.space[10]};
    `}
`;

// Textarea
export const StyledTextarea = styled.textarea`
  ${inputBaseStyles}
  ${({ size = 'md' }) => sizeStyles[size]};
  ${({ variant = 'default' }) => variantStyles[variant]};

  resize: vertical;
  min-height: 100px;

  ${({ rows }) =>
    rows &&
    css`
      min-height: ${rows * 24}px;
    `}

  ${({ noResize }) =>
    noResize &&
    css`
      resize: none;
    `}

  ${({ autoResize }) =>
    autoResize &&
    css`
      resize: none;
      overflow: hidden;
    `}
`;

// Select
export const StyledSelect = styled.select`
  ${inputBaseStyles}
  ${({ size = 'md' }) => sizeStyles[size]};
  ${({ variant = 'default' }) => variantStyles[variant]};

  cursor: pointer;
  padding-right: ${({ theme }) => theme.space[10]};
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right ${({ theme }) => theme.space[3]} center;
  background-size: 16px;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  option {
    background-color: ${({ theme }) => theme.colors.surface.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

// Input label
export const InputLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.space[1]};

  ${({ required }) =>
    required &&
    css`
      &::after {
        content: ' *';
        color: ${({ theme }) => theme.colors.error};
      }
    `}

  ${({ hasError }) =>
    hasError &&
    css`
      color: ${({ theme }) => theme.colors.error};
    `}
`;

// Input help text
export const InputHelperText = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.space[1]};

  ${({ hasError }) =>
    hasError &&
    css`
      color: ${({ theme }) => theme.colors.error};
    `}

  ${({ hasSuccess }) =>
    hasSuccess &&
    css`
      color: ${({ theme }) => theme.colors.success};
    `}
`;

// Input icons
export const InputIcon = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.space[8]};
  height: ${({ theme }) => theme.space[8]};
  color: ${({ theme }) => theme.colors.text.muted};
  pointer-events: none;

  ${({ position }) =>
    position === 'left' &&
    css`
      left: ${({ theme }) => theme.space[3]};
    `}

  ${({ position }) =>
    position === 'right' &&
    css`
      right: ${({ theme }) => theme.space[3]};
    `}

  ${({ clickable }) =>
    clickable &&
    css`
      pointer-events: auto;
      cursor: pointer;

      &:hover {
        color: ${({ theme }) => theme.colors.text.primary};
      }
    `}
`;

// Input group (for addon support)
export const InputGroup = styled.div`
  display: flex;
  width: 100%;

  ${StyledInput}, ${StyledSelect} {
    &:not(:first-child) {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-left: none;
    }

    &:not(:last-child) {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
  }
`;

// Input addon
export const InputAddon = styled.div`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  background-color: ${({ theme }) => theme.colors.surface.secondary};
  border: 2px solid ${({ theme }) => theme.colors.border.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  white-space: nowrap;

  &:first-child {
    border-right: none;
    border-top-left-radius: ${({ theme }) => theme.radii.md};
    border-bottom-left-radius: ${({ theme }) => theme.radii.md};
  }

  &:last-child {
    border-left: none;
    border-top-right-radius: ${({ theme }) => theme.radii.md};
    border-bottom-right-radius: ${({ theme }) => theme.radii.md};
  }
`;

// Checkbox and radio styles
export const StyledCheckbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const StyledRadio = styled.input.attrs({ type: 'radio' })`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

// Switch component
export const SwitchWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const SwitchInput = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

export const SwitchSlider = styled.span`
  position: relative;
  width: 44px;
  height: 24px;
  background-color: ${({ theme }) => theme.colors.neutral[300]};
  border-radius: ${({ theme }) => theme.radii.full};
  transition: all ${({ theme }) => theme.transitions.fast};

  &::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background-color: white;
    border-radius: 50%;
    transition: all ${({ theme }) => theme.transitions.fast};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }

  ${SwitchInput}:checked + & {
    background-color: ${({ theme }) => theme.colors.primary};

    &::before {
      transform: translateX(20px);
    }
  }

  ${SwitchInput}:focus + & {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }

  ${SwitchInput}:disabled + & {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default {
  InputWrapper,
  StyledInput,
  StyledTextarea,
  StyledSelect,
  InputLabel,
  InputHelperText,
  InputIcon,
  InputGroup,
  InputAddon,
  StyledCheckbox,
  StyledRadio,
  SwitchWrapper,
  SwitchInput,
  SwitchSlider,
};