import React from 'react';

const ContentTemplateSelector = ({ courseId, onSelect, onCancel }) => {
  const templates = [
    {
      id: 'assessment-module',
      icon: '🎯',
      title: 'Assessment Module',
      description: 'Module with structured lessons and final quiz',
      includes: ['3 lessons', '1 final quiz', 'progress tracking']
    },
    {
      id: 'video-series',
      icon: '🎥',
      title: 'Video Lesson Series',
      description: 'Video-based lessons with knowledge checks',
      includes: ['5 video lessons', '2 practice quizzes', 'downloadable resources']
    },
    {
      id: 'workshop-series',
      icon: '🛠️',
      title: 'Interactive Workshop',
      description: 'Hands-on sessions with practical exercises',
      includes: ['4 workshop sessions', '1 group project', 'peer review']
    },
    {
      id: 'certification-path',
      icon: '🏆',
      title: 'Certification Path',
      description: 'Complete learning path with certification',
      includes: ['6 modules', '12 lessons', '3 major assessments']
    }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content template-selector-modal">
        <div className="modal-header">
          <h3>Choose a Content Template</h3>
          <button onClick={onCancel} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          <div className="templates-grid">
            {templates.map(template => (
              <div 
                key={template.id}
                className="template-card"
                onClick={() => onSelect(template)}
              >
                <div className="template-icon">{template.icon}</div>
                <div className="template-content">
                  <h4 className="template-title">{template.title}</h4>
                  <p className="template-description">{template.description}</p>
                  <div className="template-includes">
                    <span className="includes-label">Includes:</span>
                    <ul className="includes-list">
                      {template.includes.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="template-action">
                  <button className="btn btn-primary">Use Template</button>
                </div>
              </div>
            ))}
          </div>

          <div className="custom-option">
            <div className="custom-card" onClick={() => onSelect(null)}>
              <div className="custom-icon">⚡</div>
              <div className="custom-content">
                <h4>Start from Scratch</h4>
                <p>Build your content structure manually</p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentTemplateSelector;