/**
 * Theme Toggle Component
 * Allows users to switch between light and dark themes
 */

import React from 'react';
import { useStore } from '../../store';
import { useTheme } from '../../theme/ThemeProvider';
import {
  ToggleButton,
  ToggleIcon,
  ToggleLabel,
  DropdownMenu,
  DropdownItem,
  ToggleWrapper
} from './ThemeToggle.styled';

// Icons (you can replace with your preferred icon library)
const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-10c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0-4c.6 0 1-.4 1-1V1c0-.6-.4-1-1-1s-1 .4-1 1v2c0 .6.4 1 1 1zm0 20c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1s1-.4 1-1v-2c0-.6-.4-1-1-1zM5.6 6.6c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4L5.6 3.8c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4L5.6 6.6zm12.8 12.8c-.4-.4-1-.4-1.4 0-.4.4-.4 1 0 1.4l1.4 1.4c.4.4 1 .4 1.4 0s.4-1 0-1.4l-1.4-1.4zM3 13H1c-.6 0-1-.4-1-1s.4-1 1-1h2c.6 0 1 .4 1 1s-.4 1-1 1zm20 0h-2c-.6 0-1-.4-1-1s.4-1 1-1h2c.6 0 1 .4 1 1s-.4 1-1 1zM5.6 18.4c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4l1.4 1.4c.4.4 1 .4 1.4 0s.4-1 0-1.4L5.6 18.4zm12.8-12.8c.4.4 1 .4 1.4 0s.4-1 0-1.4L18.4 2.8c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4l1.4 1.4z"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.64 13a1 1 0 0 0-1.05-.14 8.05 8.05 0 0 1-3.37.73 8.15 8.15 0 0 1-8.14-8.1 8.59 8.59 0 0 1 .25-2A1 1 0 0 0 8 2.36a10.14 10.14 0 1 0 14 11.69 1 1 0 0 0-.36-1.05zm-9.5 6.69A8.14 8.14 0 0 1 7.08 5.22v.27a10.15 10.15 0 0 0 10.14 10.14 9.79 9.79 0 0 0 2.1-.22 8.11 8.11 0 0 1-7.18 4.32z"/>
  </svg>
);

const SystemIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20,18C20.5,18 21,17.5 21,17V7C21,6.5 20.5,6 20,6H4C3.5,6 3,6.5 3,7V17C3,17.5 3.5,18 4,18H9V19H8V20H16V19H15V18H20M4,7H20V17H4V7Z"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
  </svg>
);

const ThemeToggle = ({
  variant = 'button', // 'button', 'dropdown', 'simple'
  showLabel = false,
  size = 'md',
  className = ''
}) => {
  const { theme: currentTheme, toggleTheme, setTheme } = useTheme();
  const zustandTheme = useStore((state) => state.app.theme);
  const setZustandTheme = useStore((state) => state.app.actions.setTheme);

  const [showDropdown, setShowDropdown] = React.useState(false);

  // Sync themes between providers
  React.useEffect(() => {
    if (currentTheme?.name !== zustandTheme) {
      setZustandTheme(currentTheme?.name || 'light');
    }
  }, [currentTheme, zustandTheme, setZustandTheme]);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: <SunIcon /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
    { value: 'system', label: 'System', icon: <SystemIcon /> }
  ];

  const currentOption = themeOptions.find(option => option.value === currentTheme?.name) || themeOptions[0];

  const handleThemeChange = (themeName) => {
    setTheme(themeName);
    setShowDropdown(false);
  };

  const handleToggle = () => {
    if (variant === 'simple') {
      toggleTheme();
    } else {
      setShowDropdown(!showDropdown);
    }
  };

  const handleOutsideClick = React.useCallback((event) => {
    if (!event.target.closest('[data-theme-toggle]')) {
      setShowDropdown(false);
    }
  }, []);

  React.useEffect(() => {
    if (showDropdown) {
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }
  }, [showDropdown, handleOutsideClick]);

  if (variant === 'simple') {
    return (
      <ToggleButton
        onClick={handleToggle}
        size={size}
        className={className}
        data-theme-toggle
        aria-label={`Switch to ${currentTheme?.name === 'light' ? 'dark' : 'light'} mode`}
      >
        <ToggleIcon>
          {currentTheme?.name === 'light' ? <MoonIcon /> : <SunIcon />}
        </ToggleIcon>
        {showLabel && (
          <ToggleLabel>
            {currentTheme?.name === 'light' ? 'Dark' : 'Light'}
          </ToggleLabel>
        )}
      </ToggleButton>
    );
  }

  return (
    <ToggleWrapper className={className} data-theme-toggle>
      <ToggleButton
        onClick={handleToggle}
        size={size}
        variant={variant}
        isOpen={showDropdown}
        aria-label="Choose theme"
        aria-expanded={showDropdown}
      >
        <ToggleIcon>
          {currentOption.icon}
        </ToggleIcon>
        {showLabel && (
          <ToggleLabel>
            {currentOption.label}
          </ToggleLabel>
        )}
        {variant === 'dropdown' && (
          <ChevronDownIcon />
        )}
      </ToggleButton>

      {variant === 'dropdown' && showDropdown && (
        <DropdownMenu role="menu">
          {themeOptions.map((option) => (
            <DropdownItem
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              isSelected={currentOption.value === option.value}
              role="menuitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleThemeChange(option.value);
                }
              }}
            >
              <ToggleIcon>
                {option.icon}
              </ToggleIcon>
              <ToggleLabel>
                {option.label}
              </ToggleLabel>
            </DropdownItem>
          ))}
        </DropdownMenu>
      )}
    </ToggleWrapper>
  );
};

export default ThemeToggle;