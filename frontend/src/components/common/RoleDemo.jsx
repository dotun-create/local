import React from 'react';
import { useMultiRoleAuth } from '../../hooks/useMultiRoleAuth';
import './RoleDemo.css';

const RoleDemo = () => {
  const {
    user,
    isAuthenticated,
    activeRole,
    getAvailableRoles,
    isMultiRole,
    hasRole,
    hasPermission,
    canAccessDashboard,
    isAdmin,
    isTutor,
    isStudent,
    isGuardian
  } = useMultiRoleAuth();

  if (!isAuthenticated) {
    return (
      <div className="role-demo">
        <div className="role-demo-card">
          <h3>Multi-Role Authentication Demo</h3>
          <p>Please log in to see the multi-role system in action.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-demo">
      <div className="role-demo-card">
        <h3>Multi-Role Authentication Demo</h3>

        <div className="user-info">
          <h4>Current User Information</h4>
          <p><strong>Name:</strong> {user?.profile?.name || 'Unknown'}</p>
          <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
          <p><strong>Active Role:</strong> {activeRole}</p>
          <p><strong>All Roles:</strong> {getAvailableRoles().join(', ')}</p>
          <p><strong>Multi-Role User:</strong> {isMultiRole() ? 'Yes' : 'No'}</p>
        </div>

        <div className="role-checks">
          <h4>Role Checks</h4>
          <div className="role-grid">
            <div className={`role-badge ${isAdmin ? 'active' : 'inactive'}`}>
              Admin: {isAdmin ? '✓' : '✗'}
            </div>
            <div className={`role-badge ${isTutor ? 'active' : 'inactive'}`}>
              Tutor: {isTutor ? '✓' : '✗'}
            </div>
            <div className={`role-badge ${isStudent ? 'active' : 'inactive'}`}>
              Student: {isStudent ? '✓' : '✗'}
            </div>
            <div className={`role-badge ${isGuardian ? 'active' : 'inactive'}`}>
              Guardian: {isGuardian ? '✓' : '✗'}
            </div>
          </div>
        </div>

        <div className="dashboard-access">
          <h4>Dashboard Access</h4>
          <div className="access-grid">
            <div className={`access-badge ${canAccessDashboard('admin') ? 'granted' : 'denied'}`}>
              Admin Dashboard: {canAccessDashboard('admin') ? '✓' : '✗'}
            </div>
            <div className={`access-badge ${canAccessDashboard('tutor') ? 'granted' : 'denied'}`}>
              Tutor Dashboard: {canAccessDashboard('tutor') ? '✓' : '✗'}
            </div>
            <div className={`access-badge ${canAccessDashboard('student') ? 'granted' : 'denied'}`}>
              Student Dashboard: {canAccessDashboard('student') ? '✓' : '✗'}
            </div>
            <div className={`access-badge ${canAccessDashboard('guardian') ? 'granted' : 'denied'}`}>
              Guardian Dashboard: {canAccessDashboard('guardian') ? '✓' : '✗'}
            </div>
          </div>
        </div>

        <div className="permissions-check">
          <h4>Sample Permissions</h4>
          <div className="permission-list">
            <div className={`permission-item ${hasPermission('can_access_admin') ? 'granted' : 'denied'}`}>
              Can Access Admin: {hasPermission('can_access_admin') ? '✓' : '✗'}
            </div>
            <div className={`permission-item ${hasPermission('can_access_tutor_dashboard') ? 'granted' : 'denied'}`}>
              Can Access Tutor Dashboard: {hasPermission('can_access_tutor_dashboard') ? '✓' : '✗'}
            </div>
            <div className={`permission-item ${hasPermission('can_access_student_dashboard') ? 'granted' : 'denied'}`}>
              Can Access Student Dashboard: {hasPermission('can_access_student_dashboard') ? '✓' : '✗'}
            </div>
          </div>
        </div>

        {isMultiRole() && (
          <div className="role-switching">
            <h4>Role Switching Available</h4>
            <p>As a multi-role user, you can switch between your roles using the role switcher in the header.</p>
            <p>Available roles: <strong>{getAvailableRoles().join(', ')}</strong></p>

            <div style={{ marginTop: '1rem' }}>
              <h5>Test Role Switching:</h5>
              {getAvailableRoles()
                .filter(role => role !== activeRole)
                .map(role => (
                  <button
                    key={role}
                    style={{
                      margin: '0.25rem',
                      padding: '0.5rem 1rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.location.reload()}
                  >
                    Switch to {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {!isMultiRole() && user && (
          <div className="single-role-info">
            <h4>Single Role User</h4>
            <p>This user has only one role: <strong>{activeRole}</strong></p>
            <p>To test multi-role functionality, refresh the page - the demo will automatically convert this to a multi-role user.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleDemo;