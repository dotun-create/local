import React, { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(({
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  readOnly = false,
  required = false,
  autoComplete,
  autoFocus = false,
  size = 'medium',
  variant = 'default',
  error = false,
  errorMessage = '',
  helperText = '',
  label = '',
  id,
  name,
  className = '',
  startIcon,
  endIcon,
  onStartIconClick,
  onEndIconClick,
  maxLength,
  minLength,
  pattern,
  min,
  max,
  step,
  rows,
  cols,
  resize = 'vertical',
  ...props
}, ref) => {
  const isTextarea = type === 'textarea';
  const Component = isTextarea ? 'textarea' : 'input';

  const inputClass = `
    input-field
    input-${size}
    input-${variant}
    ${error ? 'input-error' : ''}
    ${disabled ? 'input-disabled' : ''}
    ${readOnly ? 'input-readonly' : ''}
    ${startIcon ? 'input-with-start-icon' : ''}
    ${endIcon ? 'input-with-end-icon' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const wrapperClass = `input-wrapper ${error ? 'input-wrapper-error' : ''}`;

  const inputProps = {
    ref,
    className: inputClass,
    placeholder,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    disabled,
    readOnly,
    required,
    autoComplete,
    autoFocus,
    id: id || name,
    name,
    maxLength,
    minLength,
    pattern,
    ...props
  };

  if (!isTextarea) {
    inputProps.type = type;
    inputProps.min = min;
    inputProps.max = max;
    inputProps.step = step;
  } else {
    inputProps.rows = rows;
    inputProps.cols = cols;
    inputProps.style = { resize, ...props.style };
  }

  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={id || name} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}

      <div className="input-container">
        {startIcon && (
          <span
            className="input-icon input-start-icon"
            onClick={onStartIconClick}
            role={onStartIconClick ? 'button' : undefined}
            tabIndex={onStartIconClick ? 0 : undefined}
          >
            {startIcon}
          </span>
        )}

        <Component {...inputProps} />

        {endIcon && (
          <span
            className="input-icon input-end-icon"
            onClick={onEndIconClick}
            role={onEndIconClick ? 'button' : undefined}
            tabIndex={onEndIconClick ? 0 : undefined}
          >
            {endIcon}
          </span>
        )}
      </div>

      {(error && errorMessage) && (
        <span className="input-error-message">{errorMessage}</span>
      )}

      {(!error && helperText) && (
        <span className="input-helper-text">{helperText}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;