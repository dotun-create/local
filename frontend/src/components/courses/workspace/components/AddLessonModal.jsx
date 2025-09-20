import React, { useState, useEffect } from 'react';
import '../css/AddLessonModal.css';

const AddLessonModal = ({ isOpen, moduleId, moduleName, onSubmit, onCancel, isEditMode = false, lessonData = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    order: 1,
    duration: '',
    type: 'lecture' // Default lesson type
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes or populate with lesson data for edit mode
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && lessonData) {
        // Populate form with existing lesson data
        setFormData({
          title: lessonData.title || '',
          description: lessonData.description || '',
          content: lessonData.content || '',
          order: lessonData.order || 1,
          duration: lessonData.duration ? String(lessonData.duration) : '',
          type: lessonData.type || 'lecture'
        });
      } else {
        // Reset form for new lesson
        setFormData({
          title: '',
          description: '',
          content: '',
          order: 1,
          duration: '',
          type: 'lecture'
        });
      }
      setErrors({});
    }
  }, [isOpen, isEditMode, lessonData]);

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
      newErrors.title = 'Lesson title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Lesson description is required';
    }

    // Duration validation (if provided, should be positive number)
    if (formData.duration && (isNaN(formData.duration) || parseInt(formData.duration) <= 0)) {
      newErrors.duration = 'Duration must be a positive number';
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
      const lessonData = {
        ...formData,
        moduleId,
        duration: formData.duration ? parseInt(formData.duration) : null
      };

      await onSubmit(lessonData);

      // Reset form on success
      setFormData({
        title: '',
        description: '',
        content: '',
        order: 1,
        duration: '',
        type: 'lecture'
      });

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} lesson:`, error);
      setErrors({ submit: `Failed to ${isEditMode ? 'update' : 'create'} lesson. Please try again.` });
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
    <div className="lmd-modal-overlay" onClick={handleOverlayClick}>
      <div className="lmd-modal">
        {/* Header */}
        <div className="lmd-modal-header">
          <h2 className="lmd-modal-title">
            <span className="lmd-modal-title-icon">📝</span>
            {isEditMode ? 'Edit Lesson' : 'Add New Lesson'}
          </h2>
          <button
            type="button"
            className="lmd-modal-close"
            onClick={onCancel}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="lmd-modal-body">
            {errors.submit && (
              <div className="lmd-error-message" style={{
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

            {/* Module Context */}
            <div className="lmd-context-info">
              <span className="lmd-context-label">{isEditMode ? 'Editing lesson in:' : 'Adding lesson to:'}</span>
              <span className="lmd-context-module">{moduleName || (isEditMode && lessonData ? 'Module' : '')}</span>
            </div>

            {/* Lesson Title */}
            <div className="lmd-form-group">
              <label className="lmd-label required" htmlFor="lesson-title">
                Lesson Title
              </label>
              <input
                id="lesson-title"
                type="text"
                className="lmd-input"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Introduction to Variables"
                maxLength={100}
              />
              {errors.title && (
                <div className="lmd-help-text" style={{ color: '#ef4444' }}>
                  {errors.title}
                </div>
              )}
            </div>

            {/* Lesson Description */}
            <div className="lmd-form-group">
              <label className="lmd-label required" htmlFor="lesson-description">
                Description
              </label>
              <textarea
                id="lesson-description"
                className="lmd-textarea"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what students will learn in this lesson..."
                maxLength={500}
              />
              {errors.description && (
                <div className="lmd-help-text" style={{ color: '#ef4444' }}>
                  {errors.description}
                </div>
              )}
              <div className="lmd-help-text">
                {formData.description.length}/500 characters
              </div>
            </div>

            {/* Lesson Content */}
            <div className="lmd-form-group">
              <label className="lmd-label" htmlFor="lesson-content">
                Lesson Content
              </label>
              <textarea
                id="lesson-content"
                className="lmd-textarea"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Lesson objectives, materials, activities, notes..."
                rows={4}
                maxLength={2000}
              />
              <div className="lmd-help-text">
                Learning objectives, materials needed, activities, etc. ({formData.content.length}/2000 characters)
              </div>
            </div>

            {/* Lesson Order and Duration */}
            <div className="lmd-form-row">
              <div className="lmd-form-group">
                <label className="lmd-label" htmlFor="lesson-order">
                  Lesson Order
                </label>
                <input
                  id="lesson-order"
                  type="number"
                  className="lmd-input"
                  value={formData.order}
                  onChange={(e) => handleChange('order', parseInt(e.target.value) || 1)}
                  min="1"
                  max="100"
                />
                <div className="lmd-help-text">
                  The order in which this lesson appears in the module
                </div>
              </div>

              <div className="lmd-form-group">
                <label className="lmd-label" htmlFor="lesson-duration">
                  Duration (minutes)
                </label>
                <input
                  id="lesson-duration"
                  type="number"
                  className="lmd-input"
                  value={formData.duration}
                  onChange={(e) => handleChange('duration', e.target.value)}
                  placeholder="60"
                  min="1"
                  max="480"
                />
                {errors.duration && (
                  <div className="lmd-help-text" style={{ color: '#ef4444' }}>
                    {errors.duration}
                  </div>
                )}
                <div className="lmd-help-text">
                  Optional: Estimated time to complete this lesson
                </div>
              </div>
            </div>

            {/* Lesson Type */}
            <div className="lmd-form-group">
              <label className="lmd-label" htmlFor="lesson-type">
                Lesson Type
              </label>
              <select
                id="lesson-type"
                className="lmd-select"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                <option value="lecture">Lecture</option>
                <option value="tutorial">Tutorial</option>
                <option value="practical">Practical Exercise</option>
                <option value="discussion">Discussion</option>
                <option value="assignment">Assignment</option>
                <option value="reading">Reading Material</option>
                <option value="video">Video Content</option>
                <option value="other">Other</option>
              </select>
              <div className="lmd-help-text">
                Select the type of lesson content
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="lmd-form-footer">
            <button
              type="button"
              className="lmd-btn lmd-btn-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="lmd-btn lmd-btn-primary"
              disabled={isSubmitting}
            >
              <span className="lmd-btn-icon">
                {isSubmitting ? '⏳' : '✅'}
              </span>
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Lesson' : 'Create Lesson')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLessonModal;