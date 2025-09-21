import React from 'react';
import './Sidebar.css';

const Sidebar = ({
  children,
  className = '',
  variant = 'default',
  position = 'left',
  width = 'medium',
  collapsible = false,
  collapsed = false,
  onToggle,
  overlay = false,
  ...props
}) => {
  const sidebarClass = `
    sidebar
    sidebar-${variant}
    sidebar-${position}
    sidebar-${width}
    ${collapsible ? 'sidebar-collapsible' : ''}
    ${collapsed ? 'sidebar-collapsed' : ''}
    ${overlay ? 'sidebar-overlay' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <>
      {overlay && collapsed === false && (
        <div className="sidebar-backdrop" onClick={onToggle} />
      )}
      <aside className={sidebarClass} {...props}>
        {collapsible && (
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="sidebar-toggle-icon">
              {collapsed ? '→' : '←'}
            </span>
          </button>
        )}
        <div className="sidebar-content">
          {children}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;