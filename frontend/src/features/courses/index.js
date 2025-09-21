/**
 * Courses feature barrel export
 * Centralized exports for course management functionality
 */

// New Components
export { default as CourseCard } from './components/CourseCard';
export { default as CourseGrid, CourseGridWithSections } from './components/CourseGrid';
export { default as CoursePage } from './components/CoursePage';
export { default as CourseDetailView } from './components/CourseDetailView';

// Legacy Components (for backward compatibility during migration)
export { default as CourseDetailPage } from './components/CourseDetailPage';
export { default as StudentCourseDetailPage } from './components/StudentCourseDetailPage';
export { default as CourseWorkspace } from './components/CourseWorkspace';
export { default as CourseDisplayComponent } from './components/CourseDisplayComponent';
export { default as CourseCategoryComponent } from './components/CourseCategoryComponent';
export { default as CourseSectionComponent } from './components/CourseSectionComponent';
export { default as SessionCapacityIndicator } from './components/SessionCapacityIndicator';
export { default as SessionCapacityBadge } from './components/SessionCapacityBadge';

// Workspace Components
export { default as WorkspaceNavigation } from './components/workspace/WorkspaceNavigation';
export { default as WorkspaceHeader } from './components/workspace/WorkspaceHeader';
export { default as CourseSettingsTab } from './components/workspace/CourseSettingsTab';
export { default as SessionsManagerTab } from './components/workspace/SessionsManagerTab';
export { default as ContentStructureTab } from './components/workspace/ContentStructureTab';
export { default as EnrollmentHubTab } from './components/workspace/EnrollmentHubTab';
export { default as AnalyticsDashboardTab } from './components/workspace/AnalyticsDashboardTab';
export { default as FloatingActionPanel } from './components/workspace/FloatingActionPanel';

// Workspace Sub-components
export { default as SmartSessionCreator } from './components/workspace/components/SmartSessionCreator';
export { default as QuickCreatePanel } from './components/workspace/components/QuickCreatePanel';
export { default as SessionsList } from './components/workspace/components/SessionsList';
export { default as ContentTemplateSelector } from './components/workspace/components/ContentTemplateSelector';
export { default as SessionsCalendar } from './components/workspace/components/SessionsCalendar';
export { default as AddLessonModal } from './components/workspace/components/AddLessonModal';
export { default as AddModuleModal } from './components/workspace/components/AddModuleModal';
export { default as ContentTree } from './components/workspace/components/ContentTree';
export { default as BatchOperationsPanel } from './components/workspace/components/BatchOperationsPanel';

// Module Components
export { default as ModulePage } from './components/ModulePage';
export { default as ModuleInformationCard } from './components/ModuleInformationCard';
export { default as ModuleCardComponent } from './components/ModuleCardComponent';
export { default as CourseHeader } from './components/CourseHeader';
export { default as CourseProgress } from './components/CourseProgress';
export { default as CourseActionButton } from './components/CourseActionButton';
export { default as UpcomingTasks } from './components/UpcomingTasks';
export { default as UpcomingSessionCard } from './components/UpcomingSessionCard';

// Hooks
export { useCourses, useCourse, useCourseEnrollment } from './hooks/useCourses';
export { useModules } from './hooks/useModules';
export { useEnrollments } from './hooks/useEnrollments';

// Services
export { courseService } from './services/courseService';
export { default as moduleService } from './services/moduleService';
export { default as enrollmentService } from './services/enrollmentService';

// Utils
export * from './utils/courseUtils';

// Types (when implementing TypeScript)
// export type { Course, Module, Enrollment } from './types';