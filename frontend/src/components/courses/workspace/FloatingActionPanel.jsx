import React, { useState, useCallback, useRef, useEffect } from 'react';

const FloatingActionButton = ({ 
  icon, 
  label, 
  onClick, 
  disabled = false, 
  variant = 'default',
  className = ''
}) => (
  <button
    className={`floating-action-btn ${variant} ${className} ${disabled ? 'disabled' : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={label}
  >
    <span className="fab-icon">{icon}</span>
    <span className="fab-label">{label}</span>
  </button>
);

const QuickAccessShortcuts = ({ activeTab }) => {
  const shortcuts = {
    'content-structure': [
      { key: 'Cmd+M', action: 'New Module', icon: '📚' },
      { key: 'Cmd+L', action: 'New Lesson', icon: '📝' },
      { key: 'Cmd+Q', action: 'New Quiz', icon: '📋' }
    ],
    'sessions-manager': [
      { key: 'Cmd+S', action: 'New Session', icon: '🎥' },
      { key: 'Cmd+B', action: 'Batch Create', icon: '⚡' }
    ],
    'enrollment-hub': [
      { key: 'Cmd+U', action: 'Add Student', icon: '👤' },
      { key: 'Cmd+E', action: 'Bulk Enroll', icon: '👥' }
    ]
  };

  const currentShortcuts = shortcuts[activeTab] || [];

  return (
    <div className="quick-access-shortcuts">
      <div className="shortcuts-header">
        <span>Quick Actions</span>
      </div>
      <div className="shortcuts-list">
        {currentShortcuts.map(shortcut => (
          <div key={shortcut.key} className="shortcut-item">
            <span className="shortcut-icon">{shortcut.icon}</span>
            <span className="shortcut-action">{shortcut.action}</span>
            <span className="shortcut-key">{shortcut.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BatchProgressIndicator = ({ batchOperation }) => {
  if (!batchOperation.active) return null;

  return (
    <div className="batch-progress-indicator">
      <div className="progress-header">
        <span className="progress-icon">⚙️</span>
        <span className="progress-text">
          {batchOperation.operation} ({batchOperation.items.length} items)
        </span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${batchOperation.progress}%` }}
        />
      </div>
    </div>
  );
};

const FloatingActionPanel = ({
  activeTab,
  selectedItems,
  onBatchOperation,
  onCreateContent,
  onOpenQuizModal,
  courseId,
  show,
  onToggle,
  batchOperation
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsExpanded(false);
        setShowShortcuts(false);
      }
    };

    if (isExpanded || showShortcuts) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded, showShortcuts]);

  // Get contextual actions based on active tab and selection
  const getContextualActions = useCallback(() => {
    const hasSelection = selectedItems.length > 0;
    const multipleSelected = selectedItems.length > 1;

    const baseActions = {
      'content-structure': [
        {
          id: 'create-module',
          icon: '📚',
          label: 'Create Module',
          onClick: () => onCreateContent('module', {}, courseId),
          disabled: false,
          variant: 'primary'
        },
        {
          id: 'create-lesson',
          icon: '📝',
          label: 'Create Lesson',
          onClick: () => onCreateContent('lesson', {}),
          disabled: !hasSelection || selectedItems[0].type !== 'module',
          variant: 'default'
        },
        {
          id: 'create-quiz',
          icon: '📋',
          label: 'Create Quiz',
          onClick: () => onOpenQuizModal(),
          disabled: !hasSelection || (selectedItems[0].type !== 'module' && selectedItems[0].type !== 'lesson'),
          variant: 'default'
        }
      ],
      'sessions-manager': [
        {
          id: 'create-session',
          icon: '🎥',
          label: 'Create Session',
          onClick: () => onCreateContent('session', {}, courseId),
          disabled: false,
          variant: 'primary'
        },
        {
          id: 'batch-schedule',
          icon: '📅',
          label: 'Batch Schedule',
          onClick: () => {/* Open batch scheduling modal */},
          disabled: false,
          variant: 'default'
        }
      ],
      'enrollment-hub': [
        {
          id: 'enroll-student',
          icon: '👤',
          label: 'Enroll Student',
          onClick: () => {/* Open enrollment modal */},
          disabled: false,
          variant: 'primary'
        },
        {
          id: 'bulk-enroll',
          icon: '👥',
          label: 'Bulk Enroll',
          onClick: () => {/* Open bulk enrollment modal */},
          disabled: false,
          variant: 'default'
        }
      ]
    };

    const batchActions = hasSelection ? [
      {
        id: 'batch-edit',
        icon: '📝',
        label: `Edit ${selectedItems.length} items`,
        onClick: () => onBatchOperation('edit', selectedItems),
        disabled: false,
        variant: 'default'
      },
      {
        id: 'batch-duplicate',
        icon: '📋',
        label: `Duplicate ${selectedItems.length} items`,
        onClick: () => onBatchOperation('duplicate', selectedItems),
        disabled: false,
        variant: 'default'
      },
      {
        id: 'batch-delete',
        icon: '🗑️',
        label: `Delete ${selectedItems.length} items`,
        onClick: () => onBatchOperation('delete', selectedItems),
        disabled: false,
        variant: 'danger'
      }
    ] : [];

    return [...(baseActions[activeTab] || []), ...batchActions];
  }, [activeTab, selectedItems, onCreateContent, onBatchOperation, courseId]);

  const actions = getContextualActions();
  const primaryActions = actions.filter(a => a.variant === 'primary');
  const secondaryActions = actions.filter(a => a.variant !== 'primary');

  const handleMainToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      onToggle();
    }
  };

  return (
    <div 
      ref={panelRef}
      className={`floating-action-panel ${isExpanded ? 'expanded' : ''} ${show ? 'visible' : ''}`}
    >
      {/* Batch Progress Indicator */}
      <BatchProgressIndicator batchOperation={batchOperation} />

      {/* Main FAB */}
      <div className="fab-main-container">
        <button 
          className={`fab-main ${isExpanded ? 'expanded' : ''}`}
          onClick={handleMainToggle}
        >
          <span className={`fab-main-icon ${isExpanded ? 'rotate' : ''}`}>
            {isExpanded ? '×' : '+'}
          </span>
        </button>
      </div>

      {/* Action Menu */}
      {isExpanded && (
        <div className="fab-action-menu">
          {/* Primary Actions */}
          {primaryActions.length > 0 && (
            <div className="fab-actions-group primary">
              {primaryActions.map(action => (
                <FloatingActionButton
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  variant={action.variant}
                />
              ))}
            </div>
          )}

          {/* Secondary Actions */}
          {secondaryActions.length > 0 && (
            <div className="fab-actions-group secondary">
              {secondaryActions.map(action => (
                <FloatingActionButton
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  variant={action.variant}
                />
              ))}
            </div>
          )}

          {/* Shortcuts Toggle */}
          <div className="fab-actions-group utility">
            <FloatingActionButton
              icon="⌨️"
              label="Shortcuts"
              onClick={() => setShowShortcuts(!showShortcuts)}
              variant="utility"
            />
          </div>
        </div>
      )}

      {/* Quick Access Shortcuts */}
      {showShortcuts && (
        <div className="fab-shortcuts-panel">
          <QuickAccessShortcuts activeTab={activeTab} />
        </div>
      )}

      {/* Context Information */}
      {selectedItems.length > 0 && (
        <div className="fab-context-info">
          <div className="context-summary">
            <span className="context-icon">📋</span>
            <span className="context-text">
              {selectedItems.length} selected
            </span>
            <span className="context-types">
              {[...new Set(selectedItems.map(item => item.type))].join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Help Tooltip */}
      {!isExpanded && !show && (
        <div className="fab-tooltip">
          <span>Click to open quick actions</span>
          <div className="tooltip-arrow"></div>
        </div>
      )}
    </div>
  );
};

export default FloatingActionPanel;