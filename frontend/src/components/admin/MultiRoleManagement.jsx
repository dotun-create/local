import React, { useState, useEffect, useRef } from 'react';
import { useMultiRoleAuth } from '../../hooks/useMultiRoleAuth';
import { useAuth, useCourses } from '../../hooks/useData';
import API from '../../services/api';
import './MultiRoleManagement.css';

const MultiRoleManagement = () => {
  const { hasRole, hasPermission, loading: authLoading } = useMultiRoleAuth();
  const { user: adminUser } = useAuth(); // Get existing admin user
  const { courses, loading: coursesLoading } = useCourses(); // Use the courses hook
  const [activeTab, setActiveTab] = useState('thresholds');
  const [courseSettings, setCourseSettings] = useState({});
  const [tutorQualifications, setTutorQualifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');
  const [bulkImportResults, setBulkImportResults] = useState(null);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [importMethod, setImportMethod] = useState('text'); // 'text' or 'file'
  const [importOptions, setImportOptions] = useState({
    dryRun: false,
    skipExisting: false,
    autoQualify: true,
    notificationEmail: ''
  });
  const [importProgress, setImportProgress] = useState(null);
  const [importJobs, setImportJobs] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Check both multi-role admin and regular admin
    const isMultiRoleAdmin = hasRole('admin') && hasPermission('can_access_admin');
    const isRegularAdmin = adminUser && (
      adminUser.isAdmin ||
      adminUser.role === 'admin' ||
      adminUser.accountType === 'admin' ||
      adminUser.profile?.role === 'Administrator' ||
      (adminUser.profile?.permissions && adminUser.profile.permissions.includes('all'))
    );

    if (isMultiRoleAdmin || isRegularAdmin) {
      loadData();
    }
  }, [hasRole, hasPermission, adminUser]);

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="loading">
        <p>Loading...</p>
      </div>
    );
  }

  // Check admin access - allow both multi-role admin and regular admin
  const isMultiRoleAdmin = hasRole('admin') && hasPermission('can_access_admin');
  const isRegularAdmin = adminUser && (
    adminUser.isAdmin ||
    adminUser.role === 'admin' ||
    adminUser.accountType === 'admin' ||
    adminUser.profile?.role === 'Administrator' ||
    (adminUser.profile?.permissions && adminUser.profile.permissions.includes('all'))
  );

  if (!isMultiRoleAdmin && !isRegularAdmin) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>Admin privileges required to access multi-role management.</p>
        <p>Debug Info: Multi-role Admin: {String(isMultiRoleAdmin)}, Regular Admin: {String(isRegularAdmin)}</p>
        {adminUser && <p>User Role: {adminUser.role || adminUser.accountType || 'unknown'}</p>}
        {adminUser && <p>User Data: {JSON.stringify(adminUser, null, 2)}</p>}
      </div>
    );
  }

  const loadData = async () => {
    setLoading(true);
    try {
      // Load course settings
      const settingsResponse = await API.admin.getAllCourseSettings();
      const settingsData = settingsResponse.settings || settingsResponse || [];

      // Convert array to object keyed by course_id
      const settingsMap = {};
      settingsData.forEach(setting => {
        settingsMap[setting.course_id] = setting;
      });
      setCourseSettings(settingsMap);

      // Load tutor qualifications
      const qualificationsResponse = await API.admin.getTutorQualifications();
      const qualificationsData = qualificationsResponse.qualifications || qualificationsResponse || [];
      setTutorQualifications(qualificationsData);

      // Load recent import jobs
      const jobsResponse = await API.admin.getBulkImportJobs({ limit: 10 });
      const jobsData = jobsResponse.jobs || jobsResponse || [];
      setImportJobs(jobsData);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays if API fails
      setCourseSettings({});
      setTutorQualifications([]);
      setImportJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const updateCourseThreshold = async (courseId, field, value) => {
    try {
      // Optimistically update UI
      setCourseSettings(prev => ({
        ...prev,
        [courseId]: {
          ...prev[courseId],
          [field]: value
        }
      }));

      // Call actual API
      await API.admin.updateCourseSettings(courseId, { [field]: value });
      console.log('Successfully updated course settings:', { courseId, field, value });
    } catch (error) {
      console.error('Error updating course threshold:', error);
      // Revert optimistic update on error
      await loadData();
      alert('Error updating course settings: ' + error.message);
    }
  };

  const manuallyQualifyTutor = async (userEmail, courseId, reason, score = null) => {
    try {
      const response = await API.admin.manuallyQualifyTutor(userEmail, courseId, {
        reason: reason,
        score: score
      });

      // Refresh data
      await loadData();

      // Show different messages based on whether it was reactivated or created
      const message = response.message ||
        (response.action === 'reactivated'
          ? `Successfully reactivated tutor qualification for ${userEmail}!`
          : `Successfully qualified ${userEmail} as tutor!`);

      alert(message);
    } catch (error) {
      console.error('Error qualifying tutor:', error);

      // Handle specific error messages
      let errorMessage = 'Error qualifying tutor: ';
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred';
      }

      alert(errorMessage);
    }
  };

  const revokeTutorQualification = async (qualificationId, reason) => {
    try {
      await API.admin.revokeTutorQualification(qualificationId, reason);

      // Refresh data
      await loadData();

      alert('Tutor qualification revoked successfully!');
    } catch (error) {
      console.error('Error revoking qualification:', error);
      alert('Error revoking qualification: ' + error.message);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }
      setBulkImportFile(file);

      // Read file content for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setBulkImportData(content);
      };
      reader.readAsText(file);
    }
  };

  const validateCsvData = async (csvData) => {
    try {
      const response = await API.admin.validateCsvData(csvData);
      return response;
    } catch (error) {
      console.error('CSV validation error:', error);
      return { valid: false, errors: [error.message] };
    }
  };

  const processBulkImport = async () => {
    if (importMethod === 'text' && !bulkImportData.trim()) {
      alert('Please enter bulk import data');
      return;
    }

    if (importMethod === 'file' && !bulkImportFile) {
      alert('Please select a CSV file');
      return;
    }

    try {
      setLoading(true);
      setImportProgress({ status: 'validating', message: 'Validating CSV data...' });

      let response;

      if (importMethod === 'file') {
        // Use file upload API
        response = await API.admin.bulkImportTutorsFromFile(bulkImportFile, importOptions);
      } else {
        // Use text data API
        response = await API.admin.bulkImportTutors(bulkImportData, importOptions);
      }

      if (importOptions.dryRun) {
        // Show preview results
        setBulkImportResults({
          ...response,
          isDryRun: true
        });
        setImportProgress({ status: 'preview', message: 'Preview completed - review results above' });
      } else {
        // Show actual import results
        setBulkImportResults(response);
        setImportProgress({ status: 'completed', message: 'Import completed successfully!' });

        // Refresh data
        await loadData();
      }

    } catch (error) {
      console.error('Error processing bulk import:', error);
      setBulkImportResults({
        total: 0,
        successful: 0,
        failed: 1,
        errors: [error.message]
      });
      setImportProgress({ status: 'error', message: 'Import failed: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const clearImportData = () => {
    setBulkImportData('');
    setBulkImportFile(null);
    setBulkImportResults(null);
    setImportProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderThresholdsTab = () => (
    <div className="thresholds-tab">
      <h3>Course Qualification Thresholds</h3>
      <p>Configure the minimum scores required for students to automatically become tutors.</p>

      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h4>No Courses Available</h4>
          <p>No courses have been created in the system yet. Create courses first to configure qualification thresholds.</p>
          <div className="empty-state-actions">
            <button className="btn secondary">
              Create Course
            </button>
          </div>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => {
            const settings = courseSettings[course.id] || {};
            return (
              <div key={course.id} className="course-threshold-card">
                <h4>{course.title}</h4>
                <p>{course.description}</p>

                <div className="threshold-controls">
                  <div className="control-group">
                    <label>Minimum Score to Qualify as Tutor:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.min_score_to_tutor || 85}
                      onChange={(e) => updateCourseThreshold(course.id, 'min_score_to_tutor', parseInt(e.target.value))}
                    />
                    <span>%</span>
                  </div>

                  <div className="control-group">
                    <label>Max Students per Tutor:</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={settings.max_students_per_tutor || 10}
                      onChange={(e) => updateCourseThreshold(course.id, 'max_students_per_tutor', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="control-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.auto_qualify !== false}
                        onChange={(e) => updateCourseThreshold(course.id, 'auto_qualify', e.target.checked)}
                      />
                      Enable Automatic Qualification
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderTutorsTab = () => (
    <div className="tutors-tab">
      <h3>Tutor Qualifications Management</h3>
      <p>View and manage tutor qualifications for all courses.</p>

      <div className="qualifications-table">
        <table>
          <thead>
            <tr>
              <th>Tutor</th>
              <th>Course</th>
              <th>Type</th>
              <th>Score</th>
              <th>Qualified Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tutorQualifications.map(qual => (
              <tr key={qual.id} className={!qual.isActive ? 'revoked' : ''}>
                <td>
                  <div>
                    <strong>{qual.user.name}</strong>
                    <br />
                    <small>{qual.user.email}</small>
                  </div>
                </td>
                <td>{qual.course.title}</td>
                <td>
                  <span className={`qualification-type ${qual.qualificationType}`}>
                    {qual.qualificationType}
                  </span>
                </td>
                <td>{qual.qualifyingScore ? `${qual.qualifyingScore}%` : 'N/A'}</td>
                <td>{new Date(qual.qualifiedAt).toLocaleDateString()}</td>
                <td>
                  <span className={`status ${qual.isActive ? 'active' : 'revoked'}`}>
                    {qual.isActive ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td>
                  {qual.isActive ? (
                    <button
                      className="revoke-btn"
                      onClick={() => {
                        const reason = prompt('Reason for revoking qualification:');
                        if (reason) {
                          revokeTutorQualification(qual.id, reason);
                        }
                      }}
                    >
                      Revoke
                    </button>
                  ) : (
                    <span className="revoked-info">
                      Revoked: {qual.revoke_reason}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="manual-qualification">
        <h4>Manually Qualify Tutor</h4>
        <div className="manual-form">
          <input
            type="email"
            placeholder="User email"
            id="manual-email"
          />
          <select id="manual-course">
            <option value="">Select Course</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Score (optional)"
            id="manual-score"
            min="0"
            max="100"
          />
          <input
            type="text"
            placeholder="Reason for manual qualification"
            id="manual-reason"
          />
          <button
            onClick={() => {
              const email = document.getElementById('manual-email').value;
              const courseId = document.getElementById('manual-course').value;
              const reason = document.getElementById('manual-reason').value;
              const score = document.getElementById('manual-score')?.value;

              if (!email || !courseId || !reason) {
                alert('Please fill all fields');
                return;
              }

              manuallyQualifyTutor(email, courseId, reason, score ? parseInt(score) : null);
            }}
          >
            Qualify Tutor
          </button>
        </div>
      </div>
    </div>
  );

  const renderBulkImportTab = () => (
    <div className="bulk-import-tab">
      <h3>Bulk Import Student-Tutors</h3>
      <p>Import existing students as tutors using "simulated achievement" approach.</p>

      {/* Import Method Selection */}
      <div className="import-method-selection">
        <h4>Import Method:</h4>
        <div className="method-options">
          <label>
            <input
              type="radio"
              name="importMethod"
              value="text"
              checked={importMethod === 'text'}
              onChange={(e) => setImportMethod(e.target.value)}
            />
            Paste CSV Text
          </label>
          <label>
            <input
              type="radio"
              name="importMethod"
              value="file"
              checked={importMethod === 'file'}
              onChange={(e) => setImportMethod(e.target.value)}
            />
            Upload CSV File
          </label>
        </div>
      </div>

      {/* Import Options */}
      <div className="import-options">
        <h4>Import Options:</h4>
        <div className="options-grid">
          <label>
            <input
              type="checkbox"
              checked={importOptions.dryRun}
              onChange={(e) => setImportOptions(prev => ({ ...prev, dryRun: e.target.checked }))}
            />
            Preview Only (Dry Run)
          </label>
          <label>
            <input
              type="checkbox"
              checked={importOptions.skipExisting}
              onChange={(e) => setImportOptions(prev => ({ ...prev, skipExisting: e.target.checked }))}
            />
            Skip Existing Qualifications
          </label>
          <label>
            <input
              type="checkbox"
              checked={importOptions.autoQualify}
              onChange={(e) => setImportOptions(prev => ({ ...prev, autoQualify: e.target.checked }))}
            />
            Auto-Qualify Based on Scores
          </label>
          <div className="notification-email">
            <input
              type="email"
              placeholder="Notification email (optional)"
              value={importOptions.notificationEmail}
              onChange={(e) => setImportOptions(prev => ({ ...prev, notificationEmail: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* CSV Format Instructions */}
      <div className="import-instructions">
        <h4>Required CSV Format:</h4>
        <pre>email,course_id,score,qualification_date{'\n'}student1@example.com,course-1,92,2024-01-15{'\n'}student2@example.com,course-2,88,2024-01-10{'\n'}student3@example.com,course-1,95,2024-01-12</pre>
        <div className="format-notes">
          <strong>Notes:</strong>
          <ul>
            <li><strong>email:</strong> Must be an existing user in the system</li>
            <li><strong>course_id:</strong> Must be a valid course ID (e.g., course-1, course-2)</li>
            <li><strong>score:</strong> Number between 0-100</li>
            <li><strong>qualification_date:</strong> Format: YYYY-MM-DD</li>
          </ul>
        </div>
      </div>

      {/* Import Form */}
      <div className="import-form">
        {importMethod === 'text' ? (
          <textarea
            value={bulkImportData}
            onChange={(e) => setBulkImportData(e.target.value)}
            placeholder="Paste CSV data here..."
            rows="10"
            cols="80"
            className="csv-textarea"
          />
        ) : (
          <div className="file-upload-section">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="file-input"
            />
            {bulkImportFile && (
              <div className="file-info">
                <span>📄 {bulkImportFile.name}</span>
                <span>({(bulkImportFile.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
            {bulkImportData && (
              <div className="file-preview">
                <h5>File Preview (first 5 lines):</h5>
                <pre>{bulkImportData.split('\n').slice(0, 5).join('\n')}</pre>
              </div>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        {importProgress && (
          <div className={`import-progress ${importProgress.status}`}>
            <div className="progress-message">
              {importProgress.status === 'validating' && '🔍 '}
              {importProgress.status === 'processing' && '⚙️ '}
              {importProgress.status === 'completed' && '✅ '}
              {importProgress.status === 'error' && '❌ '}
              {importProgress.status === 'preview' && '👁️ '}
              {importProgress.message}
            </div>
          </div>
        )}

        <div className="import-actions">
          <button
            onClick={processBulkImport}
            disabled={loading || (importMethod === 'text' && !bulkImportData.trim()) || (importMethod === 'file' && !bulkImportFile)}
            className="import-btn primary"
          >
            {loading ? 'Processing...' : importOptions.dryRun ? 'Preview Import' : 'Process Import'}
          </button>
          <button
            onClick={clearImportData}
            className="clear-btn secondary"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Import Results */}
      {bulkImportResults && (
        <div className="import-results">
          <h4>
            {bulkImportResults.isDryRun ? 'Import Preview Results' : 'Import Results'}
            {bulkImportResults.isDryRun && <span className="dry-run-badge">PREVIEW MODE</span>}
          </h4>

          <div className="results-summary">
            <div className="result-card success">
              <span className="result-icon">✅</span>
              <span className="result-number">{bulkImportResults.successful || 0}</span>
              <span className="result-label">Successful</span>
            </div>
            <div className="result-card failed">
              <span className="result-icon">❌</span>
              <span className="result-number">{bulkImportResults.failed || 0}</span>
              <span className="result-label">Failed</span>
            </div>
            <div className="result-card total">
              <span className="result-icon">📊</span>
              <span className="result-number">{bulkImportResults.total || 0}</span>
              <span className="result-label">Total</span>
            </div>
          </div>

          {bulkImportResults.errors && bulkImportResults.errors.length > 0 && (
            <div className="errors-section">
              <h5>Errors ({bulkImportResults.errors.length}):</h5>
              <div className="errors-list">
                {bulkImportResults.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <span className="error-icon">⚠️</span>
                    <span className="error-message">{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkImportResults.qualified && bulkImportResults.qualified.length > 0 && (
            <div className="qualified-section">
              <h5>Successfully Qualified ({bulkImportResults.qualified.length}):</h5>
              <div className="qualified-list">
                {bulkImportResults.qualified.map((item, index) => (
                  <div key={index} className="qualified-item">
                    <span className="user-email">{item.email}</span>
                    <span className="course-arrow">→</span>
                    <span className="course-title">{item.course}</span>
                    <span className="score-badge">Score: {item.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkImportResults.warnings && bulkImportResults.warnings.length > 0 && (
            <div className="warnings-section">
              <h5>Warnings ({bulkImportResults.warnings.length}):</h5>
              <div className="warnings-list">
                {bulkImportResults.warnings.map((warning, index) => (
                  <div key={index} className="warning-item">
                    <span className="warning-icon">⚠️</span>
                    <span className="warning-message">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkImportResults.isDryRun && bulkImportResults.successful > 0 && (
            <div className="proceed-actions">
              <button
                onClick={() => {
                  setImportOptions(prev => ({ ...prev, dryRun: false }));
                  processBulkImport();
                }}
                className="proceed-btn"
              >
                Proceed with Actual Import
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Import Jobs */}
      {importJobs.length > 0 && (
        <div className="import-history">
          <h4>Recent Import Jobs</h4>
          <div className="jobs-list">
            {importJobs.slice(0, 5).map((job, index) => (
              <div key={job.id || index} className={`job-item ${job.job_status}`}>
                <div className="job-info">
                  <span className="job-date">{new Date(job.created_at).toLocaleDateString()}</span>
                  <span className="job-file">{job.file_name || 'Text Import'}</span>
                  <span className={`job-status ${job.job_status}`}>{job.job_status}</span>
                </div>
                <div className="job-stats">
                  <span>Total: {job.total_records}</span>
                  <span>Success: {job.successful_records}</span>
                  <span>Failed: {job.failed_records}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="multi-role-management">
      <div className="management-header">
        <h2>Multi-Role System Management</h2>
        <p>Manage course qualification thresholds, tutor qualifications, and bulk imports.</p>
      </div>

      <div className="management-tabs">
        <button
          className={`tab ${activeTab === 'thresholds' ? 'active' : ''}`}
          onClick={() => setActiveTab('thresholds')}
        >
          Course Thresholds
        </button>
        <button
          className={`tab ${activeTab === 'tutors' ? 'active' : ''}`}
          onClick={() => setActiveTab('tutors')}
        >
          Tutor Management
        </button>
        <button
          className={`tab ${activeTab === 'bulk-import' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk-import')}
        >
          Bulk Import
        </button>
      </div>

      <div className="management-content">
        {(loading || coursesLoading) && <div className="loading">Loading...</div>}
        {activeTab === 'thresholds' && renderThresholdsTab()}
        {activeTab === 'tutors' && renderTutorsTab()}
        {activeTab === 'bulk-import' && renderBulkImportTab()}
      </div>
    </div>
  );
};

export default MultiRoleManagement;