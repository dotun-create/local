/**
 * Performance Dashboard Component
 * Real-time performance monitoring and optimization insights
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { performanceBenchmark } from '../utils/performanceBenchmark';

const DashboardContainer = styled.div`
  padding: ${({ theme }) => theme.space[6]};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.space[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
  padding-bottom: ${({ theme }) => theme.space[4]};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const RefreshButton = styled.button`
  background: ${({ theme }) => theme.colors.interactive.primary};
  color: white;
  border: none;
  padding: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.interactive.hover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[6]};
`;

const MetricCard = styled.div`
  background: ${({ theme }) => theme.colors.surface.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space[4]};
`;

const MetricHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const MetricTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const MetricBadge = styled.span`
  padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-transform: uppercase;

  ${({ rating, theme }) => {
    switch (rating) {
      case 'good':
        return `
          background: ${theme.colors.success[100]};
          color: ${theme.colors.success[800]};
        `;
      case 'needs-improvement':
        return `
          background: ${theme.colors.warning[100]};
          color: ${theme.colors.warning[800]};
        `;
      case 'poor':
        return `
          background: ${theme.colors.error[100]};
          color: ${theme.colors.error[800]};
        `;
      default:
        return `
          background: ${theme.colors.gray[100]};
          color: ${theme.colors.gray[800]};
        `;
    }
  }}
`;

const MetricValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.space[2]};
`;

const MetricDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const RecommendationsSection = styled.div`
  margin-top: ${({ theme }) => theme.space[6]};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const RecommendationCard = styled.div`
  background: ${({ theme }) => theme.colors.surface.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const RecommendationHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.space[2]};
`;

const RecommendationTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const PriorityBadge = styled.span`
  padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-transform: uppercase;

  ${({ priority, theme }) => {
    switch (priority) {
      case 'high':
        return `
          background: ${theme.colors.error[100]};
          color: ${theme.colors.error[800]};
        `;
      case 'medium':
        return `
          background: ${theme.colors.warning[100]};
          color: ${theme.colors.warning[800]};
        `;
      case 'low':
        return `
          background: ${theme.colors.gray[100]};
          color: ${theme.colors.gray[800]};
        `;
      default:
        return `
          background: ${theme.colors.gray[100]};
          color: ${theme.colors.gray[800]};
        `;
    }
  }}
`;

const SuggestionList = styled.ul`
  margin: ${({ theme }) => theme.space[2]} 0 0 0;
  padding-left: ${({ theme }) => theme.space[4]};
`;

const SuggestionItem = styled.li`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.space[1]};
`;

const PerformanceDashboard = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Trigger bundle analysis
      await performanceBenchmark.analyzeBundleSize();

      // Generate comprehensive report
      const newReport = performanceBenchmark.generatePerformanceReport();
      setReport(newReport);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to generate performance report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, []);

  const formatMetricValue = (type, value) => {
    switch (type) {
      case 'LCP':
      case 'FID':
      case 'FCP':
      case 'TTI':
        return `${Math.round(value)}ms`;
      case 'CLS':
        return value.toFixed(3);
      case 'Memory':
        return `${Math.round(value)}MB`;
      case 'BundleAnalysis':
        return `${Math.round(value)}KB`;
      default:
        return Math.round(value);
    }
  };

  const getOverallRating = (summary) => {
    if (!summary) return 'unknown';

    const goodCount = summary.ratings?.good || 0;
    const poorCount = summary.ratings?.poor || 0;
    const total = Object.values(summary.ratings || {}).reduce((a, b) => a + b, 0);

    if (total === 0) return 'unknown';
    if (goodCount / total >= 0.7) return 'good';
    if (poorCount / total >= 0.3) return 'poor';
    return 'needs-improvement';
  };

  const coreMetrics = [
    { key: 'LCP', name: 'Largest Contentful Paint', description: 'Loading performance' },
    { key: 'FID', name: 'First Input Delay', description: 'Interactivity' },
    { key: 'CLS', name: 'Cumulative Layout Shift', description: 'Visual stability' },
    { key: 'Memory', name: 'Memory Usage', description: 'Resource efficiency' },
  ];

  return (
    <DashboardContainer>
      <Header>
        <Title>Performance Dashboard</Title>
        <RefreshButton onClick={generateReport} disabled={loading}>
          {loading ? 'Generating...' : 'Refresh Report'}
        </RefreshButton>
      </Header>

      {lastUpdated && (
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          Last updated: {lastUpdated.toLocaleString()}
        </p>
      )}

      {report && (
        <>
          <MetricsGrid>
            {coreMetrics.map(({ key, name, description }) => {
              const summary = report.summary[key];
              const value = summary?.average || summary?.latest?.value || 0;
              const rating = getOverallRating(summary);

              return (
                <MetricCard key={key}>
                  <MetricHeader>
                    <MetricTitle>{name}</MetricTitle>
                    <MetricBadge rating={rating}>{rating}</MetricBadge>
                  </MetricHeader>
                  <MetricValue>{formatMetricValue(key, value)}</MetricValue>
                  <MetricDescription>{description}</MetricDescription>
                </MetricCard>
              );
            })}
          </MetricsGrid>

          {report.recommendations && report.recommendations.length > 0 && (
            <RecommendationsSection>
              <SectionTitle>Performance Recommendations</SectionTitle>
              {report.recommendations.map((rec, index) => (
                <RecommendationCard key={index}>
                  <RecommendationHeader>
                    <RecommendationTitle>{rec.issue}</RecommendationTitle>
                    <PriorityBadge priority={rec.priority}>{rec.priority} priority</PriorityBadge>
                  </RecommendationHeader>
                  <SuggestionList>
                    {rec.suggestions.map((suggestion, idx) => (
                      <SuggestionItem key={idx}>{suggestion}</SuggestionItem>
                    ))}
                  </SuggestionList>
                </RecommendationCard>
              ))}
            </RecommendationsSection>
          )}
        </>
      )}
    </DashboardContainer>
  );
};

export default PerformanceDashboard;