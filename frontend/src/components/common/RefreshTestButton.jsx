/**
 * Test Button Component for Hybrid Refresh System
 * 
 * This component provides admin users with a button to manually trigger
 * refresh events for testing the hybrid refresh strategy.
 */

import React from 'react';
import { refreshManager } from '../../services/refreshManager';
import { notificationService } from '../../services/notificationService';

const RefreshTestButton = ({ style = {} }) => {
  const handleTestCriticalRefresh = () => {
    console.log('Testing critical refresh event');
    
    // Simulate a critical admin event
    refreshManager.handleAdminEvent({
      type: 'ADMIN_UPDATE',
      priority: 'CRITICAL',
      category: 'COURSE_UPDATE',
      data: {
        action: 'course_updated',
        course_id: 'test_course',
        changes: { title: 'Test Course Updated' }
      },
      affectedEntities: [
        { type: 'course', id: 'test_course' }
      ],
      timestamp: new Date().toISOString()
    });
    
    notificationService.showInfo('Critical refresh event triggered');
  };

  const handleTestImportantRefresh = () => {
    console.log('Testing important refresh event');
    
    // Simulate an important admin event
    refreshManager.handleAdminEvent({
      type: 'ADMIN_UPDATE_PENDING',
      priority: 'IMPORTANT',
      category: 'USER_MANAGEMENT',
      data: {
        action: 'user_created',
        user_id: 'test_user'
      },
      affectedEntities: [
        { type: 'user', id: 'test_user' }
      ],
      notificationMessage: 'New user has been created',
      timestamp: new Date().toISOString()
    });
    
    notificationService.showInfo('Important refresh event triggered');
  };

  const handleTestMinorRefresh = () => {
    console.log('Testing minor refresh event');
    
    // Simulate a minor admin event
    refreshManager.handleAdminEvent({
      type: 'BACKGROUND_SYNC',
      priority: 'MINOR',
      category: 'PROFILE_UPDATE',
      data: {
        action: 'profile_updated',
        user_id: 'test_user'
      },
      affectedEntities: [
        { type: 'user', id: 'test_user' }
      ],
      timestamp: new Date().toISOString()
    });
    
    notificationService.showInfo('Minor refresh event triggered');
  };

  const handleTestNotifications = () => {
    console.log('Testing notification system');
    
    // Test different notification types
    notificationService.showSuccess('Success notification test');
    
    setTimeout(() => {
      notificationService.showError('Error notification test');
    }, 1000);
    
    setTimeout(() => {
      notificationService.showRefreshNotification({
        message: 'Test refresh notification',
        actionLabel: 'Test Action',
        onAction: () => {
          notificationService.showInfo('Test action clicked!');
        }
      });
    }, 2000);
  };

  // Only show to admin users in development
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  if (currentUser.accountType !== 'admin' && process.env.NODE_ENV === 'production') {
    return null;
  }

  const buttonStyle = {
    padding: '6px 12px',
    margin: '4px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    ...style
  };

  const containerStyle = {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '10px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  };

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
        Refresh Test Panel
      </div>
      
      <button
        style={{ ...buttonStyle, backgroundColor: '#dc3545' }}
        onClick={handleTestCriticalRefresh}
        title="Triggers immediate refresh (0 delay)"
      >
        Test Critical Refresh
      </button>
      
      <button
        style={{ ...buttonStyle, backgroundColor: '#fd7e14' }}
        onClick={handleTestImportantRefresh}
        title="Triggers notification with 30s delay"
      >
        Test Important Refresh
      </button>
      
      <button
        style={{ ...buttonStyle, backgroundColor: '#6c757d' }}
        onClick={handleTestMinorRefresh}
        title="Triggers background sync (5min delay)"
      >
        Test Minor Refresh
      </button>
      
      <button
        style={{ ...buttonStyle, backgroundColor: '#17a2b8' }}
        onClick={handleTestNotifications}
        title="Test notification system"
      >
        Test Notifications
      </button>
    </div>
  );
};

export default RefreshTestButton;