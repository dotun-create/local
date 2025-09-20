import React, { useState, useRef, useEffect } from 'react';
import './css/UserSignupForm.css';
import questionMarkIcon from '../../resources/images/question-mark.svg';
import logo from '../../resources/images/logo.jpeg';
import avatarStudent from '../../resources/images/avatar-student.svg';
import avatarGuardian from '../../resources/images/avatar-guardian.svg';
import avatarTutor from '../../resources/images/avatar-tutor.svg';

const UserSignupForm = ({ onSignupSubmit, onClose, onSwitchToLogin, defaultAccountType }) => {
  const [formData, setFormData] = useState({
    userType: defaultAccountType || 'Student',
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

  const [validationErrors, setValidationErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usingDefaultAvatar, setUsingDefaultAvatar] = useState(false);

  // Validation rules for tooltips
  const validationRules = {
    firstName: [
      "Must be at least 2 characters long",
      "Only letters allowed",
      "Required field"
    ],
    lastName: [
      "Must be at least 2 characters long", 
      "Only letters allowed",
      "Required field"
    ],
    username: [
      "Must be at least 3 characters long",
      "Cannot contain special characters",
      "Must be unique"
    ],
    email: [
      "Must be a valid email format (xxx@xxx.xxxx)",
      "Example: user@domain.com",
      "Required for account verification"
    ],
    guardianEmail: [
      "Must be a valid email format (xxx@xxx.xxxx)",
      "Optional field for students",
      "Used for parental communication"
    ],
    password: [
      "Minimum 8 characters",
      "At least 1 uppercase letter (A-Z)",
      "At least 1 lowercase letter (a-z)",
      "At least 1 number (0-9)",
      "At least 1 special character (!@#$%^&*)"
    ],
    phone: [
      "Must contain only digits",
      "No spaces, dashes, or parentheses",
      "Example: 1234567890"
    ],
    street: [
      "Enter your complete street address",
      "Include house/apartment number",
      "Example: 123 Main Street, Apt 4B"
    ],
    city: [
      "Enter your city name",
      "No abbreviations",
      "Example: New York"
    ],
    state: [
      "Enter your state or province",
      "Can use full name or abbreviation",
      "Example: California or CA"
    ],
    zipCode: [
      "Enter your postal/ZIP code",
      "Format varies by country",
      "Example: 12345 or 12345-6789"
    ],
    guardianFirstName: [
      "Required for student accounts",
      "Enter guardian's first name",
      "Only letters allowed"
    ],
    guardianLastName: [
      "Required for student accounts", 
      "Enter guardian's last name",
      "Only letters allowed"
    ],
    country: [
      "Required field",
      "Select from available options",
      "US, UK, Nigeria, or Canada"
    ]
  };

  // Validation rules
  const validateName = (name) => {
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    return nameRegex.test(name) && name.trim().length >= 2;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar
    };
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\d+$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validateImage = (file) => {
    if (!file) return { isValid: true, error: null };
    
    const maxSize = 1 * 1024 * 1024; // 1MB in bytes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    if (file.size > maxSize) {
      return { isValid: false, error: 'Image size must be less than 1MB' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Please upload a valid image file (JPEG, PNG, GIF)' };
    }
    
    return { isValid: true, error: null };
  };

  // Real-time validation
  const validateField = (fieldName, value) => {
    const errors = { ...validationErrors };
    
    switch (fieldName) {
      case 'firstName':
        if (!value.trim()) {
          errors.firstName = 'First name is required';
        } else if (!validateName(value)) {
          errors.firstName = 'First name must contain only letters and be at least 2 characters';
        } else {
          delete errors.firstName;
        }
        break;
        
      case 'lastName':
        if (!value.trim()) {
          errors.lastName = 'Last name is required';
        } else if (!validateName(value)) {
          errors.lastName = 'Last name must contain only letters and be at least 2 characters';
        } else {
          delete errors.lastName;
        }
        break;
        
      case 'username':
        if (!value.trim()) {
          errors.username = 'Username is required';
        } else if (value.length < 3) {
          errors.username = 'Username must be at least 3 characters';
        } else {
          delete errors.username;
        }
        break;
        
      case 'email':
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (!validateEmail(value)) {
          errors.email = 'Please enter a valid email address (xxx@xxx.xxxx)';
        } else {
          delete errors.email;
        }
        break;
        
      case 'guardianEmail':
        if (formData.userType === 'Student' && value.trim() && !validateEmail(value)) {
          errors.guardianEmail = 'Please enter a valid guardian email address';
        } else {
          delete errors.guardianEmail;
        }
        break;
        
      case 'password':
        const passwordValidation = validatePassword(value);
        if (!value.trim()) {
          errors.password = 'Password is required';
        } else if (!passwordValidation.isValid) {
          errors.password = 'Password must meet all requirements';
        } else {
          delete errors.password;
        }
        break;
        
      case 'phone':
        if (!value.trim()) {
          errors.phone = 'Phone number is required';
        } else if (!validatePhone(value)) {
          errors.phone = 'Phone number must contain only digits';
        } else {
          delete errors.phone;
        }
        break;
        
      case 'street':
        if (!value.trim()) {
          errors.street = 'Street address is required';
        } else {
          delete errors.street;
        }
        break;
        
      case 'city':
        if (!value.trim()) {
          errors.city = 'City is required';
        } else {
          delete errors.city;
        }
        break;
        
      case 'state':
        if (!value.trim()) {
          errors.state = 'State is required';
        } else {
          delete errors.state;
        }
        break;
        
      case 'zipCode':
        if (!value.trim()) {
          errors.zipCode = 'ZIP code is required';
        } else {
          delete errors.zipCode;
        }
        break;
        
      case 'guardianFirstName':
        if (formData.userType === 'Student' && !value.trim()) {
          errors.guardianFirstName = 'Guardian first name is required for students';
        } else if (formData.userType === 'Student' && value.trim() && !validateName(value)) {
          errors.guardianFirstName = 'Guardian first name must contain only letters';
        } else {
          delete errors.guardianFirstName;
        }
        break;
        
      case 'guardianLastName':
        if (formData.userType === 'Student' && !value.trim()) {
          errors.guardianLastName = 'Guardian last name is required for students';
        } else if (formData.userType === 'Student' && value.trim() && !validateName(value)) {
          errors.guardianLastName = 'Guardian last name must contain only letters';
        } else {
          delete errors.guardianLastName;
        }
        break;
        
      case 'country':
        const validCountries = ['US', 'UK', 'Nigeria', 'Canada'];
        if (!value.trim()) {
          errors.country = 'Country selection is required';
        } else if (!validCountries.includes(value)) {
          errors.country = 'Please select a valid country option';
        } else {
          delete errors.country;
        }
        break;
        
      default:
        break;
    }
    
    setValidationErrors(errors);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    validateField(name, value);
    
    // Clear success and error messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleUserTypeToggle = (type) => {
    setFormData(prev => ({
      ...prev,
      userType: type,
      // Clear guardian fields when switching away from Student
      ...(type !== 'Student' && {
        guardianFirstName: '',
        guardianLastName: '',
        guardianEmail: ''
      }),
      // Clear payment methods when switching away from Guardian
      ...(type !== 'Guardian' && {
        paymentMethods: []
      })
    }));
    
    // Update default avatar if currently using one
    if (usingDefaultAvatar) {
      setImagePreview(getDefaultAvatar(type));
    }
    
    // Clear related validation errors
    const errors = { ...validationErrors };
    if (type !== 'Student') {
      delete errors.guardianFirstName;
      delete errors.guardianLastName;
      delete errors.guardianEmail;
    }
    setValidationErrors(errors);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validation = validateImage(file);
    const errors = { ...validationErrors };
    
    if (!validation.isValid) {
      errors.image = validation.error;
      setValidationErrors(errors);
      return;
    }
    
    delete errors.image;
    setValidationErrors(errors);
    
    // Switch off default avatar mode
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

  const handlePaymentMethodChange = (paymentMethod) => {
    setFormData(prev => {
      const currentMethods = prev.paymentMethods;
      const isSelected = currentMethods.includes(paymentMethod);
      
      if (isSelected) {
        // Remove if already selected
        return {
          ...prev,
          paymentMethods: currentMethods.filter(method => method !== paymentMethod)
        };
      } else {
        // Add if not selected
        return {
          ...prev,
          paymentMethods: [...currentMethods, paymentMethod]
        };
      }
    });
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

  // Check if form is valid for submission
  const isFormValid = () => {
    const requiredFields = [
      'firstName', 'lastName', 'username', 'email', 'password', 'phone', 'street', 'city', 'state', 'zipCode', 'country'
    ];
    
    // Add guardian fields if user is Student
    if (formData.userType === 'Student') {
      requiredFields.push('guardianFirstName', 'guardianLastName');
    }
    
    // Check if all required fields are filled
    const allFieldsFilled = requiredFields.every(field => formData[field]?.trim());
    
    // Check if there are no validation errors
    const noValidationErrors = Object.keys(validationErrors).length === 0;
    
    // Check name validation
    const firstNameValid = validateName(formData.firstName);
    const lastNameValid = validateName(formData.lastName);
    
    // Check email validation
    const emailValid = validateEmail(formData.email);
    const guardianEmailValid = formData.userType !== 'Student' || !formData.guardianEmail || validateEmail(formData.guardianEmail);
    
    // Check password validation
    const passwordValid = validatePassword(formData.password).isValid;
    
    // Check phone validation
    const phoneValid = validatePhone(formData.phone);
    
    // Check guardian names for students
    const guardianNamesValid = formData.userType !== 'Student' || 
      (validateName(formData.guardianFirstName) && validateName(formData.guardianLastName));
    
    return allFieldsFilled && noValidationErrors && firstNameValid && lastNameValid && 
           emailValid && guardianEmailValid && passwordValid && phoneValid && guardianNamesValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      return;
    }
    
    // Automatically assign default avatar if no image uploaded and not using default
    const shouldUseDefaultAvatar = !formData.image && !usingDefaultAvatar;
    
    const submissionData = {
      ...formData,
      // Clean phone number
      phone: formData.phone.replace(/[\s\-\(\)]/g, ''),
      // Convert image to base64 if exists, or add default avatar info
      ...(formData.image && { imageFile: formData.image }),
      ...((usingDefaultAvatar || shouldUseDefaultAvatar) && { 
        defaultAvatar: getDefaultAvatar(formData.userType),
        avatarType: formData.userType.toLowerCase()
      })
    };
    
    if (onSignupSubmit) {
      onSignupSubmit(submissionData, setSuccessMessage, setErrorMessage);
    }
    
    console.log('Form submitted:', submissionData);
  };

  const passwordValidation = validatePassword(formData.password);


  const toggleTooltip = (fieldName) => {
    setActiveTooltip(activeTooltip === fieldName ? null : fieldName);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Get default avatar based on user type
  const getDefaultAvatar = (userType) => {
    const avatarMap = {
      'Student': avatarStudent,
      'Guardian': avatarGuardian,
      'Tutor': avatarTutor
    };
    return avatarMap[userType] || avatarStudent;
  };

  // Use default avatar when no image is uploaded
  const useDefaultAvatar = () => {
    setUsingDefaultAvatar(true);
    setImagePreview(getDefaultAvatar(formData.userType));
    setFormData(prev => ({
      ...prev,
      image: null
    }));
  };

  // Clear default avatar and allow custom upload
  const clearDefaultAvatar = () => {
    setUsingDefaultAvatar(false);
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.validation-tooltip-container')) {
        setActiveTooltip(null);
      }
    };

    if (activeTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeTooltip]);

  // Close payment dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.payment-methods-dropdown')) {
        setPaymentDropdownOpen(false);
      }
    };

    if (paymentDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [paymentDropdownOpen]);

  // Reusable validation tooltip component
  const ValidationTooltip = ({ fieldName }) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    return (
      <div className="validation-tooltip-container">
        <img 
          src={questionMarkIcon} 
          alt="Validation rules" 
          className="question-mark-icon"
          onClick={() => toggleTooltip(fieldName)}
        />
        {activeTooltip === fieldName && (
          <div className="validation-tooltip">
            <div className="tooltip-header">Validation Rules:</div>
            <ul>
              {rules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`signup-container ${onClose ? 'modal-mode' : ''}`}>
      <div className="signup-form-wrapper">
        {/* Header */}
        <div className="signup-header">
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
        <div className="signup-content">
          <div className="signup-title">
            <p className="welcome-text">Start your journey</p>
            <h1>Create Your Account</h1>
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

          <form onSubmit={handleSubmit} className="signup-form">
        {/* User Type Toggle */}
        <div className="form-group">
          <label>Account Type</label>
          <div className="user-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${formData.userType === 'Student' ? 'active' : ''}`}
              onClick={() => handleUserTypeToggle('Student')}
            >
              Student
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.userType === 'Guardian' ? 'active' : ''}`}
              onClick={() => handleUserTypeToggle('Guardian')}
            >
              Guardian
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.userType === 'Tutor' ? 'active' : ''}`}
              onClick={() => handleUserTypeToggle('Tutor')}
            >
              Tutor
            </button>
          </div>
        </div>

        {/* Profile Image Upload */}
        <div className="form-group">
          <label>Profile Picture (Optional)</label>
          <div className="image-upload-section">
            {imagePreview ? (
              <div className="image-preview">
                <img src={imagePreview} alt="Profile preview" />
                <div className="image-actions">
                  <button type="button" onClick={removeImage} className="remove-image-btn">
                    Remove
                  </button>
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
                <div className="avatar-options">
                  <button 
                    type="button" 
                    onClick={useDefaultAvatar}
                    className="use-default-avatar-btn"
                  >
                    Use Default {formData.userType} Avatar
                  </button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
            />
            {validationErrors.image && (
              <div className="error-message">{validationErrors.image}</div>
            )}
          </div>
        </div>

        {/* First Name */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="firstName">First Name *</label>
            <ValidationTooltip fieldName="firstName" />
          </div>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className={validationErrors.firstName ? 'error' : ''}
            placeholder="Enter your first name"
            required
          />
          {validationErrors.firstName && (
            <div className="error-message">{validationErrors.firstName}</div>
          )}
        </div>

        {/* Last Name */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="lastName">Last Name *</label>
            <ValidationTooltip fieldName="lastName" />
          </div>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className={validationErrors.lastName ? 'error' : ''}
            placeholder="Enter your last name"
            required
          />
          {validationErrors.lastName && (
            <div className="error-message">{validationErrors.lastName}</div>
          )}
        </div>

        {/* Bio Field (Student/Tutor only) */}
        {(formData.userType === 'Student' || formData.userType === 'Tutor') && (
          <div className="form-group">
            <label htmlFor="bio">Bio (Optional)</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              rows="4"
              className="form-textarea"
            />
          </div>
        )}

        {/* Username */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="username">Username *</label>
            <ValidationTooltip fieldName="username" />
          </div>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className={validationErrors.username ? 'error' : ''}
            placeholder="Choose a username"
            required
          />
          {validationErrors.username && (
            <div className="error-message">{validationErrors.username}</div>
          )}
        </div>

        {/* Email */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="email">Email Address *</label>
            <ValidationTooltip fieldName="email" />
          </div>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={validationErrors.email ? 'error' : ''}
            placeholder="your.email@example.com"
            required
          />
          {validationErrors.email && (
            <div className="error-message">{validationErrors.email}</div>
          )}
        </div>

        {/* Password */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="password">Password *</label>
            <ValidationTooltip fieldName="password" />
          </div>
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={validationErrors.password ? 'error' : ''}
              placeholder="Create a strong password"
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={togglePasswordVisibility}
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

        {/* Phone */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="phone">Phone Number *</label>
            <ValidationTooltip fieldName="phone" />
          </div>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className={validationErrors.phone ? 'error' : ''}
            placeholder="1234567890"
            required
          />
          {validationErrors.phone && (
            <div className="error-message">{validationErrors.phone}</div>
          )}
        </div>

        {/* Guardian First Name (Students only) */}
        {formData.userType === 'Student' && (
          <div className="form-group">
            <div className="label-with-icon">
              <label htmlFor="guardianFirstName">Guardian First Name *</label>
              <ValidationTooltip fieldName="guardianFirstName" />
            </div>
            <input
              type="text"
              id="guardianFirstName"
              name="guardianFirstName"
              value={formData.guardianFirstName}
              onChange={handleInputChange}
              className={validationErrors.guardianFirstName ? 'error' : ''}
              placeholder="Guardian's first name"
              required
            />
            {validationErrors.guardianFirstName && (
              <div className="error-message">{validationErrors.guardianFirstName}</div>
            )}
          </div>
        )}

        {/* Guardian Last Name (Students only) */}
        {formData.userType === 'Student' && (
          <div className="form-group">
            <div className="label-with-icon">
              <label htmlFor="guardianLastName">Guardian Last Name *</label>
              <ValidationTooltip fieldName="guardianLastName" />
            </div>
            <input
              type="text"
              id="guardianLastName"
              name="guardianLastName"
              value={formData.guardianLastName}
              onChange={handleInputChange}
              className={validationErrors.guardianLastName ? 'error' : ''}
              placeholder="Guardian's last name"
              required
            />
            {validationErrors.guardianLastName && (
              <div className="error-message">{validationErrors.guardianLastName}</div>
            )}
          </div>
        )}

        {/* Guardian Email (Students only) */}
        {formData.userType === 'Student' && (
          <div className="form-group">
            <div className="label-with-icon">
              <label htmlFor="guardianEmail">Guardian Email (Optional)</label>
              <ValidationTooltip fieldName="guardianEmail" />
            </div>
            <input
              type="email"
              id="guardianEmail"
              name="guardianEmail"
              value={formData.guardianEmail}
              onChange={handleInputChange}
              className={validationErrors.guardianEmail ? 'error' : ''}
              placeholder="guardian@example.com"
            />
            {validationErrors.guardianEmail && (
              <div className="error-message">{validationErrors.guardianEmail}</div>
            )}
          </div>
        )}

        {/* Street Address */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="street">Street Address *</label>
            <ValidationTooltip fieldName="street" />
          </div>
          <input
            type="text"
            id="street"
            name="street"
            value={formData.street}
            onChange={handleInputChange}
            className={validationErrors.street ? 'error' : ''}
            placeholder="123 Main Street"
            required
          />
          {validationErrors.street && (
            <div className="error-message">{validationErrors.street}</div>
          )}
        </div>

        {/* City */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="city">City *</label>
            <ValidationTooltip fieldName="city" />
          </div>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            className={validationErrors.city ? 'error' : ''}
            placeholder="City name"
            required
          />
          {validationErrors.city && (
            <div className="error-message">{validationErrors.city}</div>
          )}
        </div>

        {/* State */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="state">State *</label>
            <ValidationTooltip fieldName="state" />
          </div>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            className={validationErrors.state ? 'error' : ''}
            placeholder="State"
            required
          />
          {validationErrors.state && (
            <div className="error-message">{validationErrors.state}</div>
          )}
        </div>

        {/* ZIP Code */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="zipCode">ZIP Code *</label>
            <ValidationTooltip fieldName="zipCode" />
          </div>
          <input
            type="text"
            id="zipCode"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleInputChange}
            className={validationErrors.zipCode ? 'error' : ''}
            placeholder="12345"
            required
          />
          {validationErrors.zipCode && (
            <div className="error-message">{validationErrors.zipCode}</div>
          )}
        </div>

        {/* Country */}
        <div className="form-group">
          <div className="label-with-icon">
            <label htmlFor="country">Country *</label>
            <ValidationTooltip fieldName="country" />
          </div>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className={validationErrors.country ? 'error' : ''}
            required
          >
            <option value="">Select Country</option>
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="Nigeria">Nigeria</option>
            <option value="Canada">Canada</option>
          </select>
          {validationErrors.country && (
            <div className="error-message">{validationErrors.country}</div>
          )}
        </div>

        {/* Payment Methods (Guardian only) */}
        {formData.userType === 'Guardian' && (
          <div className="form-group">
            <label htmlFor="paymentMethods">Payment Methods (Optional)</label>
            <div className="payment-methods-dropdown">
              <div 
                className="payment-dropdown-header"
                onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)}
              >
                <span className="dropdown-text">
                  {formData.paymentMethods.length === 0 
                    ? 'Select payment methods...' 
                    : `${formData.paymentMethods.length} method${formData.paymentMethods.length > 1 ? 's' : ''} selected`
                  }
                </span>
                <span className={`dropdown-arrow ${paymentDropdownOpen ? 'open' : ''}`}>
                  ▼
                </span>
              </div>
              
              {paymentDropdownOpen && (
                <div className="payment-dropdown-content">
                  {[
                    { value: 'Stripe', label: '💳 Stripe' },
                    { value: 'PayPal', label: '🅿️ PayPal' },
                    { value: 'Apple Pay', label: '🍎 Apple Pay' },
                    { value: 'Google Pay', label: '🅶 Google Pay' },
                    { value: 'Bank Transfer', label: '🏦 Bank Transfer' }
                  ].map((method) => (
                    <div
                      key={method.value}
                      className={`payment-option ${formData.paymentMethods.includes(method.value) ? 'selected' : ''}`}
                      onClick={() => handlePaymentMethodChange(method.value)}
                    >
                      <input
                        type="checkbox"
                        checked={formData.paymentMethods.includes(method.value)}
                        onChange={() => {}} // Handled by parent onClick
                        className="payment-checkbox"
                      />
                      <span className="payment-label">{method.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <small className="help-text">
              💡 Click to select multiple payment methods
              {formData.paymentMethods.length > 0 && (
                <span className="selected-methods">
                  • Selected: {formData.paymentMethods.join(', ')}
                </span>
              )}
            </small>
          </div>
        )}


        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={!isFormValid()}
            className="submit-btn"
          >
            {isFormValid() ? 'Sign Up' : 'Please Complete Required Fields'}
          </button>
        </div>
      </form>

      {/* Log In Link */}
      <div className="signin-link">
        Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); if (onSwitchToLogin) onSwitchToLogin(); }}>Log in</a>
      </div>
        </div>
      </div>
    </div>
  );
};

export default UserSignupForm;