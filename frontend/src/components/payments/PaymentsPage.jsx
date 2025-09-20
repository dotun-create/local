import React, { useState, useEffect } from 'react';
import PaymentGateway from './PaymentGateway';
import AddPaymentMethodModalStripe from './AddPaymentMethodModalStripe';
import paymentMethodsAPI from '../../services/paymentMethodsAPI';
import './css/PaymentsPage.css';

const PaymentsPage = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentGuardianId, setCurrentGuardianId] = useState(null);

  // Helper function to get currency symbol
  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'GBP':
        return '£';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      default:
        return currency;
    }
  };

  // Extract current guardian ID from session
  useEffect(() => {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      if (currentUser.id && currentUser.accountType === 'guardian') {
        setCurrentGuardianId(currentUser.id);
      } else {
        console.error('Current user is not a guardian or user ID not found');
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  }, []);
  const [showPayment, setShowPayment] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(true);
  const [paymentHistoryError, setPaymentHistoryError] = useState(null);

  const [dynamicPlans, setDynamicPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);

  // Fetch dynamic plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      setPlansLoading(true);
      try {
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';
        const response = await fetch(`${API_BASE_URL}/plans`);
        const data = await response.json();
        if (response.ok) {
          setDynamicPlans(data.plans);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        // Fall back to hardcoded plans if API fails
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Fetch saved payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setPaymentMethodsLoading(true);
      setPaymentMethodsError(null);
      try {
        const response = await paymentMethodsAPI.getPaymentMethods();
        setSavedPaymentMethods(response.paymentMethods || []);
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        setPaymentMethodsError('Failed to load payment methods');
      } finally {
        setPaymentMethodsLoading(false);
      }
    };

    fetchPaymentMethods();
  }, []);

  // Fetch payment history
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!currentGuardianId) {
        setPaymentHistoryLoading(false);
        setPaymentHistoryError('Guardian not identified');
        return;
      }

      setPaymentHistoryLoading(true);
      setPaymentHistoryError(null);
      try {
        const response = await paymentMethodsAPI.getPaymentHistory(currentGuardianId);
        setPaymentHistory(response.payments || []);
      } catch (error) {
        console.error('Error fetching payment history:', error);
        setPaymentHistoryError('Failed to load payment history');
      } finally {
        setPaymentHistoryLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [currentGuardianId]);

  // Use dynamic plans only - no hardcoded fallbacks
  const plansToDisplay = dynamicPlans.map(plan => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    period: plan.period,
    features: plan.features,
    popular: plan.isPopular,
    creditRate: plan.creditRate
  }));

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentDetails) => {
    setShowPayment(false);
    setSelectedPlan(null);
    
    const creditsMessage = paymentDetails.creditsEarned 
      ? `Payment successful! ${paymentDetails.creditsEarned} credits added to your account. Welcome to ${selectedPlan.name}!`
      : `Payment successful! Welcome to ${selectedPlan.name}!`;
    
    alert(creditsMessage);

    // Refresh payment history to show the new payment
    try {
      if (currentGuardianId) {
        const response = await paymentMethodsAPI.getPaymentHistory(currentGuardianId);
        setPaymentHistory(response.payments || []);
      }
    } catch (error) {
      console.error('Error refreshing payment history:', error);
    }
  };

  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
    alert('Payment failed. Please try again.');
  };

  // Function to refresh payment methods from API
  const refreshPaymentMethods = async () => {
    try {
      const response = await paymentMethodsAPI.getPaymentMethods();
      setSavedPaymentMethods(response.paymentMethods || []);
    } catch (error) {
      console.error('Error refreshing payment methods:', error);
      setPaymentMethodsError('Failed to refresh payment methods');
    }
  };

  const handleAddPaymentMethod = async (response) => {
    try {
      // Payment method was already saved via Stripe SetupIntent
      // Just refresh the list and show success message
      await refreshPaymentMethods();
      alert(response.message || 'Payment method added successfully!');
    } catch (error) {
      console.error('Error after adding payment method:', error);
      alert('Payment method saved, but failed to refresh list. Please reload the page.');
    }
  };

  const handleRemovePaymentMethod = async (id) => {
    try {
      await paymentMethodsAPI.deletePaymentMethod(id);
      
      // Refresh payment methods list
      await refreshPaymentMethods();
      
      alert('Payment method removed successfully!');
    } catch (error) {
      console.error('Error removing payment method:', error);
      alert('Failed to remove payment method. Please try again.');
    }
  };

  const handleSetDefaultPaymentMethod = async (id) => {
    try {
      await paymentMethodsAPI.setDefaultPaymentMethod(id);
      
      // Refresh payment methods list
      await refreshPaymentMethods();
      
      alert('Default payment method updated!');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      alert('Failed to set default payment method. Please try again.');
    }
  };

  return (
    <div className="payments-page">
      <div className="payments-container">
        <header className="payments-header">
          <h1>Payment Plans & Billing</h1>
          <p>Choose the perfect plan for your learning journey</p>
        </header>

        {!showPayment ? (
          <>
            <section className="pricing-section">
              <h2>Choose Your Plan</h2>
              {plansLoading ? (
                <div className="loading">Loading plans...</div>
              ) : plansToDisplay.length > 0 ? (
                <div className="pricing-grid">
                  {plansToDisplay.map((plan) => (
                  <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                    {plan.popular && <div className="popular-badge">Most Popular</div>}
                    <div className="plan-header">
                      <h3>{plan.name}</h3>
                      <div className="price">
                        <span className="amount">{getCurrencySymbol(plan.currency || 'GBP')}{plan.price}</span>
                        <span className="period">/{plan.period}</span>
                      </div>
                    </div>
                    <ul className="features-list">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="feature-item">
                          <span className="checkmark">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      className="select-plan-btn"
                      onClick={() => handlePlanSelect(plan)}
                    >
                      Select {plan.name}
                    </button>
                  </div>
                  ))}
                </div>
              ) : (
                <div className="no-plans-message">
                  <div className="no-plans-icon">📋</div>
                  <h3>No Payment Plans Available</h3>
                  <p>There are currently no payment plans available. Please check back later or contact support for assistance.</p>
                </div>
              )}
            </section>

            <section className="saved-payment-methods-section">
              <div className="section-header">
                <h2>Saved Payment Methods</h2>
                <button 
                  className="add-payment-btn"
                  onClick={() => setShowAddPaymentModal(true)}
                >
                  + Add Payment Method
                </button>
              </div>
              
              {paymentMethodsLoading ? (
                <div className="loading">Loading payment methods...</div>
              ) : paymentMethodsError ? (
                <div className="error-message">
                  <p>{paymentMethodsError}</p>
                  <button onClick={() => window.location.reload()}>Retry</button>
                </div>
              ) : (
                <div className="payment-methods-grid">
                  {savedPaymentMethods.map((method) => (
                    <div key={method.id} className={`payment-method-card ${method.isDefault ? 'default' : ''}`}>
                      {method.isDefault && <div className="default-badge">Default</div>}
                      
                      <div className="method-icon">
                        {method.type === 'card' && '💳'}
                        {method.type === 'bank' && '🏦'}
                        {method.type === 'paypal' && '💰'}
                      </div>
                      
                      <div className="method-details">
                        <h4>{method.nickname || 'Payment Method'}</h4>
                        {method.type === 'card' && (
                          <p className="method-info">
                            {method.cardType?.toUpperCase()} •••• {method.last4}
                          </p>
                        )}
                        {method.type === 'bank' && (
                          <p className="method-info">
                            {method.accountType} •••• {method.last4}
                          </p>
                        )}
                        {method.type === 'paypal' && (
                          <p className="method-info">{method.email}</p>
                        )}
                      </div>
                      
                      <div className="method-actions">
                        {!method.isDefault && (
                          <button 
                            className="set-default-btn"
                            onClick={() => handleSetDefaultPaymentMethod(method.id)}
                          >
                            Set as Default
                          </button>
                        )}
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemovePaymentMethod(method.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {savedPaymentMethods.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-icon">💳</div>
                      <h3>No payment methods saved</h3>
                      <p>Add a payment method to make future purchases faster</p>
                      <button 
                        className="add-first-payment-btn"
                        onClick={() => setShowAddPaymentModal(true)}
                      >
                        Add Your First Payment Method
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="payment-history-section">
              <h2>Payment History</h2>
              <div className="payment-history">
                {paymentHistoryLoading ? (
                  <div className="loading">Loading payment history...</div>
                ) : paymentHistoryError ? (
                  <div className="error-message">
                    <p>{paymentHistoryError}</p>
                    <button onClick={() => window.location.reload()}>Retry</button>
                  </div>
                ) : paymentHistory.length > 0 ? (
                  <div className="history-table">
                    <div className="table-header">
                      <div>Date</div>
                      <div>Amount</div>
                      <div>Credits</div>
                      <div>Method</div>
                      <div>Status</div>
                    </div>
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="table-row">
                        <div>{payment.processedAt ? new Date(payment.processedAt).toLocaleDateString() : 'N/A'}</div>
                        <div>{getCurrencySymbol(payment.currency || 'GBP')}{payment.amount}</div>
                        <div className="credits-earned">+{payment.creditsEarned || 0} credits</div>
                        <div>{payment.method || 'N/A'}</div>
                        <div className={`status ${(payment.status || 'pending').toLowerCase()}`}>
                          {payment.status || 'pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-history">
                    <p>No payment history available</p>
                  </div>
                )}
              </div>
            </section>

            <section className="payment-features-section">
              <h2>Payment Features</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🔒</div>
                  <h3>Secure Payments</h3>
                  <p>Your payment information is encrypted and secure with industry-standard SSL protection.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔄</div>
                  <h3>Recurring Billing</h3>
                  <p>Set up automatic recurring payments to never miss a subscription renewal.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📅</div>
                  <h3>Scheduled Payments</h3>
                  <p>Schedule your payments for a future date that works best for you.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">💳</div>
                  <h3>Multiple Methods</h3>
                  <p>Pay with Stripe, PayPal, or other supported payment methods.</p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="payment-checkout-section">
            <button 
              className="back-btn"
              onClick={() => setShowPayment(false)}
            >
              ← Back to Plans
            </button>
            
            <div className="checkout-header">
              <h2>Complete Your Purchase</h2>
              <div className="selected-plan-info">
                <h3>{selectedPlan.name}</h3>
                <p>{getCurrencySymbol(selectedPlan.currency || 'GBP')}{selectedPlan.price}/{selectedPlan.period}</p>
              </div>
            </div>

            <PaymentGateway
              amount={selectedPlan.price}
              currency={selectedPlan.currency || 'GBP'}
              description={`${selectedPlan.name} Subscription`}
              planType={selectedPlan.id}
              planData={selectedPlan}
              guardianId={currentGuardianId}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              enableRecurring={true}
              recurringPeriod={selectedPlan.period}
              recurringInterval={1}
            />
          </section>
        )}
      </div>
      
      <AddPaymentMethodModalStripe
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSave={handleAddPaymentMethod}
      />
    </div>
  );
};

export default PaymentsPage;