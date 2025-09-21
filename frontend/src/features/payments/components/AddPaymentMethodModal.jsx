import React, { useState } from 'react';
import { Modal, Button, Alert } from '@shared/components/ui';
import { Input, Select } from '@shared/components/forms';
import { paymentService } from '../services/paymentService';
import './AddPaymentMethodModal.css';

const AddPaymentMethodModal = ({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [paymentMethod, setPaymentMethod] = useState({
    type: 'card',
    card: {
      number: '',
      exp_month: '',
      exp_year: '',
      cvc: ''
    },
    nickname: '',
    set_as_default: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFieldChange = (field, value) => {
    if (field.startsWith('card.')) {
      const cardField = field.split('.')[1];
      setPaymentMethod(prev => ({
        ...prev,
        card: {
          ...prev.card,
          [cardField]: value
        }
      }));
    } else {
      setPaymentMethod(prev => ({
        ...prev,
        [field]: value
      }));
    }
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

  const validateForm = () => {
    const errors = [];

    if (paymentMethod.type === 'card') {
      if (!paymentMethod.card.number.replace(/\s/g, '')) {
        errors.push('Card number is required');
      }

      if (!paymentMethod.card.exp_month || !paymentMethod.card.exp_year) {
        errors.push('Expiry date is required');
      }

      if (!paymentMethod.card.cvc) {
        errors.push('CVC is required');
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);

    try {
      const result = await paymentService.addPaymentMethod(paymentMethod);
      onSuccess?.(result);
      onClose();
    } catch (error) {
      console.error('Failed to add payment method:', error);
      setError(error.message || 'Failed to add payment method. Please try again.');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPaymentMethod({
        type: 'card',
        card: {
          number: '',
          exp_month: '',
          exp_year: '',
          cvc: ''
        },
        nickname: '',
        set_as_default: false
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Payment Method"
      size="md"
    >
      <form onSubmit={handleSubmit} className="add-payment-method-form">
        {error && (
          <Alert variant="error" className="form-error">
            {error}
          </Alert>
        )}

        {/* Payment Method Type */}
        <Select
          label="Payment Method Type"
          value={paymentMethod.type}
          onChange={(e) => handleFieldChange('type', e.target.value)}
          disabled={loading}
          required
        >
          <option value="card">Credit/Debit Card</option>
          <option value="bank_account">Bank Account</option>
          <option value="paypal">PayPal</option>
        </Select>

        {/* Card Details */}
        {paymentMethod.type === 'card' && (
          <div className="card-details">
            <Input
              label="Card Number"
              value={paymentMethod.card.number}
              onChange={(e) => {
                const formatted = formatCardNumber(e.target.value);
                handleFieldChange('card.number', formatted);
              }}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              disabled={loading}
              required
            />

            <div className="card-expiry-cvc">
              <Select
                label="Month"
                value={paymentMethod.card.exp_month}
                onChange={(e) => handleFieldChange('card.exp_month', e.target.value)}
                disabled={loading}
                required
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
                value={paymentMethod.card.exp_year}
                onChange={(e) => handleFieldChange('card.exp_year', e.target.value)}
                disabled={loading}
                required
              >
                <option value="">YYYY</option>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>

              <Input
                label="CVC"
                value={paymentMethod.card.cvc}
                onChange={(e) => handleFieldChange('card.cvc', e.target.value.replace(/\D/g, ''))}
                placeholder="123"
                maxLength={4}
                disabled={loading}
                required
              />
            </div>
          </div>
        )}

        {/* Bank Account Details */}
        {paymentMethod.type === 'bank_account' && (
          <div className="bank-details">
            <Alert variant="info">
              Bank account integration is coming soon. Please use a card for now.
            </Alert>
          </div>
        )}

        {/* PayPal Details */}
        {paymentMethod.type === 'paypal' && (
          <div className="paypal-details">
            <Alert variant="info">
              PayPal integration is coming soon. Please use a card for now.
            </Alert>
          </div>
        )}

        {/* Optional Settings */}
        <div className="method-settings">
          <Input
            label="Nickname (Optional)"
            value={paymentMethod.nickname}
            onChange={(e) => handleFieldChange('nickname', e.target.value)}
            placeholder="e.g., Personal Card, Business Card"
            disabled={loading}
          />

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={paymentMethod.set_as_default}
              onChange={(e) => handleFieldChange('set_as_default', e.target.checked)}
              disabled={loading}
            />
            Set as default payment method
          </label>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading || paymentMethod.type !== 'card'}
          >
            {loading ? 'Adding...' : 'Add Payment Method'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddPaymentMethodModal;