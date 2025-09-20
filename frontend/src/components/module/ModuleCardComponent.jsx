import React from 'react';
import CourseHeader from './CourseHeader';
import CourseActionButton from './CourseActionButton';
import ModuleInformationCard from './ModuleInformationCard';
import UpcomingTasks from './UpcomingTasks';
import UpcomingSessionCard from './UpcomingSessionCard';
import './css/ModuleCardComponent.css';

const ModuleCardComponent = ({ moduleCardData }) => {
  const {
    courseTitle,
    headerTitle,
    userAvatar,
    hasNotification,
    visualImage,
    progressValue,
    actionButtonText,
    onActionClick,
    moduleData,
    tasksData,
    sessionDetails
  } = moduleCardData || {};

  return (
    <div className="module-card-container">
      {/* Main Card */}
      <div className="module-main-card">
        {/* Course Header */}
        <CourseHeader
          courseTitle={courseTitle}
          userAvatar={userAvatar}
          headerTitle={headerTitle}
          hasNotification={hasNotification}
        />

        {/* Course Action Section */}
        <CourseActionButton
          courseTitle={courseTitle}
          userAvatar={userAvatar}
          headerTitle={headerTitle}
          visualImage={visualImage}
          progressValue={progressValue}
          actionButtonText={actionButtonText}
          onActionClick={onActionClick}
        />

        {/* Module Information */}
        <div className="module-info-section">
          <ModuleInformationCard moduleData={moduleData} />
        </div>
      </div>

      {/* Side Cards */}
      <div className="module-side-cards">
        {/* Upcoming Tasks */}
        <UpcomingTasks tasksData={tasksData} />

        {/* Upcoming Session */}
        <UpcomingSessionCard sessionDetails={sessionDetails} />
      </div>
    </div>
  );
};

export default ModuleCardComponent;