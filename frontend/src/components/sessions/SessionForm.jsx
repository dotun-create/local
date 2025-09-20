import React, { useState, useCallback } from 'react';
import { useApiErrorHandler } from '../../hooks/useErrorHandler';

/**
 * Simplified session creation/editing form
 * Focused on essential fields with clean validation
 */
const SessionForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create' // 'create' or 'edit'
}) => {
  const { handleApiError, error, clearError } = useApiErrorHandler();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 60,
    maxStudents: 3,
    price: 0,
    ...initialData
  });

  const [validation, setValidation] = useState({});

  // Handle form field changes
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validation[field]) {
      setValidation(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [validation]);

  // Validate form data
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.title?.trim()) {
      errors.title = 'Session title is required';
    }

    if (formData.duration < 15) {
      errors.duration = 'Duration must be at least 15 minutes';
    }

    if (formData.duration > 480) {
      errors.duration = 'Duration cannot exceed 8 hours';
    }

    if (formData.maxStudents < 1) {
      errors.maxStudents = 'Must allow at least 1 student';
    }

    if (formData.maxStudents > 20) {
      errors.maxStudents = 'Cannot exceed 20 students';
    }

    if (formData.price < 0) {
      errors.price = 'Price cannot be negative';
    }

    setValidation(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      handleApiError(err, { context: 'session_form_submit' });
    }
  }, [formData, validateForm, onSubmit, clearError, handleApiError]);

  return (
    <form className="session-form" onSubmit={handleSubmit}>
      <div className="session-form__header">
        <h2 className="session-form__title">
          {mode === 'create' ? 'Create New Session' : 'Edit Session'}
        </h2>
      </div>

      {error && (
        <div className="session-form__error">
          <span className="session-form__error-icon">⚠️</span>
          <span className="session-form__error-message">{error.message}</span>
          <button
            type="button"
            className="session-form__error-close"
            onClick={clearError}
          >
            ×
          </button>
        </div>
      )}

      <div className="session-form__fields">
        <div className="form-field">
          <label htmlFor="title" className="form-field__label">
            Session Title <span className="form-field__required">*</span>
          </label>
          <input
            id="title"
            type="text"
            className={`form-field__input ${validation.title ? 'form-field__input--error' : ''}`}
            value={formData.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter session title..."
            disabled={isLoading}
          />
          {validation.title && (
            <div className="form-field__error">{validation.title}</div>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="description" className="form-field__label">
            Description
          </label>
          <textarea
            id="description"
            className={`form-field__textarea ${validation.description ? 'form-field__textarea--error' : ''}`}
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe what will be covered in this session..."
            rows={4}
            disabled={isLoading}
          />
          {validation.description && (
            <div className="form-field__error">{validation.description}</div>
          )}
        </div>

        <div className="session-form__row">
          <div className="form-field">
            <label htmlFor="duration" className="form-field__label">
              Duration (minutes) <span className="form-field__required">*</span>
            </label>
            <input
              id="duration"
              type="number"
              className={`form-field__input ${validation.duration ? 'form-field__input--error' : ''}`}
              value={formData.duration || ''}
              onChange={(e) => handleChange('duration', Number(e.target.value))}
              min={15}
              max={480}
              step={5}
              disabled={isLoading}
            />
            {validation.duration && (
              <div className="form-field__error">{validation.duration}</div>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="maxStudents" className="form-field__label">
              Max Students <span className="form-field__required">*</span>
            </label>
            <input
              id="maxStudents"
              type="number"
              className={`form-field__input ${validation.maxStudents ? 'form-field__input--error' : ''}`}
              value={formData.maxStudents || ''}
              onChange={(e) => handleChange('maxStudents', Number(e.target.value))}
              min={1}
              max={20}
              disabled={isLoading}
            />
            {validation.maxStudents && (
              <div className="form-field__error">{validation.maxStudents}</div>
            )}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="price" className="form-field__label">
            Price ($)
          </label>
          <input
            id="price"
            type="number"
            className={`form-field__input ${validation.price ? 'form-field__input--error' : ''}`}
            value={formData.price || ''}
            onChange={(e) => handleChange('price', Number(e.target.value))}
            min={0}
            step={0.01}
            placeholder="0.00"
            disabled={isLoading}
          />
          {validation.price && (
            <div className="form-field__error">{validation.price}</div>
          )}
        </div>
      </div>

      <div className="session-form__actions">
        <button
          type="button"
          className="btn btn--outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="btn__spinner">⟳</span>
              {mode === 'create' ? 'Creating...' : 'Updating...'}
            </>
          ) : (
            mode === 'create' ? 'Create Session' : 'Update Session'
          )}
        </button>
      </div>
    </form>
  );
};

export default SessionForm;