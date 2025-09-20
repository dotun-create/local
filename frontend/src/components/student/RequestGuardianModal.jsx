import React, { useState, useEffect } from 'react';
import API from '../../services/api';

const RequestGuardianModal = ({ isOpen, onClose, onRequestSent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedGuardian(null);
      setMessage('');
      setError(null);
    }
  }, [isOpen]);

  // Search for guardians
  const searchGuardians = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await API.guardian.searchGuardians(searchQuery);

      if (response.success && response.data) {
        setSearchResults(response.data.guardians || []);
      } else {
        setError('Failed to search guardians');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching guardians:', error);
      setError('Error searching guardians');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGuardians();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Send guardian request
  const sendRequest = async () => {
    if (!selectedGuardian) {
      setError('Please select a guardian');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const response = await API.student.requestGuardian(selectedGuardian.id, {
        message: message.trim() || 'I would like to link you as my guardian.'
      });

      if (response.success) {
        alert(`Request sent successfully to ${selectedGuardian.name || selectedGuardian.email}!`);

        if (onRequestSent) {
          onRequestSent(response.data.request);
        }

        onClose();
      } else {
        setError(response.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      setError('Error sending request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content request-guardian-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request Guardian Link</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!selectedGuardian ? (
            // Search Phase
            <div className="guardian-search-phase">
              <div className="search-section">
                <label htmlFor="guardian-search">Search for Guardian</label>
                <div className="search-input-container">
                  <input
                    id="guardian-search"
                    type="text"
                    placeholder="Enter guardian's email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {loading && <div className="search-spinner">⏳</div>}
                </div>
                <p className="search-help">
                  Enter at least 3 characters to search for guardians by email or name.
                </p>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">❌</span>
                  {error}
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="search-results">
                  <h3>Search Results</h3>
                  <div className="guardian-list">
                    {searchResults.map((guardian) => (
                      <div
                        key={guardian.id}
                        className={`guardian-item ${guardian.isLinked ? 'already-linked' : ''} ${guardian.hasPendingRequest ? 'pending-request' : ''}`}
                      >
                        <div className="guardian-info">
                          <div className="guardian-avatar">
                            <img
                              src="/images/user-avatar.png"
                              alt={guardian.name || 'Guardian'}
                            />
                          </div>
                          <div className="guardian-details">
                            <h4>{guardian.name || 'Unknown Name'}</h4>
                            <p className="guardian-email">{guardian.email}</p>
                            {guardian.isLinked && (
                              <span className="status-badge linked">Already Linked</span>
                            )}
                            {guardian.hasPendingRequest && (
                              <span className="status-badge pending">Request Pending</span>
                            )}
                          </div>
                        </div>

                        <div className="guardian-actions">
                          {guardian.isLinked ? (
                            <span className="status-text">✓ Linked</span>
                          ) : guardian.hasPendingRequest ? (
                            <span className="status-text">⏳ Pending</span>
                          ) : (
                            <button
                              className="select-guardian-btn"
                              onClick={() => setSelectedGuardian(guardian)}
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery.length >= 3 && !loading && searchResults.length === 0 && (
                <div className="no-results">
                  <p>No guardians found matching "{searchQuery}"</p>
                  <p className="help-text">
                    Make sure you have the correct email address or name.
                    The guardian must have an account on the platform.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Request Phase
            <div className="request-phase">
              <div className="selected-guardian">
                <h3>Send Request To:</h3>
                <div className="guardian-card">
                  <div className="guardian-avatar">
                    <img
                      src="/images/user-avatar.png"
                      alt={selectedGuardian.name || 'Guardian'}
                    />
                  </div>
                  <div className="guardian-details">
                    <h4>{selectedGuardian.name || 'Unknown Name'}</h4>
                    <p>{selectedGuardian.email}</p>
                  </div>
                  <button
                    className="change-guardian-btn"
                    onClick={() => setSelectedGuardian(null)}
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="message-section">
                <label htmlFor="request-message">Message (Optional)</label>
                <textarea
                  id="request-message"
                  placeholder="Hi! I would like you to be my guardian on this platform so you can help manage my courses and see my progress."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="message-textarea"
                />
                <p className="char-count">
                  {message.length}/500 characters
                </p>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">❌</span>
                  {error}
                </div>
              )}

              <div className="request-info">
                <div className="info-card">
                  <h4>What happens next?</h4>
                  <ol>
                    <li>Your request will be sent to the guardian</li>
                    <li>They will receive a notification to review your request</li>
                    <li>Once approved, they can manage your courses and view your progress</li>
                    <li>You can check the status in your dashboard</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!selectedGuardian ? (
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          ) : (
            <div className="request-actions">
              <button className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className={`send-request-btn ${sending ? 'loading' : ''}`}
                onClick={sendRequest}
                disabled={sending}
              >
                {sending ? 'Sending Request...' : 'Send Request'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .request-guardian-modal {
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .search-input-container {
          position: relative;
        }

        .search-spinner {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
        }

        .search-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 16px;
          margin-top: 5px;
        }

        .search-input:focus {
          border-color: #3b82f6;
          outline: none;
        }

        .search-help {
          font-size: 14px;
          color: #6b7280;
          margin-top: 5px;
        }

        .guardian-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 15px;
        }

        .guardian-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          transition: border-color 0.2s;
        }

        .guardian-item:hover {
          border-color: #d1d5db;
        }

        .guardian-item.already-linked {
          background-color: #f3f4f6;
          border-color: #d1d5db;
        }

        .guardian-item.pending-request {
          background-color: #fef3c7;
          border-color: #f59e0b;
        }

        .guardian-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .guardian-avatar img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .guardian-details h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .guardian-email {
          margin: 2px 0 0 0;
          font-size: 14px;
          color: #6b7280;
        }

        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          margin-top: 4px;
        }

        .status-badge.linked {
          background-color: #d1fae5;
          color: #065f46;
        }

        .status-badge.pending {
          background-color: #fef3c7;
          color: #92400e;
        }

        .select-guardian-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .select-guardian-btn:hover {
          background: #2563eb;
        }

        .status-text {
          font-size: 14px;
          font-weight: 500;
        }

        .selected-guardian .guardian-card {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          background: #eff6ff;
        }

        .change-guardian-btn {
          background: #6b7280;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin-left: auto;
        }

        .message-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          margin-top: 5px;
          resize: vertical;
        }

        .message-textarea:focus {
          border-color: #3b82f6;
          outline: none;
        }

        .char-count {
          text-align: right;
          font-size: 12px;
          color: #6b7280;
          margin-top: 5px;
        }

        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          margin-top: 15px;
        }

        .info-card h4 {
          margin: 0 0 10px 0;
          color: #374151;
        }

        .info-card ol {
          margin: 0;
          padding-left: 20px;
        }

        .info-card li {
          margin-bottom: 5px;
          color: #4b5563;
        }

        .request-actions {
          display: flex;
          gap: 10px;
        }

        .send-request-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .send-request-btn:hover {
          background: #059669;
        }

        .send-request-btn.loading {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: #6b7280;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .cancel-btn:hover {
          background: #4b5563;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px;
          border-radius: 6px;
          margin: 10px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .no-results {
          text-align: center;
          padding: 20px;
          color: #6b7280;
        }

        .help-text {
          font-size: 14px;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};

export default RequestGuardianModal;