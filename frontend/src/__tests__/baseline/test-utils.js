/**
 * Test utilities and helpers for baseline and regression testing
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RoleProvider } from '../../shared/hooks/useMultiRoleAuth';

// Common test providers wrapper
export const TestProviders = ({ children, initialRole = 'student' }) => {
  return (
    <BrowserRouter>
      <RoleProvider>
        {children}
      </RoleProvider>
    </BrowserRouter>
  );
};

// Custom render function with providers
export const renderWithProviders = (ui, options = {}) => {
  const { initialRole, ...renderOptions } = options;

  const Wrapper = ({ children }) => (
    <TestProviders initialRole={initialRole}>
      {children}
    </TestProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock data generators
export const createMockUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  roles: ['student'],
  permissions: {
    can_access_student_dashboard: true
  },
  ...overrides
});

export const createMockCourse = (overrides = {}) => ({
  id: 1,
  title: 'Test Course',
  description: 'Test Description',
  instructor: 'Test Instructor',
  price: 99.99,
  modules: [],
  ...overrides
});

export const createMockNotification = (overrides = {}) => ({
  id: 1,
  type: 'info',
  title: 'Test Notification',
  message: 'Test message',
  timestamp: new Date().toISOString(),
  read: false,
  ...overrides
});

// Common test assertions
export const expectElementToHaveRole = (element, role) => {
  expect(element).toHaveAttribute('role', role);
};

export const expectLoadingState = (element) => {
  expect(element).toHaveTextContent(/loading/i);
};

export const expectErrorState = (element, errorMessage) => {
  expect(element).toHaveTextContent(errorMessage);
};

// Mock service responses
export const mockSuccessResponse = (data) => Promise.resolve(data);
export const mockErrorResponse = (error) => Promise.reject(new Error(error));

export default {
  TestProviders,
  renderWithProviders,
  createMockUser,
  createMockCourse,
  createMockNotification,
  expectElementToHaveRole,
  expectLoadingState,
  expectErrorState,
  mockSuccessResponse,
  mockErrorResponse
};