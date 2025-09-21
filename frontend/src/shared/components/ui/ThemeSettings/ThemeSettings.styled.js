/**
 * Theme Settings Styled Components
 * Styled components for theme configuration interface
 */

import styled, { css } from 'styled-components';
import { media } from '../../../styles/responsive';

export const SettingsContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing['6']};
`;

export const SettingsSection = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing['8']};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const SettingsTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing['2']} 0;

  .info-toggle {
    width: 24px;
    height: 24px;
    border: 1px solid ${({ theme }) => theme.colors.border.secondary};
    border-radius: ${({ theme }) => theme.borderRadius.full};
    background: ${({ theme }) => theme.colors.surface.secondary};
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 14px;
    cursor: pointer;
    transition: all ${({ theme }) => theme.transitions.duration.fast} ease;

    &:hover {
      background: ${({ theme }) => theme.colors.surface.tertiary};
      border-color: ${({ theme }) => theme.colors.border.primary};
    }

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.border.focus};
      box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.border.focus}20;
    }
  }
`;

export const SettingsDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing['4']} 0;
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
`;

export const OptionGroup = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing['3']};
  grid-template-columns: 1fr;

  ${media.sm(css`
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  `)}
`;

export const OptionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['3']};
  padding: ${({ theme }) => theme.spacing['4']};
  border: 2px solid ${({ theme, isSelected }) =>
    isSelected ? theme.colors.border.focus : theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface.primary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.duration.normal} ease;
  text-align: center;
  position: relative;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.secondary};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.boxShadow.md};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.border.focus}20;
  }

  &:active {
    transform: translateY(0);
  }

  ${({ isSelected, theme }) =>
    isSelected &&
    css`
      background: ${theme.colors.interactive.primary}10;
      border-color: ${theme.colors.interactive.primary};

      &::after {
        content: '✓';
        position: absolute;
        top: ${theme.spacing['2']};
        right: ${theme.spacing['2']};
        width: 20px;
        height: 20px;
        border-radius: ${theme.borderRadius.full};
        background: ${theme.colors.interactive.primary};
        color: white;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
    `}

  .option-content {
    width: 100%;
  }

  .option-label {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: ${({ theme }) => theme.spacing['1']};
  }

  .option-description {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
    line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  }

  ${media.maxSm(css`
    flex-direction: row;
    text-align: left;

    .option-content {
      flex: 1;
    }
  `)}
`;

export const PreviewCard = styled.div`
  width: 80px;
  height: 50px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ background }) => background};
  color: ${({ textColor }) => textColor};
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  display: flex;
  align-items: center;
  justify-content: center;

  .preview-text {
    font-size: 18px;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .preview-accent {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 12px;
    height: 12px;
    border-radius: ${({ theme }) => theme.borderRadius.sm};
    background: ${({ accentColor }) => accentColor};
  }

  ${media.maxSm(css`
    width: 60px;
    height: 40px;
    flex-shrink: 0;

    .preview-text {
      font-size: 14px;
    }

    .preview-accent {
      width: 8px;
      height: 8px;
    }
  `)}
`;

export const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.6 : 1};

  .toggle-track {
    display: block;
    width: 48px;
    height: 24px;
    background: ${({ theme, checked }) =>
      checked ? theme.colors.interactive.primary : theme.colors.surface.tertiary};
    border-radius: ${({ theme }) => theme.borderRadius.full};
    transition: background-color ${({ theme }) => theme.transitions.duration.normal} ease;
    position: relative;
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: ${({ checked }) => checked ? '26px' : '2px'};
    width: 20px;
    height: 20px;
    background: white;
    border-radius: ${({ theme }) => theme.borderRadius.full};
    transition: left ${({ theme }) => theme.transitions.duration.normal} ease;
    box-shadow: ${({ theme }) => theme.boxShadow.sm};
  }

  &:focus-within .toggle-track {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.border.focus}20;
  }
`;

export const AccessibilityInfo = styled.div`
  padding: ${({ theme }) => theme.spacing['4']};
  background: ${({ theme }) => theme.colors.surface.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};

  .accessibility-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${({ theme }) => theme.spacing['2']} 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};

    &:last-of-type {
      border-bottom: none;
    }
  }

  .accessibility-label {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .accessibility-value {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .accessibility-note {
    margin-top: ${({ theme }) => theme.spacing['3']};
    padding-top: ${({ theme }) => theme.spacing['3']};
    border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.colors.text.tertiary};
    line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  }
`;

// Setting item styles for advanced settings
export const SettingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing['3']} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};

  &:last-child {
    border-bottom: none;
  }

  .setting-info {
    flex: 1;
  }

  .setting-label {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: ${({ theme }) => theme.spacing['1']};
  }

  .setting-description {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
    line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({ theme }) => theme.spacing['3']} 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};

    &:last-child {
      border-bottom: none;
    }
  }

  .system-info {
    padding: ${({ theme }) => theme.spacing['4']};
    background: ${({ theme }) => theme.colors.surface.secondary};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    border: 1px solid ${({ theme }) => theme.colors.border.primary};

    strong {
      color: ${({ theme }) => theme.colors.text.primary};
      display: block;
      margin-bottom: ${({ theme }) => theme.spacing['1']};
    }

    p {
      margin: 0;
      font-size: ${({ theme }) => theme.typography.fontSize.sm};
      color: ${({ theme }) => theme.colors.text.secondary};
      line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
    }
  }
`;

export default {
  SettingsContainer,
  SettingsSection,
  SettingsTitle,
  SettingsDescription,
  OptionGroup,
  OptionButton,
  ToggleSwitch,
  PreviewCard,
  AccessibilityInfo,
  SettingItem
};