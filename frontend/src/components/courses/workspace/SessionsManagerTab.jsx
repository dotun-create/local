import React, { useState, useMemo, useCallback, useEffect } from 'react';
import SessionsCalendar from './components/SessionsCalendar';
import SmartSessionCreator from './components/SmartSessionCreator';
import SessionsList from './components/SessionsList';
import availabilityService from '../../../services/availabilityService';
import './SessionsManagerTab.css';

const SessionsManagerTab = ({
  courseId,
  workspaceState,
  onSelectionChange,
  onCreateContent,
  onBatchOperation,
  onBatchSessionCreate,
  onRefresh,
  onSwitchToQuizModal
}) => {
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'list', 'timeline'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [calendarFilters, setCalendarFilters] = useState({
    tutors: [],
    status: 'all',
    showAvailability: true
  });
  const [availabilityData, setAvailabilityData] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(null);

  const { sessions, tutors } = workspaceState;

  // DEBUG: Log workspace state
  console.log('📋 SessionsManagerTab: Workspace state:', {
    workspaceState: workspaceState,
    sessions: sessions,
    sessionsLength: sessions?.length,
    tutors: tutors,
    tutorsLength: tutors?.length,
    courseId: courseId
  });

  // Load real availability data from API
  useEffect(() => {
    const loadAvailabilityData = async () => {
      if (!courseId || !calendarFilters.showAvailability) {
        setAvailabilityData([]);
        return;
      }

      setLoadingAvailability(true);
      setAvailabilityError(null);
      try {
        // Get date range around selected date
        const dateRange = availabilityService.getDateRange(selectedDate, 1, 2);

        // Fetch availability data
        const availability = await availabilityService.getCourseAvailability(
          courseId,
          null, // module ID - can be added later
          dateRange.startDate,
          dateRange.endDate
        );

        // Filter out conflicts with existing sessions
        const filteredAvailability = availabilityService.filterConflicts(
          availability,
          calendarData
        );

        console.log('✅ Availability data loaded:', filteredAvailability);
        setAvailabilityData(filteredAvailability);
      } catch (error) {
        console.error('❌ Failed to load availability data:', error);
        setAvailabilityError('Failed to load tutor availability. Please try again.');
        setAvailabilityData([]);
      } finally {
        setLoadingAvailability(false);
      }
    };

    loadAvailabilityData();
  }, [courseId, selectedDate, calendarFilters.showAvailability, sessions]);

  // Process sessions data for calendar display
  const calendarData = useMemo(() => {
    console.log('📊 SessionsManagerTab: Processing calendar data:', {
      rawSessions: sessions,
      sessionsLength: sessions?.length,
      sessionsType: typeof sessions,
      isArray: Array.isArray(sessions)
    });

    if (!sessions) {
      console.log('❌ No sessions data');
      return [];
    }

    const processed = sessions.map(session => ({
      id: session.id,
      title: session.title,
      start: new Date(session.scheduledDate || session.scheduled_date),
      end: session.endDate ? new Date(session.endDate) :
           new Date((new Date(session.scheduledDate || session.scheduled_date)).getTime() +
           (session.duration || 60) * 60000),
      tutorId: session.tutorId || session.tutor_id,
      tutorName: session.tutorName || session.tutor_name,
      status: session.status,
      participants: session.studentIds?.length || 0,
      maxParticipants: session.maxParticipants || 3,
      type: 'session',
      data: session
    }));

    console.log('✅ Processed calendar data:', processed);
    return processed;
  }, [sessions]);


  // Handle time slot selection for batch session creation
  const handleTimeSlotSelect = useCallback((timeSlots) => {
    setSelectedTimeSlots(timeSlots);
    if (timeSlots.length > 0) {
      setShowCreatePanel(true);
    }
  }, []);

  // Handle session creation from selected time slots
  const handleBatchSessionCreate = useCallback(async (sessionTemplate) => {
    try {
      const sessionsToCreate = selectedTimeSlots.map(slot => ({
        ...sessionTemplate,
        title: `${sessionTemplate.title} - ${slot.tutorName}`,
        scheduledDate: slot.start.toISOString(),
        tutorId: slot.tutorId,
        duration: sessionTemplate.duration || 60,
        status: 'scheduled'
      }));

      // Use workspace batch session creation handler for better integration
      if (onBatchSessionCreate && sessionsToCreate.length > 1) {
        await onBatchSessionCreate(sessionsToCreate);
      } else {
        // Fallback to individual creation for single sessions
        for (const sessionData of sessionsToCreate) {
          await onCreateContent('session', sessionData, courseId);
        }
      }
      
      // Clear selection and close panel
      setSelectedTimeSlots([]);
      setShowCreatePanel(false);
      
      // Note: No need to call onRefresh as workspace state is updated directly
      
    } catch (error) {
      console.error('Failed to create batch sessions:', error);
    }
  }, [selectedTimeSlots, onCreateContent, onBatchSessionCreate, courseId]);

  // Handle individual session creation
  const handleSingleSessionCreate = useCallback(async (sessionData, timeSlot) => {
    try {
      const fullSessionData = {
        ...sessionData,
        scheduledDate: timeSlot.start.toISOString(),
        tutorId: timeSlot.tutorId,
        courseId
      };

      await onCreateContent('session', fullSessionData, courseId);
      onRefresh();
      
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }, [onCreateContent, courseId, onRefresh]);

  // Handle switching from session creator to quiz modal
  const handleSwitchToQuizModal = useCallback((quizContext) => {
    // Close session modal
    setShowCreatePanel(false);
    setSelectedTimeSlots([]);
    
    // Call parent handler to switch to quiz modal
    if (onSwitchToQuizModal) {
      onSwitchToQuizModal(quizContext);
    }
  }, [onSwitchToQuizModal]);

  // Handle session selection for batch operations
  const handleSessionSelect = useCallback((selectedSessions) => {
    const sessionItems = selectedSessions.map(session => ({
      key: `session-${session.id}`,
      type: 'session',
      id: session.id,
      data: session.data,
      title: session.title
    }));
    
    onSelectionChange(sessionItems);
  }, [onSelectionChange]);

  return (
    <div className="sessions-manager-tab">
      {/* Toolbar */}
      <div className="sessions-toolbar">
        <div className="header-controls">
          <div className="toolbar-left">
          <div className="view-controls">
            <button 
              className={`view-toggle ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
              title="Calendar View"
            >
              📅 Calendar
            </button>
            <button 
              className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              📋 List
            </button>
            <button 
              className={`view-toggle ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
              title="Timeline View"
            >
              📊 Timeline
            </button>
          </div>

          <div className="date-navigation">
            <button 
              onClick={() => setSelectedDate(new Date())}
              className="btn btn-outline"
            >
              Today
            </button>
            <div className="date-picker">
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
              />
            </div>
          </div>
        </div>

          <div className="toolbar-right">
          <div className="filter-controls">
            <select 
              value={calendarFilters.status}
              onChange={(e) => setCalendarFilters({
                ...calendarFilters, 
                status: e.target.value
              })}
              className="filter-select"
            >
              <option value="all">All Sessions</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="checkbox-filter">
              <label>
                <input
                  type="checkbox"
                  checked={calendarFilters.showAvailability}
                  onChange={(e) => setCalendarFilters({
                    ...calendarFilters,
                    showAvailability: e.target.checked
                  })}
                />
                Show Availability
              </label>
            </div>
          </div>

          <div className="action-controls">
            <button 
              className="btn btn-outline"
              onClick={() => setShowCreatePanel(true)}
            >
              🎥 Quick Session
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                // Open availability-based session creator
                setShowCreatePanel(true);
              }}
            >
              + Create Sessions
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="sessions-main">
        {/* Error Messages */}
        {availabilityError && (
          <div className="error-banner">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{availabilityError}</span>
              <button
                className="retry-btn"
                onClick={() => {
                  setAvailabilityError(null);
                  // Trigger reload by updating a dependency
                  setSelectedDate(new Date(selectedDate));
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Calendar/List View */}
        <div className="sessions-view">
          {viewMode === 'calendar' && (
            <div>
              {console.log('🎯 Rendering SessionsCalendar with data:', {
                calendarData: calendarData,
                availability: calendarFilters.showAvailability ? availabilityData : [],
                showAvailability: calendarFilters.showAvailability,
                selectedDate: selectedDate,
                viewMode: viewMode
              })}
              <SessionsCalendar
                sessions={calendarData}
                availability={calendarFilters.showAvailability ? availabilityData : []}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onTimeSlotSelect={handleTimeSlotSelect}
                onSessionSelect={handleSessionSelect}
                selectedTimeSlots={selectedTimeSlots}
                filters={calendarFilters}
                loadingAvailability={loadingAvailability}
              />
            </div>
          )}

          {viewMode === 'list' && (
            <SessionsList
              sessions={calendarData}
              onSessionSelect={handleSessionSelect}
              selectedSessions={workspaceState.selectedItems.filter(item => item.type === 'session')}
              onRefresh={onRefresh}
            />
          )}

          {viewMode === 'timeline' && (
            <div className="timeline-view">
              <p>Timeline view coming soon...</p>
            </div>
          )}

          {/* Empty State */}
          {sessions.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-content">
                <span className="empty-icon">🎥</span>
                <h3>No sessions scheduled</h3>
                <p>Create your first session by selecting available time slots or using the quick session creator.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreatePanel(true)}
                >
                  Create First Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Smart Session Creator Modal */}
        {showCreatePanel && (
          <div 
            className="modal-overlay"
            onClick={(e) => {
              // Close modal when clicking outside the modal container
              if (e.target === e.currentTarget) {
                setShowCreatePanel(false);
                setSelectedTimeSlots([]);
              }
            }}
          >
            <div className="modal-container">
              <SmartSessionCreator
                selectedSlots={selectedTimeSlots}
                availableTutors={tutors}
                courseModules={workspaceState.modules}
                onBatchCreate={handleBatchSessionCreate}
                onSingleCreate={handleSingleSessionCreate}
                onSwitchToQuizModal={handleSwitchToQuizModal}
                onCancel={() => {
                  setShowCreatePanel(false);
                  setSelectedTimeSlots([]);
                }}
                // Backend integration props
                courseId={courseId}
                onCreateContent={onCreateContent}
                onBatchSessionCreate={onBatchSessionCreate}
                onRefresh={onRefresh}
              />
            </div>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {selectedTimeSlots.length > 0 && (
        <div className="selection-summary">
          <div className="summary-content">
            <span className="summary-icon">⏰</span>
            <span className="summary-text">
              {selectedTimeSlots.length} time slot{selectedTimeSlots.length !== 1 ? 's' : ''} selected
            </span>
            <button 
              className="clear-selection-btn"
              onClick={() => setSelectedTimeSlots([])}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsManagerTab;