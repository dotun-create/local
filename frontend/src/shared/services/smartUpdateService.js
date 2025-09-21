/**
 * Smart Update Service for Optimized Real-time Polling
 *
 * This service implements industry-standard polling intervals with:
 * - Context-aware frequency adjustment
 * - Exponential backoff on errors
 * - Smart resource management
 * - Event-driven immediate checks
 */

class SmartUpdateService {
  constructor() {
    this.isActive = false;
    this.currentInterval = null;
    this.backoffLevel = 0;
    this.isTabActive = true;
    this.isMobile = this._detectMobile();
    this.isOnBattery = false;
    this.lastUpdateCheck = null;
    this.consecutiveErrors = 0;
    this.updateHandlers = new Set();

    // Configuration following industry best practices
    this.config = {
      // Tiered polling intervals (milliseconds)
      intervals: {
        // Active tutoring session (real-time coordination needed)
        activeSession: 30000,      // 30 seconds

        // Dashboard browsing (session updates)
        activeBrowsing: 90000,     // 1.5 minutes

        // Background tab (reduced frequency)
        backgroundTab: 300000,     // 5 minutes

        // Mobile devices (battery conservation)
        mobile: 300000,            // 5 minutes

        // Battery saver mode
        batteryConservation: 600000, // 10 minutes

        // Development mode (faster feedback)
        development: 60000,        // 1 minute

        // Error recovery (progressive)
        errorBackoff: [
          60000,    // 1 minute
          180000,   // 3 minutes
          300000,   // 5 minutes
          600000    // 10 minutes (max)
        ]
      },

      // Maximum consecutive errors before increasing backoff
      maxConsecutiveErrors: 3,

      // Immediate check triggers
      immediateCheckEvents: [
        'focus',
        'online',
        'userLogin',
        'criticalAction',
        'sessionStart',
        'pageNavigation'
      ]
    };

    this._setupEventListeners();
    this._detectBatteryStatus();
  }

  /**
   * Start the smart polling service
   */
  start() {
    if (this.isActive) {
      console.log('SmartUpdateService already active');
      return;
    }

    this.isActive = true;
    this._scheduleNextUpdate();

    console.log('SmartUpdateService started with intelligent polling');
  }

  /**
   * Stop the polling service
   */
  stop() {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.currentInterval) {
      clearTimeout(this.currentInterval);
      this.currentInterval = null;
    }

    console.log('SmartUpdateService stopped');
  }

  /**
   * Add update handler callback
   */
  onUpdate(handler) {
    this.updateHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.updateHandlers.delete(handler);
    };
  }

  /**
   * Trigger immediate update check
   */
  triggerImmediateCheck(reason = 'manual') {
    console.log(`Triggering immediate update check: ${reason}`);

    // Reset error backoff on manual triggers
    if (reason === 'manual' || reason === 'userAction') {
      this.consecutiveErrors = 0;
      this.backoffLevel = 0;
    }

    this._checkForUpdates();
  }

  /**
   * Notify service of context changes
   */
  setContext(context) {
    const {
      isInSession = false,
      userActivity = 'browsing',
      isMobile = this.isMobile,
      isOnBattery = this.isOnBattery
    } = context;

    this.isInSession = isInSession;
    this.userActivity = userActivity;
    this.isMobile = isMobile;
    this.isOnBattery = isOnBattery;

    // Reschedule with new context
    if (this.isActive) {
      this._scheduleNextUpdate();
    }
  }

  /**
   * Get optimal polling interval based on current context
   */
  _getOptimalInterval() {
    const { intervals } = this.config;

    // Handle error backoff first
    if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      const backoffIndex = Math.min(this.backoffLevel, intervals.errorBackoff.length - 1);
      return intervals.errorBackoff[backoffIndex];
    }

    // Development mode (faster feedback)
    if (process.env.NODE_ENV === 'development') {
      return intervals.development;
    }

    // Active tutoring session (highest priority)
    if (this.isInSession) {
      return intervals.activeSession;
    }

    // Battery conservation mode
    if (this.isOnBattery && this.isMobile) {
      return intervals.batteryConservation;
    }

    // Mobile devices
    if (this.isMobile) {
      return intervals.mobile;
    }

    // Background tab
    if (!this.isTabActive) {
      return intervals.backgroundTab;
    }

    // Default active browsing
    return intervals.activeBrowsing;
  }

  /**
   * Schedule the next update check
   */
  _scheduleNextUpdate() {
    if (!this.isActive) return;

    // Clear existing timeout
    if (this.currentInterval) {
      clearTimeout(this.currentInterval);
    }

    const interval = this._getOptimalInterval();

    console.log(`Next update check scheduled in ${interval / 1000} seconds (context: ${this._getContextDescription()})`);

    this.currentInterval = setTimeout(() => {
      this._checkForUpdates();
    }, interval);
  }

  /**
   * Perform the actual update check
   */
  async _checkForUpdates() {
    if (!this.isActive) return;

    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        // User not authenticated, reduce frequency
        this._scheduleNextUpdate();
        return;
      }

      const response = await fetch('/api/updates/check', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updates = await response.json();

        // Reset error tracking on success
        this.consecutiveErrors = 0;
        this.backoffLevel = 0;
        this.lastUpdateCheck = new Date();

        // Process updates if any
        if (updates && updates.length > 0) {
          console.log(`Received ${updates.length} updates`);
          this._notifyHandlers(updates);
        }

      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Update check failed:', error);
      this._handleError(error);
    }

    // Schedule next check
    this._scheduleNextUpdate();
  }

  /**
   * Handle update check errors with exponential backoff
   */
  _handleError(error) {
    this.consecutiveErrors++;

    if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      this.backoffLevel = Math.min(
        this.backoffLevel + 1,
        this.config.intervals.errorBackoff.length - 1
      );

      console.warn(`Update service entering backoff level ${this.backoffLevel} after ${this.consecutiveErrors} consecutive errors`);
    }
  }

  /**
   * Notify all registered handlers of updates
   */
  _notifyHandlers(updates) {
    this.updateHandlers.forEach(handler => {
      try {
        handler(updates);
      } catch (error) {
        console.error('Update handler error:', error);
      }
    });
  }

  /**
   * Setup event listeners for context detection
   */
  _setupEventListeners() {
    // Tab visibility changes
    document.addEventListener('visibilitychange', () => {
      this.isTabActive = !document.hidden;

      if (this.isTabActive) {
        // Tab became active - immediate check
        this.triggerImmediateCheck('tabActivated');
      } else {
        // Tab became background - reschedule with longer interval
        this._scheduleNextUpdate();
      }
    });

    // Network status changes
    window.addEventListener('online', () => {
      this.triggerImmediateCheck('networkReconnected');
    });

    // Page focus/blur
    window.addEventListener('focus', () => {
      this.isTabActive = true;
      this.triggerImmediateCheck('windowFocused');
    });

    window.addEventListener('blur', () => {
      this.isTabActive = false;
      this._scheduleNextUpdate();
    });

    // User interaction detection
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, this._throttledUserActivity, { passive: true });
    });
  }

  /**
   * Throttled user activity handler
   */
  _throttledUserActivity = this._throttle(() => {
    // User is active, ensure we're using active intervals
    if (!this.isTabActive) {
      this.isTabActive = true;
      this._scheduleNextUpdate();
    }
  }, 30000); // Throttle to once per 30 seconds

  /**
   * Detect if running on mobile device
   */
  _detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Detect battery status for power management
   */
  async _detectBatteryStatus() {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        this.isOnBattery = !battery.charging;

        battery.addEventListener('chargingchange', () => {
          this.isOnBattery = !battery.charging;
          this._scheduleNextUpdate();
        });
      }
    } catch (error) {
      // Battery API not supported, assume not on battery
      this.isOnBattery = false;
    }
  }

  /**
   * Get human-readable context description
   */
  _getContextDescription() {
    const contexts = [];

    if (this.isInSession) contexts.push('active-session');
    if (!this.isTabActive) contexts.push('background-tab');
    if (this.isMobile) contexts.push('mobile');
    if (this.isOnBattery) contexts.push('battery-mode');
    if (this.consecutiveErrors > 0) contexts.push(`${this.consecutiveErrors}-errors`);
    if (process.env.NODE_ENV === 'development') contexts.push('development');

    return contexts.length > 0 ? contexts.join(', ') : 'default';
  }

  /**
   * Utility: Throttle function
   */
  _throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  /**
   * Get service status for debugging
   */
  getStatus() {
    return {
      isActive: this.isActive,
      currentInterval: this._getOptimalInterval(),
      context: this._getContextDescription(),
      consecutiveErrors: this.consecutiveErrors,
      backoffLevel: this.backoffLevel,
      lastUpdateCheck: this.lastUpdateCheck,
      handlerCount: this.updateHandlers.size
    };
  }
}

// Create and export singleton instance
const smartUpdateService = new SmartUpdateService();

// Export both the service and class for testing
export default smartUpdateService;
export { SmartUpdateService };