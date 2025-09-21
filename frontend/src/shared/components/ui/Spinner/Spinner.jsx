/**
 * Spinner Component
 * Loading spinner with multiple sizes and styles
 */

import React from 'react';
import { SpinnerContainer, SpinnerElement, SpinnerText } from './Spinner.styled';

const Spinner = ({
  size = 'md',
  variant = 'primary',
  className = '',
  text,
  fullScreen = false,
  ...props
}) => {
  return (
    <SpinnerContainer
      className={className}
      fullScreen={fullScreen}
      {...props}
    >
      <SpinnerElement size={size} variant={variant} />
      {text && <SpinnerText size={size}>{text}</SpinnerText>}
    </SpinnerContainer>
  );
};

export default Spinner;