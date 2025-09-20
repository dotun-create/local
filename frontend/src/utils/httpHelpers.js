import axios from 'axios';

// Default configuration
export const HttpConfig = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Request interceptor for adding auth tokens
let authToken = null;
let refreshToken = null;

export const setAuthTokens = (accessToken, refreshTokenValue = null) => {
  authToken = accessToken;
  refreshToken = refreshTokenValue;
};

export const clearAuthTokens = () => {
  authToken = null;
  refreshToken = null;
};

export const getAuthToken = () => authToken;

// Create axios instance with default config
const createHttpClient = (config = {}) => {
  const client = axios.create({
    baseURL: config.baseURL || HttpConfig.BASE_URL,
    timeout: config.timeout || HttpConfig.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers
    }
  });

  // Request interceptor
  client.interceptors.request.use(
    (requestConfig) => {
      // Add auth token if available
      if (authToken) {
        requestConfig.headers.Authorization = `Bearer ${authToken}`;
      }

      // Add custom headers from config
      if (config.customHeaders) {
        Object.assign(requestConfig.headers, config.customHeaders);
      }

      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for handling common errors
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 (Unauthorized) with token refresh
      if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshResponse = await axios.post(`${HttpConfig.BASE_URL}/auth/refresh`, {
            refreshToken
          });

          const newAccessToken = refreshResponse.data.accessToken;
          setAuthTokens(newAccessToken, refreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          clearAuthTokens();
          // Redirect to login or handle refresh failure
          // console.error('Token refresh failed:', refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Main POST request helper function
export const makePostRequest = async (url, options = {}) => {
  try {
    const {
      body = null,
      headers = {},
      baseURL = null,
      timeout = null,
      auth = null,
      retry = true,
      validateStatus = null,
      onUploadProgress = null,
      signal = null
    } = options;

    // Create HTTP client with custom config
    const client = createHttpClient({
      baseURL,
      timeout,
      headers,
      customHeaders: auth ? { Authorization: auth } : undefined
    });

    // Prepare request config
    const requestConfig = {
      url,
      method: 'POST',
      ...(body && { data: body }),
      ...(validateStatus && { validateStatus }),
      ...(onUploadProgress && { onUploadProgress }),
      ...(signal && { signal })
    };

    // Execute request with retry logic
    let lastError;
    const maxRetries = retry ? HttpConfig.RETRY_ATTEMPTS : 1;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await client(requestConfig);

        return {
          success: true,
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          config: response.config
        };
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, HttpConfig.RETRY_DELAY * attempt));
      }
    }

    // Handle error response
    if (lastError.response) {
      return {
        success: false,
        error: lastError.response.data?.message || lastError.message,
        status: lastError.response.status,
        statusText: lastError.response.statusText,
        data: lastError.response.data,
        headers: lastError.response.headers
      };
    }

    // Handle network or other errors
    return {
      success: false,
      error: lastError.message || 'Network error occurred',
      code: lastError.code,
      isNetworkError: lastError.code === 'NETWORK_ERROR',
      isTimeoutError: lastError.code === 'ECONNABORTED'
    };

  } catch (error) {
    // console.error('POST request helper error:', error);
    return {
      success: false,
      error: 'Unexpected error occurred',
      originalError: error
    };
  }
};

// Specialized POST request variants
export const postJSON = async (url, jsonData, options = {}) => {
  return makePostRequest(url, {
    ...options,
    body: jsonData,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};

export const postFormData = async (url, formData, options = {}) => {
  return makePostRequest(url, {
    ...options,
    body: formData,
    headers: {
      // Don't set Content-Type for FormData, let browser set it with boundary
      ...options.headers
    }
  });
};

export const postURLEncoded = async (url, data, options = {}) => {
  const urlEncodedData = new URLSearchParams(data);
  
  return makePostRequest(url, {
    ...options,
    body: urlEncodedData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers
    }
  });
};

export const postWithAuth = async (url, body, token, options = {}) => {
  return makePostRequest(url, {
    ...options,
    body,
    auth: `Bearer ${token}`
  });
};

export const postWithFiles = async (url, files, additionalData = {}, options = {}) => {
  const formData = new FormData();
  
  // Add files
  if (Array.isArray(files)) {
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });
  } else if (files instanceof File) {
    formData.append('file', files);
  } else {
    Object.entries(files).forEach(([key, file]) => {
      formData.append(key, file);
    });
  }

  // Add additional data
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
  });

  return postFormData(url, formData, options);
};

// Utility functions
export const createFormData = (data) => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        formData.append(`${key}[${index}]`, item);
      });
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value);
    }
  });

  return formData;
};

export const buildQueryString = (params) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, value);
    }
  });

  return queryParams.toString();
};

// Request cancellation helper
export const createCancelToken = () => {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: (reason = 'Request cancelled') => controller.abort(reason)
  };
};

// Rate limiting helper
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 1000) {
    this.requests = [];
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  async canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.canMakeRequest();
    }

    this.requests.push(now);
    return true;
  }
}

export const createRateLimiter = (maxRequests, timeWindow) => {
  return new RateLimiter(maxRequests, timeWindow);
};

// Batch request helper
export const batchPostRequests = async (requests, options = {}) => {
  const { 
    concurrent = 5, 
    delay = 0,
    stopOnError = false 
  } = options;

  const results = [];
  const errors = [];

  for (let i = 0; i < requests.length; i += concurrent) {
    const batch = requests.slice(i, i + concurrent);
    
    const batchPromises = batch.map(async (request) => {
      try {
        const result = await makePostRequest(request.url, request.options);
        return { success: true, result, request };
      } catch (error) {
        const errorResult = { success: false, error, request };
        if (stopOnError) {
          throw errorResult;
        }
        return errorResult;
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });

      // Add delay between batches
      if (delay > 0 && i + concurrent < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } catch (error) {
      if (stopOnError) {
        return {
          success: false,
          results,
          errors: [...errors, error],
          completed: results.length,
          total: requests.length
        };
      }
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
    completed: results.length,
    total: requests.length
  };
};

// Health check helper
export const healthCheck = async (endpoint = '/health') => {
  try {
    const result = await makePostRequest(endpoint, {
      timeout: 5000,
      retry: false
    });

    return {
      healthy: result.success,
      status: result.status,
      responseTime: Date.now(),
      data: result.data
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      responseTime: Date.now()
    };
  }
};

export default {
  makePostRequest,
  postJSON,
  postFormData,
  postURLEncoded,
  postWithAuth,
  postWithFiles,
  createFormData,
  buildQueryString,
  createCancelToken,
  createRateLimiter,
  batchPostRequests,
  healthCheck,
  setAuthTokens,
  clearAuthTokens,
  getAuthToken
};