# Development Guide

A comprehensive guide for developers working on the TroupeDev frontend.

## 🛠️ Development Environment

### Prerequisites

- **Node.js**: 16.0.0 or higher
- **npm**: 8.0.0 or higher
- **Git**: Latest version
- **IDE**: VS Code (recommended with extensions)

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "styled-components.vscode-styled-components",
    "ms-vscode.vscode-typescript-next",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### Environment Setup

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd frontend
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your settings
   ```

3. **Start Development**
   ```bash
   npm start
   ```

## 📁 Project Structure Deep Dive

### Feature Organization

Each feature follows this structure:

```
src/features/[feature-name]/
├── components/         # Feature-specific components
│   ├── ComponentName.jsx
│   └── index.js       # Component exports
├── hooks/             # Feature-specific hooks
│   ├── useFeature.js
│   └── index.js       # Hook exports
├── services/          # Feature-specific services
│   ├── featureService.js
│   └── index.js       # Service exports
├── __tests__/         # Feature tests
│   ├── ComponentName.test.jsx
│   └── featureService.test.js
├── types.js           # TypeScript types (if using TS)
└── index.js           # Feature public API
```

### Shared Organization

```
src/shared/
├── components/        # Reusable UI components
│   ├── ui/           # Basic UI elements
│   ├── layout/       # Layout components
│   ├── forms/        # Form components
│   └── feedback/     # Loading, error components
├── hooks/            # Shared React hooks
├── services/         # Shared services
├── utils/            # Utility functions
├── styles/           # Theme and global styles
├── constants/        # Application constants
└── testing/          # Testing utilities
```

## 🎨 Styling Guidelines

### Design Tokens

Use design tokens for all styling:

```javascript
// ✅ Good - Using design tokens
const Button = styled.button`
  background: ${({ theme }) => theme.colors.interactive.primary};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// ❌ Avoid - Hardcoded values
const Button = styled.button`
  background: #0ea5e9;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
`;
```

### Component Styling Patterns

#### 1. Basic Styled Component

```javascript
import styled from 'styled-components';

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[4]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;
```

#### 2. Conditional Styling

```javascript
const Button = styled.button`
  background: ${({ theme, variant }) =>
    variant === 'primary'
      ? theme.colors.interactive.primary
      : theme.colors.interactive.secondary
  };

  ${({ disabled, theme }) => disabled && `
    opacity: 0.5;
    cursor: not-allowed;
    background: ${theme.colors.neutral[300]};
  `}
`;
```

#### 3. Responsive Styling

```javascript
import { media } from '@shared/styles/theme';

const ResponsiveGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space[4]};

  ${media.md} {
    grid-template-columns: repeat(2, 1fr);
    gap: ${({ theme }) => theme.space[6]};
  }

  ${media.lg} {
    grid-template-columns: repeat(3, 1fr);
  }
`;
```

#### 4. Theme-aware Components

```javascript
const ThemedComponent = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.background.primary
      : theme.colors.surface.primary
  };

  color: ${({ theme }) => theme.colors.text.primary};

  @media (prefers-color-scheme: dark) {
    background: ${({ theme }) => theme.colors.background.primary};
  }
`;
```

### Animation Guidelines

```javascript
const AnimatedButton = styled.button`
  transition: ${({ theme }) => theme.transitions.normal};
  transform: translateY(0);

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }

  &:active {
    transform: translateY(0);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
  }
`;
```

## 🔧 Component Development

### Component Template

```javascript
import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

// Styled components
const ComponentContainer = styled.div`
  /* Styles */
`;

// Component implementation
const ComponentName = ({
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  onClick,
  ...props
}) => {
  return (
    <ComponentContainer
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </ComponentContainer>
  );
};

// PropTypes
ComponentName.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'primary', 'secondary']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

export default ComponentName;
```

### Hooks Development

#### Custom Hook Template

```javascript
import { useState, useEffect, useCallback } from 'react';

export const useCustomHook = (initialValue) => {
  const [state, setState] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performAction = useCallback(async (params) => {
    setLoading(true);
    setError(null);

    try {
      // Perform action
      const result = await someAsyncOperation(params);
      setState(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    state,
    loading,
    error,
    performAction,
  };
};
```

#### Hook with Cleanup

```javascript
import { useEffect, useRef } from 'react';

export const useCleanupHook = () => {
  const timeoutRef = useRef();
  const subscriptionRef = useRef();

  useEffect(() => {
    // Setup
    subscriptionRef.current = subscribe();

    return () => {
      // Cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);
};
```

### Service Development

#### Service Template

```javascript
import { httpClient } from '@shared/services/httpClient';
import { handleApiError } from '@shared/utils/errorHandlers';

class FeatureService {
  constructor() {
    this.baseUrl = '/api/feature';
  }

  async getItems(params = {}) {
    try {
      const response = await httpClient.get(this.baseUrl, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createItem(data) {
    try {
      const response = await httpClient.post(this.baseUrl, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateItem(id, data) {
    try {
      const response = await httpClient.put(`${this.baseUrl}/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteItem(id) {
    try {
      await httpClient.delete(`${this.baseUrl}/${id}`);
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const featureService = new FeatureService();
export default featureService;
```

## 🧪 Testing Guidelines

### Testing Strategy

1. **Unit Tests**: Individual components and functions
2. **Integration Tests**: Feature workflows
3. **User Journey Tests**: Complete user flows
4. **Performance Tests**: Render performance and memory

### Component Testing

```javascript
import { renderWithProviders, screen, fireEvent, waitFor } from '@shared/testing/test-utils';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  // Default props for testing
  const defaultProps = {
    title: 'Test Title',
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      renderWithProviders(<ComponentName {...defaultProps} />);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render with different variants', () => {
      const variants = ['primary', 'secondary', 'outline'];

      variants.forEach(variant => {
        const { unmount } = renderWithProviders(
          <ComponentName {...defaultProps} variant={variant} />
        );

        // Test variant-specific behavior

        unmount();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle click events', async () => {
      renderWithProviders(<ComponentName {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
      });
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<ComponentName {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: 'Enter' });
      expect(defaultProps.onAction).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<ComponentName {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });

    it('should support screen readers', () => {
      renderWithProviders(<ComponentName {...defaultProps} />);

      // Test screen reader accessibility
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should handle error states gracefully', () => {
      renderWithProviders(
        <ComponentName {...defaultProps} error="Something went wrong" />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
```

### Hook Testing

```javascript
import { renderHook, act } from '@testing-library/react';
import { useCustomHook } from '../useCustomHook';

describe('useCustomHook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCustomHook('initial'));

    expect(result.current.state).toBe('initial');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle async operations', async () => {
    const { result } = renderHook(() => useCustomHook());

    await act(async () => {
      await result.current.performAction('test-params');
    });

    expect(result.current.loading).toBe(false);
    // Test results
  });
});
```

### Integration Testing

```javascript
import { renderWithProviders, screen, waitFor } from '@shared/testing/test-utils';
import { FeatureWorkflow } from '../FeatureWorkflow';

describe('Feature Integration', () => {
  it('should complete full user workflow', async () => {
    renderWithProviders(<FeatureWorkflow />);

    // Step 1: Initial state
    expect(screen.getByText('Welcome')).toBeInTheDocument();

    // Step 2: User action
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    // Step 3: Wait for async operation
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    // Step 4: Verify final state
    expect(screen.queryByText('Welcome')).not.toBeInTheDocument();
  });
});
```

## 🚀 Performance Guidelines

### Component Optimization

```javascript
import React, { memo, useMemo, useCallback } from 'react';

const OptimizedComponent = memo(({ items, onItemClick }) => {
  // Memoize expensive calculations
  const processedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      processed: expensiveCalculation(item)
    }));
  }, [items]);

  // Memoize event handlers
  const handleClick = useCallback((item) => {
    onItemClick(item.id);
  }, [onItemClick]);

  return (
    <div>
      {processedItems.map(item => (
        <ItemComponent
          key={item.id}
          item={item}
          onClick={handleClick}
        />
      ))}
    </div>
  );
});
```

### Lazy Loading

```javascript
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@shared/components/feedback';

// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

const ParentComponent = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
};
```

### Bundle Optimization

```javascript
// Dynamic imports for code splitting
const loadFeature = async () => {
  const { FeatureComponent } = await import('@features/feature/components');
  return FeatureComponent;
};

// Conditional imports
const loadPolyfill = async () => {
  if (!window.IntersectionObserver) {
    await import('intersection-observer');
  }
};
```

## 🔍 Debugging Guidelines

### Development Tools

1. **React Developer Tools**: Component inspection
2. **Performance Dashboard**: Built-in performance monitoring
3. **Bundle Analyzer**: `npm run analyze`
4. **Network Tab**: Monitor API calls and bundle loading

### Common Issues and Solutions

#### 1. Component Not Re-rendering

```javascript
// Problem: Object mutation
const [state, setState] = useState({ items: [] });
state.items.push(newItem); // ❌ Mutation

// Solution: Immutable updates
setState(prev => ({
  ...prev,
  items: [...prev.items, newItem]
})); // ✅ Immutable
```

#### 2. Memory Leaks

```javascript
// Problem: Missing cleanup
useEffect(() => {
  const subscription = subscribe();
  // ❌ No cleanup
}, []);

// Solution: Proper cleanup
useEffect(() => {
  const subscription = subscribe();
  return () => subscription.unsubscribe(); // ✅ Cleanup
}, []);
```

#### 3. Performance Issues

```javascript
// Problem: Expensive operations in render
const Component = ({ items }) => {
  const expensiveResult = expensiveCalculation(items); // ❌ Every render
  return <div>{expensiveResult}</div>;
};

// Solution: Memoization
const Component = ({ items }) => {
  const expensiveResult = useMemo(
    () => expensiveCalculation(items),
    [items]
  ); // ✅ Memoized
  return <div>{expensiveResult}</div>;
};
```

## 📋 Code Review Checklist

### Before Submitting PR

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No console.log statements
- [ ] Proper error handling
- [ ] Accessibility considerations
- [ ] Performance optimizations applied
- [ ] Documentation updated

### Review Criteria

1. **Functionality**: Does it work as expected?
2. **Code Quality**: Is it readable and maintainable?
3. **Performance**: Are there any performance concerns?
4. **Testing**: Are there adequate tests?
5. **Accessibility**: Is it accessible to all users?
6. **Security**: Are there any security vulnerabilities?

## 📚 Additional Resources

### Documentation

- [React Documentation](https://reactjs.org/docs)
- [Styled Components](https://styled-components.com/docs)
- [Testing Library](https://testing-library.com/docs)
- [Webpack](https://webpack.js.org/concepts)

### Internal Resources

- [Component Library](./docs/components.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)

---

*This guide is a living document. Please contribute improvements and updates as the project evolves.*