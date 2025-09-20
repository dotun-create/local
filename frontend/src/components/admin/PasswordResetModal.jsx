import React, { useState } from 'react';
import './css/PasswordResetModal.css';

const PasswordResetModal = ({ 
  user, 
  isOpen, 
  onClose, 
  onSuccess,
  isBulkMode = false,
  selectedUsers = [] 
}) => {
  const [resetMethod, setResetMethod] = useState('email');
  const [notifyUser, setNotifyUser] = useState(true);
  const [passwordLength, setPasswordLength] = useState(12);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const endpoint = isBulkMode 
        ? '/api/admin/users/bulk-reset-passwords'
        : `/api/admin/users/${user.id}/reset-password`;
      
      const payload = isBulkMode ? {
        user_ids: selectedUsers.map(u => u.id),
        method: resetMethod
      } : {
        method: resetMethod,
        notify_user: notifyUser,
        password_length: parseInt(passwordLength)
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, data });
        if (onSuccess) {
          onSuccess(data);
        }
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch (error) {
      setResult({ success: false, error: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content password-reset-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {isBulkMode 
              ? `Reset Passwords (${selectedUsers.length} users)`
              : `Reset Password - ${user?.name || user?.email}`
            }
          </h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {!isBulkMode && (
            <div className="user-info">
              <p><strong>User:</strong> {user?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Account Type:</strong> {user?.accountType || user?.account_type}</p>
            </div>
          )}

          <div className="reset-options">
            <h4>Reset Method:</h4>
            
            <label className="radio-option">
              <input
                type="radio"
                value="email"
                checked={resetMethod === 'email'}
                onChange={(e) => setResetMethod(e.target.value)}
              />
              <div className="radio-content">
                <strong>📧 Email Reset Link (Recommended)</strong>
                <p>Send secure reset link to user's email (expires in 1 hour)</p>
              </div>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                value="temp"
                checked={resetMethod === 'temp'}
                onChange={(e) => setResetMethod(e.target.value)}
              />
              <div className="radio-content">
                <strong>🔑 Generate Temporary Password</strong>
                <p>Create temporary password that user must change on next login</p>
              </div>
            </label>
          </div>

          {resetMethod === 'temp' && (
            <div className="temp-password-options">
              <label>
                Password Length:
                <select 
                  value={passwordLength} 
                  onChange={(e) => setPasswordLength(e.target.value)}
                >
                  <option value="8">8 characters</option>
                  <option value="10">10 characters</option>
                  <option value="12">12 characters</option>
                  <option value="16">16 characters</option>
                </select>
              </label>
            </div>
          )}

          {!isBulkMode && resetMethod === 'email' && (
            <div className="notification-options">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                />
                Send email notification to user
              </label>
            </div>
          )}

          {result && (
            <div className={`result-message ${result.success ? 'success' : 'error'}`}>
              {result.success ? (
                <div>
                  <p>✅ {result.data.message}</p>
                  {result.data.temporary_password && (
                    <div className="temp-password-display">
                      <strong>Temporary Password:</strong>
                      <code className="password-code">{result.data.temporary_password}</code>
                      <small>Share this securely with the user</small>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(result.data.temporary_password)}
                        className="copy-btn"
                      >
                        📋 Copy
                      </button>
                    </div>
                  )}
                  {isBulkMode && (
                    <div className="bulk-results">
                      <p>✅ Success: {result.data.success_count}</p>
                      <p>❌ Failed: {result.data.failure_count}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p>❌ {result.error}</p>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-danger"
              disabled={loading}
            >
              {loading ? 'Processing...' : `Reset Password${isBulkMode ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetModal;