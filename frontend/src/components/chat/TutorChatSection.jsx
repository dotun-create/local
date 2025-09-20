import React, { useState, useEffect } from 'react';
import { getUserConversations } from '../../services/chatAPI';
import { useChat } from '../../hooks/useChat';
import CourseChat from './CourseChat';
import './TutorChatSection.css';

const TutorChatSection = ({ user }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [error, setError] = useState(null);
  
  // Use global chat state
  const { isEnabled: chatEnabled, isLoading: chatStatusLoading, error: chatError, refreshStatus } = useChat();

  useEffect(() => {
    if (chatEnabled) {
      loadConversations();
    } else {
      // Clear conversations and selected chat when disabled
      setConversations([]);
      setSelectedChat(null);
      setError(null);
    }
  }, [chatEnabled]);

  const loadConversations = async () => {
    try {
      setError(null);
      const response = await getUserConversations();
      if (response.success) {
        setConversations(response.conversations);
      } else {
        setError('Failed to load conversations');
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Failed to load conversations. Please try again.');
    }
  };

  const handleChatSelect = (conversation) => {
    setSelectedChat(conversation);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    // Refresh conversations when going back
    if (chatEnabled) {
      loadConversations();
    }
  };

  // Define the missing function that's called in the UI
  const checkChatStatusAndLoadConversations = async () => {
    try {
      setError(null);
      
      // Refresh chat status first
      await refreshStatus();
      
      // If chat is enabled, load conversations
      if (chatEnabled) {
        await loadConversations();
      }
    } catch (err) {
      console.error('Error checking chat status and loading conversations:', err);
      setError('Failed to refresh chat data. Please try again.');
    }
  };

  const getUnreadCount = (conversation) => {
    return conversation.unreadCount || 0;
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (chatStatusLoading) {
    return (
      <div className="tutor-chat-section loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Checking chat availability...</p>
        </div>
      </div>
    );
  }

  if (!chatEnabled) {
    return (
      <div className="tutor-chat-section disabled">
        <div className="chat-disabled-message">
          <div className="disabled-icon">💬</div>
          <h3>Chat System Disabled</h3>
          <p>The chat system has been disabled by the administrator.</p>
          <p>You'll be notified automatically when it becomes available again.</p>
          {chatError && (
            <p className="error-text">Error: {chatError}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tutor-chat-section error">
        <div className="error-message">
          <h3>Error Loading Chat</h3>
          <p>{error}</p>
          <button onClick={checkChatStatusAndLoadConversations} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (selectedChat) {
    return (
      <div className="tutor-chat-section">
        <div className="chat-header">
          <button onClick={handleBackToList} className="back-button">
            ← Back to Conversations
          </button>
          <h2>{selectedChat.name}</h2>
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
    <div className="tutor-chat-section">
      <div className="section-header">
        <h2>Course Conversations</h2>
        <button onClick={checkChatStatusAndLoadConversations} className="refresh-button">
          Refresh
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>No Conversations Yet</h3>
          <p>
            Course conversations will appear here once students start chatting 
            in your assigned courses.
          </p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="conversation-item"
              onClick={() => handleChatSelect(conversation)}
            >
              <div className="conversation-info">
                <div className="conversation-header">
                  <h4 className="conversation-title">{conversation.courseName}</h4>
                  {getUnreadCount(conversation) > 0 && (
                    <span className="unread-badge">
                      {getUnreadCount(conversation)}
                    </span>
                  )}
                </div>
                <p className="conversation-subtitle">{conversation.name}</p>
                <div className="conversation-meta">
                  <span className="participants-count">
                    {conversation.participantsCount} participants
                  </span>
                  {conversation.lastMessageAt && (
                    <span className="last-message-time">
                      Last message {formatLastMessageTime(conversation.lastMessageAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="conversation-arrow">→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TutorChatSection;