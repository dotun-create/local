import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import paymentMethodsAPI from '../../services/paymentMethodsAPI';
import './css/AddPaymentMethodModal.css';

// Stripe integration for payment methods
const stripePromise = loadStripe('pk_live_51OZYmaBPDkNK1381rJewQm2RdTuhrgS3agNyQ8kC596Aizh2DaUOzUL0bytQwrLuPJuVOFHFZcophV89SulrCcHU006mzOlGgR');

const StripeCardForm = ({ onSuccess, onError, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [nickname, setNickname] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);

  // Check if Stripe is ready
  useEffect(() => {
    console.log('Modal - Stripe:', !!stripe, 'Elements:', !!elements);
    if (stripe && elements) {
      console.log('Modal - Stripe and Elements are ready');
    } else {
      console.log('Modal - Waiting for Stripe to load...', {
        stripe: !!stripe,
        elements: !!elements,
        key: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
      });
    }
  }, [stripe, elements]);

  const handleCardChange = (event) => {
    setCardError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
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
            name: 'Guardian User', // TODO: Get from user context
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
      console.error('Card setup error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save card';
      setCardError(errorMessage);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937' }}>Add New Card</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
          Card Details
        </label>
        
        {!stripeReady && (
          <div style={{ marginBottom: '10px', color: '#6b7280' }}>
            Loading secure card form...
          </div>
        )}
        
        <div style={{
          border: '2px solid #e5e7eb',
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'white',
          transition: 'border-color 0.2s',
          minHeight: '45px'
        }}>
          <CardElement
            onChange={handleCardChange}
            onReady={() => {
              console.log('CardElement ready in modal');
              setStripeReady(true);
            }}
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
          <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>
            {cardError}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
          Card Nickname (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g., Personal Card, Business Card"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '16px'
          }}
        />
        <span style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
          Give this card a nickname to easily identify it later
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <span style={{ color: '#374151' }}>
            Set as default payment method
          </span>
        </label>
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '12px' }}>
            🔒 SSL Secured
          </span>
          <span style={{ padding: '4px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '12px' }}>
            💳 PCI Compliant
          </span>
          <span style={{ padding: '4px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '12px' }}>
            🛡️ 256-bit Encryption
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '2px solid #e5e7eb',
              backgroundColor: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={!stripe || !stripeReady || isProcessing || !cardComplete}
            style={{
              flex: 1,
              padding: '10px 20px',
              backgroundColor: (!stripe || !stripeReady || isProcessing || !cardComplete) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (!stripe || !stripeReady || isProcessing || !cardComplete) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {isProcessing ? 'Saving Card...' : 'Add Card'}
          </button>
        </div>
        
        <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
          Your card details are processed securely by Stripe and never stored on our servers.
        </p>
      </div>
    </form>
  );
};

const AddPaymentMethodModalStripe = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null;

  const handleSuccess = async (response) => {
    console.log('Card saved successfully:', response);
    onSave?.(response);
  };

  const handleError = (error) => {
    console.error('Error saving card:', error);
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
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1f2937' }}>Add Payment Method</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        <Elements stripe={stripePromise}>
          <StripeCardForm 
            onSuccess={handleSuccess}
            onError={handleError}
            onClose={onClose}
          />
        </Elements>
      </div>
    </div>
  );
};

export default AddPaymentMethodModalStripe;