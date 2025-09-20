import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Try multiple different test keys
const TEST_KEYS = [
  'pk_test_TYooMQauvdEDq54NiTphI7jx', // Stripe's documented test key
  'pk_test_51H1vJsIEITIRprZXIqhqZZPZpyqnlnBjRLmpqhZZPZpyqnlnBjRLmpqhZZPZpyqnlnBjRLmpqhZZPZpyqnlnBjRLmpqhZZPZ', // Generic format
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
];

const DebugCardForm = ({ stripeKey }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [elementReady, setElementReady] = useState(false);
  const [elementError, setElementError] = useState(null);

  useEffect(() => {
    console.log(`DebugCardForm - Stripe: ${!!stripe}, Elements: ${!!elements}, Key: ${stripeKey}`);
  }, [stripe, elements, stripeKey]);

  const handleElementReady = () => {
    console.log('CardElement is ready');
    setElementReady(true);
  };

  const handleElementChange = (event) => {
    console.log('CardElement change:', event);
    setElementError(event.error?.message || null);
  };

  return (
    <div style={{ 
      padding: '15px', 
      border: '2px solid #ddd', 
      margin: '10px 0',
      backgroundColor: '#f8f9fa'
    }}>
      <h4>Debug for Key: {stripeKey?.substring(0, 20)}...</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong>
        <div>Stripe Object: {stripe ? '✅ Loaded' : '❌ Not Loaded'}</div>
        <div>Elements Object: {elements ? '✅ Loaded' : '❌ Not Loaded'}</div>
        <div>Element Ready: {elementReady ? '✅ Yes' : '❌ No'}</div>
        <div>Element Error: {elementError || 'None'}</div>
      </div>

      <div style={{
        border: '1px solid #ccc',
        padding: '10px',
        borderRadius: '4px',
        backgroundColor: 'white'
      }}>
        <CardElement
          onReady={handleElementReady}
          onChange={handleElementChange}
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

      <button 
        onClick={() => {
          const card = elements?.getElement(CardElement);
          console.log('Card element:', card);
          alert(card ? 'Card element found!' : 'Card element not found');
        }}
        style={{ marginTop: '10px', padding: '5px 10px' }}
      >
        Test Element
      </button>
    </div>
  );
};

const StripeDebug = () => {
  const [currentKey, setCurrentKey] = useState(TEST_KEYS[0]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#e9ecef', margin: '20px' }}>
      <h2>🔍 Stripe Debug Tool</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Environment Variables:</strong>
        <pre style={{ background: '#f8f9fa', padding: '10px', fontSize: '12px' }}>
{`REACT_APP_STRIPE_PUBLISHABLE_KEY: ${process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'NOT SET'}
NODE_ENV: ${process.env.NODE_ENV}
Browser: ${navigator.userAgent.split(' ').pop()}`}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Test Different Keys:</strong>
        {TEST_KEYS.map((key, index) => (
          <button
            key={index}
            onClick={() => setCurrentKey(key)}
            style={{
              margin: '5px',
              padding: '5px 10px',
              backgroundColor: currentKey === key ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '3px'
            }}
          >
            Key {index + 1}
          </button>
        ))}
      </div>

      {currentKey && (
        <Elements stripe={loadStripe(currentKey)} key={currentKey}>
          <DebugCardForm stripeKey={currentKey} />
        </Elements>
      )}
    </div>
  );
};

export default StripeDebug;