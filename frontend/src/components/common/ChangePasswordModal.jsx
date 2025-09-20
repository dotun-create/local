import { useState, useEffect } from 'react';
import './css/ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose, onSubmit, loading = false }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Clear form when modal opens
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
      setShowPasswords({
        current: false,
        new: false,
        confirm: false
      });
      
      // Additional timeout to clear any browser autofill
      const timeoutId = setTimeout(() => {
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-content change-password-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="change-password-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3 id="change-password-title">Change Password</h3>
          <button 
            className="close-modal" 
            onClick={handleClose}
            disabled={loading}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="change-password-form" autoComplete="off">
            {/* Hidden field to prevent browser autofill issues */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              style={{ display: 'none' }}
              tabIndex="-1"
              readOnly
            />
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="Enter your current password"
                  className={errors.currentPassword ? 'error' : ''}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('current')}
                  disabled={loading}
                >
                  {showPasswords.current ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.currentPassword && (
                <span className="error-message">{errors.currentPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="Enter your new password"
                  className={errors.newPassword ? 'error' : ''}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('new')}
                  disabled={loading}
                >
                  {showPasswords.new ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.newPassword && (
                <span className="error-message">{errors.newPassword}</span>
              )}
              <div className="password-requirements">
                <small>Password must be at least 8 characters and contain uppercase, lowercase, and number</small>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="Confirm your new password"
                  className={errors.confirmPassword ? 'error' : ''}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={loading}
                >
                  {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn secondary" 
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn primary"
                disabled={loading}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;