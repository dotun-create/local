import React, { useState, useMemo, useCallback } from 'react';
import API from '../../../../services/api';

// Import BatchEditModal component - we'll use the one from BatchOperationsPanel
const BatchEditModal = ({ selectedItems, onSave, onCancel }) => {
  const [editForm, setEditForm] = useState({
    status: '',
    assignTutor: '',
    scheduleDate: '',
    duration: '',
    maxParticipants: '',
    description: ''
  });
  const [validationErrors, setValidationErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

  const isSingleEdit = selectedItems.length === 1;
  const isBulkEdit = selectedItems.length > 1;

  // Get common properties from selected items
  const commonTypes = [...new Set(selectedItems.map(item => item.type))];
  const canEditStatus = isSingleEdit && commonTypes.every(type => ['module', 'lesson', 'quiz', 'session'].includes(type));
  const canEditSchedule = isSingleEdit && commonTypes.every(type => ['session'].includes(type));
  const canAssignTutor = isSingleEdit && commonTypes.every(type => ['session'].includes(type));
  const canEditDuration = commonTypes.every(type => ['session'].includes(type));
  const canEditParticipants = commonTypes.every(type => ['session'].includes(type));
  const canEditDescription = isSingleEdit && commonTypes.every(type => ['session'].includes(type));

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const validateChanges = async () => {
    const errors = [];
    
    if (editForm.duration && (parseInt(editForm.duration) < 15 || parseInt(editForm.duration) > 480)) {
      errors.push('Duration must be between 15 and 480 minutes');
    }

    if (editForm.maxParticipants && parseInt(editForm.maxParticipants) < 1) {
      errors.push('Maximum participants must be at least 1');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    setIsValidating(true);
    const isValid = await validateChanges();
    setIsValidating(false);

    if (!isValid) {
      return;
    }

    // Map frontend form fields to API field names
    const fieldMapping = {
      maxParticipants: 'maxStudents',
      assignTutor: 'tutorId',
      scheduleDate: 'scheduledDate',
      status: 'status',
      duration: 'duration',
      description: 'description'
    };

    const changes = Object.entries(editForm)
      .filter(([_, value]) => value !== '')
      .reduce((acc, [key, value]) => {
        // Map frontend field names to API field names
        const apiFieldName = fieldMapping[key] || key;
        return { ...acc, [apiFieldName]: value };
      }, {});
    
    onSave(changes);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content batch-edit-modal">
        <div className="modal-header">
          <h3>{isSingleEdit ? 'Edit Session' : `Bulk Edit ${selectedItems.length} Sessions`}</h3>
          <button onClick={onCancel} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          {validationErrors.length > 0 && (
            <div className="validation-errors">
              <div className="error-header">⚠️ Please fix the following issues:</div>
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="batch-edit-form">
            {canEditStatus && (
              <div className="form-group">
                <label>Session Status</label>
                <select 
                  value={editForm.status} 
                  onChange={(e) => handleFormChange('status', e.target.value)}
                >
                  <option value="">Keep current</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
              </div>
            )}

            {canEditSchedule && (
              <div className="form-group">
                <label>Schedule Date & Time</label>
                <input 
                  type="datetime-local"
                  value={editForm.scheduleDate}
                  onChange={(e) => handleFormChange('scheduleDate', e.target.value)}
                />
                <small className="field-help">Leave empty to keep current schedule</small>
              </div>
            )}

            {canAssignTutor && (
              <div className="form-group">
                <label>Assign Tutor</label>
                <select 
                  value={editForm.assignTutor} 
                  onChange={(e) => handleFormChange('assignTutor', e.target.value)}
                >
                  <option value="">Keep current tutor</option>
                  <option value="tutor1">John Smith</option>
                  <option value="tutor2">Jane Doe</option>
                </select>
              </div>
            )}

            {canEditDuration && (
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input 
                  type="number"
                  value={editForm.duration}
                  onChange={(e) => handleFormChange('duration', e.target.value)}
                  placeholder={isBulkEdit ? "Set duration for all sessions" : "60"}
                  min="15"
                  max="480"
                  step="15"
                />
                <small className="field-help">Between 15 and 480 minutes</small>
              </div>
            )}

            {canEditParticipants && (
              <div className="form-group">
                <label>Maximum Participants</label>
                <input 
                  type="number"
                  value={editForm.maxParticipants}
                  onChange={(e) => handleFormChange('maxParticipants', e.target.value)}
                  placeholder={isBulkEdit ? "Set limit for all sessions" : "3"}
                  min="1"
                  max="30"
                />
                <small className="field-help">Minimum 1 participant</small>
              </div>
            )}

            {canEditDescription && (
              <div className="form-group">
                <label>Session Description</label>
                <textarea 
                  value={editForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Update session description..."
                  rows="3"
                />
              </div>
            )}

            {isBulkEdit && (
              <div className="bulk-edit-notice">
                <div className="notice-icon">ℹ️</div>
                <div className="notice-text">
                  <strong>Bulk Edit Mode:</strong> Only duration and maximum participants can be edited when multiple sessions are selected. 
                  Select a single session to access all editing options.
                </div>
              </div>
            )}
          </div>

          <div className="selected-items-preview">
            <h4>Selected Sessions:</h4>
            <div className="items-list">
              {selectedItems.slice(0, 5).map(item => (
                <div key={item.id} className="item-preview">
                  <span className="item-type">session</span>
                  <span className="item-title">{item.title}</span>
                </div>
              ))}
              {selectedItems.length > 5 && (
                <div className="items-more">
                  +{selectedItems.length - 5} more sessions
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="btn btn-primary"
            disabled={isValidating}
          >
            {isValidating ? 'Validating...' : isSingleEdit ? 'Save Changes' : 'Apply to All Sessions'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SessionsList = ({ sessions = [], onSessionSelect, selectedSessions = [], onRefresh }) => {
  const [sortField, setSortField] = useState('scheduledDate');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({
    status: 'all',
    tutor: 'all',
    search: '',
    dateRange: 'all'
  });
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Sort and filter sessions
  const processedSessions = useMemo(() => {
    let filtered = [...sessions];

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(session => session.status === filters.status);
    }

    if (filters.tutor !== 'all') {
      filtered = filtered.filter(session => 
        session.tutorId === filters.tutor || session.tutor_id === filters.tutor
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(session => 
        session.title?.toLowerCase().includes(searchLower) ||
        session.tutorName?.toLowerCase().includes(searchLower) ||
        session.tutor_name?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.start || session.scheduledDate || session.scheduled_date);
        
        switch (filters.dateRange) {
          case 'today':
            return sessionDate >= today && sessionDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
          case 'this_week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            return sessionDate >= weekStart && sessionDate < weekEnd;
          case 'this_month':
            return sessionDate.getMonth() === today.getMonth() && 
                   sessionDate.getFullYear() === today.getFullYear();
          case 'upcoming':
            return sessionDate > now;
          case 'past':
            return sessionDate < now;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'tutorName':
          aValue = a.tutorName || a.tutor_name || '';
          bValue = b.tutorName || b.tutor_name || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'participants':
          aValue = a.participants || 0;
          bValue = b.participants || 0;
          break;
        case 'scheduledDate':
        default:
          aValue = new Date(a.start || a.scheduledDate || a.scheduled_date || 0);
          bValue = new Date(b.start || b.scheduledDate || b.scheduled_date || 0);
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [sessions, filters, sortField, sortDirection]);

  // Get unique tutors for filter dropdown
  const availableTutors = useMemo(() => {
    const tutors = new Set();
    sessions.forEach(session => {
      const tutorName = session.tutorName || session.tutor_name;
      const tutorId = session.tutorId || session.tutor_id;
      if (tutorName && tutorId) {
        tutors.add(JSON.stringify({ id: tutorId, name: tutorName }));
      }
    });
    return Array.from(tutors).map(t => JSON.parse(t));
  }, [sessions]);

  // Handle sorting
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Handle individual session selection
  const handleSessionToggle = useCallback((session, isSelected) => {
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedSessions.filter(s => s.id !== session.id);
    } else {
      newSelection = [...selectedSessions, session];
    }
    
    onSessionSelect(newSelection);
    setSelectAll(newSelection.length === processedSessions.length);
  }, [selectedSessions, processedSessions.length, onSessionSelect]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      onSessionSelect([]);
      setSelectAll(false);
    } else {
      onSessionSelect(processedSessions);
      setSelectAll(true);
    }
  }, [selectAll, processedSessions, onSessionSelect]);

  // Handle delete selected sessions
  const handleDeleteSelected = useCallback(async () => {
    if (selectedSessions.length === 0) return;
    
    setIsDeleting(true);
    try {
      // Delete sessions in parallel
      const deletePromises = selectedSessions.map(async (session) => {
        const sessionId = session.id || session.session_id;
        return await API.sessions.deleteSession(sessionId);
      });
      
      await Promise.all(deletePromises);
      
      // Clear selection
      onSessionSelect([]);
      setSelectAll(false);
      setShowDeleteModal(false);
      
      // Refresh data if callback provided
      if (onRefresh) {
        await onRefresh();
      }
      
      // Show success message
      alert(`Successfully deleted ${selectedSessions.length} session${selectedSessions.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error deleting sessions:', error);
      alert(`Failed to delete some sessions. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedSessions, onSessionSelect, onRefresh]);

  // Handle edit selected sessions
  const handleEditSelected = useCallback(async (formChanges) => {
    if (selectedSessions.length === 0) return;
    
    try {
      // The formChanges are already mapped in the modal's handleSave method
      // Apply changes to all selected sessions
      const updatePromises = selectedSessions.map(async (session) => {
        const sessionId = session.id || session.session_id;
        return await API.sessions.updateSession(sessionId, formChanges);
      });
      
      await Promise.all(updatePromises);
      
      // Clear selection and close modal
      onSessionSelect([]);
      setSelectAll(false);
      setShowEditModal(false);
      
      // Refresh data if callback provided
      if (onRefresh) {
        await onRefresh();
      }
      
      // Show success message
      const actionType = selectedSessions.length === 1 ? 'updated' : 'bulk updated';
      alert(`Successfully ${actionType} ${selectedSessions.length} session${selectedSessions.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error updating sessions:', error);
      alert(`Failed to update some sessions. Please try again.`);
    }
  }, [selectedSessions, onSessionSelect, onRefresh]);

  // Format date for display with proper timezone handling
  const formatDate = (date) => {
    if (!date) return 'Not scheduled';
    
    try {
      // The backend now sends timezone-aware ISO strings
      const d = new Date(date);
      
      // Check if date is valid
      if (isNaN(d.getTime())) {
        return 'Invalid date';
      }
      
      // Use the date as-is since it already includes timezone information
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        // Don't override timezone - let the browser handle the timezone-aware date
      });
    } catch (error) {
      console.warn('Error formatting date:', date, error);
      return 'Invalid date';
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'status-badge-active';
      case 'completed':
        return 'status-badge-completed';
      case 'cancelled':
        return 'status-badge-cancelled';
      case 'scheduled':
      default:
        return 'status-badge-scheduled';
    }
  };

  return (
    <div className="sessions-list">
      {/* Filter Controls */}
      <div className="list-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search sessions..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Tutor:</label>
            <select
              value={filters.tutor}
              onChange={(e) => setFilters(prev => ({ ...prev, tutor: e.target.value }))}
              className="filter-select"
            >
              <option value="all">All Tutors</option>
              {availableTutors.map(tutor => (
                <option key={tutor.id} value={tutor.id}>{tutor.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range:</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
        </div>

        <div className="results-info">
          <span>Showing {processedSessions.length} of {sessions.length} sessions</span>
          {selectedSessions.length > 0 && (
            <span className="selection-info">
              {selectedSessions.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="sessions-table-container">
        <table className="sessions-table">
          <thead>
            <tr>
              <th className="select-column">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="select-checkbox"
                />
              </th>
              <th 
                className={`sortable ${sortField === 'title' ? 'active' : ''}`}
                onClick={() => handleSort('title')}
              >
                Session Title
                <span className={`sort-indicator ${sortField === 'title' ? sortDirection : ''}`}>
                  {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th 
                className={`sortable ${sortField === 'scheduledDate' ? 'active' : ''}`}
                onClick={() => handleSort('scheduledDate')}
              >
                Scheduled Date
                <span className={`sort-indicator ${sortField === 'scheduledDate' ? sortDirection : ''}`}>
                  {sortField === 'scheduledDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th 
                className={`sortable ${sortField === 'tutorName' ? 'active' : ''}`}
                onClick={() => handleSort('tutorName')}
              >
                Tutor
                <span className={`sort-indicator ${sortField === 'tutorName' ? sortDirection : ''}`}>
                  {sortField === 'tutorName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th 
                className={`sortable ${sortField === 'participants' ? 'active' : ''}`}
                onClick={() => handleSort('participants')}
              >
                Participants
                <span className={`sort-indicator ${sortField === 'participants' ? sortDirection : ''}`}>
                  {sortField === 'participants' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th 
                className={`sortable ${sortField === 'status' ? 'active' : ''}`}
                onClick={() => handleSort('status')}
              >
                Status
                <span className={`sort-indicator ${sortField === 'status' ? sortDirection : ''}`}>
                  {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {processedSessions.length > 0 ? (
              processedSessions.map(session => {
                const isSelected = selectedSessions.some(s => s.id === session.id);
                return (
                  <tr 
                    key={session.id} 
                    className={`session-row ${isSelected ? 'selected' : ''}`}
                  >
                    <td className="select-column">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSessionToggle(session, isSelected)}
                        className="select-checkbox"
                      />
                    </td>
                    <td className="session-title">
                      <div className="title-cell">
                        <span className="title-text">{session.title}</span>
                        {session.description && (
                          <span className="title-description">{session.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="session-date">
                      {formatDate(session.start || session.scheduledDate || session.scheduled_date)}
                    </td>
                    <td className="session-tutor">
                      {session.tutorName || session.tutor_name || 'Unassigned'}
                    </td>
                    <td className="session-participants">
                      <span className="participants-count">
                        {session.participants || 0}/{session.maxParticipants || 3}
                      </span>
                      <div className="participants-bar">
                        <div 
                          className="participants-fill"
                          style={{ 
                            width: `${((session.participants || 0) / (session.maxParticipants || 3)) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="session-status">
                      <span className={`status-badge ${getStatusBadgeClass(session.status)}`}>
                        {session.status || 'Scheduled'}
                      </span>
                    </td>
                    <td className="session-actions">
                      <div className="action-buttons">
                        <button 
                          className="action-btn view-btn"
                          title="View Session"
                          onClick={() => console.log('View session:', session.id)}
                        >
                          👁
                        </button>
                        <button 
                          className="action-btn edit-btn"
                          title="Edit Session"
                          onClick={() => console.log('Edit session:', session.id)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-btn delete-btn"
                          title="Delete Session"
                          onClick={() => console.log('Delete session:', session.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="empty-message">
                  <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <h3>No sessions found</h3>
                    <p>Try adjusting your filters or create a new session.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions */}
      {selectedSessions.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-actions-content">
            <span className="bulk-info">
              {selectedSessions.length} session{selectedSessions.length !== 1 ? 's' : ''} selected
            </span>
            <div className="bulk-buttons">
              <button 
                className="bulk-btn bulk-edit"
                onClick={() => setShowEditModal(true)}
                disabled={selectedSessions.length === 0}
              >
                📝 {selectedSessions.length === 1 ? 'Edit' : 'Bulk Edit'}
              </button>
              <button 
                className="bulk-btn bulk-delete"
                onClick={() => setShowDeleteModal(true)}
                disabled={selectedSessions.length === 0}
              >
                🗑️ Delete Selected
              </button>
              <button 
                className="bulk-btn bulk-clear"
                onClick={() => {
                  onSessionSelect([]);
                  setSelectAll(false);
                }}
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <BatchEditModal
          selectedItems={selectedSessions.map(session => ({
            id: session.id || session.session_id,
            title: session.title,
            type: 'session',
            data: session
          }))}
          onSave={handleEditSelected}
          onCancel={() => setShowEditModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-session-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Delete Selected Sessions</h3>
              <button className="close-modal" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="warning-message">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h4>Are you sure you want to delete {selectedSessions.length} selected session{selectedSessions.length > 1 ? 's' : ''}?</h4>
                  <p>This action cannot be undone. The session records will be permanently removed, but the availability slots will remain available for future bookings.</p>
                </div>
              </div>
              
              <div className="selected-sessions-preview">
                <h5>Sessions to be deleted:</h5>
                <ul>
                  {selectedSessions.slice(0, 5).map(session => (
                    <li key={session.id || session.session_id}>
                      <strong>{session.title}</strong> - {formatDate(session.scheduledDate || session.scheduled_date)}
                      {session.tutorName && <span> (Tutor: {session.tutorName})</span>}
                    </li>
                  ))}
                  {selectedSessions.length > 5 && (
                    <li>... and {selectedSessions.length - 5} more session{selectedSessions.length - 5 > 1 ? 's' : ''}</li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn danger"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner"></span>
                    Deleting...
                  </>
                ) : (
                  `Delete ${selectedSessions.length} Session${selectedSessions.length > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsList;