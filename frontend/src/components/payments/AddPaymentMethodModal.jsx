import React, { useState } from 'react';
import './css/AddPaymentMethodModal.css';

const AddPaymentMethodModal = ({ isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('card');
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    nickname: '',
    setAsDefault: false,
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    }
  });

  const [bankData, setBankData] = useState({
    accountHolder: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking',
    nickname: '',
    setAsDefault: false
  });

  const [paypalData, setPaypalData] = useState({
    email: '',
    nickname: '',
    setAsDefault: false
  });

  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const validateCard = () => {
    const newErrors = {};
    
    if (!cardData.cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number';
    }
    
    if (!cardData.cardHolder.trim()) {
      newErrors.cardHolder = 'Cardholder name is required';
    }
    
    if (!cardData.expiryMonth || !cardData.expiryYear) {
      newErrors.expiry = 'Expiry date is required';
    }
    
    if (!cardData.cvv.match(/^\d{3,4}$/)) {
      newErrors.cvv = 'Please enter a valid CVV';
    }
    
    if (!cardData.billingAddress.street.trim()) {
      newErrors.street = 'Street address is required';
    }
    
    if (!cardData.billingAddress.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!cardData.billingAddress.zipCode.match(/^\d{5}(-\d{4})?$/)) {
      newErrors.zipCode = 'Please enter a valid ZIP code';
    }
    
    return newErrors;
  };

  const validateBank = () => {
    const newErrors = {};
    
    if (!bankData.accountHolder.trim()) {
      newErrors.accountHolder = 'Account holder name is required';
    }
    
    if (!bankData.accountNumber.match(/^\d{8,17}$/)) {
      newErrors.accountNumber = 'Please enter a valid account number';
    }
    
    if (!bankData.routingNumber.match(/^\d{9}$/)) {
      newErrors.routingNumber = 'Please enter a valid 9-digit routing number';
    }
    
    return newErrors;
  };

  const validatePayPal = () => {
    const newErrors = {};
    
    if (!paypalData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    return newErrors;
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const detectCardType = (number) => {
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(number.replace(/\s/g, ''))) {
        return type;
      }
    }
    return 'generic';
  };

  const handleCardInputChange = (field, value) => {
    if (field === 'cardNumber') {
      value = formatCardNumber(value);
    }
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setCardData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setCardData(prev => ({ ...prev, [field]: value }));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBankInputChange = (field, value) => {
    setBankData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePayPalInputChange = (field, value) => {
    setPaypalData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    let validationErrors = {};
    let paymentMethod = {};
    
    if (activeTab === 'card') {
      validationErrors = validateCard();
      if (Object.keys(validationErrors).length === 0) {
        paymentMethod = {
          type: 'card',
          ...cardData,
          cardType: detectCardType(cardData.cardNumber),
          last4: cardData.cardNumber.slice(-4)
        };
      }
    } else if (activeTab === 'bank') {
      validationErrors = validateBank();
      if (Object.keys(validationErrors).length === 0) {
        paymentMethod = {
          type: 'bank',
          ...bankData,
          last4: bankData.accountNumber.slice(-4)
        };
      }
    } else if (activeTab === 'paypal') {
      validationErrors = validatePayPal();
      if (Object.keys(validationErrors).length === 0) {
        paymentMethod = {
          type: 'paypal',
          ...paypalData
        };
      }
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      onSave(paymentMethod);
      setIsProcessing(false);
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setCardData({
      cardNumber: '',
      cardHolder: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      nickname: '',
      setAsDefault: false,
      billingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States'
      }
    });
    setBankData({
      accountHolder: '',
      accountNumber: '',
      routingNumber: '',
      accountType: 'checking',
      nickname: '',
      setAsDefault: false
    });
    setPaypalData({
      email: '',
      nickname: '',
      setAsDefault: false
    });
    setErrors({});
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i);
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  return (
    <div className="payment-modal-overlay" onClick={handleClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Payment Method</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="payment-tabs">
          <button
            className={`tab-btn ${activeTab === 'card' ? 'active' : ''}`}
            onClick={() => setActiveTab('card')}
          >
            <span className="tab-icon">💳</span>
            Credit/Debit Card
          </button>
          <button
            className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            <span className="tab-icon">🏦</span>
            Bank Account
          </button>
          <button
            className={`tab-btn ${activeTab === 'paypal' ? 'active' : ''}`}
            onClick={() => setActiveTab('paypal')}
          >
            <span className="tab-icon">💰</span>
            PayPal
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'card' && (
            <div className="card-form vertical-layout">
              <div className="card-preview-container">
                <div className={`card-wrapper ${cardData.cvv ? 'flipped' : ''}`}>
                  <div className={`credit-card front ${detectCardType(cardData.cardNumber)}`}>
                    <div className="card-background"></div>
                    <div className="card-content">
                      <div className="card-top">
                        <div className="card-chip">
                          <svg width="50" height="40" viewBox="0 0 50 40">
                            <rect width="50" height="40" rx="5" fill="#FFD700"/>
                            <rect x="10" y="10" width="10" height="7" fill="#FFB900"/>
                            <rect x="30" y="10" width="10" height="7" fill="#FFB900"/>
                            <rect x="10" y="23" width="10" height="7" fill="#FFB900"/>
                            <rect x="30" y="23" width="10" height="7" fill="#FFB900"/>
                          </svg>
                        </div>
                        <div className="card-logo">
                          {detectCardType(cardData.cardNumber) === 'visa' && (
                            <svg width="60" height="20" viewBox="0 0 60 20">
                              <text x="0" y="18" fill="white" fontSize="20" fontWeight="bold" fontStyle="italic">VISA</text>
                            </svg>
                          )}
                          {detectCardType(cardData.cardNumber) === 'mastercard' && (
                            <svg width="50" height="30" viewBox="0 0 50 30">
                              <circle cx="15" cy="15" r="15" fill="#EB001B"/>
                              <circle cx="35" cy="15" r="15" fill="#F79E1B"/>
                              <rect x="15" y="0" width="20" height="30" fill="#FF5F00" opacity="0.8"/>
                            </svg>
                          )}
                          {detectCardType(cardData.cardNumber) === 'amex' && (
                            <svg width="50" height="30" viewBox="0 0 50 30">
                              <rect width="50" height="30" rx="3" fill="#006FCF"/>
                              <text x="5" y="20" fill="white" fontSize="12" fontWeight="bold">AMEX</text>
                            </svg>
                          )}
                          {detectCardType(cardData.cardNumber) === 'discover' && (
                            <svg width="60" height="20" viewBox="0 0 60 20">
                              <text x="0" y="16" fill="white" fontSize="14" fontWeight="bold">DISCOVER</text>
                            </svg>
                          )}
                          {detectCardType(cardData.cardNumber) === 'generic' && (
                            <div className="generic-logo">CARD</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="card-number">
                        {cardData.cardNumber ? (
                          <span className="number-display">
                            {cardData.cardNumber.split(' ').map((group, idx) => (
                              <span key={idx} className="number-group">{group}</span>
                            ))}
                          </span>
                        ) : (
                          <span className="number-placeholder">•••• •••• •••• ••••</span>
                        )}
                      </div>
                      
                      <div className="card-bottom">
                        <div className="card-holder">
                          <span className="label">CARD HOLDER</span>
                          <span className="value">{cardData.cardHolder || 'YOUR NAME'}</span>
                        </div>
                        <div className="card-expiry">
                          <span className="label">EXPIRES</span>
                          <span className="value">
                            {cardData.expiryMonth && cardData.expiryYear 
                              ? `${cardData.expiryMonth}/${cardData.expiryYear.slice(-2)}`
                              : 'MM/YY'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`credit-card back ${detectCardType(cardData.cardNumber)}`}>
                    <div className="card-background"></div>
                    <div className="card-content">
                      <div className="magnetic-strip"></div>
                      <div className="cvv-section">
                        <div className="signature-strip">
                          <span className="cvv-label">CVV</span>
                          <span className="cvv-value">{cardData.cvv || '•••'}</span>
                        </div>
                      </div>
                      <div className="card-info-back">
                        <p>This card is property of the issuing bank and must be returned upon request.</p>
                        <p>24/7 Customer Service: 1-800-XXX-XXXX</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="accepted-cards">
                  <span className="accepted-label">We accept:</span>
                  <div className="card-brands">
                    <div className={`brand-icon ${detectCardType(cardData.cardNumber) === 'visa' ? 'active' : ''}`}>
                      <svg width="40" height="25" viewBox="0 0 40 25">
                        <rect width="40" height="25" rx="3" fill="#1A1F71"/>
                        <text x="8" y="17" fill="white" fontSize="12" fontWeight="bold">VISA</text>
                      </svg>
                    </div>
                    <div className={`brand-icon ${detectCardType(cardData.cardNumber) === 'mastercard' ? 'active' : ''}`}>
                      <svg width="40" height="25" viewBox="0 0 40 25">
                        <rect width="40" height="25" rx="3" fill="#000"/>
                        <circle cx="15" cy="12.5" r="8" fill="#EB001B"/>
                        <circle cx="25" cy="12.5" r="8" fill="#F79E1B"/>
                      </svg>
                    </div>
                    <div className={`brand-icon ${detectCardType(cardData.cardNumber) === 'amex' ? 'active' : ''}`}>
                      <svg width="40" height="25" viewBox="0 0 40 25">
                        <rect width="40" height="25" rx="3" fill="#006FCF"/>
                        <text x="5" y="16" fill="white" fontSize="10" fontWeight="bold">AMEX</text>
                      </svg>
                    </div>
                    <div className={`brand-icon ${detectCardType(cardData.cardNumber) === 'discover' ? 'active' : ''}`}>
                      <svg width="40" height="25" viewBox="0 0 40 25">
                        <rect width="40" height="25" rx="3" fill="#FF6000"/>
                        <text x="3" y="16" fill="white" fontSize="8" fontWeight="bold">DISCOVER</text>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-sections-container">
                <div className="form-section card-details-section">
                  <h3>
                    <span className="section-icon">💳</span>
                    Card Details
                  </h3>
                  
                  <div className="form-group with-icon">
                    <label>Card Number</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        value={cardData.cardNumber}
                        onChange={(e) => handleCardInputChange('cardNumber', e.target.value)}
                        className={errors.cardNumber ? 'error' : ''}
                      />
                      <div className="input-icon">
                        {detectCardType(cardData.cardNumber) !== 'generic' && (
                          <div className="card-type-indicator">
                            {detectCardType(cardData.cardNumber) === 'visa' && '💳'}
                            {detectCardType(cardData.cardNumber) === 'mastercard' && '🔴'}
                            {detectCardType(cardData.cardNumber) === 'amex' && '🔵'}
                            {detectCardType(cardData.cardNumber) === 'discover' && '🟠'}
                          </div>
                        )}
                      </div>
                    </div>
                    {errors.cardNumber && <span className="error-msg">{errors.cardNumber}</span>}
                  </div>

                  <div className="form-group">
                    <label>Cardholder Name</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardData.cardHolder}
                        onChange={(e) => handleCardInputChange('cardHolder', e.target.value.toUpperCase())}
                        className={errors.cardHolder ? 'error' : ''}
                      />
                    </div>
                    {errors.cardHolder && <span className="error-msg">{errors.cardHolder}</span>}
                  </div>

                  <div className="form-row card-meta">
                    <div className="form-group expiry-group">
                      <label>Expiry Date</label>
                      <div className="expiry-inputs-styled">
                        <select
                          value={cardData.expiryMonth}
                          onChange={(e) => handleCardInputChange('expiryMonth', e.target.value)}
                          className={`month-select ${errors.expiry ? 'error' : ''}`}
                        >
                          <option value="">MM</option>
                          {months.map(month => (
                            <option key={month.value} value={month.value}>
                              {month.value} - {month.label.slice(0, 3)}
                            </option>
                          ))}
                        </select>
                        <span className="date-separator">/</span>
                        <select
                          value={cardData.expiryYear}
                          onChange={(e) => handleCardInputChange('expiryYear', e.target.value)}
                          className={`year-select ${errors.expiry ? 'error' : ''}`}
                        >
                          <option value="">YY</option>
                          {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      {errors.expiry && <span className="error-msg">{errors.expiry}</span>}
                    </div>

                    <div className="form-group cvv-group">
                      <label>
                        CVV
                        <span className="cvv-help" title="3-digit security code on the back of your card">?</span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          placeholder="123"
                          maxLength="4"
                          value={cardData.cvv}
                          onChange={(e) => handleCardInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                          onFocus={() => setCardData(prev => ({ ...prev, showCvvHint: true }))}
                          onBlur={() => setCardData(prev => ({ ...prev, showCvvHint: false }))}
                          className={`cvv-input ${errors.cvv ? 'error' : ''}`}
                        />
                        <div className="cvv-icon">🔒</div>
                      </div>
                      {errors.cvv && <span className="error-msg">{errors.cvv}</span>}
                    </div>
                  </div>
                </div>

                <div className="form-section billing-section">
                  <h3>
                    <span className="section-icon">📍</span>
                    Billing Address
                  </h3>
                  
                  <div className="form-group">
                    <label>Street Address</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        placeholder="123 Main Street"
                        value={cardData.billingAddress.street}
                        onChange={(e) => handleCardInputChange('billingAddress.street', e.target.value)}
                        className={errors.street ? 'error' : ''}
                      />
                    </div>
                    {errors.street && <span className="error-msg">{errors.street}</span>}
                  </div>

                  <div className="form-row address-row">
                    <div className="form-group city-group">
                      <label>City</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          placeholder="New York"
                          value={cardData.billingAddress.city}
                          onChange={(e) => handleCardInputChange('billingAddress.city', e.target.value)}
                          className={errors.city ? 'error' : ''}
                        />
                      </div>
                      {errors.city && <span className="error-msg">{errors.city}</span>}
                    </div>

                    <div className="form-group state-group">
                      <label>State</label>
                      <div className="input-wrapper">
                        <select
                          value={cardData.billingAddress.state}
                          onChange={(e) => handleCardInputChange('billingAddress.state', e.target.value)}
                          className="state-select"
                        >
                          <option value="">Select</option>
                          {states.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group zip-group">
                      <label>ZIP Code</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          placeholder="10001"
                          maxLength="10"
                          value={cardData.billingAddress.zipCode}
                          onChange={(e) => handleCardInputChange('billingAddress.zipCode', e.target.value)}
                          className={errors.zipCode ? 'error' : ''}
                        />
                      </div>
                      {errors.zipCode && <span className="error-msg">{errors.zipCode}</span>}
                    </div>
                  </div>
                </div>

                <div className="form-section preferences-section">
                  <div className="form-group nickname-group">
                    <label>
                      <span className="section-icon">🏷️</span>
                      Card Nickname (Optional)
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        placeholder="e.g., Personal Card, Business Card"
                        value={cardData.nickname}
                        onChange={(e) => handleCardInputChange('nickname', e.target.value)}
                        className="nickname-input"
                      />
                    </div>
                    <span className="helper-text">Give this card a nickname to easily identify it later</span>
                  </div>

                  <div className="form-group checkbox-group-styled">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={cardData.setAsDefault}
                        onChange={(e) => handleCardInputChange('setAsDefault', e.target.checked)}
                        className="styled-checkbox"
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        <strong>Set as default payment method</strong>
                        <small>Use this card for all future transactions</small>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="bank-form">
              <div className="form-section">
                <h3>Bank Account Information</h3>
                
                <div className="form-group">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={bankData.accountHolder}
                    onChange={(e) => handleBankInputChange('accountHolder', e.target.value)}
                    className={errors.accountHolder ? 'error' : ''}
                  />
                  {errors.accountHolder && <span className="error-msg">{errors.accountHolder}</span>}
                </div>

                <div className="form-group">
                  <label>Account Type</label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        value="checking"
                        checked={bankData.accountType === 'checking'}
                        onChange={(e) => handleBankInputChange('accountType', e.target.value)}
                      />
                      Checking
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="savings"
                        checked={bankData.accountType === 'savings'}
                        onChange={(e) => handleBankInputChange('accountType', e.target.value)}
                      />
                      Savings
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Routing Number</label>
                  <input
                    type="text"
                    placeholder="123456789"
                    maxLength="9"
                    value={bankData.routingNumber}
                    onChange={(e) => handleBankInputChange('routingNumber', e.target.value.replace(/\D/g, ''))}
                    className={errors.routingNumber ? 'error' : ''}
                  />
                  {errors.routingNumber && <span className="error-msg">{errors.routingNumber}</span>}
                </div>

                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    placeholder="000000000000"
                    maxLength="17"
                    value={bankData.accountNumber}
                    onChange={(e) => handleBankInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                    className={errors.accountNumber ? 'error' : ''}
                  />
                  {errors.accountNumber && <span className="error-msg">{errors.accountNumber}</span>}
                </div>

                <div className="form-group">
                  <label>Nickname (Optional)</label>
                  <input
                    type="text"
                    placeholder="Checking Account"
                    value={bankData.nickname}
                    onChange={(e) => handleBankInputChange('nickname', e.target.value)}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={bankData.setAsDefault}
                      onChange={(e) => handleBankInputChange('setAsDefault', e.target.checked)}
                    />
                    Set as default payment method
                  </label>
                </div>
              </div>

              <div className="security-notice">
                <div className="notice-icon">🔒</div>
                <div className="notice-content">
                  <h4>Bank-Level Security</h4>
                  <p>Your bank account information is encrypted and transmitted securely. We use industry-standard security measures to protect your data.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'paypal' && (
            <div className="paypal-form">
              <div className="paypal-logo">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 124 33'%3E%3Cpath fill='%23253B80' d='M46.2 6.5h-6.9c-.5 0-.9.4-1 .9l-2.8 17.8c-.1.4.2.7.6.7h3.3c.5 0 .9-.4 1-.9l.8-4.9c.1-.5.5-.9 1-.9h2.3c4.7 0 7.4-2.3 8.1-6.8.3-2 0-3.5-.9-4.6-.9-1.2-2.6-1.8-4.5-1.8zm.8 6.7c-.4 2.5-2.3 2.5-4.2 2.5h-1.1l.7-4.6c0-.3.3-.5.6-.5h.5c1.3 0 2.5 0 3.1.7.4.4.5 1 .4 1.9z'/%3E%3C/svg%3E" alt="PayPal" />
              </div>

              <div className="form-section">
                <h3>Connect PayPal Account</h3>
                
                <div className="form-group">
                  <label>PayPal Email Address</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={paypalData.email}
                    onChange={(e) => handlePayPalInputChange('email', e.target.value)}
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-msg">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label>Nickname (Optional)</label>
                  <input
                    type="text"
                    placeholder="PayPal Account"
                    value={paypalData.nickname}
                    onChange={(e) => handlePayPalInputChange('nickname', e.target.value)}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={paypalData.setAsDefault}
                      onChange={(e) => handlePayPalInputChange('setAsDefault', e.target.checked)}
                    />
                    Set as default payment method
                  </label>
                </div>
              </div>

              <div className="paypal-benefits">
                <h4>Why use PayPal?</h4>
                <ul>
                  <li>✓ Fast and secure payments</li>
                  <li>✓ Buyer protection on eligible purchases</li>
                  <li>✓ No need to share financial information</li>
                  <li>✓ Easy refunds and dispute resolution</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="security-badges">
            <span className="badge">🔒 256-bit SSL</span>
            <span className="badge">PCI Compliant</span>
          </div>
          
          <div className="action-buttons">
            <button className="cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button 
              className="save-btn" 
              onClick={handleSubmit}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="loading">Processing...</span>
              ) : (
                `Add ${activeTab === 'card' ? 'Card' : activeTab === 'bank' ? 'Bank Account' : 'PayPal'}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPaymentMethodModal;