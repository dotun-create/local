import { apiClient } from '@shared/services/apiClient';
import { API_ENDPOINTS } from '@shared/constants';

class AuthService {
  async login(credentials) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe || false
      });

      const { user, token, refreshToken } = response.data;

      // Store tokens
      if (token) {
        localStorage.setItem('authToken', token);
        apiClient.setAuthToken(token);
      }

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      return {
        user,
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async register(userData) {
    try {
      // Prepare form data for file upload if image is present
      const formData = new FormData();

      // Add all form fields
      Object.keys(userData).forEach(key => {
        if (key === 'imageFile' && userData[key]) {
          formData.append('profileImage', userData[key]);
        } else if (key === 'paymentMethods' && Array.isArray(userData[key])) {
          formData.append(key, JSON.stringify(userData[key]));
        } else if (userData[key] !== null && userData[key] !== undefined) {
          formData.append(key, userData[key]);
        }
      });

      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const { user, token, refreshToken, autoLogin, message } = response.data;

      // If auto-login is enabled, store tokens
      if (autoLogin && token) {
        localStorage.setItem('authToken', token);
        apiClient.setAuthToken(token);

        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
      }

      return {
        user,
        token,
        refreshToken,
        autoLogin,
        message
      };
    } catch (error) {
      console.error('Registration failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async logout() {
    try {
      const token = localStorage.getItem('authToken');

      if (token) {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API fails
    } finally {
      // Clear local storage and auth headers
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      apiClient.clearAuthToken();
    }
  }

  async getCurrentUser() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
      return response.data.user;
    } catch (error) {
      console.error('Get current user failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, {
        refreshToken
      });

      const { token: newToken, refreshToken: newRefreshToken } = response.data;

      // Update stored tokens
      if (newToken) {
        localStorage.setItem('authToken', newToken);
        apiClient.setAuthToken(newToken);
      }

      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens if refresh fails
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      apiClient.clearAuthToken();
      throw this.handleAuthError(error);
    }
  }

  async updateProfile(updates) {
    try {
      const formData = new FormData();

      Object.keys(updates).forEach(key => {
        if (key === 'profileImage' && updates[key] instanceof File) {
          formData.append('profileImage', updates[key]);
        } else if (updates[key] !== null && updates[key] !== undefined) {
          formData.append(key, updates[key]);
        }
      });

      const response = await apiClient.put(API_ENDPOINTS.AUTH.PROFILE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.user;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async changePassword(passwordData) {
    try {
      await apiClient.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });

      return true;
    } catch (error) {
      console.error('Password change failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async requestPasswordReset(email) {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      return true;
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async resetPassword(token, newPassword) {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        token,
        password: newPassword
      });
      return true;
    } catch (error) {
      console.error('Password reset failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async verifyEmail(token) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
      return response.data;
    } catch (error) {
      console.error('Email verification failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async resendVerificationEmail() {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION);
      return true;
    } catch (error) {
      console.error('Resend verification failed:', error);
      throw this.handleAuthError(error);
    }
  }

  // Social authentication methods
  async loginWithGoogle(googleToken) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.GOOGLE_LOGIN, {
        token: googleToken
      });

      const { user, token, refreshToken } = response.data;

      if (token) {
        localStorage.setItem('authToken', token);
        apiClient.setAuthToken(token);
      }

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      return { user, token, refreshToken };
    } catch (error) {
      console.error('Google login failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async loginWithApple(appleToken) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.APPLE_LOGIN, {
        token: appleToken
      });

      const { user, token, refreshToken } = response.data;

      if (token) {
        localStorage.setItem('authToken', token);
        apiClient.setAuthToken(token);
      }

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      return { user, token, refreshToken };
    } catch (error) {
      console.error('Apple login failed:', error);
      throw this.handleAuthError(error);
    }
  }

  // Role management methods
  async switchRole(newRole) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.SWITCH_ROLE, {
        role: newRole
      });

      return response.data;
    } catch (error) {
      console.error('Role switch failed:', error);
      throw this.handleAuthError(error);
    }
  }

  // Helper method to handle authentication errors
  handleAuthError(error) {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          return new Error(data.message || 'Invalid request. Please check your input.');
        case 401:
          return new Error(data.message || 'Invalid credentials. Please try again.');
        case 403:
          return new Error(data.message || 'Access denied. Please contact support.');
        case 409:
          return new Error(data.message || 'Email already exists. Please use a different email.');
        case 422:
          return new Error(data.message || 'Validation failed. Please check your input.');
        case 429:
          return new Error(data.message || 'Too many requests. Please try again later.');
        case 500:
          return new Error('Server error. Please try again later.');
        default:
          return new Error(data.message || 'An unexpected error occurred.');
      }
    } else if (error.request) {
      return new Error('Network error. Please check your connection and try again.');
    } else {
      return new Error(error.message || 'An unexpected error occurred.');
    }
  }

  // Utility methods
  isTokenExpired(token) {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  getStoredToken() {
    return localStorage.getItem('authToken');
  }

  getStoredRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  hasValidToken() {
    const token = this.getStoredToken();
    return token && !this.isTokenExpired(token);
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;