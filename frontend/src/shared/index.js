/**
 * Shared module barrel export
 * Centralized exports for shared components, hooks, and utilities
 */

// Core Components
export { default as ErrorBoundary } from './components/ErrorBoundary';
export { default as LoadingSpinner } from './components/LoadingSpinner';
export { default as Button } from './components/Button';
export { default as Input } from './components/Input';
export { default as Modal } from './components/Modal';
export { default as Card } from './components/Card';

// Layout Components
export { default as Header } from './components/Header';
export { default as Footer } from './components/Footer';
export { default as Sidebar } from './components/Sidebar';
export { default as Layout } from './components/Layout';

// Form Components
export { default as Form } from './components/Form';
export { default as FormField } from './components/FormField';
export { default as Select } from './components/Select';
export { default as Checkbox } from './components/Checkbox';
export { default as Radio } from './components/Radio';

// Hooks
export { useLocalStorage } from './hooks/useLocalStorage';
export { useSessionStorage } from './hooks/useSessionStorage';
export { useDebounce } from './hooks/useDebounce';
export { useWindowSize } from './hooks/useWindowSize';
export { usePrevious } from './hooks/usePrevious';

// Services
export { default as httpClient } from './services/httpClient';
export { default as storageService } from './services/storageService';
export { default as validationService } from './services/validationService';

// Utils
export { formatDate, formatTime, formatCurrency } from './utils/formatters';
export { validateEmail, validatePassword, validatePhone } from './utils/validators';
export { debounce, throttle, memoize } from './utils/performance';
export { generateId, clone, merge } from './utils/helpers';

// Constants
export { API_ENDPOINTS, ERROR_MESSAGES, VALIDATION_RULES } from './constants';

// Theme System
export {
  ThemeProvider,
  useTheme,
  withTheme,
  lightTheme,
  darkTheme,
  themes,
  getThemeValue,
  createCustomTheme,
  getCSSVariable,
  setCSSVariable,
  mediaQueries,
  styled
} from './theme';
export * from './theme/tokens';

// Types (when implementing TypeScript)
// export type { ApiResponse, ValidationError, FormState } from './types';