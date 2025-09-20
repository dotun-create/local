import axios from 'axios';

export const PaymentConfig = {
  STRIPE_PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here',
  PAYPAL_CLIENT_ID: process.env.REACT_APP_PAYPAL_CLIENT_ID || 'your_paypal_client_id',
  PAYPAL_PLAN_ID: process.env.REACT_APP_PAYPAL_PLAN_ID || 'your_plan_id',
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || '/api'
};

export const PaymentTypes = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
  SCHEDULED: 'scheduled'
};

export const PaymentGateways = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal'
};

export const RecurringPeriods = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year'
};

export const createPaymentIntent = async (paymentData) => {
  try {
    const response = await axios.post(`${PaymentConfig.API_BASE_URL}/payment/create-intent`, paymentData);
    return response.data;
  } catch (error) {
    // console.error('Error creating payment intent:', error);
    throw error;
  }
};

export const createSubscription = async (subscriptionData) => {
  try {
    const response = await axios.post(`${PaymentConfig.API_BASE_URL}/payment/create-subscription`, subscriptionData);
    return response.data;
  } catch (error) {
    // console.error('Error creating subscription:', error);
    throw error;
  }
};

export const schedulePayment = async (scheduleData) => {
  try {
    const response = await axios.post(`${PaymentConfig.API_BASE_URL}/payment/schedule`, scheduleData);
    return response.data;
  } catch (error) {
    // console.error('Error scheduling payment:', error);
    throw error;
  }
};

export const getPaymentHistory = async (userId) => {
  try {
    const response = await axios.get(`${PaymentConfig.API_BASE_URL}/payment/history/${userId}`);
    return response.data;
  } catch (error) {
    // console.error('Error fetching payment history:', error);
    throw error;
  }
};

export const cancelSubscription = async (subscriptionId, gateway) => {
  try {
    const response = await axios.post(`${PaymentConfig.API_BASE_URL}/payment/cancel-subscription`, {
      subscriptionId,
      gateway
    });
    return response.data;
  } catch (error) {
    // console.error('Error canceling subscription:', error);
    throw error;
  }
};

export const updateSubscription = async (subscriptionId, gateway, updateData) => {
  try {
    const response = await axios.put(`${PaymentConfig.API_BASE_URL}/payment/update-subscription`, {
      subscriptionId,
      gateway,
      ...updateData
    });
    return response.data;
  } catch (error) {
    // console.error('Error updating subscription:', error);
    throw error;
  }
};

export const validatePaymentAmount = (amount) => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount > 0;
};

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const calculateRecurringTotal = (amount, interval, period, cycles = null) => {
  if (!cycles) return null;
  return amount * interval * cycles;
};

export const getNextPaymentDate = (lastPaymentDate, interval, period) => {
  const date = new Date(lastPaymentDate);
  
  switch (period) {
    case RecurringPeriods.DAY:
      date.setDate(date.getDate() + interval);
      break;
    case RecurringPeriods.WEEK:
      date.setDate(date.getDate() + (interval * 7));
      break;
    case RecurringPeriods.MONTH:
      date.setMonth(date.getMonth() + interval);
      break;
    case RecurringPeriods.YEAR:
      date.setFullYear(date.getFullYear() + interval);
      break;
    default:
      throw new Error('Invalid recurring period');
  }
  
  return date;
};

export const isPaymentGatewayAvailable = (gateway) => {
  switch (gateway) {
    case PaymentGateways.STRIPE:
      return !!PaymentConfig.STRIPE_PUBLISHABLE_KEY && PaymentConfig.STRIPE_PUBLISHABLE_KEY !== 'pk_test_your_key_here';
    case PaymentGateways.PAYPAL:
      return !!PaymentConfig.PAYPAL_CLIENT_ID && PaymentConfig.PAYPAL_CLIENT_ID !== 'your_paypal_client_id';
    default:
      return false;
  }
};

export const PaymentIntegrationMethods = {
  integrateWithCourseCard: (courseCardComponent, paymentOptions) => {
    return {
      ...courseCardComponent,
      onEnroll: () => {
        return {
          amount: courseCardComponent.courseCost,
          description: `Enrollment for ${courseCardComponent.courseTitle}`,
          ...paymentOptions
        };
      }
    };
  },

  integrateWithSubscription: (subscriptionPlan, customOptions = {}) => {
    return {
      amount: subscriptionPlan.price,
      currency: subscriptionPlan.currency || 'USD',
      description: subscriptionPlan.name,
      enableRecurring: true,
      recurringPeriod: subscriptionPlan.billingPeriod || 'month',
      recurringInterval: subscriptionPlan.billingInterval || 1,
      ...customOptions
    };
  },

  integrateWithEvent: (eventData, paymentCallback) => {
    return {
      onSuccess: (paymentResult) => {
        if (paymentCallback && typeof paymentCallback.onSuccess === 'function') {
          paymentCallback.onSuccess(paymentResult);
        }
        // console.log('Payment successful for event:', eventData.name);
      },
      onError: (error) => {
        if (paymentCallback && typeof paymentCallback.onError === 'function') {
          paymentCallback.onError(error);
        }
        // console.error('Payment failed for event:', eventData.name, error);
      }
    };
  }
};