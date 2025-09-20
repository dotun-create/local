import React, { useState } from 'react';
import './css/PasswordResetModal.css';

const PasswordResetModal = ({ isOpen, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'success'

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await onSubmit(email);
      setStep('success');
      setMessage('Password reset email sent! Please check your inbox and follow the instructions.');
    } catch (err) {
      setError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setMessage('');
    setStep('email');
    setLoading(false);
    onClose();
  };

  const handleInputChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="password-reset-modal-overlay" onClick={handleClose}>
      <div className="password-reset-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Reset Password</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          {step === 'email' ? (
            <>
              <p className="modal-description">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="reset-email">Email Address</label>
                  <input
                    type="email"
                    id="reset-email"
                    value={email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={handleClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={loading || !email.trim()}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="success-icon">✅</div>
              <p className="success-message">{message}</p>
              <p className="success-description">
                If an account with that email exists, you'll receive password reset instructions within a few minutes.
              </p>
              
              <div className="modal-actions">
                <button
                  type="button"
                  className="submit-button"
                  onClick={handleClose}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordResetModal;