import React from 'react';
import './Footer.css';

const Footer = ({
  children,
  className = '',
  variant = 'default',
  bordered = true,
  ...props
}) => {
  const footerClass = `
    footer
    footer-${variant}
    ${bordered ? 'footer-bordered' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <footer className={footerClass} {...props}>
      <div className="footer-container">
        {children}
      </div>
    </footer>
  );
};

export default Footer;