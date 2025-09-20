import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../services/api';
import './css/PasswordResetPage.css';
import logo from '../../resources/images/logo.jpeg';

const PasswordResetPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid reset link. Please request a new password reset.');
        setTokenLoading(false);
        return;
      }

      try {
        const response = await API.auth.verifyResetToken(token);
        setTokenValid(true);
        setUserEmail(response.email);
      } catch (err) {
        setError('This reset link has expired or is invalid. Please request a new password reset.');
        setTokenValid(false);
      } finally {
        setTokenLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors when user starts typing
    if (error) setError('');
    if (message) setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await API.auth.resetPassword(token, formData.password);
      setSuccess(true);
      setMessage('Your password has been reset successfully! You can now sign in with your new password.');
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (tokenLoading) {
    return (
      <div className="password-reset-page">
        <div className="reset-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="password-reset-page">
        <div className="reset-container">
          <div className="reset-header">
            <img src={logo} alt="Tutor Academy" className="logo" />
            <h2>Invalid Reset Link</h2>
          </div>
          
          <div className="error-content">
            <div className="error-icon">❌</div>
            <p className="error-message">{error}</p>
            <button className="back-button" onClick={handleBackToLogin}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="password-reset-page">
        <div className="reset-container">
          <div className="reset-header">
            <img src={logo} alt="Tutor Academy" className="logo" />
            <h2>Password Reset Complete</h2>
          </div>
          
          <div className="success-content">
            <div className="success-icon">✅</div>
            <p className="success-message">{message}</p>
            <p className="redirect-notice">Redirecting you to login page in 3 seconds...</p>
            <button className="login-button" onClick={handleBackToLogin}>
              Go to Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset-page">
      <div className="reset-container">
        <div className="reset-header">
          <img src={logo} alt="Tutor Academy" className="logo" />
          <h2>Reset Your Password</h2>
          <p className="reset-subtitle">Enter your new password for {userEmail}</p>
        </div>

        <form onSubmit={handleSubmit} className="reset-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your new password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your new password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleBackToLogin}
              disabled={loading}
            >
              Back to Login
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading || !formData.password || !formData.confirmPassword}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetPage;