import React, { useState, useEffect } from 'react';
import './css/AdminCreation.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';

const AdminCreation = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [admins, setAdmins] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // Create admin form state
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'Administrator'
  });

  // Delete admin form state
  const [deleteEmail, setDeleteEmail] = useState('');

  useEffect(() => {
    checkSessionStatus();
  }, []);

  const checkSessionStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-creation/session-status`);
      const data = await response.json();
      if (data.verified) {
        setIsVerified(true);
        loadAdmins();
      }
    } catch (error) {
      console.error('Error checking session status:', error);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handlePasskeySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin-creation/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ passkey }),
      });

      const data = await response.json();

      if (data.success) {
        setIsVerified(true);
        setPasskey('');
        showMessage('Passkey verified successfully!');
        loadAdmins();
      } else {
        showMessage(data.message || 'Invalid passkey', 'error');
      }
    } catch (error) {
      showMessage('Error verifying passkey', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-creation/list`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setAdmins(data.admins);
      } else {
        showMessage(data.message || 'Error loading admins', 'error');
      }
    } catch (error) {
      showMessage('Error loading admins', 'error');
      console.error('Error:', error);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin-creation/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (data.success) {
        showMessage(`Admin user created successfully: ${data.admin.email}`);
        setCreateForm({
          email: '',
          password: '',
          name: '',
          role: 'Administrator'
        });
        loadAdmins();
      } else {
        showMessage(data.message || 'Error creating admin', 'error');
      }
    } catch (error) {
      showMessage('Error creating admin', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to delete admin user: ${deleteEmail}?`)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin-creation/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: deleteEmail }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage(`Admin user deleted successfully: ${data.deleted_admin.email}`);
        setDeleteEmail('');
        loadAdmins();
      } else {
        showMessage(data.message || 'Error deleting admin', 'error');
      }
    } catch (error) {
      showMessage('Error deleting admin', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/admin-creation/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      setIsVerified(false);
      setAdmins([]);
      showMessage('Session cleared');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!isVerified) {
    return (
      <div className="admin-creation-container">
        <div className="admin-creation-card">
          <h1>Admin Creation Portal</h1>
          <p>Please enter the admin passkey to access the admin management interface.</p>
          
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}

          <form onSubmit={handlePasskeySubmit}>
            <div className="form-group">
              <label htmlFor="passkey">Admin Passkey:</label>
              <input
                type="password"
                id="passkey"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                required
                placeholder="Enter admin passkey"
              />
            </div>
            <button type="submit" disabled={loading} className="verify-btn">
              {loading ? 'Verifying...' : 'Verify Passkey'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-creation-container">
      <div className="admin-creation-header">
        <h1>Admin Management Portal</h1>
        <button onClick={handleLogout} className="logout-btn">
          Clear Session
        </button>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="admin-sections">
        {/* Create Admin Section */}
        <div className="admin-section">
          <h2>Create New Admin</h2>
          <form onSubmit={handleCreateAdmin} className="admin-form">
            <div className="form-group">
              <label htmlFor="create-email">Email:</label>
              <input
                type="email"
                id="create-email"
                value={createForm.email}
                onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                required
                placeholder="admin@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="create-password">Password:</label>
              <input
                type="password"
                id="create-password"
                value={createForm.password}
                onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                required
                placeholder="Enter secure password"
                minLength="6"
              />
            </div>
            <div className="form-group">
              <label htmlFor="create-name">Full Name:</label>
              <input
                type="text"
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                required
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label htmlFor="create-role">Role:</label>
              <input
                type="text"
                id="create-role"
                value={createForm.role}
                onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                placeholder="Administrator"
              />
            </div>
            <button type="submit" disabled={loading} className="create-btn">
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </form>
        </div>

        {/* Delete Admin Section */}
        <div className="admin-section">
          <h2>Delete Admin</h2>
          <form onSubmit={handleDeleteAdmin} className="admin-form">
            <div className="form-group">
              <label htmlFor="delete-email">Admin Email:</label>
              <input
                type="email"
                id="delete-email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                required
                placeholder="admin@example.com"
              />
            </div>
            <button type="submit" disabled={loading} className="delete-btn">
              {loading ? 'Deleting...' : 'Delete Admin'}
            </button>
          </form>
        </div>
      </div>

      {/* Admin List Section */}
      <div className="admin-section admin-list-section">
        <h2>Current Admin Users ({admins.length})</h2>
        {admins.length === 0 ? (
          <p className="no-admins">No admin users found.</p>
        ) : (
          <div className="admin-list">
            {admins.map((admin) => (
              <div key={admin.id} className="admin-item">
                <div className="admin-info">
                  <div className="admin-main-info">
                    <strong>{admin.name}</strong> ({admin.email})
                  </div>
                  <div className="admin-meta">
                    <span className="admin-role">{admin.role}</span>
                    <span className={`admin-status ${admin.status}`}>
                      {admin.status}
                    </span>
                    <span className="admin-id">ID: {admin.id}</span>
                  </div>
                  <div className="admin-dates">
                    <span>Created: {new Date(admin.created_at).toLocaleDateString()}</span>
                    {admin.last_login && (
                      <span>Last Login: {new Date(admin.last_login).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCreation;