import axios from 'axios';
import CryptoJS from 'crypto-js';

export const ZoomConfig = {
  ACCOUNT_ID: process.env.REACT_APP_ZOOM_ACCOUNT_ID || 'your_zoom_account_id',
  CLIENT_ID: process.env.REACT_APP_ZOOM_CLIENT_ID || 'your_zoom_client_id',
  CLIENT_SECRET: process.env.REACT_APP_ZOOM_CLIENT_SECRET || 'your_zoom_client_secret',
  BASE_URL: 'https://api.zoom.us/v2',
  OAUTH_URL: 'https://zoom.us/oauth/token',
  TOKEN_EXPIRY: 3600
};

export const MeetingTypes = {
  INSTANT: 1,
  SCHEDULED: 2,
  RECURRING_NO_FIXED_TIME: 3,
  RECURRING_WITH_FIXED_TIME: 8
};

export const MeetingSettings = {
  DEFAULT: {
    host_video: true,
    participant_video: true,
    cn_meeting: false,
    in_meeting: false,
    join_before_host: false,
    mute_upon_entry: false,
    watermark: false,
    use_pmi: false,
    approval_type: 2,
    audio: 'both',
    auto_recording: 'none',
    enforce_login: false,
    registrants_email_notification: true,
    waiting_room: false,
    allow_multiple_devices: false
  },
  SECURE: {
    host_video: true,
    participant_video: false,
    cn_meeting: false,
    in_meeting: false,
    join_before_host: false,
    mute_upon_entry: true,
    watermark: true,
    use_pmi: false,
    approval_type: 1,
    audio: 'both',
    auto_recording: 'cloud',
    enforce_login: true,
    registrants_email_notification: true,
    waiting_room: true,
    allow_multiple_devices: false
  }
};

let cachedAccessToken = null;
let tokenExpiryTime = null;

const getAccessToken = async () => {
  if (cachedAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  try {
    const credentials = Buffer.from(`${ZoomConfig.CLIENT_ID}:${ZoomConfig.CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post(ZoomConfig.OAUTH_URL, 
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: ZoomConfig.ACCOUNT_ID
      }), 
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    cachedAccessToken = response.data.access_token;
    tokenExpiryTime = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry
    
    return cachedAccessToken;
  } catch (error) {
    // console.error('Error obtaining access token:', error.response?.data || error.message);
    throw new Error('Failed to obtain access token');
  }
};

const createAxiosInstance = async () => {
  const token = await getAccessToken();
  
  return axios.create({
    baseURL: ZoomConfig.BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
};

export const createZoomMeeting = async (meetingData, userId = 'me') => {
  try {
    const api = await createAxiosInstance();
    
    const defaultMeetingData = {
      topic: 'New Meeting',
      type: MeetingTypes.SCHEDULED,
      duration: 60,
      timezone: 'UTC',
      password: generateMeetingPassword(),
      settings: MeetingSettings.DEFAULT
    };

    const meetingPayload = {
      ...defaultMeetingData,
      ...meetingData,
      settings: {
        ...defaultMeetingData.settings,
        ...(meetingData.settings || {})
      }
    };

    // Format start_time to ISO string if provided
    if (meetingPayload.start_time) {
      if (typeof meetingPayload.start_time === 'string') {
        meetingPayload.start_time = new Date(meetingPayload.start_time).toISOString();
      } else if (meetingPayload.start_time instanceof Date) {
        meetingPayload.start_time = meetingPayload.start_time.toISOString();
      }
    }

    // Remove start_time for instant meetings
    if (meetingPayload.type === MeetingTypes.INSTANT) {
      delete meetingPayload.start_time;
    }

    const response = await api.post(`/users/${userId}/meetings`, meetingPayload);
    
    return {
      success: true,
      meeting: response.data,
      meetingId: response.data.id,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      password: response.data.password,
      meetingNumber: response.data.id,
      uuid: response.data.uuid
    };
  } catch (error) {
    // console.error('Error creating Zoom meeting:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message,
      code: error.response?.status,
      details: error.response?.data
    };
  }
};

export const updateZoomMeeting = async (meetingId, updateData, occurrenceId = null) => {
  try {
    const api = await createAxiosInstance();
    
    // Format start_time to ISO string if provided
    if (updateData.start_time) {
      if (typeof updateData.start_time === 'string') {
        updateData.start_time = new Date(updateData.start_time).toISOString();
      } else if (updateData.start_time instanceof Date) {
        updateData.start_time = updateData.start_time.toISOString();
      }
    }

    const url = occurrenceId 
      ? `/meetings/${meetingId}?occurrence_id=${occurrenceId}`
      : `/meetings/${meetingId}`;

    await api.patch(url, updateData);
    
    return {
      success: true,
      message: 'Meeting updated successfully'
    };
  } catch (error) {
    // console.error('Error updating Zoom meeting:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message,
      code: error.response?.status,
      details: error.response?.data
    };
  }
};

export const deleteZoomMeeting = async (meetingId, options = {}) => {
  try {
    const api = await createAxiosInstance();
    const params = {};
    
    if (options.scheduleForReminder) {
      params.schedule_for_reminder = true;
    }
    if (options.cancelMeetingReminder) {
      params.cancel_meeting_reminder = true;
    }
    if (options.occurrenceId) {
      params.occurrence_id = options.occurrenceId;
    }
    
    await api.delete(`/meetings/${meetingId}`, { params });
    
    return {
      success: true,
      message: 'Meeting deleted successfully'
    };
  } catch (error) {
    // console.error('Error deleting Zoom meeting:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message,
      code: error.response?.status,
      details: error.response?.data
    };
  }
};

export const getZoomMeeting = async (meetingId, options = {}) => {
  try {
    const api = await createAxiosInstance();
    const params = {};
    
    if (options.occurrenceId) {
      params.occurrence_id = options.occurrenceId;
    }
    if (options.showPreviousOccurrences) {
      params.show_previous_occurrences = true;
    }
    
    const response = await api.get(`/meetings/${meetingId}`, { params });
    
    return {
      success: true,
      meeting: response.data
    };
  } catch (error) {
    // console.error('Error fetching Zoom meeting:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message,
      code: error.response?.status,
      details: error.response?.data
    };
  }
};

export const listZoomMeetings = async (userId = 'me', options = {}) => {
  try {
    const api = await createAxiosInstance();
    const params = {
      type: options.type || 'scheduled',
      page_size: options.pageSize || 30,
      next_page_token: options.nextPageToken,
      from: options.from,
      to: options.to
    };
    
    // Remove undefined parameters
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
    
    const response = await api.get(`/users/${userId}/meetings`, { params });
    
    return {
      success: true,
      meetings: response.data.meetings || [],
      totalRecords: response.data.total_records,
      nextPageToken: response.data.next_page_token,
      pageCount: response.data.page_count,
      pageSize: response.data.page_size
    };
  } catch (error) {
    // console.error('Error listing Zoom meetings:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message,
      code: error.response?.status,
      details: error.response?.data
    };
  }
};

export const createRecurringMeeting = async (meetingData, recurrenceData, userId = 'me') => {
  const recurringMeetingData = {
    ...meetingData,
    type: MeetingTypes.RECURRING_WITH_FIXED_TIME,
    recurrence: {
      type: recurrenceData.type || 1, // 1=Daily, 2=Weekly, 3=Monthly
      repeat_interval: recurrenceData.repeat_interval || 1,
      weekly_days: recurrenceData.weekly_days || undefined,
      monthly_day: recurrenceData.monthly_day || undefined,
      monthly_week: recurrenceData.monthly_week || undefined,
      monthly_week_day: recurrenceData.monthly_week_day || undefined,
      end_times: recurrenceData.end_times || 10,
      end_date_time: recurrenceData.end_date_time || undefined
    }
  };

  // Remove undefined values from recurrence
  Object.keys(recurringMeetingData.recurrence).forEach(key => 
    recurringMeetingData.recurrence[key] === undefined && delete recurringMeetingData.recurrence[key]
  );

  return await createZoomMeeting(recurringMeetingData, userId);
};

export const addMeetingRegistrant = async (meetingId, registrantData, options = {}) => {
  try {
    const api = await createAxiosInstance();
    
    const registrantPayload = {
      email: registrantData.email,
      first_name: registrantData.first_name,
      last_name: registrantData.last_name,
      address: registrantData.address || '',
      city: registrantData.city || '',
      country: registrantData.country || '',
      zip: registrantData.zip || '',
      state: registrantData.state || '',
      phone: registrantData.phone || '',
      industry: registrantData.industry || '',
      org: registrantData.org || '',
      job_title: registrantData.job_title || '',
      purchasing_time_frame: registrantData.purchasing_time_frame || '',
      role_in_purchase_process: registrantData.role_in_purchase_process || '',
      no_of_employees: registrantData.no_of_employees || '',
      comments: registrantData.comments || '',
      custom_questions: registrantData.custom_questions || []
    };

    const params = {};
    if (options.occurrenceIds && options.occurrenceIds.length > 0) {
      params.occurrence_ids = options.occurrenceIds.join(',');
    }

    const response = await api.post(`/meetings/${meetingId}/registrants`, registrantPayload, { params });
    
    return {
      success: true,
      registrant: response.data,
      joinUrl: response.data.join_url,
      registrantId: response.data.registrant_id,
      id: response.data.id
    };
  } catch (error) {
    // console.error('Error adding meeting registrant:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message,
      code: error.response?.status,
      details: error.response?.data
    };
  }
};

export const getMeetingRegistrants = async (meetingId, options = {}) => {
  try {
    const api = await createAxiosInstance();
    const params = {
      status: options.status || 'approved',
      page_size: options.pageSize || 30,
      next_page_token: options.nextPageToken,
      occurrence_id: options.occurrenceId
    };
    
    // Remove undefined parameters
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
    
    const response = await api.get(`/meetings/${meetingId}/registrants`, { params });
    
    return {
      success: true,
      registrants: response.data.registrants || [],
      totalRecords: response.data.total_records,
      nextPageToken: response.data.next_page_token,
      pageSize: response.data.page_size
    };
  } catch (error) {
    // console.error('Error fetching meeting registrants:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message,
      code: error.response?.status,
      details: error.response?.data
    };
  }
};

export const generateMeetingPassword = (length = 8) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const formatMeetingTime = (dateTime, timezone = 'UTC') => {
  const date = new Date(dateTime);
  return date.toISOString();
};

export const validateMeetingData = (meetingData) => {
  const errors = [];

  if (!meetingData.topic || meetingData.topic.trim() === '') {
    errors.push('Meeting topic is required');
  }

  if (meetingData.type === MeetingTypes.SCHEDULED && !meetingData.start_time) {
    errors.push('Start time is required for scheduled meetings');
  }

  if (meetingData.duration && (meetingData.duration < 1 || meetingData.duration > 1440)) {
    errors.push('Duration must be between 1 and 1440 minutes');
  }

  if (meetingData.password && meetingData.password.length > 10) {
    errors.push('Password must be 10 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const ZoomIntegrationMethods = {
  integrateWithCourseSession: async (courseData, sessionData) => {
    const meetingData = {
      topic: `${courseData.title} - ${sessionData.title}`,
      start_time: sessionData.startTime,
      duration: sessionData.duration || 60,
      timezone: sessionData.timezone || 'UTC',
      settings: {
        ...MeetingSettings.DEFAULT,
        waiting_room: true,
        mute_upon_entry: true
      }
    };

    return await createZoomMeeting(meetingData);
  },

  integrateWithTutoringSession: async (tutorData, studentData, sessionData) => {
    const meetingData = {
      topic: `Tutoring Session: ${tutorData.name} & ${studentData.name}`,
      start_time: sessionData.startTime,
      duration: sessionData.duration || 60,
      timezone: sessionData.timezone || 'UTC',
      settings: {
        ...MeetingSettings.DEFAULT,
        host_video: true,
        participant_video: true,
        waiting_room: false,
        join_before_host: true
      }
    };

    const meetingResult = await createZoomMeeting(meetingData);
    
    if (meetingResult.success && sessionData.requireRegistration) {
      await addMeetingRegistrant(meetingResult.meetingId, {
        email: studentData.email,
        first_name: studentData.firstName,
        last_name: studentData.lastName
      });
    }

    return meetingResult;
  },

  scheduleRecurringClasses: async (classData, scheduleData) => {
    const recurrenceData = {
      type: scheduleData.frequency === 'weekly' ? 2 : scheduleData.frequency === 'daily' ? 1 : 3,
      repeat_interval: scheduleData.interval || 1,
      weekly_days: scheduleData.weeklyDays || null,
      end_times: scheduleData.totalSessions || 10
    };

    const meetingData = {
      topic: `${classData.title} - Recurring Class`,
      start_time: scheduleData.startTime,
      duration: classData.duration || 60,
      timezone: scheduleData.timezone || 'UTC',
      settings: MeetingSettings.SECURE
    };

    return await createRecurringMeeting(meetingData, recurrenceData);
  }
};

// New API methods for enhanced meeting management
export const updateMeetingRegistrantStatus = async (meetingId, registrantId, action, options = {}) => {
  try {
    const api = await createAxiosInstance();
    
    const payload = {
      action, // approve, cancel, deny
      registrants: [{
        id: registrantId,
        email: options.email
      }]
    };

    const params = {};
    if (options.occurrenceId) {
      params.occurrence_id = options.occurrenceId;
    }

    await api.patch(`/meetings/${meetingId}/registrants/status`, payload, { params });
    
    return {
      success: true,
      message: `Registrant ${action}ed successfully`
    };
  } catch (error) {
    // console.error('Error updating registrant status:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message
    };
  }
};

export const getMeetingInvitation = async (meetingId) => {
  try {
    const api = await createAxiosInstance();
    const response = await api.get(`/meetings/${meetingId}/invitation`);
    
    return {
      success: true,
      invitation: response.data.invitation
    };
  } catch (error) {
    // console.error('Error fetching meeting invitation:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message
    };
  }
};

export const getLiveMeetingEvents = async (meetingId) => {
  try {
    const api = await createAxiosInstance();
    const response = await api.get(`/live_meetings/${meetingId}/events`);
    
    return {
      success: true,
      events: response.data.events || []
    };
  } catch (error) {
    // console.error('Error fetching live meeting events:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message
    };
  }
};

export const getMeetingPolls = async (meetingId) => {
  try {
    const api = await createAxiosInstance();
    const response = await api.get(`/meetings/${meetingId}/polls`);
    
    return {
      success: true,
      polls: response.data.polls || [],
      totalRecords: response.data.total_records
    };
  } catch (error) {
    // console.error('Error fetching meeting polls:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message
    };
  }
};

export const createMeetingPoll = async (meetingId, pollData) => {
  try {
    const api = await createAxiosInstance();
    
    const payload = {
      title: pollData.title,
      poll_type: pollData.pollType || 1, // 1=poll, 2=quiz
      anonymous: pollData.anonymous || false,
      questions: pollData.questions || []
    };

    const response = await api.post(`/meetings/${meetingId}/polls`, payload);
    
    return {
      success: true,
      poll: response.data,
      pollId: response.data.id
    };
  } catch (error) {
    // console.error('Error creating meeting poll:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message
    };
  }
};

export const getMeetingRecordings = async (meetingId) => {
  try {
    const api = await createAxiosInstance();
    const response = await api.get(`/meetings/${meetingId}/recordings`);
    
    return {
      success: true,
      recordings: response.data,
      recordingFiles: response.data.recording_files || []
    };
  } catch (error) {
    // console.error('Error fetching meeting recordings:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data || error.message
    };
  }
};

export const validateZoomCredentials = async () => {
  try {
    const api = await createAxiosInstance();
    const response = await api.get('/users/me');
    
    return {
      success: true,
      user: response.data,
      message: 'Credentials are valid'
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      message: 'Invalid credentials or API access denied'
    };
  }
};

export const isZoomConfigured = () => {
  return {
    accountId: !!ZoomConfig.ACCOUNT_ID && ZoomConfig.ACCOUNT_ID !== 'your_zoom_account_id',
    clientId: !!ZoomConfig.CLIENT_ID && ZoomConfig.CLIENT_ID !== 'your_zoom_client_id',
    clientSecret: !!ZoomConfig.CLIENT_SECRET && ZoomConfig.CLIENT_SECRET !== 'your_zoom_client_secret',
    isFullyConfigured: function() {
      return this.accountId && this.clientId && this.clientSecret;
    }
  };
};

export const ZoomWebhookHelpers = {
  verifyWebhookSignature: (payload, signature, timestamp, webhookSecretToken) => {
    const message = `v0:${timestamp}:${payload}`;
    const hashForVerify = CryptoJS.HmacSHA256(message, webhookSecretToken).toString();
    const expectedSignature = `v0=${hashForVerify}`;
    
    return expectedSignature === signature;
  },

  handleMeetingEvents: (webhookData) => {
    const { event, payload } = webhookData;
    
    switch (event) {
      case 'meeting.started':
        // console.log('Meeting started:', payload.object.id);
        return { type: 'meeting_started', meetingId: payload.object.id, data: payload.object };
      case 'meeting.ended':
        // console.log('Meeting ended:', payload.object.id);
        return { type: 'meeting_ended', meetingId: payload.object.id, data: payload.object };
      case 'meeting.participant_joined':
        // console.log('Participant joined:', payload.object.participant.user_name);
        return { type: 'participant_joined', participant: payload.object.participant };
      case 'meeting.participant_left':
        // console.log('Participant left:', payload.object.participant.user_name);
        return { type: 'participant_left', participant: payload.object.participant };
      case 'meeting.registration_created':
        // console.log('Registration created for meeting:', payload.object.id);
        return { type: 'registration_created', meetingId: payload.object.id, registrant: payload.object.registrant };
      case 'meeting.registration_cancelled':
        // console.log('Registration cancelled for meeting:', payload.object.id);
        return { type: 'registration_cancelled', meetingId: payload.object.id, registrant: payload.object.registrant };
      case 'meeting.recording_completed':
        // console.log('Recording completed for meeting:', payload.object.id);
        return { type: 'recording_completed', meetingId: payload.object.id, recording: payload.object };
      default:
        // console.log('Unhandled event:', event);
        return { type: 'unknown', event, payload };
    }
  }
};