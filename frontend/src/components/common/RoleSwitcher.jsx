import React, { useState } from 'react';
import { useMultiRoleAuth } from '../../hooks/useMultiRoleAuth';
import './RoleSwitcher.css';

const RoleSwitcher = () => {
  const {
    activeRole,
    getAvailableRoles,
    switchRole,
    isMultiRole,
    loading
  } = useMultiRoleAuth();

  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState(null);

  if (!isMultiRole()) {
    return null;
  }

  const availableRoles = getAvailableRoles();

  const handleRoleSwitch = async (newRole) => {
    if (newRole === activeRole || switching) return;

    setSwitching(true);
    setError(null);

    try {
      await switchRole(newRole);
    } catch (err) {
      setError(err.message || 'Failed to switch role');
    } finally {
      setSwitching(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'Admin',
      'tutor': 'Tutor',
      'student': 'Student',
      'guardian': 'Guardian'
    };
    return roleNames[role] || role;
  };

  const getRoleIcon = (role) => {
    const icons = {
      'admin': '⚙️',
      'tutor': '👨‍🏫',
      'student': '🎓',
      'guardian': '👨‍👩‍👧‍👦'
    };
    return icons[role] || '👤';
  };

  if (loading) {
    return (
      <div className="role-switcher loading">
        <span>Loading roles...</span>
      </div>
    );
  }

  return (
    <div className="role-switcher" data-testid="role-switcher">
      <div className="current-role">
        <span className="role-icon">{getRoleIcon(activeRole)}</span>
        <span className="role-name">{getRoleDisplayName(activeRole)}</span>
      </div>

      {availableRoles.length > 1 && (
        <div className="role-dropdown">
          <button
            className="switch-button"
            disabled={switching}
            title="Switch Role"
          >
            {switching ? '⏳' : '🔄'}
          </button>

          <div className="dropdown-content">
            {availableRoles
              .filter(role => role !== activeRole)
              .map(role => (
                <button
                  key={role}
                  className="role-option"
                  onClick={() => handleRoleSwitch(role)}
                  disabled={switching}
                >
                  <span className="role-icon">{getRoleIcon(role)}</span>
                  <span className="role-name">{getRoleDisplayName(role)}</span>
                </button>
              ))
            }
          </div>
        </div>
      )}

      {error && (
        <div className="role-switch-error">
          <span className="error-message">{error}</span>
          <button
            className="close-error"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;