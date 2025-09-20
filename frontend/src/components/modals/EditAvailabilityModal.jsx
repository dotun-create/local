import React, { useState, useEffect } from 'react';
import './EditAvailabilityModal.css';
import API from '../../services/api';

const EditAvailabilityModal = ({ 
  isOpen, 
  onClose, 
  selectedSlot,
  onConfirmEdit,
  isEditing = false,
  courses = [] 
}) => {
  const [editData, setEditData] = useState({
    startTime: '',
    endTime: '',
    courseId: '',
    available: true,
    timeZone: 'UTC'
  });
  const [updateOption, setUpdateOption] = useState('single'); // 'single', 'future', or 'all'
  const [conflicts, setConflicts] = useState(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  useEffect(() => {
    if (selectedSlot && isOpen) {
      // Initialize form with current slot data
      setEditData({
        startTime: selectedSlot.start_time || selectedSlot.startTime || '',
        endTime: selectedSlot.end_time || selectedSlot.endTime || '',
        courseId: selectedSlot.course_id || selectedSlot.courseId || '',
        available: selectedSlot.available !== false,
        timeZone: selectedSlot.time_zone || selectedSlot.timeZone || 'UTC'
      });
      
      // Check for conflicts
      checkConflicts(selectedSlot.id);
    }
  }, [selectedSlot, isOpen]);
  
  const checkConflicts = async (availabilityId) => {
    if (!availabilityId) return;
    
    setCheckingConflicts(true);
    try {
      const response = await API.availability.checkConflicts(availabilityId);
      setConflicts(response);
    } catch (error) {
      console.error('Error checking conflicts:', error);
      setConflicts(null);
    } finally {
      setCheckingConflicts(false);
    }
  };
  
  const validateTimeFormat = (time) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };
  
  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    setValidationError('');
  };
  
  const handleSubmit = () => {
    // Validate times
    if (!validateTimeFormat(editData.startTime)) {
      setValidationError('Invalid start time format. Use HH:MM (24-hour format)');
      return;
    }
    
    if (!validateTimeFormat(editData.endTime)) {
      setValidationError('Invalid end time format. Use HH:MM (24-hour format)');
      return;
    }
    
    if (editData.startTime >= editData.endTime) {
      setValidationError('End time must be after start time');
      return;
    }
    
    // Check if there are conflicts and time is being changed
    if (conflicts?.hasConflicts && 
        (editData.startTime !== selectedSlot.start_time || editData.endTime !== selectedSlot.end_time)) {
      if (!window.confirm(`Warning: There are ${conflicts.bookedSessions} booked sessions that may be affected. Continue?`)) {
        return;
      }
    }
    
    const updateData = {
      start_time: editData.startTime,
      end_time: editData.endTime,
      course_id: editData.courseId || null,
      available: editData.available,
      time_zone: editData.timeZone,
      updateOption: updateOption
    };
    
    onConfirmEdit(updateData);
  };
  
  if (!isOpen || !selectedSlot) return null;
  
  const hasRecurring = selectedSlot.is_recurring || selectedSlot.isRecurring;
  
  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  const getDayName = (dayNumber) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayNumber] || '';
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Availability</h2>
          <button className="close-btn" onClick={onClose} disabled={isEditing}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="slot-info">
            <h3>Editing Time Slot:</h3>
            <div className="slot-summary">
              <span className="slot-day">
                {selectedSlot.specific_date ? 
                  new Date(selectedSlot.specific_date).toLocaleDateString() :
                  getDayName(selectedSlot.day_of_week || selectedSlot.dayOfWeek)
                }
                {hasRecurring && ' (Recurring)'}
              </span>
              <span className="current-time">
                Current: {formatTime12Hour(selectedSlot.start_time || selectedSlot.startTime)} - 
                {formatTime12Hour(selectedSlot.end_time || selectedSlot.endTime)}
              </span>
            </div>
          </div>

          {checkingConflicts && (
            <div className="checking-conflicts">
              Checking for conflicts...
            </div>
          )}

          {conflicts?.hasConflicts && (
            <div className="conflict-warning">
              <span className="warning-icon">⚠️</span>
              <div>
                <p>This time slot has {conflicts.bookedSessions} booked session(s).</p>
                <p className="warning-note">Changing the time may affect these sessions.</p>
              </div>
            </div>
          )}

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime">Start Time (24-hour format)</label>
                <input
                  id="startTime"
                  type="text"
                  placeholder="HH:MM"
                  value={editData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  disabled={isEditing}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="endTime">End Time (24-hour format)</label>
                <input
                  id="endTime"
                  type="text"
                  placeholder="HH:MM"
                  value={editData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  disabled={isEditing}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="course">Course (Optional)</label>
              <select
                id="course"
                value={editData.courseId}
                onChange={(e) => handleInputChange('courseId', e.target.value)}
                disabled={isEditing}
              >
                <option value="">No specific course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="timezone">Time Zone</label>
              <select
                id="timezone"
                value={editData.timeZone}
                onChange={(e) => handleInputChange('timeZone', e.target.value)}
                disabled={isEditing}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Australia/Sydney">Sydney</option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editData.available}
                  onChange={(e) => handleInputChange('available', e.target.checked)}
                  disabled={isEditing}
                />
                <span>Available for booking</span>
              </label>
            </div>
          </div>

          {hasRecurring && (
            <div className="update-options">
              <h3>Update Options:</h3>
              <label className="radio-option">
                <input
                  type="radio"
                  value="single"
                  checked={updateOption === 'single'}
                  onChange={(e) => setUpdateOption(e.target.value)}
                  disabled={isEditing}
                />
                <span>Update only this instance</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="future"
                  checked={updateOption === 'future'}
                  onChange={(e) => setUpdateOption(e.target.value)}
                  disabled={isEditing}
                />
                <span>Update this and future instances</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="all"
                  checked={updateOption === 'all'}
                  onChange={(e) => setUpdateOption(e.target.value)}
                  disabled={isEditing}
                />
                <span>Update entire recurring series</span>
              </label>
            </div>
          )}

          {validationError && (
            <div className="error-message">
              {validationError}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={isEditing}
          >
            Cancel
          </button>
          <button 
            className="save-btn" 
            onClick={handleSubmit}
            disabled={isEditing}
          >
            {isEditing ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAvailabilityModal;