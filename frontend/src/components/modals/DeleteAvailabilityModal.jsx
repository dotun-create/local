import React, { useState } from 'react';
import './DeleteAvailabilityModal.css';

const DeleteAvailabilityModal = ({ 
  isOpen, 
  onClose, 
  selectedTimeslots, 
  onConfirmDelete,
  isDeleting = false 
}) => {
  const [deleteOption, setDeleteOption] = useState('single'); // 'single' or 'series'
  
  if (!isOpen) return null;

  const hasRecurringSlots = selectedTimeslots.some(slot => slot.is_recurring || slot.isRecurring);
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDayName = (dayNumber) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayNumber] || '';
  };

  const handleConfirm = () => {
    onConfirmDelete(deleteOption);
  };

  return (
    <div className="avas-modal-overlay" onClick={onClose}>
      <div className="avas-delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="avas-modal-header">
          <h2>Delete Availability</h2>
          <button className="avas-close-btn" onClick={onClose} disabled={isDeleting}>
            ×
          </button>
        </div>

        <div className="avas-modal-body">
          <div className="avas-warning-message">
            <span className="avas-warning-icon">⚠️</span>
            <p>
              Are you sure you want to delete {selectedTimeslots.length} selected time slot{selectedTimeslots.length > 1 ? 's' : ''}?
            </p>
          </div>

          <div className="avas-selected-slots-list">
            <h3>Selected Time Slots:</h3>
            <div className="avas-slots-container">
              {selectedTimeslots.map((slot, index) => (
                <div key={slot.id || index} className="avas-slot-item">
                  <div className="avas-slot-details">
                    {slot.specific_date || slot.specificDate ? (
                      <span className="avas-slot-date">
                        {formatDate(slot.specific_date || slot.specificDate)}
                      </span>
                    ) : (
                      <span className="avas-slot-day">
                        {getDayName(slot.day_of_week || slot.dayOfWeek)}
                        {(slot.is_recurring || slot.isRecurring) && ' (Recurring)'}
                      </span>
                    )}
                    <span className="avas-slot-time">
                      {formatTime(slot.start_time || slot.startTime)} - {formatTime(slot.end_time || slot.endTime)}
                    </span>
                    {slot.course_name && (
                      <span className="avas-slot-course">{slot.course_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hasRecurringSlots && (
            <div className="avas-delete-options">
              <h3>Delete Options:</h3>
              <label className="avas-radio-option">
                <input
                  type="radio"
                  value="single"
                  checked={deleteOption === 'single'}
                  onChange={(e) => setDeleteOption(e.target.value)}
                  disabled={isDeleting}
                />
                <span>Delete only selected instances</span>
              </label>
              <label className="avas-radio-option">
                <input
                  type="radio"
                  value="series"
                  checked={deleteOption === 'series'}
                  onChange={(e) => setDeleteOption(e.target.value)}
                  disabled={isDeleting}
                />
                <span>Delete entire recurring series</span>
              </label>
            </div>
          )}

          <div className="avas-warning-note">
            <p>
              <strong>Note:</strong> This action cannot be undone. Any sessions booked in these time slots will need to be rescheduled.
            </p>
          </div>
        </div>

        <div className="avas-modal-footer">
          <button
            className="avas-cancel-btn"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="avas-delete-btn"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAvailabilityModal;