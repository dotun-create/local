import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAvailability } from '../contexts/AvailabilityContext';

/**
 * Custom hook for conflict detection and management
 * @param {Array} sessions - Current sessions data
 * @returns {Object} Conflict detection utilities
 */
export const useConflicts = (sessions = []) => {
  const { data: availabilityData } = useAvailability();
  const [detectedConflicts, setDetectedConflicts] = useState([]);
  const [conflictResolutions, setConflictResolutions] = useState({});

  // Detect conflicts between sessions and availability
  const detectConflicts = useCallback(() => {
    const conflicts = [];

    sessions.forEach(session => {
      // Check for tutor double-booking
      const tutorConflicts = sessions.filter(otherSession => 
        otherSession.id !== session.id &&
        otherSession.tutorId === session.tutorId &&
        isTimeOverlap(session, otherSession)
      );

      tutorConflicts.forEach(conflictingSession => {
        conflicts.push({
          id: `tutor-${session.id}-${conflictingSession.id}`,
          type: 'tutor_double_booking',
          severity: 'high',
          message: `Tutor ${session.tutorName} is double-booked`,
          affectedSessions: [session.id, conflictingSession.id],
          details: {
            tutorId: session.tutorId,
            tutorName: session.tutorName,
            sessions: [
              {
                id: session.id,
                title: session.title,
                start: session.start,
                end: session.end
              },
              {
                id: conflictingSession.id,
                title: conflictingSession.title,
                start: conflictingSession.start,
                end: conflictingSession.end
              }
            ]
          }
        });
      });

      // Check for availability conflicts
      const sessionDate = session.start.toISOString().split('T')[0];
      const availableSlots = availabilityData.filter(slot => {
        const slotDate = slot.start.toISOString().split('T')[0];
        return slotDate === sessionDate && 
               slot.tutorId === session.tutorId && 
               slot.available;
      });

      const hasAvailabilityMatch = availableSlots.some(slot =>
        session.start >= slot.start && session.end <= slot.end
      );

      if (!hasAvailabilityMatch) {
        conflicts.push({
          id: `availability-${session.id}`,
          type: 'availability_mismatch',
          severity: 'medium',
          message: `Session scheduled outside tutor's available hours`,
          affectedSessions: [session.id],
          details: {
            sessionId: session.id,
            sessionTitle: session.title,
            sessionStart: session.start,
            sessionEnd: session.end,
            tutorId: session.tutorId,
            availableSlots: availableSlots.map(slot => ({
              start: slot.start,
              end: slot.end
            }))
          }
        });
      }
    });

    setDetectedConflicts(conflicts);
    return conflicts;
  }, [sessions, availabilityData]);

  // Helper function to check time overlap
  const isTimeOverlap = (session1, session2) => {
    return session1.start < session2.end && session1.end > session2.start;
  };

  // Get conflicts by type
  const getConflictsByType = useMemo(() => {
    const grouped = {};
    detectedConflicts.forEach(conflict => {
      if (!grouped[conflict.type]) {
        grouped[conflict.type] = [];
      }
      grouped[conflict.type].push(conflict);
    });
    return grouped;
  }, [detectedConflicts]);

  // Get conflicts by severity
  const getConflictsBySeverity = useMemo(() => {
    const grouped = { high: [], medium: [], low: [] };
    detectedConflicts.forEach(conflict => {
      grouped[conflict.severity].push(conflict);
    });
    return grouped;
  }, [detectedConflicts]);

  // Get conflicts for a specific session
  const getConflictsForSession = useCallback((sessionId) => {
    return detectedConflicts.filter(conflict =>
      conflict.affectedSessions.includes(sessionId)
    );
  }, [detectedConflicts]);

  // Check if a session has conflicts
  const hasConflicts = useCallback((sessionId) => {
    return getConflictsForSession(sessionId).length > 0;
  }, [getConflictsForSession]);

  // Get conflict count by severity
  const getConflictCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0, total: 0 };
    detectedConflicts.forEach(conflict => {
      counts[conflict.severity]++;
      counts.total++;
    });
    return counts;
  }, [detectedConflicts]);

  // Propose automatic conflict resolutions
  const proposeResolutions = useCallback(() => {
    const resolutions = {};

    detectedConflicts.forEach(conflict => {
      switch (conflict.type) {
        case 'tutor_double_booking':
          resolutions[conflict.id] = {
            type: 'reschedule',
            description: 'Reschedule one of the conflicting sessions',
            actions: [
              {
                action: 'reschedule_session',
                sessionId: conflict.affectedSessions[1], // Reschedule the later session
                suggestedTimes: findAlternativeSlots(conflict.affectedSessions[1])
              }
            ]
          };
          break;

        case 'availability_mismatch':
          resolutions[conflict.id] = {
            type: 'adjust_availability',
            description: 'Extend tutor availability or reschedule session',
            actions: [
              {
                action: 'extend_availability',
                tutorId: conflict.details.tutorId,
                suggestedTime: {
                  start: conflict.details.sessionStart,
                  end: conflict.details.sessionEnd
                }
              },
              {
                action: 'reschedule_session',
                sessionId: conflict.details.sessionId,
                suggestedTimes: findAvailableSlots(conflict.details.tutorId)
              }
            ]
          };
          break;

        default:
          resolutions[conflict.id] = {
            type: 'manual',
            description: 'Manual resolution required',
            actions: []
          };
      }
    });

    setConflictResolutions(resolutions);
    return resolutions;
  }, [detectedConflicts, availabilityData]);

  // Find alternative time slots for a session
  const findAlternativeSlots = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return [];

    const sessionDuration = session.end - session.start;
    const alternatives = [];

    // Look for slots within 3 days of original time
    const searchStart = new Date(session.start);
    searchStart.setDate(searchStart.getDate() - 1);
    const searchEnd = new Date(session.start);
    searchEnd.setDate(searchEnd.getDate() + 3);

    availabilityData.forEach(slot => {
      if (slot.tutorId === session.tutorId &&
          slot.start >= searchStart &&
          slot.end <= searchEnd &&
          (slot.end - slot.start) >= sessionDuration) {
        
        // Check if this slot conflicts with existing sessions
        const hasConflict = sessions.some(otherSession =>
          otherSession.id !== sessionId &&
          otherSession.tutorId === session.tutorId &&
          slot.start < otherSession.end &&
          (slot.start + sessionDuration) > otherSession.start
        );

        if (!hasConflict) {
          alternatives.push({
            start: slot.start,
            end: new Date(slot.start.getTime() + sessionDuration),
            slotId: slot.id
          });
        }
      }
    });

    return alternatives.slice(0, 5); // Return top 5 alternatives
  }, [sessions, availabilityData]);

  // Find available slots for a tutor
  const findAvailableSlots = useCallback((tutorId) => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return availabilityData
      .filter(slot =>
        slot.tutorId === tutorId &&
        slot.start >= now &&
        slot.start <= nextWeek &&
        slot.available
      )
      .slice(0, 10); // Return top 10 available slots
  }, [availabilityData]);

  // Apply a conflict resolution
  const applyResolution = useCallback((conflictId, actionIndex) => {
    const resolution = conflictResolutions[conflictId];
    if (!resolution || !resolution.actions[actionIndex]) {
      console.error('Invalid resolution or action index');
      return false;
    }

    const action = resolution.actions[actionIndex];
    
    // This would typically call API endpoints to apply the resolution
    console.log('Applying resolution:', action);
    
    // For now, just remove the conflict from detected conflicts
    setDetectedConflicts(prev =>
      prev.filter(conflict => conflict.id !== conflictId)
    );

    return true;
  }, [conflictResolutions]);

  // Auto-detect conflicts when sessions or availability changes
  useEffect(() => {
    detectConflicts();
  }, [detectConflicts]);

  // Auto-propose resolutions when conflicts are detected
  useEffect(() => {
    if (detectedConflicts.length > 0) {
      proposeResolutions();
    }
  }, [detectedConflicts, proposeResolutions]);

  return {
    // State
    conflicts: detectedConflicts,
    resolutions: conflictResolutions,

    // Actions
    detectConflicts,
    proposeResolutions,
    applyResolution,

    // Queries
    getConflictsByType,
    getConflictsBySeverity,
    getConflictsForSession,
    hasConflicts,
    getConflictCounts,
    findAlternativeSlots,
    findAvailableSlots,

    // Utils
    hasAnyConflicts: detectedConflicts.length > 0,
    criticalConflictsCount: getConflictsBySeverity.high.length,
    totalConflictsCount: detectedConflicts.length
  };
};

export default useConflicts;
