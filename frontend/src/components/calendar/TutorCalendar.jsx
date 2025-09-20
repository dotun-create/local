import React, { useState, useEffect } from 'react';
import './TutorCalendar.css';
import EditAvailabilityModal from '../modals/EditAvailabilityModal';
import API from '../../services/api';
import dataService from '../../services/dataService';
import { normalizeAvailabilityResponse } from '../../utils/availabilityNormalizer';
import { enhanceAvailabilityDisplay, formatTimeInUserTimezone, convertUTCTimeToUserTimezone } from '../../utils/timezoneManager';

const TutorCalendar = ({ availability, onDateClick, upcomingSessions = [], assignedCourses = [], tutorId, onAvailabilityDeleted }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availabilityData, setAvailabilityData] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTimeslots, setSelectedTimeslots] = useState(new Set());
  const [selectedSlotsMap, setSelectedSlotsMap] = useState(new Map());
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Get first day of the month and number of days
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // Get days from previous month to fill the first week
    const daysFromPrevMonth = firstDayWeekday;
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    const calendarDays = [];
    
    // Previous month days
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      calendarDays.push({
        date: daysInPrevMonth - i,
        month: 'prev',
        fullDate: new Date(year, month - 1, daysInPrevMonth - i),
        dayOfWeek: dayNames[(firstDayWeekday - i - 1 + 7) % 7]
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = new Date(year, month, day);
      const dayOfWeek = dayNames[fullDate.getDay()];
      calendarDays.push({
        date: day,
        month: 'current',
        fullDate,
        dayOfWeek
      });
    }
    
    // Next month days to fill the rest of the calendar
    const totalCells = Math.ceil(calendarDays.length / 7) * 7;
    const daysFromNextMonth = totalCells - calendarDays.length;
    
    for (let day = 1; day <= daysFromNextMonth; day++) {
      const fullDate = new Date(year, month + 1, day);
      const dayOfWeek = dayNames[fullDate.getDay()];
      calendarDays.push({
        date: day,
        month: 'next',
        fullDate,
        dayOfWeek
      });
    }
    
    return calendarDays;
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedTimeslots(new Set());
      setSelectedSlotsMap(new Map());
    }
  };

  // Handle timeslot selection with full slot data
  const toggleTimeslotSelection = (slotId, slotData = null) => {
    const newSelectionSet = new Set(selectedTimeslots);
    const newSelectionMap = new Map(selectedSlotsMap);
    
    if (newSelectionSet.has(slotId)) {
      newSelectionSet.delete(slotId);
      newSelectionMap.delete(slotId);
    } else {
      newSelectionSet.add(slotId);
      if (slotData) {
        newSelectionMap.set(slotId, slotData);
      }
    }
    
    setSelectedTimeslots(newSelectionSet);
    setSelectedSlotsMap(newSelectionMap);
  };

  // Select all visible timeslots in month view
  const selectAllTimeslots = () => {
    const allSlotIds = new Set();
    const allSlotsMap = new Map();
    
    // Select all slots in current month
    const calendarDays = getCalendarDays();
    calendarDays.forEach(day => {
      if (day.month === 'current') {
        const availabilitySlots = getAvailabilitySlotsForDate(day.fullDate);
        
        availabilitySlots.forEach(slot => {
          allSlotIds.add(slot.id);
          allSlotsMap.set(slot.id, slot);
        });
      }
    });
    
    setSelectedTimeslots(allSlotIds);
    setSelectedSlotsMap(allSlotsMap);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTimeslots(new Set());
    setSelectedSlotsMap(new Map());
  };

  // Handle edit slot
  const handleEditSlot = (slot) => {
    setSelectedSlotForEdit(slot);
    setShowEditModal(true);
  };

  // Handle delete single slot
  const handleDeleteSlot = async (slot) => {
    if (!slot.id || !slot.id.startsWith('availability_')) {
      alert('No valid time slot to delete.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this time slot?')) {
      try {
        setIsDeleting(true);
        const result = await API.availability.deleteSingleAvailability(slot.id);

        // Notify parent component
        if (onAvailabilityDeleted) {
          onAvailabilityDeleted({ deletedCount: 1 });
        }
        alert('Time slot deleted successfully');
      } catch (error) {
        // Error deleting time slot
        alert('Error deleting time slot');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Handle edit confirmation
  const handleEditConfirm = async (updateData) => {
    if (!selectedSlotForEdit) return;

    setIsEditing(true);
    
    try {
      const response = await API.availability.updateSingleAvailability(selectedSlotForEdit.id, updateData);
      
      // Notify parent component
      if (onAvailabilityDeleted) {
        onAvailabilityDeleted({ updatedCount: response.updatedCount });
      }
      
      setShowEditModal(false);
      setSelectedSlotForEdit(null);
      alert(`Successfully updated ${response.updatedCount} time slot(s)`);
    } catch (error) {
      // Error updating time slot
      alert(`Error updating time slot: ${error.message}`);
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete confirmation (simplified to match list view)
  const handleDeleteConfirm = async () => {
    if (!tutorId || selectedTimeslots.size === 0) return;

    const selectedIds = Array.from(selectedTimeslots);
    const confirmMessage = `Are you sure you want to delete ${selectedIds.length} selected timeslot${selectedIds.length > 1 ? 's' : ''}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete each selected slot individually (like list view)
      for (const slotId of selectedIds) {
        await dataService.deleteTimeslot(tutorId, slotId);
      }

      // Refresh availability data
      await loadAvailabilityData();

      // Clear selection
      setSelectedTimeslots(new Set());
      setSelectedSlotsMap(new Map());
      setSelectionMode(false);

      // Notify parent component
      if (onAvailabilityDeleted) {
        onAvailabilityDeleted({ deletedCount: selectedIds.length });
      }

      alert(`Successfully deleted ${selectedIds.length} timeslot(s)`);
    } catch (error) {
      alert(`Failed to delete timeslots: ${error.message || 'Unknown error'}`);
    }
  };

  // Load availability data with conflicts
  const loadAvailabilityData = async () => {
    if (!tutorId) return;
    
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
      
      const rawData = await API.availability.getTutorAvailabilityRange(
        tutorId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Normalize and enhance the availability data for consistent timezone display
      const data = normalizeAvailabilityResponse(rawData);
      
      const availabilitySlots = [];
      
      if (data.availability) {
        // Handle NEW format: Flat array from recurring availability API
        if (Array.isArray(data.availability)) {
          console.log('Processing NEW API format (flat array):', data.availability.length, 'records');
          data.availability.forEach(slot => {
            // Enhance each slot with timezone-aware display fields
            const enhancedSlot = enhanceAvailabilityDisplay(slot);
            availabilitySlots.push(enhancedSlot);
          });
        }
        // Handle OLD format: Weekly grouped structure from legacy API
        else if (typeof data.availability === 'object') {
          console.log('Processing OLD API format (weekly grouped)');
          Object.entries(data.availability).forEach(([dayName, dayData]) => {
            if (dayData && dayData.timeSlots && Array.isArray(dayData.timeSlots)) {
              dayData.timeSlots.forEach(slot => {
                // Enhance each slot with timezone-aware display fields
                const enhancedSlot = enhanceAvailabilityDisplay({
                  ...slot,
                  dayName: dayName,
                  specificDate: slot.specificDate,
                  specific_date: slot.specificDate
                });
                availabilitySlots.push(enhancedSlot);
              });
            }
          });
        }
      }
      
      console.log('API Response:', data);
      console.log('Raw availability object type:', Array.isArray(data.availability) ? 'Array' : typeof data.availability);
      console.log('Raw availability count:', Array.isArray(data.availability) ? data.availability.length : 'N/A');
      console.log('Processed slots:', availabilitySlots.length, 'total');
      console.log('Processed slots details:', JSON.stringify(availabilitySlots.slice(0, 3), null, 2));
      setAvailabilityData(availabilitySlots);
    } catch (error) {
      console.error('Error loading availability data:', error);
      setAvailabilityData([]);
    }
  };

  // Load availability data when component mounts or date changes
  useEffect(() => {
    loadAvailabilityData();
  }, [tutorId, currentDate]);
  
  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedTimeslots(new Set());
      setSelectedSlotsMap(new Map());
    }
  }, [selectionMode]);
  
  // Keyboard shortcuts for selection mode
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!selectionMode) return;
      
      // Ctrl+A or Cmd+A - Select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        selectAllTimeslots();
      }
      
      // Escape - Clear selection or exit selection mode
      if (event.key === 'Escape') {
        if (selectedTimeslots.size > 0) {
          clearSelection();
        } else {
          setSelectionMode(false);
        }
      }
      
      // Delete - Delete selected slots
      if (event.key === 'Delete' && selectedTimeslots.size > 0) {
        setShowDeleteModal(true);
      }
    };
    
    if (selectionMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectionMode, selectedTimeslots.size]);

  // Get availability status and details for a date
  const getDateAvailability = (dayOfWeek, date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Find all availability slots for this specific date
    const specificAvailability = availabilityData.filter(
      avail => avail.specificDate === dateStr || avail.specific_date === dateStr
    );
    
    if (specificAvailability.length > 0) {
      // Check for actual conflicts (future/current sessions that make slots unavailable)
      const hasActiveConflicts = specificAvailability.some(avail => 
        (avail.hasConflicts || avail.has_conflicts) && 
        !(avail.availableForBooking === true || avail.available_for_booking === true)
      );
      
      // Check if any slots are available for booking
      const hasAvailableSlots = specificAvailability.some(avail => 
        avail.availableForBooking === true || avail.available_for_booking === true || 
        (!avail.hasConflicts && !avail.has_conflicts)
      );
      
      // Determine status based on availability and conflicts
      if (hasActiveConflicts && !hasAvailableSlots) {
        return 'has-session'; // All slots are booked with active sessions
      }
      if (hasAvailableSlots) {
        return 'available'; // At least some slots are available for booking
      }
      
      // Fallback: check editability
      const isEditable = specificAvailability.some(avail => 
        avail.isEditable !== false && avail.is_editable !== false
      );
      
      if (isEditable) return 'available';
      return 'locked';
    }

    // No availability found for this date
    return 'unavailable';
  };

  // Get availability slots for a specific date
  const getAvailabilitySlotsForDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return availabilityData.filter(
      avail => avail.specificDate === dateStr || avail.specific_date === dateStr
    );
  };


  // Check if date has scheduled sessions
  const hasSessionOnDate = (date) => {
    return upcomingSessions.some(session => {
      const sessionDate = new Date(session.scheduledDate || session.date);
      return sessionDate.toDateString() === date.toDateString();
    });
  };

  // Get sessions for a specific date
  const getSessionsForDate = (date) => {
    return upcomingSessions.filter(session => {
      const sessionDate = new Date(session.scheduledDate || session.date);
      return sessionDate.toDateString() === date.toDateString();
    });
  };


  // Navigation functions
  const goToPrevious = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNext = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get title for month view
  const getViewTitle = () => {
    const year = currentDate.getFullYear();
    const month = months[currentDate.getMonth()];
    return `${month} ${year}`;
  };

  const handleDateClick = (calendarDay) => {
    if (calendarDay.month !== 'current') return;
    
    // Call the parent's onDateClick to open CreateAvailabilityModal
    if (onDateClick) {
      // Create timezone-safe date string to avoid day shifting
      const year = calendarDay.fullDate.getFullYear();
      const month = String(calendarDay.fullDate.getMonth() + 1).padStart(2, '0');
      const day = String(calendarDay.fullDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      onDateClick(calendarDay.dayOfWeek, dateString);
    }
  };

  // Format date for tooltip
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render different view layouts
  const renderMonthView = () => {
    const calendarDays = getCalendarDays();
    const today = new Date();

    return (
      <div className="td-calendar-grid">
        {/* Weekday headers */}
        <div className="td-weekday-header">
          {weekDays.map(day => (
            <div key={day} className="td-weekday">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="td-calendar-body">
          {calendarDays.map((calendarDay, index) => {
            const isCurrentMonth = calendarDay.month === 'current';
            const isToday = calendarDay.fullDate.toDateString() === today.toDateString();
            const isSelected = selectedDate && 
              calendarDay.fullDate.toDateString() === selectedDate.toDateString();
            
            const availabilityStatus = isCurrentMonth ? 
              getDateAvailability(calendarDay.dayOfWeek, calendarDay.fullDate) : 
              'unavailable';
            
            const hasSession = hasSessionOnDate(calendarDay.fullDate);
            const sessionsForDate = getSessionsForDate(calendarDay.fullDate);
            const availabilitySlots = isCurrentMonth ? getAvailabilitySlotsForDate(calendarDay.fullDate) : [];
            
            // Check if this day has selected slots
            const dayHasSelection = () => {
              if (!selectionMode) return false;
              
              // Check API slots
              for (const slot of availabilitySlots) {
                if (selectedTimeslots.has(slot.id)) return true;
              }
              
              return false;
            };
            
            const hasSelectable = availabilitySlots.length > 0;
            
            return (
              <div
                key={index}
                className={`td-calendar-day td-${calendarDay.month} td-${availabilityStatus} 
                  ${isToday ? 'td-today' : ''} ${isSelected ? 'td-selected' : ''}
                  ${hasSession ? 'td-has-session' : ''} ${isCurrentMonth ? 'td-clickable' : ''}
                  ${selectionMode && hasSelectable ? 'td-selectable-slot' : ''}
                  ${dayHasSelection() ? 'td-slot-selected' : ''}`}
                onClick={() => {
                  if (selectionMode && hasSelectable && isCurrentMonth) {
                    // In selection mode, select all slots for this day
                    const allSelected = dayHasSelection();
                    
                    // Handle API slots
                    availabilitySlots.forEach(slot => {
                      if (allSelected) {
                        // Deselect all
                        toggleTimeslotSelection(slot.id);
                      } else {
                        // Select all
                        if (!selectedTimeslots.has(slot.id)) {
                          toggleTimeslotSelection(slot.id, slot);
                        }
                      }
                    });
                  } else if (!selectionMode) {
                    handleDateClick(calendarDay);
                  }
                }}
                onDoubleClick={() => {
                  if (onDateClick) {
                    // Create timezone-safe date string to avoid day shifting
                    const year = calendarDay.fullDate.getFullYear();
                    const month = String(calendarDay.fullDate.getMonth() + 1).padStart(2, '0');
                    const day = String(calendarDay.fullDate.getDate()).padStart(2, '0');
                    const dateString = `${year}-${month}-${day}`;
                    
                    onDateClick(calendarDay.dayOfWeek, dateString);
                  }
                }}
                title={
                  isCurrentMonth ? 
                    `${formatDate(calendarDay.fullDate)}\n` +
                    `Status: ${availabilityStatus}\n` +
                    (availabilitySlots.length ? 
                      `Available Slots:\n${availabilitySlots.map(slot => {
                        // Use timezone-aware display times if available, otherwise convert UTC to user timezone
                        let startTime, endTime;

                        if (slot.displayStartTime && slot.displayEndTime) {
                          // Use backend-provided display times
                          startTime = slot.displayStartTime;
                          endTime = slot.displayEndTime;
                        } else {
                          // Convert UTC times to user timezone using date context
                          try {
                            const dateContext = slot.instance_date || slot.specific_date || slot.specificDate;
                            const targetTimezone = slot.userTimezone || slot.displayTimezone;

                            if (dateContext && targetTimezone) {
                              startTime = convertUTCTimeToUserTimezone(slot.start_time || slot.startTime, dateContext, targetTimezone);
                              endTime = convertUTCTimeToUserTimezone(slot.end_time || slot.endTime, dateContext, targetTimezone);
                            } else {
                              // Fallback to original formatting
                              startTime = formatTimeInUserTimezone(`2000-01-01T${slot.start_time || slot.startTime}`);
                              endTime = formatTimeInUserTimezone(`2000-01-01T${slot.end_time || slot.endTime}`);
                            }
                          } catch (error) {
                            console.warn('TutorCalendar: Error converting UTC time to user timezone:', error);
                            // Fallback to original formatting
                            startTime = formatTimeInUserTimezone(`2000-01-01T${slot.start_time || slot.startTime}`);
                            endTime = formatTimeInUserTimezone(`2000-01-01T${slot.end_time || slot.endTime}`);
                          }
                        }

                        const courseId = slot.course_id || slot.courseId;
                        const courseInfo = assignedCourses.find(course => course.id === courseId);
                        const isAvailableForBooking = slot.availableForBooking === true || slot.available_for_booking === true;
                        const conflictCount = slot.conflictCount || slot.conflict_count || 0;

                        let statusText = '';
                        if (conflictCount > 0 && !isAvailableForBooking) {
                          statusText = ' [BOOKED]';
                        } else if (conflictCount > 0 && isAvailableForBooking) {
                          statusText = ' [HAS PAST SESSIONS]';
                        } else {
                          statusText = ' [AVAILABLE]';
                        }

                        const timezoneDisplay = slot.displayTimezoneAbbr ? ` ${slot.displayTimezoneAbbr}` : '';
                        return `• ${startTime} - ${endTime}${timezoneDisplay}${courseInfo ? ` (${courseInfo.title})` : ''}${statusText}`;
                      }).join('\n')}\n` : '') +
                    (sessionsForDate.length ? 
                      `Sessions: ${sessionsForDate.length}` : '')
                    : ''
                }
              >
                <span className="td-day-number">{calendarDay.date}</span>
                
                {/* Selection indicator in selection mode */}
                {selectionMode && hasSelectable && isCurrentMonth && (
                  <div className="td-selection-indicator">
                    {dayHasSelection() && <span className="td-check-mark">✓</span>}
                  </div>
                )}
                
                {/* Availability indicator */}
                {isCurrentMonth && (
                  <div className="td-day-indicators">
                    {availabilitySlots.length > 0 && (
                      <div className="td-time-indicator">
                        {availabilitySlots.length}
                      </div>
                    )}
                    
                    {hasSession && (
                      <div className="td-session-indicator">
                        {sessionsForDate.length}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };



  return (
    <div className="td-tutor-calendar">
      <div className="td-calendar-header">
        
        <div className="td-calendar-navigation">
          <button 
            className="td-nav-btn" 
            onClick={goToPrevious}
            title="Previous Month"
          >
            &#8249;
          </button>
          
          <h3 className="td-calendar-title">
            {getViewTitle()}
          </h3>
          
          <button 
            className="td-nav-btn" 
            onClick={goToNext}
            title="Next Month"
          >
            &#8250;
          </button>
        </div>
        
        <button 
          className="td-today-btn"
          onClick={goToToday}
        >
          Today
        </button>
      </div>

      {/* Selection Mode Controls */}
      <div className="td-selection-mode-controls">
        <label className={`td-selection-toggle ${selectionMode ? 'td-active' : ''}`}>
          <input
            type="checkbox"
            checked={selectionMode}
            onChange={toggleSelectionMode}
          />
          <span>Selection Mode</span>
        </label>
        
        {selectionMode && (
          <>
            <span className="td-selection-count">
              {selectedTimeslots.size} selected
            </span>
            
            <div className="td-selection-actions">
              <button 
                className="td-select-all-btn"
                onClick={selectAllTimeslots}
              >
                Select All
              </button>
              <button 
                className="td-clear-selection-btn"
                onClick={clearSelection}
              >
                Clear
              </button>
              <button 
                className="td-delete-selected-btn"
                onClick={handleDeleteConfirm}
                disabled={selectedTimeslots.size === 0}
              >
                Delete Selected
              </button>
            </div>
          </>
        )}
      </div>

      <div className="td-calendar-legend">
        <div className="td-legend-item">
          <span className="td-legend-dot td-available"></span>
          <span>Available</span>
        </div>
        <div className="td-legend-item">
          <span className="td-legend-dot td-partial"></span>
          <span>Partial</span>
        </div>
        <div className="td-legend-item">
          <span className="td-legend-dot td-unavailable"></span>
          <span>Unavailable</span>
        </div>
        <div className="td-legend-item">
          <span className="td-legend-dot td-session"></span>
          <span>Session</span>
        </div>
      </div>

      {/* Render month view */}
      {renderMonthView()}

      {/* Quick stats */}
      <div className="td-calendar-stats">
        <div className="td-stat-item">
          <span className="td-stat-label">Available Days:</span>
          <span className="td-stat-value">
            {new Set(availabilityData
              .filter(slot => slot.specific_date || slot.specificDate)
              .map(slot => new Date(slot.specific_date || slot.specificDate).getDay())
            ).size}/7
          </span>
        </div>
        <div className="td-stat-item">
          <span className="td-stat-label">Total Slots:</span>
          <span className="td-stat-value">
            {availabilityData.length}
          </span>
        </div>
        <div className="td-stat-item">
          <span className="td-stat-label">This Month:</span>
          <span className="td-stat-value">
            {availabilityData.filter(slot => {
              const slotDate = new Date(slot.specific_date || slot.specificDate);
              const currentMonth = currentDate.getMonth();
              const currentYear = currentDate.getFullYear();
              return slotDate.getMonth() === currentMonth && slotDate.getFullYear() === currentYear;
            }).length}
          </span>
        </div>
        <div className="td-stat-item">
          <span className="td-stat-label">Upcoming Sessions:</span>
          <span className="td-stat-value">
            {upcomingSessions.length}
          </span>
        </div>
      </div>


      {/* Edit Availability Modal */}
      <EditAvailabilityModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSlotForEdit(null);
        }}
        selectedSlot={selectedSlotForEdit}
        onConfirmEdit={handleEditConfirm}
        isEditing={isEditing}
        courses={assignedCourses}
      />
    </div>
  );
};

export default TutorCalendar;