/**
 * Additional tests for PendingRequestsCard empty state handling
 * Tests the fix for properly displaying "No pending requests" vs "Error loading requests"
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PendingRequestsCard from '../components/guardian/PendingRequestsCard';
import API from '../services/api';

// Mock API
jest.mock('../services/api');

describe('PendingRequestsCard Empty State Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "No pending requests" for successful empty response', async () => {
    // Mock successful empty response (like what the backend actually returns)
    API.guardian.getPendingRequests.mockResolvedValueOnce({
      requests: [],
      pagination: {
        page: 1,
        per_page: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_prev: false
      }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('✓ No pending student requests')).toBeInTheDocument();
    });

    // Should not show error message
    expect(screen.queryByText('Failed to load pending requests')).not.toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('shows "No pending requests" for nested data structure', async () => {
    // Mock response with nested data structure
    API.guardian.getPendingRequests.mockResolvedValueOnce({
      success: true,
      data: {
        requests: [],
        pagination: {
          page: 1,
          per_page: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_prev: false
        }
      }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('✓ No pending student requests')).toBeInTheDocument();
    });

    expect(screen.queryByText('Failed to load pending requests')).not.toBeInTheDocument();
  });

  it('shows error message for actual API failures', async () => {
    // Mock API rejection (actual error)
    API.guardian.getPendingRequests.mockRejectedValueOnce(new Error('Network error'));

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('Error loading requests')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    // Should not show "no pending requests" message
    expect(screen.queryByText('✓ No pending student requests')).not.toBeInTheDocument();
  });

  it('shows error message for invalid response format', async () => {
    // Mock invalid response (missing requests property)
    API.guardian.getPendingRequests.mockResolvedValueOnce({
      success: true,
      data: {
        // Missing requests property
        pagination: { total: 0 }
      }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load pending requests')).toBeInTheDocument();
    });
  });

  it('handles null response gracefully', async () => {
    // Mock null response
    API.guardian.getPendingRequests.mockResolvedValueOnce(null);

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load pending requests')).toBeInTheDocument();
    });
  });

  it('handles undefined response gracefully', async () => {
    // Mock undefined response
    API.guardian.getPendingRequests.mockResolvedValueOnce(undefined);

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load pending requests')).toBeInTheDocument();
    });
  });

  it('shows pending requests when they exist', async () => {
    const mockRequests = [{
      id: 'request_001',
      studentId: 'student_001',
      guardianId: 'guardian_001',
      status: 'pending',
      requestDate: '2023-12-01T10:00:00Z',
      studentMessage: 'Please be my guardian!',
      student: {
        id: 'student_001',
        email: 'student1@test.com',
        profile: {
          name: 'John Student'
        }
      }
    }];

    API.guardian.getPendingRequests.mockResolvedValueOnce({
      requests: mockRequests,
      pagination: {
        page: 1,
        per_page: 20,
        total: 1,
        pages: 1,
        has_next: false,
        has_prev: false
      }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('John Student')).toBeInTheDocument();
      expect(screen.getByText('student1@test.com')).toBeInTheDocument();
      expect(screen.getByText('1 student waiting for approval')).toBeInTheDocument();
    });

    // Should not show empty or error states
    expect(screen.queryByText('✓ No pending student requests')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to load pending requests')).not.toBeInTheDocument();
  });

  it('correctly handles the transition from loading to empty state', async () => {
    API.guardian.getPendingRequests.mockResolvedValueOnce({
      requests: [],
      pagination: { total: 0 }
    });

    render(<PendingRequestsCard />);

    // Initially shows loading
    expect(screen.getByText('Loading pending requests...')).toBeInTheDocument();

    // Then shows empty state
    await waitFor(() => {
      expect(screen.getByText('✓ No pending student requests')).toBeInTheDocument();
    });

    expect(screen.queryByText('Loading pending requests...')).not.toBeInTheDocument();
  });

  it('correctly handles the transition from loading to error state', async () => {
    API.guardian.getPendingRequests.mockRejectedValueOnce(new Error('API Error'));

    render(<PendingRequestsCard />);

    // Initially shows loading
    expect(screen.getByText('Loading pending requests...')).toBeInTheDocument();

    // Then shows error state
    await waitFor(() => {
      expect(screen.getByText('Error loading requests')).toBeInTheDocument();
    });

    expect(screen.queryByText('Loading pending requests...')).not.toBeInTheDocument();
    expect(screen.queryByText('✓ No pending student requests')).not.toBeInTheDocument();
  });
});