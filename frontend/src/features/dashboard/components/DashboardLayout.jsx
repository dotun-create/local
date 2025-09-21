import React, { useState } from 'react';
import {
  PageLayout,
  Sidebar,
  Header,
  Button,
  Avatar,
  Badge,
  Dropdown,
  DropdownItem
} from '@shared';
import { useAuth } from '@features/auth';
import './DashboardLayout.css';

const DashboardLayout = ({
  children,
  title = 'Dashboard',
  subtitle,
  actions,
  sidebarItems = [],
  activeItem,
  onItemSelect,
  showRoleSwitcher = false
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  const userMenuItems = [
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: '👤',
      onClick: () => console.log('Profile clicked')
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: '⚙️',
      onClick: () => console.log('Preferences clicked')
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: '❓',
      onClick: () => console.log('Help clicked')
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: '🚪',
      onClick: handleLogout,
      variant: 'danger'
    }
  ];

  return (
    <PageLayout className="dashboard-layout">
      {/* Header */}
      <Header className="dashboard-header">
        <div className="dashboard-header__left">
          <Button
            variant="ghost"
            size="small"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="sidebar-toggle"
          >
            {sidebarCollapsed ? '→' : '←'}
          </Button>

          <div className="dashboard-title-section">
            <h1 className="dashboard-title">{title}</h1>
            {subtitle && (
              <p className="dashboard-subtitle">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="dashboard-header__center">
          {showRoleSwitcher && (
            <div className="role-switcher">
              <Badge variant="primary">
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'}
              </Badge>
            </div>
          )}
        </div>

        <div className="dashboard-header__right">
          {actions}

          {isAuthenticated && user && (
            <Dropdown
              trigger={
                <div className="user-menu-trigger">
                  <Avatar
                    src={user.avatar || user.profile?.avatar}
                    alt={user.name || user.email}
                    size="small"
                  />
                  <span className="user-name">
                    {user.name || user.profile?.name || user.email?.split('@')[0]}
                  </span>
                </div>
              }
              placement="bottom-end"
            >
              {userMenuItems.map((item) => (
                <DropdownItem
                  key={item.id}
                  onClick={item.onClick}
                  variant={item.variant}
                >
                  <span className="dropdown-item-icon">{item.icon}</span>
                  {item.label}
                </DropdownItem>
              ))}
            </Dropdown>
          )}
        </div>
      </Header>

      <div className="dashboard-body">
        {/* Sidebar */}
        {sidebarItems.length > 0 && (
          <Sidebar
            className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
            collapsed={sidebarCollapsed}
          >
            <nav className="dashboard-nav">
              {sidebarItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeItem === item.id ? 'primary' : 'ghost'}
                  size="medium"
                  fullWidth
                  onClick={() => onItemSelect?.(item.id)}
                  className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
                  disabled={item.disabled}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="nav-item-label">{item.label}</span>
                  )}
                  {item.badge && !sidebarCollapsed && (
                    <Badge
                      variant={item.badge.variant || 'secondary'}
                      size="small"
                      className="nav-item-badge"
                    >
                      {item.badge.text}
                    </Badge>
                  )}
                </Button>
              ))}
            </nav>
          </Sidebar>
        )}

        {/* Main Content */}
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </PageLayout>
  );
};

export default DashboardLayout;