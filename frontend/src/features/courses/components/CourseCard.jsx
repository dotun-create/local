import React from 'react';
import { Card, Button, Badge, Image } from '@shared';
import { formatCurrency } from '@shared/utils/currency';
import './CourseCard.css';

const CourseCard = ({
  id,
  image,
  title,
  description,
  price,
  level,
  duration,
  subject,
  status = 'active',
  enrolledCount = 0,
  maxCapacity,
  buttonText = 'View Course',
  onAction,
  variant = 'default', // 'default', 'enrolled', 'teaching'
  loading = false,
  ...props
}) => {
  const handleAction = (e) => {
    e.preventDefault();
    if (onAction && !loading) {
      onAction({ id, title, price, status });
    }
  };

  const getStatusVariant = () => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'secondary';
      case 'full': return 'danger';
      default: return 'primary';
    }
  };

  const getLevelColor = () => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'var(--color-success)';
      case 'intermediate': return 'var(--color-warning)';
      case 'advanced': return 'var(--color-danger)';
      default: return 'var(--color-primary)';
    }
  };

  const isFullCapacity = maxCapacity && enrolledCount >= maxCapacity;

  return (
    <Card
      className={`course-card course-card--${variant} ${isFullCapacity ? 'course-card--full' : ''}`}
      hover={!loading}
      {...props}
    >
      <div className="course-card__header">
        {image && (
          <div className="course-card__image">
            <Image
              src={image}
              alt={title}
              ratio="16:9"
              loading="lazy"
              fallback="/images/course-placeholder.jpg"
            />

            {subject && (
              <div className="course-card__subject-badge">
                <Badge variant="primary" size="small">
                  {subject}
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="course-card__badges">
          {status && (
            <Badge variant={getStatusVariant()} size="small">
              {status}
            </Badge>
          )}

          {level && (
            <Badge
              variant="outline"
              size="small"
              style={{
                borderColor: getLevelColor(),
                color: getLevelColor()
              }}
            >
              {level}
            </Badge>
          )}
        </div>
      </div>

      <div className="course-card__content">
        <div className="course-card__title">
          <h3>{title}</h3>
        </div>

        {description && (
          <div className="course-card__description">
            <p>{description}</p>
          </div>
        )}

        <div className="course-card__meta">
          {duration && (
            <div className="course-card__meta-item">
              <span className="course-card__meta-label">Duration:</span>
              <span className="course-card__meta-value">{duration}</span>
            </div>
          )}

          {maxCapacity && (
            <div className="course-card__meta-item">
              <span className="course-card__meta-label">Capacity:</span>
              <span className={`course-card__meta-value ${isFullCapacity ? 'course-card__meta-value--full' : ''}`}>
                {enrolledCount}/{maxCapacity}
              </span>
            </div>
          )}
        </div>

        {variant === 'enrolled' && (
          <div className="course-card__progress">
            {/* Progress indicator could be added here */}
            <div className="course-card__progress-text">
              <span>Continue Learning</span>
            </div>
          </div>
        )}
      </div>

      <div className="course-card__footer">
        <div className="course-card__pricing">
          {price !== undefined && price !== null && (
            <span className="course-card__price">
              {price === 0 ? 'Free' : formatCurrency(price)}
            </span>
          )}
        </div>

        <div className="course-card__actions">
          <Button
            variant={variant === 'enrolled' ? 'primary' : 'outline-primary'}
            size="medium"
            onClick={handleAction}
            disabled={loading || (status === 'archived') || (isFullCapacity && variant === 'default')}
            loading={loading}
            fullWidth
          >
            {loading ? 'Loading...' :
             isFullCapacity && variant === 'default' ? 'Course Full' :
             variant === 'enrolled' ? 'Continue' :
             variant === 'teaching' ? 'Manage' :
             buttonText}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CourseCard;