/**
 * Payment Feature Routes
 * Routes for payment processing, billing, and financial management
 */

import { createLazyComponent, PageLoadingFallback } from '../../utils/lazyLoader';

// Create lazy-loaded payment components
const createPaymentComponent = (importFunction, pageName) => {
  return createLazyComponent(importFunction, {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackComponent: () => <PageLoadingFallback title={`Loading ${pageName}...`} />,
    preload: false
  });
};

export const PaymentComponents = {
  PaymentsPage: createPaymentComponent(
    () => import('../../../components/payments/PaymentsPage'),
    'Payments'
  ),
  BillingPage: createPaymentComponent(
    () => import('../../../components/billing/BillingPage'),
    'Billing'
  ),
  InvoicesPage: createPaymentComponent(
    () => import('../../../components/billing/InvoicesPage'),
    'Invoices'
  ),
  SubscriptionPage: createPaymentComponent(
    () => import('../../../components/subscription/SubscriptionPage'),
    'Subscription'
  ),
  PaymentMethodsPage: createPaymentComponent(
    () => import('../../../components/payments/PaymentMethodsPage'),
    'Payment Methods'
  ),
  RefundsPage: createPaymentComponent(
    () => import('../../../components/payments/RefundsPage'),
    'Refunds'
  ),
  SessionBookingDemo: createPaymentComponent(
    () => import('../../../components/misc/SessionBookingDemo'),
    'Session Booking'
  ),
  CheckoutPage: createPaymentComponent(
    () => import('../../../components/checkout/CheckoutPage'),
    'Checkout'
  ),
  PaymentSuccessPage: createPaymentComponent(
    () => import('../../../components/payments/PaymentSuccessPage'),
    'Payment Success'
  ),
  PaymentFailedPage: createPaymentComponent(
    () => import('../../../components/payments/PaymentFailedPage'),
    'Payment Failed'
  )
};

export const paymentRoutes = [
  {
    path: '/payments',
    element: PaymentComponents.PaymentsPage,
    title: 'Payments',
    description: 'Manage your payments and transaction history',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/billing',
    element: PaymentComponents.BillingPage,
    title: 'Billing',
    description: 'View and manage your billing information',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/invoices',
    element: PaymentComponents.InvoicesPage,
    title: 'Invoices',
    description: 'View and download your invoices',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/subscription',
    element: PaymentComponents.SubscriptionPage,
    title: 'Subscription',
    description: 'Manage your subscription plan and billing',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/payment-methods',
    element: PaymentComponents.PaymentMethodsPage,
    title: 'Payment Methods',
    description: 'Manage your saved payment methods',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/refunds',
    element: PaymentComponents.RefundsPage,
    title: 'Refunds',
    description: 'Request and track refunds',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/session-booking',
    element: PaymentComponents.SessionBookingDemo,
    title: 'Session Booking',
    description: 'Book and pay for tutoring sessions',
    isPublic: false,
    requiresAuth: true,
    roles: ['student', 'guardian'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/checkout',
    element: PaymentComponents.CheckoutPage,
    title: 'Checkout',
    description: 'Complete your purchase',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/checkout/:itemId',
    element: PaymentComponents.CheckoutPage,
    title: 'Checkout',
    description: 'Complete your purchase',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/payment/success',
    element: PaymentComponents.PaymentSuccessPage,
    title: 'Payment Successful',
    description: 'Your payment has been processed successfully',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/payment/failed',
    element: PaymentComponents.PaymentFailedPage,
    title: 'Payment Failed',
    description: 'There was an issue processing your payment',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  }
];

export default paymentRoutes;