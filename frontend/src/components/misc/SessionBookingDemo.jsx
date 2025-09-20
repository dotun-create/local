import React, { useState } from 'react';
import SessionBookingForm from './SessionBookingForm';
import './css/SessionBookingDemo.css';

const SessionBookingDemo = () => {
  const [createdSessions, setCreatedSessions] = useState([]);

  const handleSessionCreated = (sessionData) => {
    console.log('Session created:', sessionData);
    
    // Add to our local state for display
    setCreatedSessions(prev => [...prev, {
      ...sessionData,
      id: Date.now(),
      createdAt: new Date().toLocaleString()
    }]);

    // Show success message with meeting details
    if (sessionData.zoomResult && sessionData.zoomResult.success) {
      const meetingInfo = sessionData.zoomResult;
      alert(`Session created successfully!\n\nMeeting ID: ${meetingInfo.meetingId}\nJoin URL: ${meetingInfo.joinUrl}\nPassword: ${meetingInfo.password || 'No password required'}`);
    }
  };

  const formatSessionDisplay = (session) => {
    return {
      name: session.meetingName,
      type: session.meetingType,
      duration: `${session.meetingDuration} minutes`,
      startTime: session.startTime,
      recurring: session.meetingType === 'Recurring Meeting' ? {
        pattern: session.recurrencePattern,
        classDays: session.classDays,
        totalSessions: session.numberOfMeetingOccurences
      } : null,
      payment: session.requirePayment ? {
        cost: session.cost,
        currency: session.paymentSettings?.currency || session.meetingCurrency
      } : null,
      zoomSettings: session.meetingSettings,
      zoomResult: session.zoomResult
    };
  };

  return (
    <div className="session-booking-demo">
      <div className="demo-header">
        <h1>Session Booking System Demo</h1>
        <p>Create and manage Zoom sessions with payment integration</p>
      </div>

      <div className="demo-content">
        <div className="form-container">
          <SessionBookingForm onSessionCreated={handleSessionCreated} />
        </div>

        {createdSessions.length > 0 && (
          <div className="sessions-display">
            <h2>Created Sessions ({createdSessions.length})</h2>
            
            {createdSessions.map((session) => {
              const displayData = formatSessionDisplay(session);
              
              return (
                <div key={session.id} className="session-card">
                  <div className="session-header">
                    <h3>{displayData.name}</h3>
                    <span className={`session-type ${displayData.type.toLowerCase().replace(' ', '-')}`}>
                      {displayData.type}
                    </span>
                  </div>

                  <div className="session-details">
                    <div className="detail-group">
                      <strong>Duration:</strong> {displayData.duration}
                    </div>
                    
                    {displayData.startTime && (
                      <div className="detail-group">
                        <strong>Start Time:</strong> {new Date(displayData.startTime).toLocaleString()}
                      </div>
                    )}

                    {displayData.recurring && (
                      <div className="detail-group">
                        <strong>Recurrence:</strong> {displayData.recurring.pattern}
                        {displayData.recurring.classDays.length > 0 && (
                          <span> - Days: {displayData.recurring.classDays.join(', ')}</span>
                        )}
                        <span> - {displayData.recurring.totalSessions} sessions</span>
                      </div>
                    )}

                    {displayData.payment && (
                      <div className="detail-group payment-info">
                        <strong>Payment:</strong> {displayData.payment.currency} {displayData.payment.cost}
                      </div>
                    )}

                    <div className="zoom-settings">
                      <strong>Zoom Settings:</strong>
                      <ul>
                        <li>Waiting Room: {displayData.zoomSettings?.enableWaitingRoom ? '✅' : '❌'}</li>
                        <li>Join Before Host: {displayData.zoomSettings?.allowJoinBeforeHost ? '✅' : '❌'}</li>
                        <li>Mute on Entry: {displayData.zoomSettings?.muteParticipants ? '✅' : '❌'}</li>
                        <li>Auto Record: {displayData.zoomSettings?.recordMeetings ? '✅' : '❌'}</li>
                      </ul>
                    </div>

                    {displayData.zoomResult && displayData.zoomResult.success && (
                      <div className="zoom-result">
                        <strong>Zoom Meeting Created:</strong>
                        <div className="meeting-info">
                          <p><strong>Meeting ID:</strong> {displayData.zoomResult.meetingId}</p>
                          <p><strong>Join URL:</strong> 
                            <a href={displayData.zoomResult.joinUrl} target="_blank" rel="noopener noreferrer">
                              Join Meeting
                            </a>
                          </p>
                          {displayData.zoomResult.password && (
                            <p><strong>Password:</strong> {displayData.zoomResult.password}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {displayData.zoomResult && !displayData.zoomResult.success && (
                      <div className="zoom-error">
                        <strong>Zoom Error:</strong> {displayData.zoomResult.error}
                      </div>
                    )}
                  </div>

                  <div className="session-meta">
                    <small>Created: {session.createdAt}</small>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="demo-instructions">
        <h3>Instructions:</h3>
        <ol>
          <li>Fill out the session booking form above</li>
          <li>For recurring meetings, select "Recurring Meeting" type</li>
          <li>Configure your payment and Zoom settings</li>
          <li>Click "Save Session" to create the meeting</li>
          <li>The Zoom API will be called and results displayed below</li>
        </ol>
        
        <div className="note">
          <strong>Note:</strong> This demo requires valid Zoom API credentials in your environment variables.
          Set REACT_APP_ZOOM_ACCOUNT_ID, REACT_APP_ZOOM_CLIENT_ID, and REACT_APP_ZOOM_CLIENT_SECRET.
        </div>
      </div>
    </div>
  );
};

export default SessionBookingDemo;