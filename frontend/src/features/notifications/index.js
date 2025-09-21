/**
 * Notifications feature barrel export
 * Centralized exports for notification functionality
 */

// Modern Components
export { default as NotificationPanel } from './components/NotificationPanel';
export { default as NotificationItem } from './components/NotificationItem';
export { default as NotificationBadge } from './components/NotificationBadge';

// Services
export { default as notificationService } from './services/notificationService';

// Components (to be created)
// export { default as NotificationSettings } from './components/NotificationSettings';
// export { default as NotificationList } from './components/NotificationList';

// Hooks (to be created)
// export { useNotifications } from './hooks/useNotifications';
// export { useNotificationSettings } from './hooks/useNotificationSettings';
// export { useRealtimeNotifications } from './hooks/useRealtimeNotifications';

// Utils (to be created)
// export { formatNotificationTime, groupNotificationsByDate } from './utils/notificationUtils';

// Types (when implementing TypeScript)
// export type { Notification, NotificationSettings, NotificationFilter } from './types';