import React, { useState, useEffect } from 'react';
import {
  createZoomMeeting,
  updateZoomMeeting,
  deleteZoomMeeting,
  getZoomMeeting,
  listZoomMeetings,
  createRecurringMeeting,
  addMeetingRegistrant,
  getMeetingRegistrants,
  validateMeetingData,
  MeetingTypes,
  MeetingSettings,
  ZoomIntegrationMethods
} from '../../utils/zoomHelpers';
import './css/ZoomMeetingManager.css';

const ZoomMeetingManager = () => {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('create');

  const [meetingForm, setMeetingForm] = useState({
    topic: '',
    start_time: '',
    duration: 60,
    timezone: 'UTC',
    password: '',
    type: MeetingTypes.SCHEDULED,
    settings: MeetingSettings.DEFAULT
  });

  const [registrantForm, setRegistrantForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    org: ''
  });

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setIsLoading(true);
    try {
      const result = await listZoomMeetings();
      if (result.success) {
        setMeetings(result.meetings || []);
      } else {
        setError('Failed to load meetings: ' + result.error);
      }
    } catch (err) {
      setError('Error loading meetings: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const validation = validateMeetingData(meetingForm);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      setIsLoading(false);
      return;
    }

    try {
      const result = await createZoomMeeting(meetingForm);
      if (result.success) {
        setSuccess(`Meeting created successfully! Meeting ID: ${result.meetingId}`);
        setMeetingForm({
          topic: '',
          start_time: '',
          duration: 60,
          timezone: 'UTC',
          password: '',
          type: MeetingTypes.SCHEDULED,
          settings: MeetingSettings.DEFAULT
        });
        loadMeetings();
      } else {
        setError('Failed to create meeting: ' + JSON.stringify(result.error));
      }
    } catch (err) {
      setError('Error creating meeting: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteZoomMeeting(meetingId);
      if (result.success) {
        setSuccess('Meeting deleted successfully');
        loadMeetings();
      } else {
        setError('Failed to delete meeting: ' + result.error);
      }
    } catch (err) {
      setError('Error deleting meeting: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMeeting = async (meetingId) => {
    setIsLoading(true);
    try {
      const result = await getZoomMeeting(meetingId);
      if (result.success) {
        setSelectedMeeting(result.meeting);
        setActiveTab('view');
      } else {
        setError('Failed to fetch meeting details: ' + result.error);
      }
    } catch (err) {
      setError('Error fetching meeting: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRegistrant = async (e) => {
    e.preventDefault();
    if (!selectedMeeting) return;

    setIsLoading(true);
    try {
      const result = await addMeetingRegistrant(selectedMeeting.id, registrantForm);
      if (result.success) {
        setSuccess('Registrant added successfully');
        setRegistrantForm({
          email: '',
          first_name: '',
          last_name: '',
          phone: '',
          org: ''
        });
      } else {
        setError('Failed to add registrant: ' + result.error);
      }
    } catch (err) {
      setError('Error adding registrant: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCreateTutoringSession = async () => {
    const tutorData = { name: 'John Tutor' };
    const studentData = { 
      name: 'Jane Student', 
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Student'
    };
    const sessionData = {
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      timezone: 'UTC',
      requireRegistration: true
    };

    setIsLoading(true);
    try {
      const result = await ZoomIntegrationMethods.integrateWithTutoringSession(
        tutorData,
        studentData,
        sessionData
      );
      if (result.success) {
        setSuccess(`Tutoring session created! Join URL: ${result.joinUrl}`);
        loadMeetings();
      } else {
        setError('Failed to create tutoring session: ' + result.error);
      }
    } catch (err) {
      setError('Error creating tutoring session: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="zoom-meeting-manager">
      <div className="manager-header">
        <h2>Zoom Meeting Manager</h2>
        <div className="tab-buttons">
          <button 
            className={activeTab === 'create' ? 'active' : ''} 
            onClick={() => setActiveTab('create')}
          >
            Create Meeting
          </button>
          <button 
            className={activeTab === 'list' ? 'active' : ''} 
            onClick={() => setActiveTab('list')}
          >
            Meeting List
          </button>
          <button 
            className={activeTab === 'view' ? 'active' : ''} 
            onClick={() => setActiveTab('view')}
            disabled={!selectedMeeting}
          >
            View Details
          </button>
        </div>
      </div>

      {error && (
        <div className="alert error">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} className="close-btn">×</button>
        </div>
      )}

      {success && (
        <div className="alert success">
          <strong>Success:</strong> {success}
          <button onClick={() => setSuccess(null)} className="close-btn">×</button>
        </div>
      )}

      {isLoading && <div className="loading">Loading...</div>}

      <div className="tab-content">
        {activeTab === 'create' && (
          <div className="create-meeting-tab">
            <form onSubmit={handleCreateMeeting} className="meeting-form">
              <div className="form-group">
                <label>Meeting Topic *</label>
                <input
                  type="text"
                  value={meetingForm.topic}
                  onChange={(e) => setMeetingForm({...meetingForm, topic: e.target.value})}
                  placeholder="Enter meeting topic"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="datetime-local"
                    value={meetingForm.start_time}
                    onChange={(e) => setMeetingForm({...meetingForm, start_time: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={meetingForm.duration}
                    onChange={(e) => setMeetingForm({...meetingForm, duration: parseInt(e.target.value)})}
                    min="1"
                    max="1440"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Meeting Type</label>
                  <select
                    value={meetingForm.type}
                    onChange={(e) => setMeetingForm({...meetingForm, type: parseInt(e.target.value)})}
                  >
                    <option value={MeetingTypes.INSTANT}>Instant Meeting</option>
                    <option value={MeetingTypes.SCHEDULED}>Scheduled Meeting</option>
                    <option value={MeetingTypes.RECURRING_NO_FIXED_TIME}>Recurring (No Fixed Time)</option>
                    <option value={MeetingTypes.RECURRING_WITH_FIXED_TIME}>Recurring (Fixed Time)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Timezone</label>
                  <select
                    value={meetingForm.timezone}
                    onChange={(e) => setMeetingForm({...meetingForm, timezone: e.target.value})}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Password (optional)</label>
                <input
                  type="text"
                  value={meetingForm.password}
                  onChange={(e) => setMeetingForm({...meetingForm, password: e.target.value})}
                  placeholder="Meeting password"
                  maxLength="10"
                />
              </div>

              <div className="form-actions">
                <button type="submit" disabled={isLoading} className="create-btn">
                  {isLoading ? 'Creating...' : 'Create Meeting'}
                </button>
                <button 
                  type="button" 
                  onClick={handleQuickCreateTutoringSession}
                  disabled={isLoading}
                  className="quick-btn"
                >
                  Quick: Create Tutoring Session
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="meeting-list-tab">
            <div className="list-header">
              <h3>Your Meetings</h3>
              <button onClick={loadMeetings} disabled={isLoading} className="refresh-btn">
                Refresh
              </button>
            </div>

            {meetings.length === 0 ? (
              <div className="no-meetings">No meetings found. Create your first meeting!</div>
            ) : (
              <div className="meetings-grid">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="meeting-card">
                    <div className="meeting-header">
                      <h4>{meeting.topic}</h4>
                      <span className="meeting-type">
                        {meeting.type === 1 ? 'Instant' : meeting.type === 2 ? 'Scheduled' : 'Recurring'}
                      </span>
                    </div>
                    <div className="meeting-details">
                      <p><strong>ID:</strong> {meeting.id}</p>
                      {meeting.start_time && (
                        <p><strong>Start:</strong> {formatDateTime(meeting.start_time)}</p>
                      )}
                      <p><strong>Duration:</strong> {meeting.duration} minutes</p>
                      {meeting.password && (
                        <p><strong>Password:</strong> {meeting.password}</p>
                      )}
                    </div>
                    <div className="meeting-actions">
                      <button 
                        onClick={() => handleViewMeeting(meeting.id)}
                        className="view-btn"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => window.open(meeting.join_url, '_blank')}
                        className="join-btn"
                      >
                        Join Meeting
                      </button>
                      <button 
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'view' && selectedMeeting && (
          <div className="meeting-details-tab">
            <div className="meeting-info">
              <h3>{selectedMeeting.topic}</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Meeting ID:</label>
                  <span>{selectedMeeting.id}</span>
                </div>
                <div className="info-item">
                  <label>Start URL:</label>
                  <a href={selectedMeeting.start_url} target="_blank" rel="noopener noreferrer">
                    Host Meeting
                  </a>
                </div>
                <div className="info-item">
                  <label>Join URL:</label>
                  <a href={selectedMeeting.join_url} target="_blank" rel="noopener noreferrer">
                    Join Meeting
                  </a>
                </div>
                <div className="info-item">
                  <label>Status:</label>
                  <span className={`status ${selectedMeeting.status}`}>
                    {selectedMeeting.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="registrant-section">
              <h4>Add Registrant</h4>
              <form onSubmit={handleAddRegistrant} className="registrant-form">
                <div className="form-row">
                  <input
                    type="email"
                    placeholder="Email *"
                    value={registrantForm.email}
                    onChange={(e) => setRegistrantForm({...registrantForm, email: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={registrantForm.first_name}
                    onChange={(e) => setRegistrantForm({...registrantForm, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Last Name *"
                    value={registrantForm.last_name}
                    onChange={(e) => setRegistrantForm({...registrantForm, last_name: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Organization"
                    value={registrantForm.org}
                    onChange={(e) => setRegistrantForm({...registrantForm, org: e.target.value})}
                  />
                </div>
                <button type="submit" disabled={isLoading} className="add-registrant-btn">
                  Add Registrant
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoomMeetingManager;