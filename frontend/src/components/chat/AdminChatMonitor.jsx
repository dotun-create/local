import React, { useState, useEffect } from 'react';
import CourseChat from './CourseChat';
import API from '../../services/api';
import './AdminChatMonitor.css';

const AdminChatMonitor = ({ user }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [filters, setFilters] = useState({
    courseId: '',
    tutorId: '',
    studentId: '',
    page: 1
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    page: 1
  });

  useEffect(() => {
    // Always refresh chat settings when component mounts or becomes visible
    loadChatSettings();

    // Listen for chat system toggle events from System Settings
    const handleChatToggle = (event) => {
      console.log('🔥 AdminChatMonitor: Chat status changed to:', event.detail.enabled);
      setChatEnabled(event.detail.enabled);
    };

    window.addEventListener('chatSystemToggled', handleChatToggle);

    // Also listen for when this component becomes visible (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadChatSettings();
      }
    };

    // Listen for focus events (when user switches back to this tab/component)
    const handleFocus = () => {
      loadChatSettings();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup listeners on component unmount
    return () => {
      window.removeEventListener('chatSystemToggled', handleChatToggle);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (chatEnabled) {
      loadChats();
    } else {
      // Clear chats and errors when chat is disabled
      setChats([]);
      setError(null);
      setIsLoading(false);
    }
  }, [chatEnabled, filters]);

  const loadChatSettings = async () => {
    try {
      // Get chat status from system settings using the same API as AdminPage
      const response = await API.systemSettings.getAllSettings();
      
      if (response.success) {
        const chatSetting = response.data.find(s => s.settingKey === 'chat_system_enabled');
        const isEnabled = chatSetting?.settingValue === 'true';
        setChatEnabled(isEnabled);
      } else {
        setChatEnabled(false);
      }
    } catch (err) {
      console.error('Failed to load chat status:', err);
      setChatEnabled(false);
    }
  };

  const loadChats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await API.chat.getAllChatsAdmin(filters);
      if (response.success) {
        setChats(response.chats);
        setPagination({
          total: response.total,
          pages: response.pages,
          page: response.page
        });
      } else {
        setError(response.error || 'Failed to load chats');
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
      // Handle specific error cases
      if (err.response?.status === 403) {
        setError('Chat system is disabled or you do not have admin access');
      } else {
        setError('Failed to load chats. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    loadChats(); // Refresh the list
  };

  // Add a refresh function that can be called externally
  const refreshChatStatus = () => {
    loadChatSettings();
  };

  const clearFilters = () => {
    setFilters({
      courseId: '',
      tutorId: '',
      studentId: '',
      page: 1
    });
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return 'No messages';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getParticipantsByRole = (participants) => {
    const roles = { students: [], tutors: [], admins: [] };
    participants.forEach(p => {
      if (p.role === 'student') roles.students.push(p);
      else if (p.role === 'tutor') roles.tutors.push(p);
      else if (p.role === 'admin') roles.admins.push(p);
    });
    return roles;
  };

  if (selectedChat) {
    return (
      <div className="admin-chat-monitor">
        <div className="chat-header">
          <button onClick={handleBackToList} className="back-button">
            ← Back to Chat Monitor
          </button>
          <div className="chat-info">
            <h2>{selectedChat.courseName}</h2>
            <span className="chat-subtitle">{selectedChat.name}</span>
          </div>
        </div>
        <div className="chat-container">
          <CourseChat 
            courseId={selectedChat.courseId} 
            user={user}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-chat-monitor">
      <div className="section-header">
        <div className="header-content">
          <h2>Chat System Monitor</h2>
          <p className="header-description">
            Monitor and manage all course conversations
          </p>
        </div>
        
        <div className="system-controls">
          <div className="status-display">
            <span className={`status-badge ${chatEnabled ? 'enabled' : 'disabled'}`}>
              {chatEnabled ? '✅ Chat System Enabled' : '❌ Chat System Disabled'}
            </span>
            {!chatEnabled && (
              <p className="enable-hint">
                Go to <strong>System Settings</strong> to enable the chat system.
              </p>
            )}
            <button onClick={refreshChatStatus} className="refresh-status-button">
              🔄 Refresh Status
            </button>
          </div>
        </div>
      </div>

      {!chatEnabled ? (
        <div className="chat-disabled-state">
          <div className="disabled-icon">🔒</div>
          <h3>Chat System is Disabled</h3>
          <p>
            The chat system is currently disabled. Enable it above to allow 
            course conversations between tutors and students.
          </p>
        </div>
      ) : (
        <>
          <div className="filters-section">
            <div className="filters-grid">
              <div className="filter-group">
                <label htmlFor="courseFilter">Filter by Course ID:</label>
                <input
                  id="courseFilter"
                  type="text"
                  value={filters.courseId}
                  onChange={(e) => handleFilterChange('courseId', e.target.value)}
                  placeholder="Enter course ID..."
                  className="filter-input"
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="tutorFilter">Filter by Tutor ID:</label>
                <input
                  id="tutorFilter"
                  type="text"
                  value={filters.tutorId}
                  onChange={(e) => handleFilterChange('tutorId', e.target.value)}
                  placeholder="Enter tutor ID..."
                  className="filter-input"
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="studentFilter">Filter by Student ID:</label>
                <input
                  id="studentFilter"
                  type="text"
                  value={filters.studentId}
                  onChange={(e) => handleFilterChange('studentId', e.target.value)}
                  placeholder="Enter student ID..."
                  className="filter-input"
                />
              </div>
              
              <div className="filter-actions">
                <button onClick={clearFilters} className="clear-filters-button">
                  Clear Filters
                </button>
                <button onClick={loadChats} className="refresh-button">
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading chats...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <h3>Error Loading Chats</h3>
              <p>{error}</p>
              <button onClick={loadChats} className="retry-button">
                Try Again
              </button>
            </div>
          ) : chats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>No chats to load at this time</h3>
            </div>
          ) : (
            <>
              <div className="chats-grid">
                {chats.map((chat) => {
                  const participantRoles = getParticipantsByRole(chat.participants || []);
                  
                  return (
                    <div
                      key={chat.id}
                      className="chat-card"
                      onClick={() => handleChatSelect(chat)}
                    >
                      <div className="chat-card-header">
                        <h4 className="chat-title">{chat.courseName}</h4>
                        <span className="message-count">
                          {chat.messageCount || 0} messages
                        </span>
                      </div>
                      
                      <p className="chat-subtitle">{chat.name}</p>
                      
                      <div className="participants-info">
                        <div className="participant-group">
                          <span className="participant-label">Students:</span>
                          <span className="participant-count">
                            {participantRoles.students.length}
                          </span>
                        </div>
                        <div className="participant-group">
                          <span className="participant-label">Tutors:</span>
                          <span className="participant-count">
                            {participantRoles.tutors.length}
                          </span>
                        </div>
                      </div>
                      
                      <div className="chat-meta">
                        <span className="last-activity">
                          {formatLastMessageTime(chat.lastMessageAt)}
                        </span>
                        <span className="chat-arrow">→</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={filters.page <= 1}
                    className="pagination-button"
                  >
                    Previous
                  </button>
                  
                  <span className="pagination-info">
                    Page {pagination.page} of {pagination.pages} 
                    ({pagination.total} total chats)
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={filters.page >= pagination.pages}
                    className="pagination-button"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AdminChatMonitor;