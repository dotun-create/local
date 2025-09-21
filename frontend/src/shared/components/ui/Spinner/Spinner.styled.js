/**
 * Spinner Styled Components
 * Styled components for loading spinners
 */

import styled, { css, keyframes } from 'styled-components';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

export const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing?.['2'] || '0.5rem'};

  ${({ fullScreen }) =>
    fullScreen &&
    css`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.8);
      z-index: 9999;
    `}
`;

export const SpinnerElement = styled.div`
  border-radius: 50%;
  border: 2px solid transparent;
  animation: ${spin} 1s linear infinite;

  ${({ size = 'md' }) => {
    const sizes = {
      xs: css`
        width: 16px;
        height: 16px;
        border-width: 2px;
      `,
      sm: css`
        width: 20px;
        height: 20px;
        border-width: 2px;
      `,
      md: css`
        width: 32px;
        height: 32px;
        border-width: 3px;
      `,
      lg: css`
        width: 48px;
        height: 48px;
        border-width: 4px;
      `,
      xl: css`
        width: 64px;
        height: 64px;
        border-width: 4px;
      `
    };
    return sizes[size];
  }}

  ${({ variant = 'primary', theme }) => {
    const variants = {
      primary: css`
        border-top-color: ${theme?.colors?.interactive?.primary || '#0066cc'};
        border-right-color: ${theme?.colors?.interactive?.primary || '#0066cc'}40;
        border-bottom-color: ${theme?.colors?.interactive?.primary || '#0066cc'}40;
        border-left-color: ${theme?.colors?.interactive?.primary || '#0066cc'}40;
      `,
      secondary: css`
        border-top-color: ${theme?.colors?.interactive?.secondary || '#6b7280'};
        border-right-color: ${theme?.colors?.interactive?.secondary || '#6b7280'}40;
        border-bottom-color: ${theme?.colors?.interactive?.secondary || '#6b7280'}40;
        border-left-color: ${theme?.colors?.interactive?.secondary || '#6b7280'}40;
      `,
      light: css`
        border-top-color: #ffffff;
        border-right-color: #ffffff40;
        border-bottom-color: #ffffff40;
        border-left-color: #ffffff40;
      `,
      dark: css`
        border-top-color: #1a1a1a;
        border-right-color: #1a1a1a40;
        border-bottom-color: #1a1a1a40;
        border-left-color: #1a1a1a40;
      `
    };
    return variants[variant];
  }}

  @media (prefers-reduced-motion: reduce) {
    animation: ${pulse} 1.5s ease-in-out infinite;
  }
`;

export const SpinnerText = styled.div`
  color: ${({ theme }) => theme?.colors?.text?.secondary || '#6b7280'};
  text-align: center;

  ${({ size = 'md' }) => {
    const sizes = {
      xs: css`
        font-size: 0.75rem;
      `,
      sm: css`
        font-size: 0.875rem;
      `,
      md: css`
        font-size: 1rem;
      `,
      lg: css`
        font-size: 1.125rem;
      `,
      xl: css`
        font-size: 1.25rem;
      `
    };
    return sizes[size];
  }}
`;

export default {
  SpinnerContainer,
  SpinnerElement,
  SpinnerText
};