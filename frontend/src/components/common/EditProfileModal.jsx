import React, { useState, useRef, useEffect } from 'react';
import './css/EditProfileModal.css';
import questionMarkIcon from '../../resources/images/question-mark.svg';

const EditProfileModal = ({ isOpen, onClose, onSubmit, loading = false, currentProfile }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    image: null,
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    academicCountry: '',
    gradeLevel: '',
    guardianName: '',
    guardianEmail: '',
    guardianId: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Validation rules for tooltips
  const validationRules = {
    name: [
      "Enter your full name",
      "First and last name",
      "Example: John Smith"
    ],
    email: [
      "Must be a valid email format (xxx@xxx.xxxx)",
      "Example: user@domain.com",
      "Used for account verification"
    ],
    phone: [
      "Must contain only digits",
      "No spaces, dashes, or parentheses",
      "Example: 1234567890"
    ],
    bio: [
      "Tell us about yourself",
      "Your interests, goals, etc.",
      "Optional but recommended"
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
    guardianName: [
      "Parent or guardian's full name",
      "Used for contact purposes",
      "Optional for students"
    ],
    guardianEmail: [
      "Guardian's email address",
      "Optional field",
      "Used for parental communication"
    ],
    guardianId: [
      "Guardian's unique identifier",
      "Used to link with guardian account",
      "Optional for students"
    ]
  };

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && currentProfile) {
      setFormData({
        name: currentProfile.name || '',
        email: currentProfile.email || '',
        phone: currentProfile.profile?.phone || '',
        bio: currentProfile.profile?.bio || '',
        image: null,
        street: currentProfile.profile?.address?.street || '',
        city: currentProfile.profile?.address?.city || '',
        state: currentProfile.profile?.address?.state || '',
        zipCode: currentProfile.profile?.address?.zipCode || '',
        country: currentProfile.profile?.address?.country || 'USA',
        academicCountry: currentProfile.academicCountry || '',
        gradeLevel: currentProfile.grade || '',
        guardianName: currentProfile.profile?.guardianName || currentProfile.profile?.guardian_name || '',
        guardianEmail: currentProfile.profile?.guardianEmail || currentProfile.profile?.guardian_email || '',
        guardianId: currentProfile.profile?.guardianId || currentProfile.profile?.guardian_id || ''
      });
      
      // Set image preview if user has an avatar
      if (currentProfile.profile?.avatar) {
        setImagePreview(currentProfile.profile.avatar);
      }
      
      setValidationErrors({});
    }
  }, [isOpen, currentProfile]);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
      case 'name':
        if (!value.trim()) {
          errors.name = 'Name is required';
        } else if (value.length < 2) {
          errors.name = 'Name must be at least 2 characters';
        } else {
          delete errors.name;
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
        
      case 'phone':
        if (value.trim() && !validatePhone(value)) {
          errors.phone = 'Phone number must contain only digits';
        } else {
          delete errors.phone;
        }
        break;
        
      case 'guardianEmail':
        if (value.trim() && !validateEmail(value)) {
          errors.guardianEmail = 'Please enter a valid guardian email address';
        } else {
          delete errors.guardianEmail;
        }
        break;
        
      default:
        break;
    }
    
    setValidationErrors(errors);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear grade level when academic country changes to ensure compatibility
    if (name === 'academicCountry') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        gradeLevel: '' // Clear grade level when country changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    validateField(name, value);
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
    setImagePreview(currentProfile?.profile?.avatar || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (formData.email.trim() && !validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (formData.phone.trim() && !validatePhone(formData.phone)) {
      errors.phone = 'Phone number must contain only digits';
    }
    if (formData.guardianEmail.trim() && !validateEmail(formData.guardianEmail)) {
      errors.guardianEmail = 'Please enter a valid guardian email address';
    }
    
    setValidationErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      bio: '',
      image: null,
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
      academicCountry: '',
      gradeLevel: '',
      guardianName: '',
      guardianEmail: '',
      guardianId: ''
    });
    setValidationErrors({});
    setImagePreview(null);
    setActiveTooltip(null);
    onClose();
  };

  const showTooltip = (field) => {
    setActiveTooltip(field);
  };

  const hideTooltip = () => {
    setActiveTooltip(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-content edit-profile-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-profile-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3 id="edit-profile-title">Edit Profile</h3>
          <button 
            className="close-modal" 
            onClick={handleClose}
            disabled={loading}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="edit-profile-form">
            {/* Profile Image Section */}
            <div className="form-section">
              <h4>Profile Photo</h4>
              <div className="image-upload-section">
                <div className="image-preview-container">
                  {imagePreview ? (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Profile preview" />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={removeImage}
                        disabled={loading}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="image-placeholder">
                      <span>No Image</span>
                    </div>
                  )}
                </div>
                <div className="image-upload-controls">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    {imagePreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  <small>Max 1MB, JPG/PNG/GIF</small>
                </div>
                {validationErrors.image && (
                  <span className="error-message">{validationErrors.image}</span>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="form-section">
              <h4>Basic Information</h4>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <div className="input-with-tooltip">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={loading}
                      className={validationErrors.name ? 'error' : ''}
                      placeholder="Enter your full name"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('name')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'name' && (
                      <div className="tooltip">
                        {validationRules.name.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {validationErrors.name && (
                    <span className="error-message">{validationErrors.name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <div className="input-with-tooltip">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={loading}
                      className={validationErrors.email ? 'error' : ''}
                      placeholder="Enter your email"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('email')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'email' && (
                      <div className="tooltip">
                        {validationRules.email.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {validationErrors.email && (
                    <span className="error-message">{validationErrors.email}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="input-with-tooltip">
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={loading}
                      className={validationErrors.phone ? 'error' : ''}
                      placeholder="Enter your phone number"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('phone')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'phone' && (
                      <div className="tooltip">
                        {validationRules.phone.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {validationErrors.phone && (
                    <span className="error-message">{validationErrors.phone}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="bio">Bio</label>
                  <div className="input-with-tooltip">
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="Tell us about yourself..."
                      rows="3"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('bio')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'bio' && (
                      <div className="tooltip">
                        {validationRules.bio.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="form-section">
              <h4>Address Information</h4>
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="street">Street Address</label>
                  <div className="input-with-tooltip">
                    <input
                      type="text"
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="Enter your street address"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('street')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'street' && (
                      <div className="tooltip">
                        {validationRules.street.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <div className="input-with-tooltip">
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="Enter your city"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('city')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'city' && (
                      <div className="tooltip">
                        {validationRules.city.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="state">State/Province</label>
                  <div className="input-with-tooltip">
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="Enter your state"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('state')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'state' && (
                      <div className="tooltip">
                        {validationRules.state.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="zipCode">ZIP/Postal Code</label>
                  <div className="input-with-tooltip">
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="Enter your ZIP code"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('zipCode')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'zipCode' && (
                      <div className="tooltip">
                        {validationRules.zipCode.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="USA">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Spain">Spain</option>
                    <option value="Italy">Italy</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="form-section">
              <h4>Academic Information</h4>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="academicCountry">Academic Country</label>
                  <select
                    id="academicCountry"
                    name="academicCountry"
                    value={formData.academicCountry}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="">Select Country</option>
                    <option value="USA">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="England">England</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Wales">Wales</option>
                    <option value="Scotland">Scotland</option>
                    <option value="Nigeria">Nigeria</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="gradeLevel">Grade Level</label>
                  <select
                    id="gradeLevel"
                    name="gradeLevel"
                    value={formData.gradeLevel}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="">Select Grade Level</option>
                    {formData.academicCountry === 'USA' ? (
                      // US Grade System: Grade 1-12
                      <>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={`grade-${i + 1}`} value={`Grade ${i + 1}`}>
                            Grade {i + 1}
                          </option>
                        ))}
                      </>
                    ) : formData.academicCountry && ['England', 'Ireland', 'Wales', 'Scotland', 'Canada', 'Nigeria'].includes(formData.academicCountry) ? (
                      // Non-US countries: Year 1-13
                      <>
                        {Array.from({ length: 13 }, (_, i) => (
                          <option key={`year-${i + 1}`} value={`Year ${i + 1}`}>
                            Year {i + 1}
                          </option>
                        ))}
                      </>
                    ) : null}
                  </select>
                </div>
              </div>
            </div>

            {/* Guardian Information */}
            <div className="form-section">
              <h4>Guardian Information (Optional)</h4>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="guardianName">Guardian Name</label>
                  <div className="input-with-tooltip">
                    <input
                      type="text"
                      id="guardianName"
                      name="guardianName"
                      value={formData.guardianName}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="Parent or guardian's name"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('guardianName')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'guardianName' && (
                      <div className="tooltip">
                        {validationRules.guardianName.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="guardianEmail">Guardian Email</label>
                  <div className="input-with-tooltip">
                    <input
                      type="email"
                      id="guardianEmail"
                      name="guardianEmail"
                      value={formData.guardianEmail}
                      onChange={handleInputChange}
                      disabled={loading}
                      className={validationErrors.guardianEmail ? 'error' : ''}
                      placeholder="Guardian's email address"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('guardianEmail')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'guardianEmail' && (
                      <div className="tooltip">
                        {validationRules.guardianEmail.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {validationErrors.guardianEmail && (
                    <span className="error-message">{validationErrors.guardianEmail}</span>
                  )}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="guardianId">Guardian ID</label>
                  <div className="input-with-tooltip">
                    <input
                      type="text"
                      id="guardianId"
                      name="guardianId"
                      value={formData.guardianId}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="Guardian's unique identifier"
                    />
                    <img
                      src={questionMarkIcon}
                      alt="Help"
                      className="tooltip-icon"
                      onMouseEnter={() => showTooltip('guardianId')}
                      onMouseLeave={hideTooltip}
                    />
                    {activeTooltip === 'guardianId' && (
                      <div className="tooltip">
                        {validationRules.guardianId.map((rule, index) => (
                          <div key={index}>{rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;