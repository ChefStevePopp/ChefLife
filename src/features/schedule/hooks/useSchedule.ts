/**
 * useSchedule
 * Shared schedule hook — bridges the global scheduleStore for component consumption.
 *
 * @diagnostics src/features/schedule/hooks/useSchedule.ts
 */
import { useEffect } from 'react';
import { useScheduleStore } from '@/stores/scheduleStore';

export const useSchedule = () => {
  const { 
    shifts, 
    error, 
    isLoading, 
    syncSchedule,
    accessToken,
    testConnection 
  } = useScheduleStore();

  // Auto-sync on mount if we have an access token
  useEffect(() => {
    if (accessToken) {
      syncSchedule();
    }
  }, [accessToken, syncSchedule]);

  return {
    shifts,
    error,
    isLoading,
    syncSchedule,
    testConnection,
    isConfigured: !!accessToken
  };
};