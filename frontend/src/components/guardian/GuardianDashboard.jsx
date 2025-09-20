import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuardianStudents, useAuth, useGuardianStudentFeedback } from '../../hooks/useData';
import InvoiceList from '../invoices/InvoiceList';
import PendingRequestsCard from './PendingRequestsCard';
import API from '../../services/api';
import ChangePasswordModal from '../common/ChangePasswordModal';
import './css/GuardianDashboard.css';

const GuardianDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { students: apiStudents, loading: studentsLoading, error: studentsError, refetch: refetchStudents } = useGuardianStudents();
  const { feedbackData: studentFeedback, loading: feedbackLoading, error: feedbackError, refetch: refetchFeedback } = useGuardianStudentFeedback();
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [showAllocateCredits, setShowAllocateCredits] = useState(false);
  const [collapsedStudents, setCollapsedStudents] = useState({});
  const [collapsedCourses, setCollapsedCourses] = useState({});
  const [collapsedModules, setCollapsedModules] = useState({});
  
  const [guardianProfile, setGuardianProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    guardianId: '',
    joinDate: '',
    avatar: '/images/user-avatar.png',
    totalCredits: 0,
    usedCredits: 0,
    availableCredits: 0
  });

  const [creditBalance, setCreditBalance] = useState({
    totalCredits: 0,
    usedCredits: 0,
    availableCredits: 0,
    lastUpdated: null
  });
  const [studentAllocations, setStudentAllocations] = useState([]);
  const [creditTransactions, setCreditTransactions] = useState([]);
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditError, setCreditError] = useState(null);

  const [paymentMethods, setPaymentMethods] = useState([]);

  const [enrolledStudents, setEnrolledStudents] = useState([]);

  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card',
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    paypalEmail: ''
  });

  const [creditAllocation, setCreditAllocation] = useState({
    studentId: null,
    amount: 0
  });

  // Change password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // Load credit balance from API
  const fetchCreditBalance = async (guardianId) => {
    if (!guardianId) return;
    
    try {
      setCreditLoading(true);
      setCreditError(null);
      
      const response = await API.credits.getGuardianCreditBalance(guardianId);
      console.log('Credit balance response:', response);
      console.log('response.data:', response.data);
      console.log('response.data.total_credits:', response.data?.total_credits);
      console.log('response.data.available_credits:', response.data?.available_credits);
      
      if (response.success) {
        setCreditBalance(response.data);
        setStudentAllocations(response.data.student_allocations || []);
        
        // Handle credit balance data - use normalized response data directly
        let creditData = response.data;
        console.log('Processing normalized credit data:', creditData);
        
        // Update guardian profile with real credit data
        // Note: Don't override usedCredits here as it will be calculated from student allocations
        const updatedProfile = {
          totalCredits: creditData.total_credits || 0,
          // Keep the current usedCredits (calculated from allocations) instead of backend value
          // usedCredits: creditData.used_credits || 0,
          // availableCredits will be recalculated based on allocations
        };
        console.log('Updating guardian profile with:', updatedProfile);
        
        setGuardianProfile(prev => ({
          ...prev,
          ...updatedProfile,
          // Use the available credits from the API response
          availableCredits: creditData.available_credits || 0
        }));
      } else {
        setCreditError('Failed to load credit balance');
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      setCreditError('Error loading credit data');
    } finally {
      setCreditLoading(false);
    }
  };

  // Load guardian data from login/localStorage
  useEffect(() => {
    const loadGuardianData = () => {
      try {
        // Try to get user data from sessionStorage (set during login)
        const userData = sessionStorage.getItem('currentUser');
        if (userData) {
          const user = JSON.parse(userData);
          console.log('Guardian Dashboard - User data loaded:', user);
          console.log('Profile object:', user.profile);
          
          if (user.accountType === 'guardian') {
            // Map API data to component state
            setGuardianProfile({
              name: user.profile?.name || user.name || 'Guardian',
              email: user.email || '',
              phone: user.profile?.phone || user.phone || '',
              address: user.profile?.address ? 
                `${user.profile.address.street || ''} ${user.profile.address.city || ''} ${user.profile.address.state || ''} ${user.profile.address.zipCode || ''}`.trim() :
                `${user.profile?.street || ''} ${user.profile?.city || ''} ${user.profile?.state || ''} ${user.profile?.zipCode || ''}`.trim(),
              guardianId: user.id || '',
              joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : '',
              avatar: '/images/user-avatar.png',
              totalCredits: 0, // Will be updated by fetchCreditBalance
              usedCredits: 0, // Will be updated by fetchCreditBalance
              availableCredits: 0 // Will be updated by fetchCreditBalance
            });
            
            // Fetch real credit balance from API
            fetchCreditBalance(user.id);

            console.log('Guardian profile set to:', {
              name: user.profile?.name || user.name || 'Guardian',
              email: user.email || '',
              phone: user.profile?.phone || user.phone || '',
              address: user.profile?.address ? 
                `${user.profile.address.street || ''} ${user.profile.address.city || ''} ${user.profile.address.state || ''} ${user.profile.address.zipCode || ''}`.trim() :
                `${user.profile?.street || ''} ${user.profile?.city || ''} ${user.profile?.state || ''} ${user.profile?.zipCode || ''}`.trim(),
            });

            // Students will be loaded from API hook, but keep any fallback students from localStorage for profile completion
            const fallbackStudents = user.students || user.profile?.students || [];
            if (fallbackStudents.length > 0 && (!apiStudents || apiStudents.length === 0)) {
              setEnrolledStudents(fallbackStudents);
            }
          }
        } else {
          console.log('No user data found in sessionStorage');
          // Set default profile if no user data available
          setGuardianProfile(prev => ({
            ...prev,
            name: 'Guardian User',
            email: 'guardian@example.com',
            phone: 'Not provided',
            address: 'Not provided',
            guardianId: 'Not available',
            joinDate: 'Not available'
          }));
        }
      } catch (error) {
        console.error('Error loading guardian data:', error);
        // Set error fallback profile
        setGuardianProfile(prev => ({
          ...prev,
          name: 'Guardian User',
          email: 'Error loading profile',
          phone: 'Error loading profile',
          address: 'Error loading profile',
          guardianId: 'Error',
          joinDate: 'Error'
        }));
      }
    };

    loadGuardianData();
  }, [apiStudents]);

  // Update enrolled students when API data is loaded
  useEffect(() => {
    if (apiStudents && apiStudents.length > 0) {
      // Transform API student data to match dashboard expectations
      const transformedStudents = apiStudents.map(student => {
        // Credit allocation is now provided directly by backend
        const creditAllocation = student.creditAllocation || {
          allocatedCredits: 0,
          usedCredits: 0,
          remainingCredits: 0
        };
        
        console.log('Student credit allocation for', student.name, ':', creditAllocation);
        
        return {
          id: student.id,
          name: student.name || student.email,
          email: student.email,
          grade: student.profile?.grade || '',
          age: student.profile?.age || '',
          avatar: student.profile?.avatar || '/images/user-avatar.png',
          enrollmentDate: student.profile?.linkedAt ? new Date(student.profile.linkedAt).toLocaleDateString() : 'Unknown',
          overallProgress: 0, // TODO: Calculate from actual enrollment data
          courses: [], // TODO: Fetch actual course enrollments
          allocatedCredits: creditAllocation.allocated_credits || creditAllocation.allocatedCredits || 0,
          usedCredits: creditAllocation.used_credits || creditAllocation.usedCredits || 0,
          remainingCredits: creditAllocation.remaining_credits || creditAllocation.remainingCredits || 0,
          linkedAt: student.linkedAt,
          status: student.status || 'pending'
        };
      });
      
      // Calculate total allocated credits (this is what the guardian has "used" from their perspective)
      const totalAllocatedCredits = transformedStudents.reduce((total, student) => {
        return total + (student.allocatedCredits || 0);
      }, 0);
      
      console.log('Total allocated credits to all students:', totalAllocatedCredits);
      
      // Update guardian profile with calculated allocated credits as "used credits"
      setGuardianProfile(prev => ({
        ...prev,
        usedCredits: totalAllocatedCredits,
        // Recalculate available credits: total - allocated (not actual session usage)
        availableCredits: Math.max(0, (prev.totalCredits || 0) - totalAllocatedCredits)
      }));
      
      setEnrolledStudents(transformedStudents);
    }
  }, [apiStudents, studentAllocations]);

  // Auto-refresh credit balance every 30 seconds for real-time updates
  useEffect(() => {
    const guardianData = sessionStorage.getItem('currentUser');
    if (!guardianData) return;

    const user = JSON.parse(guardianData);
    if (user.accountType === 'guardian' && user.id) {
      const intervalId = setInterval(() => {
        fetchCreditBalance(user.id);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(intervalId);
    }
  }, []);

  const handleEditProfile = () => {
    setEditMode(true);
  };

  const handleSaveProfile = () => {
    setEditMode(false);
    alert('Profile updated successfully!');
  };

  const handleProfileChange = (field, value) => {
    setGuardianProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Change password handler
  const handleChangePassword = async (passwordData) => {
    try {
      setChangePasswordLoading(true);
      
      await API.auth.changePassword(passwordData);
      
      setShowChangePasswordModal(false);
      
      alert('Password changed successfully! Please log in with your new password.');
      
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
      navigate('/login');
      
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password. Please check your current password and try again.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    const newMethod = {
      id: paymentMethods.length + 1,
      type: newPaymentMethod.type,
      ...(newPaymentMethod.type === 'card' ? {
        brand: newPaymentMethod.cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
        last4: newPaymentMethod.cardNumber.slice(-4),
        expiryMonth: newPaymentMethod.expiryMonth,
        expiryYear: newPaymentMethod.expiryYear,
        cardholderName: newPaymentMethod.cardholderName
      } : {
        email: newPaymentMethod.paypalEmail
      }),
      isDefault: false
    };
    
    setPaymentMethods([...paymentMethods, newMethod]);
    setShowAddPaymentMethod(false);
    setNewPaymentMethod({
      type: 'card',
      cardNumber: '',
      cardholderName: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      paypalEmail: ''
    });
    alert('Payment method added successfully!');
  };

  const handleRemovePaymentMethod = (id) => {
    if (window.confirm('Are you sure you want to remove this payment method?')) {
      setPaymentMethods(paymentMethods.filter(method => method.id !== id));
    }
  };

  const handleSetDefaultPayment = (id) => {
    setPaymentMethods(paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id
    })));
  };

  const handleAllocateCredits = async () => {
    if (creditAllocation.amount > guardianProfile.availableCredits) {
      alert('Insufficient credits available!');
      return;
    }
    
    if (!creditAllocation.studentId || creditAllocation.amount <= 0) {
      alert('Please select a student and enter a valid amount.');
      return;
    }
    
    try {
      setCreditLoading(true);
      const response = await API.credits.allocateCreditsToStudent(
        creditAllocation.studentId,
        creditAllocation.amount,
        'Guardian allocation from dashboard'
      );
      
      if (response.success) {
        alert(`Successfully allocated ${creditAllocation.amount} credits to ${selectedStudent?.name}!`);
        
        // Refresh credit balance
        const guardianData = JSON.parse(sessionStorage.getItem('currentUser'));
        if (guardianData?.id) {
          await fetchCreditBalance(guardianData.id);
        }
        
        // Update student allocations in UI
        setEnrolledStudents(prev => prev.map(student => {
          if (student.id === creditAllocation.studentId) {
            return {
              ...student,
              allocatedCredits: student.allocatedCredits + creditAllocation.amount,
              remainingCredits: student.remainingCredits + creditAllocation.amount
            };
          }
          return student;
        }));
        
        setShowAllocateCredits(false);
        setCreditAllocation({ studentId: null, amount: 0 });
      } else {
        alert(response.message || 'Failed to allocate credits');
      }
    } catch (error) {
      console.error('Error allocating credits:', error);
      alert('Error allocating credits. Please try again.');
    } finally {
      setCreditLoading(false);
    }
  };

  const handlePurchaseCredits = () => {
    navigate('/payments');
  };

  const getGradeColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#3b82f6';
    if (score >= 70) return '#f59e0b';
    if (score >= 60) return '#f97316';
    return '#ef4444';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDisplayStatus = (status) => {
    if (status === 'active' || status === 'pending') {
      return status;
    }
    return 'inactive';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#10b981'; // green
      case 'pending':
        return '#f59e0b'; // yellow
      case 'inactive':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleApproveEnrollment = (studentId, courseId) => {
    setEnrolledStudents(prevStudents => 
      prevStudents.map(student => {
        if (student.id === studentId) {
          return {
            ...student,
            courses: (student.courses || []).map(course => {
              if (course.id === courseId && course.enrollmentStatus === 'pending') {
                return {
                  ...course,
                  enrollmentStatus: 'approved',
                  progress: 0,
                  totalModules: course.totalModules || 8,
                  completedModules: 0,
                  modules: [
                    {
                      id: 1,
                      name: 'Introduction to Numbers',
                      completed: false,
                      quizScore: null,
                      sessionFeedback: null
                    },
                    {
                      id: 2,
                      name: 'Basic Algebra',
                      completed: false,
                      quizScore: null,
                      sessionFeedback: null
                    },
                    {
                      id: 3,
                      name: 'Fractions and Decimals',
                      completed: false,
                      quizScore: null,
                      sessionFeedback: null
                    },
                    {
                      id: 4,
                      name: 'Percentages',
                      completed: false,
                      quizScore: null,
                      sessionFeedback: null
                    },
                    {
                      id: 5,
                      name: 'Geometry Basics',
                      completed: false,
                      quizScore: null,
                      sessionFeedback: null
                    },
                    {
                      id: 6,
                      name: 'Data Handling',
                      completed: false,
                      quizScore: null,
                      sessionFeedback: null
                    },
                    {
                      id: 7,
                      name: 'Problem Solving',
                      completed: false,
                      quizScore: null,
                      sessionFeedback: null
                    },
                    {
                      id: 8,
                      name: 'Review and Assessment',
                      completed: false,
                      quizScore: null,
                      sessionFeedback: null
                    }
                  ]
                };
              }
              return course;
            })
          };
        }
        return student;
      })
    );
    
    // Deduct credits from guardian account
    setGuardianProfile(prev => ({
      ...prev,
      usedCredits: prev.usedCredits + 120,
      availableCredits: prev.availableCredits - 120
    }));
    
    alert('Course enrollment approved! Credits have been deducted from your account.');
  };

  const handleRejectEnrollment = (studentId, courseId) => {
    if (window.confirm('Are you sure you want to reject this enrollment request?')) {
      setEnrolledStudents(prevStudents => 
        prevStudents.map(student => {
          if (student.id === studentId) {
            return {
              ...student,
              courses: (student.courses || []).filter(course => 
                !(course.id === courseId && course.enrollmentStatus === 'pending')
              )
            };
          }
          return student;
        })
      );
      
      alert('Enrollment request has been rejected and removed.');
    }
  };

  const toggleStudentCollapse = (studentId) => {
    setCollapsedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const toggleCourseCollapse = (studentId, courseId) => {
    const key = `${studentId}-${courseId}`;
    setCollapsedCourses(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleModuleCollapse = (studentId, courseId, moduleId) => {
    const key = `${studentId}-${courseId}-${moduleId}`;
    setCollapsedModules(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAllStudents = () => {
    const newCollapsedStudents = {};
    const newCollapsedCourses = {};
    const newCollapsedModules = {};
    
    enrolledStudents.forEach(student => {
      newCollapsedStudents[student.id] = false;
      (student.courses || []).forEach(course => {
        const courseKey = `${student.id}-${course.id}`;
        newCollapsedCourses[courseKey] = false;
        course.modules.forEach(module => {
          const moduleKey = `${student.id}-${course.id}-${module.id}`;
          newCollapsedModules[moduleKey] = false;
        });
      });
    });
    
    setCollapsedStudents(newCollapsedStudents);
    setCollapsedCourses(newCollapsedCourses);
    setCollapsedModules(newCollapsedModules);
  };

  const collapseAllStudents = () => {
    const newCollapsedStudents = {};
    const newCollapsedCourses = {};
    const newCollapsedModules = {};
    
    enrolledStudents.forEach(student => {
      newCollapsedStudents[student.id] = true;
      (student.courses || []).forEach(course => {
        const courseKey = `${student.id}-${course.id}`;
        newCollapsedCourses[courseKey] = true;
        course.modules.forEach(module => {
          const moduleKey = `${student.id}-${course.id}-${module.id}`;
          newCollapsedModules[moduleKey] = true;
        });
      });
    });
    
    setCollapsedStudents(newCollapsedStudents);
    setCollapsedCourses(newCollapsedCourses);
    setCollapsedModules(newCollapsedModules);
  };

  return (
    <div className="gd-guardian-dashboard">
      <div className="gd-guardian-sidebar">
        <div className="gd-sidebar-profile">
          <div className="gd-profile-avatar">
            <img src={guardianProfile.avatar} alt="Profile" />
          </div>
          <h3>{guardianProfile.name}</h3>
          <p className="gd-guardian-email">{guardianProfile.email}</p>
          <div className="gd-credits-summary">
            {creditLoading ? (
              <div className="gd-credit-loading">Loading credits...</div>
            ) : creditError ? (
              <div className="gd-credit-error">Error loading credits</div>
            ) : (
              <>
                <div className="gd-credit-item">
                  <span className="gd-credit-label">Available</span>
                  <span className="gd-credit-value">{creditBalance.available_credits || guardianProfile.availableCredits}</span>
                </div>
                <div className="gd-credit-item">
                  <span className="gd-credit-label">Used</span>
                  <span className="gd-credit-value">{creditBalance.used_credits || guardianProfile.usedCredits}</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        <nav className="gd-sidebar-nav">
          <button 
            className={`gd-nav-item ${activeTab === 'overview' ? 'gd-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="gd-nav-icon">📊</span>
            Overview
          </button>
          <button 
            className={`gd-nav-item ${activeTab === 'profile' ? 'gd-active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="gd-nav-icon">👤</span>
            My Profile
          </button>
          <button 
            className={`gd-nav-item ${activeTab === 'students' ? 'gd-active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <span className="gd-nav-icon">👨‍👩‍👧‍👦</span>
            My Students
          </button>
          <button 
            className={`gd-nav-item ${activeTab === 'payments' ? 'gd-active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <span className="gd-nav-icon">💳</span>
            Payment Methods
          </button>
          <button 
            className={`gd-nav-item ${activeTab === 'invoices' ? 'gd-active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <span className="gd-nav-icon">📄</span>
            Invoices
          </button>
          <button 
            className={`gd-nav-item ${activeTab === 'credits' ? 'gd-active' : ''}`}
            onClick={() => setActiveTab('credits')}
          >
            <span className="gd-nav-icon">🪙</span>
            Credits
          </button>
          <button 
            className={`gd-nav-item ${activeTab === 'results' ? 'gd-active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            <span className="gd-nav-icon">📈</span>
            Results & Feedback
          </button>
        </nav>
        
        <button className="gd-logout-btn" onClick={handleLogout}>
          <span className="gd-nav-icon">🚪</span>
          Logout
        </button>
      </div>

      <div className="gd-guardian-content">
        <div className="gd-content-header">
          <h1>Welcome back, {guardianProfile.name.split(' ')[0]}</h1>
          <p className="gd-dashboard-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {activeTab === 'overview' && (
          <div className="gd-overview-section">
            <div className="gd-stats-grid">
              <div className="gd-stat-card">
                <div className="gd-stat-icon">👨‍👩‍👧‍👦</div>
                <div className="gd-stat-info">
                  <h3>{enrolledStudents.length}</h3>
                  <p>Enrolled Students</p>
                </div>
              </div>
              <div className="gd-stat-card">
                <div className="gd-stat-icon">🪙</div>
                <div className="gd-stat-info">
                  <h3>{guardianProfile.totalCredits}</h3>
                  <p>Total Credits</p>
                </div>
              </div>
              <div className="gd-stat-card">
                <div className="gd-stat-icon">⚡</div>
                <div className="gd-stat-info">
                  <h3>{guardianProfile.usedCredits}</h3>
                  <p>Allocated Credits</p>
                </div>
              </div>
              <div className="gd-stat-card">
                <div className="gd-stat-icon">💰</div>
                <div className="gd-stat-info">
                  <h3>{guardianProfile.availableCredits}</h3>
                  <p>Available Credits</p>
                </div>
              </div>
              <div className="gd-stat-card">
                <div className="gd-stat-icon">📚</div>
                <div className="gd-stat-info">
                  <h3>{enrolledStudents.reduce((acc, s) => acc + (s.courses?.length || 0), 0)}</h3>
                  <p>Active Courses</p>
                </div>
              </div>
            </div>

            <div className="gd-overview-grid">
              <div className="gd-overview-card">
                <h2>Students Overview</h2>
                <div className="gd-students-summary">
                  {enrolledStudents.length === 0 ? (
                    <div className="gd-empty-state">
                      <div className="gd-empty-icon">👨‍👩‍👧‍👦</div>
                      <h3>No Students Yet</h3>
                      <p>When students register with your email as their guardian, they will appear here for your approval.</p>
                    </div>
                  ) : (
                    enrolledStudents.map(student => {
                    const pendingCourses = (student.courses || []).filter(c => c.enrollmentStatus === 'pending');
                    const activeCourses = (student.courses || []).filter(c => c.enrollmentStatus !== 'pending');
                    
                    return (
                      <div key={student.id} className="gd-student-summary-card">
                        <div className="gd-student-avatar">
                          <img src={student.avatar} alt={student.name} />
                          {pendingCourses.length > 0 && (
                            <div className="gd-notification-badge">{pendingCourses.length}</div>
                          )}
                        </div>
                        <div className="gd-student-info">
                          <div className="gd-student-overview-header">
                            <h4>{student.name}</h4>
                            <span 
                              className={`gd-status-badge-small gd-${getDisplayStatus(student.status)}`}
                              style={{ backgroundColor: getStatusColor(getDisplayStatus(student.status)) }}
                            >
                              {getDisplayStatus(student.status)}
                            </span>
                          </div>
                          <p>{student.grade} • {activeCourses.length} active, {pendingCourses.length} pending</p>
                          <div className="gd-progress-bar">
                            <div 
                              className="gd-progress-fill" 
                              style={{width: `${student.overallProgress}%`}}
                            ></div>
                          </div>
                          {pendingCourses.length > 0 && (
                            <div className="gd-pending-notification">
                              ⏳ {pendingCourses.length} enrollment{pendingCourses.length > 1 ? 's' : ''} pending approval
                            </div>
                          )}
                        </div>
                        <div className="gd-student-credits">
                          <span className="gd-credits-remaining">{student.remainingCredits} credits</span>
                        </div>
                      </div>
                    );
                  })
                  )}
                </div>
              </div>

              <div className="gd-overview-card">
                <h2>Pending Approvals</h2>
                <div className="gd-pending-approvals-summary">
                  {enrolledStudents.flatMap(student => 
                    (student.courses || [])
                      .filter(course => course.enrollmentStatus === 'pending')
                      .map(course => ({
                        ...course,
                        studentName: student.name,
                        studentId: student.id
                      }))
                  ).length > 0 ? (
                    <div className="gd-approval-list">
                      {enrolledStudents.flatMap(student => 
                        (student.courses || [])
                          .filter(course => course.enrollmentStatus === 'pending')
                          .map(course => (
                            <div key={`${student.id}-${course.id}`} className="gd-approval-item">
                              <div className="gd-approval-info">
                                <h5>{course.title}</h5>
                                <p>{student.name} • {course.estimatedCost} credits</p>
                              </div>
                              <div className="gd-quick-actions">
                                <button 
                                  className="gd-quick-approve-btn"
                                  onClick={() => handleApproveEnrollment(student.id, course.id)}
                                  disabled={guardianProfile.availableCredits < course.estimatedCost}
                                >
                                  ✅
                                </button>
                                <button 
                                  className="gd-quick-reject-btn"
                                  onClick={() => handleRejectEnrollment(student.id, course.id)}
                                >
                                  ❌
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  ) : (
                    <div className="gd-no-pending">
                      <p>✓ No pending enrollments</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="gd-overview-card">
                <h2>Recent Quiz Results</h2>
                <div className="gd-recent-results">
                  {enrolledStudents.flatMap(student =>
                    (student.courses || [])
                      .filter(course => course.modules && Array.isArray(course.modules))
                      .flatMap(course =>
                        course.modules.filter(m => m.quizScore).map(module => ({
                          studentName: student.name,
                          courseName: course.title,
                          moduleName: module.name,
                          score: module.quizScore
                        }))
                      )
                  ).slice(0, 5).map((result, index) => (
                    <div key={index} className="gd-result-item">
                      <div className="gd-result-info">
                        <p className="gd-student-name">{result.studentName}</p>
                        <p className="gd-module-name">{result.moduleName}</p>
                      </div>
                      <div
                        className="gd-result-score"
                        style={{color: getGradeColor(result.score)}}
                      >
                        {result.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <PendingRequestsCard onRequestsUpdate={refetchStudents} />
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="gd-profile-section">
            <div className="gd-section-header">
              <h2>Guardian Profile</h2>
              {!editMode ? (
                <div className="gd-profile-actions">
                  <button className="gd-edit-btn" onClick={handleEditProfile}>
                    Edit Profile
                  </button>
                  <button 
                    className="gd-edit-btn gd-change-password-btn"
                    onClick={() => setShowChangePasswordModal(true)}
                  >
                    Change Password
                  </button>
                </div>
              ) : (
                <div className="gd-edit-actions">
                  <button className="gd-save-btn" onClick={handleSaveProfile}>
                    Save Changes
                  </button>
                  <button className="gd-cancel-btn" onClick={() => setEditMode(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            <div className="gd-profile-container">
              <div className="gd-profile-form">
                <div className="gd-form-group">
                  <label>Full Name</label>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={guardianProfile.name}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                    />
                  ) : (
                    <p>{guardianProfile.name}</p>
                  )}
                </div>
                
                <div className="gd-form-group">
                  <label>Email Address</label>
                  {editMode ? (
                    <input 
                      type="email" 
                      value={guardianProfile.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                    />
                  ) : (
                    <p>{guardianProfile.email}</p>
                  )}
                </div>
                
                <div className="gd-form-group">
                  <label>Phone Number</label>
                  {editMode ? (
                    <input 
                      type="tel" 
                      value={guardianProfile.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                    />
                  ) : (
                    <p>{guardianProfile.phone}</p>
                  )}
                </div>
                
                <div className="gd-form-group">
                  <label>Address</label>
                  {editMode ? (
                    <textarea 
                      value={guardianProfile.address}
                      onChange={(e) => handleProfileChange('address', e.target.value)}
                      rows="3"
                    />
                  ) : (
                    <p>{guardianProfile.address}</p>
                  )}
                </div>
                
                <div className="gd-form-group">
                  <label>Guardian ID</label>
                  <p>{guardianProfile.guardianId}</p>
                </div>
                
                <div className="gd-form-group">
                  <label>Member Since</label>
                  <p>{guardianProfile.joinDate}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="gd-students-section">
            <h2>Enrolled Students</h2>
            <div className="gd-students-grid">
              {studentsLoading ? (
                <div className="gd-loading-state">
                  <div className="gd-loading-spinner">⏳</div>
                  <p>Loading students...</p>
                </div>
              ) : studentsError ? (
                <div className="gd-error-state">
                  <div className="gd-error-icon">❌</div>
                  <h3>Error Loading Students</h3>
                  <p>Unable to load student data. Please try again.</p>
                  <button onClick={refetchStudents} className="gd-retry-btn">Retry</button>
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="gd-empty-state-large">
                  <div className="gd-empty-icon-large">🎓</div>
                  <h3>No Students Enrolled</h3>
                  <p>Students will appear here once they register with your email address as their guardian and you approve their enrollment.</p>
                  <div className="gd-empty-actions">
                    <p><strong>How it works:</strong></p>
                    <ol>
                      <li>Students register using your email as their guardian contact</li>
                      <li>You'll receive an email with login credentials</li>
                      <li>Students appear in your dashboard for approval</li>
                      <li>Once approved, you can manage their courses and progress</li>
                    </ol>
                  </div>
                </div>
              ) : (
                enrolledStudents.map(student => (
                <div key={student.id} className="gd-student-card">
                  <div className="gd-student-header">
                    <div className="gd-student-avatar-large">
                      <img src={student.avatar} alt={student.name} />
                    </div>
                    <div className="gd-student-basic-info">
                      <div className="gd-student-name-status">
                        <h3>{student.name}</h3>
                        <span 
                          className={`gd-status-badge gd-${getDisplayStatus(student.status)}`}
                          style={{ backgroundColor: getStatusColor(getDisplayStatus(student.status)) }}
                        >
                          {getDisplayStatus(student.status)}
                        </span>
                      </div>
                      <p>{student.age} years old • {student.grade}</p>
                      <p className="gd-student-email">{student.email}</p>
                    </div>
                  </div>
                  
                  <div className="gd-student-stats">
                    <div className="gd-stat-row">
                      <span>Enrollment Date:</span>
                      <span>{student.enrollmentDate}</span>
                    </div>
                    <div className="gd-stat-row">
                      <span>Overall Progress:</span>
                      <span>{student.overallProgress}%</span>
                    </div>
                    <div className="gd-stat-row">
                      <span>Active Courses:</span>
                      <span>{(student.courses || []).length}</span>
                    </div>
                  </div>
                  
                  <div className="gd-student-credits-info">
                    <h4>Credit Allocation</h4>
                    <div className="gd-credits-breakdown">
                      <div className="gd-credit-bar">
                        <div className="gd-credit-allocated">
                          <span>Allocated: {student.allocatedCredits}</span>
                        </div>
                        <div className="gd-credit-used" style={{width: `${(student.usedCredits/student.allocatedCredits)*100}%`}}>
                          <span>Used: {student.usedCredits}</span>
                        </div>
                      </div>
                      <p className="gd-credits-remaining">Remaining: {student.remainingCredits} credits</p>
                    </div>
                    <button
                      className="gd-allocate-btn"
                      onClick={() => {
                        console.log('🔵 Allocate Credits button clicked!');
                        console.log('Student data:', student);
                        console.log('Guardian profile ID:', guardianProfile.guardianId);

                        setSelectedStudent(student);
                        console.log('✅ Selected student set');

                        // Set student ID in credit allocation for form submission
                        setCreditAllocation({...creditAllocation, studentId: student.id});
                        console.log('✅ Credit allocation studentId set');

                        // Clear credit balance to force loading state
                        setCreditBalance({
                          total_credits: 0,
                          available_credits: 0,
                          used_credits: 0
                        });
                        console.log('✅ Credit balance cleared');

                        setCreditLoading(true); // Set loading state before opening modal
                        console.log('✅ Credit loading set to true');

                        setShowAllocateCredits(true);
                        console.log('✅ showAllocateCredits set to true');

                        // Fetch fresh credit data
                        console.log('🔄 About to fetch credit balance...');
                        fetchCreditBalance(guardianProfile.guardianId);
                      }}
                    >
                      Allocate More Credits
                    </button>
                  </div>
                  
                  <div className="gd-student-courses">
                    <h4>Courses ({(student.courses || []).filter(c => c.enrollmentStatus !== 'pending').length} Active, {(student.courses || []).filter(c => c.enrollmentStatus === 'pending').length} Pending)</h4>
                    
                    {/* Active Courses */}
                    {(student.courses || []).filter(course => course.enrollmentStatus !== 'pending').map(course => (
                      <div key={course.id} className="gd-course-item gd-active">
                        <div className="gd-course-header-info">
                          <p className="gd-course-title">{course.title}</p>
                          <p className="gd-course-instructor">with {course.instructor}</p>
                          <div className="gd-course-module-info">
                            <span className="gd-module-count">
                              {course.completedModules}/{course.totalModules || course.modules?.length || 0} modules
                            </span>
                          </div>
                        </div>
                        <div className="gd-course-progress-section">
                          <div className="gd-course-progress-bar">
                            <div className="gd-progress-fill" style={{width: `${course.progress}%`}}></div>
                          </div>
                          <span className="gd-progress-text">{course.progress}%</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Pending Courses */}
                    {(student.courses || []).filter(course => course.enrollmentStatus === 'pending').map(course => (
                      <div key={course.id} className="gd-course-item gd-pending">
                        <div className="gd-pending-course-header">
                          <div className="gd-course-info">
                            <p className="gd-course-title">{course.title}</p>
                            <p className="gd-course-instructor">with {course.instructor}</p>
                            <div className="gd-pending-details">
                              <span className="gd-pending-badge">⏳ Pending Approval</span>
                              <span className="gd-request-date">Requested: {formatDate(course.requestDate)}</span>
                              <span className="gd-estimated-cost">Cost: {course.estimatedCost} credits</span>
                            </div>
                          </div>
                          <div className="gd-pending-actions">
                            <button 
                              className="gd-approve-btn"
                              onClick={() => handleApproveEnrollment(student.id, course.id)}
                              disabled={guardianProfile.availableCredits < course.estimatedCost}
                            >
                              ✅ Approve
                            </button>
                            <button 
                              className="gd-reject-btn"
                              onClick={() => handleRejectEnrollment(student.id, course.id)}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                        {guardianProfile.availableCredits < course.estimatedCost && (
                          <div className="gd-insufficient-credits-warning">
                            <span className="gd-warning-icon">⚠️</span>
                            <span className="gd-warning-text">
                              Insufficient credits. You have {guardianProfile.availableCredits} credits but need {course.estimatedCost}.
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="gd-payments-section">
            <div className="gd-section-header">
              <h2>Payment Methods</h2>
              <button 
                className="gd-add-payment-btn"
                onClick={() => setShowAddPaymentMethod(true)}
              >
                Add Payment Method
              </button>
            </div>
            
            <div className="gd-payment-methods-grid">
              {paymentMethods.map(method => (
                <div key={method.id} className="gd-payment-method-card">
                  {method.type === 'card' ? (
                    <>
                      <div className="gd-card-icon">💳</div>
                      <div className="gd-card-details">
                        <h4>{method.brand} •••• {method.last4}</h4>
                        <p>{method.cardholderName}</p>
                        <p>Expires {method.expiryMonth}/{method.expiryYear}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="gd-card-icon">🅿️</div>
                      <div className="gd-card-details">
                        <h4>PayPal</h4>
                        <p>{method.email}</p>
                      </div>
                    </>
                  )}
                  
                  <div className="gd-card-actions">
                    {method.isDefault && (
                      <span className="gd-default-badge">Default</span>
                    )}
                    {!method.isDefault && (
                      <button 
                        className="gd-set-default-btn"
                        onClick={() => handleSetDefaultPayment(method.id)}
                      >
                        Set as Default
                      </button>
                    )}
                    <button 
                      className="gd-remove-btn"
                      onClick={() => handleRemovePaymentMethod(method.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {showAddPaymentMethod && (
              <div className="gd-modal-overlay" onClick={() => setShowAddPaymentMethod(false)}>
                <div className="gd-modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Add Payment Method</h3>
                  
                  <div className="gd-payment-type-selector">
                    <button 
                      className={`type-btn ${newPaymentMethod.type === 'card' ? 'gd-active' : ''}`}
                      onClick={() => setNewPaymentMethod({...newPaymentMethod, type: 'card'})}
                    >
                      Credit/Debit Card
                    </button>
                    <button 
                      className={`type-btn ${newPaymentMethod.type === 'paypal' ? 'gd-active' : ''}`}
                      onClick={() => setNewPaymentMethod({...newPaymentMethod, type: 'paypal'})}
                    >
                      PayPal
                    </button>
                  </div>
                  
                  {newPaymentMethod.type === 'card' ? (
                    <div className="gd-payment-form">
                      <div className="gd-form-group">
                        <label>Card Number</label>
                        <input 
                          type="text" 
                          placeholder="1234 5678 9012 3456"
                          value={newPaymentMethod.cardNumber}
                          onChange={(e) => setNewPaymentMethod({
                            ...newPaymentMethod, 
                            cardNumber: e.target.value
                          })}
                        />
                      </div>
                      <div className="gd-form-group">
                        <label>Cardholder Name</label>
                        <input 
                          type="text" 
                          placeholder="John Doe"
                          value={newPaymentMethod.cardholderName}
                          onChange={(e) => setNewPaymentMethod({
                            ...newPaymentMethod, 
                            cardholderName: e.target.value
                          })}
                        />
                      </div>
                      <div className="gd-form-row">
                        <div className="gd-form-group">
                          <label>Expiry Month</label>
                          <input 
                            type="text" 
                            placeholder="MM"
                            maxLength="2"
                            value={newPaymentMethod.expiryMonth}
                            onChange={(e) => setNewPaymentMethod({
                              ...newPaymentMethod, 
                              expiryMonth: e.target.value
                            })}
                          />
                        </div>
                        <div className="gd-form-group">
                          <label>Expiry Year</label>
                          <input 
                            type="text" 
                            placeholder="YYYY"
                            maxLength="4"
                            value={newPaymentMethod.expiryYear}
                            onChange={(e) => setNewPaymentMethod({
                              ...newPaymentMethod, 
                              expiryYear: e.target.value
                            })}
                          />
                        </div>
                        <div className="gd-form-group">
                          <label>CVV</label>
                          <input 
                            type="text" 
                            placeholder="123"
                            maxLength="3"
                            value={newPaymentMethod.cvv}
                            onChange={(e) => setNewPaymentMethod({
                              ...newPaymentMethod, 
                              cvv: e.target.value
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="gd-payment-form">
                      <div className="gd-form-group">
                        <label>PayPal Email</label>
                        <input 
                          type="email" 
                          placeholder="email@example.com"
                          value={newPaymentMethod.paypalEmail}
                          onChange={(e) => setNewPaymentMethod({
                            ...newPaymentMethod, 
                            paypalEmail: e.target.value
                          })}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="gd-modal-actions">
                    <button className="gd-add-btn" onClick={handleAddPaymentMethod}>
                      Add Payment Method
                    </button>
                    <button className="gd-cancel-btn" onClick={() => setShowAddPaymentMethod(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="gd-invoices-section">
            <InvoiceList />
          </div>
        )}

        {activeTab === 'credits' && (
          <div className="gd-credits-section">
            <h2>Credit Management</h2>
            
            <div className="gd-credits-overview">
              {creditLoading ? (
                <div className="gd-credit-loading-card">
                  <div className="gd-loading-spinner">⏳</div>
                  <p>Loading credit information...</p>
                </div>
              ) : creditError ? (
                <div className="gd-credit-error-card">
                  <div className="gd-error-icon">❌</div>
                  <h3>Error Loading Credits</h3>
                  <p>{creditError}</p>
                </div>
              ) : (
                <>
                  <div className="gd-credit-card gd-total">
                    <h3>Total Credits</h3>
                    <p className="gd-credit-number">{creditBalance.total_credits || guardianProfile.totalCredits}</p>
                  </div>
                  <div className="gd-credit-card gd-used">
                    <h3>Used Credits</h3>
                    <p className="gd-credit-number">{creditBalance.used_credits || guardianProfile.usedCredits}</p>
                  </div>
                  <div className="gd-credit-card gd-available">
                    <h3>Available Credits</h3>
                    <p className="gd-credit-number">{creditBalance.available_credits || guardianProfile.availableCredits}</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="gd-purchase-credits-section">
              <h3>Need More Credits?</h3>
              <p>Purchase additional credits to continue your students' learning journey.</p>
              <button className="gd-purchase-btn" onClick={handlePurchaseCredits}>
                Purchase Credits
              </button>
            </div>
            
            <div className="gd-credit-allocation-section">
              <h3>Student Credit Allocations</h3>
              <div className="gd-allocations-list">
                {enrolledStudents.map(student => (
                  <div key={student.id} className="gd-allocation-item">
                    <div className="gd-student-info">
                      <img src={student.avatar} alt={student.name} />
                      <div>
                        <h4>{student.name}</h4>
                        <p>{student.grade}</p>
                      </div>
                    </div>
                    <div className="gd-allocation-details">
                      <div className="gd-allocation-stat">
                        <span>Allocated</span>
                        <span className="gd-stat-value">{student.allocatedCredits}</span>
                      </div>
                      <div className="gd-allocation-stat">
                        <span>Used</span>
                        <span className="gd-stat-value">{student.usedCredits}</span>
                      </div>
                      <div className="gd-allocation-stat">
                        <span>Remaining</span>
                        <span className="gd-stat-value">{student.remainingCredits}</span>
                      </div>
                    </div>
                    <button 
                      className="gd-allocate-more-btn"
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowAllocateCredits(true);
                        setCreditAllocation({...creditAllocation, studentId: student.id});
                      }}
                    >
                      Allocate Credits
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="gd-results-section">
            <div className="gd-section-header">
              <h2>Session Results & AI Feedback</h2>
              <div className="gd-collapse-controls">
                <button className="gd-expand-all-btn" onClick={expandAllStudents}>
                  📖 Expand All
                </button>
                <button className="gd-collapse-all-btn" onClick={collapseAllStudents}>
                  📕 Collapse All
                </button>
              </div>
            </div>
            
            <div className="gd-results-container">
              {feedbackLoading ? (
                <div className="gd-loading-state">
                  <div className="gd-loading-spinner">⏳</div>
                  <p>Loading AI feedback data...</p>
                </div>
              ) : feedbackError ? (
                <div className="gd-error-state">
                  <div className="gd-error-icon">❌</div>
                  <h3>Error Loading Feedback</h3>
                  <p>Unable to load AI feedback data. Please try again.</p>
                  <button onClick={refetchFeedback} className="gd-retry-btn">Retry</button>
                </div>
              ) : !studentFeedback || Object.keys(studentFeedback).length === 0 ? (
                <div className="gd-empty-state-large">
                  <div className="gd-empty-icon-large">📊</div>
                  <h3>No AI Feedback Available Yet</h3>
                  <p>AI feedback will appear here after your students complete tutoring sessions. The system automatically processes sessions and generates personalized feedback for each child.</p>
                  <div className="gd-empty-actions">
                    <p><strong>How AI Feedback Works:</strong></p>
                    <ol>
                      <li>Students attend tutoring sessions via Zoom</li>
                      <li>Sessions are automatically processed by our AI system</li>
                      <li>Personalized feedback is generated for each student</li>
                      <li>You receive detailed insights about your child's progress</li>
                    </ol>
                  </div>
                </div>
              ) : (
                Object.entries(studentFeedback).map(([studentName, feedbackSessions]) => (
                  <div key={studentName} className="gd-student-results">
                    <div 
                      className="gd-student-header gd-collapsible" 
                      onClick={() => toggleStudentCollapse(studentName)}
                    >
                      <div className="gd-student-header-content">
                        <img src="/images/user-avatar.png" alt={studentName} />
                        <div>
                          <h3>{studentName}</h3>
                          <p>{feedbackSessions.length} session{feedbackSessions.length > 1 ? 's' : ''} with AI feedback</p>
                        </div>
                      </div>
                      <div className="gd-collapse-icon">
                        {collapsedStudents[studentName] ? '▼' : '▲'}
                      </div>
                    </div>
                    
                    {!collapsedStudents[studentName] && (
                      <div className="gd-student-content">
                        {feedbackSessions.map((session, sessionIndex) => (
                          <div key={sessionIndex} className="gd-session-feedback-card">
                            <div className="gd-session-header">
                              <div className="gd-session-info">
                                <h4>{session.sessionTitle || 'Tutoring Session'}</h4>
                                <p className="gd-course-name">{session.courseName || 'Course'}</p>
                                <p className="gd-session-date">
                                  {session.sessionDate ? formatDate(session.sessionDate) : 'Date not available'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="gd-ai-feedback-content">
                              {session.feedback && (
                                <div className="gd-feedback-section">
                                  <h5>🤖 AI-Generated Feedback</h5>
                                  <div className="gd-feedback-text">
                                    {session.feedback.split('\n').map((line, idx) => (
                                      <p key={idx}>{line}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {session.performanceSummary && (
                                <div className="gd-performance-summary">
                                  <h6>📊 Performance Summary</h6>
                                  <div className="gd-summary-content">
                                    <p>{session.performanceSummary}</p>
                                  </div>
                                </div>
                              )}
                              
                              {session.strengthsHighlighted && (
                                <div className="gd-strengths-section">
                                  <h6>💪 Strengths Highlighted</h6>
                                  <div className="gd-strengths-content">
                                    <p>{session.strengthsHighlighted}</p>
                                  </div>
                                </div>
                              )}
                              
                              {session.areasOfImprovement && (
                                <div className="gd-improvements-section">
                                  <h6>🎯 Areas for Improvement</h6>
                                  <div className="gd-improvements-content">
                                    <p>{session.areasOfImprovement}</p>
                                  </div>
                                </div>
                              )}
                              
                              <div className="gd-feedback-meta">
                                <p className="gd-feedback-generated">
                                  <em>Feedback generated on: {formatDate(session.feedbackDate)}</em>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Credit Allocation Modal */}
      {console.log('🖼️ Modal render check - showAllocateCredits:', showAllocateCredits)}
      {showAllocateCredits && (
        <div className="gd-modal-overlay" onClick={() => setShowAllocateCredits(false)}>
          <div className="gd-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Allocate Credits to {selectedStudent?.name}</h3>
            <div className="gd-allocation-form">
              {creditLoading ? (
                <div className="gd-loading-credits" style={{textAlign: 'center', padding: '20px'}}>
                  <p>Loading credit information...</p>
                  <div className="gd-loading-spinner">⏳</div>
                </div>
              ) : (
                <div className="gd-current-credits">
                  <p>Available Guardian Credits: <strong>{creditBalance.available_credits || 0}</strong></p>
                  <p>Student's Current Credits: <strong>{selectedStudent?.remainingCredits || 0}</strong></p>
                </div>
              )}
              <div className="gd-form-group">
                <label>Credits to Allocate</label>
                <input
                  type="number"
                  min="1"
                  max={creditBalance.available_credits || 0}
                  value={creditAllocation.amount}
                  onChange={(e) => setCreditAllocation({
                    ...creditAllocation,
                    amount: parseInt(e.target.value) || 0
                  })}
                  disabled={creditLoading}
                  placeholder={creditLoading ? "Loading..." : "Enter amount"}
                />
              </div>
              <div className="gd-modal-actions">
                <button
                  className="gd-allocate-confirm-btn"
                  onClick={handleAllocateCredits}
                  disabled={creditLoading}
                >
                  {creditLoading ? 'Allocating...' : 'Allocate Credits'}
                </button>
                <button className="gd-cancel-btn" onClick={() => setShowAllocateCredits(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        key={showChangePasswordModal ? 'change-password-open' : 'change-password-closed'}
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handleChangePassword}
        loading={changePasswordLoading}
      />
    </div>
  );
};

export default GuardianDashboard;