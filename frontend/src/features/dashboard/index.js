/**
 * Dashboard feature barrel export
 * Centralized exports for dashboard functionality
 */

// New Modern Components
export { default as DashboardLayout } from './components/DashboardLayout';
export { default as StatCard, StatCardGrid } from './components/StatCard';
export { default as StudentDashboard } from './components/StudentDashboard';
export { default as RecentCourses } from './components/RecentCourses';
export { default as UpcomingTasks } from './components/UpcomingTasks';
export { default as NextSession } from './components/NextSession';

// Legacy Components (for backward compatibility during migration)
export { default as GuardianDashboard } from './components/GuardianDashboard';
export { default as TutorDashboard } from './components/TutorDashboard';
export { default as AdminDashboard } from './components/AdminDashboard';

// Dashboard Cards/Widgets
export { default as StatsCard } from './components/StatsCard';
export { default as ProgressCard } from './components/ProgressCard';
export { default as ActivityCard } from './components/ActivityCard';
export { default as EarningsCard } from './components/EarningsCard';
export { default as UpcomingSessionsCard } from './components/UpcomingSessionsCard';

// Guardian Components
export { default as PendingRequestsCard } from './components/PendingRequestsCard';
export { default as RequestGuardianModal } from './components/RequestGuardianModal';

// Hooks
export { useAnalytics } from './hooks/useAnalytics';
export { useAdminStats } from './hooks/useAdminStats';
export { useTutorEarnings } from './hooks/useTutorEarnings';
export { useGuardianStudents } from './hooks/useGuardianStudents';

// Services
export { default as dashboardService } from './services/dashboardService';
export { default as analyticsService } from './services/analyticsService';

// Utils
export { formatDashboardData, calculateMetrics } from './utils/dashboardUtils';

// Types (when implementing TypeScript)
// export type { DashboardStats, Analytics, TutorEarnings } from './types';