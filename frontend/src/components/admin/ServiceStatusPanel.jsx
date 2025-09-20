import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import './css/ServiceStatusPanel.css';

const ServiceStatusPanel = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadHealthData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get detailed health information
      const response = await fetch('/api/health/detailed');
      
      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
        setLastUpdated(new Date());
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Error loading service health:', err);
      setError('Unable to load service status');
      
      // Fallback: Set default unavailable status
      setHealthData({
        status: 'unknown',
        services: {
          database: { status: 'unknown', message: 'Status unavailable' },
          ai: { status: 'unknown', message: 'Status unavailable' },
          video: { status: 'unknown', message: 'Status unavailable' },
          environment: { status: 'unknown', message: 'Status unavailable' }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#10b981'; // green
      case 'degraded': return '#f59e0b'; // yellow
      case 'unhealthy': return '#ef4444'; // red
      case 'disabled': return '#6b7280'; // gray
      case 'unavailable': return '#f97316'; // orange
      default: return '#9ca3af'; // light gray
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      case 'disabled': return '🔕';
      case 'unavailable': return '🔴';
      case 'error': return '💥';
      default: return '❓';
    }
  };

  const refreshHealth = () => {
    loadHealthData();
  };

  if (loading && !healthData) {
    return (
      <div className="service-status-panel loading">
        <h3>Service Status</h3>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Loading service status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="service-status-panel">
      <div className="panel-header">
        <h3>Service Status</h3>
        <div className="panel-actions">
          <button 
            onClick={refreshHealth} 
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? '🔄' : '↻'} Refresh
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      <div className="services-grid">
        {healthData?.services && Object.entries(healthData.services).map(([serviceName, serviceData]) => (
          <div 
            key={serviceName} 
            className={`service-card ${serviceData.status}`}
            style={{ borderLeftColor: getStatusColor(serviceData.status) }}
          >
            <div className="service-header">
              <span className="service-icon">
                {getStatusIcon(serviceData.status)}
              </span>
              <h4 className="service-name">
                {serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}
              </h4>
              <span 
                className="status-badge"
                style={{ 
                  backgroundColor: getStatusColor(serviceData.status),
                  color: 'white'
                }}
              >
                {serviceData.status}
              </span>
            </div>
            
            <div className="service-details">
              <p className="service-message">{serviceData.message}</p>
              
              {/* Additional details for specific services */}
              {serviceName === 'ai' && serviceData.model && (
                <div className="service-meta">
                  <small>Model: {serviceData.model}</small>
                </div>
              )}
              
              {serviceName === 'video' && serviceData.provider && (
                <div className="service-meta">
                  <small>Provider: {serviceData.provider}</small>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="overall-status">
        <div className={`overall-indicator ${healthData?.status || 'unknown'}`}>
          <span className="indicator-icon">
            {getStatusIcon(healthData?.status)}
          </span>
          <span className="indicator-text">
            Overall System Status: {healthData?.status || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="status-legend">
        <h4>Status Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#10b981'}}></span>
            <span>Healthy - Service is fully operational</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#f59e0b'}}></span>
            <span>Degraded - Service has warnings but is functional</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#ef4444'}}></span>
            <span>Unhealthy - Service has critical errors</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#6b7280'}}></span>
            <span>Disabled - Service is intentionally disabled</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#f97316'}}></span>
            <span>Unavailable - Service configuration missing</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceStatusPanel;