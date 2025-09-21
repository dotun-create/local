import React from 'react';
import { Card, Button, Badge, EmptyState } from '@shared';
import './NextSession.css';

const NextSession = ({
  session,
  onJoinSession,
  showJoinButton = true
}) => {
  if (!session) {
    return (
      <Card className="next-session-card">
        <div className="next-session-header">
          <h3>Next Session</h3>
        </div>
        <EmptyState
          icon="🎥"
          title="No upcoming sessions"
          description="Your scheduled sessions will appear here"
          size="small"
        />
      </Card>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeUntilSession = (dateString) => {
    const now = new Date();
    const sessionDate = new Date(dateString);
    const diff = sessionDate - now;

    if (diff < 0) return { text: 'Session started', color: 'var(--color-danger)', urgent: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return {
        text: `In ${days} day${days > 1 ? 's' : ''}`,
        color: 'var(--color-text-secondary)',
        urgent: false
      };
    }

    if (hours > 0) {
      return {
        text: `In ${hours} hour${hours > 1 ? 's' : ''}`,
        color: hours <= 2 ? 'var(--color-warning)' : 'var(--color-text-secondary)',
        urgent: hours <= 2
      };
    }

    if (minutes > 0) {
      return {
        text: `In ${minutes} minute${minutes > 1 ? 's' : ''}`,
        color: 'var(--color-danger)',
        urgent: true
      };
    }

    return {
      text: 'Starting now',
      color: 'var(--color-danger)',
      urgent: true
    };
  };

  const handleJoinSession = () => {
    if (onJoinSession) {
      onJoinSession(session);
    }
  };

  const timeUntil = getTimeUntilSession(session.date);

  return (
    <Card className={`next-session-card ${timeUntil.urgent ? 'next-session-card--urgent' : ''}`}>
      <div className="next-session-header">
        <h3>Next Session</h3>
        {timeUntil.urgent && (
          <Badge variant="danger" size="small">
            Starting Soon
          </Badge>
        )}
      </div>

      <div className="session-content">
        <div className="session-datetime">
          <div className="session-date">
            <div className="date-display">
              <span className="date-day">{new Date(session.date).getDate()}</span>
              <div className="date-month-year">
                <span className="date-month">
                  {new Date(session.date).toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="date-year">
                  {new Date(session.date).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          <div className="session-time">
            <div className="time-display">
              <span className="time-value">{formatTime(session.date)}</span>
              <span className="time-duration">{session.duration || '60 min'}</span>
            </div>
          </div>
        </div>

        <div className="session-info">
          <div className="session-details">
            <h4 className="session-title">{session.title}</h4>
            <p className="session-course">{session.course}</p>
            <p className="session-instructor">
              with {session.instructor || 'Instructor'}
            </p>

            {session.description && (
              <p className="session-description">{session.description}</p>
            )}

            {session.meetingId && (
              <div className="session-meeting-info">
                <span className="meeting-label">Meeting ID:</span>
                <span className="meeting-id">{session.meetingId}</span>
              </div>
            )}
          </div>

          <div className="session-status">
            <div
              className="time-until"
              style={{ color: timeUntil.color }}
            >
              {timeUntil.text}
            </div>

            {session.status && (
              <Badge
                variant={session.status === 'confirmed' ? 'success' : 'warning'}
                size="small"
              >
                {session.status}
              </Badge>
            )}
          </div>
        </div>

        {showJoinButton && (
          <div className="session-actions">
            <Button
              variant={timeUntil.urgent ? 'primary' : 'outline-primary'}
              size="medium"
              fullWidth
              onClick={handleJoinSession}
              disabled={!session.zoomLink}
            >
              {timeUntil.urgent ? 'Join Now' : 'Join Session'}
            </Button>

            <div className="session-links">
              {session.zoomLink && (
                <a
                  href={session.zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="zoom-link"
                >
                  🔗 Zoom Link
                </a>
              )}

              {session.materials && (
                <button className="materials-link">
                  📄 Session Materials
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default NextSession;