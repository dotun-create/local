import React, { useState } from 'react';
import './css/SecureSessionModal.css';

const SecureSessionModal = ({ isOpen, onClose, onSuccess }) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInitiateSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/secure-session/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          admin_password: adminPassword,
          operations: ['view_passwords']
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store secure session token
        sessionStorage.setItem('secure_session_token', data.session_token);
        sessionStorage.setItem('secure_session_expires', data.expires_at);
        
        onSuccess(data);
      } else {
        setError(data.error || 'Failed to create secure session');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay secure-session-modal-overlay">
      <div className="modal-content secure-session-modal">
        <div className="modal-header">
          <h3>🔐 Secure Authentication Required</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <div className="security-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4>High Security Operation</h4>
            <p>You are about to access sensitive user data. This action will be:</p>
            <ul>
              <li>✅ Fully audited and logged</li>
              <li>✅ Time-limited (15 minutes)</li>
              <li>✅ Rate limited</li>
              <li>⚠️ Monitored for compliance</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleInitiateSession} className="secure-auth-form">
          <div className="form-group">
            <label>Re-enter your admin password:</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Your admin password"
              required
              className="form-control"
            />
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-danger"
              disabled={loading || !adminPassword}
            >
              {loading ? 'Authenticating...' : 'Authorize Access'}
            </button>
          </div>
        </form>

        <div className="security-notice">
          <small>
            By proceeding, you acknowledge that this access is for legitimate 
            administrative purposes and will be audited for compliance.
          </small>
        </div>
      </div>
    </div>
  );
};

export default SecureSessionModal;