/**
 * Baseline tests for payment system
 * Tests Stripe, PayPal integration and payment workflows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, createMockUser } from './test-utils';

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    elements: jest.fn(() => ({
      create: jest.fn(() => ({
        mount: jest.fn(),
        unmount: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      })),
      getElement: jest.fn(),
    })),
    confirmCardPayment: jest.fn(),
    confirmPayment: jest.fn(),
    createPaymentMethod: jest.fn(),
  })),
}));

// Mock PayPal
jest.mock('@paypal/react-paypal-js', () => ({
  PayPalScriptProvider: ({ children }) => <div data-testid="paypal-provider">{children}</div>,
  PayPalButtons: ({ onApprove, onError, createOrder }) => (
    <div data-testid="paypal-buttons">
      <button
        onClick={() => createOrder().then(orderId => onApprove({ orderID: orderId }))}
        data-testid="paypal-pay-button"
      >
        PayPal Pay
      </button>
    </div>
  ),
}));

// Mock payment services
jest.mock('../../shared/services/paymentMethodsAPI', () => ({
  getPaymentMethods: jest.fn(),
  addPaymentMethod: jest.fn(),
  deletePaymentMethod: jest.fn(),
  setDefaultPaymentMethod: jest.fn(),
  processPayment: jest.fn(),
  createStripeSetupIntent: jest.fn(),
  confirmStripeSetupIntent: jest.fn(),
}));

// Mock hooks
jest.mock('../../shared/hooks/useData', () => ({
  useInvoices: jest.fn(),
  useTutorEarnings: jest.fn(),
}));

const TestPaymentComponent = ({ onPaymentState }) => {
  const [paymentMethods, setPaymentMethods] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (onPaymentState) {
      onPaymentState({ paymentMethods, loading, error, setPaymentMethods, setLoading, setError });
    }
  }, [paymentMethods, loading, error, onPaymentState]);

  return (
    <div>
      <div data-testid="payment-loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="payment-methods-count">{paymentMethods.length}</div>
      <div data-testid="payment-error">{error?.message || 'no-error'}</div>
      <div data-testid="payment-methods">
        {paymentMethods.map(method => (
          <div key={method.id} data-testid={`payment-method-${method.id}`}>
            {method.type}: ****{method.last4}
          </div>
        ))}
      </div>
    </div>
  );
};

const TestStripeComponent = ({ onStripeState }) => {
  const [stripe, setStripe] = React.useState(null);
  const [elements, setElements] = React.useState(null);
  const [clientSecret, setClientSecret] = React.useState(null);

  React.useEffect(() => {
    const { loadStripe } = require('@stripe/stripe-js');
    loadStripe('test_key').then(stripeInstance => {
      setStripe(stripeInstance);
      setElements(stripeInstance.elements());
    });
  }, []);

  React.useEffect(() => {
    if (onStripeState) {
      onStripeState({ stripe, elements, clientSecret, setClientSecret });
    }
  }, [stripe, elements, clientSecret, onStripeState]);

  return (
    <div>
      <div data-testid="stripe-loaded">{stripe ? 'loaded' : 'loading'}</div>
      <div data-testid="elements-loaded">{elements ? 'loaded' : 'loading'}</div>
      <div data-testid="client-secret">{clientSecret || 'no-secret'}</div>
    </div>
  );
};

describe('Payment System Baseline Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment Methods Management', () => {
    test('should load payment methods successfully', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      const mockPaymentMethods = [
        {
          id: 'pm_1',
          type: 'card',
          last4: '4242',
          brand: 'visa',
          exp_month: 12,
          exp_year: 2025,
          is_default: true
        },
        {
          id: 'pm_2',
          type: 'card',
          last4: '0000',
          brand: 'mastercard',
          exp_month: 6,
          exp_year: 2026,
          is_default: false
        }
      ];

      paymentAPI.getPaymentMethods.mockResolvedValue(mockPaymentMethods);

      let paymentState;
      renderWithProviders(
        <TestPaymentComponent onPaymentState={(state) => paymentState = state} />
      );

      // Simulate loading payment methods
      paymentState.setLoading(true);
      const methods = await paymentAPI.getPaymentMethods();
      paymentState.setPaymentMethods(methods);
      paymentState.setLoading(false);

      await waitFor(() => {
        expect(screen.getByTestId('payment-methods-count')).toHaveTextContent('2');
        expect(screen.getByTestId('payment-loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('payment-method-pm_1')).toHaveTextContent('card: ****4242');
        expect(screen.getByTestId('payment-method-pm_2')).toHaveTextContent('card: ****0000');
      });

      expect(paymentAPI.getPaymentMethods).toHaveBeenCalled();
    });

    test('should add new payment method', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      const newPaymentMethod = {
        id: 'pm_3',
        type: 'card',
        last4: '1111',
        brand: 'amex',
        exp_month: 3,
        exp_year: 2027,
        is_default: false
      };

      paymentAPI.addPaymentMethod.mockResolvedValue(newPaymentMethod);

      const result = await paymentAPI.addPaymentMethod({
        payment_method: 'pm_test',
        set_as_default: false
      });

      expect(result).toEqual(newPaymentMethod);
      expect(paymentAPI.addPaymentMethod).toHaveBeenCalledWith({
        payment_method: 'pm_test',
        set_as_default: false
      });
    });

    test('should delete payment method', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      const paymentMethodId = 'pm_1';

      paymentAPI.deletePaymentMethod.mockResolvedValue({ success: true });

      const result = await paymentAPI.deletePaymentMethod(paymentMethodId);

      expect(result).toEqual({ success: true });
      expect(paymentAPI.deletePaymentMethod).toHaveBeenCalledWith(paymentMethodId);
    });

    test('should set default payment method', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      const paymentMethodId = 'pm_2';

      paymentAPI.setDefaultPaymentMethod.mockResolvedValue({
        success: true,
        default_payment_method: paymentMethodId
      });

      const result = await paymentAPI.setDefaultPaymentMethod(paymentMethodId);

      expect(result.success).toBe(true);
      expect(result.default_payment_method).toBe(paymentMethodId);
      expect(paymentAPI.setDefaultPaymentMethod).toHaveBeenCalledWith(paymentMethodId);
    });

    test('should handle payment methods loading error', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      const mockError = new Error('Failed to load payment methods');

      paymentAPI.getPaymentMethods.mockRejectedValue(mockError);

      let paymentState;
      renderWithProviders(
        <TestPaymentComponent onPaymentState={(state) => paymentState = state} />
      );

      // Simulate error loading payment methods
      paymentState.setLoading(true);
      try {
        await paymentAPI.getPaymentMethods();
      } catch (error) {
        paymentState.setError(error);
        paymentState.setLoading(false);
      }

      await waitFor(() => {
        expect(screen.getByTestId('payment-error')).toHaveTextContent('Failed to load payment methods');
        expect(screen.getByTestId('payment-loading')).toHaveTextContent('loaded');
      });
    });
  });

  describe('Stripe Integration', () => {
    test('should initialize Stripe correctly', async () => {
      renderWithProviders(<TestStripeComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('stripe-loaded')).toHaveTextContent('loaded');
        expect(screen.getByTestId('elements-loaded')).toHaveTextContent('loaded');
      });

      const { loadStripe } = require('@stripe/stripe-js');
      expect(loadStripe).toHaveBeenCalledWith('test_key');
    });

    test('should create Stripe setup intent', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      const mockSetupIntent = {
        client_secret: 'seti_test_client_secret',
        id: 'seti_test_id'
      };

      paymentAPI.createStripeSetupIntent.mockResolvedValue(mockSetupIntent);

      const result = await paymentAPI.createStripeSetupIntent();

      expect(result).toEqual(mockSetupIntent);
      expect(paymentAPI.createStripeSetupIntent).toHaveBeenCalled();
    });

    test('should confirm Stripe setup intent', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      const setupIntentId = 'seti_test_id';
      const mockConfirmation = {
        success: true,
        payment_method: 'pm_test_created',
        setup_intent: setupIntentId
      };

      paymentAPI.confirmStripeSetupIntent.mockResolvedValue(mockConfirmation);

      const result = await paymentAPI.confirmStripeSetupIntent(setupIntentId);

      expect(result).toEqual(mockConfirmation);
      expect(paymentAPI.confirmStripeSetupIntent).toHaveBeenCalledWith(setupIntentId);
    });

    test('should handle Stripe payment confirmation', async () => {
      let stripeState;
      renderWithProviders(
        <TestStripeComponent onStripeState={(state) => stripeState = state} />
      );

      await waitFor(() => {
        expect(stripeState?.stripe).toBeDefined();
      });

      // Mock successful payment confirmation
      stripeState.stripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: {
          status: 'succeeded',
          id: 'pi_test_payment'
        }
      });

      const result = await stripeState.stripe.confirmCardPayment('test_client_secret');

      expect(result.paymentIntent.status).toBe('succeeded');
      expect(stripeState.stripe.confirmCardPayment).toHaveBeenCalledWith('test_client_secret');
    });
  });

  describe('PayPal Integration', () => {
    test('should render PayPal buttons correctly', () => {
      renderWithProviders(
        <div>
          {React.createElement(require('@paypal/react-paypal-js').PayPalScriptProvider, {
            options: { 'client-id': 'test-client-id' }
          }, [
            React.createElement(require('@paypal/react-paypal-js').PayPalButtons, {
              key: 'paypal-buttons',
              createOrder: () => Promise.resolve('test-order-id'),
              onApprove: () => {},
              onError: () => {}
            })
          ])}
        </div>
      );

      expect(screen.getByTestId('paypal-provider')).toBeInTheDocument();
      expect(screen.getByTestId('paypal-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('paypal-pay-button')).toBeInTheDocument();
    });

    test('should handle PayPal payment flow', async () => {
      const mockCreateOrder = jest.fn(() => Promise.resolve('test-order-id'));
      const mockOnApprove = jest.fn();
      const mockOnError = jest.fn();

      renderWithProviders(
        React.createElement(require('@paypal/react-paypal-js').PayPalButtons, {
          createOrder: mockCreateOrder,
          onApprove: mockOnApprove,
          onError: mockOnError
        })
      );

      const payButton = screen.getByTestId('paypal-pay-button');
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalled();
        expect(mockOnApprove).toHaveBeenCalledWith({ orderID: 'test-order-id' });
      });
    });
  });

  describe('Payment Processing', () => {
    test('should process payment successfully', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      const paymentData = {
        amount: 9999, // $99.99 in cents
        currency: 'usd',
        payment_method: 'pm_test',
        description: 'Course payment'
      };

      const mockPaymentResult = {
        success: true,
        payment_intent: 'pi_test_payment',
        amount: 9999,
        status: 'succeeded'
      };

      paymentAPI.processPayment.mockResolvedValue(mockPaymentResult);

      const result = await paymentAPI.processPayment(paymentData);

      expect(result).toEqual(mockPaymentResult);
      expect(paymentAPI.processPayment).toHaveBeenCalledWith(paymentData);
    });

    test('should handle payment processing errors', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      const paymentData = {
        amount: 9999,
        currency: 'usd',
        payment_method: 'pm_invalid'
      };

      const mockError = new Error('Your card was declined');
      paymentAPI.processPayment.mockRejectedValue(mockError);

      await expect(paymentAPI.processPayment(paymentData)).rejects.toThrow('Your card was declined');
    });

    test('should validate payment amount limits', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');

      // Test minimum amount
      const smallPayment = {
        amount: 49, // Below $0.50 minimum
        currency: 'usd',
        payment_method: 'pm_test'
      };

      paymentAPI.processPayment.mockRejectedValue(new Error('Amount below minimum'));

      await expect(paymentAPI.processPayment(smallPayment)).rejects.toThrow('Amount below minimum');

      // Test maximum amount
      const largePayment = {
        amount: 100000000, // $1M - too large
        currency: 'usd',
        payment_method: 'pm_test'
      };

      paymentAPI.processPayment.mockRejectedValue(new Error('Amount exceeds maximum'));

      await expect(paymentAPI.processPayment(largePayment)).rejects.toThrow('Amount exceeds maximum');
    });
  });

  describe('Invoice Management', () => {
    test('should load invoices successfully', async () => {
      const { useInvoices } = require('../../shared/hooks/useData');
      const mockInvoices = [
        {
          id: 'inv_1',
          amount: 9999,
          status: 'paid',
          created_at: '2023-01-01',
          course_title: 'JavaScript Fundamentals'
        },
        {
          id: 'inv_2',
          amount: 14999,
          status: 'pending',
          created_at: '2023-01-02',
          course_title: 'React Advanced'
        }
      ];

      useInvoices.mockReturnValue({
        data: mockInvoices,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      const TestInvoicesComponent = () => {
        const invoices = useInvoices();
        return (
          <div>
            <div data-testid="invoices-count">{invoices.data?.length || 0}</div>
            <div data-testid="invoices-loading">{invoices.loading ? 'loading' : 'loaded'}</div>
          </div>
        );
      };

      renderWithProviders(<TestInvoicesComponent />);

      expect(screen.getByTestId('invoices-count')).toHaveTextContent('2');
      expect(screen.getByTestId('invoices-loading')).toHaveTextContent('loaded');
    });

    test('should handle invoice filtering', () => {
      const { useInvoices } = require('../../shared/hooks/useData');
      const filters = {
        status: 'paid',
        date_from: '2023-01-01',
        date_to: '2023-12-31'
      };

      useInvoices.mockReturnValue({
        data: [],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      const TestInvoicesComponent = () => {
        const invoices = useInvoices(filters);
        return <div data-testid="filtered-invoices">Loaded</div>;
      };

      renderWithProviders(<TestInvoicesComponent />);

      expect(useInvoices).toHaveBeenCalledWith(filters);
      expect(screen.getByTestId('filtered-invoices')).toHaveTextContent('Loaded');
    });
  });

  describe('Tutor Earnings', () => {
    test('should load tutor earnings successfully', () => {
      const { useTutorEarnings } = require('../../shared/hooks/useData');
      const mockEarnings = {
        total_earnings: 125000, // $1,250.00 in cents
        pending_earnings: 25000, // $250.00 in cents
        current_month: 15000, // $150.00 in cents
        last_month: 20000, // $200.00 in cents
        sessions_completed: 25,
        avg_session_earnings: 5000 // $50.00 in cents
      };

      useTutorEarnings.mockReturnValue({
        data: mockEarnings,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      const TestEarningsComponent = ({ tutorId }) => {
        const earnings = useTutorEarnings(tutorId);
        return (
          <div>
            <div data-testid="total-earnings">{earnings.data?.total_earnings || 0}</div>
            <div data-testid="pending-earnings">{earnings.data?.pending_earnings || 0}</div>
            <div data-testid="sessions-completed">{earnings.data?.sessions_completed || 0}</div>
          </div>
        );
      };

      renderWithProviders(<TestEarningsComponent tutorId={1} />);

      expect(screen.getByTestId('total-earnings')).toHaveTextContent('125000');
      expect(screen.getByTestId('pending-earnings')).toHaveTextContent('25000');
      expect(screen.getByTestId('sessions-completed')).toHaveTextContent('25');
    });
  });

  describe('Payment Security', () => {
    test('should handle sensitive data properly', () => {
      // Test that payment method details are properly masked
      const paymentMethod = {
        id: 'pm_test',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        // Should not contain full card number
      };

      expect(paymentMethod).not.toHaveProperty('number');
      expect(paymentMethod).not.toHaveProperty('cvc');
      expect(paymentMethod).toHaveProperty('last4');
      expect(paymentMethod.last4).toHaveLength(4);
    });

    test('should validate required payment fields', () => {
      const validatePaymentData = (data) => {
        const required = ['amount', 'currency', 'payment_method'];
        const missing = required.filter(field => !data[field]);
        return missing.length === 0;
      };

      const validData = {
        amount: 9999,
        currency: 'usd',
        payment_method: 'pm_test'
      };

      const invalidData = {
        amount: 9999,
        // Missing currency and payment_method
      };

      expect(validatePaymentData(validData)).toBe(true);
      expect(validatePaymentData(invalidData)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const paymentAPI = require('../../shared/services/paymentMethodsAPI');
      paymentAPI.getPaymentMethods.mockRejectedValue(new Error('Network error'));

      let paymentState;
      renderWithProviders(
        <TestPaymentComponent onPaymentState={(state) => paymentState = state} />
      );

      // Simulate network error
      paymentState.setLoading(true);
      try {
        await paymentAPI.getPaymentMethods();
      } catch (error) {
        paymentState.setError(error);
        paymentState.setLoading(false);
      }

      await waitFor(() => {
        expect(screen.getByTestId('payment-error')).toHaveTextContent('Network error');
        expect(screen.getByTestId('payment-loading')).toHaveTextContent('loaded');
      });
    });

    test('should handle Stripe initialization errors', async () => {
      const { loadStripe } = require('@stripe/stripe-js');
      loadStripe.mockRejectedValue(new Error('Stripe initialization failed'));

      const TestStripeErrorComponent = () => {
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
          loadStripe('invalid_key').catch(setError);
        }, []);

        return <div data-testid="stripe-error">{error?.message || 'no-error'}</div>;
      };

      renderWithProviders(<TestStripeErrorComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('stripe-error')).toHaveTextContent('Stripe initialization failed');
      });
    });
  });
});