import React, { useState, useMemo, useCallback } from 'react';
import API from '../../../../services/api';
import { normalizeAvailabilityResponse } from '../../../../utils/availabilityNormalizer';
import {
  pythonToJsWeekday,
  jsToPythonWeekday,
  getTimezoneHeaders,
  enhanceAvailabilityDisplay,
  getUserTimezone,
  parseDateWithoutTimezoneShift,
  convertUTCTimeToUserTimezone,
  getTimezoneAbbreviation
} from '../../../../utils/timezoneManager';

const SmartSessionCreator = ({ 
  selectedSlots, 
  availableTutors, 
  courseModules, 
  onBatchCreate, 
  onSingleCreate, 
  onCancel,
  // Add workspace integration props
  courseId,
  onCreateContent,
  onBatchSessionCreate,
  onRefresh,
  // Add callback for switching to quiz modal
  onSwitchToQuizModal
}) => {
  const [activeStep, setActiveStep] = useState('template'); // 'template', 'details', 'review', 'custom'
  const [sessionTemplate, setSessionTemplate] = useState({
    title: '',
    description: '',
    type: 'lecture',
    duration: 60,
    maxParticipants: 3,
    requirements: '',
    linkedModules: [],
    customFields: {}
  });
  const [useAIGeneration, setUseAIGeneration] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom session form state (matches CourseDetailPage structure)
  const [customSessionForm, setCustomSessionForm] = useState({
    selectedModule: null,
    selectedLesson: null,
    selectedTutor: null,
    selectedTimeSlot: null,
    title: '',
    description: '',
    duration: 60,
    max_participants: 3,
    price: 0
  });
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // AI-powered session templates
  const sessionTemplates = [
    {
      id: 'lecture',
      name: 'Interactive Lecture',
      icon: '📚',
      description: 'Traditional lecture with Q&A segments',
      defaultDuration: 60,
      maxParticipants: 25,
      suggestedFields: {
        title: 'Interactive Lecture: {module_name}',
        type: 'lecture',
        requirements: 'Basic understanding of prerequisites'
      }
    },
    {
      id: 'workshop',
      name: 'Hands-on Workshop',
      icon: '🔧',
      description: 'Practical workshop with exercises',
      defaultDuration: 90,
      maxParticipants: 15,
      suggestedFields: {
        title: 'Workshop: {module_name} Lab',
        type: 'workshop',
        requirements: 'Laptop with required software installed'
      }
    },
    {
      id: 'discussion',
      name: 'Group Discussion',
      icon: '💬',
      description: 'Collaborative discussion session',
      defaultDuration: 45,
      maxParticipants: 12,
      suggestedFields: {
        title: 'Discussion: {module_name} Concepts',
        type: 'discussion',
        requirements: 'Completed assigned readings'
      }
    },
    {
      id: 'assessment',
      name: 'Assessment Session',
      icon: '📝',
      description: 'Quiz, test, or evaluation session',
      defaultDuration: 75,
      maxParticipants: 30,
      suggestedFields: {
        title: 'Assessment: {module_name}',
        type: 'assessment',
        requirements: 'Study materials and calculator if needed'
      }
    },
    {
      id: 'review',
      name: 'Review Session',
      icon: '🔍',
      description: 'Exam prep and concept review',
      defaultDuration: 60,
      maxParticipants: 20,
      suggestedFields: {
        title: 'Review: {module_name}',
        type: 'review',
        requirements: 'Questions prepared for clarification'
      }
    },
    {
      id: 'custom',
      name: 'Custom Session',
      icon: '🎨',
      description: 'Create your own session type',
      defaultDuration: 60,
      maxParticipants: 15,
      suggestedFields: {
        title: '',
        type: 'custom',
        requirements: ''
      }
    }
  ];

  // Custom session types configuration
  const customSessionTypes = [
    { value: 'lecture', label: 'Lecture', icon: '📚' },
    { value: 'workshop', label: 'Workshop', icon: '🔧' },
    { value: 'seminar', label: 'Seminar', icon: '🎓' },
    { value: 'discussion', label: 'Discussion', icon: '💬' },
    { value: 'assessment', label: 'Assessment', icon: '📝' },
    { value: 'review', label: 'Review', icon: '🔍' },
    { value: 'lab', label: 'Lab Session', icon: '⚗️' },
    { value: 'presentation', label: 'Presentation', icon: '🎤' },
    { value: 'project', label: 'Project Work', icon: '📊' },
    { value: 'fieldwork', label: 'Field Work', icon: '🌍' },
    { value: 'custom', label: 'Custom', icon: '🎨' }
  ];

  // Process selected time slots
  const processedSlots = useMemo(() => {
    if (!selectedSlots || selectedSlots.length === 0) return [];
    
    return selectedSlots.map(slot => ({
      ...slot,
      tutor: availableTutors.find(t => t.id === slot.tutorId) || { name: 'Unknown Tutor' },
      formattedTime: `${slot.start.toLocaleDateString()} at ${slot.start.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`
    }));
  }, [selectedSlots, availableTutors]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template) => {
    if (template.id === 'assessment' && onSwitchToQuizModal) {
      // Switch to quiz modal for assessment sessions
      // Pass context data for quiz creation
      const quizContext = {
        courseId: courseId,
        // Get selected module and lesson from custom form if available
        moduleId: customSessionForm.selectedModule?.id,
        lessonId: customSessionForm.selectedLesson?.id,
        // Default to first module/lesson if none selected
        defaultModule: courseModules?.[0],
        source: 'assessment-session'
      };
      onSwitchToQuizModal(quizContext);
      return;
    }
    
    if (template.id === 'custom') {
      // Route to custom session form
      setActiveStep('custom');
    } else {
      setSessionTemplate(prev => ({
        ...prev,
        ...template.suggestedFields,
        duration: template.defaultDuration,
        maxParticipants: template.maxParticipants,
        type: template.id
      }));
      setActiveStep('details');
    }
  }, [onSwitchToQuizModal, courseId, customSessionForm.selectedModule, customSessionForm.selectedLesson, courseModules]);

  // AI content generation
  const generateAIContent = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // Simulate AI generation (replace with actual AI service)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockGeneratedContent = {
        title: `AI Generated: ${aiPrompt.substring(0, 50)}`,
        description: `This session will cover ${aiPrompt.toLowerCase()}, providing students with comprehensive understanding through interactive exercises and real-world applications.`,
        requirements: 'Basic foundational knowledge, active participation, notebook for taking notes',
        linkedModules: courseModules.slice(0, 2).map(m => m.id) // Link first 2 modules as example
      };
      
      setSessionTemplate(prev => ({
        ...prev,
        ...mockGeneratedContent
      }));
      
      setActiveStep('details');
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, courseModules]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      if (selectedSlots.length === 0) {
        // Single session creation without time slots - use workspace integration
        const sessionData = {
          ...sessionTemplate,
          tutorId: availableTutors[0]?.id,
          scheduledDate: new Date().toISOString(),
          status: 'scheduled'
        };
        await onCreateContent('session', sessionData, courseId);
      } else if (selectedSlots.length === 1) {
        // Single session with selected slot - use workspace integration
        const sessionData = {
          ...sessionTemplate,
          tutorId: selectedSlots[0].tutorId,
          scheduledDate: selectedSlots[0].start.toISOString(),
          status: 'scheduled'
        };
        await onCreateContent('session', sessionData, courseId);
      } else {
        // Batch creation - use workspace batch session handler
        const sessionsToCreate = selectedSlots.map(slot => ({
          ...sessionTemplate,
          title: `${sessionTemplate.title} - ${slot.tutorName}`,
          scheduledDate: slot.start.toISOString(),
          tutorId: slot.tutorId,
          status: 'scheduled'
        }));
        
        if (onBatchSessionCreate) {
          await onBatchSessionCreate(sessionsToCreate);
        } else {
          // Fallback to original batch handler
          await onBatchCreate(sessionTemplate);
        }
      }
      
      // Refresh workspace data
      if (onRefresh) {
        onRefresh();
      }
      
      // Close modal
      onCancel();
      
    } catch (error) {
      console.error('Failed to create session(s):', error);
      alert(`Failed to create session: ${error.message}`);
    }
  }, [sessionTemplate, selectedSlots, onBatchCreate, onBatchSessionCreate, availableTutors, onCreateContent, courseId, onRefresh, onCancel]);

  // Handle module linking
  const handleModuleToggle = useCallback((moduleId) => {
    setSessionTemplate(prev => ({
      ...prev,
      linkedModules: prev.linkedModules.includes(moduleId)
        ? prev.linkedModules.filter(id => id !== moduleId)
        : [...prev.linkedModules, moduleId]
    }));
  }, []);

  // Custom session form handlers
  const handleModuleSelect = useCallback(async (moduleId) => {
    const module = courseModules.find(m => m.id === moduleId);
    setCustomSessionForm(prev => ({
      ...prev,
      selectedModule: module,
      selectedLesson: null, // Reset lesson when module changes
      selectedTutor: null, // Reset selections
      selectedTimeSlot: null,
      title: '' // Reset title
    }));

    // Load lessons for the selected module
    if (moduleId) {
      setIsLoadingLessons(true);
      try {
        const lessonsResponse = await API.modules.getModuleLessons(moduleId);
        
        // Extract lessons - handle different response structures
        const lessons = Array.isArray(lessonsResponse) ? lessonsResponse : 
                       lessonsResponse.lessons || lessonsResponse.data || [];
        
        // Update the selected module with lessons
        setCustomSessionForm(prev => ({
          ...prev,
          selectedModule: {
            ...module,
            lessons: lessons
          }
        }));
        
      } catch (error) {
        console.error('Failed to load lessons for module:', moduleId, error);
        // Set empty lessons array on error
        setCustomSessionForm(prev => ({
          ...prev,
          selectedModule: {
            ...module,
            lessons: []
          }
        }));
      } finally {
        setIsLoadingLessons(false);
      }
    }
  }, [courseModules]);

  const handleLessonSelect = useCallback((lessonId) => {
    const lesson = customSessionForm.selectedModule?.lessons?.find(l => l.id === lessonId);
    setCustomSessionForm(prev => ({
      ...prev,
      selectedLesson: lesson,
      title: lesson ? `Session: ${lesson.title}` : '', // Auto-generate title
      description: lesson ? `Interactive session covering ${lesson.title}` : ''
    }));
  }, [customSessionForm.selectedModule]);

  const handleTutorSelect = useCallback(async (tutorId) => {
    const tutor = availableTutors.find(t => t.id === tutorId);
    setCustomSessionForm(prev => ({
      ...prev,
      selectedTutor: tutor,
      selectedTimeSlot: null // Reset time slot when tutor changes
    }));

    // Fetch available time slots for selected tutor
    if (tutorId && customSessionForm.selectedModule) {
      setIsLoadingAvailability(true);
      try {
        // Helper function to extract date portion from datetime strings
        const extractDateOnly = (dateStr) => {
          if (!dateStr) return null;
          // Handle both "YYYY-MM-DD HH:MM:SS.mmmmm" and "YYYY-MM-DD" formats
          return dateStr.split(' ')[0].split('T')[0];
        };

        // Get module date boundaries for filtering
        const moduleStartDate = extractDateOnly(
          customSessionForm.selectedModule.startDate ||
          customSessionForm.selectedModule.start_date
        ) || new Date().toISOString().split('T')[0];

        const moduleEndDate = extractDateOnly(
          customSessionForm.selectedModule.endDate ||
          customSessionForm.selectedModule.end_date
        ) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        console.log('Fetching availability for tutor with module boundaries:', {
          tutorId,
          moduleStartDate,
          moduleEndDate,
          originalStartDate: customSessionForm.selectedModule.startDate || customSessionForm.selectedModule.start_date,
          originalEndDate: customSessionForm.selectedModule.endDate || customSessionForm.selectedModule.end_date
        });

        // Use the same API pattern as TimeslotManagement with daysAhead=90
        const token = sessionStorage.getItem('authToken');
        const timezoneHeaders = getTimezoneHeaders();

        console.log('🌍 Loading availability with timezone:', timezoneHeaders['X-Timezone']);
        console.log('🔍 Making request to:', `/api/tutors/${tutorId}/availability/instances?daysAhead=90`);

        const response = await fetch(`/api/tutors/${tutorId}/availability/instances?daysAhead=90`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...timezoneHeaders // Include timezone headers for backend conversion
          }
        });

        console.log('🔍 Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('🔍 Error response text:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Normalize the response for consistent field names (same as TimeslotManagement)
        const normalizedData = normalizeAvailabilityResponse(data);

        // Extract availability array
        const availability = normalizedData.availability || normalizedData || [];

        // Enhance each slot with timezone display formatting (same as TimeslotManagement)
        const enhancedAvailability = availability.map(slot => {
          const enhancedSlot = enhanceAvailabilityDisplay(slot);

          // Debug log for timezone conversion validation
          if (enhancedSlot.originalStartTime !== enhancedSlot.displayStartTime) {
            console.log(`🌍 Timezone conversion: ${enhancedSlot.originalStartTime} → ${enhancedSlot.displayStartTime} (${enhancedSlot.displayTimezoneAbbr})`);
          }

          return enhancedSlot;
        });

        // Filter to only include slots within module date range
        const filteredAvailability = enhancedAvailability.filter(slot => {
          const slotDate = slot.date || slot.instance_date || slot.specific_date || slot.specificDate;
          if (!slotDate) return false;

          // Extract date part only for comparison
          const slotDateOnly = slotDate.split(' ')[0].split('T')[0];

          // Compare dates
          return slotDateOnly >= moduleStartDate && slotDateOnly <= moduleEndDate;
        });

        console.log('📅 Module date filter applied:', {
          totalSlots: enhancedAvailability.length,
          filteredSlots: filteredAvailability.length,
          moduleRange: `${moduleStartDate} to ${moduleEndDate}`
        });
        
        // Debug log to see the filtered availability
        console.log('Filtered Availability Data:', filteredAvailability);

        // Get existing sessions to filter out occupied slots - use correct courseId
        const courseIdToUse = customSessionForm.selectedModule.courseId ||
                             customSessionForm.selectedModule.course_id ||
                             courseId;
        const existingSessionsResponse = await API.courses.getCourseSessions(courseIdToUse);

        // Debug log to see the sessions response
        console.log('Existing Sessions Response:', existingSessionsResponse);

        // Extract sessions from response
        const existingSessions = Array.isArray(existingSessionsResponse) ?
                                existingSessionsResponse :
                                existingSessionsResponse.sessions ||
                                existingSessionsResponse.data || [];

        // Process time slots - use the filtered availability
        const processedSlots = [];

        console.log('Processing filtered availability slots:', filteredAvailability.length);

        if (filteredAvailability && filteredAvailability.length > 0) {
          filteredAvailability.forEach(dateAvailability => {
            console.log('Processing slot:', dateAvailability);

            // The filtered availability already has specific dates from the backend
            // We just need to format them for the dropdown display
            const slotDate = dateAvailability.date || dateAvailability.instance_date ||
                           dateAvailability.specific_date || dateAvailability.specificDate;
            const startTime = dateAvailability.startTime || dateAvailability.start_time || '09:00';
            const endTime = dateAvailability.endTime || dateAvailability.end_time || '17:00';
            const timezone = dateAvailability.timezone || dateAvailability.time_zone ||
                           dateAvailability.timeZone || getUserTimezone() || 'UTC';

            if (slotDate) {
              // Extract just the date part (YYYY-MM-DD)
              const dateString = slotDate.split(' ')[0].split('T')[0];

              // Create date object for conflict checking
              const slotDateTime = new Date(dateString + 'T' + startTime + ':00');
              
              const isOccupied = existingSessions.some(session => {
                if (session.tutorId !== tutorId && session.tutor_id !== tutorId) return false;
                
                const sessionDate = new Date(session.scheduledDate || session.scheduled_date);
                const sessionDuration = session.duration || 60;
                const sessionEnd = new Date(sessionDate.getTime() + sessionDuration * 60000);
                const slotEnd = new Date(slotDateTime.getTime() + customSessionForm.duration * 60000);
                
                return (slotDateTime < sessionEnd && sessionDate < slotEnd);
              });
              
              // Only add if available and not conflicting
              if (!isOccupied && dateAvailability.available !== false) {
                // FIXED: Use timezone-safe date parsing to avoid day shifts
                const slotDateObj = parseDateWithoutTimezoneShift(dateString);
                const dayOfWeek = slotDateObj.getDay(); // Now gets correct day

                // FIXED: Convert times from UTC to user's timezone for display
                const userTimezone = getUserTimezone();
                const displayStartTime = dateAvailability.timezone === 'UTC'
                  ? convertUTCTimeToUserTimezone(startTime, dateString, userTimezone)
                  : startTime; // If already in local timezone, use as-is
                const displayEndTime = dateAvailability.timezone === 'UTC'
                  ? convertUTCTimeToUserTimezone(endTime, dateString, userTimezone)
                  : endTime; // If already in local timezone, use as-is

                const timezoneAbbr = getTimezoneAbbreviation(userTimezone);

                const processedSlot = {
                  id: `${tutorId}_${dateString}_${startTime}`,
                  tutorId: tutorId,
                  tutorName: tutor.name,
                  date: dateString,
                  startTime: startTime, // Keep original for backend
                  endTime: endTime, // Keep original for backend
                  displayStartTime: displayStartTime, // For user display
                  displayEndTime: displayEndTime, // For user display
                  timeSlotId: dateAvailability.id || `${dateString}_${startTime}`,
                  timezone: timezone,
                  displayTimezone: timezoneAbbr,
                  displayText: `${slotDateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })} - ${displayStartTime} - ${displayEndTime} (${timezoneAbbr})`
                };

                console.log('Adding processed slot:', processedSlot);
                processedSlots.push(processedSlot);
              } else {
                console.log('Skipping slot due to conflict or unavailability');
              }
            }
          });
        }
        
        console.log('Final processed slots:', processedSlots);
        setAvailableTimeSlots(processedSlots);
      } catch (error) {
        console.error('Failed to fetch tutor availability:', error);
        console.error('Error details:', error.message);
        console.error('Selected module:', customSessionForm.selectedModule);
        console.error('Start date provided:', customSessionForm.selectedModule?.startDate || customSessionForm.selectedModule?.start_date);
        console.error('End date provided:', customSessionForm.selectedModule?.endDate || customSessionForm.selectedModule?.end_date);
        console.error('Tutor ID:', tutorId);
        console.error('Full error object:', error);
        setAvailableTimeSlots([]);
      } finally {
        setIsLoadingAvailability(false);
      }
    } else {
      // Clear time slots if no tutor or module selected
      setAvailableTimeSlots([]);
      setIsLoadingAvailability(false);
    }
  }, [availableTutors, customSessionForm.selectedModule, customSessionForm.duration, courseId]);

  // Helper function to get day name from day of week number
  const getDayName = (dayOfWeek) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || `Day ${dayOfWeek}`;
  };

  const handleTimeSlotSelect = useCallback((slotId) => {
    const timeSlot = availableTimeSlots.find(slot => slot.id === slotId);
    setCustomSessionForm(prev => ({
      ...prev,
      selectedTimeSlot: timeSlot
    }));
  }, [availableTimeSlots]);

  const handleCustomSessionSubmit = useCallback(async () => {
    const { selectedModule, selectedLesson, selectedTutor, selectedTimeSlot } = customSessionForm;
    
    if (!selectedModule || !selectedLesson || !selectedTutor || !selectedTimeSlot) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreatingSession(true);

    try {
      // Create session data using workspace integration
      const sessionData = {
        title: customSessionForm.title,
        description: customSessionForm.description || `Session for ${selectedLesson.title}`,
        scheduledDate: `${selectedTimeSlot.date}T${selectedTimeSlot.startTime}:00`,
        timezone: selectedTimeSlot.timezone, // Use original timezone from backend
        duration: customSessionForm.duration,
        maxStudents: customSessionForm.max_participants,
        tutorId: selectedTutor.id,
        moduleId: selectedModule.id,
        lessonId: selectedLesson.id,
        availability_id: selectedTimeSlot.timeSlotId,
        status: 'scheduled',
        price: customSessionForm.price || selectedModule.price || 0,
        // Additional metadata for debugging
        displayStartTime: selectedTimeSlot.displayStartTime,
        displayEndTime: selectedTimeSlot.displayEndTime,
        userTimezone: getUserTimezone()
      };

      console.log('Creating custom session with data:', sessionData);

      // Use workspace's onCreateContent instead of direct API calls
      await onCreateContent('session', sessionData, courseId);

      alert('Session created successfully!');
      
      // Close modal and refresh workspace
      onCancel();
      
      // Refresh workspace data
      if (onRefresh) {
        onRefresh();
      }

    } catch (error) {
      console.error('Failed to create custom session:', error);
      alert(`Failed to create session: ${error.message}`);
    } finally {
      setIsCreatingSession(false);
    }
  }, [customSessionForm, onCancel, onCreateContent, courseId, onRefresh]);

  // Get available lessons for selected module
  const availableLessons = useMemo(() => {
    return customSessionForm.selectedModule?.lessons || [];
  }, [customSessionForm.selectedModule]);

  const renderTemplateSelection = () => (
    <div className="template-selection">
      <div className="step-header">
        <h3>Choose Session Template</h3>
        <p>Select a template or use AI to generate custom session content</p>
      </div>

      {/* AI Generation Option */}
      <div className="ai-generation-panel">
        <div className="ai-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={useAIGeneration}
              onChange={(e) => setUseAIGeneration(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">🤖 Use AI Generation</span>
        </div>

        {useAIGeneration && (
          <div className="ai-prompt-section">
            <label>Describe your session:</label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., 'Introduction to React hooks with practical examples and exercises'"
              className="ai-prompt-input"
              rows="3"
            />
            <button
              onClick={generateAIContent}
              disabled={!aiPrompt.trim() || isGenerating}
              className="btn btn-ai"
            >
              {isGenerating ? (
                <>🔄 Generating...</>
              ) : (
                <>✨ Generate Session</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Template Grid */}
      <div className="templates-grid">
        {sessionTemplates.map(template => (
          <div
            key={template.id}
            className="template-card"
            onClick={() => handleTemplateSelect(template)}
          >
            <div className="template-icon">{template.icon}</div>
            <div className="template-content">
              <h4>{template.name}</h4>
              <p>{template.description}</p>
              <div className="template-meta">
                <span>⏱️ {template.defaultDuration}min</span>
                <span>👥 Max {template.maxParticipants}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDetailsForm = () => (
    <div className="details-form">
      <div className="step-header">
        <h3>Session Details</h3>
        <p>Configure your session settings and content</p>
      </div>

      <div className="form-grid">
        <div className="form-section">
          <h4>Basic Information</h4>
          <div className="form-group">
            <label>Session Title *</label>
            <input
              type="text"
              value={sessionTemplate.title}
              onChange={(e) => setSessionTemplate(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter session title"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={sessionTemplate.description}
              onChange={(e) => setSessionTemplate(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what students will learn"
              className="form-textarea"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Session Type</label>
              <select
                value={sessionTemplate.type}
                onChange={(e) => setSessionTemplate(prev => ({ ...prev, type: e.target.value }))}
                className="form-select"
              >
                {customSessionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={sessionTemplate.duration}
                onChange={(e) => setSessionTemplate(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                min="15"
                max="240"
                step="15"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Max Participants</label>
              <input
                type="number"
                value={sessionTemplate.maxParticipants}
                onChange={(e) => setSessionTemplate(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                min="1"
                max="100"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Requirements & Prerequisites</label>
            <textarea
              value={sessionTemplate.requirements}
              onChange={(e) => setSessionTemplate(prev => ({ ...prev, requirements: e.target.value }))}
              placeholder="What should students bring or know beforehand?"
              className="form-textarea"
              rows="2"
            />
          </div>
        </div>

        {/* Content Auto-linking */}
        <div className="form-section">
          <h4>Content Linking</h4>
          <p className="section-desc">Link this session to course modules and lessons</p>
          
          <div className="modules-grid">
            {courseModules && courseModules.map(module => (
              <div
                key={module.id}
                className={`module-card ${sessionTemplate.linkedModules.includes(module.id) ? 'linked' : ''}`}
                onClick={() => handleModuleToggle(module.id)}
              >
                <div className="module-checkbox">
                  <input
                    type="checkbox"
                    checked={sessionTemplate.linkedModules.includes(module.id)}
                    onChange={() => handleModuleToggle(module.id)}
                  />
                </div>
                <div className="module-content">
                  <h5>{module.title}</h5>
                  <p>{module.description?.substring(0, 100)}</p>
                  <div className="module-meta">
                    <span>📚 {module.lessons?.length || 0} lessons</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          onClick={() => setActiveStep('template')}
          className="btn btn-outline"
        >
          ← Back to Templates
        </button>
        <button
          onClick={() => setActiveStep('review')}
          disabled={!sessionTemplate.title.trim()}
          className="btn btn-primary"
        >
          Review & Create →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="review-section">
      <div className="step-header">
        <h3>Review & Create</h3>
        <p>Confirm your session details before creation</p>
      </div>

      <div className="review-content">
        <div className="session-preview">
          <h4>📋 Session Overview</h4>
          <div className="preview-card">
            <div className="preview-header">
              <h5>{sessionTemplate.title}</h5>
              <span className={`type-badge type-${sessionTemplate.type}`}>
                {customSessionTypes.find(t => t.value === sessionTemplate.type)?.icon} {sessionTemplate.type}
              </span>
            </div>
            <p>{sessionTemplate.description}</p>
            
            <div className="preview-meta">
              <div className="meta-item">
                <span className="meta-label">Duration:</span>
                <span>{sessionTemplate.duration} minutes</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Capacity:</span>
                <span>{sessionTemplate.maxParticipants} participants</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Linked Modules:</span>
                <span>{sessionTemplate.linkedModules.length} modules</span>
              </div>
            </div>

            {sessionTemplate.requirements && (
              <div className="requirements-section">
                <strong>Requirements:</strong>
                <p>{sessionTemplate.requirements}</p>
              </div>
            )}
          </div>
        </div>

        {processedSlots.length > 0 && (
          <div className="slots-preview">
            <h4>⏰ Selected Time Slots ({processedSlots.length})</h4>
            <div className="slots-list">
              {processedSlots.map((slot, index) => (
                <div key={index} className="slot-item">
                  <div className="slot-time">{slot.formattedTime}</div>
                  <div className="slot-tutor">👨‍🏫 {slot.tutor.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessionTemplate.linkedModules.length > 0 && (
          <div className="linked-modules-preview">
            <h4>🔗 Linked Content</h4>
            <div className="linked-modules-list">
              {sessionTemplate.linkedModules.map(moduleId => {
                const module = courseModules.find(m => m.id === moduleId);
                return module ? (
                  <div key={moduleId} className="linked-module-item">
                    <span className="module-title">{module.title}</span>
                    <span className="module-lessons">{module.lessons?.length || 0} lessons</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

      <div className="review-actions">
        <button
          onClick={() => setActiveStep('details')}
          className="btn btn-outline"
        >
          ← Edit Details
        </button>
        <button
          onClick={handleSubmit}
          className="btn btn-success"
        >
          ✨ Create {processedSlots.length > 1 ? `${processedSlots.length} Sessions` : 'Session'}
        </button>
      </div>
    </div>
  );

  const renderCustomSessionForm = () => (
    <div className="custom-session-form">
      <div className="step-header">
        <h3>Create Custom Session</h3>
        <p>Select module, lesson, tutor, and available time slot</p>
      </div>

      <div className="custom-form-container">
        <div className="form-section">
          <h4>Session Configuration</h4>
          
          {/* Module Selection */}
          <div className="form-group">
            <label>Select Module *</label>
            <select
              value={customSessionForm.selectedModule?.id || ''}
              onChange={(e) => handleModuleSelect(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Choose a module...</option>
              {courseModules.map(module => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
            {customSessionForm.selectedModule && (
              <small className="field-note">
                📚 {customSessionForm.selectedModule.lessons?.length || 0} lessons available
              </small>
            )}
          </div>

          {/* Lesson Selection */}
          <div className="form-group">
            <label>Select Lesson *</label>
            <select
              value={customSessionForm.selectedLesson?.id || ''}
              onChange={(e) => handleLessonSelect(e.target.value)}
              className={`form-select ${isLoadingLessons ? 'loading' : ''}`}
              disabled={!customSessionForm.selectedModule || isLoadingLessons}
              required
            >
              <option value="">
                {isLoadingLessons ? 'Loading lessons...' : 
                 customSessionForm.selectedModule ? 'Choose a lesson...' : 'Select module first'}
              </option>
              {availableLessons.map(lesson => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
            {isLoadingLessons && (
              <small className="field-note">
                🔄 Loading lessons for selected module...
              </small>
            )}
            {!isLoadingLessons && customSessionForm.selectedLesson && (
              <small className="field-note">
                📖 {customSessionForm.selectedLesson.description?.substring(0, 100)}
              </small>
            )}
            {!isLoadingLessons && customSessionForm.selectedModule && availableLessons.length === 0 && (
              <small className="field-note error">
                ❌ No lessons found for this module
              </small>
            )}
          </div>

          {/* Tutor Selection */}
          <div className="form-group">
            <label>Select Tutor *</label>
            <select
              value={customSessionForm.selectedTutor?.id || ''}
              onChange={(e) => handleTutorSelect(e.target.value)}
              className="form-select"
              disabled={!customSessionForm.selectedModule}
              required
            >
              <option value="">
                {customSessionForm.selectedModule ? 'Choose a tutor...' : 'Select module first'}
              </option>
              {availableTutors.map(tutor => (
                <option key={tutor.id} value={tutor.id}>
                  👨‍🏫 {tutor.name} {tutor.email && `(${tutor.email})`}
                </option>
              ))}
            </select>
            {isLoadingAvailability && (
              <small className="field-note">
                🔄 Loading available time slots...
              </small>
            )}
            {!isLoadingAvailability && customSessionForm.selectedTutor && availableTimeSlots.length > 0 && (
              <small className="field-note success">
                ✅ Tutor selected - {availableTimeSlots.length} time slots available
              </small>
            )}
            {!isLoadingAvailability && customSessionForm.selectedTutor && availableTimeSlots.length === 0 && (
              <small className="field-note error">
                ❌ No available time slots found for this tutor
              </small>
            )}
          </div>

          {/* Time Slot Selection */}
          <div className="form-group">
            <label>Select Time Slot *</label>
            <select
              value={customSessionForm.selectedTimeSlot?.id || ''}
              onChange={(e) => handleTimeSlotSelect(e.target.value)}
              className={`form-select ${isLoadingAvailability ? 'loading' : ''}`}
              disabled={!customSessionForm.selectedTutor || availableTimeSlots.length === 0 || isLoadingAvailability}
              required
            >
              <option value="">
                {isLoadingAvailability
                  ? 'Loading time slots...'
                  : !customSessionForm.selectedTutor 
                    ? 'Select tutor first'
                    : availableTimeSlots.length === 0 
                      ? 'No available time slots'
                      : 'Choose a time slot...'
                }
              </option>
              {availableTimeSlots.map(slot => (
                <option key={slot.id} value={slot.id}>
                  ⏰ {slot.displayText}
                </option>
              ))}
            </select>
            {isLoadingAvailability && (
              <small className="field-note">
                🔄 Checking tutor availability...
              </small>
            )}
            {!isLoadingAvailability && availableTimeSlots.length === 0 && customSessionForm.selectedTutor && (
              <small className="field-note error">
                ❌ No available time slots found for this tutor in the module date range
              </small>
            )}
            {!isLoadingAvailability && customSessionForm.selectedTimeSlot && (
              <small className="field-note success">
                ✅ Time slot selected: {customSessionForm.selectedTimeSlot.displayText}
              </small>
            )}
          </div>
        </div>

        <div className="form-section">
          <h4>Session Details</h4>
          
          {/* Session Title */}
          <div className="form-group">
            <label>Session Title *</label>
            <input
              type="text"
              value={customSessionForm.title}
              onChange={(e) => setCustomSessionForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter session title"
              className="form-input"
              required
            />
          </div>

          {/* Session Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={customSessionForm.description}
              onChange={(e) => setCustomSessionForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what will be covered in this session"
              className="form-textarea"
              rows="3"
            />
          </div>

          {/* Session Settings */}
          <div className="form-row">
            <div className="form-group">
              <label>Duration (minutes)</label>
              <select
                value={customSessionForm.duration}
                onChange={(e) => setCustomSessionForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="form-select"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            <div className="form-group">
              <label>Max Participants</label>
              <input
                type="number"
                value={customSessionForm.max_participants}
                onChange={(e) => setCustomSessionForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                min="1"
                max="10"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Price (£)</label>
              <input
                type="number"
                value={customSessionForm.price}
                onChange={(e) => setCustomSessionForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="form-input"
              />
            </div>
          </div>

          {/* Session Preview */}
          {customSessionForm.selectedModule && customSessionForm.selectedLesson && customSessionForm.selectedTutor && customSessionForm.selectedTimeSlot && (
            <div className="session-preview-box">
              <h5>📋 Session Preview</h5>
              <div className="preview-details">
                <p><strong>Module:</strong> {customSessionForm.selectedModule.title}</p>
                <p><strong>Lesson:</strong> {customSessionForm.selectedLesson.title}</p>
                <p><strong>Tutor:</strong> {customSessionForm.selectedTutor.name}</p>
                <p><strong>Time:</strong> {customSessionForm.selectedTimeSlot.displayText}</p>
                <p><strong>Duration:</strong> {customSessionForm.duration} minutes</p>
                <p><strong>Max Participants:</strong> {customSessionForm.max_participants}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="custom-form-actions">
        <button
          onClick={() => setActiveStep('template')}
          className="btn btn-outline"
        >
          ← Back to Templates
        </button>
        <button
          onClick={handleCustomSessionSubmit}
          disabled={!customSessionForm.selectedModule || !customSessionForm.selectedLesson || 
                   !customSessionForm.selectedTutor || !customSessionForm.selectedTimeSlot || 
                   !customSessionForm.title.trim() || isCreatingSession}
          className="btn btn-success"
        >
          {isCreatingSession ? '🔄 Creating Session...' : '✨ Create Custom Session'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="smart-session-creator">
      <div className="creator-header">
        <div className="header-content">
          <div className="header-title">
            <h2>Smart Session Creator</h2>
            <button onClick={onCancel} className="close-btn">✕</button>
          </div>
          <div className="progress-steps">
            <div className={`step ${activeStep === 'template' ? 'active' : (activeStep === 'details' || activeStep === 'review' || activeStep === 'custom') ? 'completed' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Template</span>
            </div>
            {activeStep !== 'custom' && (
              <>
                <div className={`step ${activeStep === 'details' ? 'active' : activeStep === 'review' ? 'completed' : ''}`}>
                  <span className="step-number">2</span>
                  <span className="step-label">Details</span>
                </div>
                <div className={`step ${activeStep === 'review' ? 'active' : ''}`}>
                  <span className="step-number">3</span>
                  <span className="step-label">Review</span>
                </div>
              </>
            )}
            {activeStep === 'custom' && (
              <div className="step active">
                <span className="step-number">2</span>
                <span className="step-label">Custom</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="creator-content">
        {activeStep === 'template' && renderTemplateSelection()}
        {activeStep === 'details' && renderDetailsForm()}
        {activeStep === 'review' && renderReview()}
        {activeStep === 'custom' && renderCustomSessionForm()}
      </div>
    </div>
  );
};

export default SmartSessionCreator;