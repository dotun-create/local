import React, { useState, useRef } from 'react';
import { Form, FormField, Button, Select, Modal } from '@shared';
import { useAuth } from '../hooks/useAuth';
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateRequired
} from '@shared/utils/validators';
import './SignupForm.css';

const SignupForm = ({
  onSignupSuccess,
  onClose,
  onSwitchToLogin,
  isModal = false,
  defaultAccountType = 'Student'
}) => {
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    userType: defaultAccountType,
    image: null,
    firstName: '',
    lastName: '',
    bio: '',
    username: '',
    email: '',
    guardianFirstName: '',
    guardianLastName: '',
    guardianEmail: '',
    password: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    paymentMethods: []
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usingDefaultAvatar, setUsingDefaultAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Country options
  const countryOptions = [
    { value: '', label: 'Select Country' },
    { value: 'US', label: 'United States' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'Nigeria', label: 'Nigeria' },
    { value: 'Canada', label: 'Canada' }
  ];

  // Payment method options
  const paymentMethodOptions = [
    { value: 'Stripe', label: '💳 Stripe' },
    { value: 'PayPal', label: '🅿️ PayPal' },
    { value: 'Apple Pay', label: '🍎 Apple Pay' },
    { value: 'Google Pay', label: '🅶 Google Pay' },
    { value: 'Bank Transfer', label: '🏦 Bank Transfer' }
  ];

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

  const handleUserTypeChange = (userType) => {
    setFormData(prev => ({
      ...prev,
      userType,
      // Clear guardian fields when switching away from Student
      ...(userType !== 'Student' && {
        guardianFirstName: '',
        guardianLastName: '',
        guardianEmail: ''
      }),
      // Clear payment methods when switching away from Guardian
      ...(userType !== 'Guardian' && {
        paymentMethods: []
      })
    }));

    // Clear related validation errors
    const newErrors = { ...errors };
    if (userType !== 'Student') {
      delete newErrors.guardianFirstName;
      delete newErrors.guardianLastName;
      delete newErrors.guardianEmail;
    }
    setErrors(newErrors);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const maxSize = 1 * 1024 * 1024; // 1MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        image: 'Image size must be less than 1MB'
      }));
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        image: 'Please upload a valid image file (JPEG, PNG, GIF)'
      }));
      return;
    }

    // Clear image error
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.image;
      return newErrors;
    });

    setUsingDefaultAvatar(false);
    setFormData(prev => ({
      ...prev,
      image: file
    }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
    setUsingDefaultAvatar(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields for all user types
    const requiredFields = [
      'firstName', 'lastName', 'username', 'email', 'password',
      'phone', 'street', 'city', 'state', 'zipCode', 'country'
    ];

    // Add guardian fields if user is Student
    if (formData.userType === 'Student') {
      requiredFields.push('guardianFirstName', 'guardianLastName');
    }

    // Check required fields
    requiredFields.forEach(field => {
      if (!validateRequired(formData[field])) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    // Validate specific field formats
    if (formData.firstName && !validateName(formData.firstName, 2, 50)) {
      newErrors.firstName = 'First name must be 2-50 characters and contain only letters';
    }

    if (formData.lastName && !validateName(formData.lastName, 2, 50)) {
      newErrors.lastName = 'Last name must be 2-50 characters and contain only letters';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.password && !validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.guardianEmail && !validateEmail(formData.guardianEmail)) {
      newErrors.guardianEmail = 'Please enter a valid guardian email address';
    }

    if (formData.userType === 'Student') {
      if (formData.guardianFirstName && !validateName(formData.guardianFirstName, 2, 50)) {
        newErrors.guardianFirstName = 'Guardian first name must be 2-50 characters and contain only letters';
      }
      if (formData.guardianLastName && !validateName(formData.guardianLastName, 2, 50)) {
        newErrors.guardianLastName = 'Guardian last name must be 2-50 characters and contain only letters';
      }
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

      const submissionData = {
        ...formData,
        phone: formData.phone.replace(/[\s\-\(\)]/g, ''), // Clean phone number
        ...(formData.image && { imageFile: formData.image })
      };

      const response = await register(submissionData);

      setSuccessMessage('✅ Account created successfully! Please check your email for verification.');

      if (onSignupSuccess) {
        onSignupSuccess({ ...submissionData, user: response.user });
      }

      if (onClose && isModal) {
        setTimeout(() => {
          onClose();
        }, 2000);
      }

    } catch (error) {
      console.error('Signup failed:', error);
      setErrorMessage('❌ Sign up failed. Please check your information and try again.');
      setErrors({});
    }
  };

  const renderUserTypeSelector = () => (
    <div className="form-group">
      <label>Account Type</label>
      <div className="user-type-toggle">
        {['Student', 'Guardian', 'Tutor'].map(type => (
          <button
            key={type}
            type="button"
            className={`toggle-btn ${formData.userType === type ? 'active' : ''}`}
            onClick={() => handleUserTypeChange(type)}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );

  const renderImageUpload = () => (
    <div className="form-group">
      <label>Profile Picture (Optional)</label>
      <div className="image-upload-section">
        {imagePreview ? (
          <div className="image-preview">
            <img src={imagePreview} alt="Profile preview" />
            <div className="image-actions">
              <Button
                type="button"
                variant="outline-danger"
                size="small"
                onClick={removeImage}
              >
                Remove
              </Button>
              {usingDefaultAvatar && (
                <span className="default-avatar-badge">
                  Default {formData.userType} Avatar
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="image-upload-placeholder">
            <div className="upload-icon">📷</div>
            <p>Upload a profile picture</p>
            <small>Max size: 1MB • JPG, PNG, GIF</small>
            <Button
              type="button"
              variant="outline-primary"
              size="small"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose File
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        {errors.image && (
          <div className="error-message">{errors.image}</div>
        )}
      </div>
    </div>
  );

  const form = (
    <div className="signup-form-container">
      <div className="signup-header">
        <h1 className="signup-title">Create Your Account</h1>
        <p className="signup-subtitle">Start your journey</p>
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

      <Form onSubmit={handleSubmit} className="signup-form">
        {renderUserTypeSelector()}
        {renderImageUpload()}

        <div className="form-row">
          <FormField
            type="text"
            name="firstName"
            label="First Name"
            value={formData.firstName}
            onChange={handleInputChange}
            error={errors.firstName}
            placeholder="Enter your first name"
            required
          />

          <FormField
            type="text"
            name="lastName"
            label="Last Name"
            value={formData.lastName}
            onChange={handleInputChange}
            error={errors.lastName}
            placeholder="Enter your last name"
            required
          />
        </div>

        {(formData.userType === 'Student' || formData.userType === 'Tutor') && (
          <FormField
            type="textarea"
            name="bio"
            label="Bio (Optional)"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Tell us about yourself..."
            rows={3}
          />
        )}

        <FormField
          type="text"
          name="username"
          label="Username"
          value={formData.username}
          onChange={handleInputChange}
          error={errors.username}
          placeholder="Choose a username"
          required
        />

        <FormField
          type="email"
          name="email"
          label="Email Address"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          placeholder="your.email@example.com"
          required
        />

        <FormField
          type={showPassword ? 'text' : 'password'}
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleInputChange}
          error={errors.password}
          placeholder="Create a strong password"
          helperText="Password must be at least 8 characters with uppercase, lowercase, and number"
          required
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

        <FormField
          type="tel"
          name="phone"
          label="Phone Number"
          value={formData.phone}
          onChange={handleInputChange}
          error={errors.phone}
          placeholder="1234567890"
          required
        />

        {/* Guardian fields for students */}
        {formData.userType === 'Student' && (
          <>
            <div className="form-row">
              <FormField
                type="text"
                name="guardianFirstName"
                label="Guardian First Name"
                value={formData.guardianFirstName}
                onChange={handleInputChange}
                error={errors.guardianFirstName}
                placeholder="Guardian's first name"
                required
              />

              <FormField
                type="text"
                name="guardianLastName"
                label="Guardian Last Name"
                value={formData.guardianLastName}
                onChange={handleInputChange}
                error={errors.guardianLastName}
                placeholder="Guardian's last name"
                required
              />
            </div>

            <FormField
              type="email"
              name="guardianEmail"
              label="Guardian Email (Optional)"
              value={formData.guardianEmail}
              onChange={handleInputChange}
              error={errors.guardianEmail}
              placeholder="guardian@example.com"
            />
          </>
        )}

        {/* Address fields */}
        <FormField
          type="text"
          name="street"
          label="Street Address"
          value={formData.street}
          onChange={handleInputChange}
          error={errors.street}
          placeholder="123 Main Street"
          required
        />

        <div className="form-row">
          <FormField
            type="text"
            name="city"
            label="City"
            value={formData.city}
            onChange={handleInputChange}
            error={errors.city}
            placeholder="City name"
            required
          />

          <FormField
            type="text"
            name="state"
            label="State"
            value={formData.state}
            onChange={handleInputChange}
            error={errors.state}
            placeholder="State"
            required
          />
        </div>

        <div className="form-row">
          <FormField
            type="text"
            name="zipCode"
            label="ZIP Code"
            value={formData.zipCode}
            onChange={handleInputChange}
            error={errors.zipCode}
            placeholder="12345"
            required
          />

          <Select
            name="country"
            label="Country"
            value={formData.country}
            onChange={handleInputChange}
            error={errors.country}
            options={countryOptions}
            required
          />
        </div>

        {/* Payment methods for guardians */}
        {formData.userType === 'Guardian' && (
          <div className="form-group">
            <label>Payment Methods (Optional)</label>
            <div className="payment-methods-grid">
              {paymentMethodOptions.map(method => (
                <label key={method.value} className="payment-method-option">
                  <input
                    type="checkbox"
                    value={method.value}
                    checked={formData.paymentMethods.includes(method.value)}
                    onChange={(e) => {
                      const { value, checked } = e.target;
                      setFormData(prev => ({
                        ...prev,
                        paymentMethods: checked
                          ? [...prev.paymentMethods, value]
                          : prev.paymentMethods.filter(m => m !== value)
                      }));
                    }}
                  />
                  <span>{method.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </Form>

      {onSwitchToLogin && (
        <div className="signin-link">
          Already have an account?{' '}
          <button
            type="button"
            className="link-button"
            onClick={onSwitchToLogin}
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Create Account"
        size="large"
        closeOnOverlayClick={!loading}
        closeOnEscape={!loading}
      >
        {form}
      </Modal>
    );
  }

  return form;
};

export default SignupForm;