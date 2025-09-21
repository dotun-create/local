import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Badge } from '@shared/components/ui';
import { Input, Select } from '@shared/components/forms';
import { LoadingSpinner } from '@shared/components/feedback';
import { paymentService } from '../services/paymentService';
import './PaymentHistory.css';

const PaymentHistory = ({
  userId = null,
  showFilters = true,
  showSearch = true,
  pageSize = 10,
  className = ''
}) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateRange: '30d',
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    loadPaymentHistory();
  }, [currentPage, filters, userId]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: pageSize,
        ...(userId && { userId }),
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.dateRange !== 'all' && { dateRange: filters.dateRange }),
        ...(filters.minAmount && { minAmount: parseFloat(filters.minAmount) }),
        ...(filters.maxAmount && { maxAmount: parseFloat(filters.maxAmount) })
      };

      const response = await paymentService.getPaymentHistory(params);
      setPayments(response.payments || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to load payment history:', error);
      setError('Failed to load payment history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      dateRange: '30d',
      minAmount: '',
      maxAmount: ''
    });
    setCurrentPage(1);
  };

  const handleDownloadInvoice = async (paymentId, invoiceId) => {
    try {
      const blob = await paymentService.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      pending: 'warning',
      processing: 'info',
      succeeded: 'success',
      failed: 'error',
      cancelled: 'secondary',
      refunded: 'warning'
    };
    return variants[status] || 'secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount, currency = 'USD') => {
    return paymentService.formatCurrency(amount / 100, currency);
  };

  if (loading && payments.length === 0) {
    return (
      <Card className={`payment-history ${className}`}>
        <div className="history-loading">
          <LoadingSpinner size="md" />
          <p>Loading payment history...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`payment-history ${className}`}>
      <div className="history-header">
        <div className="header-title">
          <h3>Payment History</h3>
          <span className="total-count">
            {total} payment{total !== 1 ? 's' : ''}
          </span>
        </div>

        {showFilters && (
          <div className="history-filters">
            {showSearch && (
              <div className="search-filter">
                <Input
                  placeholder="Search payments..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  size="sm"
                />
              </div>
            )}

            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              size="sm"
            >
              <option value="all">All Status</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </Select>

            <Select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              size="sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </Select>

            <Button
              variant="secondary"
              size="sm"
              onClick={clearFilters}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error" className="history-error">
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={loadPaymentHistory}
            className="retry-button"
          >
            Try Again
          </Button>
        </Alert>
      )}

      {payments.length === 0 ? (
        <div className="no-payments">
          <div className="no-payments-icon">💳</div>
          <h4>No Payments Found</h4>
          <p>
            {filters.search || filters.status !== 'all' || filters.dateRange !== 'all'
              ? 'No payments match your current filters.'
              : 'You haven\'t made any payments yet.'
            }
          </p>
          {(filters.search || filters.status !== 'all' || filters.dateRange !== 'all') && (
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="payments-list">
            {payments.map((payment) => (
              <div key={payment.id} className="payment-item">
                <div className="payment-main">
                  <div className="payment-details">
                    <div className="payment-primary">
                      <span className="payment-description">
                        {payment.description || 'Payment'}
                      </span>
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="payment-secondary">
                      <span className="payment-date">
                        {formatDate(payment.created_at)}
                      </span>
                      <span className="payment-method">
                        {payment.payment_method?.type === 'card' && (
                          <>
                            {payment.payment_method.card?.brand?.toUpperCase()}
                            •••• {payment.payment_method.card?.last4}
                          </>
                        )}
                        {payment.payment_method?.type === 'bank_account' && (
                          <>Bank •••• {payment.payment_method.bank_account?.last4}</>
                        )}
                        {payment.payment_method?.type === 'paypal' && 'PayPal'}
                      </span>
                    </div>

                    {payment.failure_reason && (
                      <div className="payment-error">
                        <span className="error-reason">
                          {payment.failure_reason}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="payment-amount">
                    <span className={`amount ${payment.status === 'refunded' ? 'refunded' : ''}`}>
                      {payment.status === 'refunded' && '-'}
                      {formatAmount(payment.amount, payment.currency)}
                    </span>
                    {payment.refunded_amount > 0 && payment.status !== 'refunded' && (
                      <span className="refunded-amount">
                        Refunded: {formatAmount(payment.refunded_amount, payment.currency)}
                      </span>
                    )}
                  </div>
                </div>

                {payment.invoice_id && (
                  <div className="payment-actions">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleDownloadInvoice(payment.id, payment.invoice_id)}
                    >
                      Download Invoice
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="history-pagination">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>

              <div className="page-info">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {loading && payments.length > 0 && (
        <div className="loading-overlay">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </Card>
  );
};

export default PaymentHistory;