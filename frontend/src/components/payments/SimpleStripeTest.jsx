import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with the key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

const SimpleCardForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setMessage('Stripe is not loaded yet');
      return;
    }

    const card = elements.getElement(CardElement);

    if (card) {
      setMessage('Card element found and ready!');
      console.log('Card element is working:', card);
    } else {
      setMessage('Card element not found');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Simple Stripe Test</h3>
      <p><strong>Stripe Key:</strong> {process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY}</p>
      <p><strong>Stripe Ready:</strong> {stripe ? '✅ Yes' : '❌ No'}</p>
      <p><strong>Elements Ready:</strong> {elements ? '✅ Yes' : '❌ No'}</p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ margin: '10px 0' }}>
          <label>Test Card Input:</label>
          <div style={{ 
            border: '1px solid #ccc', 
            padding: '10px', 
            marginTop: '5px',
            borderRadius: '4px'
          }}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          style={{
            background: '#5469d4',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          disabled={!stripe}
        >
          Test Card Element
        </button>
      </form>
      
      {message && <p><strong>Status:</strong> {message}</p>}
    </div>
  );
};

const SimpleStripeTest = () => {
  return (
    <Elements stripe={stripePromise}>
      <SimpleCardForm />
    </Elements>
  );
};

export default SimpleStripeTest;