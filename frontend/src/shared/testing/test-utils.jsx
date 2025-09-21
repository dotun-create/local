/**
 * Test Utilities
 * Custom testing utilities for the new architecture
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { BrowserRouter } from 'react-router-dom';
import { lightTheme } from '../styles/theme';
import { RoleProvider } from '../hooks/useMultiRoleAuth';

// Default theme for testing
const defaultTheme = lightTheme;

// Mock store provider
const MockStoreProvider = ({ children, initialState = {} }) => {
  return children;
};

// Test wrapper component
const TestWrapper = ({
  children,
  theme = defaultTheme,
  router = true,
  store = true,
  roles = true,
  initialStoreState = {}
}) => {
  let wrappedChildren = children;

  // Add theme provider
  wrappedChildren = (
    <ThemeProvider theme={theme}>
      {wrappedChildren}
    </ThemeProvider>
  );

  // Add router if needed
  if (router) {
    wrappedChildren = (
      <BrowserRouter>
        {wrappedChildren}
      </BrowserRouter>
    );
  }

  // Add store provider if needed
  if (store) {
    wrappedChildren = (
      <MockStoreProvider initialState={initialStoreState}>
        {wrappedChildren}
      </MockStoreProvider>
    );
  }

  // Add role provider if needed
  if (roles) {
    wrappedChildren = (
      <RoleProvider>
        {wrappedChildren}
      </RoleProvider>
    );
  }

  return wrappedChildren;
};

// Custom render function
export const renderWithProviders = (ui, options = {}) => {
  const {
    theme = defaultTheme,
    router = true,
    store = true,
    roles = true,
    initialStoreState = {},
    ...renderOptions
  } = options;

  const Wrapper = ({ children }) => (
    <TestWrapper
      theme={theme}
      router={router}
      store={store}
      roles={roles}
      initialStoreState={initialStoreState}
    >
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Custom render for component testing without providers
export const renderComponent = (ui, options = {}) => {
  return render(ui, options);
};

// Custom render for route testing
export const renderWithRouter = (ui, { route = '/', ...options } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return renderWithProviders(ui, { ...options, router: true });
};

// Utility functions for common test scenarios
export const mockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  roles: ['student'],
  ...overrides
});

export const mockCourse = (overrides = {}) => ({
  id: '1',
  title: 'Test Course',
  description: 'A test course',
  instructor: 'Test Instructor',
  ...overrides
});

export const mockAuthState = (overrides = {}) => ({
  isAuthenticated: true,
  user: mockUser(),
  loading: false,
  error: null,
  ...overrides
});

// Test helpers for async operations
export const waitForElementToBeRemoved = async (element) => {
  return waitFor(() => {
    expect(element).not.toBeInTheDocument();
  });
};

export const waitForLoadingToFinish = async () => {
  return waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

// Event simulation helpers
export const simulateNetworkDelay = (ms = 100) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const triggerResize = (width = 1024, height = 768) => {
  global.innerWidth = width;
  global.innerHeight = height;
  global.dispatchEvent(new Event('resize'));
};

export const triggerMediaQueryChange = (matches = false) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.matches = matches;
  if (mediaQuery.onchange) {
    mediaQuery.onchange({ matches });
  }
};

// Form testing helpers
export const fillForm = async (fields) => {
  for (const [label, value] of Object.entries(fields)) {
    const field = screen.getByLabelText(new RegExp(label, 'i'));
    fireEvent.change(field, { target: { value } });
  }
};

export const submitForm = async (buttonText = 'submit') => {
  const submitButton = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  fireEvent.click(submitButton);
};

// Component testing utilities
export const getComponentTestId = (component, variant = '') => {
  const baseId = component.toLowerCase().replace(/([A-Z])/g, '-$1');
  return variant ? `${baseId}-${variant}` : baseId;
};

// Performance testing utilities
export const measureRenderTime = async (renderFn) => {
  const start = performance.now();
  const result = await renderFn();
  const end = performance.now();
  return {
    result,
    renderTime: end - start
  };
};

// Accessibility testing helpers
export const checkAccessibility = async (container) => {
  // Basic accessibility checks
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  return {
    focusableElements: focusableElements.length,
    hasAriaLabels: Array.from(focusableElements).every(el =>
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.textContent.trim()
    )
  };
};

// Route testing utilities
export const mockNavigate = jest.fn();
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null
};

// Mock API responses
export const mockApiResponse = (data, delay = 0) => {
  return new Promise(resolve => {
    setTimeout(() => resolve({ data }), delay);
  });
};

export const mockApiError = (error, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(error)), delay);
  });
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Default export for convenience
export default {
  renderWithProviders,
  renderComponent,
  renderWithRouter,
  mockUser,
  mockCourse,
  mockAuthState,
  waitForLoadingToFinish,
  simulateNetworkDelay,
  triggerResize,
  fillForm,
  submitForm,
  checkAccessibility,
  mockApiResponse,
  mockApiError
};