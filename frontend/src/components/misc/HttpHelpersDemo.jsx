import React, { useState } from 'react';
import { 
  makePostRequest, 
  postJSON, 
  postFormData, 
  postWithFiles,
  createCancelToken,
  setAuthTokens,
  clearAuthTokens 
} from '../../utils/httpHelpers';
import './css/HttpHelpersDemo.css';

const HttpHelpersDemo = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState('');

  const addResult = (result) => {
    setResults(prev => [{
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      ...result
    }, ...prev]);
  };

  // Demo 1: Basic JSON POST
  const handleBasicPost = async () => {
    setIsLoading(true);
    try {
      const result = await postJSON('https://jsonplaceholder.typicode.com/posts', {
        title: 'Demo Post',
        body: 'This is a demo post from HTTP helpers',
        userId: 1
      });

      addResult({
        type: 'Basic JSON POST',
        success: result.success,
        data: result.data,
        error: result.error
      });
    } catch (error) {
      addResult({
        type: 'Basic JSON POST',
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo 2: POST with custom headers
  const handlePostWithHeaders = async () => {
    setIsLoading(true);
    try {
      const result = await makePostRequest('https://httpbin.org/post', {
        body: { message: 'Hello with custom headers' },
        headers: {
          'X-Custom-Header': 'demo-value',
          'X-Client-Version': '1.0.0'
        }
      });

      addResult({
        type: 'POST with Custom Headers',
        success: result.success,
        data: result.data,
        error: result.error
      });
    } catch (error) {
      addResult({
        type: 'POST with Custom Headers',
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo 3: File upload simulation
  const handleFileUpload = async () => {
    setIsLoading(true);
    try {
      // Create a mock file
      const mockFile = new Blob(['Demo file content'], { type: 'text/plain' });
      const file = new File([mockFile], 'demo.txt', { type: 'text/plain' });

      const result = await postWithFiles('https://httpbin.org/post', 
        file, 
        { 
          title: 'Demo Upload',
          category: 'test' 
        },
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // console.log(`Upload Progress: ${progress}%`);
          }
        }
      );

      addResult({
        type: 'File Upload',
        success: result.success,
        data: result.data?.files || result.data,
        error: result.error
      });
    } catch (error) {
      addResult({
        type: 'File Upload',
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo 4: Request with authentication
  const handleAuthRequest = async () => {
    if (!authToken.trim()) {
      alert('Please enter an auth token first');
      return;
    }

    setIsLoading(true);
    try {
      // Set the auth token globally
      setAuthTokens(authToken);

      const result = await makePostRequest('https://httpbin.org/post', {
        body: { protected: 'data' }
      });

      addResult({
        type: 'Authenticated Request',
        success: result.success,
        data: result.data,
        error: result.error
      });
    } catch (error) {
      addResult({
        type: 'Authenticated Request',
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo 5: Request with timeout and retry
  const handleTimeoutRequest = async () => {
    setIsLoading(true);
    try {
      const result = await makePostRequest('https://httpbin.org/delay/2', {
        body: { test: 'timeout demo' },
        timeout: 1000, // 1 second timeout
        retry: true
      });

      addResult({
        type: 'Timeout/Retry Request',
        success: result.success,
        data: result.data,
        error: result.error
      });
    } catch (error) {
      addResult({
        type: 'Timeout/Retry Request',
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo 6: Cancellable request
  const handleCancellableRequest = async () => {
    setIsLoading(true);
    const { signal, cancel } = createCancelToken();

    // Cancel after 2 seconds
    setTimeout(() => {
      cancel('Request cancelled by user');
    }, 2000);

    try {
      const result = await makePostRequest('https://httpbin.org/delay/5', {
        body: { test: 'cancellable request' },
        signal
      });

      addResult({
        type: 'Cancellable Request',
        success: result.success,
        data: result.data,
        error: result.error
      });
    } catch (error) {
      addResult({
        type: 'Cancellable Request',
        success: false,
        error: error.name === 'AbortError' ? 'Request was cancelled' : error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo 7: Error handling
  const handleErrorRequest = async () => {
    setIsLoading(true);
    try {
      const result = await makePostRequest('https://httpbin.org/status/400', {
        body: { test: 'error demo' }
      });

      addResult({
        type: 'Error Handling Demo',
        success: result.success,
        data: result.data,
        error: result.error,
        status: result.status
      });
    } catch (error) {
      addResult({
        type: 'Error Handling Demo',
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const clearAuth = () => {
    clearAuthTokens();
    setAuthToken('');
    addResult({
      type: 'Auth Management',
      success: true,
      data: { message: 'Authentication tokens cleared' }
    });
  };

  return (
    <div className="http-helpers-demo">
      <div className="demo-header">
        <h1>HTTP POST Helpers Demo</h1>
        <p>Interactive demonstration of HTTP helper functions</p>
      </div>

      <div className="demo-controls">
        <div className="auth-section">
          <h3>Authentication</h3>
          <div className="auth-controls">
            <input
              type="text"
              placeholder="Enter auth token (optional)"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="auth-input"
            />
            <button onClick={clearAuth} className="clear-auth-btn">
              Clear Auth
            </button>
          </div>
        </div>

        <div className="demo-buttons">
          <h3>Demo Requests</h3>
          <div className="button-grid">
            <button 
              onClick={handleBasicPost} 
              disabled={isLoading}
              className="demo-btn basic"
            >
              Basic JSON POST
            </button>

            <button 
              onClick={handlePostWithHeaders} 
              disabled={isLoading}
              className="demo-btn headers"
            >
              POST with Headers
            </button>

            <button 
              onClick={handleFileUpload} 
              disabled={isLoading}
              className="demo-btn upload"
            >
              File Upload
            </button>

            <button 
              onClick={handleAuthRequest} 
              disabled={isLoading}
              className="demo-btn auth"
            >
              Authenticated Request
            </button>

            <button 
              onClick={handleTimeoutRequest} 
              disabled={isLoading}
              className="demo-btn timeout"
            >
              Timeout/Retry
            </button>

            <button 
              onClick={handleCancellableRequest} 
              disabled={isLoading}
              className="demo-btn cancel"
            >
              Cancellable Request
            </button>

            <button 
              onClick={handleErrorRequest} 
              disabled={isLoading}
              className="demo-btn error"
            >
              Error Handling
            </button>

            <button 
              onClick={clearResults} 
              disabled={isLoading}
              className="demo-btn clear"
            >
              Clear Results
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Making request...</span>
        </div>
      )}

      <div className="results-section">
        <h3>Request Results ({results.length})</h3>
        
        {results.length === 0 ? (
          <div className="no-results">
            No requests made yet. Try one of the demo buttons above!
          </div>
        ) : (
          <div className="results-list">
            {results.map((result) => (
              <div key={result.id} className={`result-item ${result.success ? 'success' : 'error'}`}>
                <div className="result-header">
                  <h4>{result.type}</h4>
                  <span className="timestamp">{result.timestamp}</span>
                </div>
                
                <div className="result-status">
                  <span className={`status-badge ${result.success ? 'success' : 'error'}`}>
                    {result.success ? '✅ Success' : '❌ Error'}
                  </span>
                  {result.status && (
                    <span className="status-code">Status: {result.status}</span>
                  )}
                </div>

                {result.error && (
                  <div className="result-error">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}

                {result.data && (
                  <div className="result-data">
                    <strong>Response Data:</strong>
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="demo-info">
        <h3>About This Demo</h3>
        <ul>
          <li><strong>Basic JSON POST:</strong> Simple POST request with JSON body</li>
          <li><strong>POST with Headers:</strong> Request with custom headers</li>
          <li><strong>File Upload:</strong> Multipart form data with file</li>
          <li><strong>Authenticated Request:</strong> Request with auth token</li>
          <li><strong>Timeout/Retry:</strong> Request with timeout and retry logic</li>
          <li><strong>Cancellable Request:</strong> Request that gets cancelled after 2 seconds</li>
          <li><strong>Error Handling:</strong> Request that returns an error status</li>
        </ul>
        
        <div className="note">
          <strong>Note:</strong> This demo uses public APIs (httpbin.org, jsonplaceholder) 
          for testing. Your actual implementation will use your own API endpoints.
        </div>
      </div>
    </div>
  );
};

export default HttpHelpersDemo;