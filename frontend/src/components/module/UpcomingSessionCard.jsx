import React from 'react';
import './css/UpcomingSessionCard.css';

const UpcomingSessionCard = ({ sessionDetails }) => {
  if (!sessionDetails) {
    return (
      <div className="upcoming-session-card">
        <div className="no-session">
          <span className="no-session-icon">📅</span>
          <p className="no-session-text">No upcoming sessions</p>
        </div>
      </div>
    );
  }

  const {
    id,
    title,
    date,
    time,
    duration,
    sessionLink,
    paymentStatus,
    paymentLink,
    instructor
  } = sessionDetails;

  const isPaid = paymentStatus === 'paid';
  const buttonText = isPaid ? 'Join' : 'Pay';
  const buttonLink = isPaid ? sessionLink : paymentLink;

  const handleButtonClick = () => {
    if (buttonLink) {
      window.open(buttonLink, '_blank');
    }
  };

  // Format date and time
  const formatDateTime = () => {
    if (date && time) {
      return `${date} - ${time}`;
    }
    return date || time || 'Time TBD';
  };

  return (
    <div className="upcoming-session-card">
      {/* Session Header */}
      <div className="session-header">
        <h3 className="session-title">{title || 'Upcoming Session'}</h3>
        {instructor && (
          <span className="session-instructor" title="Instructor">
            👨‍🏫 {instructor}
            {sessionDetails.instructorVerified && <span className="verified-badge"> ✅</span>}
            {sessionDetails.instructorVerified === false && <span className="unverified-badge"> ⚠️</span>}
          </span>
        )}
      </div>

      {/* Session Details */}
      <div className="session-details">
        {/* Date and Time */}
        <div className="session-datetime">
          <span className="datetime-icon" title="Session date and time">📅</span>
          <span className="datetime-text">{formatDateTime()}</span>
        </div>

        {/* Duration */}
        {duration && (
          <div className="session-duration" title="Session duration">
            <span className="duration-icon">⏱️</span>
            <span className="duration-text">{duration}</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="session-action">
        <button
          className={`session-button ${isPaid ? 'join-button' : 'pay-button'}`}
          onClick={handleButtonClick}
          title={isPaid ? 'Join the session' : 'Complete payment to join'}
        >
          {buttonText}
        </button>
        {!isPaid && (
          <span className="payment-required-text">Payment required</span>
        )}
      </div>

      {/* Status Indicator */}
      <div className={`session-status ${isPaid ? 'status-paid' : 'status-unpaid'}`}>
        <span className="status-dot"></span>
        <span className="status-text">{isPaid ? 'Ready' : 'Pending Payment'}</span>
      </div>
    </div>
  );
};

export default UpcomingSessionCard;