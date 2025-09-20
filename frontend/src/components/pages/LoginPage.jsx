import React, { useState, useEffect } from 'react';
import LoginComponent from '../loginandSignup/LoginComponent';
import UserSignupForm from '../loginandSignup/UserSignupForm';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useData';
import './css/LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [defaultAccountType, setDefaultAccountType] = useState(null);

  // Check if user navigated directly to /signup and check for accountType parameter
  useEffect(() => {
    if (location.pathname === '/signup') {
      setShowSignup(true);
      
      // Parse query parameters
      const searchParams = new URLSearchParams(location.search);
      const accountType = searchParams.get('accountType');
      
      // Set default account type if provided
      if (accountType) {
        // Capitalize first letter to match the format expected by UserSignupForm
        const formattedType = accountType.charAt(0).toUpperCase() + accountType.slice(1).toLowerCase();
        if (['Student', 'Guardian', 'Tutor'].includes(formattedType)) {
          setDefaultAccountType(formattedType);
        }
      }
    }
  }, [location.pathname, location.search]);

  const handleLoginSubmit = (formData) => {
    // console.log('Login successful:', formData);
    if (formData.user) {
      // Route based on account type after successful login
      const accountType = formData.user.accountType;
      let targetRoute = '/';
      
      switch (accountType) {
        case 'student':
          targetRoute = '/dashboard';
          break;
        case 'guardian':
          targetRoute = '/guardian';
          break;
        case 'tutor':
          targetRoute = '/tutor';
          break;
        case 'admin':
          targetRoute = '/admin';
          break;
        default:
          // console.warn('Unknown account type:', accountType);
          targetRoute = '/';
      }
      
      // console.log(`Navigating ${accountType} to ${targetRoute}`);
      
      // Small delay to allow auth context to update before navigation
      setTimeout(() => {
        // console.log('LoginPage - Starting navigation to:', targetRoute);
        // console.log('LoginPage - Current window location before navigate:', window.location.pathname);
        navigate(targetRoute, { replace: true });
        // console.log('LoginPage - Navigate called, checking location after 100ms...');
        setTimeout(() => {
          // console.log('LoginPage - Current window location after navigate:', window.location.pathname);
        }, 100);
      }, 400); // Short delay to let auth context update
    }
  };

  const handleSignupSubmit = async (formData, setSuccessMessage, setErrorMessage) => {
    try {
      // console.log('Signup data:', formData);
      
      // Clear any previous messages
      setSuccessMessage('');
      setErrorMessage('');
      
      // Transform the form data to match API expectations
      const signupData = {
        email: formData.email,
        password: formData.password,
        accountType: formData.userType.toLowerCase(),
        profile: {
          name: formData.username,
          phone: formData.phone,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country
          },
          bio: formData.bio || '',
          ...(formData.userType === 'Student' && {
            guardianName: `${formData.guardianFirstName} ${formData.guardianLastName}`.trim(),
            guardianFirstName: formData.guardianFirstName,
            guardianLastName: formData.guardianLastName,
            guardianEmail: formData.guardianEmail
          }),
          ...(formData.userType === 'Guardian' && {
            paymentMethods: formData.paymentMethods
          })
        }
      };

      // Register user with the API
      const response = await register(signupData);
      
      if (response && response.user) {
        // Show success message
        const userName = response.user.profile?.name || formData.username;
        const accountType = response.user.accountType.charAt(0).toUpperCase() + response.user.accountType.slice(1);
        setSuccessMessage(`✅ Registration successful! Welcome, ${userName}! Your ${accountType} account has been created.`);
        
        // Delay navigation to show success message
        setTimeout(() => {
          // Route based on account type after successful registration
          if (response.user.accountType === 'student') {
            navigate('/dashboard');
          } else if (response.user.accountType === 'guardian') {
            navigate('/guardian');
          } else if (response.user.accountType === 'tutor') {
            navigate('/tutor');
          } else if (response.user.accountType === 'admin') {
            navigate('/admin');
          }
        }, 2000); // Show success message for 2 seconds
      }
    } catch (error) {
      // console.error('Registration failed:', error);
      
      // Show error message
      let errorMsg = '❌ Registration failed. ';
      if (error.message && error.message.includes('already exists')) {
        errorMsg += 'This email address is already registered. Please use a different email or try signing in.';
      } else if (error.message && error.message.includes('validation')) {
        errorMsg += 'Please check your information and try again.';
      } else {
        errorMsg += 'Please check your username and password and try again.';
      }
      
      setErrorMessage(errorMsg);
    }
  };

  const handleSwitchToSignup = () => {
    setShowSignup(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignup(false);
  };

  return (
    <div className="login-page">
      {showSignup ? (
        <UserSignupForm 
          onSignupSubmit={(formData, setSuccessMessage, setErrorMessage) => 
            handleSignupSubmit(formData, setSuccessMessage, setErrorMessage)
          }
          onSwitchToLogin={handleSwitchToLogin}
          defaultAccountType={defaultAccountType}
        />
      ) : (
        <LoginComponent 
          onLoginSubmit={handleLoginSubmit}
          onSwitchToSignup={handleSwitchToSignup}
        />
      )}
    </div>
  );
};

export default LoginPage;