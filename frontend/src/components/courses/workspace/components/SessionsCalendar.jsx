import React, { useState, useMemo, useCallback } from 'react';
import './SessionsCalendar.css';

const SessionsCalendar = ({
  sessions,
  availability,
  selectedDate,
  onDateChange,
  onTimeSlotSelect,
  onSessionSelect,
  selectedTimeSlots = [],
  filters
}) => {
  // DEBUG: Log component props and mounting
  console.log('🗓️ SessionsCalendar MOUNTED with props:', {
    sessions: sessions,
    sessionsLength: sessions?.length,
    availability: availability,
    availabilityLength: availability?.length,
    selectedDate: selectedDate,
    selectedTimeSlots: selectedTimeSlots,
    filters: filters
  });

  const [calendarView, setCalendarView] = useState('week'); // 'week', 'day'
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [draggedSession, setDraggedSession] = useState(null);

  // Time slots configuration
  const TIME_SLOTS = useMemo(() => {
    const slots = [];
    // Generate 1-hour time slots from 12:00 AM to 11:00 PM
    for (let hour = 0; hour < 24; hour++) {
      const timeValue = `${hour.toString().padStart(2, '0')}:00`;

      // Convert to 12-hour format for display
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayTime = `${displayHour}:00 ${period}`;

      slots.push({
        hour: hour,
        minute: 0,
        display: displayTime,
        time24: timeValue,
        timeSlotId: `${hour}-0` // Unique identifier for 1-hour slots
      });
    }
    return slots;
  }, []);

  // Get week dates based on selected date
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday = 0
    startOfWeek.setDate(diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedDate]);

  // Get current date for display
  const currentViewDates = calendarView === 'week' ? weekDates : [selectedDate];

  // Filter sessions by current filters
  const filteredSessions = useMemo(() => {
    console.log('🔍 Filtering sessions:', { originalSessions: sessions, filters: filters });

    if (!sessions || !Array.isArray(sessions)) {
      console.log('❌ No sessions data or not an array:', sessions);
      return [];
    }

    let filtered = [...sessions];
    console.log('📝 Sessions before filtering:', filtered.length);

    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter(session => session.status === filters.status);
      console.log(`📝 Sessions after status filter (${filters.status}):`, filtered.length);
    }

    console.log('✅ Final filtered sessions:', filtered);
    return filtered;
  }, [sessions, filters]);

  // Filter availability by current filters
  const filteredAvailability = useMemo(() => {
    console.log('🔍 Filtering availability:', availability);

    if (!availability || !Array.isArray(availability)) {
      console.log('❌ No availability data or not an array:', availability);
      return [];
    }

    const filtered = availability.filter(slot => slot.available);
    console.log('✅ Final filtered availability:', filtered.length);
    return filtered;
  }, [availability]);

  // Get sessions for a specific 1-hour time slot
  const getSessionsForSlot = useCallback((date, hour, minute) => {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return filteredSessions.filter(session => {
      const sessionStart = new Date(session.start);
      const sessionEnd = new Date(session.end);

      // Check if session overlaps with this 1-hour slot
      return sessionStart < slotEnd && sessionEnd > slotStart;
    });
  }, [filteredSessions]);

  // Get availability for a specific 1-hour time slot
  const getAvailabilityForSlot = useCallback((date, hour, minute) => {
    if (!filteredAvailability.length) return [];

    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return filteredAvailability.filter(slot => {
      const availStart = new Date(slot.start);
      const availEnd = new Date(slot.end);

      // Check if availability overlaps with this 1-hour slot
      return availStart < slotEnd && availEnd > slotStart;
    });
  }, [filteredAvailability]);

  // Check if time slot is selected
  const isTimeSlotSelected = useCallback((date, hour, minute, tutorId) => {
    return selectedTimeSlots.some(slot => {
      const slotDate = new Date(slot.start);
      return slotDate.toDateString() === date.toDateString() &&
             slotDate.getHours() === hour &&
             slotDate.getMinutes() === minute &&
             (!tutorId || slot.tutorId === tutorId);
    });
  }, [selectedTimeSlots]);

  // Handle time slot click
  const handleTimeSlotClick = useCallback((date, hour, minute, availability) => {
    const clickedSlots = availability.map(avail => ({
      start: new Date(avail.start),
      end: new Date(avail.end),
      tutorId: avail.tutorId,
      tutorName: avail.tutorName,
      date: date,
      hour: hour,
      minute: minute
    }));

    // If multiple availability slots, let user choose or select all
    if (clickedSlots.length > 1) {
      // For now, select all - could be enhanced with a modal chooser
      onTimeSlotSelect([...selectedTimeSlots, ...clickedSlots]);
    } else if (clickedSlots.length === 1) {
      // Check if already selected, if so deselect
      const isSelected = isTimeSlotSelected(date, hour, minute, clickedSlots[0].tutorId);
      if (isSelected) {
        const newSelection = selectedTimeSlots.filter(slot =>
          !(new Date(slot.start).toDateString() === date.toDateString() &&
            new Date(slot.start).getHours() === hour &&
            new Date(slot.start).getMinutes() === minute &&
            slot.tutorId === clickedSlots[0].tutorId)
        );
        onTimeSlotSelect(newSelection);
      } else {
        onTimeSlotSelect([...selectedTimeSlots, ...clickedSlots]);
      }
    }
  }, [selectedTimeSlots, onTimeSlotSelect, isTimeSlotSelected]);

  // Handle session click
  const handleSessionClick = useCallback((session, event) => {
    event.stopPropagation();
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      const isSelected = selectedSessions.some(s => s.id === session.id);
      if (isSelected) {
        const newSelection = selectedSessions.filter(s => s.id !== session.id);
        setSelectedSessions(newSelection);
        onSessionSelect(newSelection);
      } else {
        const newSelection = [...selectedSessions, session];
        setSelectedSessions(newSelection);
        onSessionSelect(newSelection);
      }
    } else {
      // Single select
      const newSelection = [session];
      setSelectedSessions(newSelection);
      onSessionSelect(newSelection);
    }
  }, [selectedSessions, onSessionSelect]);

  // Navigation helpers
  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    onDateChange(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    onDateChange(newDate);
  };

  const navigate = calendarView === 'week' ? navigateWeek : navigateDay;

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatHeaderDate = (date) => {
    if (calendarView === 'week') {
      const startDate = weekDates[0];
      const endDate = weekDates[6];
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} ${startDate.getDate()}-${endDate.getDate()}`;
      } else {
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="cde-sessions-calendar">
      {/* Calendar Header */}
      <div className="cde-calendar-header">
        <div className="cde-header-controls">
          <div className="cde-view-switcher">
            <button 
              className={`cde-view-btn ${calendarView === 'week' ? 'cde-active' : ''}`}
              onClick={() => setCalendarView('week')}
            >
              Week
            </button>
            <button 
              className={`cde-view-btn ${calendarView === 'day' ? 'cde-active' : ''}`}
              onClick={() => setCalendarView('day')}
            >
              Day
            </button>
          </div>

          <div className="cde-navigation-controls">
            <button
              className="cde-nav-btn"
              onClick={() => navigate(-1)}
              title={`Previous ${calendarView}`}
            >
              ←
            </button>
            
            <div className="cde-current-date">
              <h3>{formatHeaderDate(selectedDate)}</h3>
            </div>
            
            <button
              className="cde-nav-btn"
              onClick={() => navigate(1)}
              title={`Next ${calendarView}`}
            >
              →
            </button>
          </div>

          <div className="cde-header-actions">
            <button 
              className="cde-btn cde-btn-outline cde-btn-sm"
              onClick={() => onDateChange(new Date())}
            >
              Today
            </button>
            
            {selectedSessions.length > 0 && (
              <div className="cde-selection-indicator">
                <span>{selectedSessions.length} selected</span>
                <button 
                  className="cde-clear-btn"
                  onClick={() => {
                    setSelectedSessions([]);
                    onSessionSelect([]);
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="cde-calendar-grid">
        {/* Time Column */}
        <div className="cde-time-column">
          <div className="cde-time-header"></div>
          {TIME_SLOTS.map(slot => (
            <div key={slot.timeSlotId} className="cde-time-slot-label">
              <span className="cde-time-text">{slot.display}</span>
            </div>
          ))}
        </div>

        {/* Date Columns */}
        <div className="cde-dates-container">
          {currentViewDates.map(date => (
            <div key={date.toDateString()} className="cde-date-column">
              {/* Date Header */}
              <div className="cde-date-header">
                <div className="cde-date-info">
                  <span className="cde-day-name">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`cde-day-number ${
                    date.toDateString() === new Date().toDateString() ? 'cde-today' : ''
                  }`}>
                    {date.getDate()}
                  </span>
                </div>
              </div>

              {/* Time Slots */}
              <div className="cde-time-slots">
                {TIME_SLOTS.map(timeSlot => {
                  const sessionsInSlot = getSessionsForSlot(date, timeSlot.hour, timeSlot.minute);
                  const availabilityInSlot = getAvailabilityForSlot(date, timeSlot.hour, timeSlot.minute);
                  const hasAvailability = availabilityInSlot.length > 0;
                  const hasSelection = availabilityInSlot.some(avail =>
                    isTimeSlotSelected(date, timeSlot.hour, timeSlot.minute, avail.tutorId)
                  );

                  // DEBUG: Log slot data for 7 PM slot (when the session should appear)
                  if (timeSlot.hour === 19 && timeSlot.minute === 0) {
                    console.log('🎯 DEBUG Time Slot Data:', {
                      date: date.toDateString(),
                      timeSlot: timeSlot,
                      sessionsInSlot: sessionsInSlot,
                      availabilityInSlot: availabilityInSlot,
                      hasAvailability: hasAvailability,
                      hasSelection: hasSelection
                    });
                  }

                  return (
                    <div
                      key={`${date.toDateString()}-${timeSlot.timeSlotId}`}
                      className={`cde-time-slot ${hasAvailability ? 'cde-has-availability' : ''} ${hasSelection ? 'cde-selected' : ''}`}
                      onClick={() => hasAvailability && handleTimeSlotClick(date, timeSlot.hour, timeSlot.minute, availabilityInSlot)}
                    >
                      {/* Availability indicators */}
                      {hasAvailability && (
                        <div className="cde-availability-indicators">
                          {availabilityInSlot.map(avail => (
                            <div
                              key={avail.id}
                              className={`cde-availability-slot ${
                                isTimeSlotSelected(date, timeSlot.hour, timeSlot.minute, avail.tutorId) ? 'cde-selected' : ''
                              }`}
                              title={`Available: ${avail.tutorName}`}
                            >
                              <span className="cde-tutor-initial">
                                {avail.tutorName?.charAt(0) || 'T'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sessions */}
                      {sessionsInSlot.map(session => (
                        <div 
                          key={session.id}
                          className={`cde-session-block cde-${session.status || 'scheduled'} ${
                            selectedSessions.some(s => s.id === session.id) ? 'cde-selected' : ''
                          }`}
                          onClick={(e) => handleSessionClick(session, e)}
                          title={`${session.title} - ${session.tutorName || 'No tutor assigned'}`}
                        >
                          <div className="cde-session-content">
                            <div className="cde-session-title">{session.title}</div>
                            <div className="cde-session-tutor">{session.tutorName || 'Unassigned'}</div>
                            <div className="cde-session-participants">
                              {session.participants}/{session.maxParticipants}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="cde-calendar-legend">
        <div className="cde-legend-item">
          <div className="cde-legend-color cde-availability"></div>
          <span>Available Time Slot</span>
        </div>
        <div className="cde-legend-item">
          <div className="cde-legend-color cde-selected"></div>
          <span>Selected for Batch Creation</span>
        </div>
        <div className="cde-legend-item">
          <div className="cde-legend-color cde-session cde-scheduled"></div>
          <span>Scheduled Session</span>
        </div>
        <div className="cde-legend-item">
          <div className="cde-legend-color cde-session cde-active"></div>
          <span>Active Session</span>
        </div>
        <div className="cde-legend-item">
          <div className="cde-legend-color cde-session cde-completed"></div>
          <span>Completed Session</span>
        </div>
      </div>
    </div>
  );
};

export default SessionsCalendar;