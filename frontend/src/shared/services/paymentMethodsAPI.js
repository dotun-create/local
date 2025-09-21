// API Service Layer for Payment Methods
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';

// Generic API request helper for payment methods
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = sessionStorage.getItem('authToken');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    // console.log(`Payment Methods API Request: ${options.method || 'GET'} ${url}`);
    if (options.body) {
      // console.log('Request body:', options.body);
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      // console.error(`Payment Methods API Error: ${response.status} ${response.statusText}`, errorText);
      
      if (response.status === 401) {
        // console.error('Authentication failed - user may not be logged in');
      } else if (response.status === 403) {
        console.error('Access forbidden - user may not be a guardian');
      }
      
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log('Payment Methods API Response:', result);
      return result;
    }
    
    return response;
  } catch (error) {
    console.error('Payment Methods API Request failed:', error);
    throw error;
  }
};

class PaymentMethodsAPI {
  // Get all saved payment methods for current user
  async getPaymentMethods() {
    try {
      const response = await apiRequest('/payment-methods');
      return response;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  // Create a new payment method (for non-Stripe methods like PayPal, Bank)
  async createPaymentMethod(paymentMethodData) {
    try {
      const response = await apiRequest('/payment-methods', {
        method: 'POST',
        body: JSON.stringify(paymentMethodData)
      });
      return response;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  // Delete a saved payment method
  async deletePaymentMethod(methodId) {
    try {
      const response = await apiRequest(`/payment-methods/${methodId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  // Set a payment method as default
  async setDefaultPaymentMethod(methodId) {
    try {
      const response = await apiRequest(`/payment-methods/${methodId}/set-default`, {
        method: 'POST'
      });
      return response;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  // Update payment method (nickname only)
  async updatePaymentMethod(methodId, updateData) {
    try {
      const response = await apiRequest(`/payment-methods/${methodId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      return response;
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  }

  // Stripe-specific methods

  // Create SetupIntent for saving cards without payment
  async createSetupIntent() {
    try {
      const response = await apiRequest('/payment/stripe/create-setup-intent', {
        method: 'POST'
      });
      return response;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  // Confirm SetupIntent and save the payment method
  async confirmSetupIntent(setupIntentData) {
    try {
      const response = await apiRequest('/payment/stripe/confirm-setup-intent', {
        method: 'POST',
        body: JSON.stringify(setupIntentData)
      });
      return response;
    } catch (error) {
      console.error('Error confirming setup intent:', error);
      throw error;
    }
  }

  // Charge a saved payment method
  async chargeSavedCard(chargeData) {
    try {
      const response = await apiRequest('/payment/stripe/charge-saved-card', {
        method: 'POST',
        body: JSON.stringify(chargeData)
      });
      return response;
    } catch (error) {
      console.error('Error charging saved card:', error);
      throw error;
    }
  }

  // Get payment history for current user
  async getPaymentHistory(userId) {
    try {
      const response = await apiRequest(`/credits/history/${userId}`);
      return response;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }
}

export default new PaymentMethodsAPI();