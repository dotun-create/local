import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  token: null
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  TOKEN_REFRESH_SUCCESS: 'TOKEN_REFRESH_SUCCESS',
  TOKEN_REFRESH_FAILURE: 'TOKEN_REFRESH_FAILURE'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: !!action.payload.user,
        error: null
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.isLoading
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
        isLoading: false
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS:
      return {
        ...state,
        token: action.payload.token,
        error: null
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        error: action.payload.error
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext(null);

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = authService.getStoredToken();
      const refreshToken = authService.getStoredRefreshToken();

      if (token && !authService.isTokenExpired(token)) {
        try {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: true } });

          // Get current user data
          const user = await authService.getCurrentUser();

          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { user, token }
          });
        } catch (error) {
          console.error('Token validation failed:', error);

          // Try to refresh token
          if (refreshToken) {
            try {
              const refreshResponse = await authService.refreshToken(refreshToken);
              const user = await authService.getCurrentUser();

              dispatch({
                type: AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS,
                payload: { token: refreshResponse.token }
              });

              dispatch({
                type: AUTH_ACTIONS.SET_USER,
                payload: { user }
              });
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              await authService.logout();
              dispatch({ type: AUTH_ACTIONS.LOGOUT });
            }
          } else {
            await authService.logout();
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
          }
        }
      } else {
        // No valid token found
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: false } });
      }
    };

    initializeAuth();
  }, []);

  // Actions
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      const response = await authService.login(credentials);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.user,
          token: response.token
        }
      });

      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      const response = await authService.register(userData);

      // Only set auth state if auto-login is enabled
      if (response.autoLogin && response.user) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: response.user,
            token: response.token
          }
        });
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: false } });
      }

      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  const logout = async (showConfirmation = true) => {
    try {
      if (showConfirmation) {
        const confirmLogout = window.confirm('Are you sure you want to log out?');
        if (!confirmLogout) {
          return false;
        }
      }

      await authService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if API call fails
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      return false;
    }
  };

  const updateUser = async (updates) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: true } });

      const updatedUser = await authService.updateProfile(updates);

      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: { user: updatedUser }
      });

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: false } });

      return updatedUser;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  const changePassword = async (passwordData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: true } });

      await authService.changePassword(passwordData);

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: false } });

      return true;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: true } });

      await authService.requestPasswordReset(email);

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: false } });

      return true;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: true } });

      await authService.resetPassword(token, newPassword);

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: false } });

      return true;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  const verifyEmail = async (token) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: true } });

      const response = await authService.verifyEmail(token);

      // Update user if verification was successful
      if (response.user) {
        dispatch({
          type: AUTH_ACTIONS.SET_USER,
          payload: { user: response.user }
        });
      }

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: false } });

      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  const resendVerificationEmail = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: true } });

      await authService.resendVerificationEmail();

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: false } });

      return true;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const refreshToken = async () => {
    try {
      const refreshToken = authService.getStoredRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authService.refreshToken(refreshToken);

      dispatch({
        type: AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS,
        payload: { token: response.token }
      });

      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.TOKEN_REFRESH_FAILURE,
        payload: { error: error.message }
      });
      await authService.logout();
      throw error;
    }
  };

  // Social login methods
  const loginWithGoogle = async (googleToken) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      const response = await authService.loginWithGoogle(googleToken);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.user,
          token: response.token
        }
      });

      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  const loginWithApple = async (appleToken) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      const response = await authService.loginWithApple(appleToken);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.user,
          token: response.token
        }
      });

      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  // Context value
  const value = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    token: state.token,

    // Actions
    login,
    register,
    logout,
    updateUser,
    changePassword,
    requestPasswordReset,
    resetPassword,
    verifyEmail,
    resendVerificationEmail,
    clearError,
    refreshToken,
    loginWithGoogle,
    loginWithApple,

    // Computed properties
    isEmailVerified: state.user?.emailVerified || false,
    userRoles: state.user?.roles || [],
    accountType: state.user?.accountType || null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;