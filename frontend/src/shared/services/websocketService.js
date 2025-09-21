/**
 * WebSocket Service for Real-time Updates
 * 
 * This service manages WebSocket connections for the hybrid refresh strategy,
 * handling admin events and coordinating page refreshes based on priority.
 */

import io from 'socket.io-client';
import { refreshManager } from './refreshManager';
import smartUpdateService from './smartUpdateService';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventHandlers = new Map();
    this.subscriptions = new Set();
    this.config = {
      url: process.env.REACT_APP_WS_URL || process.env.REACT_APP_API_URL || 'http://localhost:80',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    };
  }

  /**
   * Initialize WebSocket connection
   */
  connect() {
    if (this.socket && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      // Get auth token for authentication
      const token = sessionStorage.getItem('authToken');
      
      // Create socket connection with auth
      this.socket = io(this.config.url, {
        ...this.config,
        auth: {
          token: token
        },
        query: {
          token: token
        }
      });

      this._setupEventHandlers();
      this.socket.connect();
      
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this._fallbackToPolling();
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.subscriptions.clear();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  _setupEventHandlers() {
    // Connection established
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Re-subscribe to previous subscriptions
      this.subscriptions.forEach(subscription => {
        this.socket.emit('subscribe_to_updates', subscription);
      });
      
      // Notify refresh manager
      refreshManager.onWebSocketConnected();

      // Stop smart polling since WebSocket is connected
      smartUpdateService.stop();
    });

    // Connection lost
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;

      // Start smart polling as fallback
      this._fallbackToPolling();

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt reconnect
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached, falling back to polling');
        this._fallbackToPolling();
      }
    });

    // Admin update events (CRITICAL priority)
    this.socket.on('admin_update', (event) => {
      console.log('Received admin update:', event);
      this._handleAdminUpdate(event);
    });

    // Admin pending update events (IMPORTANT priority)
    this.socket.on('admin_update_pending', (event) => {
      console.log('Received pending admin update:', event);
      this._handlePendingUpdate(event);
    });

    // Background sync events (MINOR priority)
    this.socket.on('background_sync_available', (event) => {
      console.log('Background sync available:', event);
      this._handleBackgroundSync(event);
    });

    // Entity-specific updates
    this.socket.on('entity_update', (event) => {
      console.log('Received entity update:', event);
      this._handleEntityUpdate(event);
    });

    // Ping/pong for connection health
    this.socket.on('pong', (data) => {
      console.debug('Received pong:', data);
    });
  }

  /**
   * Handle critical admin updates (immediate refresh)
   */
  _handleAdminUpdate(event) {
    const { category, data, affected_entities, priority } = event;
    
    // Pass to refresh manager for immediate processing
    refreshManager.handleAdminEvent({
      type: 'ADMIN_UPDATE',
      priority: priority || 'CRITICAL',
      category,
      data,
      affectedEntities: affected_entities,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle pending updates with notification
   */
  _handlePendingUpdate(event) {
    const { category, data, affected_entities, notification_message } = event;
    
    // Pass to refresh manager with notification
    refreshManager.handleAdminEvent({
      type: 'ADMIN_UPDATE_PENDING',
      priority: 'IMPORTANT',
      category,
      data,
      affectedEntities: affected_entities,
      notificationMessage: notification_message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle background sync events
   */
  _handleBackgroundSync(event) {
    const { category, data, affected_entities } = event;
    
    // Pass to refresh manager for background processing
    refreshManager.handleAdminEvent({
      type: 'BACKGROUND_SYNC',
      priority: 'MINOR',
      category,
      data,
      affectedEntities: affected_entities,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle entity-specific updates
   */
  _handleEntityUpdate(event) {
    const { category, data, affected_entities } = event;
    
    // Check if current page is affected
    const currentPath = window.location.pathname;
    const isAffected = this._isPageAffected(currentPath, affected_entities);
    
    if (isAffected) {
      refreshManager.handleEntityUpdate({
        category,
        data,
        affectedEntities: affected_entities,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if current page is affected by the entities
   */
  _isPageAffected(currentPath, affectedEntities) {
    if (!affectedEntities || affectedEntities.length === 0) {
      return true; // If no specific entities, assume page is affected
    }

    for (const entity of affectedEntities) {
      const { type, id } = entity;
      
      // Check if current URL contains entity ID
      if (currentPath.includes(id)) {
        return true;
      }
      
      // Check specific page patterns
      if (type === 'course' && currentPath.includes('/course')) {
        return true;
      }
      if (type === 'user' && (currentPath.includes('/admin') || currentPath.includes('/profile'))) {
        return true;
      }
      if (type === 'session' && currentPath.includes('/session')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Subscribe to updates for specific entity
   */
  subscribeToEntity(entityType, entityId) {
    const subscription = { entity_type: entityType, entity_id: entityId };
    
    this.subscriptions.add(subscription);
    
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_to_updates', subscription);
    }
  }

  /**
   * Send ping to check connection health
   */
  ping() {
    if (this.socket && this.isConnected) {
      this.socket.emit('ping');
    }
  }

  /**
   * Fallback to smart polling when WebSocket fails
   */
  _fallbackToPolling() {
    console.log('WebSocket failed, falling back to smart polling mode');

    // Setup update handler for smart polling service
    smartUpdateService.onUpdate((updates) => {
      if (updates && updates.length > 0) {
        updates.forEach(update => {
          this._handleAdminUpdate(update);
        });
      }
    });

    // Start the smart polling service
    smartUpdateService.start();
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.disconnect();

    // Stop smart polling service
    smartUpdateService.stop();

    this.eventHandlers.clear();
    this.subscriptions.clear();
  }
}

// Create and export singleton instance
const websocketService = new WebSocketService();
export default websocketService;