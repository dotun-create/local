import React, { useState } from 'react';
import { useAuth } from '../../hooks/useData';
import './css/LoginComponent.css';
import logo from '../../resources/images/logo.jpeg';
import { appConfig } from '../../config';
import PasswordResetModal from './PasswordResetModal';
import API from '../../services/api';

const LoginComponent = ({ onLoginSubmit, onClose, onSwitchToSignup }) => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear validation errors and messages when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
    
    // Clear success and error messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = {};
    
    // Validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // Clear any previous messages
      setSuccessMessage('');
      setErrorMessage('');
      setValidationErrors({});
      
      // Authenticate user with remote API
      const response = await login({
        email: formData.email,
        password: formData.password
      });
      
      
      // Show success message
      const userName = response.user.profile?.name || response.user.email.split('@')[0];
      const accountType = response.user.accountType.charAt(0).toUpperCase() + response.user.accountType.slice(1);
      setSuccessMessage(`✅ Sign in successful! Welcome back, ${userName} (${accountType})`);
      
      // Call the parent handler with login data - LoginPage will handle navigation
      if (onLoginSubmit) {
        onLoginSubmit({ ...formData, user: response.user });
      }
      
      // Close modal if it's open (for modal mode)
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1500); // Delay to show success message
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      
      // Show error message
      setErrorMessage('❌ Sign in failed. Please check your username and password and try again.');
      
      // Clear form validation errors to avoid duplicating error display
      setValidationErrors({});
    }
  };

  const handleSocialLogin = (provider) => {
    console.log(`${provider} login clicked`);
    alert(`${provider} login integration would go here`);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowPasswordReset(true);
  };

  const handlePasswordResetSubmit = async (email) => {
    try {
      await API.auth.requestPasswordReset(email);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const handlePasswordResetClose = () => {
    setShowPasswordReset(false);
  };
  

  return (
    <div className={`login-container ${onClose ? 'modal-mode' : ''}`}>
      {/* Left Side - Form */}
      <div className="login-form-section">
        <div className="login-form-wrapper">
          {/* Header */}
          <div className="login-header">
            <div className="brand-logo">
              <img src={logo} alt="Troupe Academy" className="logo-icon" />
              <span className="brand-name">Troupe Academy</span>
            </div>
            {onClose && (
              <button className="close-btn" onClick={onClose} type="button">
                ×
              </button>
            )}
          </div>

          {/* Form Content */}
          <div className="login-content">
            <div className="login-title">
              <p className="welcome-text">Welcome back</p>
              <h1>Sign In to Your Account</h1>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
              <div className="message success-message">
                {successMessage}
              </div>
            )}
            
            {errorMessage && (
              <div className="message error-message">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {/* Email Field */}
              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email address"
                  className={validationErrors.email ? 'error' : ''}
                />
                {validationErrors.email && (
                  <div className="error-message">{validationErrors.email}</div>
                )}
              </div>

              {/* Password Field */}
              <div className="form-group">
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                    className={validationErrors.password ? 'error' : ''}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="password-toggle-icon">
                      {showPassword ? "🙈" : "👁️"}
                    </span>
                  </button>
                </div>
                {validationErrors.password && (
                  <div className="error-message">{validationErrors.password}</div>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <a href="#" className="forgot-password" onClick={handleForgotPassword}>Forgot password?</a>
              </div>

              {/* Submit Button */}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Signing in...' : successMessage ? 'Redirecting...' : 'Sign in'}
              </button>

              {/* Social Login */}
              <div className="social-login">
                <div className="divider">
                  <span>or sign in with</span>
                </div>
                <div className="social-buttons">
                  <button
                    type="button"
                    className="social-btn facebook"
                    onClick={() => handleSocialLogin('Facebook')}
                  >
                    <span className="social-icon">f</span>
                  </button>
                  <button
                    type="button"
                    className="social-btn google"
                    onClick={() => handleSocialLogin('Google')}
                  >
                    <span className="social-icon">G</span>
                  </button>
                  <button
                    type="button"
                    className="social-btn apple"
                    onClick={() => handleSocialLogin('Apple')}
                  >
                    <span className="social-icon">🍎</span>
                  </button>
                </div>
              </div>

              {/* Sign Up Link */}
              <div className="signup-link">
                Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); if (onSwitchToSignup) onSwitchToSignup(); }}>Sign up</a>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="login-image-section">
        <div className="image-overlay"></div>
      </div>

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={showPasswordReset}
        onClose={handlePasswordResetClose}
        onSubmit={handlePasswordResetSubmit}
      />
    </div>
  );
};

export default LoginComponent;