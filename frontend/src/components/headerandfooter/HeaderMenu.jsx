import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/HeaderMenu.css';

const HeaderMenu = ({ menuLinks }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // Get current user from session storage
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');

  // Enhanced My Troupe click handler with smart navigation
  const handleMyTroupeClick = (e) => {
    e.preventDefault(); // Prevent default link behavior
    setIsMenuOpen(false); // Close mobile menu
    
    try {
      // Check authentication status
      if (!currentUser || !currentUser.accountType) {
        console.log('User not authenticated, redirecting to login');
        navigate('/login');
        return;
      }
      
      // Navigate based on user account type
      const accountType = currentUser.accountType.toLowerCase();
      console.log('Navigating user with account type:', accountType);
      
      switch(accountType) {
        case 'student':
          navigate('/dashboard');
          break;
        case 'tutor':
          navigate('/tutor');
          break;
        case 'guardian':
          navigate('/guardian');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          // Fallback for unknown account types
          console.warn('Unknown account type:', accountType);
          // Redirect to login for security
          navigate('/login');
      }
    } catch (error) {
      console.error('Error during navigation:', error);
      // Fallback to login page on any error
      navigate('/login');
    }
  };

  // Get user-friendly text for My Troupe button
  const getMyTroupeText = () => {
    if (!currentUser || !currentUser.accountType) {
      return "My Troupe";
    }
    
    // Could customize text based on user type if desired
    // For now, keeping it consistent
    return "My Troupe";
  };

  // Create dynamic menu links based on user status
  const getDynamicMenuLinks = () => {
    const dynamicLinks = {};
    
    // Rebuild object in correct order, replacing "My Modules" with "My Troupe"
    Object.entries(menuLinks).forEach(([label, path]) => {
      if (label === "My Modules") {
        // Replace "My Modules" with "My Troupe" in the same position
        // Path will be handled by click handler, so we use a placeholder
        dynamicLinks[getMyTroupeText()] = '#';
      } else {
        // Keep other menu items as they are
        dynamicLinks[label] = path;
      }
    });
    
    return dynamicLinks;
  };

  const finalMenuLinks = getDynamicMenuLinks();

  return (
    <nav className="header-menu">
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
        <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
        <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
      </button>
      <div className={`menu-container ${isMenuOpen ? 'mobile-open' : ''}`}>
        {Object.entries(finalMenuLinks).map(([label, path]) => {
          if (label === "My Troupe") {
            return (
              <button
                key={label}
                className="menu-link menu-button"
                onClick={handleMyTroupeClick}
                aria-label="Navigate to your dashboard"
              >
                {label}
              </button>
            );
          }
          
          return (
            <Link 
              key={label} 
              to={path} 
              className="menu-link"
              onClick={() => setIsMenuOpen(false)}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default HeaderMenu;