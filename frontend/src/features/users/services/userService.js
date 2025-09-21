import { apiClient } from '@shared/services/apiClient';

class UserService {
  // Profile management
  async getProfile() {
    const response = await apiClient.get('/users/profile');
    return response.data;
  }

  async updateProfile(updates) {
    const response = await apiClient.put('/users/profile', updates);
    return response.data;
  }

  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await apiClient.post('/users/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async updatePreferences(preferences) {
    const response = await apiClient.put('/users/preferences', preferences);
    return response.data;
  }

  // Session management
  async getSessions(params = {}) {
    const response = await apiClient.get('/users/sessions', { params });
    return response.data;
  }

  // Availability (for tutors)
  async getAvailability() {
    const response = await apiClient.get('/users/availability');
    return response.data;
  }

  async updateAvailability(availability) {
    const response = await apiClient.put('/users/availability', availability);
    return response.data;
  }

  // Earnings (for tutors)
  async getEarnings(period = 'month') {
    const response = await apiClient.get('/users/earnings', {
      params: { period }
    });
    return response.data;
  }

  // User stats
  async getStats() {
    const response = await apiClient.get('/users/stats');
    return response.data;
  }

  // Guardian/Student relationships
  async getStudents() {
    const response = await apiClient.get('/users/students');
    return response.data;
  }

  async getGuardians() {
    const response = await apiClient.get('/users/guardians');
    return response.data;
  }

  async getTutors() {
    const response = await apiClient.get('/users/tutors');
    return response.data;
  }

  async addStudent(studentData) {
    const response = await apiClient.post('/users/students', studentData);
    return response.data;
  }

  async removeStudent(studentId) {
    const response = await apiClient.delete(`/users/students/${studentId}`);
    return response.data;
  }

  async requestGuardian(guardianEmail) {
    const response = await apiClient.post('/users/guardian-requests', {
      guardianEmail
    });
    return response.data;
  }

  async acceptGuardianRequest(requestId) {
    const response = await apiClient.post(`/users/guardian-requests/${requestId}/accept`);
    return response.data;
  }

  // Verification
  async requestEmailVerification() {
    const response = await apiClient.post('/users/verify/email/request');
    return response.data;
  }

  async verifyEmail(token) {
    const response = await apiClient.post('/users/verify/email', { token });
    return response.data;
  }

  async requestPhoneVerification(phoneNumber) {
    const response = await apiClient.post('/users/verify/phone/request', {
      phoneNumber
    });
    return response.data;
  }

  async verifyPhone(code) {
    const response = await apiClient.post('/users/verify/phone', { code });
    return response.data;
  }

  // Subscription management
  async upgradeSubscription(planId, paymentMethod) {
    const response = await apiClient.post('/users/subscription/upgrade', {
      planId,
      paymentMethod
    });
    return response.data;
  }

  async cancelSubscription() {
    const response = await apiClient.post('/users/subscription/cancel');
    return response.data;
  }

  // Account management
  async changePassword(currentPassword, newPassword) {
    const response = await apiClient.post('/users/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }

  async deleteAccount(password) {
    const response = await apiClient.delete('/users/account', {
      data: { password }
    });
    return response.data;
  }

  // Search users (for admin/tutors)
  async searchUsers(query, filters = {}) {
    const response = await apiClient.get('/users/search', {
      params: { query, ...filters }
    });
    return response.data;
  }

  // Get user by ID (for admin/tutors)
  async getUser(userId) {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  }

  // Block/unblock user (for admin)
  async blockUser(userId, reason) {
    const response = await apiClient.post(`/users/${userId}/block`, { reason });
    return response.data;
  }

  async unblockUser(userId) {
    const response = await apiClient.post(`/users/${userId}/unblock`);
    return response.data;
  }
}

export const userService = new UserService();
export default userService;