/**
 * Centralized component exports for improved architecture
 * Provides clean imports and better organization
 */

// Common components
export { default as ErrorBoundary } from './common/ErrorBoundary';

// Availability components
export { default as AvailabilitySlot } from './availability/AvailabilitySlot';

// Session components
export { default as SessionForm } from './sessions/SessionForm';

// Context providers
export { AvailabilityProvider, useAvailability } from '../contexts/AvailabilityContext';

// Custom hooks
export { default as useTimeSlots } from '../hooks/useTimeSlots';
export { default as useConflicts } from '../hooks/useConflicts';
export { useErrorHandler, useApiErrorHandler } from '../hooks/useErrorHandler';

// Notification components
export { NotificationCenter, NotificationBadge, NotificationList, NotificationItem } from './notifications';

// Services
export { default as availabilityService } from '../services/availabilityService';