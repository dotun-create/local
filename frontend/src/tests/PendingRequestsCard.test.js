/**
 * Unit tests for PendingRequestsCard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PendingRequestsCard from '../components/guardian/PendingRequestsCard';
import API from '../services/api';

// Mock API
jest.mock('../services/api');

// Mock window methods
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true),
  writable: true,
});

Object.defineProperty(window, 'alert', {
  value: jest.fn(),
  writable: true,
});

describe('PendingRequestsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPendingRequests = [
    {
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
          name: 'John Student',
          avatar: '/images/student1-avatar.png'
        }
      }
    },
    {
      id: 'request_002',
      studentId: 'student_002',
      guardianId: 'guardian_001',
      status: 'pending',
      requestDate: '2023-12-02T15:30:00Z',
      studentMessage: 'I need a guardian for my studies',
      student: {
        id: 'student_002',
        email: 'student2@test.com',
        profile: {
          name: 'Jane Student'
        }
      }
    }
  ];

  it('renders loading state initially', () => {
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: [] }
    });

    render(<PendingRequestsCard />);

    expect(screen.getByText('Loading pending requests...')).toBeInTheDocument();
  });

  it('renders pending requests when data is loaded', async () => {
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('Pending Student Requests')).toBeInTheDocument();
      expect(screen.getByText('John Student')).toBeInTheDocument();
      expect(screen.getByText('Jane Student')).toBeInTheDocument();
      expect(screen.getByText('student1@test.com')).toBeInTheDocument();
      expect(screen.getByText('student2@test.com')).toBeInTheDocument();
    });
  });

  it('displays student messages when provided', async () => {
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('"Please be my guardian!"')).toBeInTheDocument();
      expect(screen.getByText('"I need a guardian for my studies"')).toBeInTheDocument();
    });
  });

  it('shows no pending requests message when list is empty', async () => {
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: [] }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('✓ No pending student requests')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    API.request.mockRejectedValueOnce(new Error('API Error'));

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('Error loading requests')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('handles approve request successfully', async () => {
    // Initial load
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    // Approve request
    API.request.mockResolvedValueOnce({
      success: true,
      data: {
        message: 'Request approved successfully'
      }
    });

    const onRequestsUpdate = jest.fn();
    render(<PendingRequestsCard onRequestsUpdate={onRequestsUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('John Student')).toBeInTheDocument();
    });

    // Click approve button for first request
    const approveButtons = screen.getAllByTitle('Approve request');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(API.request).toHaveBeenCalledWith(
        'POST',
        '/api/guardian/approve-request/request_001',
        {
          response_message: 'Welcome! I have approved your request to link as my student.'
        }
      );
      expect(onRequestsUpdate).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Successfully approved request from John Student!');
    });
  });

  it('handles reject request successfully', async () => {
    // Mock window.prompt for rejection reason
    window.prompt = jest.fn(() => 'Cannot approve at this time');

    // Initial load
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    // Reject request
    API.request.mockResolvedValueOnce({
      success: true,
      data: {
        message: 'Request rejected successfully'
      }
    });

    const onRequestsUpdate = jest.fn();
    render(<PendingRequestsCard onRequestsUpdate={onRequestsUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('John Student')).toBeInTheDocument();
    });

    // Click reject button for first request
    const rejectButtons = screen.getAllByTitle('Reject request');
    fireEvent.click(rejectButtons[0]);

    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalledWith(
        'Please provide a reason for rejecting John Student\'s request:',
        'Unable to approve at this time'
      );
      expect(API.request).toHaveBeenCalledWith(
        'POST',
        '/api/guardian/reject-request/request_001',
        {
          rejection_reason: 'Cannot approve at this time',
          response_message: 'I\'m unable to approve your request at this time. Reason: Cannot approve at this time'
        }
      );
      expect(onRequestsUpdate).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Request from John Student has been rejected.');
    });
  });

  it('handles approve confirmation cancellation', async () => {
    window.confirm = jest.fn(() => false); // User cancels

    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('John Student')).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByTitle('Approve request');
    fireEvent.click(approveButtons[0]);

    // Should not make API call if user cancels
    expect(API.request).toHaveBeenCalledTimes(1); // Only initial load
  });

  it('handles reject prompt cancellation', async () => {
    window.prompt = jest.fn(() => null); // User cancels

    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('John Student')).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByTitle('Reject request');
    fireEvent.click(rejectButtons[0]);

    // Should not make API call if user cancels
    expect(API.request).toHaveBeenCalledTimes(1); // Only initial load
  });

  it('displays processing state during approve/reject', async () => {
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    // Delay the approve response
    let resolveApprove;
    API.request.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolveApprove = resolve;
      });
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('John Student')).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByTitle('Approve request');
    fireEvent.click(approveButtons[0]);

    // Should show processing state
    await waitFor(() => {
      const processingButton = screen.getAllByText('⏳')[0];
      expect(processingButton).toBeInTheDocument();
    });

    // Resolve the approve request
    resolveApprove({
      success: true,
      data: { message: 'Request approved successfully' }
    });

    await waitFor(() => {
      expect(screen.queryByText('⏳')).not.toBeInTheDocument();
    });
  });

  it('handles API errors during approve/reject gracefully', async () => {
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    // Approve request fails
    API.request.mockRejectedValueOnce(new Error('Network error'));

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('John Student')).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByTitle('Approve request');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error approving request. Please try again.');
    });
  });

  it('formats dates correctly', async () => {
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('Requested: Dec 1, 2023')).toBeInTheDocument();
      expect(screen.getByText('Requested: Dec 2, 2023')).toBeInTheDocument();
    });
  });

  it('handles missing student profile gracefully', async () => {
    const requestWithoutProfile = [{
      ...mockPendingRequests[0],
      student: {
        id: 'student_001',
        email: 'student1@test.com'
        // No profile
      }
    }];

    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: requestWithoutProfile }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('student1@test.com')).toBeInTheDocument(); // Falls back to email
    });
  });

  it('shows request count in summary', async () => {
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('2 students waiting for approval')).toBeInTheDocument();
    });
  });

  it('handles singular vs plural text correctly', async () => {
    const singleRequest = [mockPendingRequests[0]];

    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: singleRequest }
    });

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('1 student waiting for approval')).toBeInTheDocument();
    });
  });

  it('can retry loading after error', async () => {
    // First call fails
    API.request.mockRejectedValueOnce(new Error('API Error'));

    render(<PendingRequestsCard />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    // Second call succeeds
    API.request.mockResolvedValueOnce({
      success: true,
      data: { requests: mockPendingRequests }
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('John Student')).toBeInTheDocument();
    });
  });
});