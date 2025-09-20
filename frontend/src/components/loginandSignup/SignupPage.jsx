import React from 'react';
import UserSignupForm from './UserSignupForm';
import './css/SignupPage.css';

const SignupPage = () => {
  const handleSignupSubmit = (formData) => {
    console.log('Signup data received:', formData);
    
    // Here you would typically send the data to your backend API
    // Example API call:
    /*
    try {
      const response = await fetch('/api/users/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('User created successfully:', result);
        // Redirect to login or dashboard
      } else {
        console.error('Signup failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error during signup:', error);
    }
    */
    
    alert(`${formData.userType} account created successfully! Welcome, ${formData.username}!`);
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <UserSignupForm onSignupSubmit={handleSignupSubmit} />
      </div>
    </div>
  );
};

export default SignupPage;