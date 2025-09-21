/**
 * Button Component - Styled Components Version
 * Modern button component using styled-components with theme integration
 */

import React from 'react';
import {
  StyledButton,
  ButtonContent,
  LoadingSpinner,
  IconWrapper,
} from './Button.styled';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  icon,
  iconPosition = 'left',
  iconOnly = false,
  ...props
}) => {
  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <StyledButton
      type={type}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      loading={loading}
      fullWidth={fullWidth}
      iconOnly={iconOnly}
      onClick={handleClick}
      className={className}
      {...props}
    >
      {loading && <LoadingSpinner />}

      <ButtonContent loading={loading}>
        {icon && iconPosition === 'left' && !iconOnly && (
          <IconWrapper position="left">{icon}</IconWrapper>
        )}

        {iconOnly ? icon : children}

        {icon && iconPosition === 'right' && !iconOnly && (
          <IconWrapper position="right">{icon}</IconWrapper>
        )}
      </ButtonContent>
    </StyledButton>
  );
};

export default Button;