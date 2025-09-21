import React, { useState } from 'react';
import { Modal, Form, FormField, Button } from '@shared';
import { useAuth } from '../hooks/useAuth';
import { validateEmail } from '@shared/utils/validators';

const PasswordResetModal = ({ isOpen, onClose, onSubmit }) => {
  const { requestPasswordReset, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');

      // Try custom onSubmit first, fallback to auth service
      if (onSubmit) {
        await onSubmit(email);
      } else {
        await requestPasswordReset(email);
      }

      setSuccessMessage('Password reset instructions have been sent to your email address.');
      setIsSubmitted(true);

      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (error) {
      console.error('Password reset request failed:', error);
      setError(error.message || 'Failed to send password reset email. Please try again.');
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccessMessage('');
    setIsSubmitted(false);
    onClose();
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset Password"
      size="small"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div style={{ padding: '0' }}>
        {!isSubmitted ? (
          <>
            <p style={{
              marginBottom: '1.5rem',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              Enter your email address and we'll send you instructions to reset your password.
            </p>

            {error && (
              <div style={{
                backgroundColor: 'var(--color-state-error-background)',
                color: 'var(--color-state-error)',
                border: '1px solid var(--color-state-error-border)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            <Form onSubmit={handleSubmit}>
              <FormField
                type="email"
                name="email"
                label="Email Address"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter your email address"
                required
                autoComplete="email"
                autoFocus
              />

              <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1.5rem',
                justifyContent: 'flex-end'
              }}>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading || !email.trim()}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </div>
            </Form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              backgroundColor: 'var(--color-state-success-background)',
              color: 'var(--color-state-success)',
              border: '1px solid var(--color-state-success-border)',
              padding: '1rem',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <strong>Email Sent!</strong>
            </div>

            <p style={{
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5',
              marginBottom: '1.5rem'
            }}>
              Check your email for password reset instructions.
              If you don't see it, check your spam folder.
            </p>

            <Button
              type="button"
              variant="primary"
              onClick={handleClose}
              fullWidth
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PasswordResetModal;