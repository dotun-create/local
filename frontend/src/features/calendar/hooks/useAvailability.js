/**
 * Availability hook - compatibility layer for migration from AvailabilityContext to Zustand store
 * This hook provides the same API as the old AvailabilityContext for backward compatibility
 */

import { useStore } from '@shared/store';

export function useAvailability() {
  const availability = useStore((state) => state.availability);

  return {
    // State
    data: availability.data,
    loading: availability.loading,
    error: availability.error,
    filters: availability.filters,

    // Actions
    loadAvailability: availability.actions.loadAvailability,
    updateFilters: availability.actions.updateFilters,
    clearError: availability.actions.clearError,
    clearCache: availability.actions.clearCache,
    reloadAvailability: availability.actions.reloadAvailability,
    addAvailability: availability.actions.addAvailability,
    updateAvailability: availability.actions.updateAvailability,
    removeAvailability: availability.actions.removeAvailability,

    // Computed
    getGroupedAvailability: availability.actions.getGroupedAvailability,
    filterConflicts: availability.actions.filterConflicts,

    // Utils
    hasData: availability.hasData,
    isEmpty: availability.isEmpty
  };
}

export default useAvailability;