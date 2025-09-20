import React, { useState, useEffect } from 'react';

const QuickCreatePanel = ({ context, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1,
    content: '',
    duration: '',
    passingScore: 70,
    timeLimit: '',
    validFrom: '',
    validUntil: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form defaults based on context
  useEffect(() => {
    if (context) {
      const updates = {
        order: getNextOrder(context)
      };

      // Handle quiz context from assessment session creation
      if (context.quizContext) {
        const quizCtx = context.quizContext;
        updates.title = `Assessment Quiz - ${quizCtx.defaultModule?.title || 'Module'}`;
        updates.description = `Assessment quiz created from session template for ${quizCtx.defaultModule?.title || 'module content'}`;
        // Set quiz defaults for assessment
        updates.passingScore = 75; // Higher passing score for assessments
        updates.timeLimit = 60; // Default 60 minutes for assessment
      }

      setFormData(prev => ({
        ...prev,
        ...updates
      }));
    }
  }, [context]);

  const getNextOrder = (context) => {
    // Calculate next order based on existing content
    // This would ideally come from the workspace state
    return 1;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(context.contentType, formData);
    } catch (error) {
      console.error('Failed to create content:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormTitle = () => {
    const type = context?.contentType;
    const parent = context?.parentNode?.type;
    return `Create New ${type} ${parent ? `in ${parent}` : ''}`;
  };

  const renderFormFields = () => {
    const { contentType } = context;

    const commonFields = (
      <>
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={`Enter ${contentType} title...`}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={`Describe this ${contentType}...`}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Order</label>
          <input
            type="number"
            value={formData.order}
            onChange={(e) => handleChange('order', parseInt(e.target.value))}
            min={1}
          />
        </div>
      </>
    );

    switch (contentType) {
      case 'module':
        return (
          <>
            {commonFields}
            <div className="form-group">
              <label>Duration</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="e.g., 2 weeks, 10 hours"
              />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>
          </>
        );

      case 'lesson':
        return (
          <>
            {commonFields}
            <div className="form-group">
              <label>Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Lesson content, objectives, materials..."
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="60"
              />
            </div>
          </>
        );

      case 'quiz':
        return (
          <>
            {commonFields}
            <div className="form-row">
              <div className="form-group">
                <label>Passing Score (%)</label>
                <input
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) => handleChange('passingScore', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
              </div>
              <div className="form-group">
                <label>Time Limit (minutes)</label>
                <input
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => handleChange('timeLimit', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Available From</label>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => handleChange('validFrom', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Available Until</label>
                <input
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => handleChange('validUntil', e.target.value)}
                />
              </div>
            </div>
          </>
        );

      case 'session':
        return (
          <>
            {commonFields}
            <div className="form-group">
              <label>Scheduled Date & Time</label>
              <input
                type="datetime-local"
                value={formData.scheduledDate}
                onChange={(e) => handleChange('scheduledDate', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value))}
                placeholder="60"
                min={15}
                step={15}
              />
            </div>
            <div className="form-group">
              <label>Max Participants</label>
              <input
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => handleChange('maxParticipants', parseInt(e.target.value))}
                placeholder="3"
                min={1}
              />
            </div>
          </>
        );

      default:
        return commonFields;
    }
  };

  if (!context) {
    return null;
  }

  return (
    <div className="quick-create-panel">
      <div className="panel-header">
        <h3>{getFormTitle()}</h3>
        <button 
          onClick={onCancel}
          className="panel-close"
          disabled={isSubmitting}
        >
          ×
        </button>
      </div>

      <div className="panel-content">
        <form onSubmit={handleSubmit}>
          {renderFormFields()}

          <div className="form-actions">
            <button 
              type="button" 
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting || !formData.title.trim()}
            >
              {isSubmitting ? 'Creating...' : `Create ${context.contentType}`}
            </button>
          </div>
        </form>
      </div>

      {/* Context Info */}
      <div className="panel-footer">
        <div className="context-info">
          <span className="context-label">Creating in:</span>
          <span className="context-path">
            {context.parentNode?.data?.title || 'Course'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuickCreatePanel;