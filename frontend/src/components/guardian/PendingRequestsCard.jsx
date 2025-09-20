import React, { useState, useEffect } from 'react';
import API from '../../services/api';

const PendingRequestsCard = ({ onRequestsUpdate }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingRequests, setProcessingRequests] = useState(new Set());

  // Load pending requests
  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.guardian.getPendingRequests();

      if (response && response.requests !== undefined) {
        // Handle successful response with requests array (empty or populated)
        setPendingRequests(response.requests || []);
      } else if (response && response.success && response.data && response.data.requests !== undefined) {
        // Handle nested data structure
        setPendingRequests(response.data.requests || []);
      } else {
        setError('Failed to load pending requests');
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setError('Error loading requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // Handle approve request
  const handleApprove = async (requestId, studentName) => {
    if (!window.confirm(`Are you sure you want to approve the request from ${studentName}?`)) {
      return;
    }

    try {
      setProcessingRequests(prev => new Set(prev).add(requestId));

      const response = await API.guardian.approveRequest(requestId, {
        response_message: 'Welcome! I have approved your request to link as my student.'
      });

      if (response.success) {
        // Remove approved request from list
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));

        // Notify parent component
        if (onRequestsUpdate) {
          onRequestsUpdate();
        }

        alert(`Successfully approved request from ${studentName}!`);
      } else {
        alert(response.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Handle reject request
  const handleReject = async (requestId, studentName) => {
    const reason = window.prompt(
      `Please provide a reason for rejecting ${studentName}'s request:`,
      'Unable to approve at this time'
    );

    if (!reason) {
      return; // User cancelled
    }

    try {
      setProcessingRequests(prev => new Set(prev).add(requestId));

      const response = await API.guardian.rejectRequest(requestId, {
        rejection_reason: reason,
        response_message: `I'm unable to approve your request at this time. Reason: ${reason}`
      });

      if (response.success) {
        // Remove rejected request from list
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));

        // Notify parent component
        if (onRequestsUpdate) {
          onRequestsUpdate();
        }

        alert(`Request from ${studentName} has been rejected.`);
      } else {
        alert(response.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';

    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="gd-overview-card">
        <h2>Pending Student Requests</h2>
        <div className="gd-loading-state">
          <div className="gd-loading-spinner">⏳</div>
          <p>Loading pending requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gd-overview-card">
        <h2>Pending Student Requests</h2>
        <div className="gd-error-state">
          <div className="gd-error-icon">❌</div>
          <p>{error}</p>
          <button onClick={fetchPendingRequests} className="gd-retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gd-overview-card gd-full-width">
      <h2>Pending Student Requests</h2>
      <div className="gd-pending-requests-summary">
        {pendingRequests.length === 0 ? (
          <div className="gd-no-pending">
            <p>✓ No pending student requests</p>
          </div>
        ) : (
          <div className="gd-requests-list">
            {pendingRequests.map((request) => {
              const isProcessing = processingRequests.has(request.id);

              return (
                <div key={request.id} className="gd-request-item">
                  <div className="gd-request-info">
                    <div className="gd-student-info">
                      <div className="gd-student-avatar-small">
                        <img
                          src={request.student?.profile?.avatar || '/images/user-avatar.png'}
                          alt={request.student?.profile?.name || 'Student'}
                        />
                      </div>
                      <div className="gd-student-details">
                        <h4>{request.student?.profile?.name || request.student?.email}</h4>
                        <p className="gd-student-email">{request.student?.email}</p>
                        <p className="gd-request-date">Requested: {formatDate(request.requestDate)}</p>
                        {request.studentMessage && (
                          <p className="gd-student-message">
                            <strong>Message:</strong> "{request.studentMessage}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="gd-request-actions">
                    <button
                      className={`gd-quick-approve-btn ${isProcessing ? 'processing' : ''}`}
                      onClick={() => handleApprove(request.id, request.student?.profile?.name || request.student?.email)}
                      disabled={isProcessing}
                      title="Approve request"
                    >
                      {isProcessing ? '⏳' : '✅'}
                    </button>
                    <button
                      className={`gd-quick-reject-btn ${isProcessing ? 'processing' : ''}`}
                      onClick={() => handleReject(request.id, request.student?.profile?.name || request.student?.email)}
                      disabled={isProcessing}
                      title="Reject request"
                    >
                      {isProcessing ? '⏳' : '❌'}
                    </button>
                  </div>
                </div>
              );
            })}

            {pendingRequests.length > 3 && (
              <div className="gd-view-all-requests">
                <button
                  className="gd-view-all-btn"
                  onClick={() => {
                    // This would navigate to a full requests page
                    // For now, we'll just refresh the requests
                    fetchPendingRequests();
                  }}
                >
                  View All Requests ({pendingRequests.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div className="gd-requests-summary-footer">
          <p className="gd-summary-text">
            {pendingRequests.length} student{pendingRequests.length > 1 ? 's' : ''} waiting for approval
          </p>
        </div>
      )}
    </div>
  );
};

export default PendingRequestsCard;