import React, { useState } from 'react';
import { Form, FormField, Button, LoadingSpinner, Modal } from '@shared';
import { useAuth } from '../hooks/useAuth';
import { validateEmail, validatePassword } from '@shared/utils/validators';
import PasswordResetModal from './PasswordResetModal';
import './LoginForm.css';

const LoginForm = ({
  onLoginSuccess,
  onClose,
  onSwitchToSignup,
  isModal = false
}) => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear errors and messages when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }

    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSuccessMessage('');
      setErrorMessage('');
      setErrors({});

      const response = await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe
      });

      const userName = response.user.profile?.name || response.user.email.split('@')[0];
      const accountType = response.user.accountType.charAt(0).toUpperCase() + response.user.accountType.slice(1);
      setSuccessMessage(`✅ Sign in successful! Welcome back, ${userName} (${accountType})`);

      if (onLoginSuccess) {
        onLoginSuccess({ ...formData, user: response.user });
      }

      if (onClose && isModal) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }

    } catch (error) {
      console.error('Login failed:', error);
      setErrorMessage('❌ Sign in failed. Please check your username and password and try again.');
      setErrors({});
    }
  };

  const handleSocialLogin = (provider) => {
    console.log(`${provider} login clicked`);
    // TODO: Implement social login
    alert(`${provider} login integration would go here`);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowPasswordReset(true);
  };

  const handlePasswordResetSubmit = async (email) => {
    try {
      // TODO: Implement password reset API call
      console.log('Password reset requested for:', email);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const form = (
    <div className="login-form-container">
      <div className="login-header">
        <h1 className="login-title">Sign In to Your Account</h1>
        <p className="login-subtitle">Welcome back</p>
      </div>

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

      <Form onSubmit={handleSubmit} className="login-form">
        <FormField
          type="email"
          name="email"
          label="Email Address"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          placeholder="Enter your email address"
          required
          autoComplete="email"
        />

        <FormField
          type={showPassword ? 'text' : 'password'}
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleInputChange}
          error={errors.password}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
          endIcon={
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          }
        />

        <div className="form-options">
          <FormField
            type="checkbox"
            name="rememberMe"
            label="Remember me"
            checked={formData.rememberMe}
            onChange={handleInputChange}
          />
          <button
            type="button"
            className="forgot-password-link"
            onClick={handleForgotPassword}
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Signing in...' : successMessage ? 'Redirecting...' : 'Sign in'}
        </Button>

        <div className="social-login">
          <div className="divider">
            <span>or sign in with</span>
          </div>
          <div className="social-buttons">
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => handleSocialLogin('Google')}
              disabled={loading}
            >
              <span className="social-icon">G</span>
              Google
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => handleSocialLogin('Apple')}
              disabled={loading}
            >
              <span className="social-icon">🍎</span>
              Apple
            </Button>
          </div>
        </div>

        {onSwitchToSignup && (
          <div className="signup-link">
            Don't have an account?{' '}
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToSignup}
            >
              Sign up
            </button>
          </div>
        )}
      </Form>

      <PasswordResetModal
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        onSubmit={handlePasswordResetSubmit}
      />
    </div>
  );

  if (isModal) {
    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Sign In"
        size="medium"
        closeOnOverlayClick={!loading}
        closeOnEscape={!loading}
      >
        {form}
      </Modal>
    );
  }

  return form;
};

export default LoginForm;