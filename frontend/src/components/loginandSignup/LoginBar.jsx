import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiRoleAuth } from '../../hooks/useMultiRoleAuth';
import RoleSwitcher from '../common/RoleSwitcher';
import { NotificationCenter } from '../notifications';
import './css/LoginBar.css';

const LoginBar = ({ loginFunction }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, activeRole } = useMultiRoleAuth();

  const handleLoginClick = async () => {
    if (isAuthenticated) {
      // Logout
      try {
        await logout(false); // Don't show confirmation in header
        if (loginFunction) {
          loginFunction(false);
        }
      } catch (error) {
        console.error('Logout failed:', error);
      }
    } else {
      navigate('/login'); // Navigate to login page instead of modal
    }
  };

  const getUserDisplayName = () => {
    if (!user || !user.profile) return 'User';
    return user.profile.name ? user.profile.name.split(' ')[0] : 'User';
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

  return (
    <div className="login-bar-container">
      {isAuthenticated && (
        <RoleSwitcher />
      )}

      {isAuthenticated && (
        <NotificationCenter className="login-bar-notifications" />
      )}

      <div className="login-bar" onClick={handleLoginClick}>
        <div className={`login-avatar ${isAuthenticated ? 'logged-in' : 'logged-out'}`}>
          <div className="avatar-circle">
            {isAuthenticated ? '👤' : '○'}
          </div>
        </div>
        <span className="login-text">
          {isAuthenticated ?
            `${getUserDisplayName()} (${getRoleDisplayName(activeRole)})` :
            'Login'
          }
        </span>
      </div>
    </div>
  );
};

export default LoginBar;