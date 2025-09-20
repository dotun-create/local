import React, { useState, useCallback } from 'react';

const TreeNode = ({
  node,
  level = 0,
  expanded,
  selected,
  onToggle,
  onSelect,
  onInlineCreate,
  onOpenQuizModal,
  onEditLesson
}) => {
  const [showActions, setShowActions] = useState(false);
  
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.includes(node.key);
  const isSelected = selected.includes(node.key);

  const handleToggle = (e) => {
    e.stopPropagation();
    onToggle(node.key);
  };

  const handleSelect = () => {
    onSelect(node.key);
  };

  const handleInlineCreate = (e, contentType) => {
    e.stopPropagation();
    if (contentType === 'quiz') {
      onOpenQuizModal();
    } else if (contentType === 'edit-lesson') {
      onEditLesson(node);
    } else {
      onInlineCreate(node, contentType);
    }
  };

  const getCreatableTypes = (nodeType) => {
    switch (nodeType) {
      case 'course':
        return [{ type: 'module', label: 'Module', icon: '📚' }];
      case 'module':
        return [
          { type: 'lesson', label: 'Lesson', icon: '📝' },
          { type: 'quiz', label: 'Quiz', icon: '📋' }
        ];
      case 'lesson':
        return [
          { type: 'edit-lesson', label: 'Edit', icon: '✏️' }
        ];
      default:
        return [];
    }
  };

  const creatableTypes = getCreatableTypes(node.type);

  return (
    <div className="tree-node">
      <div 
        className={`tree-node-content ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={handleSelect}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Expand/Collapse Button */}
        <button 
          className={`tree-expand-btn ${hasChildren ? '' : 'invisible'}`}
          onClick={handleToggle}
        >
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▶
          </span>
        </button>

        {/* Node Icon */}
        <span className="tree-node-icon">{node.icon}</span>

        {/* Node Title */}
        <span className="tree-node-title">{node.title}</span>

        {/* Node Badge */}
        {node.type !== 'course' && (
          <span className={`tree-node-badge ${node.type}`}>
            {node.type}
          </span>
        )}

        {/* Status Indicator */}
        {node.data?.status && (
          <span className={`tree-status-indicator ${node.data.status}`}>
            {node.data.status === 'published' ? '✓' : 
             node.data.status === 'draft' ? '📝' : '⏸'}
          </span>
        )}

        {/* Quick Actions */}
        {showActions && creatableTypes.length > 0 && (
          <div className="tree-node-actions">
            {creatableTypes.map(({ type, label, icon }) => (
              <button
                key={type}
                className="tree-action-btn"
                onClick={(e) => handleInlineCreate(e, type)}
                title={`Add ${label}`}
              >
                <span className="action-icon">{icon}</span>
                <span className="action-label">+</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="tree-node-children">
          {node.children.map(child => (
            <TreeNode
              key={child.key}
              node={child}
              level={level + 1}
              expanded={expanded}
              selected={selected}
              onToggle={onToggle}
              onSelect={onSelect}
              onInlineCreate={onInlineCreate}
              onOpenQuizModal={onOpenQuizModal}
              onEditLesson={onEditLesson}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ContentTree = ({
  data,
  selectedItems,
  expandedKeys,
  onExpand,
  onSelectionChange,
  onInlineCreate,
  onOpenQuizModal,
  onEditLesson
}) => {
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  
  // Convert selectedItems to array of keys
  const selectedKeys = selectedItems.map(item => item.key);

  const handleToggle = useCallback((key) => {
    const newExpanded = expandedKeys.includes(key)
      ? expandedKeys.filter(k => k !== key)
      : [...expandedKeys, key];
    onExpand(newExpanded);
  }, [expandedKeys, onExpand]);

  const handleSelect = useCallback((key) => {
    let newSelection;
    
    if (multiSelectMode) {
      // Multi-select mode - toggle selection
      newSelection = selectedKeys.includes(key)
        ? selectedKeys.filter(k => k !== key)
        : [...selectedKeys, key];
    } else {
      // Single select mode
      newSelection = [key];
    }
    
    onSelectionChange(newSelection, { multiSelect: multiSelectMode });
  }, [selectedKeys, multiSelectMode, onSelectionChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Meta' || e.key === 'Control') {
      setMultiSelectMode(true);
    }
  }, []);

  const handleKeyUp = useCallback((e) => {
    if (e.key === 'Meta' || e.key === 'Control') {
      setMultiSelectMode(false);
    }
  }, []);

  // Add keyboard event listeners
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div className="content-tree">
      {/* Tree Header */}
      <div className="tree-header">
        <div className="tree-controls">
          <button 
            className="tree-control-btn"
            onClick={() => onExpand(['course', ...data.flatMap(node => 
              node.children?.map(child => child.key) || []
            )])}
            title="Expand All"
          >
            📂 Expand All
          </button>
          <button 
            className="tree-control-btn"
            onClick={() => onExpand([])}
            title="Collapse All"
          >
            📁 Collapse All
          </button>
        </div>
        
        <div className="selection-info">
          {selectedItems.length > 0 && (
            <span className="selection-count">
              {selectedItems.length} selected
            </span>
          )}
          {multiSelectMode && (
            <span className="multi-select-indicator">
              Multi-select mode
            </span>
          )}
        </div>
      </div>

      {/* Tree Content */}
      <div className="tree-content">
        {data.map(node => (
          <TreeNode
            key={node.key}
            node={node}
            level={0}
            expanded={expandedKeys}
            selected={selectedKeys}
            onToggle={handleToggle}
            onSelect={handleSelect}
            onInlineCreate={onInlineCreate}
            onOpenQuizModal={onOpenQuizModal}
            onEditLesson={onEditLesson}
          />
        ))}
      </div>

      {/* Tree Footer */}
      {selectedItems.length > 0 && (
        <div className="tree-footer">
          <div className="selection-summary">
            <strong>Selected items:</strong>
            <div className="selected-items-list">
              {selectedItems.slice(0, 3).map(item => (
                <span key={item.key} className="selected-item">
                  {item.title}
                </span>
              ))}
              {selectedItems.length > 3 && (
                <span className="more-items">
                  +{selectedItems.length - 3} more
                </span>
              )}
            </div>
          </div>
          
          <button 
            className="clear-selection-btn"
            onClick={() => onSelectionChange([], {})}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentTree;