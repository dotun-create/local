import React, { useState, useEffect } from 'react';
import './css/RecurringAvailabilityModal.css';
import { getUserTimezone, convertLocalTimeToUTC } from '../../utils/timezoneManager';

const RecurringAvailabilityModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  selectedSlot = null,
  tutorId,
  assignedCourses = [] 
}) => {
  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    isRecurring: false,
    recurrenceType: 'weekly',
    recurrenceDays: [],
    recurrenceEndDate: '',
    courseId: '',
    timeZone: 'UTC'
  });

  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New state for edit scope selection
  const [editScope, setEditScope] = useState('single'); // 'single' or 'series'
  const [showScopeSelection, setShowScopeSelection] = useState(false);

  const weekDays = [
    { value: 0, label: 'Monday', short: 'Mon' },
    { value: 1, label: 'Tuesday', short: 'Tue' },
    { value: 2, label: 'Wednesday', short: 'Wed' },
    { value: 3, label: 'Thursday', short: 'Thu' },
    { value: 4, label: 'Friday', short: 'Fri' },
    { value: 5, label: 'Saturday', short: 'Sat' },
    { value: 6, label: 'Sunday', short: 'Sun' }
  ];

  // Initialize form with selected slot data
  useEffect(() => {
    if (selectedSlot) {
      // Check if this is a recurring slot or part of a recurring series
      const isPartOfRecurringSeries = selectedSlot.isRecurring || selectedSlot.parentAvailabilityId;
      setShowScopeSelection(isPartOfRecurringSeries);
      
      setFormData({
        dayOfWeek: selectedSlot.dayOfWeek || 1,
        startTime: selectedSlot.startTime || '09:00',
        endTime: selectedSlot.endTime || '10:00',
        isRecurring: selectedSlot.isRecurring || false,
        recurrenceType: selectedSlot.recurrenceType || 'weekly',
        recurrenceDays: selectedSlot.recurrenceDays || [],
        recurrenceEndDate: selectedSlot.recurrenceEndDate ? selectedSlot.recurrenceEndDate.split('T')[0] : '',
        courseId: selectedSlot.courseId || '',
        timeZone: selectedSlot.timeZone || 'UTC'
      });
    } else {
      // Reset form for new slot
      const defaultEndDate = new Date();
      defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
      
      setFormData({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        isRecurring: false,
        recurrenceType: 'weekly',
        recurrenceDays: [],
        recurrenceEndDate: defaultEndDate.toISOString().split('T')[0],
        courseId: '',
        timeZone: 'UTC'
      });
    }
    
    setError('');
    setConflicts([]);
  }, [selectedSlot, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleRecurrenceDayToggle = (dayValue) => {
    setFormData(prev => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(dayValue)
        ? prev.recurrenceDays.filter(d => d !== dayValue)
        : [...prev.recurrenceDays, dayValue]
    }));
  };

  const validateForm = () => {
    if (formData.startTime >= formData.endTime) {
      setError('End time must be after start time');
      return false;
    }

    if (formData.isRecurring && formData.recurrenceDays.length === 0) {
      setError('Please select at least one day for recurring availability');
      return false;
    }

    if (formData.isRecurring && !formData.recurrenceEndDate) {
      setError('Please select an end date for recurring availability');
      return false;
    }

    return true;
  };

  const checkForConflicts = async () => {
    if (!selectedSlot?.id) return;
    
    try {
      const response = await fetch(`/api/availability/${selectedSlot.id}/conflicts`);
      const data = await response.json();
      
      if (data.has_conflicts) {
        setConflicts(data.conflicting_sessions || []);
      } else {
        setConflicts([]);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  useEffect(() => {
    if (isOpen && selectedSlot?.id) {
      checkForConflicts();
    }
  }, [isOpen, selectedSlot]);

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // FIXED: Convert local times to UTC for consistent storage
      const userTimezone = getUserTimezone();
      const referenceDate = new Date().toISOString().split('T')[0]; // Today as reference

      // Convert user input times to UTC
      const utcStartTime = convertLocalTimeToUTC(formData.startTime, userTimezone, referenceDate);
      const utcEndTime = convertLocalTimeToUTC(formData.endTime, userTimezone, referenceDate);

      console.log('🌍 Timezone conversion for availability creation:', {
        userInput: { start: formData.startTime, end: formData.endTime },
        userTimezone,
        utcConverted: { start: utcStartTime, end: utcEndTime }
      });

      const payload = {
        tutorId,
        dayOfWeek: formData.dayOfWeek,
        startTime: utcStartTime,      // Send UTC time
        endTime: utcEndTime,          // Send UTC time
        courseId: formData.courseId || null,
        timeZone: 'UTC',              // Always store as UTC
        originalTimezone: userTimezone // Track user's original timezone
      };

      if (formData.isRecurring) {
        payload.recurrenceType = formData.recurrenceType;
        payload.recurrenceDays = formData.recurrenceDays;
        payload.recurrenceEndDate = new Date(formData.recurrenceEndDate + 'T23:59:59').toISOString();
      }

      let response;
      if (selectedSlot?.id) {
        // Update existing slot
        const isPartOfRecurringSeries = selectedSlot.isRecurring || selectedSlot.parentAvailabilityId;
        
        if (isPartOfRecurringSeries && editScope === 'series') {
          // Update entire recurring series
          response = await fetch(`/api/availability/recurring/${selectedSlot.parentAvailabilityId || selectedSlot.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              updateFutureOnly: true
            })
          });
        } else {
          // Update single instance only
          response = await fetch(`/api/availability/${selectedSlot.id}/single`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              editScope: editScope // Pass the scope to backend
            })
          });
        }
      } else {
        // Create new slot
        if (formData.isRecurring) {
          response = await fetch('/api/availability/recurring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          response = await fetch('/api/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      }

      const result = await response.json();

      if (result.success) {
        onSave(result);
        onClose();
      } else {
        setError(result.error || 'Failed to save availability');
      }
    } catch (error) {
      setError('Network error occurred. Please try again.');
      console.error('Error saving availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSlot?.id) return;

    // Create appropriate confirmation message based on edit scope
    const isPartOfRecurringSeries = selectedSlot.isRecurring || selectedSlot.parentAvailabilityId;
    let confirmMessage;
    
    if (isPartOfRecurringSeries) {
      if (editScope === 'series') {
        confirmMessage = 'Are you sure you want to delete this and all future recurring time slots?';
      } else {
        confirmMessage = 'Are you sure you want to delete just this occurrence?';
      }
    } else {
      confirmMessage = 'Are you sure you want to delete this availability?';
    }
    
    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    try {
      let response;
      
      if (isPartOfRecurringSeries && editScope === 'series') {
        // Delete entire series
        response = await fetch(`/api/availability/recurring/${selectedSlot.parentAvailabilityId || selectedSlot.id}?deleteFutureOnly=true`, {
          method: 'DELETE'
        });
      } else {
        // Delete single instance only
        response = await fetch(`/api/availability/${selectedSlot.id}/single`, {
          method: 'DELETE'
        });
      }

      const result = await response.json();
      
      if (result.success) {
        onSave({ deleted: true, ...result });
        onClose();
      } else {
        setError(result.error || 'Failed to delete availability');
      }
    } catch (error) {
      setError('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isEditable = !selectedSlot?.hasConflicts;
  const hasConflicts = conflicts.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recurring-availability-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <span className="icon">🕐</span>
            {selectedSlot ? 'Edit Availability' : 'Add Availability'}
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Edit Scope Selection for Recurring Slots */}
          {showScopeSelection && selectedSlot && (
            <div className="edit-scope-section">
              <h4>What would you like to edit?</h4>
              <div className="scope-options">
                <label className="scope-option">
                  <input
                    type="radio"
                    name="editScope"
                    value="single"
                    checked={editScope === 'single'}
                    onChange={(e) => setEditScope(e.target.value)}
                  />
                  <div className="option-content">
                    <span className="option-icon">📅</span>
                    <div>
                      <strong>Just this occurrence</strong>
                      <p>Edit only this specific time slot</p>
                    </div>
                  </div>
                </label>
                
                <label className="scope-option">
                  <input
                    type="radio"
                    name="editScope"
                    value="series"
                    checked={editScope === 'series'}
                    onChange={(e) => setEditScope(e.target.value)}
                  />
                  <div className="option-content">
                    <span className="option-icon">🔄</span>
                    <div>
                      <strong>All future occurrences</strong>
                      <p>Edit this and all future recurring time slots</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {hasConflicts && (
            <div className="conflicts-warning">
              <span className="warning-icon">🔒</span>
              <div>
                <strong>This slot has {conflicts.length} scheduled session(s)</strong>
                <p>Some changes may not be possible due to existing bookings.</p>
                {conflicts.map(conflict => (
                  <div key={conflict.session_id} className="conflict-item">
                    • {conflict.title} ({conflict.status})
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-section">
            <div className="form-group">
              <label>Day of Week</label>
              <select
                value={formData.dayOfWeek}
                onChange={e => handleInputChange('dayOfWeek', parseInt(e.target.value))}
                disabled={!isEditable}
              >
                {weekDays.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={e => handleInputChange('startTime', e.target.value)}
                  disabled={!isEditable}
                />
              </div>
              
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={e => handleInputChange('endTime', e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Course Assignment (Optional)</label>
              <select
                value={formData.courseId}
                onChange={e => handleInputChange('courseId', e.target.value)}
                disabled={!isEditable}
              >
                <option value="">No specific course</option>
                {assignedCourses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title} - {course.subject}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="recurring-section">
            <div className="recurring-toggle">
              <label className="toggle-container">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={e => handleInputChange('isRecurring', e.target.checked)}
                  disabled={!isEditable}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">
                  <span className="icon">🔄</span>
                  Make this recurring
                </span>
              </label>
            </div>

            {formData.isRecurring && (
              <div className="recurring-options">
                <div className="form-group">
                  <label>Repeat on these days:</label>
                  <div className="days-selector">
                    {weekDays.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        className={`day-btn ${formData.recurrenceDays.includes(day.value) ? 'selected' : ''}`}
                        onClick={() => handleRecurrenceDayToggle(day.value)}
                        disabled={!isEditable}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.recurrenceEndDate}
                    onChange={e => handleInputChange('recurrenceEndDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={!isEditable}
                  />
                </div>

                <div className="recurring-preview">
                  <h4>Preview</h4>
                  <p>
                    This will create recurring availability every{' '}
                    <strong>
                      {formData.recurrenceDays.map(dayValue => 
                        weekDays.find(d => d.value === dayValue)?.short
                      ).join(', ')}
                    </strong>{' '}
                    from <strong>{formData.startTime}</strong> to <strong>{formData.endTime}</strong>
                    {formData.recurrenceEndDate && (
                      <span> until <strong>{new Date(formData.recurrenceEndDate).toLocaleDateString()}</strong></span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          
          {selectedSlot && isEditable && (
            <button 
              className="btn-danger" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          )}
          
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={loading || !isEditable}
          >
            {loading ? 'Saving...' : selectedSlot ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringAvailabilityModal;