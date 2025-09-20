import React, { useState, useEffect } from 'react';
import InvoiceList from './InvoiceList';
import InvoiceStatsCard from './InvoiceStatsCard';
import { apiRequest } from '../../services/api';
import './css/AdminInvoiceList.css';

const AdminInvoiceList = () => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guardians, setGuardians] = useState([]);
  const [createForm, setCreateForm] = useState({
    guardian_id: '',
    amount: '',
    description: '',
    notes: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchGuardians();
  }, []);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const data = await apiRequest('/invoices/admin/stats');
      setStats(data);
    } catch (error) {
      setError('Error fetching stats: ' + error.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchGuardians = async () => {
    try {
      const data = await apiRequest('/users/guardians');
      setGuardians(data.users || []);
    } catch (error) {
      console.error('Error fetching guardians:', error);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    
    if (!createForm.guardian_id || !createForm.amount || !createForm.description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      setError('');
      
      await apiRequest('/invoices/create', {
        method: 'POST',
        body: JSON.stringify({
          guardian_id: createForm.guardian_id,
          amount: parseFloat(createForm.amount),
          description: createForm.description,
          notes: createForm.notes || null
        })
      });

      setShowCreateModal(false);
      setCreateForm({
        guardian_id: '',
        amount: '',
        description: '',
        notes: ''
      });
      // Refresh stats and list
      fetchStats();
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      setError('Error creating invoice: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleFormChange = (field, value) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="admin-invoice-container">
      <div className="admin-invoice-header">
        <h2>Invoice Management</h2>
        <button 
          className="btn-create-invoice"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Manual Invoice
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Invoice Statistics */}
      <InvoiceStatsCard stats={stats} loading={loadingStats} />

      {/* Invoice List */}
      <InvoiceList isAdmin={true} />

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Manual Invoice</h3>
              <button 
                className="btn-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="create-invoice-form">
              <div className="form-group">
                <label htmlFor="guardian_id">Guardian *</label>
                <select
                  id="guardian_id"
                  value={createForm.guardian_id}
                  onChange={(e) => handleFormChange('guardian_id', e.target.value)}
                  required
                >
                  <option value="">Select a guardian...</option>
                  {guardians.map(guardian => (
                    <option key={guardian.id} value={guardian.id}>
                      {guardian.profile?.fullName || guardian.email} ({guardian.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="amount">Amount (£) *</label>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="0"
                  value={createForm.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <input
                  type="text"
                  id="description"
                  value={createForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Brief description of the invoice..."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={createForm.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Additional notes for this invoice..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-create"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInvoiceList;