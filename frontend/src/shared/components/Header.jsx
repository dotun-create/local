import React from 'react';
import './Header.css';

const Header = ({
  children,
  className = '',
  variant = 'default',
  sticky = false,
  transparent = false,
  bordered = true,
  ...props
}) => {
  const headerClass = `
    header
    header-${variant}
    ${sticky ? 'header-sticky' : ''}
    ${transparent ? 'header-transparent' : ''}
    ${bordered ? 'header-bordered' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <header className={headerClass} {...props}>
      <div className="header-container">
        {children}
      </div>
    </header>
  );
};

export default Header;