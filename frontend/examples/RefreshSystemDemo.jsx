/**
 * Hybrid Refresh System Demo Component
 * 
 * This component demonstrates the integration and usage of the hybrid refresh system
 * across different page types and scenarios.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTutorPageRefresh, useStudentPageRefresh, useAdminPageRefresh } from '../src/hooks/useAdminRefresh';

const RefreshSystemDemo = () => {
  const [demoType, setDemoType] = useState('tutor');
  const [refreshLog, setRefreshLog] = useState([]);
  const [simulatedData, setSimulatedData] = useState({
    tutorData: { sessions: 0, students: 0, earnings: 0 },
    studentData: { courses: 0, tasks: 0, credits: 0 },
    adminData: { users: 0, courses: 0, revenue: 0 }
  });

  // Add log entry
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setRefreshLog(prev => [...prev.slice(-9), { timestamp, message, type }]);
  }, []);

  // Simulate data loading functions
  const loadTutorData = useCallback(async () => {
    addLog('Loading tutor data...', 'info');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setSimulatedData(prev => ({
      ...prev,
      tutorData: {
        sessions: Math.floor(Math.random() * 50) + 10,
        students: Math.floor(Math.random() * 20) + 5,
        earnings: Math.floor(Math.random() * 5000) + 1000
      }
    }));
    
    addLog('✅ Tutor data loaded successfully', 'success');
  }, [addLog]);

  const loadStudentData = useCallback(async () => {
    addLog('Loading student data...', 'info');
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setSimulatedData(prev => ({
      ...prev,
      studentData: {
        courses: Math.floor(Math.random() * 10) + 2,
        tasks: Math.floor(Math.random() * 15) + 3,
        credits: Math.floor(Math.random() * 500) + 50
      }
    }));
    
    addLog('✅ Student data loaded successfully', 'success');
  }, [addLog]);

  const loadAdminData = useCallback(async () => {
    addLog('Loading admin data...', 'info');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSimulatedData(prev => ({
      ...prev,
      adminData: {
        users: Math.floor(Math.random() * 1000) + 100,
        courses: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 50000) + 10000
      }
    }));
    
    addLog('✅ Admin data loaded successfully', 'success');
  }, [addLog]);

  // Refresh handlers for different page types
  const handleTutorRefresh = useCallback(async (event) => {
    addLog(`🔄 Tutor refresh triggered: ${event?.detail?.source || 'manual'}`, 'info');
    try {
      await Promise.all([
        loadTutorData(),
        // Simulate availability data loading
        new Promise(async (resolve) => {
          await new Promise(r => setTimeout(r, 400));
          addLog('✅ Availability data refreshed', 'success');
          resolve();
        })
      ]);
      addLog('🎉 Tutor page refresh completed', 'success');
    } catch (error) {
      addLog(`❌ Tutor refresh failed: ${error.message}`, 'error');
    }
  }, [loadTutorData, addLog]);

  const handleStudentRefresh = useCallback(async (event) => {
    addLog(`🔄 Student refresh triggered: ${event?.detail?.source || 'manual'}`, 'info');
    try {
      await Promise.all([
        loadStudentData(),
        // Simulate quiz tasks loading
        new Promise(async (resolve) => {
          await new Promise(r => setTimeout(r, 300));
          addLog('✅ Quiz tasks refreshed', 'success');
          resolve();
        })
      ]);
      addLog('🎉 Student dashboard refresh completed', 'success');
    } catch (error) {
      addLog(`❌ Student refresh failed: ${error.message}`, 'error');
    }
  }, [loadStudentData, addLog]);

  const handleAdminRefresh = useCallback(async (event) => {
    addLog(`🔄 Admin refresh triggered: ${event?.detail?.source || 'manual'}`, 'info');
    try {
      await Promise.all([
        loadAdminData(),
        // Simulate analytics loading
        new Promise(async (resolve) => {
          await new Promise(r => setTimeout(r, 600));
          addLog('✅ Analytics refreshed', 'success');
          resolve();
        })
      ]);
      addLog('🎉 Admin page refresh completed', 'success');
    } catch (error) {
      addLog(`❌ Admin refresh failed: ${error.message}`, 'error');
    }
  }, [loadAdminData, addLog]);

  // Initialize refresh hooks
  const tutorRefresh = useTutorPageRefresh('demo-tutor-id', handleTutorRefresh);
  const studentRefresh = useStudentPageRefresh('demo-student-id', handleStudentRefresh);
  const adminRefresh = useAdminPageRefresh(handleAdminRefresh);

  // Get current refresh hook based on demo type
  const getCurrentRefresh = () => {
    switch (demoType) {
      case 'tutor': return tutorRefresh;
      case 'student': return studentRefresh;
      case 'admin': return adminRefresh;
      default: return tutorRefresh;
    }
  };

  const { triggerRefresh, isRefreshing } = getCurrentRefresh();

  // Simulate cross-component events
  const triggerCrossComponentEvent = () => {
    const events = {
      tutor: 'refreshTutorData',
      student: 'refreshStudentData', 
      admin: 'refreshAdminData'
    };

    const eventType = events[demoType];
    addLog(`📡 Dispatching ${eventType} event`, 'info');
    
    window.dispatchEvent(new CustomEvent(eventType, {
      detail: { 
        source: 'cross_component',
        timestamp: Date.now()
      }
    }));
  };

  // Simulate WebSocket event
  const triggerWebSocketEvent = () => {
    const wsEvents = [
      'sessionCompleted',
      'creditAllocated',
      'enrollmentApproved',
      'userRegistered'
    ];
    
    const randomEvent = wsEvents[Math.floor(Math.random() * wsEvents.length)];
    addLog(`🌐 Simulating WebSocket event: ${randomEvent}`, 'info');
    
    window.dispatchEvent(new CustomEvent('adminDataRefresh', {
      detail: { 
        source: 'websocket',
        event: randomEvent,
        timestamp: Date.now()
      }
    }));
  };

  // Initialize with some data
  useEffect(() => {
    const initData = async () => {
      addLog('🚀 Initializing demo data...', 'info');
      await Promise.all([loadTutorData(), loadStudentData(), loadAdminData()]);
      addLog('✅ Demo initialization complete', 'success');
    };
    
    initData();
  }, [loadTutorData, loadStudentData, loadAdminData, addLog]);

  return (
    <div className="refresh-demo">
      <style>{`
        .refresh-demo {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .demo-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .demo-controls {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        
        .demo-type-selector {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .demo-type-btn {
          padding: 8px 16px;
          border: 2px solid #007bff;
          background: white;
          color: #007bff;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .demo-type-btn.active {
          background: #007bff;
          color: white;
        }
        
        .demo-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .primary-btn {
          background: #007bff;
          color: white;
        }
        
        .primary-btn:hover:not(:disabled) {
          background: #0056b3;
          transform: translateY(-1px);
        }
        
        .primary-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .secondary-btn {
          background: #6c757d;
          color: white;
        }
        
        .secondary-btn:hover {
          background: #545b62;
        }
        
        .demo-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        
        .data-panel, .log-panel {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .data-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }
        
        .data-card {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
          text-align: center;
        }
        
        .data-value {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 5px;
        }
        
        .data-label {
          font-size: 12px;
          color: #6c757d;
          text-transform: uppercase;
        }
        
        .log-container {
          height: 300px;
          overflow-y: auto;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 10px;
          background: #f8f9fa;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        
        .log-entry {
          margin-bottom: 5px;
          padding: 3px 5px;
          border-radius: 2px;
        }
        
        .log-entry.info { background: #e3f2fd; }
        .log-entry.success { background: #e8f5e8; }
        .log-entry.error { background: #ffebee; }
        
        .log-timestamp {
          color: #666;
          margin-right: 10px;
        }
        
        @media (max-width: 768px) {
          .demo-content {
            grid-template-columns: 1fr;
          }
          
          .demo-controls {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>

      <div className="demo-header">
        <h1>🔄 Hybrid Refresh System Demo</h1>
        <p>Interactive demonstration of the cross-page refresh system</p>
      </div>

      <div className="demo-controls">
        <div className="demo-type-selector">
          <span>Page Type:</span>
          {['tutor', 'student', 'admin'].map(type => (
            <button
              key={type}
              className={`demo-type-btn ${demoType === type ? 'active' : ''}`}
              onClick={() => setDemoType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        
        <button
          className="demo-btn primary-btn"
          onClick={triggerRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? '⏳ Refreshing...' : '🔄 Manual Refresh'}
        </button>
        
        <button
          className="demo-btn secondary-btn"
          onClick={triggerCrossComponentEvent}
        >
          📡 Cross-Component Event
        </button>
        
        <button
          className="demo-btn secondary-btn"
          onClick={triggerWebSocketEvent}
        >
          🌐 WebSocket Event
        </button>
      </div>

      <div className="demo-content">
        <div className="data-panel">
          <h3>📊 Current Data ({demoType.charAt(0).toUpperCase() + demoType.slice(1)})</h3>
          <div className="data-grid">
            {Object.entries(simulatedData[`${demoType}Data`]).map(([key, value]) => (
              <div key={key} className="data-card">
                <div className="data-value">{value}</div>
                <div className="data-label">{key}</div>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '20px', padding: '10px', background: '#f0f8ff', borderRadius: '5px' }}>
            <strong>Refresh Status:</strong> {isRefreshing ? 
              <span style={{color: '#ff6b35'}}>🔄 In Progress</span> : 
              <span style={{color: '#4caf50'}}>✅ Ready</span>
            }
          </div>
        </div>

        <div className="log-panel">
          <h3>📝 Activity Log</h3>
          <div className="log-container">
            {refreshLog.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
                No activity yet. Try triggering a refresh!
              </div>
            ) : (
              refreshLog.map((entry, index) => (
                <div key={index} className={`log-entry ${entry.type}`}>
                  <span className="log-timestamp">[{entry.timestamp}]</span>
                  <span>{entry.message}</span>
                </div>
              ))
            )}
          </div>
          
          <button
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              fontSize: '12px',
              border: '1px solid #ccc',
              background: '#f8f9fa',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
            onClick={() => setRefreshLog([])}
          >
            Clear Log
          </button>
        </div>
      </div>

      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3>📖 Demo Features</h3>
        <ul style={{ marginLeft: '20px' }}>
          <li><strong>Manual Refresh:</strong> Click the refresh button to trigger data reload</li>
          <li><strong>Cross-Component Events:</strong> Simulate events from other components</li>
          <li><strong>WebSocket Events:</strong> Simulate real-time server updates</li>
          <li><strong>Page Type Switching:</strong> See different refresh behaviors per page type</li>
          <li><strong>Concurrent Operations:</strong> Multiple data sources refresh simultaneously</li>
          <li><strong>Loading States:</strong> Visual feedback during refresh operations</li>
        </ul>
      </div>
    </div>
  );
};

export default RefreshSystemDemo;