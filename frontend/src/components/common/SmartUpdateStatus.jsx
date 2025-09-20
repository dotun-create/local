/**
 * Smart Update Status Component
 *
 * A debug/admin component that shows the current status of the smart update service.
 * Useful for development and monitoring the polling behavior.
 */

import React, { useState } from 'react';
import { useSmartUpdates } from '../../hooks/useSmartUpdates';
import './SmartUpdateStatus.css';

const SmartUpdateStatus = ({ showDetails = false }) => {
  const [updateHistory, setUpdateHistory] = useState([]);

  const {
    status,
    lastUpdate,
    isActive,
    currentInterval,
    consecutiveErrors,
    triggerUpdate,
    start,
    stop
  } = useSmartUpdates({
    onUpdate: (updates) => {
      // Track update history for debugging
      setUpdateHistory(prev => [
        {
          timestamp: new Date(),
          count: updates.length,
          updates: updates
        },
        ...prev.slice(0, 9) // Keep last 10 updates
      ]);
    }
  });

  const formatInterval = (ms) => {
    if (ms < 60000) return `${ms / 1000}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const getStatusColor = () => {
    if (!isActive) return '#6c757d'; // Gray
    if (consecutiveErrors > 0) return '#dc3545'; // Red
    return '#28a745'; // Green
  };

  const handleTriggerUpdate = () => {
    triggerUpdate('manual');
  };

  if (!showDetails) {
    // Minimal status indicator
    return (
      <div className="smart-update-status-minimal">
        <div
          className="status-indicator"
          style={{ backgroundColor: getStatusColor() }}
          title={`Updates: ${isActive ? 'Active' : 'Inactive'} - Next: ${formatInterval(currentInterval)}`}
        />
        <span className="status-text">
          {formatInterval(currentInterval)}
        </span>
      </div>
    );
  }

  // Detailed status panel
  return (
    <div className="smart-update-status-panel">
      <div className="status-header">
        <h4>Smart Update Service</h4>
        <div className="status-controls">
          <button
            onClick={handleTriggerUpdate}
            className="btn btn-sm btn-outline-primary"
            disabled={!isActive}
          >
            Check Now
          </button>
          {isActive ? (
            <button onClick={stop} className="btn btn-sm btn-outline-danger">
              Stop
            </button>
          ) : (
            <button onClick={start} className="btn btn-sm btn-outline-success">
              Start
            </button>
          )}
        </div>
      </div>

      <div className="status-details">
        <div className="status-row">
          <span className="status-label">Status:</span>
          <span className={`status-value ${isActive ? 'active' : 'inactive'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="status-row">
          <span className="status-label">Current Interval:</span>
          <span className="status-value">{formatInterval(currentInterval)}</span>
        </div>

        <div className="status-row">
          <span className="status-label">Context:</span>
          <span className="status-value">{status.context}</span>
        </div>

        {consecutiveErrors > 0 && (
          <div className="status-row">
            <span className="status-label">Errors:</span>
            <span className="status-value error">{consecutiveErrors}</span>
          </div>
        )}

        {status.lastUpdateCheck && (
          <div className="status-row">
            <span className="status-label">Last Check:</span>
            <span className="status-value">
              {new Date(status.lastUpdateCheck).toLocaleTimeString()}
            </span>
          </div>
        )}

        {lastUpdate && (
          <div className="status-row">
            <span className="status-label">Last Update:</span>
            <span className="status-value">
              {lastUpdate.count} updates at {lastUpdate.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {updateHistory.length > 0 && (
        <div className="update-history">
          <h5>Recent Updates</h5>
          <div className="history-list">
            {updateHistory.map((update, index) => (
              <div key={index} className="history-item">
                <span className="history-time">
                  {update.timestamp.toLocaleTimeString()}
                </span>
                <span className="history-count">
                  {update.count} updates
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartUpdateStatus;