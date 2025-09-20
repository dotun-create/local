import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useData';
import dataService from '../../services/dataService';
import './TutorQualificationInfo.css';

const TutorQualificationInfo = () => {
  const { user } = useAuth();
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQualifications();
  }, []);

  const loadQualifications = async () => {
    try {
      setLoading(true);
      setError(null);

      if (user?.id) {
        const response = await dataService.getTutorQualifications(user.id);
        setQualifications(response.qualifications || []);
      }
    } catch (err) {
      setError('Failed to load qualifications');
      console.error('Error loading qualifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getQualificationBadge = (qualification) => {
    const isActive = qualification.isActive;
    const type = qualification.qualificationType || 'manual';

    const badgeClass = isActive ? 'badge-active' : 'badge-inactive';
    const typeClass = type === 'auto' ? 'badge-auto' : 'badge-manual';

    return (
      <div className={`qualification-badges`}>
        <span className={`status-badge ${badgeClass}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <span className={`type-badge ${typeClass}`}>
          {type === 'auto' ? 'Auto-Qualified' : 'Manual'}
        </span>
      </div>
    );
  };

  const getScoreDisplay = (score, passingScore) => {
    if (score === null || score === undefined) return 'N/A';

    const percentage = Math.round(score);
    const isPassing = passingScore ? score >= passingScore : true;

    return (
      <div className={`score-display ${isPassing ? 'score-pass' : 'score-fail'}`}>
        <span className="score-value">{percentage}%</span>
        {passingScore && (
          <span className="score-requirement">
            (Required: {Math.round(passingScore)}%)
          </span>
        )}
      </div>
    );
  };

  const renderQualificationCard = (qualification) => (
    <div key={qualification.id} className="qualification-card">
      <div className="qualification-header">
        <div className="qualification-title">
          <h4>{qualification.courseName || qualification.courseId}</h4>
          {getQualificationBadge(qualification)}
        </div>
      </div>

      <div className="qualification-details">
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Qualifying Score:</span>
            <span className="detail-value">
              {getScoreDisplay(qualification.qualifyingScore, qualification.courseThreshold)}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Qualified Date:</span>
            <span className="detail-value">
              {formatDate(qualification.qualifiedAt)}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Course ID:</span>
            <span className="detail-value course-id">
              {qualification.courseId}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Qualification Type:</span>
            <span className="detail-value">
              {qualification.qualificationType === 'auto' ? 'Automatic' : 'Manual'}
            </span>
          </div>
        </div>

        {qualification.courseDescription && (
          <div className="course-description">
            <span className="detail-label">Course Description:</span>
            <p>{qualification.courseDescription}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStats = () => {
    const activeQualifications = qualifications.filter(q => q.isActive);
    const autoQualifications = qualifications.filter(q => q.qualificationType === 'auto');
    const averageScore = qualifications.length > 0
      ? qualifications.reduce((sum, q) => sum + (q.qualifyingScore || 0), 0) / qualifications.length
      : 0;

    return (
      <div className="qualification-stats">
        <div className="stat-card">
          <div className="stat-value">{activeQualifications.length}</div>
          <div className="stat-label">Active Qualifications</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{qualifications.length}</div>
          <div className="stat-label">Total Courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{autoQualifications.length}</div>
          <div className="stat-label">Auto-Qualified</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(averageScore)}%</div>
          <div className="stat-label">Average Score</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="qualification-loading">Loading qualifications...</div>;
  }

  return (
    <div className="tutor-qualification-info">
      <div className="qualification-header">
        <h3>Your Tutor Qualifications</h3>
        <p>Courses you're qualified to tutor and your performance</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {qualifications.length > 0 && renderStats()}

      <div className="qualifications-section">
        {qualifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h4>No Qualifications Yet</h4>
            <p>
              You haven't been qualified to tutor any courses yet.
              Complete course quizzes with high scores to become automatically qualified,
              or contact an administrator for manual qualification.
            </p>
          </div>
        ) : (
          <div className="qualifications-list">
            {qualifications.map(renderQualificationCard)}
          </div>
        )}
      </div>

      <div className="refresh-section">
        <button onClick={loadQualifications} className="refresh-btn">
          Refresh Qualifications
        </button>
      </div>
    </div>
  );
};

export default TutorQualificationInfo;