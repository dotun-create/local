/**
 * Theme Settings Component
 * Advanced theme configuration panel with accessibility options
 */

import React, { useState } from 'react';
import { useThemeMode } from '../../hooks/useThemeMode';
import {
  SettingsContainer,
  SettingsSection,
  SettingsTitle,
  SettingsDescription,
  OptionGroup,
  OptionButton,
  ToggleSwitch,
  PreviewCard,
  AccessibilityInfo
} from './ThemeSettings.styled';

const ThemeSettings = ({
  showAdvanced = true,
  showPreview = true,
  className = ''
}) => {
  const {
    themeName,
    availableThemes,
    setTheme,
    isSystemTheme,
    useSystemTheme,
    prefersHighContrast,
    prefersReducedMotion,
    getContrastRatio,
    theme
  } = useThemeMode();

  const [showAccessibilityInfo, setShowAccessibilityInfo] = useState(false);

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      description: 'Clean, bright interface',
      preview: {
        background: '#ffffff',
        text: '#1a1a1a',
        accent: '#0066cc'
      }
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Easy on the eyes',
      preview: {
        background: '#1a1a1a',
        text: '#ffffff',
        accent: '#4d9aff'
      }
    },
    {
      value: 'system',
      label: 'Auto',
      description: 'Matches your system preference',
      preview: {
        background: 'linear-gradient(45deg, #ffffff 50%, #1a1a1a 50%)',
        text: '#666666',
        accent: '#0066cc'
      }
    }
  ];

  const highContrastEnabled = prefersHighContrast();
  const reducedMotionEnabled = prefersReducedMotion();

  const handleThemeChange = (themeValue) => {
    if (themeValue === 'system') {
      useSystemTheme();
    } else {
      setTheme(themeValue);
    }
  };

  const getAccessibilityScore = () => {
    if (!theme?.colors) return 'Unknown';

    const bgColor = theme.colors.background?.primary || '#ffffff';
    const textColor = theme.colors.text?.primary || '#000000';
    const ratio = getContrastRatio(bgColor, textColor);

    if (ratio >= 7) return 'AAA (Excellent)';
    if (ratio >= 4.5) return 'AA (Good)';
    if (ratio >= 3) return 'A (Acceptable)';
    return 'Poor';
  };

  return (
    <SettingsContainer className={className}>
      {/* Theme Selection */}
      <SettingsSection>
        <SettingsTitle>Appearance</SettingsTitle>
        <SettingsDescription>
          Choose how the interface looks and feels
        </SettingsDescription>

        <OptionGroup>
          {themeOptions.map((option) => (
            <OptionButton
              key={option.value}
              isSelected={themeName === option.value}
              onClick={() => handleThemeChange(option.value)}
              aria-pressed={themeName === option.value}
            >
              {showPreview && (
                <PreviewCard
                  background={option.preview.background}
                  textColor={option.preview.text}
                  accentColor={option.preview.accent}
                >
                  <div className="preview-text">Aa</div>
                  <div className="preview-accent"></div>
                </PreviewCard>
              )}
              <div className="option-content">
                <div className="option-label">{option.label}</div>
                <div className="option-description">{option.description}</div>
              </div>
            </OptionButton>
          ))}
        </OptionGroup>
      </SettingsSection>

      {/* Advanced Settings */}
      {showAdvanced && (
        <SettingsSection>
          <SettingsTitle>Advanced</SettingsTitle>

          {/* High Contrast Option */}
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">High Contrast</div>
              <div className="setting-description">
                Increase contrast for better visibility
              </div>
            </div>
            <ToggleSwitch
              checked={highContrastEnabled}
              disabled={true}
              title="Controlled by system settings"
            >
              <span className="toggle-track">
                <span className="toggle-thumb"></span>
              </span>
            </ToggleSwitch>
          </div>

          {/* Reduced Motion Option */}
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Reduced Motion</div>
              <div className="setting-description">
                Minimize animations and transitions
              </div>
            </div>
            <ToggleSwitch
              checked={reducedMotionEnabled}
              disabled={true}
              title="Controlled by system settings"
            >
              <span className="toggle-track">
                <span className="toggle-thumb"></span>
              </span>
            </ToggleSwitch>
          </div>
        </SettingsSection>
      )}

      {/* Accessibility Information */}
      <SettingsSection>
        <SettingsTitle>
          Accessibility
          <button
            className="info-toggle"
            onClick={() => setShowAccessibilityInfo(!showAccessibilityInfo)}
            aria-expanded={showAccessibilityInfo}
          >
            ℹ
          </button>
        </SettingsTitle>

        {showAccessibilityInfo && (
          <AccessibilityInfo>
            <div className="accessibility-item">
              <span className="accessibility-label">Contrast Ratio:</span>
              <span className="accessibility-value">{getAccessibilityScore()}</span>
            </div>
            <div className="accessibility-item">
              <span className="accessibility-label">High Contrast:</span>
              <span className="accessibility-value">
                {highContrastEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="accessibility-item">
              <span className="accessibility-label">Reduced Motion:</span>
              <span className="accessibility-value">
                {reducedMotionEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="accessibility-note">
              These settings help ensure the interface is accessible to users with visual impairments or motion sensitivity.
            </div>
          </AccessibilityInfo>
        )}
      </SettingsSection>

      {/* Current Theme Info */}
      {isSystemTheme && (
        <SettingsSection>
          <div className="system-info">
            <strong>System Theme Active</strong>
            <p>The appearance automatically switches based on your system's dark/light mode setting.</p>
          </div>
        </SettingsSection>
      )}
    </SettingsContainer>
  );
};

export default ThemeSettings;