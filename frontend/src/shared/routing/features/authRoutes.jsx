/**
 * Authentication Feature Routes
 * Routes related to user authentication and account management
 */

import { createLazyComponent, PageLoadingFallback } from '../../utils/lazyLoader';

// Create lazy-loaded authentication components
const createAuthComponent = (importFunction, pageName) => {
  return createLazyComponent(importFunction, {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackComponent: () => <PageLoadingFallback title={`Loading ${pageName}...`} />,
    preload: true // Preload auth components for better UX
  });
};

export const AuthComponents = {
  LoginPage: createAuthComponent(
    () => import('../../../components/pages/LoginPage'),
    'Sign In'
  ),
  SignupPage: createAuthComponent(
    () => import('../../../components/pages/LoginPage'), // Same component handles both
    'Sign Up'
  ),
  PasswordResetPage: createAuthComponent(
    () => import('../../../components/pages/PasswordResetPage'),
    'Password Reset'
  ),
  EmailVerificationPage: createAuthComponent(
    () => import('../../../components/auth/EmailVerificationPage'),
    'Email Verification'
  ),
  TwoFactorAuthPage: createAuthComponent(
    () => import('../../../components/auth/TwoFactorAuthPage'),
    'Two Factor Authentication'
  )
};

export const authRoutes = [
  {
    path: '/login',
    element: AuthComponents.LoginPage,
    title: 'Sign In',
    description: 'Sign in to your account',
    isPublic: true,
    preload: true,
    meta: {
      keywords: 'login, sign in, authentication',
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/signup',
    element: AuthComponents.SignupPage,
    title: 'Sign Up',
    description: 'Create a new account',
    isPublic: true,
    preload: true,
    meta: {
      keywords: 'signup, register, create account',
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/reset-password',
    element: AuthComponents.PasswordResetPage,
    title: 'Reset Password',
    description: 'Reset your account password',
    isPublic: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/verify-email',
    element: AuthComponents.EmailVerificationPage,
    title: 'Verify Email',
    description: 'Verify your email address',
    isPublic: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/two-factor',
    element: AuthComponents.TwoFactorAuthPage,
    title: 'Two Factor Authentication',
    description: 'Complete two-factor authentication',
    isPublic: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  }
];

export default authRoutes;