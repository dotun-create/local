# Migration Guide: Legacy to Feature-Based Architecture

This guide helps team members transition from the legacy component-based structure to the new feature-based architecture.

## 📋 Table of Contents

- [Overview](#overview)
- [Before You Start](#before-you-start)
- [Migration Steps](#migration-steps)
- [Code Changes](#code-changes)
- [Testing Migration](#testing-migration)
- [Common Pitfalls](#common-pitfalls)
- [Team Guidelines](#team-guidelines)
- [Resources](#resources)

## 🎯 Overview

### What Changed

| Aspect | Legacy | New Architecture |
|--------|--------|------------------|
| **Organization** | Component-based (`src/components/`) | Feature-based (`src/features/`) |
| **Styling** | CSS files | Styled-components with design tokens |
| **State** | Mixed patterns | Structured hooks and context |
| **Testing** | Basic test setup | Comprehensive testing utilities |
| **Routing** | Simple routes | Lazy-loaded, role-protected routes |
| **Performance** | Basic optimization | Advanced code splitting & monitoring |

### Migration Benefits

✅ **Better Scalability**: Features are self-contained and easier to maintain
✅ **Improved Performance**: Lazy loading and optimized bundles
✅ **Consistent Design**: Design system with reusable components
✅ **Better Testing**: Comprehensive testing utilities and patterns
✅ **Developer Experience**: Better tooling and development workflow
✅ **Code Quality**: ESLint, Prettier, and architectural guidelines

## 🚀 Before You Start

### Prerequisites

1. **Backup your work**: Commit all changes before starting migration
2. **Review new architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Set up environment**: Ensure Node.js 16+ and npm 8+
4. **Dependencies**: Run `npm install` to get new dependencies

### Understanding the New Structure

```bash
# Legacy structure
src/
├── components/          # ❌ Old way
│   ├── admin/
│   ├── auth/
│   └── common/
├── utils/               # ❌ Old way
└── App.css             # ❌ Old way

# New structure
src/
├── features/            # ✅ New way
│   ├── admin/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── __tests__/
│   └── auth/
├── shared/              # ✅ New way
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── styles/
└── __tests__/          # ✅ New way
```

## 🔄 Migration Steps

### Step 1: Understanding Feature Boundaries

Identify which components belong to which features:

| Feature | Components |
|---------|------------|
| **auth** | LoginForm, SignupForm, PasswordReset |
| **dashboard** | StudentDashboard, TutorDashboard, AdminDashboard |
| **courses** | CourseList, CourseDetail, CourseWorkspace |
| **calendar** | TutorCalendar, SessionScheduler, AvailabilityModal |
| **payments** | PaymentGateway, PaymentHistory, PaymentMethods |
| **admin** | UserManagement, SystemSettings, Analytics |

### Step 2: Migrate Components

#### 2.1 Move Component Files

```bash
# Legacy location
src/components/auth/LoginComponent.jsx

# New location
src/features/auth/components/LoginForm.jsx
```

#### 2.2 Update Component Structure

**Legacy Component:**
```javascript
// src/components/auth/LoginComponent.jsx
import React from 'react';
import './LoginComponent.css';

const LoginComponent = () => {
  return <div className="login-form">...</div>;
};

export default LoginComponent;
```

**Migrated Component:**
```javascript
// src/features/auth/components/LoginForm.jsx
import React from 'react';
import styled from 'styled-components';

const LoginContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface.primary};
  padding: ${({ theme }) => theme.space[6]};
  border-radius: ${({ theme }) => theme.radii.lg};
`;

const LoginForm = () => {
  return <LoginContainer>...</LoginContainer>;
};

export default LoginForm;
```

### Step 3: Migrate Styles

#### 3.1 Convert CSS to Styled Components

**Legacy CSS:**
```css
/* LoginComponent.css */
.login-form {
  background: #ffffff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.login-button {
  background: #0ea5e9;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
}
```

**New Styled Components:**
```javascript
import styled from 'styled-components';

const LoginContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface.primary};
  padding: ${({ theme }) => theme.space[6]};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const LoginButton = styled.button`
  background: ${({ theme }) => theme.colors.interactive.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[6]}`};
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};

  &:hover {
    background: ${({ theme }) => theme.colors.interactive.hover};
  }
`;
```

#### 3.2 Use Design Tokens

Instead of hardcoded values, use design tokens:

```javascript
// ❌ Avoid hardcoded values
const Button = styled.button`
  background: #0ea5e9;
  padding: 12px 24px;
  font-size: 16px;
`;

// ✅ Use design tokens
const Button = styled.button`
  background: ${({ theme }) => theme.colors.interactive.primary};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[6]}`};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;
```

### Step 4: Update Imports

#### 4.1 Use Path Aliases

**Legacy Imports:**
```javascript
import LoginComponent from '../../../components/auth/LoginComponent';
import { validateEmail } from '../../../utils/validation';
import Button from '../../../components/common/Button';
```

**New Imports:**
```javascript
import LoginForm from '@features/auth/components/LoginForm';
import { validateEmail } from '@shared/utils/validators';
import { Button } from '@shared/components/ui';
```

#### 4.2 Update Import Maps

The build system now uses path aliases defined in `webpack.config.js`:

```javascript
// Available aliases
'@features/*': 'src/features/*'
'@shared/*': 'src/shared/*'
'@tests/*': 'src/__tests__/*'
```

### Step 5: Migrate Services and Utilities

#### 5.1 Organize Services by Feature

**Legacy:**
```bash
src/services/
├── authService.js
├── courseService.js
├── paymentService.js
└── utils.js
```

**New:**
```bash
src/features/auth/services/
└── authService.js

src/features/courses/services/
└── courseService.js

src/shared/services/
├── api.js
└── httpClient.js

src/shared/utils/
├── validators.js
├── formatters.js
└── helpers.js
```

#### 5.2 Update Service Structure

**Legacy Service:**
```javascript
// src/services/authService.js
export const login = async (credentials) => {
  // Implementation
};
```

**New Service:**
```javascript
// src/features/auth/services/authService.js
import { httpClient } from '@shared/services/httpClient';

class AuthService {
  async login(credentials) {
    return httpClient.post('/auth/login', credentials);
  }

  async logout() {
    return httpClient.post('/auth/logout');
  }
}

export const authService = new AuthService();
export default authService;
```

### Step 6: Migrate Tests

#### 6.1 Use New Testing Utilities

**Legacy Test:**
```javascript
import { render } from '@testing-library/react';
import LoginComponent from '../LoginComponent';

test('should render login form', () => {
  render(<LoginComponent />);
  // Test implementation
});
```

**New Test:**
```javascript
import { renderWithProviders } from '@shared/testing/test-utils';
import LoginForm from '../LoginForm';

test('should render login form', () => {
  renderWithProviders(<LoginForm />);
  // Test implementation
});
```

#### 6.2 Use Testing Utilities

Take advantage of the new testing utilities:

```javascript
import {
  renderWithProviders,
  mockUser,
  mockApiResponse,
  waitForLoadingToFinish
} from '@shared/testing/test-utils';

test('should handle user login', async () => {
  const user = mockUser({ roles: ['student'] });
  const apiResponse = mockApiResponse({ user, token: 'abc123' });

  renderWithProviders(<LoginForm />);

  // Test implementation
  await waitForLoadingToFinish();
});
```

## 💡 Code Changes

### Component Migration Checklist

For each component you migrate:

- [ ] Move to appropriate feature directory
- [ ] Convert CSS to styled-components
- [ ] Use design tokens instead of hardcoded values
- [ ] Update imports to use path aliases
- [ ] Add/update PropTypes or TypeScript types
- [ ] Ensure accessibility attributes
- [ ] Write/update tests with new utilities
- [ ] Update any related documentation

### Hook Migration

**Legacy Hook:**
```javascript
// src/hooks/useAuth.js
import { useState } from 'react';

export const useAuth = () => {
  // Implementation
};
```

**New Hook:**
```javascript
// src/features/auth/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const useAuth = () => {
  // Enhanced implementation with proper service integration
};
```

### Context Migration

**Legacy Context:**
```javascript
// src/contexts/AuthContext.js
export const AuthProvider = ({ children }) => {
  // Basic implementation
};
```

**New Context:**
```javascript
// src/features/auth/context/AuthContext.jsx
import { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const authData = useAuth();

  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
```

## 🧪 Testing Migration

### Test File Organization

**Legacy:**
```bash
src/components/auth/__tests__/LoginComponent.test.js
```

**New:**
```bash
src/features/auth/__tests__/LoginForm.test.jsx
```

### Integration Tests

Create integration tests for feature workflows:

```javascript
// src/__tests__/integration/AuthFlow.test.jsx
import { renderWithProviders, mockApiResponse } from '@shared/testing/test-utils';

describe('Authentication Flow', () => {
  it('should complete login to dashboard flow', async () => {
    // Test complete user journey
  });
});
```

### Performance Tests

Add performance testing for critical components:

```javascript
import { measureRenderTime } from '@shared/testing/test-utils';

test('should render efficiently', async () => {
  const { renderTime } = await measureRenderTime(() => {
    renderWithProviders(<ExpensiveComponent />);
  });

  expect(renderTime).toBeLessThan(100); // 100ms threshold
});
```

## ⚠️ Common Pitfalls

### 1. Import Path Issues

**Problem:** Using relative imports instead of aliases
```javascript
// ❌ Avoid
import Button from '../../../shared/components/ui/Button';

// ✅ Use aliases
import { Button } from '@shared/components/ui';
```

### 2. Mixing Old and New Patterns

**Problem:** Using CSS files alongside styled-components
```javascript
// ❌ Avoid mixing patterns
import './OldStyles.css';
import styled from 'styled-components';
```

### 3. Hardcoded Theme Values

**Problem:** Not using design tokens
```javascript
// ❌ Avoid hardcoded values
const Button = styled.button`
  background: #0ea5e9;
  color: white;
`;

// ✅ Use theme
const Button = styled.button`
  background: ${({ theme }) => theme.colors.interactive.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
`;
```

### 4. Feature Boundary Violations

**Problem:** Importing between features
```javascript
// ❌ Avoid cross-feature imports
import AuthComponent from '@features/auth/components/LoginForm';

// ✅ Use shared components or proper feature exports
import { LoginForm } from '@features/auth';
```

### 5. Test Utilities

**Problem:** Not using new testing utilities
```javascript
// ❌ Basic render
import { render } from '@testing-library/react';

// ✅ Use enhanced utilities
import { renderWithProviders } from '@shared/testing/test-utils';
```

## 👥 Team Guidelines

### Communication

1. **Migration Planning**: Plan migrations in team meetings
2. **Code Reviews**: Extra attention during migration period
3. **Pair Programming**: Consider pairing for complex migrations
4. **Documentation**: Update any team documentation

### Git Strategy

1. **Feature Branches**: Create migration branches for each feature
2. **Small PRs**: Keep migration PRs focused and small
3. **Testing**: Ensure all tests pass before merging
4. **Rollback Plan**: Be ready to rollback if issues arise

### Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| **Week 1** | Setup & Planning | Environment setup, team training |
| **Week 2-3** | Core Features | Auth, Dashboard, Courses |
| **Week 4-5** | Secondary Features | Calendar, Payments, Admin |
| **Week 6** | Testing & Polish | Integration tests, performance optimization |

### Training Resources

1. **Styled Components**: [Official Documentation](https://styled-components.com/)
2. **React Testing Library**: [Testing Best Practices](https://testing-library.com/docs/react-testing-library/intro/)
3. **Webpack**: [Code Splitting Guide](https://webpack.js.org/guides/code-splitting/)
4. **Design Systems**: [Design Token Best Practices](https://designtokens.org/)

## 📚 Resources

### Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Component Library](./docs/components.md)
- [Testing Guide](./docs/testing.md)
- [Performance Guide](./docs/performance.md)

### Code Examples

Check the following for reference implementations:

- `src/features/auth/` - Complete feature example
- `src/shared/components/ui/Button/` - Component example
- `src/shared/testing/test-utils.jsx` - Testing utilities
- `src/__tests__/integration/` - Integration test examples

### Tools

- **Bundle Analyzer**: `npm run analyze`
- **Performance Dashboard**: Visit `/performance` in development
- **Storybook**: `npm run storybook` (if configured)
- **Type Checking**: `npm run type-check`

### Getting Help

1. **Team Chat**: Ask questions in development channel
2. **Code Reviews**: Request reviews for migration PRs
3. **Pair Programming**: Schedule sessions for complex migrations
4. **Documentation**: Check architecture docs first

## 🎯 Success Metrics

Track these metrics to measure migration success:

- [ ] All features migrated to new structure
- [ ] CSS files removed and replaced with styled-components
- [ ] Import statements updated to use aliases
- [ ] Tests updated and passing
- [ ] Performance metrics maintained or improved
- [ ] Bundle size optimized
- [ ] Team productivity maintained

## 🏁 Completion

You've successfully migrated when:

✅ All components use styled-components
✅ Features are properly organized
✅ Import aliases are used consistently
✅ Tests use new utilities
✅ Performance is optimized
✅ Team is comfortable with new patterns

---

**Questions?** Check the [FAQ](./docs/faq.md) or reach out to the architecture team.