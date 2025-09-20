import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCoursePageRefresh } from '../../hooks/useAdminRefresh';
import API from '../../services/api';
import { formatCoursePrice } from '../../utils/currency';
import { getTimezoneDisplayName } from '../../utils/timeUtils';

// Components
import WorkspaceHeader from './workspace/WorkspaceHeader';
import WorkspaceNavigation from './workspace/WorkspaceNavigation';
import ContentStructureTab from './workspace/ContentStructureTab';
import SessionsManagerTab from './workspace/SessionsManagerTab';
import EnrollmentHubTab from './workspace/EnrollmentHubTab';
import AnalyticsDashboardTab from './workspace/AnalyticsDashboardTab';
import CourseSettingsTab from './workspace/CourseSettingsTab';
// import FloatingActionPanel from './workspace/FloatingActionPanel';

// Styles
import './css/CourseWorkspace.css';

// Workspace state reducer
const workspaceReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_COURSE_DATA':
      return { 
        ...state, 
        course: action.payload.course,
        modules: action.payload.modules || [],
        lessons: action.payload.lessons || [],
        sessions: action.payload.sessions || [],
        quizzes: action.payload.quizzes || [],
        tutors: action.payload.tutors || [],
        students: action.payload.students || [],
        loading: false,
        error: null
      };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_SELECTED_ITEMS':
      return { ...state, selectedItems: action.payload };
    case 'BATCH_OPERATION_START':
      return { 
        ...state, 
        batchOperation: {
          active: true,
          operation: action.operation,
          items: action.items,
          progress: 0
        }
      };
    case 'BATCH_OPERATION_PROGRESS':
      return {
        ...state,
        batchOperation: {
          ...state.batchOperation,
          progress: action.progress
        }
      };
    case 'BATCH_OPERATION_SUCCESS':
      const { deletedItems = [], archivedItems = [], ...otherUpdates } = action.updates;
      return {
        ...state,
        batchOperation: { active: false },
        // Remove deleted items from state arrays
        modules: state.modules.filter(m =>
          !deletedItems.some(deleted => deleted.id === m.id)
        ),
        lessons: state.lessons.filter(l =>
          !deletedItems.some(deleted => deleted.id === l.id)
        ),
        quizzes: state.quizzes.filter(q =>
          !deletedItems.some(deleted => deleted.id === q.id) &&
          !archivedItems.some(archived => archived.id === q.id)
        ),
        sessions: state.sessions.filter(s =>
          !deletedItems.some(deleted => deleted.id === s.id)
        ),
        // Clear selection if deleted items were selected
        selectedItems: state.selectedItems.filter(selected =>
          !deletedItems.some(deleted => deleted.id === selected.id) &&
          !archivedItems.some(archived => archived.id === selected.id)
        ),
        // Apply any other updates
        ...otherUpdates
      };
    case 'BATCH_OPERATION_ERROR':
      return {
        ...state,
        batchOperation: { active: false },
        error: action.error
      };
    case 'UPDATE_CONTENT':
      const { contentType, data } = action.payload;
      return {
        ...state,
        [contentType]: Array.isArray(data) ? data : [data]
      };
    case 'ADD_SESSION':
      return {
        ...state,
        sessions: [...state.sessions, action.payload]
      };
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(session => 
          session.id === action.payload.id ? action.payload : session
        )
      };
    case 'DELETE_SESSIONS':
      return {
        ...state,
        sessions: state.sessions.filter(session => 
          !action.payload.includes(session.id)
        )
      };
    default:
      return state;
  }
};

// Initial workspace state
const initialWorkspaceState = {
  course: null,
  modules: [],
  lessons: [],
  sessions: [],
  quizzes: [],
  tutors: [],
  students: [],
  activeTab: 'content-structure',
  selectedItems: [],
  loading: true,
  error: null,
  batchOperation: { active: false }
};

const CourseWorkspace = () => {
  const navigate = useNavigate();
  const { courseId: urlCourseId } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = urlCourseId || searchParams.get('courseId');
  
  // Workspace state management
  const [workspaceState, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  
  // Local UI state
  const [showFloatingPanel, setShowFloatingPanel] = useState(false);
  const [creationContext, setCreationContext] = useState(null);
  
  // Refresh hook integration
  const handleWorkspaceRefresh = useCallback(async (event) => {
    console.log('Workspace refreshing due to event:', event);
    await loadCourseData();
  }, [courseId]);
  
  const { triggerRefresh, isRefreshing } = useCoursePageRefresh(courseId, handleWorkspaceRefresh);

  // Load course data
  const loadCourseData = useCallback(async () => {
    if (!courseId) {
      dispatch({ type: 'SET_ERROR', payload: 'No course ID provided' });
      return;
    }

    // Check authentication
    const authToken = sessionStorage.getItem('authToken');
    if (!authToken) {
      dispatch({ type: 'SET_ERROR', payload: 'Authentication required. Please log in.' });
      return;
    }

    console.log('CourseWorkspace: Loading data for courseId:', courseId);

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Load all course-related data in parallel
      console.log('CourseWorkspace: Making API calls...');
      const [
        courseResponse,
        modulesResponse,
        sessionsResponse,
        tutorsResponse,
        studentsResponse
      ] = await Promise.all([
        API.courses.getCourseById(courseId).catch(err => {
          console.error('CourseWorkspace: Error loading course:', err);
          throw err;
        }),
        API.courses.getCourseModules(courseId).catch(err => {
          console.error('CourseWorkspace: Error loading modules:', err);
          return [];
        }),
        API.courses.getCourseSessions(courseId).catch(err => {
          console.error('CourseWorkspace: Error loading sessions:', err);
          return [];
        }),
        API.courses.getCourseTutors(courseId).catch(err => {
          console.error('CourseWorkspace: Error loading tutors:', err);
          return [];
        }),
        API.courses.getEnrolledStudents(courseId).catch(err => {
          console.error('CourseWorkspace: Error loading students:', err);
          return [];
        })
      ]);

      console.log('CourseWorkspace: Raw API responses:', {
        courseResponse,
        modulesResponse,
        sessionsResponse,
        tutorsResponse,
        studentsResponse
      });

      // Extract arrays from API responses
      const modules = modulesResponse.modules || modulesResponse || [];
      const sessions = sessionsResponse.sessions || sessionsResponse || [];
      const tutors = tutorsResponse.tutors || tutorsResponse || [];
      const students = studentsResponse.students || studentsResponse || [];

      console.log('CourseWorkspace: Extracted arrays:', {
        modules: modules.length,
        sessions: sessions.length,
        tutors: tutors.length,
        students: students.length
      });

      // Load lessons and quizzes for all modules
      const lessonsPromises = modules.map(module => 
        API.modules.getModuleLessons(module.id).catch(() => [])
      );
      const lessonsResults = await Promise.all(lessonsPromises);
      const allLessons = lessonsResults.flat();

      // Load quizzes for all modules
      const quizzesPromises = modules.map(module => 
        API.quizzes.getQuizzes(module.id).catch(() => [])
      );
      const quizzesResults = await Promise.all(quizzesPromises);
      const allQuizzes = quizzesResults.flat();

      dispatch({
        type: 'SET_COURSE_DATA',
        payload: {
          course: courseResponse.course || courseResponse,
          modules: modules,
          lessons: allLessons,
          sessions: sessions,
          quizzes: allQuizzes,
          tutors: tutors,
          students: students
        }
      });

    } catch (error) {
      console.error('Failed to load course data:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.message || 'Failed to load course data'
      });
    }
  }, [courseId]);

  // Initialize data on mount
  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Handle tab changes
  const handleTabChange = (tabId) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId });
    // Clear selections when switching tabs
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: [] });
  };

  // Handle switching from session creator to quiz modal
  const handleSwitchToQuizModal = useCallback((quizContext) => {
    // Switch to content structure tab
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'content-structure' });
    
    // Set creation context for quiz
    setCreationContext({
      type: 'quiz',
      contentType: 'quiz',
      parentId: quizContext.moduleId || quizContext.defaultModule?.id,
      lessonId: quizContext.lessonId,
      quizContext: quizContext,
      autoOpen: true
    });
    
    console.log('Switching to quiz modal with context:', quizContext);
    
    // Clear creation context after a brief delay to allow the effect to trigger
    setTimeout(() => {
      setCreationContext(null);
    }, 100);
  }, []);

  // Handle item selection
  const handleSelectionChange = async (selectedItems) => {
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: selectedItems });
    
    // Load lessons and quizzes when a module is selected
    const selectedModule = selectedItems.find(item => item.type === 'module');
    if (selectedModule) {
      try {
        const [lessonsData, quizzesData] = await Promise.all([
          API.modules.getModuleLessons(selectedModule.id).catch(err => {
            console.error('Error loading lessons for module:', selectedModule.id, err);
            return { lessons: [] };
          }),
          API.quizzes.getQuizzes(selectedModule.id).catch(err => {
            console.error('Error loading quizzes for module:', selectedModule.id, err);
            return { quizzes: [] };
          })
        ]);
        
        // Extract lessons - handle different possible response structures
        const lessons = Array.isArray(lessonsData) ? lessonsData : 
                       lessonsData.lessons || lessonsData.data || [];
                       
        // Extract quizzes - handle different possible response structures  
        const quizzes = Array.isArray(quizzesData) ? quizzesData :
                       quizzesData.quizzes || quizzesData.data || [];
        
        // Update workspace state with lessons and quizzes
        dispatch({ 
          type: 'UPDATE_CONTENT', 
          payload: { 
            contentType: 'lessons', 
            data: lessons
          } 
        });
        dispatch({ 
          type: 'UPDATE_CONTENT', 
          payload: { 
            contentType: 'quizzes', 
            data: quizzes
          } 
        });
        
      } catch (error) {
        console.error('Error loading module content:', error);
      }
    }
  };

  // Handle batch operations
  const handleBatchOperation = useCallback(async (operation, items, params = {}) => {
    dispatch({ type: 'BATCH_OPERATION_START', operation, items });
    
    try {
      let results;
      
      switch (operation) {
        case 'delete':
          results = await handleBatchDelete(items);
          break;
        case 'duplicate':
          results = await handleBatchDuplicate(items);
          break;
        case 'edit':
          results = await handleBatchEdit(items, params);
          break;
        case 'schedule':
          results = await handleBatchSchedule(items, params);
          break;
        case 'assign_tutors':
          results = await handleBatchAssignTutors(items, params);
          break;
        case 'archive':
          results = await handleBatchArchive(items);
          break;
        default:
          throw new Error(`Unknown batch operation: ${operation}`);
      }
      
      dispatch({
        type: 'BATCH_OPERATION_SUCCESS',
        updates: results
      });

      // For delete operations, we use optimistic updates so no refresh needed
      // For other operations, trigger refresh to ensure data consistency
      if (operation !== 'delete') {
        await loadCourseData();
      }
      
    } catch (error) {
      console.error('Batch operation failed:', error);
      dispatch({ 
        type: 'BATCH_OPERATION_ERROR', 
        error: error.message 
      });
    }
  }, [courseId]);

  // Batch operation handlers
  const handleBatchDelete = async (items) => {
    const deletePromises = items.map(async (item) => {
      try {
        switch (item.type) {
          case 'module':
            await API.modules.deleteModule(item.id);
            return { item, success: true };
          case 'lesson':
            await API.lessons.deleteLesson(item.id);
            return { item, success: true };
          case 'session':
            await API.sessions.deleteSession(item.id);
            return { item, success: true };
          case 'quiz':
            try {
              await API.quizzes.deleteQuiz(item.id);
              return { item, success: true };
            } catch (deleteError) {
              // If deletion fails due to quiz results, try archiving instead
              if (deleteError.message && deleteError.message.includes('quiz result(s) exist')) {
                await API.quizzes.archiveQuiz(item.id);
                return { item, success: true, archived: true };
              }
              throw deleteError;
            }
          default:
            return { item, success: true };
        }
      } catch (error) {
        return { item, success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(deletePromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const archived = successful.filter(r => r.archived);
    const deleted = successful.filter(r => !r.archived);
    
    if (failed.length > 0) {
      const errorMessage = failed.map(f => `${f.item.title}: ${f.error}`).join('\n');
      throw new Error(`Some items could not be deleted:\n${errorMessage}`);
    }
    
    let message = '';
    if (deleted.length > 0) {
      message += `${deleted.length} item(s) deleted`;
    }
    if (archived.length > 0) {
      if (message) message += ', ';
      message += `${archived.length} quiz(es) archived (had existing results)`;
    }

    return {
      deletedItems: deleted.map(r => r.item),
      archivedItems: archived.map(r => r.item),
      deleted: deleted.length,
      archived: archived.length,
      message
    };
  };

  const handleBatchDuplicate = async (items) => {
    const duplicatePromises = items.map(async (item) => {
      const duplicatedName = `${item.title || item.name} (Copy)`;
      
      switch (item.type) {
        case 'module':
          return API.modules.createModule({
            ...item,
            title: duplicatedName,
            courseId: courseId
          });
        case 'lesson':
          return API.lessons.createLesson(item.moduleId, {
            ...item,
            title: duplicatedName
          });
        case 'session':
          return API.sessions.createSession({
            ...item,
            title: duplicatedName,
            scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Next week
          });
        default:
          return Promise.resolve();
      }
    });
    
    await Promise.all(duplicatePromises);
    return { duplicated: items.length };
  };

  const handleBatchEdit = async (items, params) => {
    // Implement bulk editing logic
    console.log('Batch edit:', items, params);
    return { edited: items.length };
  };

  const handleBatchSchedule = async (items, params) => {
    // Implement bulk scheduling logic
    console.log('Batch schedule:', items, params);
    return { scheduled: items.length };
  };

  const handleBatchAssignTutors = async (items, params) => {
    // Implement bulk tutor assignment logic
    console.log('Batch assign tutors:', items, params);
    return { assigned: items.length };
  };

  const handleBatchArchive = async (items) => {
    const results = [];
    
    for (const item of items) {
      try {
        switch (item.type) {
          case 'quiz':
            await API.quizzes.archiveQuiz(item.id);
            results.push({ item, success: true, archived: true });
            break;
          default:
            results.push({ 
              item, 
              success: false, 
              error: `Archive not supported for ${item.type}` 
            });
        }
      } catch (error) {
        console.error(`Failed to archive ${item.type}:`, error);
        results.push({ item, success: false, error: error.message });
      }
    }
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    let message = `${successful.length} item(s) archived`;
    if (failed.length > 0) {
      message += `, ${failed.length} failed`;
    }
    
    return {
      message,
      results,
      archived: successful.length,
      failed: failed.length
    };
  };

  // Handle content creation
  const handleCreateContent = useCallback(async (contentType, data, parentId = null) => {
    try {
      let result;
      
      switch (contentType) {
        case 'module':
          result = await API.modules.createModule({
            ...data,
            courseId: courseId
          });
          break;
        case 'lesson':
          result = await API.lessons.createLesson(parentId, data);
          break;
        case 'session':
          result = await API.sessions.createSession({
            ...data,
            courseId: courseId
          });
          
          // Create Zoom meeting if session creation successful
          try {
            if (workspaceState.course) {
              const zoomResponse = await API.zoom.createSessionMeeting(workspaceState.course, result);
              
              // Update session with Zoom details
              if (zoomResponse?.meeting_url) {
                const updatedSession = await API.sessions.updateSession(result.id, {
                  meeting_link: zoomResponse.meeting_url,
                  meeting_id: zoomResponse.meeting_id,
                  meeting_passcode: zoomResponse.meeting_passcode
                });
                result = updatedSession;
              }
            }
          } catch (zoomError) {
            console.warn('Failed to create Zoom meeting for session:', zoomError);
            // Continue without Zoom integration - session is still created
          }
          
          // Update workspace state with new session
          dispatch({ type: 'ADD_SESSION', payload: result });
          break;
        case 'quiz':
          result = await API.quizzes.createQuiz({
            ...data,
            moduleId: parentId
          });
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }
      
      // Note: We don't call loadCourseData for sessions since we update state directly
      if (contentType !== 'session') {
        await loadCourseData();
      }
      return result;
      
    } catch (error) {
      console.error('Failed to create content:', error);
      throw error;
    }
  }, [courseId, loadCourseData, workspaceState.course]);

  // Handle batch session creation
  const handleBatchSessionCreate = useCallback(async (sessionsData) => {
    try {
      dispatch({ type: 'BATCH_OPERATION_START', operation: 'Creating Sessions', items: sessionsData });
      
      const result = await API.sessions.createBatchSessions(courseId, sessionsData);
      
      if (result.sessions && result.sessions.length > 0) {
        // Create Zoom meetings for each session
        const sessionsWithZoom = [];
        for (const session of result.sessions) {
          try {
            const zoomResponse = await API.zoom.createSessionMeeting(workspaceState.course, session);
            
            if (zoomResponse?.meeting_url) {
              const updatedSession = await API.sessions.updateSession(session.id, {
                meeting_link: zoomResponse.meeting_url,
                meeting_id: zoomResponse.meeting_id,
                meeting_passcode: zoomResponse.meeting_passcode
              });
              sessionsWithZoom.push(updatedSession);
            } else {
              sessionsWithZoom.push(session);
            }
          } catch (zoomError) {
            console.warn(`Failed to create Zoom meeting for session ${session.id}:`, zoomError);
            sessionsWithZoom.push(session);
          }
          
          // Update progress
          const progress = (sessionsWithZoom.length / result.sessions.length) * 100;
          dispatch({ type: 'BATCH_OPERATION_PROGRESS', progress });
        }
        
        // Update workspace state with new sessions
        dispatch({ 
          type: 'BATCH_OPERATION_SUCCESS', 
          updates: { sessions: [...workspaceState.sessions, ...sessionsWithZoom] }
        });
        
        return { created_count: result.created_count, sessions: sessionsWithZoom };
      }
      
      dispatch({ type: 'BATCH_OPERATION_SUCCESS', updates: {} });
      return result;
      
    } catch (error) {
      dispatch({ type: 'BATCH_OPERATION_ERROR', error: error.message });
      throw error;
    }
  }, [courseId, workspaceState.course, workspaceState.sessions]);

  // Handle floating panel toggle
  const handleFloatingPanelToggle = () => {
    setShowFloatingPanel(!showFloatingPanel);
  };

  // Render tab content
  const renderTabContent = () => {
    const commonProps = {
      courseId,
      workspaceState,
      onSelectionChange: handleSelectionChange,
      onCreateContent: handleCreateContent,
      onBatchOperation: handleBatchOperation,
      onBatchSessionCreate: handleBatchSessionCreate,
      onRefresh: loadCourseData,
      onOpenQuizModal: handleSwitchToQuizModal
    };

    switch (workspaceState.activeTab) {
      case 'content-structure':
        return <ContentStructureTab {...commonProps} creationContext={creationContext} />;
      case 'sessions-manager':
        return <SessionsManagerTab {...commonProps} />;
      case 'enrollment-hub':
        return <EnrollmentHubTab {...commonProps} />;
      case 'analytics-dashboard':
        return <AnalyticsDashboardTab {...commonProps} />;
      case 'course-settings':
        return <CourseSettingsTab {...commonProps} />;
      default:
        return <ContentStructureTab {...commonProps} />;
    }
  };

  // Loading state
  if (workspaceState.loading && !workspaceState.course) {
    return (
      <div className="cw-course-workspace loading">
        <div className="cw-loading-container">
          <div className="cw-loading-spinner"></div>
          <p>Loading course workspace...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (workspaceState.error && !workspaceState.course) {
    return (
      <div className="cw-course-workspace error">
        <div className="cw-error-container">
          <h2>Error Loading Course</h2>
          <p>{workspaceState.error}</p>
          <button 
            onClick={() => navigate('/admin')} 
            className="cw-btn cw-btn-primary"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  // No course found
  if (!workspaceState.course) {
    return (
      <div className="cw-course-workspace error">
        <div className="cw-error-container">
          <h2>Course Not Found</h2>
          <button 
            onClick={() => navigate('/admin')} 
            className="cw-btn cw-btn-primary"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cw-course-workspace">
      {/* Workspace Header */}
      <WorkspaceHeader 
        course={workspaceState.course}
        onNavigateBack={() => navigate('/admin')}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace Container */}
      <div className="cw-workspace-container">
        {/* Navigation Tabs */}
        <WorkspaceNavigation 
          activeTab={workspaceState.activeTab}
          onTabChange={handleTabChange}
          counts={{
            modules: workspaceState.modules.length,
            sessions: workspaceState.sessions.length,
            students: workspaceState.students.length,
            quizzes: workspaceState.quizzes.length
          }}
        />

        {/* Tab Content */}
        <div className="cw-workspace-content">
          {renderTabContent()}
        </div>
      </div>

      {/* Floating Action Panel */}
      {/* <FloatingActionPanel
        activeTab={workspaceState.activeTab}
        selectedItems={workspaceState.selectedItems}
        onBatchOperation={handleBatchOperation}
        onCreateContent={handleCreateContent}
        courseId={courseId}
        show={showFloatingPanel}
        onToggle={handleFloatingPanelToggle}
        batchOperation={workspaceState.batchOperation}
      /> */}

      {/* Batch Operation Progress */}
      {workspaceState.batchOperation.active && (
        <div className="cw-batch-operation-overlay">
          <div className="cw-batch-operation-progress">
            <h3>Processing {workspaceState.batchOperation.operation}...</h3>
            <div className="cw-progress-bar">
              <div 
                className="cw-progress-fill"
                style={{ width: `${workspaceState.batchOperation.progress}%` }}
              />
            </div>
            <p>{workspaceState.batchOperation.items.length} items</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseWorkspace;