/**
 * Auth feature barrel export
 * Centralized exports for authentication-related functionality
 */

// Components
export { default as LoginForm } from './components/LoginForm';
export { default as SignupForm } from './components/SignupForm';
export { default as PasswordResetModal } from './components/PasswordResetModal';
export { default as ProtectedRoute } from './components/ProtectedRoute';
export { default as RoleSwitcher } from './components/RoleSwitcher';

// Legacy components (for backward compatibility during migration)
export { default as LoginComponent } from './components/LoginComponent';
export { default as UserSignupForm } from './components/UserSignupForm';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useMultiRoleAuth, useRequireRole, RoleProvider } from './hooks/useMultiRoleAuth';

// Context
export { AuthProvider, useAuthContext } from './contexts/AuthContext';

// Services
export { authService } from './services/authService';

// Utils
export { validateCredentials, formatUserData } from './utils/authUtils';

// Types (when implementing TypeScript)
// export type { User, AuthState, LoginCredentials } from './types';