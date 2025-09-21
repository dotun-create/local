import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({
  children,
  className = '',
  header,
  footer,
  sidebar,
  sidebarPosition = 'left',
  sidebarCollapsed = false,
  onSidebarToggle,
  fullHeight = true,
  ...props
}) => {
  const layoutClass = `
    layout
    ${fullHeight ? 'layout-full-height' : ''}
    ${sidebar ? `layout-with-sidebar layout-sidebar-${sidebarPosition}` : ''}
    ${sidebarCollapsed ? 'layout-sidebar-collapsed' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={layoutClass} {...props}>
      {header && (
        <div className="layout-header">
          {header}
        </div>
      )}

      <div className="layout-body">
        {sidebar && (
          <div className="layout-sidebar">
            {React.cloneElement(sidebar, {
              collapsed: sidebarCollapsed,
              onToggle: onSidebarToggle,
              position: sidebarPosition
            })}
          </div>
        )}

        <main className="layout-main">
          {children}
        </main>
      </div>

      {footer && (
        <div className="layout-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Layout;