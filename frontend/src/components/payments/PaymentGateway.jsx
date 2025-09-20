import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import axios from 'axios';
import paymentMethodsAPI from '../../services/paymentMethodsAPI';
import './css/PaymentGateway.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here');

const PaymentGateway = ({
  amount,
  currency = 'USD',
  description = 'Payment',
  planType = 'class',
  planData = null,
  guardianId = null,
  onSuccess,
  onError,
  enableRecurring = false,
  recurringPeriod: initialRecurringPeriod = 'month',
  recurringInterval: initialRecurringInterval = 1
}) => {
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recurringSetup, setRecurringSetup] = useState(enableRecurring);
  const [scheduledDate, setScheduledDate] = useState('');
  const [recurringPeriod, setRecurringPeriod] = useState(initialRecurringPeriod);
  const [recurringInterval, setRecurringInterval] = useState(initialRecurringInterval);
  
  // Saved payment methods
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState(null);
  const [showNewCardForm, setShowNewCardForm] = useState(true);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  // Load saved payment methods on component mount
  useEffect(() => {
    const loadSavedPaymentMethods = async () => {
      try {
        const response = await paymentMethodsAPI.getPaymentMethods();
        const cardMethods = (response.paymentMethods || []).filter(pm => pm.type === 'card');
        setSavedPaymentMethods(cardMethods);
        
        // If there are saved cards, default to using them
        if (cardMethods.length > 0) {
          setShowNewCardForm(false);
          // Select the default card if available
          const defaultCard = cardMethods.find(pm => pm.isDefault) || cardMethods[0];
          setSelectedSavedCard(defaultCard.id);
        }
      } catch (error) {
        console.error('Failed to load saved payment methods:', error);
        // Continue with new card form if loading fails
        setShowNewCardForm(true);
      }
    };

    loadSavedPaymentMethods();
  }, []);

  // Function to charge a saved card
  const chargeSavedCard = async () => {
    if (!selectedSavedCard) return;

    if (!guardianId) {
      alert('Guardian not identified. Please refresh the page and try again.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await paymentMethodsAPI.chargeSavedCard({
        payment_method_id: selectedSavedCard,
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        description,
        plan_type: planType,
        plan_id: planData?.id,
        credit_rate: planData?.creditRate
      });

      onSuccess?.(response);
    } catch (error) {
      console.error('Error charging saved card:', error);
      onError?.(error.response?.data || error);
    } finally {
      setIsProcessing(false);
    }
  };

// Secure Stripe Payment Form Component
const StripePaymentForm = ({ 
  amount, 
  currency, 
  description, 
  planType, 
  planData, 
  onSuccess, 
  onError, 
  recurringSetup, 
  recurringPeriod, 
  recurringInterval,
  scheduledDate,
  setIsProcessing,
  isProcessing,
  savePaymentMethod 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleCardChange = (event) => {
    setCardError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
  };

  const handleStripePayment = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    if (!guardianId) {
      setCardError('Guardian not identified. Please refresh the page and try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    try {
      // Create PaymentIntent on backend
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';
      const response = await axios.post(`${API_BASE_URL}/payment/stripe/create-payment-intent`, {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        description,
        setup_future_usage: (recurringSetup || savePaymentMethod) ? 'off_session' : null,
        metadata: {
          plan_type: planType,
          plan_id: planData?.id || '',
          recurring: recurringSetup.toString(),
          recurring_period: recurringPeriod,
          recurring_interval: recurringInterval.toString(),
          scheduled_date: scheduledDate || ''
        }
      });

      const { client_secret } = response.data;

      // Confirm payment with Stripe Elements (secure card collection)
      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Guardian User', // TODO: Get from user context
          },
        },
        setup_future_usage: recurringSetup ? 'off_session' : undefined,
      });

      if (result.error) {
        setCardError(result.error.message);
        onError?.(result.error);
      } else {
        // Confirm payment on backend and handle credits
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';
        const confirmResponse = await axios.post(`${API_BASE_URL}/payment/stripe/confirm-payment`, {
          payment_intent_id: result.paymentIntent.id,
          guardian_id: guardianId,
          plan_type: planType,
          plan_id: planData?.id,
          credit_rate: planData?.creditRate,
          recurring_setup: recurringSetup,
          recurring_period: recurringPeriod,
          recurring_interval: recurringInterval,
          save_payment_method: savePaymentMethod,
          payment_method_nickname: ''
        });
        
        // Handle scheduled payments if requested
        if (scheduledDate && recurringSetup) {
          await createPaymentSchedule({
            paymentMethodId: result.paymentIntent.payment_method,
            paymentIntentId: result.paymentIntent.id,
            gateway: 'stripe'
          });
        }
        
        // Pass credits info to success handler
        onSuccess?.({
          ...result.paymentIntent,
          creditsEarned: confirmResponse.data.credits_earned,
          creditBalance: confirmResponse.data.credit_balance,
          message: confirmResponse.data.message
        });
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Payment failed';
      setCardError(errorMessage);
      onError?.(error.response?.data || error);
    } finally {
      setIsProcessing(false);
    }
  };

  const createPaymentSchedule = async (paymentData) => {
    try {
      const response = await axios.post('/api/payment/schedule', {
        ...paymentData,
        scheduledDate,
        recurringPeriod,
        recurringInterval,
        isRecurring: recurringSetup
      });
      return response.data;
    } catch (error) {
      console.error('Error creating payment schedule:', error);
      throw error;
    }
  };

  return (
    <form onSubmit={handleStripePayment} className="stripe-payment-form">
      <div className="card-input-container">
        <label className="card-input-label">
          Card Details
        </label>
        <div className="card-element-container">
          <CardElement
            onChange={handleCardChange}
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                  iconColor: '#6b7280',
                },
                invalid: {
                  color: '#ef4444',
                  iconColor: '#ef4444',
                },
              },
              hidePostalCode: false,
              disableLink: false,
            }}
          />
        </div>
        {cardError && (
          <div className="card-error">
            {cardError}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing || !cardComplete}
        className="pay-button stripe-btn"
      >
        {isProcessing ? (
          <>
            <span className="loading-spinner"></span>
            Processing...
          </>
        ) : (
          `Pay ${currency} ${amount.toFixed(2)} with Stripe`
        )}
      </button>

      <div className="stripe-security-info">
        <div className="security-badges">
          <span className="security-badge">🔒 SSL Secured</span>
          <span className="security-badge">💳 PCI Compliant</span>
          <span className="security-badge">🛡️ 256-bit Encryption</span>
        </div>
        <p className="security-text">
          Your card details are processed securely by Stripe and never stored on our servers.
        </p>
      </div>
    </form>
  );
};

  const paypalInitialOptions = {
    clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID || 'your_paypal_client_id',
    currency: currency,
    intent: 'capture',
    vault: recurringSetup,
    ...(recurringSetup && {
      'data-page-type': 'product-details',
      components: 'buttons,funding-eligibility'
    })
  };

  const createPayPalOrder = (data, actions) => {
    if (recurringSetup) {
      return actions.subscription.create({
        plan_id: process.env.REACT_APP_PAYPAL_PLAN_ID || 'your_plan_id',
        quantity: '1',
        custom_id: `subscription_${Date.now()}`
      });
    } else {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: amount.toString(),
            currency_code: currency
          },
          description: description
        }],
        application_context: {
          shipping_preference: 'NO_SHIPPING'
        }
      });
    }
  };

  const onPayPalApprove = async (data, actions) => {
    setIsProcessing(true);
    try {
      if (recurringSetup) {
        const details = await actions.subscription.get();
        if (scheduledDate) {
          await createPaymentSchedule({
            subscriptionId: details.id,
            gateway: 'paypal'
          });
        }
        onSuccess?.(details);
      } else {
        const details = await actions.order.capture();
        if (scheduledDate) {
          await createPaymentSchedule({
            orderId: details.id,
            gateway: 'paypal'
          });
        }
        onSuccess?.(details);
      }
    } catch (error) {
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const onPayPalError = (error) => {
    console.error('PayPal Error:', error);
    onError?.(error);
  };


  return (
    <div className="payment-gateway">
      <div className="payment-header">
        <h3>Complete Your Payment</h3>
        <div className="payment-amount">
          {currency} {amount.toFixed(2)}
          {recurringSetup && (
            <span className="recurring-info">
              /{recurringInterval} {recurringPeriod}(s)
            </span>
          )}
        </div>
      </div>

      <div className="payment-options">
        <div className="payment-settings">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={recurringSetup}
              onChange={(e) => setRecurringSetup(e.target.checked)}
            />
            Enable Recurring Payments
          </label>

          {recurringSetup && (
            <div className="recurring-options">
              <select
                value={recurringPeriod}
                onChange={(e) => setRecurringPeriod(e.target.value)}
                className="period-select"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
              <input
                type="number"
                value={recurringInterval}
                onChange={(e) => setRecurringInterval(parseInt(e.target.value))}
                min="1"
                className="interval-input"
                placeholder="Interval"
              />
            </div>
          )}

          <div className="scheduled-payment">
            <label>Schedule Payment (Optional)</label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="schedule-input"
            />
          </div>
        </div>

        {/* Saved Cards Section */}
        {savedPaymentMethods.length > 0 && paymentMethod === 'stripe' && (
          <div className="saved-cards-section">
            <h4>Payment Method</h4>
            <div className="payment-method-choice">
              <label className="method-choice">
                <input
                  type="radio"
                  checked={!showNewCardForm}
                  onChange={() => setShowNewCardForm(false)}
                />
                Use Saved Card
              </label>
              <label className="method-choice">
                <input
                  type="radio"
                  checked={showNewCardForm}
                  onChange={() => setShowNewCardForm(true)}
                />
                Use New Card
              </label>
            </div>

            {!showNewCardForm && (
              <div className="saved-cards-list">
                {savedPaymentMethods.map((card) => (
                  <label key={card.id} className="saved-card-option">
                    <input
                      type="radio"
                      name="savedCard"
                      checked={selectedSavedCard === card.id}
                      onChange={() => setSelectedSavedCard(card.id)}
                    />
                    <div className="card-info">
                      <div className="card-brand">
                        💳 {card.cardType?.toUpperCase()} •••• {card.last4}
                      </div>
                      <div className="card-nickname">{card.nickname}</div>
                      {card.isDefault && <span className="default-badge">Default</span>}
                    </div>
                  </label>
                ))}
                
                <button
                  type="button"
                  className="charge-saved-card-btn"
                  onClick={chargeSavedCard}
                  disabled={!selectedSavedCard || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <span className="loading-spinner"></span>
                      Processing...
                    </>
                  ) : (
                    `Pay ${currency} ${amount.toFixed(2)}`
                  )}
                </button>
              </div>
            )}

            {showNewCardForm && (
              <div className="new-card-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={savePaymentMethod}
                    onChange={(e) => setSavePaymentMethod(e.target.checked)}
                  />
                  Save this card for future purchases
                </label>
              </div>
            )}
          </div>
        )}

        <div className="payment-method-selector">
          <button
            className={`method-btn ${paymentMethod === 'stripe' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('stripe')}
          >
            <span className="stripe-logo">Stripe</span>
          </button>
          <button
            className={`method-btn ${paymentMethod === 'paypal' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('paypal')}
          >
            <span className="paypal-logo">PayPal</span>
          </button>
        </div>

        <div className="payment-form">
          {paymentMethod === 'stripe' && showNewCardForm && (
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                amount={amount}
                currency={currency}
                description={description}
                planType={planType}
                planData={planData}
                onSuccess={onSuccess}
                onError={onError}
                recurringSetup={recurringSetup}
                recurringPeriod={recurringPeriod}
                recurringInterval={recurringInterval}
                scheduledDate={scheduledDate}
                setIsProcessing={setIsProcessing}
                isProcessing={isProcessing}
                savePaymentMethod={savePaymentMethod}
              />
            </Elements>
          )}

          {paymentMethod === 'paypal' && (
            <div className="paypal-payment">
              <PayPalScriptProvider options={paypalInitialOptions}>
                <PayPalButtons
                  createOrder={createPayPalOrder}
                  onApprove={onPayPalApprove}
                  onError={onPayPalError}
                  disabled={isProcessing}
                  style={{
                    layout: 'vertical',
                    color: 'blue',
                    shape: 'rect',
                    label: 'pay'
                  }}
                />
              </PayPalScriptProvider>
            </div>
          )}
        </div>
      </div>

      <div className="payment-info">
        <p className="security-info">
          🔒 Your payment information is secure and encrypted
        </p>
        <div className="payment-features">
          <div className="feature">
            ✅ Secure payment processing
          </div>
          <div className="feature">
            ✅ Multiple payment methods
          </div>
          <div className="feature">
            ✅ Recurring payment support
          </div>
          <div className="feature">
            ✅ Scheduled payments
          </div>
        </div>
      </div>
    </div>
  );
};

const cancelRecurringPayment = async (subscriptionId, gateway) => {
  try {
    const response = await axios.post('/api/payment/cancel-subscription', {
      subscriptionId,
      gateway
    });
    return response.data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

const updateRecurringPayment = async (subscriptionId, gateway, updateData) => {
  try {
    const response = await axios.put('/api/payment/update-subscription', {
      subscriptionId,
      gateway,
      ...updateData
    });
    return response.data;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

export { PaymentGateway, cancelRecurringPayment, updateRecurringPayment };
export default PaymentGateway;