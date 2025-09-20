/**
 * Notification Service
 * 
 * This service manages notification display for admin updates,
 * showing refresh prompts and status messages.
 */

class NotificationService {
  constructor() {
    this.notifications = new Map();
    this.container = null;
    this.initialized = false;
  }

  /**
   * Initialize notification service
   */
  init() {
    if (this.initialized) return;

    // Create notification container
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = 'notification-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    this.initialized = true;
  }

  /**
   * Show refresh notification
   */
  showRefreshNotification(options) {
    const {
      message = 'Updates are available',
      actionLabel = 'Refresh',
      onAction,
      onDismiss,
      duration = 30000
    } = options;

    this.init();

    const notificationId = `notification_${Date.now()}`;
    const notification = this._createNotification({
      id: notificationId,
      type: 'refresh',
      message,
      actionLabel,
      onAction,
      onDismiss,
      duration
    });

    this.notifications.set(notificationId, notification);
    this.container.appendChild(notification);

    // Auto dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notificationId);
        if (onDismiss) onDismiss();
      }, duration);
    }

    return notificationId;
  }

  /**
   * Show success notification
   */
  showSuccess(message, duration = 3000) {
    this.init();

    const notificationId = `notification_${Date.now()}`;
    const notification = this._createNotification({
      id: notificationId,
      type: 'success',
      message,
      duration
    });

    this.notifications.set(notificationId, notification);
    this.container.appendChild(notification);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(notificationId), duration);
    }

    return notificationId;
  }

  /**
   * Show error notification
   */
  showError(message, duration = 5000) {
    this.init();

    const notificationId = `notification_${Date.now()}`;
    const notification = this._createNotification({
      id: notificationId,
      type: 'error',
      message,
      duration
    });

    this.notifications.set(notificationId, notification);
    this.container.appendChild(notification);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(notificationId), duration);
    }

    return notificationId;
  }

  /**
   * Show info notification
   */
  showInfo(message, duration = 4000) {
    this.init();

    const notificationId = `notification_${Date.now()}`;
    const notification = this._createNotification({
      id: notificationId,
      type: 'info',
      message,
      duration
    });

    this.notifications.set(notificationId, notification);
    this.container.appendChild(notification);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(notificationId), duration);
    }

    return notificationId;
  }

  /**
   * Create notification element
   */
  _createNotification(options) {
    const { id, type, message, actionLabel, onAction, onDismiss } = options;

    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      pointer-events: all;
      min-width: 300px;
      border-left: 4px solid ${this._getTypeColor(type)};
    `;

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = 'notification-message';
    messageEl.style.cssText = `
      flex: 1;
      color: #333;
      font-size: 14px;
      line-height: 1.4;
      margin-right: 12px;
    `;
    messageEl.textContent = message;
    notification.appendChild(messageEl);

    // Create actions container
    const actionsEl = document.createElement('div');
    actionsEl.className = 'notification-actions';
    actionsEl.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
    `;

    // Add action button if provided
    if (actionLabel && onAction) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'notification-action-btn';
      actionBtn.style.cssText = `
        padding: 4px 12px;
        background: ${this._getTypeColor(type)};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: opacity 0.2s;
      `;
      actionBtn.textContent = actionLabel;
      actionBtn.onmouseover = () => actionBtn.style.opacity = '0.9';
      actionBtn.onmouseout = () => actionBtn.style.opacity = '1';
      actionBtn.onclick = () => {
        onAction();
        this.dismiss(id);
      };
      actionsEl.appendChild(actionBtn);
    }

    // Add dismiss button
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'notification-dismiss-btn';
    dismissBtn.style.cssText = `
      padding: 4px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #999;
      font-size: 18px;
      line-height: 1;
      transition: color 0.2s;
    `;
    dismissBtn.innerHTML = '×';
    dismissBtn.onmouseover = () => dismissBtn.style.color = '#666';
    dismissBtn.onmouseout = () => dismissBtn.style.color = '#999';
    dismissBtn.onclick = () => {
      if (onDismiss) onDismiss();
      this.dismiss(id);
    };
    actionsEl.appendChild(dismissBtn);

    notification.appendChild(actionsEl);

    // Add animation styles
    this._addAnimationStyles();

    return notification;
  }

  /**
   * Get color for notification type
   */
  _getTypeColor(type) {
    const colors = {
      refresh: '#4CAF50',
      success: '#4CAF50',
      error: '#f44336',
      info: '#2196F3',
      warning: '#FF9800'
    };
    return colors[type] || colors.info;
  }

  /**
   * Add animation styles to document
   */
  _addAnimationStyles() {
    if (document.getElementById('notification-animations')) return;

    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      .notification-sliding-out {
        animation: slideOut 0.3s ease-in forwards;
      }

      @media (max-width: 480px) {
        .notification-container {
          left: 10px !important;
          right: 10px !important;
          top: 10px !important;
        }
        
        .notification {
          min-width: unset !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Dismiss notification
   */
  dismiss(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Add slide out animation
    notification.classList.add('notification-sliding-out');
    
    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(notificationId);
    }, 300);
  }

  /**
   * Dismiss all notifications
   */
  dismissAll() {
    this.notifications.forEach((notification, id) => {
      this.dismiss(id);
    });
  }

  /**
   * Show progress notification
   */
  showProgress(message, progress = 0) {
    this.init();

    const notificationId = `notification_progress_${Date.now()}`;
    
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = 'notification notification-progress';
    notification.style.cssText = `
      padding: 12px 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      pointer-events: all;
      min-width: 300px;
    `;

    const messageEl = document.createElement('div');
    messageEl.className = 'notification-message';
    messageEl.style.cssText = `
      color: #333;
      font-size: 14px;
      margin-bottom: 8px;
    `;
    messageEl.textContent = message;
    notification.appendChild(messageEl);

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
    `;

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.cssText = `
      height: 100%;
      background: #4CAF50;
      width: ${progress}%;
      transition: width 0.3s ease;
    `;
    progressBar.appendChild(progressFill);
    notification.appendChild(progressBar);

    this.notifications.set(notificationId, notification);
    this.container.appendChild(notification);

    // Return update function
    return {
      id: notificationId,
      update: (newProgress, newMessage) => {
        if (newMessage) {
          messageEl.textContent = newMessage;
        }
        progressFill.style.width = `${newProgress}%`;
        if (newProgress >= 100) {
          setTimeout(() => this.dismiss(notificationId), 1000);
        }
      }
    };
  }

  /**
   * Destroy notification service
   */
  destroy() {
    this.dismissAll();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.initialized = false;
  }
}

// Create and export singleton instance
export const notificationService = new NotificationService();