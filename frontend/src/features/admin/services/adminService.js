import { apiClient } from '@shared/services/apiClient';

class AdminService {
  // User Management
  async getUsers(params = {}) {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  }

  async getUser(userId) {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  }

  async createUser(userData) {
    const response = await apiClient.post('/admin/users', userData);
    return response.data;
  }

  async updateUser(userId, updates) {
    const response = await apiClient.patch(`/admin/users/${userId}`, updates);
    return response.data;
  }

  async deleteUser(userId) {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async suspendUser(userId, reason) {
    const response = await apiClient.post(`/admin/users/${userId}/suspend`, { reason });
    return response.data;
  }

  async activateUser(userId) {
    const response = await apiClient.post(`/admin/users/${userId}/activate`);
    return response.data;
  }

  async resetUserPassword(userId) {
    const response = await apiClient.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  }

  async bulkUpdateUsers(userIds, updates) {
    const response = await apiClient.patch('/admin/users/bulk', { userIds, updates });
    return response.data;
  }

  // Role and Permission Management
  async getRoles() {
    const response = await apiClient.get('/admin/roles');
    return response.data;
  }

  async createRole(roleData) {
    const response = await apiClient.post('/admin/roles', roleData);
    return response.data;
  }

  async updateRole(roleId, updates) {
    const response = await apiClient.patch(`/admin/roles/${roleId}`, updates);
    return response.data;
  }

  async deleteRole(roleId) {
    const response = await apiClient.delete(`/admin/roles/${roleId}`);
    return response.data;
  }

  async getPermissions() {
    const response = await apiClient.get('/admin/permissions');
    return response.data;
  }

  async assignRole(userId, roleId) {
    const response = await apiClient.post(`/admin/users/${userId}/roles`, { roleId });
    return response.data;
  }

  async removeRole(userId, roleId) {
    const response = await apiClient.delete(`/admin/users/${userId}/roles/${roleId}`);
    return response.data;
  }

  // System Configuration
  async getSystemSettings() {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  }

  async updateSystemSettings(settings) {
    const response = await apiClient.patch('/admin/settings', settings);
    return response.data;
  }

  async getFeatureFlags() {
    const response = await apiClient.get('/admin/feature-flags');
    return response.data;
  }

  async updateFeatureFlag(flagId, enabled) {
    const response = await apiClient.patch(`/admin/feature-flags/${flagId}`, { enabled });
    return response.data;
  }

  async getSystemHealth() {
    const response = await apiClient.get('/admin/system/health');
    return response.data;
  }

  async getSystemLogs(params = {}) {
    const response = await apiClient.get('/admin/system/logs', { params });
    return response.data;
  }

  // Analytics and Reporting
  async getDashboardStats() {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  }

  async getUserAnalytics(params = {}) {
    const response = await apiClient.get('/admin/analytics/users', { params });
    return response.data;
  }

  async getCourseAnalytics(params = {}) {
    const response = await apiClient.get('/admin/analytics/courses', { params });
    return response.data;
  }

  async getRevenueAnalytics(params = {}) {
    const response = await apiClient.get('/admin/analytics/revenue', { params });
    return response.data;
  }

  async getEngagementAnalytics(params = {}) {
    const response = await apiClient.get('/admin/analytics/engagement', { params });
    return response.data;
  }

  async exportAnalytics(type, params = {}, format = 'csv') {
    const response = await apiClient.get(`/admin/analytics/${type}/export`, {
      params: { ...params, format },
      responseType: 'blob'
    });
    return response.data;
  }

  // Content Management
  async getCourses(params = {}) {
    const response = await apiClient.get('/admin/courses', { params });
    return response.data;
  }

  async approveCourse(courseId) {
    const response = await apiClient.post(`/admin/courses/${courseId}/approve`);
    return response.data;
  }

  async rejectCourse(courseId, reason) {
    const response = await apiClient.post(`/admin/courses/${courseId}/reject`, { reason });
    return response.data;
  }

  async featuredCourse(courseId, featured = true) {
    const response = await apiClient.patch(`/admin/courses/${courseId}`, { featured });
    return response.data;
  }

  async getReportedContent(params = {}) {
    const response = await apiClient.get('/admin/reported-content', { params });
    return response.data;
  }

  async moderateContent(contentId, action, reason = '') {
    const response = await apiClient.post(`/admin/content/${contentId}/moderate`, { action, reason });
    return response.data;
  }

  // Payment and Transaction Management
  async getTransactions(params = {}) {
    const response = await apiClient.get('/admin/transactions', { params });
    return response.data;
  }

  async getTransaction(transactionId) {
    const response = await apiClient.get(`/admin/transactions/${transactionId}`);
    return response.data;
  }

  async refundTransaction(transactionId, amount, reason) {
    const response = await apiClient.post(`/admin/transactions/${transactionId}/refund`, {
      amount,
      reason
    });
    return response.data;
  }

  async getPayoutRequests(params = {}) {
    const response = await apiClient.get('/admin/payouts', { params });
    return response.data;
  }

  async approvePayoutRequest(payoutId) {
    const response = await apiClient.post(`/admin/payouts/${payoutId}/approve`);
    return response.data;
  }

  async rejectPayoutRequest(payoutId, reason) {
    const response = await apiClient.post(`/admin/payouts/${payoutId}/reject`, { reason });
    return response.data;
  }

  // Communication and Support
  async getSupportTickets(params = {}) {
    const response = await apiClient.get('/admin/support/tickets', { params });
    return response.data;
  }

  async getSupportTicket(ticketId) {
    const response = await apiClient.get(`/admin/support/tickets/${ticketId}`);
    return response.data;
  }

  async updateTicketStatus(ticketId, status, response = '') {
    const responseData = await apiClient.patch(`/admin/support/tickets/${ticketId}`, {
      status,
      adminResponse: response
    });
    return responseData.data;
  }

  async sendSystemAnnouncement(announcementData) {
    const response = await apiClient.post('/admin/announcements', announcementData);
    return response.data;
  }

  async getAnnouncements(params = {}) {
    const response = await apiClient.get('/admin/announcements', { params });
    return response.data;
  }

  async sendBulkEmail(emailData) {
    const response = await apiClient.post('/admin/emails/bulk', emailData);
    return response.data;
  }

  // Security and Moderation
  async getSecurityEvents(params = {}) {
    const response = await apiClient.get('/admin/security/events', { params });
    return response.data;
  }

  async banUserIP(ipAddress, reason, duration) {
    const response = await apiClient.post('/admin/security/ban-ip', {
      ipAddress,
      reason,
      duration
    });
    return response.data;
  }

  async unbanUserIP(ipAddress) {
    const response = await apiClient.delete(`/admin/security/ban-ip/${encodeURIComponent(ipAddress)}`);
    return response.data;
  }

  async getBannedIPs() {
    const response = await apiClient.get('/admin/security/banned-ips');
    return response.data;
  }

  async getLoginAttempts(params = {}) {
    const response = await apiClient.get('/admin/security/login-attempts', { params });
    return response.data;
  }

  // Backup and Maintenance
  async createBackup(type = 'full') {
    const response = await apiClient.post('/admin/backup', { type });
    return response.data;
  }

  async getBackups() {
    const response = await apiClient.get('/admin/backups');
    return response.data;
  }

  async restoreBackup(backupId) {
    const response = await apiClient.post(`/admin/backups/${backupId}/restore`);
    return response.data;
  }

  async deleteBackup(backupId) {
    const response = await apiClient.delete(`/admin/backups/${backupId}`);
    return response.data;
  }

  async runMaintenance(maintenanceType, options = {}) {
    const response = await apiClient.post('/admin/maintenance', {
      type: maintenanceType,
      options
    });
    return response.data;
  }

  // Utility Methods
  formatUserRole(role) {
    const roleLabels = {
      admin: 'Administrator',
      instructor: 'Instructor',
      student: 'Student',
      moderator: 'Moderator',
      support: 'Support Agent'
    };
    return roleLabels[role] || role;
  }

  getUserStatusColor(status) {
    const colors = {
      active: 'var(--color-success)',
      inactive: 'var(--color-text-secondary)',
      suspended: 'var(--color-danger)',
      pending: 'var(--color-warning)'
    };
    return colors[status] || colors.inactive;
  }

  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStatusIcon(status) {
    const icons = {
      active: '✅',
      inactive: '⚪',
      suspended: '🚫',
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
      processing: '⏳'
    };
    return icons[status] || '❓';
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  generateSecurePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  async exportData(type, filters = {}, format = 'csv') {
    const response = await apiClient.get(`/admin/export/${type}`, {
      params: { ...filters, format },
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}-export-${new Date().toISOString().split('T')[0]}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return response.data;
  }
}

export const adminService = new AdminService();
export default adminService;