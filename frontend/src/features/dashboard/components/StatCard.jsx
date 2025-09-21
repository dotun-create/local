import React from 'react';
import { Card, Badge, LoadingSpinner } from '@shared';
import './StatCard.css';

const StatCard = ({
  title,
  value,
  change,
  changeType = 'positive', // 'positive', 'negative', 'neutral'
  icon,
  description,
  loading = false,
  error = null,
  onClick,
  className = '',
  variant = 'default', // 'default', 'primary', 'success', 'warning', 'danger'
  size = 'medium', // 'small', 'medium', 'large'
  trend,
  badge,
  ...props
}) => {
  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return '↗️';
      case 'negative':
        return '↘️';
      default:
        return '➡️';
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'var(--color-success)';
      case 'negative':
        return 'var(--color-danger)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  const cardClasses = [
    'stat-card',
    `stat-card--${variant}`,
    `stat-card--${size}`,
    onClick ? 'stat-card--clickable' : '',
    loading ? 'stat-card--loading' : '',
    error ? 'stat-card--error' : '',
    className
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <Card className={cardClasses} {...props}>
        <div className="stat-card__loading">
          <LoadingSpinner size="small" />
          <span>Loading...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cardClasses} {...props}>
        <div className="stat-card__error">
          <span className="stat-card__error-icon">⚠️</span>
          <span className="stat-card__error-message">
            {error.message || 'Error loading data'}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cardClasses}
      onClick={onClick}
      hover={!!onClick}
      {...props}
    >
      <div className="stat-card__content">
        <div className="stat-card__header">
          <div className="stat-card__icon-title">
            {icon && (
              <div className="stat-card__icon">
                {typeof icon === 'string' ? (
                  <span className="stat-card__icon-emoji">{icon}</span>
                ) : (
                  icon
                )}
              </div>
            )}
            <div className="stat-card__title-section">
              <h3 className="stat-card__title">{title}</h3>
              {description && (
                <p className="stat-card__description">{description}</p>
              )}
            </div>
          </div>

          {badge && (
            <Badge
              variant={badge.variant || 'secondary'}
              size="small"
              className="stat-card__badge"
            >
              {badge.text}
            </Badge>
          )}
        </div>

        <div className="stat-card__body">
          <div className="stat-card__value-section">
            <span className="stat-card__value">{value}</span>

            {change !== undefined && change !== null && (
              <div
                className="stat-card__change"
                style={{ color: getChangeColor() }}
              >
                <span className="stat-card__change-icon">
                  {getChangeIcon()}
                </span>
                <span className="stat-card__change-value">
                  {typeof change === 'number' ? `${change > 0 ? '+' : ''}${change}%` : change}
                </span>
              </div>
            )}
          </div>

          {trend && (
            <div className="stat-card__trend">
              <div className="stat-card__trend-chart">
                {trend.map((point, index) => (
                  <div
                    key={index}
                    className="stat-card__trend-bar"
                    style={{
                      height: `${(point / Math.max(...trend)) * 100}%`,
                      backgroundColor: changeType === 'positive'
                        ? 'var(--color-success)'
                        : changeType === 'negative'
                        ? 'var(--color-danger)'
                        : 'var(--color-primary)'
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Stat Card Grid Component
export const StatCardGrid = ({
  children,
  columns = { base: 1, sm: 2, lg: 3, xl: 4 },
  gap = '1.5rem',
  className = '',
  ...props
}) => {
  const gridStyle = {
    display: 'grid',
    gap,
    gridTemplateColumns: `repeat(${columns.base}, 1fr)`,
    '--sm-columns': columns.sm || columns.base,
    '--lg-columns': columns.lg || columns.sm || columns.base,
    '--xl-columns': columns.xl || columns.lg || columns.sm || columns.base
  };

  return (
    <div
      className={`stat-card-grid ${className}`}
      style={gridStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default StatCard;