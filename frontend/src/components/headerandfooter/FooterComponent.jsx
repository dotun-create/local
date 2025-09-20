import React from 'react';
import './css/FooterComponent.css';

const FooterComponent = ({ 
  listOfText, 
  dictionaryOfSocialMediaLogosAndLinks, 
  copyRightText, 
  anotherStatement 
}) => {
  return (
    <footer className="footer-component">
      {/* Text rows */}
      {listOfText && listOfText.map((text, index) => (
        <div key={index} className="footer-text-row">
          <p className="footer-text">{text}</p>
        </div>
      ))}
      
      {/* Social media icons row */}
      <div className="footer-social-row">
        <div className="social-icons-container">
          {dictionaryOfSocialMediaLogosAndLinks && 
            Object.entries(dictionaryOfSocialMediaLogosAndLinks).map(([logo, link]) => (
              <a 
                key={link} 
                href={link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-icon-link"
              >
                <img 
                  src={logo} 
                  alt="Social Media" 
                  className="social-icon"
                />
              </a>
            ))
          }
        </div>
      </div>
      
      {/* Copyright row */}
      <div className="footer-copyright-row">
        <p className="footer-copyright">{copyRightText}</p>
      </div>
      
      {/* Another statement row */}
      <div className="footer-statement-row">
        <p className="footer-statement">{anotherStatement}</p>
      </div>
    </footer>
  );
};

export default FooterComponent;