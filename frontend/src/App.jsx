import React from 'react';
import HowItWorksContainer from './components/general/HowItWorksContainer';
import StudentContainer from './components/general/StudentContainer';
import TroupeHeaderComponent from './components/headerandfooter/TroupeHeaderComponent';
import FooterComponent from './components/headerandfooter/FooterComponent';
import CoursePage from './components/courses/CoursePage';
import CourseDetailPage from './components/courses/CourseDetailPage';
import CourseWorkspace from './components/courses/CourseWorkspace';
import StudentCourseDetailPage from './components/courses/StudentCourseDetailPage';
import PaymentsPage from './components/payments/PaymentsPage';
import SessionBookingDemo from './components/misc/SessionBookingDemo';
import ModulePage from './components/module/ModulePage';
import StudentDashboard from './components/dashboard/StudentDashboard';
import GuardianDashboard from './components/guardian/GuardianDashboard';
import TutorPage from './components/pages/TutorPage';
import AdminPage from './components/pages/AdminPage';
import AdminCreation from './components/pages/AdminCreation';
import Quiz from './components/quiz/Quiz';
import QuizPage from './components/quiz/QuizPage';
import LoginPage from './components/pages/LoginPage';
import PasswordResetPage from './components/pages/PasswordResetPage';
import FAQPage from './components/pages/FAQPage';
import ContactPage from './components/pages/ContactPage';
import OurFocusPage from './components/pages/OurFocusPage';
import RefreshTestButton from './components/common/RefreshTestButton';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleDemo from './components/common/RoleDemo';
import ErrorBoundary from './components/common/ErrorBoundary';
import { RoleProvider } from './hooks/useMultiRoleAuth';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { appConfig } from './config';
import './App.css';

function App() {
  // Home page component with navigation
  const HomePage = () => {
    const navigate = useNavigate();
    
    // How It Works container action handler
    const handleGetStarted = () => {
      navigate('/signup');
    };

    return (
      <>
        <HowItWorksContainer
          titleText={appConfig.howItWorksContainer.titleText}
          howItWorksCardsContent={appConfig.howItWorksContainer.howItWorksCardsContent}
          actionButtonName={appConfig.howItWorksContainer.actionButtonName}
          actionButtonActionFunction={handleGetStarted}
        />
        
        <StudentContainer
          image={appConfig.studentContainer.image}
          texts={appConfig.studentContainer.texts}
          phrase={appConfig.studentContainer.phrase}
          link={appConfig.studentContainer.link}
          imageSide={appConfig.studentContainer.imageSide}
        />
        <StudentContainer
          image={appConfig.tutorContainer.image}
          texts={appConfig.tutorContainer.texts}
          phrase={appConfig.tutorContainer.phrase}
          link={appConfig.tutorContainer.link}
          imageSide={appConfig.tutorContainer.imageSide}
        />
      </>
    );
  };

  // Login function handler
  const handleLogin = (isLoggedIn) => {
    alert(`User ${isLoggedIn ? 'logged in' : 'logged out'}`);
  };

  return (
    <Router>
      <div className="app">
        <ErrorBoundary>
          <RoleProvider>
            <TroupeHeaderComponent
              mainText={appConfig.troupeHeader.mainText}
              textPortion={appConfig.troupeHeader.textPortion}
              loginFunction={handleLogin}
              imageLink={appConfig.troupeHeader.imageLink}
              headerMenuDictionary={appConfig.troupeHeader.headerMenuDictionary}
            />

            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/courses" element={<CoursePage />} />
              <Route path="/courses/:courseId" element={<CourseWorkspace />} />
              <Route path="/courses/:courseId/modules/:moduleId/quizzes/:quizId" element={<QuizPage />} />
              <Route path="/course-detail" element={<CourseWorkspace />} />
              <Route path="/student-course-detail/:courseId" element={<StudentCourseDetailPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/session-booking" element={<SessionBookingDemo />} />
              <Route path="/modules" element={<ModulePage />} />
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/guardian" element={<GuardianDashboard />} />
              <Route path="/tutor" element={<TutorPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admincreation" element={<AdminCreation />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<LoginPage />} />
              <Route path="/reset-password" element={<PasswordResetPage />} />
              <Route path="/quiz/:quizId?" element={<Quiz />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/how-it-works" element={<OurFocusPage />} />
              <Route path="/role-demo" element={<RoleDemo />} />
            </Routes>

            <FooterComponent
              listOfText={appConfig.footer.listOfText}
              dictionaryOfSocialMediaLogosAndLinks={appConfig.footer.dictionaryOfSocialMediaLogosAndLinks}
              copyRightText={appConfig.footer.copyRightText}
              anotherStatement={appConfig.footer.anotherStatement}
            />
          </RoleProvider>
        </ErrorBoundary>

        {/* Test component for hybrid refresh system (development only) */}
        {process.env.NODE_ENV === 'development' && <RefreshTestButton />}
      </div>
    </Router>
  );
}

export default App;