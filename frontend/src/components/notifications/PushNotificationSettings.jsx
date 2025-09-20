import React, { useState, useEffect } from 'react';
import { unifiedNotificationService } from '../../services/unifiedNotificationService';
import './PushNotificationSettings.css';

const PushNotificationSettings = ({ className = '' }) => {
  const [status, setStatus] = useState({
    supported: false,
    permission: 'default',
    subscribed: false,
    enabled: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    updateStatus();
  }, []);

  const updateStatus = () => {
    const currentStatus = unifiedNotificationService.getPushNotificationStatus();
    setStatus(currentStatus);
  };

  const handleTogglePushNotifications = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (status.enabled) {
        // Disable push notifications
        const success = await unifiedNotificationService.disablePushNotifications();
        if (success) {
          console.log('Push notifications disabled');
        }
      } else {
        // Enable push notifications
        const success = await unifiedNotificationService.enablePushNotifications();
        if (success) {
          console.log('Push notifications enabled');
        }
      }
      updateStatus();
    } catch (error) {
      console.error('Error toggling push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusMessage = () => {
    if (!status.supported) {
      return 'Push notifications are not supported in this browser';
    }

    switch (status.permission) {
      case 'granted':
        return status.enabled ? 'Push notifications are enabled' : 'Push notifications are available';
      case 'denied':
        return 'Push notifications are blocked. Please enable them in browser settings.';
      case 'default':
        return 'Click to enable push notifications';
      default:
        return 'Push notification status unknown';
    }
  };

  const getStatusIcon = () => {
    if (!status.supported) return '🚫';
    if (status.permission === 'denied') return '🔇';
    if (status.enabled) return '🔔';
    if (status.permission === 'granted') return '🔕';
    return '❓';
  };

  const canToggle = status.supported && status.permission !== 'denied';

  return (
    <div className={`push-notification-settings ${className}`}>
      <div className="push-settings-header">
        <div className="push-status-icon">
          {getStatusIcon()}
        </div>
        <div className="push-status-content">
          <h4>Push Notifications</h4>
          <p className="push-status-message">{getStatusMessage()}</p>
        </div>
        {canToggle && (
          <button
            className={`push-toggle-btn ${status.enabled ? 'enabled' : 'disabled'}`}
            onClick={handleTogglePushNotifications}
            disabled={isLoading}
          >
            {isLoading ? '...' : status.enabled ? 'Disable' : 'Enable'}
          </button>
        )}
      </div>

      {status.supported && (
        <div className="push-settings-details">
          <button
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>

          {showDetails && (
            <div className="push-details">
              <div className="detail-item">
                <span className="detail-label">Browser Support:</span>
                <span className={`detail-value ${status.supported ? 'positive' : 'negative'}`}>
                  {status.supported ? 'Supported' : 'Not Supported'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Permission:</span>
                <span className={`detail-value ${
                  status.permission === 'granted' ? 'positive' :
                  status.permission === 'denied' ? 'negative' : 'neutral'
                }`}>
                  {status.permission}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Subscription:</span>
                <span className={`detail-value ${status.subscribed ? 'positive' : 'neutral'}`}>
                  {status.subscribed ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Service Status:</span>
                <span className={`detail-value ${status.enabled ? 'positive' : 'neutral'}`}>
                  {status.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {status.permission === 'denied' && (
        <div className="push-help">
          <h5>To enable push notifications:</h5>
          <ol>
            <li>Click the lock icon in your browser's address bar</li>
            <li>Change notifications from "Block" to "Allow"</li>
            <li>Refresh the page</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default PushNotificationSettings;