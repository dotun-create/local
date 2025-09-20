import React from 'react';
import LoginBar from '../loginandSignup/LoginBar';
import HeaderMenu from './HeaderMenu';
import './css/TroupeHeaderComponent.css';

const TroupeHeaderComponent = ({ 
  mainText, 
  textPortion, 
  loginFunction, 
  imageLink, 
  headerMenuDictionary 
}) => {
  return (
    <div className="troupe-header">
      {/* First Row: 90% mainText + textPortion | 10% LoginBar */}
      <div className="header-row-1">
        <div className="main-text-column">
          <h1 className="main-text">
            {mainText}
            <sub className="text-portion">{textPortion}</sub>
          </h1>
        </div>
        <div className="login-column">
          <LoginBar loginFunction={loginFunction} />
        </div>
      </div>
      
      {/* Second Row: Centered Image with border */}
      <div className="header-row-2">
        <div className="image-column">
          <img src={imageLink} alt="Troupe Logo" className="header-image" />
        </div>
      </div>
      
      {/* Third Row: HeaderMenu */}
      <div className="header-row-3">
        <HeaderMenu menuLinks={headerMenuDictionary} />
      </div>
    </div>
  );
};

export default TroupeHeaderComponent;