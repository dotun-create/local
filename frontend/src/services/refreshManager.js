/**
 * Refresh Manager for Hybrid Refresh Strategy
 * 
 * This service coordinates page refreshes based on admin events,
 * managing priorities, delays, and state preservation.
 */

import { statePreserver } from './statePreserver';
import { notificationService } from './notificationService';

class RefreshManager {
  constructor() {
    this.pendingRefreshes = new Map();
    this.refreshTimers = new Map();
    this.isRefreshing = false;
    this.userActivity = {
      isActive: false,
      lastActivity: Date.now(),
      inSafeZone: false
    };
    this.config = {
      priorities: {
        CRITICAL: { delay: 0, method: 'immediate' },
        IMPORTANT: { delay: 30000, method: 'notify' },
        MINOR: { delay: 300000, method: 'background' }
      },
      safeZones: [
        '/quiz',
        '/payment',
        '/session/active'
      ],
      debounceWindow: 5000,
      staggerMaxDelay: 5000,
      activityTimeout: 60000
    };
    
    this._setupActivityTracking();
    this._setupRefreshHandlers();
  }

  /**
   * Setup user activity tracking
   */
  _setupActivityTracking() {
    // Track mouse and keyboard activity
    const updateActivity = () => {
      this.userActivity.lastActivity = Date.now();
      this.userActivity.isActive = true;
    };

    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('click', updateActivity);
    document.addEventListener('scroll', updateActivity);

    // Check for inactivity periodically
    setInterval(() => {
      const timeSinceActivity = Date.now() - this.userActivity.lastActivity;
      if (timeSinceActivity > this.config.activityTimeout) {
        this.userActivity.isActive = false;
      }
    }, 10000);

    // Check if in safe zone
    this._checkSafeZone();
  }

  /**
   * Check if current page is in a safe zone
   */
  _checkSafeZone() {
    const currentPath = window.location.pathname;
    this.userActivity.inSafeZone = this.config.safeZones.some(zone => 
      currentPath.startsWith(zone)
    );
  }

  /**
   * Setup refresh event handlers
   */
  _setupRefreshHandlers() {
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible, process any pending refreshes
        this._processPendingRefreshes();
      }
    });

    // Listen for before unload to save state
    window.addEventListener('beforeunload', () => {
      if (this.isRefreshing) {
        statePreserver.saveCurrentState();
      }
    });
  }

  /**
   * Handle admin event from WebSocket
   */
  handleAdminEvent(event) {
    console.log('Refresh Manager: Handling admin event', event);
    
    const { priority, category, data, affectedEntities, notificationMessage } = event;
    const priorityConfig = this.config.priorities[priority] || this.config.priorities.MINOR;
    
    // Check if user is in safe zone
    if (this.userActivity.inSafeZone && priority !== 'CRITICAL') {
      console.log('User in safe zone, queueing refresh');
      this._queueRefresh(event);
      return;
    }

    // Check if user is active
    if (this.userActivity.isActive && priority === 'MINOR') {
      console.log('User is active, deferring minor update');
      this._queueRefresh(event);
      return;
    }

    // Process based on priority
    switch (priorityConfig.method) {
      case 'immediate':
        this._performImmediateRefresh(event);
        break;
      case 'notify':
        this._performNotifyRefresh(event, notificationMessage);
        break;
      case 'background':
        this._performBackgroundRefresh(event);
        break;
      default:
        this._queueRefresh(event);
    }
  }

  /**
   * Handle entity-specific update
   */
  handleEntityUpdate(event) {
    console.log('Refresh Manager: Handling entity update', event);
    
    // Perform selective refresh based on affected entities
    this._performSelectiveRefresh(event);
  }

  /**
   * Perform immediate refresh (CRITICAL priority)
   */
  async _performImmediateRefresh(event) {
    console.log('Performing immediate refresh');
    
    // Debounce multiple immediate refreshes
    if (this.isRefreshing) {
      this._queueRefresh(event);
      return;
    }

    try {
      this.isRefreshing = true;
      
      // Save current state
      await statePreserver.saveCurrentState();
      
      // Add stagger delay to prevent server overload
      const staggerDelay = Math.random() * this.config.staggerMaxDelay;
      await this._delay(staggerDelay);
      
      // Perform refresh based on current page
      await this._refreshCurrentPage(event);
      
      // Restore state
      await statePreserver.restoreState();
      
    } catch (error) {
      console.error('Immediate refresh failed:', error);
    } finally {
      this.isRefreshing = false;
      
      // Process any queued refreshes
      setTimeout(() => this._processPendingRefreshes(), 1000);
    }
  }

  /**
   * Perform refresh with notification (IMPORTANT priority)
   */
  _performNotifyRefresh(event, message) {
    console.log('Showing notification for pending refresh');
    
    const notificationMessage = message || 'Updates are available. Click to refresh.';
    
    // Show notification with refresh button
    notificationService.showRefreshNotification({
      message: notificationMessage,
      actionLabel: 'Refresh Now',
      onAction: () => {
        this._performImmediateRefresh(event);
      },
      onDismiss: () => {
        // Schedule background refresh if dismissed
        this._scheduleRefresh(event, this.config.priorities.IMPORTANT.delay);
      }
    });
  }

  /**
   * Perform background refresh (MINOR priority)
   */
  _performBackgroundRefresh(event) {
    console.log('Scheduling background refresh');
    
    // Schedule refresh for later
    this._scheduleRefresh(event, this.config.priorities.MINOR.delay);
  }

  /**
   * Perform selective refresh for specific entities
   */
  async _performSelectiveRefresh(event) {
    const { category, affectedEntities } = event;
    
    try {
      // Save minimal state
      const scrollPosition = window.scrollY;
      
      // Determine what to refresh based on category
      switch (category) {
        case 'COURSE_UPDATE':
          await this._refreshCourseData(affectedEntities);
          break;
        case 'USER_MANAGEMENT':
          await this._refreshUserData(affectedEntities);
          break;
        case 'SESSION_CHANGE':
          await this._refreshSessionData(affectedEntities);
          break;
        case 'ENROLLMENT':
          await this._refreshEnrollmentData(affectedEntities);
          break;
        default:
          await this._refreshCurrentPage(event);
      }
      
      // Restore scroll position
      window.scrollTo(0, scrollPosition);
      
    } catch (error) {
      console.error('Selective refresh failed:', error);
    }
  }

  /**
   * Queue a refresh for later processing
   */
  _queueRefresh(event) {
    const key = `${event.category}_${Date.now()}`;
    this.pendingRefreshes.set(key, event);
    
    // Process queue when appropriate
    if (!this.userActivity.inSafeZone && !this.isRefreshing) {
      setTimeout(() => this._processPendingRefreshes(), this.config.debounceWindow);
    }
  }

  /**
   * Schedule a refresh with delay
   */
  _scheduleRefresh(event, delay) {
    const key = `${event.category}_${Date.now()}`;
    
    // Clear existing timer if any
    if (this.refreshTimers.has(key)) {
      clearTimeout(this.refreshTimers.get(key));
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this._performImmediateRefresh(event);
      this.refreshTimers.delete(key);
    }, delay);
    
    this.refreshTimers.set(key, timer);
  }

  /**
   * Process pending refreshes
   */
  async _processPendingRefreshes() {
    if (this.pendingRefreshes.size === 0 || this.isRefreshing) {
      return;
    }

    // Get all pending refreshes
    const refreshes = Array.from(this.pendingRefreshes.values());
    this.pendingRefreshes.clear();
    
    // Find highest priority refresh
    const highestPriority = refreshes.reduce((highest, current) => {
      const priorities = ['CRITICAL', 'IMPORTANT', 'MINOR'];
      const currentIndex = priorities.indexOf(current.priority);
      const highestIndex = priorities.indexOf(highest.priority);
      return currentIndex < highestIndex ? current : highest;
    });
    
    // Process the highest priority refresh
    await this.handleAdminEvent(highestPriority);
  }

  /**
   * Refresh current page data
   */
  async _refreshCurrentPage(event) {
    const currentPath = window.location.pathname;
    
    // Trigger custom refresh event for current page
    const refreshEvent = new CustomEvent('adminDataRefresh', {
      detail: {
        category: event.category,
        data: event.data,
        affectedEntities: event.affectedEntities
      }
    });
    
    window.dispatchEvent(refreshEvent);
    
    // Also trigger component-specific refresh methods
    if (currentPath.includes('/admin')) {
      this._triggerAdminPageRefresh();
    } else if (currentPath.includes('/course-detail')) {
      this._triggerCourseDetailRefresh();
    } else if (currentPath.includes('/tutor')) {
      this._triggerTutorPageRefresh();
    } else if (currentPath.includes('/student')) {
      this._triggerStudentPageRefresh();
    }
  }

  /**
   * Trigger admin page refresh
   */
  _triggerAdminPageRefresh() {
    const event = new CustomEvent('refreshAdminData');
    window.dispatchEvent(event);
  }

  /**
   * Trigger course detail page refresh
   */
  _triggerCourseDetailRefresh() {
    const event = new CustomEvent('refreshCourseData');
    window.dispatchEvent(event);
  }

  /**
   * Trigger tutor page refresh
   */
  _triggerTutorPageRefresh() {
    const event = new CustomEvent('refreshTutorData');
    window.dispatchEvent(event);
  }

  /**
   * Trigger student page refresh
   */
  _triggerStudentPageRefresh() {
    const event = new CustomEvent('refreshStudentData');
    window.dispatchEvent(event);
  }

  /**
   * Refresh course-related data
   */
  async _refreshCourseData(affectedEntities) {
    const event = new CustomEvent('refreshCourseData', {
      detail: { affectedEntities }
    });
    window.dispatchEvent(event);
  }

  /**
   * Refresh user-related data
   */
  async _refreshUserData(affectedEntities) {
    const event = new CustomEvent('refreshUserData', {
      detail: { affectedEntities }
    });
    window.dispatchEvent(event);
  }

  /**
   * Refresh session-related data
   */
  async _refreshSessionData(affectedEntities) {
    const event = new CustomEvent('refreshSessionData', {
      detail: { affectedEntities }
    });
    window.dispatchEvent(event);
  }

  /**
   * Refresh enrollment-related data
   */
  async _refreshEnrollmentData(affectedEntities) {
    const event = new CustomEvent('refreshEnrollmentData', {
      detail: { affectedEntities }
    });
    window.dispatchEvent(event);
  }

  /**
   * Helper to create delay
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * WebSocket connected callback
   */
  onWebSocketConnected() {
    console.log('WebSocket connected, processing any pending refreshes');
    this._processPendingRefreshes();
  }

  /**
   * Check if refresh is needed
   */
  isRefreshNeeded() {
    return this.pendingRefreshes.size > 0 || this.refreshTimers.size > 0;
  }

  /**
   * Clear all pending refreshes
   */
  clearPendingRefreshes() {
    this.pendingRefreshes.clear();
    
    // Clear all timers
    this.refreshTimers.forEach(timer => clearTimeout(timer));
    this.refreshTimers.clear();
  }

  /**
   * Destroy and clean up
   */
  destroy() {
    this.clearPendingRefreshes();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this._processPendingRefreshes);
    window.removeEventListener('beforeunload', this.saveCurrentState);
  }
}

// Create and export singleton instance
export const refreshManager = new RefreshManager();