import React from 'react';
import './Card.css';

const Card = ({
  children,
  variant = 'default',
  size = 'medium',
  padding = 'default',
  shadow = 'default',
  border = false,
  hover = false,
  clickable = false,
  onClick,
  className = '',
  header,
  footer,
  title,
  subtitle,
  actions,
  ...props
}) => {
  const cardClass = `
    card
    card-${variant}
    card-${size}
    card-padding-${padding}
    card-shadow-${shadow}
    ${border ? 'card-border' : ''}
    ${hover ? 'card-hover' : ''}
    ${clickable ? 'card-clickable' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleClick = (e) => {
    if (clickable && onClick) {
      onClick(e);
    }
  };

  const handleKeyDown = (e) => {
    if (clickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      className={cardClass}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      {...props}
    >
      {(header || title || subtitle || actions) && (
        <div className="card-header">
          <div className="card-header-content">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
            {header}
          </div>
          {actions && (
            <div className="card-actions">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="card-body">
        {children}
      </div>

      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;