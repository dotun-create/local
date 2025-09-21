import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, LoadingSpinner } from '@shared/components/ui';
import { useStore } from '@shared/store';
import { adminService } from '../services/adminService';
import './AdminDashboard.css';

const AdminDashboard = ({
  refreshInterval = 30000,
  showQuickActions = true,
  className = ''
}) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTimer, setRefreshTimer] = useState(null);

  const { user } = useStore((state) => state.auth);

  useEffect(() => {
    loadDashboardData();

    if (refreshInterval > 0) {
      const timer = setInterval(loadDashboardData, refreshInterval);
      setRefreshTimer(timer);
      return () => clearInterval(timer);
    }
  }, [refreshInterval]);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    try {
      switch (action) {
        case 'backup':
          await adminService.createBackup();
          // Show success notification
          break;
        case 'maintenance':
          await adminService.runMaintenance('cleanup');
          break;
        case 'refresh':
          setLoading(true);
          await loadDashboardData();
          break;
        default:
          break;
      }
    } catch (err) {
      setError(`Failed to execute ${action}`);
    }
  };

  const renderStatCard = (title, value, change, icon, color = 'primary') => (
    <Card className={`stat-card stat-card--${color}`}>
      <div className="stat-card-content">
        <div className="stat-icon">
          <span>{icon}</span>
        </div>
        <div className="stat-details">
          <h3 className="stat-value">{value}</h3>
          <p className="stat-title">{title}</p>
          {change !== undefined && (
            <div className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
              <span className="change-icon">
                {change >= 0 ? '↗' : '↘'}
              </span>
              <span className="change-value">
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const renderRecentActivity = () => (
    <Card className="recent-activity">
      <div className="card-header">
        <h3>Recent Activity</h3>
        <Button variant="text" size="sm" onClick={() => handleQuickAction('refresh')}>
          Refresh
        </Button>
      </div>
      <div className="activity-list">
        {stats?.recentActivity?.map((activity, index) => (
          <div key={index} className="activity-item">
            <div className="activity-icon">
              <span>{adminService.getStatusIcon(activity.type)}</span>
            </div>
            <div className="activity-content">
              <p className="activity-description">{activity.description}</p>
              <div className="activity-meta">
                <span className="activity-user">{activity.user}</span>
                <span className="activity-time">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            <Badge variant={activity.severity || 'info'} size="sm">
              {activity.type}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderSystemHealth = () => (
    <Card className="system-health">
      <div className="card-header">
        <h3>System Health</h3>
        <Badge
          variant={stats?.systemHealth?.overall === 'healthy' ? 'success' : 'warning'}
        >
          {stats?.systemHealth?.overall || 'Unknown'}
        </Badge>
      </div>
      <div className="health-metrics">
        {stats?.systemHealth?.metrics?.map((metric, index) => (
          <div key={index} className="health-metric">
            <div className="metric-info">
              <span className="metric-name">{metric.name}</span>
              <span className="metric-value">{metric.value}</span>
            </div>
            <div className="metric-bar">
              <div
                className={`metric-fill metric-fill--${metric.status}`}
                style={{ width: `${metric.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderQuickActions = () => (
    <Card className="quick-actions">
      <div className="card-header">
        <h3>Quick Actions</h3>
      </div>
      <div className="actions-grid">
        <Button
          variant="outline"
          onClick={() => handleQuickAction('backup')}
          className="action-button"
        >
          🗄️ Create Backup
        </Button>
        <Button
          variant="outline"
          onClick={() => handleQuickAction('maintenance')}
          className="action-button"
        >
          🔧 Run Maintenance
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open('/admin/users', '_blank')}
          className="action-button"
        >
          👥 Manage Users
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open('/admin/content', '_blank')}
          className="action-button"
        >
          📝 Review Content
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open('/admin/analytics', '_blank')}
          className="action-button"
        >
          📊 View Analytics
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open('/admin/settings', '_blank')}
          className="action-button"
        >
          ⚙️ System Settings
        </Button>
      </div>
    </Card>
  );

  if (loading && !stats) {
    return (
      <div className="admin-dashboard loading">
        <LoadingSpinner size="large" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="admin-dashboard error">
        <div className="error-content">
          <h3>Dashboard Error</h3>
          <p>{error}</p>
          <Button onClick={loadDashboardData}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-dashboard ${className}`}>
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.name || 'Administrator'}</p>
        </div>
        <div className="header-actions">
          <Button
            variant="outline"
            onClick={loadDashboardData}
            disabled={loading}
          >
            {loading ? '↻' : '🔄'} Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <p>{error}</p>
          <Button variant="text" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="dashboard-stats">
        {renderStatCard(
          'Total Users',
          stats?.users?.total || 0,
          stats?.users?.change,
          '👥',
          'primary'
        )}
        {renderStatCard(
          'Active Courses',
          stats?.courses?.active || 0,
          stats?.courses?.change,
          '📚',
          'success'
        )}
        {renderStatCard(
          'Revenue (30d)',
          adminService.formatCurrency(stats?.revenue?.total || 0),
          stats?.revenue?.change,
          '💰',
          'warning'
        )}
        {renderStatCard(
          'Support Tickets',
          stats?.support?.open || 0,
          stats?.support?.change,
          '🎫',
          'info'
        )}
      </div>

      <div className="dashboard-content">
        <div className="dashboard-main">
          {renderRecentActivity()}
          {renderSystemHealth()}
        </div>

        <div className="dashboard-sidebar">
          {showQuickActions && renderQuickActions()}

          <Card className="system-info">
            <div className="card-header">
              <h3>System Information</h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Platform Version:</span>
                <span className="info-value">{stats?.system?.version || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Uptime:</span>
                <span className="info-value">{stats?.system?.uptime || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Database:</span>
                <span className="info-value">{stats?.system?.database || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Storage Used:</span>
                <span className="info-value">
                  {stats?.system?.storage ? adminService.formatBytes(stats.system.storage) : 'Unknown'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;