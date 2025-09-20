import React from 'react';
import './css/InvoiceStatsCard.css';

const InvoiceStatsCard = ({ stats, loading = false }) => {
  const formatCurrency = (amount, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="invoice-stats-container">
        <div className="loading-stats">Loading invoice statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="invoice-stats-container">
        <div className="error-stats">Failed to load statistics</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Invoices',
      value: stats.totalInvoices || 0,
      icon: '📄',
      color: 'blue',
      format: 'number'
    },
    {
      title: 'Paid Invoices',
      value: stats.paidInvoices || 0,
      icon: '✅',
      color: 'green',
      format: 'number'
    },
    {
      title: 'Pending Invoices',
      value: stats.pendingInvoices || 0,
      icon: '⏳',
      color: 'orange',
      format: 'number'
    },
    {
      title: 'Overdue Invoices',
      value: stats.overdueInvoices || 0,
      icon: '⚠️',
      color: 'red',
      format: 'number'
    },
    {
      title: 'Total Revenue',
      value: stats.totalRevenue || 0,
      icon: '💰',
      color: 'green',
      format: 'currency'
    },
    {
      title: 'Pending Revenue',
      value: stats.pendingRevenue || 0,
      icon: '💳',
      color: 'orange',
      format: 'currency'
    }
  ];

  const formatValue = (value, format) => {
    if (format === 'currency') {
      return formatCurrency(value);
    }
    return value.toLocaleString();
  };

  return (
    <div className="invoice-stats-container">
      <div className="stats-header">
        <h3>Invoice Overview</h3>
      </div>
      
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className={`stat-card stat-${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <div className="stat-value">
                {formatValue(stat.value, stat.format)}
              </div>
              <div className="stat-label">{stat.title}</div>
            </div>
          </div>
        ))}
      </div>

      {stats.monthlyRevenue && stats.monthlyRevenue.length > 0 && (
        <div className="monthly-revenue-section">
          <h4>Monthly Revenue Trend</h4>
          <div className="revenue-chart">
            {stats.monthlyRevenue.map((month, index) => (
              <div key={index} className="revenue-bar-container">
                <div 
                  className="revenue-bar" 
                  style={{ 
                    height: `${(month.revenue / Math.max(...stats.monthlyRevenue.map(m => m.revenue))) * 100}%` 
                  }}
                  title={`${month.month}: ${formatCurrency(month.revenue)}`}
                />
                <div className="revenue-month">{month.month}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceStatsCard;