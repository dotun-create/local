/**
 * Example: Smart Update Service Integration
 *
 * This file shows how to integrate the Smart Update Service into existing components
 * like the StudentDashboard to replace aggressive polling with optimized intervals.
 */

import React, { useCallback } from 'react';
import { useDashboardUpdates, useSessionUpdates } from '../hooks/useSmartUpdates';
import SmartUpdateStatus from '../components/common/SmartUpdateStatus';

/**
 * Example 1: Dashboard Integration
 * Replace manual polling with smart dashboard updates
 */
const ExampleDashboard = () => {
  const handleDashboardUpdates = useCallback((updates) => {
    console.log('Dashboard received updates:', updates);

    // Process different types of updates
    updates.forEach(update => {
      switch (update.category) {
        case 'ENROLLMENT':
          // Refresh enrollment data
          console.log('Refreshing enrollments');
          break;
        case 'SESSION':
          // Refresh session data
          console.log('Refreshing sessions');
          break;
        case 'PAYMENT':
          // Refresh payment data
          console.log('Refreshing payments');
          break;
        default:
          console.log('General update:', update.category);
      }
    });
  }, []);

  // Use dashboard updates with 90-second intervals (down from 30 seconds)
  const { status, triggerUpdate } = useDashboardUpdates(handleDashboardUpdates);

  return (
    <div className="example-dashboard">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>

        {/* Add manual refresh button */}
        <button
          onClick={() => triggerUpdate('userRefresh')}
          className="btn btn-outline-secondary btn-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Show current polling status in development */}
      {process.env.NODE_ENV === 'development' && (
        <SmartUpdateStatus showDetails={false} />
      )}

      <div className="dashboard-content">
        {/* Your existing dashboard content */}
        <p>Dashboard content here...</p>
        <p>Smart updates running every {Math.round(status.currentInterval / 60000)} minutes</p>
      </div>
    </div>
  );
};

/**
 * Example 2: Session Integration
 * Use real-time updates during active tutoring sessions
 */
const ExampleTutoringSession = ({ sessionId, isActive }) => {
  const handleSessionUpdates = useCallback((updates) => {
    console.log('Session received updates:', updates);

    // Real-time session coordination
    updates.forEach(update => {
      if (update.category === 'SESSION' && update.data.sessionId === sessionId) {
        // Handle session-specific updates
        console.log('Session update:', update.data);
      }
    });
  }, [sessionId]);

  // Use session updates with 30-second intervals during active sessions
  const { status } = useSessionUpdates(
    isActive ? sessionId : null,
    handleSessionUpdates
  );

  return (
    <div className="example-session">
      <div className="session-header">
        <h2>Tutoring Session {sessionId}</h2>
        <div className="session-status">
          {isActive ? (
            <span className="status-active">
              🟢 Live - Updates every {Math.round(status.currentInterval / 1000)}s
            </span>
          ) : (
            <span className="status-inactive">
              ⭕ Inactive
            </span>
          )}
        </div>
      </div>

      <div className="session-content">
        {/* Your session content */}
        <p>Session content here...</p>
      </div>
    </div>
  );
};

/**
 * Example 3: Admin Integration
 * Higher frequency updates for admin interfaces
 */
const ExampleAdminPanel = () => {
  const { triggerUpdate, status, isActive } = useDashboardUpdates((updates) => {
    // Admin-specific update handling
    console.log('Admin received updates:', updates);
  });

  return (
    <div className="example-admin">
      <div className="admin-header">
        <h1>Admin Panel</h1>

        {/* Admin controls */}
        <div className="admin-controls">
          <button
            onClick={() => triggerUpdate('adminRefresh')}
            disabled={!isActive}
            className="btn btn-primary btn-sm"
          >
            Force Update Check
          </button>
        </div>
      </div>

      {/* Detailed status for admin debugging */}
      <SmartUpdateStatus showDetails={true} />

      <div className="admin-content">
        <p>Admin content here...</p>
        <p>Service status: {isActive ? 'Active' : 'Inactive'}</p>
      </div>
    </div>
  );
};

/**
 * Example 4: Migration from Manual Polling
 * Shows how to replace existing setInterval patterns
 */
const ExampleMigration = () => {
  // ❌ OLD WAY - Don't do this anymore
  /*
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/api/updates/check');
        const updates = await response.json();
        // Handle updates...
      } catch (error) {
        console.error('Update check failed:', error);
      }
    };

    // Aggressive 30-second polling
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, []);
  */

  // ✅ NEW WAY - Use smart polling
  const handleUpdates = useCallback((updates) => {
    // Same update handling logic, but with optimized polling
    console.log('Received updates:', updates);
  }, []);

  useDashboardUpdates(handleUpdates);

  return (
    <div className="example-migration">
      <h3>Migration Example</h3>
      <p>✅ Replaced manual 30s polling with smart 90s intervals</p>
      <p>📱 Automatically adjusts for mobile and battery saving</p>
      <p>🔄 Includes exponential backoff on errors</p>
      <p>⚡ Immediate updates on user actions</p>
    </div>
  );
};

export {
  ExampleDashboard,
  ExampleTutoringSession,
  ExampleAdminPanel,
  ExampleMigration
};