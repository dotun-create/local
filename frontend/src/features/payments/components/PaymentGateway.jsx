import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Modal } from '@shared/components/ui';
import { Input, Select } from '@shared/components/forms';
import { LoadingSpinner } from '@shared/components/feedback';
import { paymentService } from '../services/paymentService';
import { useStore } from '@shared/store';
import './PaymentGateway.css';

const PaymentGateway = ({
  amount,
  currency = 'USD',
  description,
  onSuccess,
  onError,
  onCancel,
  allowSavePaymentMethod = true,
  showSavedMethods = true,
  requiredFields = ['email', 'name'],
  customData = {},
  className = ''
}) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showNewMethodForm, setShowNewMethodForm] = useState(false);
  const [saveMethod, setSaveMethod] = useState(false);
  const [loading, setLoading] = useState(true);

  const { user, isAuthenticated } = useStore((state) => ({
    user: state.auth.user,
    isAuthenticated: state.auth.isAuthenticated
  }));

  const [billingDetails, setBillingDetails] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card',
    card: {
      number: '',
      exp_month: '',
      exp_year: '',
      cvc: ''
    },
    billing_details: billingDetails
  });

  useEffect(() => {
    if (isAuthenticated && showSavedMethods) {
      loadPaymentMethods();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, showSavedMethods]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);

      // Select default method if available
      const defaultMethod = methods.find(method => method.is_default);
      if (defaultMethod) {
        setSelectedMethodId(defaultMethod.id);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      setError('Failed to load saved payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleBillingDetailsChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBillingDetails(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleNewMethodChange = (field, value) => {
    if (field.startsWith('card.')) {
      const cardField = field.split('.')[1];
      setNewPaymentMethod(prev => ({
        ...prev,
        card: {
          ...prev.card,
          [cardField]: value
        }
      }));
    } else {
      setNewPaymentMethod(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateBillingDetails = () => {
    const errors = [];

    if (requiredFields.includes('name') && !billingDetails.name.trim()) {
      errors.push('Name is required');
    }

    if (requiredFields.includes('email') && !billingDetails.email.trim()) {
      errors.push('Email is required');
    }

    if (requiredFields.includes('phone') && !billingDetails.phone.trim()) {
      errors.push('Phone is required');
    }

    return errors;
  };

  const validateNewPaymentMethod = () => {
    const errors = [];

    if (newPaymentMethod.type === 'card') {
      if (!newPaymentMethod.card.number.replace(/\s/g, '')) {
        errors.push('Card number is required');
      }

      if (!newPaymentMethod.card.exp_month || !newPaymentMethod.card.exp_year) {
        errors.push('Expiry date is required');
      }

      if (!newPaymentMethod.card.cvc) {
        errors.push('CVC is required');
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // Validate billing details
      const billingErrors = validateBillingDetails();
      if (billingErrors.length > 0) {
        throw new Error(billingErrors.join(', '));
      }

      let paymentData = {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        description,
        billing_details: billingDetails,
        metadata: customData
      };

      if (selectedMethodId && !showNewMethodForm) {
        // Use saved payment method
        paymentData.payment_method_id = selectedMethodId;
      } else {
        // Validate new payment method
        const methodErrors = validateNewPaymentMethod();
        if (methodErrors.length > 0) {
          throw new Error(methodErrors.join(', '));
        }

        // Use new payment method
        paymentData.payment_method = {
          ...newPaymentMethod,
          billing_details: billingDetails
        };

        if (saveMethod && isAuthenticated) {
          paymentData.save_payment_method = true;
        }
      }

      const result = await paymentService.processPayment(paymentData);

      if (result.status === 'succeeded') {
        onSuccess?.(result);
      } else if (result.status === 'requires_action') {
        // Handle 3D Secure or other authentication
        await handlePaymentAuthentication(result);
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentAuthentication = async (paymentResult) => {
    // This would integrate with Stripe's confirmCardPayment or similar
    // For now, we'll just show that authentication is required
    setError('Payment requires authentication. Please complete the verification and try again.');
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const getCardBrand = (number) => {
    const brands = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/
    };

    for (const [brand, pattern] of Object.entries(brands)) {
      if (pattern.test(number.replace(/\s/g, ''))) {
        return brand;
      }
    }
    return 'unknown';
  };

  if (loading) {
    return (
      <Card className={`payment-gateway ${className}`}>
        <div className="payment-loading">
          <LoadingSpinner size="md" />
          <p>Loading payment options...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`payment-gateway ${className}`}>
      <div className="payment-gateway-header">
        <h3>Payment Information</h3>
        <div className="payment-amount">
          {paymentService.formatCurrency(amount, currency)}
        </div>
      </div>

      {description && (
        <div className="payment-description">
          <p>{description}</p>
        </div>
      )}

      {error && (
        <Alert variant="error" className="payment-error">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="payment-form">
        {/* Billing Details */}
        <div className="billing-details">
          <h4>Billing Details</h4>
          <div className="billing-form">
            {requiredFields.includes('name') && (
              <Input
                label="Full Name"
                value={billingDetails.name}
                onChange={(e) => handleBillingDetailsChange('name', e.target.value)}
                required
                disabled={isProcessing}
              />
            )}

            {requiredFields.includes('email') && (
              <Input
                label="Email"
                type="email"
                value={billingDetails.email}
                onChange={(e) => handleBillingDetailsChange('email', e.target.value)}
                required
                disabled={isProcessing}
              />
            )}

            {requiredFields.includes('phone') && (
              <Input
                label="Phone"
                type="tel"
                value={billingDetails.phone}
                onChange={(e) => handleBillingDetailsChange('phone', e.target.value)}
                required
                disabled={isProcessing}
              />
            )}
          </div>
        </div>

        {/* Payment Method Selection */}
        {isAuthenticated && showSavedMethods && paymentMethods.length > 0 && (
          <div className="payment-methods">
            <h4>Payment Method</h4>

            <div className="saved-methods">
              {paymentMethods.map((method) => (
                <label key={method.id} className="payment-method-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={selectedMethodId === method.id && !showNewMethodForm}
                    onChange={() => {
                      setSelectedMethodId(method.id);
                      setShowNewMethodForm(false);
                    }}
                    disabled={isProcessing}
                  />
                  <div className="method-details">
                    <div className="method-info">
                      <span className="method-brand">{method.brand?.toUpperCase()}</span>
                      <span className="method-last4">•••• {method.last4}</span>
                      {method.is_default && <span className="default-badge">Default</span>}
                    </div>
                    <div className="method-expiry">
                      Expires {method.exp_month?.toString().padStart(2, '0')}/{method.exp_year}
                    </div>
                  </div>
                </label>
              ))}

              <label className="payment-method-option new-method">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="new"
                  checked={showNewMethodForm}
                  onChange={() => setShowNewMethodForm(true)}
                  disabled={isProcessing}
                />
                <div className="method-details">
                  <span className="method-info">Use a new payment method</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* New Payment Method Form */}
        {(!isAuthenticated || !showSavedMethods || paymentMethods.length === 0 || showNewMethodForm) && (
          <div className="new-payment-method">
            <h4>Payment Method</h4>

            <div className="card-form">
              <Input
                label="Card Number"
                value={newPaymentMethod.card.number}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  handleNewMethodChange('card.number', formatted);
                }}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                disabled={isProcessing}
                className={`card-input card-brand-${getCardBrand(newPaymentMethod.card.number)}`}
              />

              <div className="card-expiry-cvc">
                <div className="expiry-inputs">
                  <Select
                    label="Month"
                    value={newPaymentMethod.card.exp_month}
                    onChange={(e) => handleNewMethodChange('card.exp_month', e.target.value)}
                    disabled={isProcessing}
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {month.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Year"
                    value={newPaymentMethod.card.exp_year}
                    onChange={(e) => handleNewMethodChange('card.exp_year', e.target.value)}
                    disabled={isProcessing}
                  >
                    <option value="">YYYY</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
                </div>

                <Input
                  label="CVC"
                  value={newPaymentMethod.card.cvc}
                  onChange={(e) => handleNewMethodChange('card.cvc', e.target.value.replace(/\D/g, ''))}
                  placeholder="123"
                  maxLength={4}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {allowSavePaymentMethod && isAuthenticated && (
              <label className="save-method-checkbox">
                <input
                  type="checkbox"
                  checked={saveMethod}
                  onChange={(e) => setSaveMethod(e.target.checked)}
                  disabled={isProcessing}
                />
                Save this payment method for future use
              </label>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="payment-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={isProcessing}
            disabled={isProcessing}
            className="pay-button"
          >
            {isProcessing ? 'Processing...' : `Pay ${paymentService.formatCurrency(amount, currency)}`}
          </Button>
        </div>
      </form>

      {/* Security Notice */}
      <div className="payment-security">
        <p>🔒 Your payment information is encrypted and secure</p>
      </div>
    </Card>
  );
};

export default PaymentGateway;