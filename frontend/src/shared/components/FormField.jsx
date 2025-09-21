import React from 'react';
import Input from './Input';
import Select from './Select';
import './FormField.css';

const FormField = ({
  type = 'text',
  component,
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched,
  helperText,
  required = false,
  className = '',
  ...props
}) => {
  const hasError = error && touched;
  const fieldId = props.id || name;

  const renderField = () => {
    if (component) {
      return React.cloneElement(component, {
        id: fieldId,
        name,
        value,
        onChange,
        onBlur,
        error: hasError,
        errorMessage: hasError ? error : '',
        required,
        ...props
      });
    }

    if (type === 'select') {
      return (
        <Select
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          error={hasError}
          errorMessage={hasError ? error : ''}
          helperText={!hasError ? helperText : ''}
          required={required}
          {...props}
        />
      );
    }

    return (
      <Input
        type={type}
        id={fieldId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        error={hasError}
        errorMessage={hasError ? error : ''}
        helperText={!hasError ? helperText : ''}
        required={required}
        {...props}
      />
    );
  };

  return (
    <div className={`form-field ${className}`}>
      {label && !component?.props?.label && (
        <label htmlFor={fieldId} className="form-field-label">
          {label}
          {required && <span className="form-field-required">*</span>}
        </label>
      )}
      {renderField()}
    </div>
  );
};

export default FormField;