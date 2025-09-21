/**
 * Global Styles using styled-components
 * Replaces global CSS with styled-components global styles
 */

import styled, { createGlobalStyle, css } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  /* CSS Reset */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Root styles with CSS custom properties */
  :root {
    /* Theme CSS variables - updated by theme provider */
    --color-background-primary: ${({ theme }) => theme.colors.background.primary};
    --color-background-secondary: ${({ theme }) => theme.colors.background.secondary};
    --color-text-primary: ${({ theme }) => theme.colors.text.primary};
    --color-text-secondary: ${({ theme }) => theme.colors.text.secondary};
    --color-border-primary: ${({ theme }) => theme.colors.border.primary};
    --color-interactive-primary: ${({ theme }) => theme.colors.interactive.primary};

    /* Color scheme for system integration */
    color-scheme: ${({ theme }) => theme.mode};
  }

  html {
    font-size: 16px;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scroll-behavior: smooth;

    /* Respect user's reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      scroll-behavior: auto;

      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  }

  body {
    font-family: ${({ theme }) => theme.fonts.primary};
    font-size: ${({ theme }) => theme.fontSizes.md};
    font-weight: ${({ theme }) => theme.fontWeights.normal};
    line-height: ${({ theme }) => theme.lineHeights.normal};
    color: ${({ theme }) => theme.colors.text.primary};
    background-color: ${({ theme }) => theme.colors.background.primary};
    transition: color ${({ theme }) => theme.transitions.normal},
                background-color ${({ theme }) => theme.transitions.normal};
    overflow-x: hidden;
  }

  /* Focus styles */
  *:focus {
    outline: 2px solid ${({ theme }) => theme.colors.border.focus};
    outline-offset: 2px;
  }

  *:focus:not(:focus-visible) {
    outline: none;
  }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.primary};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    line-height: ${({ theme }) => theme.lineHeights.tight};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: ${({ theme }) => theme.space[2]};
  }

  h1 {
    font-size: ${({ theme }) => theme.fontSizes['3xl']};
  }

  h2 {
    font-size: ${({ theme }) => theme.fontSizes['2xl']};
  }

  h3 {
    font-size: ${({ theme }) => theme.fontSizes.xl};
  }

  h4 {
    font-size: ${({ theme }) => theme.fontSizes.lg};
  }

  h5 {
    font-size: ${({ theme }) => theme.fontSizes.md};
  }

  h6 {
    font-size: ${({ theme }) => theme.fontSizes.sm};
  }

  p {
    margin-bottom: ${({ theme }) => theme.space[3]};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  /* Links */
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.fast};

    &:hover {
      color: ${({ theme }) => theme.colors.primaryDark};
      text-decoration: underline;
    }

    &:focus {
      outline: 2px solid ${({ theme }) => theme.colors.border.focus};
      outline-offset: 2px;
    }
  }

  /* Lists */
  ul, ol {
    margin-bottom: ${({ theme }) => theme.space[3]};
    padding-left: ${({ theme }) => theme.space[4]};
  }

  li {
    margin-bottom: ${({ theme }) => theme.space[1]};
  }

  /* Code */
  code, pre {
    font-family: ${({ theme }) => theme.fonts.monospace};
    font-size: ${({ theme }) => theme.fontSizes.sm};
  }

  code {
    background-color: ${({ theme }) => theme.colors.surface.secondary};
    padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[2]};
    border-radius: ${({ theme }) => theme.radii.sm};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  pre {
    background-color: ${({ theme }) => theme.colors.surface.secondary};
    padding: ${({ theme }) => theme.space[3]};
    border-radius: ${({ theme }) => theme.radii.md};
    overflow-x: auto;
    margin-bottom: ${({ theme }) => theme.space[3]};

    code {
      background: none;
      padding: 0;
    }
  }

  /* Form elements */
  input, textarea, select, button {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    margin: 0;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  /* Images */
  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: ${({ theme }) => theme.space[3]};
  }

  th, td {
    text-align: left;
    padding: ${({ theme }) => theme.space[2]};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
  }

  th {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    background-color: ${({ theme }) => theme.colors.surface.secondary};
  }

  /* Scrollbars */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.surface.secondary};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.neutral[400]};
    border-radius: ${({ theme }) => theme.radii.full};

    &:hover {
      background: ${({ theme }) => theme.colors.neutral[500]};
    }
  }

  /* Selection */
  ::selection {
    background-color: ${({ theme }) => theme.colors.primary};
    color: white;
  }

  /* Loading state */
  .loading {
    opacity: 0.6;
    pointer-events: none;
    user-select: none;
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* Utility classes */
  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  .fade-in-up {
    animation: fadeInUp 0.3s ease-out;
  }

  .slide-in-right {
    animation: slideInRight 0.3s ease-out;
  }

  .slide-in-left {
    animation: slideInLeft 0.3s ease-out;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  .pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Print styles */
  @media print {
    * {
      background: transparent !important;
      color: black !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    a, a:visited {
      text-decoration: underline;
    }

    abbr[title]:after {
      content: " (" attr(title) ")";
    }

    pre, blockquote {
      border: 1px solid #999;
      page-break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }

    tr, img {
      page-break-inside: avoid;
    }

    img {
      max-width: 100% !important;
    }

    p, h2, h3 {
      orphans: 3;
      widows: 3;
    }

    h2, h3 {
      page-break-after: avoid;
    }
  }
`;

export default GlobalStyles;