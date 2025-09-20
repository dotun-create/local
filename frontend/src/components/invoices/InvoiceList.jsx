import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import './css/InvoiceList.css';

const InvoiceList = ({ guardianId, isAdmin = false }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, filters, guardianId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      let endpoint = isAdmin 
        ? '/invoices/admin'
        : '/invoices/guardian';
      
      const params = new URLSearchParams({
        page: currentPage,
        per_page: isAdmin ? 20 : 10
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (isAdmin && guardianId) params.append('guardian_id', guardianId);

      const data = await apiRequest(`${endpoint}?${params}`);
      setInvoices(data.invoices);
      setTotalPages(data.pages);
    } catch (error) {
      setError('Error fetching invoices: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'paid': 'status-paid',
      'pending': 'status-pending',
      'overdue': 'status-overdue',
      'cancelled': 'status-cancelled'
    };
    return `status-badge ${statusClasses[status] || 'status-default'}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) return <div className="loading-spinner">Loading invoices...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="invoice-list-container">
      <div className="invoice-list-header">
        <h3>{isAdmin ? 'All Invoices' : 'My Invoices'}</h3>
        
        <div className="invoice-filters">
          <select 
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          {isAdmin && (
            <input
              type="text"
              placeholder="Search invoices..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          )}
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="no-invoices">
          <div className="empty-state-icon">📄</div>
          <p className="empty-state-message">No invoices at this time</p>
        </div>
      ) : (
        <>
          <div className="invoice-table">
            <div className="invoice-table-header">
              <div className="col-invoice-number">Invoice #</div>
              <div className="col-date">Date</div>
              {isAdmin && <div className="col-guardian">Guardian</div>}
              <div className="col-amount">Amount</div>
              <div className="col-status">Status</div>
              <div className="col-actions">Actions</div>
            </div>
            
            {invoices.map(invoice => (
              <div key={invoice.id} className="invoice-table-row">
                <div className="col-invoice-number">
                  <span className="invoice-number">{invoice.invoiceNumber}</span>
                </div>
                <div className="col-date">
                  {formatDate(invoice.createdAt)}
                </div>
                {isAdmin && (
                  <div className="col-guardian">
                    <span className="guardian-name">{invoice.guardianName}</span>
                  </div>
                )}
                <div className="col-amount">
                  <span className="amount">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </span>
                </div>
                <div className="col-status">
                  <span className={getStatusBadge(invoice.status)}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
                <div className="col-actions">
                  <button 
                    className="btn-view"
                    onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                    title="Download PDF"
                  >
                    📄
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn-pagination"
              >
                Previous
              </button>
              
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn-pagination"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InvoiceList;