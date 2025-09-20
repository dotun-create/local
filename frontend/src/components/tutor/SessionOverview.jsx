import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useData';
import dataService from '../../services/dataService';
import './SessionOverview.css';

const SessionOverview = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState({
    active: [],
    upcoming: [],
    history: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadSessions();
  }, [user?.id]); // Add user.id as dependency to reload when user becomes available

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Remove the user?.id condition - let the backend handle authentication
      // The JWT token will automatically identify the current user
      const [activeResponse, upcomingResponse, historyResponse] = await Promise.all([
        dataService.getTutorSessions('in_progress'),  // Fixed: 'active' -> 'in_progress'
        dataService.getTutorSessions('scheduled'),    // Fixed: 'upcoming' -> 'scheduled'
        dataService.getTutorSessions('completed')     // This was already correct
      ]);

      setSessions({
        active: activeResponse.sessions || [],
        upcoming: upcomingResponse.sessions || [],
        history: historyResponse.sessions || []
      });
    } catch (err) {
      setError('Failed to load sessions');
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'No date';

    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusBadge = (status) => {
    const statusClass = {
      'active': 'status-active',
      'scheduled': 'status-upcoming',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    }[status] || 'status-default';

    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  const handleStartSession = async (sessionId) => {
    try {
      await dataService.startSession(sessionId);
      await loadSessions();
    } catch (err) {
      setError('Failed to start session: ' + err.message);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      await dataService.completeSession(sessionId);
      await loadSessions();
    } catch (err) {
      setError('Failed to complete session: ' + err.message);
    }
  };

  const renderSessionCard = (session, showActions = false) => (
    <div key={session.id} className="session-card">
      <div className="session-header">
        <div className="session-title">
          <h4>{session.title || 'Tutoring Session'}</h4>
          {getStatusBadge(session.status)}
        </div>
        <div className="session-time">
          {formatDateTime(session.scheduled_date)}
        </div>
      </div>

      <div className="session-details">
        {session.description && (
          <p className="session-description">{session.description}</p>
        )}

        <div className="session-meta">
          <div className="meta-item">
            <span className="meta-label">Duration:</span>
            <span className="meta-value">{formatDuration(session.duration)}</span>
          </div>

          {session.course && (
            <div className="meta-item">
              <span className="meta-label">Course:</span>
              <span className="meta-value">{session.course.title || session.course.id}</span>
            </div>
          )}

          {session.lesson && (
            <div className="meta-item">
              <span className="meta-label">Lesson:</span>
              <span className="meta-value">{session.lesson.title || session.lesson.id}</span>
            </div>
          )}

          {session.students && session.students.length > 0 && (
            <div className="meta-item">
              <span className="meta-label">Students:</span>
              <span className="meta-value">{session.students.length}</span>
            </div>
          )}
        </div>

        {session.meeting_link && (
          <div className="session-meeting">
            <a
              href={session.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="meeting-link"
            >
              Join Meeting
            </a>
          </div>
        )}
      </div>

      {showActions && (
        <div className="session-actions">
          {session.status === 'scheduled' && (
            <button
              onClick={() => handleStartSession(session.id)}
              className="action-btn start-btn"
            >
              Start Session
            </button>
          )}

          {session.status === 'active' && (
            <button
              onClick={() => handleCompleteSession(session.id)}
              className="action-btn complete-btn"
            >
              Complete Session
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    const currentSessions = sessions[activeTab] || [];

    if (currentSessions.length === 0) {
      const emptyMessages = {
        active: 'No active sessions',
        upcoming: 'No upcoming sessions',
        history: 'No completed sessions'
      };

      return (
        <div className="empty-state">
          <p>{emptyMessages[activeTab]}</p>
        </div>
      );
    }

    return (
      <div className="sessions-list">
        {currentSessions.map(session =>
          renderSessionCard(session, activeTab !== 'history')
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="session-loading">Loading sessions...</div>;
  }

  return (
    <div className="session-overview">
      <div className="session-header">
        <h3>Session Overview</h3>
        <p>Manage your tutoring sessions</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      <div className="session-tabs">
        <button
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({sessions.active.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({sessions.upcoming.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History ({sessions.history.length})
        </button>
      </div>

      <div className="tab-content">
        {renderTabContent()}
      </div>

      <div className="refresh-section">
        <button onClick={loadSessions} className="refresh-btn">
          Refresh Sessions
        </button>
      </div>
    </div>
  );
};

export default SessionOverview;