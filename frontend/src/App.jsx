import React from 'react';
import TroupeHeaderComponent from './components/headerandfooter/TroupeHeaderComponent';
import FooterComponent from './components/headerandfooter/FooterComponent';
import RefreshTestButton from './components/common/RefreshTestButton';
import ErrorBoundary from './components/common/ErrorBoundary';
import { RoleProvider } from './hooks/useMultiRoleAuth';
import { BrowserRouter as Router } from 'react-router-dom';
import RouteRenderer from './shared/routing/RouteRenderer';
import UnifiedThemeProvider from './shared/styles/StyledThemeProvider';
import { GlobalStyles } from './shared/styles/GlobalStyles';
import { appConfig } from './config';
import './App.css';

function App() {
  // Login function handler
  const handleLogin = (isLoggedIn) => {
    alert(`User ${isLoggedIn ? 'logged in' : 'logged out'}`);
  };

  return (
    <UnifiedThemeProvider>
      <GlobalStyles />
      <Router>
        <div className="app">
          <ErrorBoundary>
            <RoleProvider>
              <TroupeHeaderComponent
                mainText={appConfig.troupeHeader.mainText}
                textPortion={appConfig.troupeHeader.textPortion}
                loginFunction={handleLogin}
                imageLink={appConfig.troupeHeader.imageLink}
                headerMenuDictionary={appConfig.troupeHeader.headerMenuDictionary}
              />

              {/* Lazy-loaded routes with error boundaries and guards */}
              <RouteRenderer />

              <FooterComponent
                listOfText={appConfig.footer.listOfText}
                dictionaryOfSocialMediaLogosAndLinks={appConfig.footer.dictionaryOfSocialMediaLogosAndLinks}
                copyRightText={appConfig.footer.copyRightText}
                anotherStatement={appConfig.footer.anotherStatement}
              />
            </RoleProvider>
          </ErrorBoundary>

          {/* Test component for hybrid refresh system (development only) */}
          {process.env.NODE_ENV === 'development' && <RefreshTestButton />}
        </div>
      </Router>
    </UnifiedThemeProvider>
  );
}

export default App;