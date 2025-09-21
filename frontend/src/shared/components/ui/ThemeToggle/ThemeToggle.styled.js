/**
 * Theme Toggle Styled Components
 * Styled components for theme switching UI
 */

import styled, { css } from 'styled-components';
import { media } from '../../../styles/responsive';

export const ToggleWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

export const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme, size = 'md' }) => {
    const sizes = {
      sm: `${theme.spacing['1']} ${theme.spacing['2']}`,
      md: `${theme.spacing['2']} ${theme.spacing['3']}`,
      lg: `${theme.spacing['3']} ${theme.spacing['4']}`
    };
    return sizes[size];
  }};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.surface.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.duration.normal} ease;
  position: relative;
  min-width: ${({ size = 'md' }) => {
    const sizes = { sm: '32px', md: '40px', lg: '48px' };
    return sizes[size];
  }};

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface.secondary};
    border-color: ${({ theme }) => theme.colors.border.secondary};
    transform: translateY(-1px);
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.border.focus}20;
  }

  &:active {
    transform: translateY(0);
  }

  ${({ variant, isOpen }) =>
    variant === 'dropdown' &&
    isOpen &&
    css`
      background-color: ${({ theme }) => theme.colors.surface.secondary};
      border-color: ${({ theme }) => theme.colors.border.focus};
    `}

  ${({ variant }) =>
    variant === 'simple' &&
    css`
      border: none;
      background: transparent;
      padding: ${({ theme, size = 'md' }) => {
        const sizes = {
          sm: theme.spacing['1'],
          md: theme.spacing['2'],
          lg: theme.spacing['3']
        };
        return sizes[size];
      }};

      &:hover {
        background-color: ${({ theme }) => theme.colors.surface.secondary};
      }
    `}

  // Responsive adjustments
  ${media.maxSm(css`
    padding: ${({ theme }) => theme.spacing['1']} ${({ theme }) => theme.spacing['2']};
    min-width: 36px;
  `)}
`;

export const ToggleIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 1.25rem;
    height: 1.25rem;
    transition: transform ${({ theme }) => theme.transitions.duration.fast} ease;
  }

  ${media.maxSm(css`
    svg {
      width: 1rem;
      height: 1rem;
    }
  `)}
`;

export const ToggleLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  white-space: nowrap;

  ${media.maxSm(css`
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
  `)}
`;

export const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  margin-top: ${({ theme }) => theme.spacing['1']};
  padding: ${({ theme }) => theme.spacing['1']};
  background-color: ${({ theme }) => theme.colors.surface.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.boxShadow.lg};
  opacity: 0;
  transform: translateY(-8px);
  animation: dropdownEnter 0.2s ease forwards;

  @keyframes dropdownEnter {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Arrow pointing up */
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid ${({ theme }) => theme.colors.surface.primary};
  }

  &::after {
    content: '';
    position: absolute;
    top: -7px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 7px solid ${({ theme }) => theme.colors.border.primary};
  }

  ${media.maxSm(css`
    left: auto;
    right: 0;
    min-width: 120px;

    &::before,
    &::after {
      left: auto;
      right: 16px;
      transform: none;
    }
  `)}
`;

export const DropdownItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  text-align: left;
  transition: all ${({ theme }) => theme.transitions.duration.fast} ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface.secondary};
  }

  &:focus {
    outline: none;
    background-color: ${({ theme }) => theme.colors.surface.secondary};
    box-shadow: inset 0 0 0 2px ${({ theme }) => theme.colors.border.focus};
  }

  ${({ isSelected, theme }) =>
    isSelected &&
    css`
      background-color: ${theme.colors.interactive.primary}15;
      color: ${theme.colors.interactive.primary};

      &:hover {
        background-color: ${theme.colors.interactive.primary}20;
      }
    `}

  ${media.maxSm(css`
    padding: ${({ theme }) => theme.spacing['1']} ${({ theme }) => theme.spacing['2']};
  `)}
`;

// Additional utility components for specific use cases
export const ThemeToggleGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['1']};
  padding: ${({ theme }) => theme.spacing['1']};
  background-color: ${({ theme }) => theme.colors.surface.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};

  ${ToggleButton} {
    border: none;
    background: transparent;
    border-radius: ${({ theme }) => theme.borderRadius.md};

    &:hover {
      background-color: ${({ theme }) => theme.colors.surface.primary};
    }

    ${({ activeTheme, theme }) =>
      css`
        &[data-theme="${activeTheme}"] {
          background-color: ${theme.colors.surface.primary};
          box-shadow: ${theme.boxShadow.sm};
        }
      `}
  }
`;

export const MiniThemeToggle = styled(ToggleButton)`
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  min-width: auto;

  ${ToggleIcon} svg {
    width: 14px;
    height: 14px;
  }
`;

export default {
  ToggleWrapper,
  ToggleButton,
  ToggleIcon,
  ToggleLabel,
  DropdownMenu,
  DropdownItem,
  ThemeToggleGroup,
  MiniThemeToggle
};