/**
 * Payments feature barrel export
 * Centralized exports for payment functionality
 */

// Modern Components
export { default as PaymentGateway } from './components/PaymentGateway';
export { default as PaymentMethodsList } from './components/PaymentMethodsList';
export { default as AddPaymentMethodModal } from './components/AddPaymentMethodModal';
export { default as PaymentHistory } from './components/PaymentHistory';

// Legacy Components (for backward compatibility during migration)
export { default as PaymentsPage } from './components/PaymentsPage';
export { default as AddPaymentMethodModalStripe } from './components/AddPaymentMethodModalStripe';
export { default as WorkingStripeModal } from './components/WorkingStripeModal';

// Stripe Components
export { default as StripeTest } from './components/StripeTest';
export { default as StripeDebug } from './components/StripeDebug';
export { default as SimpleStripeTest } from './components/SimpleStripeTest';

// Invoice Components
export { default as InvoiceList } from './components/InvoiceList';
export { default as AdminInvoiceList } from './components/AdminInvoiceList';
export { default as InvoiceStatsCard } from './components/InvoiceStatsCard';

// Hooks (to be created)
// export { usePaymentMethods } from './hooks/usePaymentMethods';
// export { usePaymentProcessing } from './hooks/usePaymentProcessing';
// export { useInvoices } from './hooks/useInvoices';
// export { useStripe } from './hooks/useStripe';

// Services
export { default as paymentService } from './services/paymentService';
// export { default as stripeService } from './services/stripeService';
// export { default as invoiceService } from './services/invoiceService';

// Utils (to be created)
// export { formatCurrency, validatePaymentData, calculateTax } from './utils/paymentUtils';

// Types (when implementing TypeScript)
// export type { PaymentMethod, Payment, Invoice, StripeConfig } from './types';