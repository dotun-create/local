import React, { memo } from 'react';
import { formatTimeInUserTimezone } from '../../utils/timezoneManager';

/**
 * Individual availability slot component
 * Simplified and focused on single responsibility
 * UPDATED: Now supports timezone-aware display
 */
const AvailabilitySlot = memo(({
  slot,
  isSelected = false,
  isHovered = false,
  isConflicted = false,
  onClick,
  onHover,
  onLeave,
  showTutorName = true,
  showDuration = true,
  compact = false
}) => {
  const handleClick = () => {
    if (slot.available && onClick) {
      onClick(slot);
    }
  };

  const handleMouseEnter = () => {
    if (onHover) {
      onHover(slot);
    }
  };

  const handleMouseLeave = () => {
    if (onLeave) {
      onLeave();
    }
  };

  const formatTime = (time) => {
    // Handle timezone-aware display times if available
    if (typeof time === 'string') {
      return time; // Already formatted display time
    }

    // Handle Date objects (legacy format)
    if (time instanceof Date) {
      return formatTimeInUserTimezone(time, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }

    // Fallback for HH:MM format
    if (typeof time === 'string' && time.match(/^\d{2}:\d{2}/)) {
      return time;
    }

    return 'Invalid Time';
  };

  const getDuration = () => {
    // Try to calculate duration from enhanced display data first
    if (slot.displayStartTime && slot.displayEndTime) {
      try {
        const start = new Date(`2000-01-01 ${slot.displayStartTime}`);
        const end = new Date(`2000-01-01 ${slot.displayEndTime}`);
        const durationMs = end - start;
        const durationMins = Math.round(durationMs / (1000 * 60));
        return `${durationMins}min`;
      } catch (error) {
        // Fall through to legacy calculation
      }
    }

    // Legacy calculation with Date objects
    if (slot.start instanceof Date && slot.end instanceof Date) {
      const durationMs = slot.end - slot.start;
      const durationMins = Math.round(durationMs / (1000 * 60));
      return `${durationMins}min`;
    }

    // Fallback duration
    return '60min';
  };

  const getSlotClasses = () => {
    const baseClasses = 'availability-slot';
    const classes = [baseClasses];

    if (compact) classes.push('availability-slot--compact');
    if (isSelected) classes.push('availability-slot--selected');
    if (isHovered) classes.push('availability-slot--hovered');
    if (isConflicted) classes.push('availability-slot--conflicted');
    if (!slot.available) classes.push('availability-slot--unavailable');
    if (slot.available) classes.push('availability-slot--clickable');

    return classes.join(' ');
  };

  return (
    <div
      className={getSlotClasses()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={slot.available ? 0 : -1}
      aria-selected={isSelected}
      aria-disabled={!slot.available}
    >
      <div className="availability-slot__time">
        <span className="availability-slot__start">
          {formatTime(slot.displayStartTime || slot.start)}
        </span>
        {!compact && (
          <>
            <span className="availability-slot__separator">-</span>
            <span className="availability-slot__end">
              {formatTime(slot.displayEndTime || slot.end)}
            </span>
          </>
        )}
        {slot.displayTimezoneAbbr && !compact && (
          <span className="availability-slot__timezone">
            {slot.displayTimezoneAbbr}
          </span>
        )}
      </div>

      {showDuration && !compact && (
        <div className="availability-slot__duration">
          {getDuration()}
        </div>
      )}

      {showTutorName && slot.tutorName && (
        <div className="availability-slot__tutor">
          {slot.tutorName}
        </div>
      )}

      {isConflicted && (
        <div className="availability-slot__conflict-indicator">
          ⚠️
        </div>
      )}

      {isSelected && (
        <div className="availability-slot__selected-indicator">
          ✓
        </div>
      )}
    </div>
  );
});

AvailabilitySlot.displayName = 'AvailabilitySlot';

export default AvailabilitySlot;
