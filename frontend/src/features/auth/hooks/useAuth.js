import { useAuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const authContext = useAuthContext();

  return {
    // State
    user: authContext.user,
    loading: authContext.isLoading,
    isAuthenticated: authContext.isAuthenticated,
    error: authContext.error,
    token: authContext.token,

    // Actions
    login: authContext.login,
    register: authContext.register,
    logout: authContext.logout,
    refreshToken: authContext.refreshToken,
    updateUser: authContext.updateUser,
    changePassword: authContext.changePassword,
    requestPasswordReset: authContext.requestPasswordReset,
    resetPassword: authContext.resetPassword,
    verifyEmail: authContext.verifyEmail,
    resendVerificationEmail: authContext.resendVerificationEmail,
    clearError: authContext.clearError,
    loginWithGoogle: authContext.loginWithGoogle,
    loginWithApple: authContext.loginWithApple,

    // Computed properties
    isEmailVerified: authContext.isEmailVerified,
    userRoles: authContext.userRoles,
    accountType: authContext.accountType
  };
};