import { useState, useCallback, useMemo } from 'react';
import { useAvailability } from '../contexts/AvailabilityContext';

/**
 * Custom hook for time slot selection and management
 * @param {Object} options - Configuration options
 * @returns {Object} Time slot utilities
 */
export const useTimeSlots = (options = {}) => {
  const {
    multiSelect = true,
    autoDeselectConflicts = true,
    maxSelections = null
  } = options;

  const { data: availabilityData, filterConflicts } = useAvailability();
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Get available time slots for a specific date
  const getSlotsForDate = useCallback((date) => {
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    return availabilityData.filter(slot => {
      const slotDate = slot.start.toISOString().split('T')[0];
      return slotDate === dateStr && slot.available;
    });
  }, [availabilityData]);

  // Get selected slots grouped by date
  const getSelectedSlotsByDate = useMemo(() => {
    const grouped = {};
    selectedSlots.forEach(slot => {
      const dateStr = slot.start.toISOString().split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(slot);
    });
    return grouped;
  }, [selectedSlots]);

  // Check if a slot is selected
  const isSlotSelected = useCallback((slotId) => {
    return selectedSlots.some(slot => slot.id === slotId);
  }, [selectedSlots]);

  // Toggle slot selection
  const toggleSlot = useCallback((slot) => {
    setSelectedSlots(prevSelected => {
      const isSelected = prevSelected.some(s => s.id === slot.id);

      if (isSelected) {
        // Remove slot
        return prevSelected.filter(s => s.id !== slot.id);
      } else {
        // Add slot
        if (!multiSelect) {
          return [slot];
        }

        // Check max selections
        if (maxSelections && prevSelected.length >= maxSelections) {
          console.warn(`Maximum ${maxSelections} slots can be selected`);
          return prevSelected;
        }

        return [...prevSelected, slot];
      }
    });
  }, [multiSelect, maxSelections]);

  // Select multiple slots
  const selectSlots = useCallback((slots) => {
    if (!multiSelect && slots.length > 1) {
      console.warn('Multi-select is disabled');
      return;
    }

    if (maxSelections && slots.length > maxSelections) {
      console.warn(`Maximum ${maxSelections} slots can be selected`);
      return;
    }

    setSelectedSlots(slots);
  }, [multiSelect, maxSelections]);

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedSlots([]);
  }, []);

  // Select slots in a date range
  const selectSlotsInRange = useCallback((startDate, endDate, tutorId = null) => {
    const slotsInRange = availabilityData.filter(slot => {
      const slotDate = slot.start;
      const inRange = slotDate >= startDate && slotDate <= endDate;
      const matchesTutor = !tutorId || slot.tutorId === tutorId;
      return inRange && matchesTutor && slot.available;
    });

    if (maxSelections && slotsInRange.length > maxSelections) {
      console.warn(`Cannot select ${slotsInRange.length} slots. Maximum is ${maxSelections}`);
      return;
    }

    setSelectedSlots(multiSelect ? [...selectedSlots, ...slotsInRange] : slotsInRange);
  }, [availabilityData, selectedSlots, multiSelect, maxSelections]);

  // Filter out conflicts from selected slots
  const filterSelectedConflicts = useCallback((sessions) => {
    const conflictFreeSlots = filterConflicts(selectedSlots, sessions);
    
    if (autoDeselectConflicts && conflictFreeSlots.length !== selectedSlots.length) {
      setSelectedSlots(conflictFreeSlots);
    }

    return conflictFreeSlots;
  }, [selectedSlots, filterConflicts, autoDeselectConflicts]);

  // Get slot selection statistics
  const getSelectionStats = useMemo(() => {
    const totalSelected = selectedSlots.length;
    const tutorCounts = {};
    const dateCounts = {};

    selectedSlots.forEach(slot => {
      // Count by tutor
      tutorCounts[slot.tutorId] = (tutorCounts[slot.tutorId] || 0) + 1;

      // Count by date
      const dateStr = slot.start.toISOString().split('T')[0];
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    return {
      totalSelected,
      tutorCounts,
      dateCounts,
      uniqueTutors: Object.keys(tutorCounts).length,
      uniqueDates: Object.keys(dateCounts).length
    };
  }, [selectedSlots]);

  // Calculate total duration of selected slots
  const getTotalDuration = useMemo(() => {
    return selectedSlots.reduce((total, slot) => {
      const duration = (slot.end - slot.start) / (1000 * 60); // Duration in minutes
      return total + duration;
    }, 0);
  }, [selectedSlots]);

  // Get next available slot after a given date
  const getNextAvailableSlot = useCallback((afterDate, tutorId = null) => {
    const filteredSlots = availabilityData.filter(slot => {
      const isAfterDate = slot.start > afterDate;
      const matchesTutor = !tutorId || slot.tutorId === tutorId;
      return isAfterDate && matchesTutor && slot.available;
    });

    return filteredSlots.sort((a, b) => a.start - b.start)[0] || null;
  }, [availabilityData]);

  // Hover handlers
  const handleSlotHover = useCallback((slot) => {
    setHoveredSlot(slot);
  }, []);

  const handleSlotLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  return {
    // State
    selectedSlots,
    hoveredSlot,
    
    // Selection actions
    toggleSlot,
    selectSlots,
    clearSelections,
    selectSlotsInRange,
    
    // Queries
    getSlotsForDate,
    isSlotSelected,
    getSelectedSlotsByDate,
    getNextAvailableSlot,
    
    // Conflict management
    filterSelectedConflicts,
    
    // Statistics
    getSelectionStats,
    getTotalDuration,
    
    // Hover handlers
    handleSlotHover,
    handleSlotLeave,
    
    // Utils
    hasSelections: selectedSlots.length > 0,
    canSelectMore: !maxSelections || selectedSlots.length < maxSelections,
    selectionCount: selectedSlots.length
  };
};

export default useTimeSlots;
