import React, { useState } from 'react';
import './css/PasswordViewModal.css';

const PasswordViewModal = ({ user, isOpen, onClose }) => {
  const [justification, setJustification] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewed, setViewed] = useState(false);

  const handleViewPassword = async (e) => {
    e.preventDefault();
    
    if (justification.trim().length < 10) {
      setError('Please provide a detailed justification (minimum 10 characters)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const secureToken = sessionStorage.getItem('secure_session_token');
      
      if (!secureToken) {
        setError('Secure session expired. Please re-authenticate.');
        return;
      }

      const response = await fetch(`/api/admin/users/${user.id}/password/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Secure-Session-Token': secureToken
        },
        body: JSON.stringify({
          justification: justification
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPassword(data.password);
        setViewed(true);
      } else {
        setError(data.error || 'Failed to retrieve password');
        
        if (response.status === 403) {
          // Clear expired session
          sessionStorage.removeItem('secure_session_token');
          sessionStorage.removeItem('secure_session_expires');
        }
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      // Show a brief success message
      const button = document.querySelector('.copy-password');
      const originalText = button.textContent;
      button.textContent = '✅ Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy password');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay password-view-modal-overlay">
      <div className="modal-content password-view-modal">
        <div className="modal-header">
          <h3>👁️ View User Password</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <div className="user-info-section">
          <h4>User Information</h4>
          <div className="user-details">
            <p><strong>Name:</strong> {user.name || 'N/A'}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Account Type:</strong> {user.accountType || user.account_type}</p>
            <p><strong>Status:</strong> {user.status || 'Active'}</p>
          </div>
        </div>

        {!viewed ? (
          <form onSubmit={handleViewPassword} className="justification-form">
            <div className="form-group">
              <label>Justification for accessing this password: *</label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Please provide a detailed reason for viewing this user's password (e.g., user locked out, password reset request, troubleshooting login issues, etc.)"
                rows="4"
                className="form-control"
                required
              />
              <small className="form-help">
                Minimum 10 characters required. This will be permanently logged for compliance.
              </small>
            </div>

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <div className="warning-box">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                <strong>Security Warning:</strong> Viewing user passwords is a high-privilege 
                operation that will be fully audited. Only proceed if absolutely necessary 
                for legitimate administrative purposes.
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-danger"
                disabled={loading || justification.trim().length < 10}
              >
                {loading ? 'Retrieving...' : 'View Password'}
              </button>
            </div>
          </form>
        ) : (
          <div className="password-display-section">
            <div className="password-retrieved">
              <h4>🔓 Password Retrieved</h4>
              <div className="password-container">
                <div className="password-field">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    value={password}
                    readOnly
                    className="password-input"
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    title={passwordVisible ? 'Hide password' : 'Show password'}
                  >
                    {passwordVisible ? '🙈' : '👁️'}
                  </button>
                  <button
                    type="button"
                    className="copy-password"
                    onClick={copyToClipboard}
                    title="Copy to clipboard"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
              
              <div className="audit-info">
                <small>
                  ✅ Access logged • Justification: "{justification}"
                </small>
              </div>

              <div className="security-reminder">
                <div className="reminder-icon">🛡️</div>
                <div className="reminder-text">
                  <strong>Remember:</strong>
                  <ul>
                    <li>This access has been logged and audited</li>
                    <li>Use this information responsibly</li>
                    <li>Do not share or store this password</li>
                    <li>Consider resetting the password after resolving the issue</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button onClick={onClose} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordViewModal;