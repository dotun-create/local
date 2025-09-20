import { useState, useCallback } from 'react';

/**
 * Custom hook for handling errors with retry functionality
 * @param {Function} onError - Optional error callback
 * @returns {Object} Error handling utilities
 */
export const useErrorHandler = (onError = null) => {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  const handleError = useCallback((err, context = {}) => {
    console.error('Error occurred:', err, context);
    
    // Extract user-friendly message
    let userMessage = 'An unexpected error occurred';
    
    if (err.response?.data?.message) {
      userMessage = err.response.data.message;
    } else if (err.message) {
      userMessage = err.message;
    }

    const errorObj = {
      message: userMessage,
      originalError: err,
      context,
      timestamp: new Date().toISOString()
    };

    setError(errorObj);

    // Call optional error callback
    if (onError) {
      onError(errorObj);
    }

    // Report to monitoring service if available
    if (window.reportError) {
      window.reportError(err, context);
    }
  }, [onError]);

  const retry = useCallback(async (asyncFunction, maxRetries = 3) => {
    if (retryCount >= maxRetries) {
      handleError(new Error('Maximum retry attempts exceeded'));
      return null;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      const result = await asyncFunction();
      clearError();
      return result;
    } catch (err) {
      handleError(err, { retryAttempt: retryCount + 1 });
      return null;
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, handleError, clearError]);

  const withErrorHandling = useCallback((asyncFunction) => {
    return async (...args) => {
      try {
        clearError();
        return await asyncFunction(...args);
      } catch (err) {
        handleError(err);
        throw err; // Re-throw for caller to handle if needed
      }
    };
  }, [clearError, handleError]);

  return {
    error,
    retryCount,
    isRetrying,
    clearError,
    handleError,
    retry,
    withErrorHandling,
    hasError: error !== null,
    canRetry: retryCount < 3
  };
};

/**
 * Hook for handling API errors specifically
 */
export const useApiErrorHandler = () => {
  const errorHandler = useErrorHandler();

  const handleApiError = useCallback((err, context = {}) => {
    // Enhanced API error handling
    let userMessage = 'Failed to connect to the server';
    let errorCode = 'UNKNOWN_ERROR';

    if (err.response) {
      // Server responded with error status
      const { status, data } = err.response;
      
      switch (status) {
        case 400:
          userMessage = data.message || 'Invalid request';
          errorCode = 'BAD_REQUEST';
          break;
        case 401:
          userMessage = 'Authentication required';
          errorCode = 'UNAUTHORIZED';
          break;
        case 403:
          userMessage = 'You do not have permission to perform this action';
          errorCode = 'FORBIDDEN';
          break;
        case 404:
          userMessage = 'The requested resource was not found';
          errorCode = 'NOT_FOUND';
          break;
        case 409:
          userMessage = data.message || 'Conflict with existing data';
          errorCode = 'CONFLICT';
          break;
        case 422:
          userMessage = 'Validation failed';
          errorCode = 'VALIDATION_ERROR';
          break;
        case 500:
          userMessage = 'Internal server error. Please try again later.';
          errorCode = 'SERVER_ERROR';
          break;
        default:
          userMessage = data.message || `Server error (${status})`;
          errorCode = `HTTP_${status}`;
      }
    } else if (err.request) {
      // Network error
      userMessage = 'Unable to connect to the server. Please check your internet connection.';
      errorCode = 'NETWORK_ERROR';
    }

    errorHandler.handleError(err, { ...context, errorCode, userMessage });
  }, [errorHandler]);

  return {
    ...errorHandler,
    handleApiError
  };
};

export default useErrorHandler;
