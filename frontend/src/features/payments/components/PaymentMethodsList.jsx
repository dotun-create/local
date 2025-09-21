import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Modal } from '@shared/components/ui';
import { LoadingSpinner } from '@shared/components/feedback';
import { paymentService } from '../services/paymentService';
import { useStore } from '@shared/store';
import AddPaymentMethodModal from './AddPaymentMethodModal';
import './PaymentMethodsList.css';

const PaymentMethodsList = ({
  onMethodSelect = null,
  allowEdit = true,
  allowDelete = true,
  allowAdd = true,
  className = ''
}) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const { showSuccessToast, showErrorToast } = useStore((state) => state.app.actions);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);

      // Auto-select default method
      const defaultMethod = methods.find(method => method.is_default);
      if (defaultMethod && onMethodSelect) {
        setSelectedMethodId(defaultMethod.id);
        onMethodSelect(defaultMethod);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      setError('Failed to load payment methods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (method) => {
    setSelectedMethodId(method.id);
    onMethodSelect?.(method);
  };

  const handleSetDefault = async (methodId) => {
    try {
      setActionLoading(methodId);
      await paymentService.setDefaultPaymentMethod(methodId);

      // Update local state
      setPaymentMethods(prev => prev.map(method => ({
        ...method,
        is_default: method.id === methodId
      })));

      showSuccessToast('Default payment method updated');
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      showErrorToast('Failed to update default payment method');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (methodId) => {
    try {
      setActionLoading(methodId);
      await paymentService.deletePaymentMethod(methodId);

      // Update local state
      setPaymentMethods(prev => prev.filter(method => method.id !== methodId));

      // Clear selection if deleted method was selected
      if (selectedMethodId === methodId) {
        setSelectedMethodId(null);
        onMethodSelect?.(null);
      }

      setDeleteConfirm(null);
      showSuccessToast('Payment method deleted');
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      showErrorToast('Failed to delete payment method');
      setDeleteConfirm(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSuccess = (newMethod) => {
    setPaymentMethods(prev => [...prev, newMethod]);
    setShowAddModal(false);
    showSuccessToast('Payment method added successfully');

    // Auto-select new method if it's the first one or marked as default
    if (paymentMethods.length === 0 || newMethod.is_default) {
      setSelectedMethodId(newMethod.id);
      onMethodSelect?.(newMethod);
    }
  };

  const getCardBrandIcon = (brand) => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      jcb: '💳',
      diners: '💳',
      unionpay: '💳'
    };
    return icons[brand?.toLowerCase()] || '💳';
  };

  const getMethodTypeLabel = (type) => {
    const labels = {
      card: 'Credit/Debit Card',
      bank_account: 'Bank Account',
      paypal: 'PayPal',
      apple_pay: 'Apple Pay',
      google_pay: 'Google Pay'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card className={`payment-methods-list ${className}`}>
        <div className="methods-loading">
          <LoadingSpinner size="md" />
          <p>Loading payment methods...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`payment-methods-list ${className}`}>
      <div className="methods-header">
        <h3>Payment Methods</h3>
        {allowAdd && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            Add Payment Method
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" className="methods-error">
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={loadPaymentMethods}
            className="retry-button"
          >
            Try Again
          </Button>
        </Alert>
      )}

      {paymentMethods.length === 0 ? (
        <div className="no-methods">
          <div className="no-methods-icon">💳</div>
          <h4>No Payment Methods</h4>
          <p>You haven't added any payment methods yet.</p>
          {allowAdd && (
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
            >
              Add Your First Payment Method
            </Button>
          )}
        </div>
      ) : (
        <div className="methods-list">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`payment-method-item ${
                selectedMethodId === method.id ? 'selected' : ''
              } ${method.is_default ? 'default' : ''}`}
              onClick={() => onMethodSelect && handleMethodSelect(method)}
            >
              <div className="method-main">
                <div className="method-icon">
                  {getCardBrandIcon(method.brand)}
                </div>

                <div className="method-details">
                  <div className="method-primary">
                    <span className="method-type">
                      {getMethodTypeLabel(method.type)}
                    </span>
                    {method.type === 'card' && (
                      <span className="method-brand">
                        {method.brand?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="method-secondary">
                    {method.type === 'card' ? (
                      <>
                        <span className="method-number">•••• {method.last4}</span>
                        <span className="method-expiry">
                          {method.exp_month?.toString().padStart(2, '0')}/{method.exp_year}
                        </span>
                      </>
                    ) : method.type === 'bank_account' ? (
                      <span className="method-number">•••• {method.last4}</span>
                    ) : (
                      <span className="method-email">{method.email}</span>
                    )}
                  </div>

                  {method.nickname && (
                    <div className="method-nickname">
                      "{method.nickname}"
                    </div>
                  )}
                </div>

                <div className="method-status">
                  {method.is_default && (
                    <span className="default-badge">Default</span>
                  )}
                  {onMethodSelect && selectedMethodId === method.id && (
                    <span className="selected-badge">Selected</span>
                  )}
                </div>
              </div>

              {(allowEdit || allowDelete) && (
                <div className="method-actions">
                  {!method.is_default && allowEdit && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(method.id);
                      }}
                      loading={actionLoading === method.id}
                      disabled={actionLoading !== null}
                    >
                      Set as Default
                    </Button>
                  )}

                  {allowDelete && (
                    <Button
                      variant="link"
                      size="sm"
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(method);
                      }}
                      disabled={actionLoading !== null}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <AddPaymentMethodModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Payment Method"
          size="sm"
        >
          <div className="delete-confirmation">
            <p>
              Are you sure you want to delete this payment method?
            </p>

            <div className="method-preview">
              <div className="method-icon">
                {getCardBrandIcon(deleteConfirm.brand)}
              </div>
              <div className="method-info">
                <span className="method-type">
                  {getMethodTypeLabel(deleteConfirm.type)}
                </span>
                {deleteConfirm.type === 'card' && (
                  <span className="method-number">
                    •••• {deleteConfirm.last4}
                  </span>
                )}
              </div>
            </div>

            <div className="confirmation-actions">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={actionLoading !== null}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deleteConfirm.id)}
                loading={actionLoading === deleteConfirm.id}
                disabled={actionLoading !== null}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

export default PaymentMethodsList;