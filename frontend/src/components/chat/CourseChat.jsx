import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './CourseChat.css';
import { getChatMessages, sendChatMessage, getCourseChat, markMessageAsRead } from '../../services/chatAPI';
import { useChat } from '../../hooks/useChat';

const CourseChat = ({ courseId, user }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chat, setChat] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  
  // Use global chat state
  const { isEnabled: chatEnabled, isLoading: chatStatusLoading, error: chatError } = useChat();
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    if (chatEnabled) {
      initializeChat();
    } else {
      // If chat is disabled, disconnect and clear state
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setMessages([]);
      setChat(null);
      setError(null);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [courseId, chatEnabled]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get or create course chat
      const chatResponse = await getCourseChat(courseId);
      if (chatResponse.success) {
        setChat(chatResponse.chat);
        
        // Load messages
        const messagesResponse = await getChatMessages(courseId);
        if (messagesResponse.success) {
          setMessages(messagesResponse.messages.reverse()); // Reverse to show oldest first
        }
      }

      // Initialize socket connection
      initializeSocket();
    } catch (err) {
      console.error('Failed to initialize chat:', err);
      setError('Failed to load chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSocket = () => {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      setError('Authentication required');
      return;
    }

    const newSocket = io((process.env.REACT_APP_API_URL || 'http://localhost:80'), {
      auth: {
        token: `Bearer ${token}`
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      
      // Join the course chat room
      newSocket.emit('join_course_chat', { course_id: courseId });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('Chat connection confirmed:', data);
    });

    newSocket.on('joined_chat', (data) => {
      console.log('Joined chat room:', data);
    });

    newSocket.on('new_message', (messageData) => {
      setMessages(prevMessages => [...prevMessages, messageData]);
      
      // Mark message as read if not from current user
      if (messageData.senderId !== user.id) {
        markMessageAsRead(messageData.id).catch(console.error);
      }
    });

    newSocket.on('user_joined', (userData) => {
      console.log('User joined chat:', userData);
      // Could add a system message here
    });

    newSocket.on('user_left', (userData) => {
      console.log('User left chat:', userData);
    });

    newSocket.on('user_typing', (data) => {
      if (data.user_id !== user.id) {
        if (data.is_typing) {
          setTypingUsers(prev => [...prev.filter(u => u.user_id !== data.user_id), data]);
        } else {
          setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
        }
      }
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'Connection error');
    });

    setSocket(newSocket);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return;
    }

    const messageData = {
      message_text: newMessage.trim(),
      reply_to_message_id: replyToMessage?.id
    };

    try {
      // Send via HTTP API for reliable delivery
      const response = await sendChatMessage(courseId, messageData);
      
      if (response.success) {
        // Add message to local state immediately for responsiveness
        setMessages(prevMessages => [...prevMessages, response.message]);
        
        // Clear input and reply
        setNewMessage('');
        setReplyToMessage(null);
        setIsTyping(false);
        
        // Clear typing indicator
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (socket && isConnected) {
          socket.emit('typing', { course_id: courseId, is_typing: false });
        }
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (!socket || !isConnected) return;

    // Handle typing indicators
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { course_id: courseId, is_typing: true });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { course_id: courseId, is_typing: false });
    }, 1000);
  };

  const handleReplyToMessage = (message) => {
    setReplyToMessage(message);
    messageInputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyToMessage(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages) => {
    const grouped = {};
    messages.forEach(message => {
      const date = formatDate(message.createdAt);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return grouped;
  };

  // Show loading while checking chat status
  if (chatStatusLoading) {
    return (
      <div className="course-chat loading">
        <div className="loading-spinner">Checking chat availability...</div>
      </div>
    );
  }

  // Show disabled state if chat is not enabled
  if (!chatEnabled) {
    return (
      <div className="course-chat disabled">
        <div className="chat-disabled-message">
          <div className="disabled-icon">💬</div>
          <h3>Chat Currently Disabled</h3>
          <p>The course chat system has been temporarily disabled by the administrator.</p>
          <p>You'll be notified automatically when it becomes available again.</p>
          {chatError && (
            <p className="error-text">Error: {chatError}</p>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="course-chat loading">
        <div className="loading-spinner">Loading chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-chat error">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={initializeChat} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="course-chat">
      <div className="chat-header">
        <h3>{chat?.name}</h3>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="chat-messages" id="chat-messages">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="date-separator">
              <span>{date}</span>
            </div>
            {dateMessages.map((message) => {
              if (!message || !message.id) {
                return null;
              }
              return (
                <div
                  key={message.id}
                  className={`message ${message.senderId === user?.id ? 'own-message' : 'other-message'}`}
                >
                  {message.replyToMessageId && (
                    <div className="reply-context">
                      <span>Replying to a message</span>
                    </div>
                  )}
                  <div className="message-header">
                    <span className="sender-name">{message.senderName || 'Unknown'}</span>
                    <span className="message-time">{formatTime(message.createdAt)}</span>
                  </div>
                  <div className="message-content">
                    <p>{message.messageText}</p>
                  </div>
                  {message.senderId !== user.id && (
                    <button
                      className="reply-button"
                      onClick={() => handleReplyToMessage(message)}
                      title="Reply to this message"
                    >
                      Reply
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span>
              {typingUsers.map(u => u.user_name).join(', ')} 
              {typingUsers.length === 1 ? ' is' : ' are'} typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {replyToMessage && (
        <div className="reply-preview">
          <div className="reply-content">
            <span>Replying to <strong>{replyToMessage.senderName}</strong></span>
            <p>{replyToMessage.messageText}</p>
          </div>
          <button onClick={cancelReply} className="cancel-reply">×</button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="message-form">
        <div className="input-container">
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="message-input"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="send-button"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseChat;