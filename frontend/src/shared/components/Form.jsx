import React from 'react';
import './Form.css';

const Form = ({
  children,
  onSubmit,
  className = '',
  variant = 'default',
  size = 'medium',
  loading = false,
  disabled = false,
  ...props
}) => {
  const formClass = `
    form
    form-${variant}
    form-${size}
    ${loading ? 'form-loading' : ''}
    ${disabled ? 'form-disabled' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading && !disabled && onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form
      className={formClass}
      onSubmit={handleSubmit}
      noValidate
      {...props}
    >
      {children}
    </form>
  );
};

export default Form;