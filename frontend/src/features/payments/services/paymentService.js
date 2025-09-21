import { apiClient } from '@shared/services/apiClient';

class PaymentService {
  // Payment methods management
  async getPaymentMethods() {
    const response = await apiClient.get('/payment-methods');
    return response.data;
  }

  async addPaymentMethod(paymentMethodData) {
    const response = await apiClient.post('/payment-methods', paymentMethodData);
    return response.data;
  }

  async deletePaymentMethod(methodId) {
    const response = await apiClient.delete(`/payment-methods/${methodId}`);
    return response.data;
  }

  async setDefaultPaymentMethod(methodId) {
    const response = await apiClient.patch(`/payment-methods/${methodId}/set-default`);
    return response.data;
  }

  async updatePaymentMethod(methodId, updates) {
    const response = await apiClient.patch(`/payment-methods/${methodId}`, updates);
    return response.data;
  }

  // Payment processing
  async createPaymentIntent(paymentData) {
    const response = await apiClient.post('/payments/create-intent', paymentData);
    return response.data;
  }

  async confirmPayment(paymentIntentId, confirmationData) {
    const response = await apiClient.post(`/payments/${paymentIntentId}/confirm`, confirmationData);
    return response.data;
  }

  async processPayment(paymentData) {
    const response = await apiClient.post('/payments/process', paymentData);
    return response.data;
  }

  // Subscription management
  async createSubscription(subscriptionData) {
    const response = await apiClient.post('/payments/subscriptions', subscriptionData);
    return response.data;
  }

  async updateSubscription(subscriptionId, updates) {
    const response = await apiClient.patch(`/payments/subscriptions/${subscriptionId}`, updates);
    return response.data;
  }

  async cancelSubscription(subscriptionId, reason = null) {
    const response = await apiClient.delete(`/payments/subscriptions/${subscriptionId}`, {
      data: { reason }
    });
    return response.data;
  }

  async getSubscriptions() {
    const response = await apiClient.get('/payments/subscriptions');
    return response.data;
  }

  async getSubscription(subscriptionId) {
    const response = await apiClient.get(`/payments/subscriptions/${subscriptionId}`);
    return response.data;
  }

  // Payment history
  async getPaymentHistory(params = {}) {
    const response = await apiClient.get('/payments/history', { params });
    return response.data;
  }

  async getPayment(paymentId) {
    const response = await apiClient.get(`/payments/${paymentId}`);
    return response.data;
  }

  // Invoices
  async getInvoices(params = {}) {
    const response = await apiClient.get('/payments/invoices', { params });
    return response.data;
  }

  async getInvoice(invoiceId) {
    const response = await apiClient.get(`/payments/invoices/${invoiceId}`);
    return response.data;
  }

  async downloadInvoice(invoiceId) {
    const response = await apiClient.get(`/payments/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async markInvoiceAsPaid(invoiceId, paymentData) {
    const response = await apiClient.post(`/payments/invoices/${invoiceId}/mark-paid`, paymentData);
    return response.data;
  }

  // Refunds
  async createRefund(paymentId, refundData) {
    const response = await apiClient.post(`/payments/${paymentId}/refund`, refundData);
    return response.data;
  }

  async getRefunds(params = {}) {
    const response = await apiClient.get('/payments/refunds', { params });
    return response.data;
  }

  // Payment gateway specific methods

  // Stripe
  async createStripeSetupIntent() {
    const response = await apiClient.post('/payments/stripe/setup-intent');
    return response.data;
  }

  async confirmStripeSetupIntent(setupIntentId, paymentMethodData) {
    const response = await apiClient.post('/payments/stripe/confirm-setup-intent', {
      setupIntentId,
      paymentMethodData
    });
    return response.data;
  }

  async getStripeConfig() {
    const response = await apiClient.get('/payments/stripe/config');
    return response.data;
  }

  // PayPal
  async createPayPalOrder(orderData) {
    const response = await apiClient.post('/payments/paypal/create-order', orderData);
    return response.data;
  }

  async capturePayPalOrder(orderId) {
    const response = await apiClient.post(`/payments/paypal/capture-order/${orderId}`);
    return response.data;
  }

  // Apple Pay
  async createApplePaySession(merchantValidationURL) {
    const response = await apiClient.post('/payments/apple-pay/validate-merchant', {
      validationURL: merchantValidationURL
    });
    return response.data;
  }

  async processApplePayPayment(paymentData) {
    const response = await apiClient.post('/payments/apple-pay/process', paymentData);
    return response.data;
  }

  // Google Pay
  async createGooglePayPaymentIntent(paymentData) {
    const response = await apiClient.post('/payments/google-pay/create-intent', paymentData);
    return response.data;
  }

  async processGooglePayPayment(paymentToken, paymentData) {
    const response = await apiClient.post('/payments/google-pay/process', {
      paymentToken,
      ...paymentData
    });
    return response.data;
  }

  // Credits and wallet
  async getCreditBalance() {
    const response = await apiClient.get('/payments/credits/balance');
    return response.data;
  }

  async addCredits(amount, paymentMethodId) {
    const response = await apiClient.post('/payments/credits/add', {
      amount,
      paymentMethodId
    });
    return response.data;
  }

  async useCredits(amount, description) {
    const response = await apiClient.post('/payments/credits/use', {
      amount,
      description
    });
    return response.data;
  }

  async getCreditHistory(params = {}) {
    const response = await apiClient.get('/payments/credits/history', { params });
    return response.data;
  }

  // Payment analytics (for tutors/admin)
  async getPaymentAnalytics(period = 'month') {
    const response = await apiClient.get('/payments/analytics', {
      params: { period }
    });
    return response.data;
  }

  async getRevenueStats(params = {}) {
    const response = await apiClient.get('/payments/revenue-stats', { params });
    return response.data;
  }

  // Disputes and chargebacks
  async getDisputes(params = {}) {
    const response = await apiClient.get('/payments/disputes', { params });
    return response.data;
  }

  async respondToDispute(disputeId, response) {
    const apiResponse = await apiClient.post(`/payments/disputes/${disputeId}/respond`, response);
    return apiResponse.data;
  }

  // Payment verification
  async verifyPayment(paymentId) {
    const response = await apiClient.post(`/payments/${paymentId}/verify`);
    return response.data;
  }

  // Scheduled payments
  async schedulePayment(scheduleData) {
    const response = await apiClient.post('/payments/schedule', scheduleData);
    return response.data;
  }

  async getScheduledPayments() {
    const response = await apiClient.get('/payments/scheduled');
    return response.data;
  }

  async cancelScheduledPayment(scheduledPaymentId) {
    const response = await apiClient.delete(`/payments/scheduled/${scheduledPaymentId}`);
    return response.data;
  }

  // Payment configuration
  async getPaymentConfig() {
    const response = await apiClient.get('/payments/config');
    return response.data;
  }

  async updatePaymentConfig(config) {
    const response = await apiClient.patch('/payments/config', config);
    return response.data;
  }

  // Utility methods
  validatePaymentAmount(amount) {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0;
  }

  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  calculateTax(amount, taxRate) {
    return amount * (taxRate / 100);
  }

  calculateTotal(amount, taxRate = 0, discount = 0) {
    const subtotal = amount - discount;
    const tax = this.calculateTax(subtotal, taxRate);
    return subtotal + tax;
  }

  getPaymentStatusColor(status) {
    const statusColors = {
      pending: 'var(--color-warning)',
      processing: 'var(--color-info)',
      succeeded: 'var(--color-success)',
      failed: 'var(--color-danger)',
      cancelled: 'var(--color-text-secondary)',
      refunded: 'var(--color-warning)'
    };
    return statusColors[status] || statusColors.pending;
  }

  getPaymentStatusIcon(status) {
    const statusIcons = {
      pending: '⏳',
      processing: '🔄',
      succeeded: '✅',
      failed: '❌',
      cancelled: '⏹️',
      refunded: '↩️'
    };
    return statusIcons[status] || statusIcons.pending;
  }
}

export const paymentService = new PaymentService();
export default paymentService;