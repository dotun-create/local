/**
 * Admin feature barrel export
 * Centralized exports for admin functionality
 */

// Services
export { default as adminService } from './services/adminService';

// Components
export { default as AdminDashboard } from './components/AdminDashboard';
export { default as UserManagement } from './components/UserManagement';

// Components (to be created)
// export { default as RoleManagement } from './components/RoleManagement';
// export { default as SystemSettings } from './components/SystemSettings';
// export { default as ContentModeration } from './components/ContentModeration';
// export { default as AnalyticsOverview } from './components/AnalyticsOverview';
// export { default as SecurityMonitor } from './components/SecurityMonitor';
// export { default as BackupManagement } from './components/BackupManagement';
// export { default as SupportTickets } from './components/SupportTickets';
// export { default as PaymentManagement } from './components/PaymentManagement';

// Hooks (to be created)
// export { useAdminPermissions } from './hooks/useAdminPermissions';
// export { useSystemHealth } from './hooks/useSystemHealth';
// export { useAdminAnalytics } from './hooks/useAdminAnalytics';
// export { useUserManagement } from './hooks/useUserManagement';

// Utils (to be created)
// export { formatUserData, validateRolePermissions, exportAnalytics } from './utils/adminUtils';

// Types (when implementing TypeScript)
// export type { AdminUser, Role, Permission, SystemHealth, AdminAnalytics } from './types';