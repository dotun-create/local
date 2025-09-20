import React, { useState } from 'react';
import { ZoomIntegrationMethods } from '../../utils/zoomHelpers';
import './css/SessionBookingForm.css';

const SessionBookingForm = ({ onSessionCreated }) => {
  const [formData, setFormData] = useState({
    meetingName: '',
    meetingDescription: '',
    meetingType: 'Scheduled Meeting',
    startTime: '',
    meetingDuration: 60,
    recurrencePattern: 'Weekly',
    classDays: [],
    numberOfMeetingOccurences: 10,
    endDate: '',
    requirePayment: false,
    cost: 0.0,
    meetingCurrency: 'US Dollar',
    enableWaitingRoom: true,
    allowJoinBeforeHost: false,
    muteParticipants: true,
    recordMeetingsCheckBox: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const meetingTypeOptions = ['Instant Meeting', 'Recurring Meeting', 'Scheduled Meeting'];
  const recurrencePatternOptions = ['Daily', 'Weekly', 'Monthly'];
  const currencyOptions = ['US Dollar', 'GBP', 'Euro'];
  const weekDays = [
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
    { label: 'Sunday', value: 7 }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleWeekDayChange = (dayValue, checked) => {
    setFormData(prev => ({
      ...prev,
      classDays: checked 
        ? [...prev.classDays, dayValue]
        : prev.classDays.filter(day => day !== dayValue)
    }));
  };

  const handleCostChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        cost: value === '' ? 0.0 : parseFloat(value) || 0.0
      }));
    }
  };

  const formatDateTimeForZoom = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toISOString();
  };

  const mapCurrencyToCode = (currency) => {
    const currencyMap = {
      'US Dollar': 'USD',
      'GBP': 'GBP',
      'Euro': 'EUR'
    };
    return currencyMap[currency] || 'USD';
  };

  const mapRecurrenceToFrequency = (pattern) => {
    const frequencyMap = {
      'Daily': 'daily',
      'Weekly': 'weekly',
      'Monthly': 'monthly'
    };
    return frequencyMap[pattern] || 'weekly';
  };

  const getMeetingType = (type) => {
    const typeMap = {
      'Instant Meeting': 1,
      'Scheduled Meeting': 2,
      'Recurring Meeting': 8
    };
    return typeMap[type] || 2;
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.meetingName.trim()) {
        throw new Error('Meeting name is required');
      }

      if (formData.meetingType !== 'Instant Meeting' && !formData.startTime) {
        throw new Error('Start time is required for scheduled and recurring meetings');
      }

      // Prepare class data
      const classData = {
        title: formData.meetingName,
        duration: parseInt(formData.meetingDuration) || 60,
        autoRecord: formData.recordMeetingsCheckBox
      };

      // For recurring meetings, use scheduleRecurringClasses
      if (formData.meetingType === 'Recurring Meeting') {
        const scheduleData = {
          startTime: formatDateTimeForZoom(formData.startTime),
          timezone: 'UTC', // TODO: populate from config
          frequency: mapRecurrenceToFrequency(formData.recurrencePattern),
          weeklyDays: formData.recurrencePattern === 'Weekly' ? formData.classDays : undefined,
          totalSessions: parseInt(formData.numberOfMeetingOccurences) || 10
        };

        const userId = 'me'; // TODO: populate from config file

        console.log('Creating recurring meeting with data:', { classData, scheduleData, userId });

        const result = await ZoomIntegrationMethods.scheduleRecurringClasses(
          classData,
          scheduleData,
          userId
        );

        console.log('Zoom API Result:', result);

        // Prepare complete session data for parent component
        const sessionData = {
          ...formData,
          zoomResult: result,
          meetingSettings: {
            enableWaitingRoom: formData.enableWaitingRoom,
            allowJoinBeforeHost: formData.allowJoinBeforeHost,
            muteParticipants: formData.muteParticipants,
            recordMeetings: formData.recordMeetingsCheckBox
          },
          paymentSettings: {
            requirePayment: formData.requirePayment,
            cost: formData.cost,
            currency: mapCurrencyToCode(formData.meetingCurrency)
          }
        };

        // Pass result to parent component
        if (onSessionCreated) {
          onSessionCreated(sessionData);
        }

        if (result.success) {
          alert(`Recurring meeting created successfully! Meeting ID: ${result.meetingId}`);
        } else {
          throw new Error(result.error || 'Failed to create meeting');
        }
      } else {
        // For instant and scheduled meetings, we'll need to use the regular createZoomMeeting
        console.log('Non-recurring meeting creation not implemented in this demo');
        alert('This demo only supports recurring meetings. Please select "Recurring Meeting" type.');
      }

    } catch (err) {
      console.error('Error creating session:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="session-booking-form">
      <h2>Create New Session</h2>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()}>
        {/* Basic Meeting Information */}
        <div className="form-section">
          <h3>Meeting Information</h3>
          
          <div className="form-group">
            <label htmlFor="meetingName">Meeting Name *</label>
            <input
              type="text"
              id="meetingName"
              name="meetingName"
              value={formData.meetingName}
              onChange={handleInputChange}
              placeholder="Enter meeting name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="meetingDescription">Description</label>
            <textarea
              id="meetingDescription"
              name="meetingDescription"
              value={formData.meetingDescription}
              onChange={handleInputChange}
              placeholder="Enter meeting description"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="meetingType">Meeting Type</label>
            <select
              id="meetingType"
              name="meetingType"
              value={formData.meetingType}
              onChange={handleInputChange}
            >
              {meetingTypeOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {formData.meetingType !== 'Instant Meeting' && (
            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                type="datetime-local"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="meetingDuration">Meeting Duration (minutes)</label>
            <input
              type="number"
              id="meetingDuration"
              name="meetingDuration"
              value={formData.meetingDuration}
              onChange={handleInputChange}
              min="1"
              max="1440"
            />
          </div>
        </div>

        {/* Recurring Meeting Settings */}
        {formData.meetingType === 'Recurring Meeting' && (
          <div className="form-section recurring-settings">
            <h3>Recurring Meeting Settings</h3>
            
            <div className="form-group">
              <label htmlFor="recurrencePattern">Recurrence Pattern</label>
              <select
                id="recurrencePattern"
                name="recurrencePattern"
                value={formData.recurrencePattern}
                onChange={handleInputChange}
              >
                {recurrencePatternOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {formData.recurrencePattern === 'Weekly' && (
              <div className="form-group">
                <label>Select Week Days</label>
                <div className="checkbox-group">
                  {weekDays.map(day => (
                    <label key={day.value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.classDays.includes(day.value)}
                        onChange={(e) => handleWeekDayChange(day.value, e.target.checked)}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="numberOfMeetingOccurences">Number of Occurrences</label>
              <input
                type="number"
                id="numberOfMeetingOccurences"
                name="numberOfMeetingOccurences"
                value={formData.numberOfMeetingOccurences}
                onChange={handleInputChange}
                min="1"
                max="50"
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
              />
            </div>
          </div>
        )}

        {/* Payment Settings */}
        <div className="form-section">
          <h3>Payment Settings</h3>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="requirePayment"
                name="requirePayment"
                checked={formData.requirePayment}
                onChange={handleInputChange}
              />
              Require Payment
            </label>
          </div>

          {formData.requirePayment && (
            <>
              <div className="form-group">
                <label htmlFor="cost">Cost</label>
                <input
                  type="text"
                  id="cost"
                  name="cost"
                  value={formData.cost}
                  onChange={handleCostChange}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="meetingCurrency">Currency</label>
                <select
                  id="meetingCurrency"
                  name="meetingCurrency"
                  value={formData.meetingCurrency}
                  onChange={handleInputChange}
                >
                  {currencyOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Zoom Settings */}
        <div className="form-section">
          <h3>Zoom Settings</h3>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="enableWaitingRoom"
                name="enableWaitingRoom"
                checked={formData.enableWaitingRoom}
                onChange={handleInputChange}
              />
              Enable Waiting Room
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                id="allowJoinBeforeHost"
                name="allowJoinBeforeHost"
                checked={formData.allowJoinBeforeHost}
                onChange={handleInputChange}
              />
              Allow Join Before Host
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                id="muteParticipants"
                name="muteParticipants"
                checked={formData.muteParticipants}
                onChange={handleInputChange}
              />
              Mute Participants on Entry
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                id="recordMeetingsCheckBox"
                name="recordMeetingsCheckBox"
                checked={formData.recordMeetingsCheckBox}
                onChange={handleInputChange}
              />
              Record Meetings
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="form-actions">
          <button 
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="save-button"
          >
            {isLoading ? 'Creating Session...' : 'Save Session'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionBookingForm;