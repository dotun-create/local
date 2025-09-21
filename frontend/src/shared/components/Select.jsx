import React, { forwardRef } from 'react';
import './Select.css';

const Select = forwardRef(({
  options = [],
  placeholder = 'Select an option...',
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  multiple = false,
  size = 'medium',
  variant = 'default',
  error = false,
  errorMessage = '',
  helperText = '',
  label = '',
  id,
  name,
  className = '',
  ...props
}, ref) => {
  const selectClass = `
    select-field
    select-${size}
    select-${variant}
    ${error ? 'select-error' : ''}
    ${disabled ? 'select-disabled' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const wrapperClass = `select-wrapper ${error ? 'select-wrapper-error' : ''}`;

  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={id || name} className="select-label">
          {label}
          {required && <span className="select-required">*</span>}
        </label>
      )}

      <div className="select-container">
        <select
          ref={ref}
          className={selectClass}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          required={required}
          multiple={multiple}
          id={id || name}
          name={name}
          {...props}
        >
          {!multiple && placeholder && !value && !defaultValue && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => {
            if (typeof option === 'string') {
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            }
            return (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            );
          })}
        </select>

        <span className="select-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {(error && errorMessage) && (
        <span className="select-error-message">{errorMessage}</span>
      )}

      {(!error && helperText) && (
        <span className="select-helper-text">{helperText}</span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;