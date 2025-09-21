class HttpClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.interceptors = {
      request: [],
      response: [],
    };
  }

  setBaseURL(url) {
    this.baseURL = url;
  }

  setDefaultHeader(key, value) {
    this.defaultHeaders[key] = value;
  }

  removeDefaultHeader(key) {
    delete this.defaultHeaders[key];
  }

  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
  }

  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
  }

  async request(url, options = {}) {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    let config = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    // Apply request interceptors
    for (const interceptor of this.interceptors.request) {
      config = await interceptor(config);
    }

    try {
      let response = await fetch(fullURL, config);

      // Apply response interceptors
      for (const interceptor of this.interceptors.response) {
        response = await interceptor(response);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      console.error('HTTP Request failed:', error);
      throw error;
    }
  }

  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  upload(url, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        ...options.headers,
        // Remove Content-Type to let browser set it with boundary
      },
    });
  }
}

// Create a default instance
const httpClient = new HttpClient(process.env.REACT_APP_API_BASE_URL || '');

// Add auth token interceptor
httpClient.addRequestInterceptor(async (config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response error interceptor
httpClient.addResponseInterceptor(async (response) => {
  if (response.status === 401) {
    // Handle unauthorized - redirect to login
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
  return response;
});

export default httpClient;