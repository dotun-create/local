# TroupeDev Frontend Architecture

## Overview

The TroupeDev frontend has been completely refactored from a legacy component-based structure to a modern, scalable feature-based architecture. This document outlines the new architecture, design decisions, and best practices for development.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Design System](#design-system)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Routing & Navigation](#routing--navigation)
- [Testing Strategy](#testing-strategy)
- [Performance Optimization](#performance-optimization)
- [Development Guidelines](#development-guidelines)

## Architecture Overview

### Core Principles

1. **Feature-Based Organization**: Code is organized by business features rather than technical layers
2. **Component Encapsulation**: Each component is self-contained with its own styles, tests, and logic
3. **Design System**: Consistent design tokens and reusable components across the application
4. **Performance First**: Lazy loading, code splitting, and optimized bundles
5. **Testing-Driven**: Comprehensive testing strategy with utilities and examples
6. **Accessibility**: WCAG 2.1 AA compliance built into all components

### Technology Stack

- **React 18**: Latest React with concurrent features
- **Styled Components**: CSS-in-JS for component styling
- **React Router v6**: Client-side routing
- **Jest + React Testing Library**: Testing framework
- **Webpack 5**: Module bundling with advanced optimizations
- **ESLint + Prettier**: Code quality and formatting

## Directory Structure

```
src/
├── features/                    # Feature-based modules
│   ├── auth/                   # Authentication feature
│   │   ├── components/         # Feature-specific components
│   │   ├── hooks/              # Feature-specific hooks
│   │   ├── services/           # Feature-specific services
│   │   ├── __tests__/          # Feature tests
│   │   └── index.js            # Feature exports
│   ├── admin/                  # Admin management
│   ├── dashboard/              # Dashboard functionality
│   ├── calendar/               # Calendar & scheduling
│   ├── payments/               # Payment processing
│   ├── courses/                # Course management
│   └── notifications/          # Notification system
│
├── shared/                     # Shared utilities and components
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Basic UI elements (Button, Input, etc.)
│   │   ├── layout/             # Layout components
│   │   ├── forms/              # Form components
│   │   └── __tests__/          # Component tests
│   ├── hooks/                  # Shared React hooks
│   ├── services/               # Shared services and APIs
│   ├── utils/                  # Utility functions
│   ├── styles/                 # Theme and styling
│   │   ├── theme.js            # Styled-components theme
│   │   └── GlobalStyles.js     # Global styles
│   ├── design-system/          # Design tokens
│   │   └── tokens.js           # Design system tokens
│   ├── testing/                # Testing utilities
│   │   ├── test-utils.jsx      # Custom render functions
│   │   └── test-setup.js       # Test configuration
│   └── constants/              # Application constants
│
├── __tests__/                  # Integration and E2E tests
│   ├── integration/            # Integration test suites
│   └── baseline/               # Baseline/regression tests
│
├── resources/                  # Static assets
│   └── images/                 # Image assets
│
├── index.js                    # Application entry point
├── App.jsx                     # Root component
└── setupTests.js               # Test setup
```

## Design System

### Design Tokens

The design system is built on a comprehensive set of design tokens defined in `src/shared/design-system/tokens.js`:

```javascript
export const DESIGN_TOKENS = {
  colors: {
    primary: { 50: '#f0f9ff', 500: '#0ea5e9', 900: '#0c4a6e' },
    secondary: { 50: '#fafaf9', 500: '#78716c', 900: '#1c1917' },
    // ... more color scales
  },
  spacing: { 1: '0.25rem', 2: '0.5rem', /* ... */ },
  typography: {
    fontFamily: { sans: ['Inter', 'system-ui'] },
    fontSize: { xs: '0.75rem', sm: '0.875rem', /* ... */ },
  },
  // ... more tokens
};
```

### Theme Configuration

Styled-components theme provides a clean API for accessing design tokens:

```javascript
// Light theme example
const StyledButton = styled.button`
  background: ${({ theme }) => theme.colors.interactive.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  border-radius: ${({ theme }) => theme.radii.md};
`;
```

### Responsive Design

The system includes responsive utilities and breakpoints:

```javascript
import { media } from '@shared/styles/theme';

const ResponsiveComponent = styled.div`
  padding: ${({ theme }) => theme.space[4]};

  ${media.md} {
    padding: ${({ theme }) => theme.space[8]};
  }
`;
```

## Component Architecture

### Component Categories

1. **Feature Components**: Business logic components within feature directories
2. **Shared UI Components**: Reusable interface elements in `shared/components/ui/`
3. **Layout Components**: Page structure components in `shared/components/layout/`
4. **Form Components**: Form-specific components in `shared/components/forms/`

### Component Structure

Each component follows a consistent structure:

```javascript
// Button.jsx
import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const StyledButton = styled.button`
  /* Styled-components styles */
`;

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

export default Button;
```

### Component Best Practices

1. **Single Responsibility**: Each component has one clear purpose
2. **Prop Validation**: Use PropTypes for type checking
3. **Accessibility**: Include ARIA attributes and semantic HTML
4. **Performance**: Use React.memo for expensive components
5. **Testing**: Include comprehensive test coverage

## State Management

### Local State

Use React's built-in state management for component-specific state:

```javascript
import { useState, useEffect } from 'react';

const useLocalState = (initialState) => {
  const [state, setState] = useState(initialState);

  // Local state logic here

  return { state, setState };
};
```

### Shared State

For feature-specific shared state, use custom hooks:

```javascript
// features/auth/hooks/useAuth.js
import { useState, useContext } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Authentication logic

  return { user, loading, login, logout };
};
```

### Global State

For application-wide state, use Context API or consider Redux Toolkit for complex scenarios.

## Routing & Navigation

### Route Organization

Routes are organized by features with lazy loading:

```javascript
// Route configuration example
const routes = [
  {
    path: '/auth',
    element: lazy(() => import('@features/auth/pages/AuthPage')),
    children: [
      { path: 'login', element: lazy(() => import('@features/auth/components/LoginForm')) },
      { path: 'signup', element: lazy(() => import('@features/auth/components/SignupForm')) },
    ]
  },
  {
    path: '/dashboard',
    element: lazy(() => import('@features/dashboard/pages/DashboardPage')),
    guard: 'authenticated',
  },
];
```

### Route Guards

Protected routes use role-based guards:

```javascript
const ProtectedRoute = ({ children, roles = [], fallback = '/login' }) => {
  const { user, hasRole } = useAuth();

  if (!user) {
    return <Navigate to={fallback} replace />;
  }

  if (roles.length > 0 && !roles.some(role => hasRole(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
```

## Testing Strategy

### Testing Utilities

Custom testing utilities provide consistent setup:

```javascript
// shared/testing/test-utils.jsx
import { renderWithProviders } from '@shared/testing/test-utils';

export const renderWithProviders = (ui, options = {}) => {
  const { theme = lightTheme, router = true, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={theme}>
        {router ? <BrowserRouter>{children}</BrowserRouter> : children}
      </ThemeProvider>
    ),
    ...renderOptions
  });
};
```

### Test Categories

1. **Unit Tests**: Component and utility function tests
2. **Integration Tests**: Feature interaction tests
3. **User Journey Tests**: End-to-end user workflow tests
4. **Performance Tests**: Performance benchmarking tests

### Testing Best Practices

1. **Test Behavior, Not Implementation**: Focus on user interactions
2. **Accessibility Testing**: Include screen reader and keyboard navigation tests
3. **Performance Testing**: Monitor render times and memory usage
4. **Visual Regression**: Test component visual consistency

## Performance Optimization

### Code Splitting

- **Route-level splitting**: Each major route is a separate chunk
- **Feature-level splitting**: Features are bundled separately
- **Component-level splitting**: Heavy components use React.lazy

### Bundle Optimization

Webpack configuration includes:

```javascript
const optimization = {
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 20
      },
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
        name: 'react',
        priority: 15
      },
      shared: {
        test: /[\\/]src[\\/]shared[\\/]/,
        name: 'shared',
        priority: 10
      }
    }
  }
};
```

### Performance Monitoring

Built-in performance monitoring tracks:

- Core Web Vitals (LCP, FID, CLS)
- Bundle sizes and loading times
- Component render performance
- Memory usage patterns

## Development Guidelines

### File Naming Conventions

- **Components**: PascalCase (e.g., `LoginForm.jsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth.js`)
- **Utilities**: camelCase (e.g., `formatDate.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.js`)

### Import Organization

Use path aliases for clean imports:

```javascript
// Good
import { Button } from '@shared/components/ui';
import { useAuth } from '@features/auth/hooks';

// Avoid
import { Button } from '../../../shared/components/ui/Button';
```

### Code Style

- Use ESLint and Prettier for consistent formatting
- Prefer functional components with hooks
- Use TypeScript types for better development experience
- Follow accessibility guidelines (WCAG 2.1 AA)

### Git Workflow

1. **Feature Branches**: Create branches from `main` for new features
2. **Commit Messages**: Use conventional commit format
3. **Pull Requests**: Require code review and tests
4. **CI/CD**: Automated testing and deployment

## Migration Guide

For teams transitioning to this architecture, see the detailed migration guide in `MIGRATION.md`.

## Performance Monitoring

The application includes comprehensive performance monitoring tools:

- Real-time performance dashboard
- Bundle size tracking
- Core Web Vitals monitoring
- Memory usage analysis

Access the performance dashboard at `/performance` (development mode).

---

*This documentation is maintained alongside the codebase. Please update it when making architectural changes.*