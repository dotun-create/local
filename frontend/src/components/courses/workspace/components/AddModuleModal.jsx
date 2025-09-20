import React, { useState, useEffect } from 'react';
import '../css/AddModuleModal.css';

const AddModuleModal = ({ isOpen, courseId, courseTimezone, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1,
    startDate: '',
    endDate: '', // NEW: Added end date field
    status: 'draft'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        order: 1,
        startDate: '',
        endDate: '',
        status: 'draft'
      });
      setErrors({});
    }
  }, [isOpen]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onCancel]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Module title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Module description is required';
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const moduleData = {
        ...formData,
        courseId,
        type: 'module',
        timezone: courseTimezone || 'UTC', // Inherit from course
        startTime: '00:00:00', // Default start time
        endTime: '23:59:59'    // Default end time
      };

      await onSubmit(moduleData);

      // Reset form on success
      setFormData({
        title: '',
        description: '',
        order: 1,
        startDate: '',
        endDate: '',
        status: 'draft'
      });

    } catch (error) {
      console.error('Error creating module:', error);
      setErrors({ submit: 'Failed to create module. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="adm-cd-modal-overlay" onClick={handleOverlayClick}>
      <div className="adm-cd-modal">
        {/* Header */}
        <div className="adm-cd-modal-header">
          <h2 className="adm-cd-modal-title">
            <span className="adm-cd-modal-title-icon">📚</span>
            Add New Module
          </h2>
          <button
            type="button"
            className="adm-cd-modal-close"
            onClick={onCancel}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="adm-cd-modal-body">
            {errors.submit && (
              <div className="adm-cd-error-message" style={{
                color: '#ef4444',
                marginBottom: '20px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '6px',
                border: '1px solid #fecaca'
              }}>
                {errors.submit}
              </div>
            )}

            {/* Module Title */}
            <div className="adm-cd-form-group">
              <label className="adm-cd-label required" htmlFor="module-title">
                Module Title
              </label>
              <input
                id="module-title"
                type="text"
                className="adm-cd-input"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Introduction to React Hooks"
                maxLength={100}
              />
              {errors.title && (
                <div className="adm-cd-help-text" style={{ color: '#ef4444' }}>
                  {errors.title}
                </div>
              )}
            </div>

            {/* Module Description */}
            <div className="adm-cd-form-group">
              <label className="adm-cd-label required" htmlFor="module-description">
                Description
              </label>
              <textarea
                id="module-description"
                className="adm-cd-textarea"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what students will learn in this module..."
                maxLength={500}
              />
              {errors.description && (
                <div className="adm-cd-help-text" style={{ color: '#ef4444' }}>
                  {errors.description}
                </div>
              )}
              <div className="adm-cd-help-text">
                {formData.description.length}/500 characters
              </div>
            </div>

            {/* Module Order */}
            <div className="adm-cd-form-group">
              <label className="adm-cd-label" htmlFor="module-order">
                Module Order
              </label>
              <input
                id="module-order"
                type="number"
                className="adm-cd-input"
                value={formData.order}
                onChange={(e) => handleChange('order', parseInt(e.target.value) || 1)}
                min="1"
                max="100"
              />
              <div className="adm-cd-help-text">
                The order in which this module appears in the course
              </div>
            </div>

            {/* Start Date and End Date */}
            <div className="adm-cd-form-group">
              <label className="adm-cd-label">Module Duration</label>
              <div className="adm-cd-date-row">
                <div>
                  <label className="adm-cd-label" htmlFor="module-start-date">
                    Start Date
                  </label>
                  <input
                    id="module-start-date"
                    type="date"
                    className="adm-cd-input"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="adm-cd-label" htmlFor="module-end-date">
                    End Date
                  </label>
                  <input
                    id="module-end-date"
                    type="date"
                    className="adm-cd-input"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    min={formData.startDate}
                  />
                  {errors.endDate && (
                    <div className="adm-cd-help-text" style={{ color: '#ef4444' }}>
                      {errors.endDate}
                    </div>
                  )}
                </div>
              </div>
              <div className="adm-cd-help-text">
                Optional: Set when this module becomes available to students
              </div>
            </div>

            {/* Module Status */}
            <div className="adm-cd-form-group">
              <label className="adm-cd-label" htmlFor="module-status">
                Status
              </label>
              <select
                id="module-status"
                className="adm-cd-select"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <div className="adm-cd-help-text">
                Draft modules are only visible to instructors and admins
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="adm-cd-form-footer">
            <button
              type="button"
              className="adm-cd-btn adm-cd-btn-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="adm-cd-btn adm-cd-btn-primary"
              disabled={isSubmitting}
            >
              <span className="adm-cd-btn-icon">
                {isSubmitting ? '⏳' : '✅'}
              </span>
              {isSubmitting ? 'Creating...' : 'Create Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddModuleModal;