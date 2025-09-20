import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import paymentMethodsAPI from '../../services/paymentMethodsAPI';

// Use the exact same key initialization as the working debug tool
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

const WorkingCardForm = ({ onSuccess, onError, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [nickname, setNickname] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [elementReady, setElementReady] = useState(false);

  // Debug logging - exactly like the working version
  useEffect(() => {
    // console.log(`WorkingModal - Stripe: ${!!stripe}, Elements: ${!!elements}`);
  }, [stripe, elements]);

  const handleElementReady = () => {
    // console.log('WorkingModal - CardElement is ready!');
    setElementReady(true);
  };

  const handleCardChange = (event) => {
    // console.log('WorkingModal - CardElement change:', event);
    setCardError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      // console.log('WorkingModal - Stripe not ready');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      // console.log('WorkingModal - CardElement not found');
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    try {
      // Step 1: Create SetupIntent
      const setupIntentResponse = await paymentMethodsAPI.createSetupIntent();
      const { client_secret } = setupIntentResponse;

      // Step 2: Confirm SetupIntent with card details
      const result = await stripe.confirmCardSetup(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Guardian User',
          },
        },
      });

      if (result.error) {
        setCardError(result.error.message);
        onError?.(result.error);
      } else {
        // Step 3: Save to our database
        const confirmResponse = await paymentMethodsAPI.confirmSetupIntent({
          setup_intent_id: result.setupIntent.id,
          nickname: nickname,
          set_as_default: setAsDefault
        });

        onSuccess?.(confirmResponse);
        onClose();
      }
    } catch (error) {
      // console.error('WorkingModal - Card setup error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save card';
      setCardError(errorMessage);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
      <h3>Add New Card (Working Version)</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Debug Status:</strong>
        <div>Stripe: {stripe ? '✅' : '❌'}</div>
        <div>Elements: {elements ? '✅' : '❌'}</div>
        <div>Element Ready: {elementReady ? '✅' : '❌'}</div>
        <div>Card Complete: {cardComplete ? '✅' : '❌'}</div>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label>Card Details</label>
        <div style={{
          border: '1px solid #ccc',
          padding: '10px',
          borderRadius: '4px',
          backgroundColor: 'white',
          marginTop: '5px'
        }}>
          <CardElement
            onReady={handleElementReady}
            onChange={handleCardChange}
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  fontFamily: 'Arial, sans-serif',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        {cardError && (
          <div style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
            {cardError}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Card Nickname (Optional)</label>
        <input
          type="text"
          placeholder="e.g., Personal Card"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginTop: '5px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>
          <input
            type="checkbox"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
          />
          {' '}Set as default payment method
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onClose} style={{
          padding: '10px 20px',
          border: '1px solid #ccc',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Cancel
        </button>
        <button 
          type="submit"
          disabled={!stripe || !elementReady || isProcessing || !cardComplete}
          style={{
            padding: '10px 20px',
            backgroundColor: (!stripe || !elementReady || isProcessing || !cardComplete) ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (!stripe || !elementReady || isProcessing || !cardComplete) ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? 'Saving Card...' : 'Add Card'}
        </button>
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        🔒 Your card details are processed securely by Stripe
      </div>
    </form>
  );
};

const WorkingStripeModal = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null;

  const handleSuccess = async (response) => {
    // console.log('WorkingModal - Card saved successfully:', response);
    onSave?.(response);
  };

  const handleError = (error) => {
    // console.error('WorkingModal - Error saving card:', error);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Elements stripe={stripePromise}>
          <WorkingCardForm 
            onSuccess={handleSuccess}
            onError={handleError}
            onClose={onClose}
          />
        </Elements>
      </div>
    </div>
  );
};

export default WorkingStripeModal;