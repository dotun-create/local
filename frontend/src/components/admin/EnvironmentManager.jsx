import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import './css/EnvironmentManager.css';

const EnvironmentManager = () => {
  const [environmentData, setEnvironmentData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingVariables, setEditingVariables] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [unmaskedVariables, setUnmaskedVariables] = useState({});
  const [validationResults, setValidationResults] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  // Load environment variables on component mount
  useEffect(() => {
    loadEnvironmentVariables();
    loadValidationResults();
  }, []);

  const loadEnvironmentVariables = async (maskSensitive = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await API.environment.getAllVariables(maskSensitive);
      
      if (response.success) {
        setEnvironmentData(response.environment_variables);
      } else {
        setError('Failed to load environment variables');
      }
    } catch (err) {
      console.error('Error loading environment variables:', err);
      
      // Provide more specific error messages
      if (err.response?.status === 404) {
        setError('Environment management endpoint not available. Feature may be disabled.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin permissions required.');
      } else if (err.response?.status === 500) {
        setError('Server error loading environment variables. Some services may be unavailable.');
      } else {
        setError('Error loading environment variables. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadValidationResults = async () => {
    try {
      const response = await API.environment.validateEnvironment();
      if (response.success) {
        setValidationResults(response.validation);
      }
    } catch (err) {
      console.error('Error loading validation results:', err);
    }
  };

  const handleEditVariable = (category, variableName, currentValue) => {
    setEditingVariables({
      ...editingVariables,
      [`${category}-${variableName}`]: currentValue
    });
  };

  const handleSaveVariable = async (category, variableName) => {
    const key = `${category}-${variableName}`;
    const newValue = editingVariables[key];
    
    try {
      setSaveStatus({ ...saveStatus, [key]: 'saving' });
      
      const response = await API.environment.updateVariable(variableName, newValue);
      
      if (response.success) {
        setSaveStatus({ ...saveStatus, [key]: 'success' });
        
        // Update the local data
        setEnvironmentData(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            [variableName]: {
              ...prev[category][variableName],
              value: response.masked_value
            }
          }
        }));
        
        // Clear editing state
        const newEditingVariables = { ...editingVariables };
        delete newEditingVariables[key];
        setEditingVariables(newEditingVariables);
        
        // Clear status after 3 seconds
        setTimeout(() => {
          setSaveStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[key];
            return newStatus;
          });
        }, 3000);
        
        // Reload validation results
        loadValidationResults();
        
      } else {
        setSaveStatus({ ...saveStatus, [key]: 'error' });
      }
    } catch (err) {
      console.error('Error saving variable:', err);
      setSaveStatus({ ...saveStatus, [key]: 'error' });
    }
  };

  const handleCancelEdit = (category, variableName) => {
    const key = `${category}-${variableName}`;
    const newEditingVariables = { ...editingVariables };
    delete newEditingVariables[key];
    setEditingVariables(newEditingVariables);
  };

  const handleUnmaskVariable = async (category, variableName) => {
    try {
      const response = await API.environment.unmaskVariable(variableName);
      
      if (response.success) {
        setUnmaskedVariables({
          ...unmaskedVariables,
          [`${category}-${variableName}`]: response.value
        });
      }
    } catch (err) {
      console.error('Error unmasking variable:', err);
    }
  };

  const handleMaskVariable = (category, variableName) => {
    const key = `${category}-${variableName}`;
    const newUnmaskedVariables = { ...unmaskedVariables };
    delete newUnmaskedVariables[key];
    setUnmaskedVariables(newUnmaskedVariables);
  };

  const getDisplayValue = (category, variableName, variable) => {
    const key = `${category}-${variableName}`;
    
    // If currently editing, return the edit value
    if (editingVariables[key] !== undefined) {
      return editingVariables[key];
    }
    
    // If unmasked, return the unmasked value
    if (unmaskedVariables[key] !== undefined) {
      return unmaskedVariables[key];
    }
    
    // Return the current (potentially masked) value
    return variable.value || '';
  };

  const getStatusIcon = (category, variableName) => {
    const key = `${category}-${variableName}`;
    const status = saveStatus[key];
    
    switch (status) {
      case 'saving':
        return <span className="status-icon saving">⏳</span>;
      case 'success':
        return <span className="status-icon success">✅</span>;
      case 'error':
        return <span className="status-icon error">❌</span>;
      default:
        return null;
    }
  };

  const getValidationStatus = (category) => {
    if (!validationResults) return null;
    
    const categoryMap = {
      'Database': 'Database',
      'JWT & Security': 'JWT Authentication',
      'Email Configuration': 'Email System',
      'Stripe Payment': 'Payment Processing',
      'OpenAI Configuration': 'AI Features',
      'Zoom Integration': 'Video Conferencing'
    };
    
    const featureName = categoryMap[category];
    if (!featureName) return null;
    
    const feature = validationResults.feature_status[featureName];
    if (!feature) return null;
    
    return (
      <div className={`validation-status ${feature.status}`}>
        {feature.status === 'complete' ? '✅' : '⚠️'} 
        {feature.status === 'complete' ? 'Complete' : 'Incomplete'}
      </div>
    );
  };

  const filteredCategories = activeCategory === 'all' 
    ? Object.keys(environmentData)
    : [activeCategory];

  if (loading) {
    return (
      <div className="environment-manager">
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Loading environment variables...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="environment-manager">
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h3>Error Loading Environment</h3>
          <p>{error}</p>
          <button onClick={() => loadEnvironmentVariables()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="environment-manager">
      <div className="environment-header">
        <h2>🔧 Environment Variables</h2>
        <div className="environment-actions">
          <button 
            onClick={loadValidationResults} 
            className="btn btn-secondary"
          >
            🔍 Validate Setup
          </button>
          <button 
            onClick={() => loadEnvironmentVariables(true)} 
            className="btn btn-primary"
          >
            🔄 Reload Variables
          </button>
        </div>
      </div>

      {validationResults && (
        <div className="validation-overview">
          <h3>System Validation</h3>
          <div className="validation-status-grid">
            {Object.entries(validationResults.feature_status).map(([feature, status]) => (
              <div key={feature} className={`validation-card ${status.status}`}>
                <div className="validation-icon">
                  {status.status === 'complete' ? '✅' : '⚠️'}
                </div>
                <div className="validation-info">
                  <h4>{feature}</h4>
                  <p>
                    {status.missing_keys.length > 0 && `Missing: ${status.missing_keys.join(', ')}`}
                    {status.empty_keys.length > 0 && `Empty: ${status.empty_keys.join(', ')}`}
                    {status.status === 'complete' && 'All requirements met'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="environment-content">
        <div className="category-filter">
          <button 
            className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All Categories
          </button>
          {Object.keys(environmentData).map(category => (
            <button 
              key={category}
              className={`filter-btn ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="environment-categories">
          {filteredCategories.map(category => (
            <div key={category} className="category-section">
              <div className="category-header">
                <h3>{category}</h3>
                {getValidationStatus(category)}
              </div>
              
              <div className="variables-grid">
                {Object.entries(environmentData[category] || {}).map(([variableName, variable]) => {
                  const key = `${category}-${variableName}`;
                  const isEditing = editingVariables[key] !== undefined;
                  const isUnmasked = unmaskedVariables[key] !== undefined;
                  
                  return (
                    <div key={variableName} className="variable-card">
                      <div className="variable-header">
                        <div className="variable-name">
                          <span className="var-name">{variableName}</span>
                          {variable.sensitive && <span className="sensitive-badge">🔐 Sensitive</span>}
                          <span className={`source-badge ${variable.source}`}>
                            {variable.source === 'file' ? '📁 File' : '⚡ Runtime'}
                          </span>
                        </div>
                        <div className="variable-actions">
                          {getStatusIcon(category, variableName)}
                        </div>
                      </div>
                      
                      <div className="variable-value">
                        {isEditing ? (
                          <div className="edit-mode">
                            <textarea
                              value={getDisplayValue(category, variableName, variable)}
                              onChange={(e) => setEditingVariables({
                                ...editingVariables,
                                [key]: e.target.value
                              })}
                              className="variable-input"
                              rows="3"
                            />
                            <div className="edit-actions">
                              <button 
                                onClick={() => handleSaveVariable(category, variableName)}
                                className="btn btn-primary btn-sm"
                                disabled={saveStatus[key] === 'saving'}
                              >
                                💾 Save
                              </button>
                              <button 
                                onClick={() => handleCancelEdit(category, variableName)}
                                className="btn btn-secondary btn-sm"
                              >
                                ❌ Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="display-mode">
                            <div className="value-display">
                              <code className={variable.sensitive && !isUnmasked ? 'masked' : 'unmasked'}>
                                {getDisplayValue(category, variableName, variable)}
                              </code>
                            </div>
                            <div className="display-actions">
                              <button 
                                onClick={() => handleEditVariable(category, variableName, 
                                  isUnmasked ? unmaskedVariables[key] : variable.value)}
                                className="btn btn-outline btn-sm"
                              >
                                ✏️ Edit
                              </button>
                              {variable.sensitive && (
                                <button 
                                  onClick={() => isUnmasked 
                                    ? handleMaskVariable(category, variableName)
                                    : handleUnmaskVariable(category, variableName)
                                  }
                                  className="btn btn-outline btn-sm"
                                >
                                  {isUnmasked ? '🙈 Mask' : '👁️ Unmask'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentManager;