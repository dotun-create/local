import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const StripeTest = () => {
  const [stripeStatus, setStripeStatus] = useState('Loading...');
  const [stripeKey, setStripeKey] = useState('');

  useEffect(() => {
    const testStripe = async () => {
      const key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';
      setStripeKey(key);
      
      // console.log('Testing Stripe with key:', key);
      
      try {
        const stripe = await loadStripe(key);
        if (stripe) {
          setStripeStatus('✅ Stripe loaded successfully');
          // console.log('Stripe object:', stripe);
        } else {
          setStripeStatus('❌ Failed to load Stripe');
        }
      } catch (error) {
        setStripeStatus(`❌ Error loading Stripe: ${error.message}`);
        // console.error('Stripe error:', error);
      }
    };

    testStripe();
  }, []);

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', margin: '20px', borderRadius: '8px' }}>
      <h3>Stripe Connection Test</h3>
      <p><strong>Status:</strong> {stripeStatus}</p>
      <p><strong>Key:</strong> {stripeKey.substring(0, 12)}...{stripeKey.substring(stripeKey.length - 4)}</p>
      <p><strong>Key Type:</strong> {stripeKey.startsWith('pk_live') ? '🔴 LIVE' : '🟡 TEST'}</p>
      
      {stripeKey.startsWith('pk_live') && (
        <div style={{ background: '#ffe6e6', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
          <strong>⚠️ Warning:</strong> You're using LIVE Stripe keys in development. 
          This can cause issues with Stripe Elements. Consider using test keys for development.
        </div>
      )}
    </div>
  );
};

export default StripeTest;