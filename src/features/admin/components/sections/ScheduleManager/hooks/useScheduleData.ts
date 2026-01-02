import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useScheduleStore } from "@/stores/scheduleStore";
import { Schedule, ScheduleShift } from "@/types/schedule";
import toast from "react-hot-toast";

interface UseScheduleDataReturn {
  // Data
  currentSchedule: Schedule | null;
  scheduleShifts: ScheduleShift[];
  upcomingSchedules: Schedule[];
  previousSchedules: Schedule[];
  allSchedules: Schedule[];
  
  // Loading states
  isLoading: boolean;
  initialFetchDone: boolean;
  
  // Error state
  error: string | null;
  
  // Manual navigation state
  manualScheduleId: string | null;
  setManualScheduleId: (id: string | null) => void;
  
  // Fetch functions
  fetchCurrentScheduleData: () => Promise<void>;
  fetchUpcomingSchedulesData: () => Promise<void>;
  fetchPreviousSchedulesData: () => Promise<void>;
  fetchShiftsForSchedule: (scheduleId: string) => Promise<void>;
  loadAllSchedules: () => Promise<void>;
  
  // Navigation functions
  handlePreviousWeek: () => Promise<void>;
  handleNextWeek: () => Promise<void>;
  handleManualScheduleChange: (scheduleId: string) => Promise<void>;
  
  // Refresh function
  refreshCurrentSchedule: () => Promise<void>;
}

/**
 * Custom hook for managing Schedule Manager data operations
 * Handles fetching current, upcoming, and previous schedules along with their shifts
 * Provides week navigation and manual schedule selection capabilities
 */
export const useScheduleData = (): UseScheduleDataReturn => {
  // Local state for UI-specific data
  const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([]);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [manualScheduleId, setManualScheduleId] = useState<string | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  
  // Get data and functions from the global store
  const {
    currentSchedule,
    previousSchedules,
    scheduleShifts,
    isLoading,
    error,
    fetchCurrentSchedule,
    fetchUpcomingSchedule,
    fetchPreviousSchedules,
    fetchShifts,
  } = useScheduleStore();
  
  /**
   * Load ALL schedules (current, upcoming, previous) for manual navigation
   */
  const loadAllSchedules = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      if (!organizationId) {
        console.warn("No organization ID found for user");
        return;
      }

      // Fetch ALL schedules sorted by start_date (most recent first)
      const { data, error: fetchError } = await supabase
        .from("schedules")
        .select("*")
        .eq("organization_id", organizationId)
        .order("start_date", { ascending: false });

      if (fetchError) {
        console.error("Error loading schedules:", fetchError);
        throw fetchError;
      }

      console.log(`Loaded ${data?.length || 0} total schedules for navigation`);
      setAllSchedules(data || []);
    } catch (err) {
      console.error("Error in loadAllSchedules:", err);
      toast.error("Failed to load schedule history");
    }
  }, []);
  
  /**
   * Fetch current schedule and its shifts
   */
  const fetchCurrentScheduleData = useCallback(async () => {
    try {
      const result = await fetchCurrentSchedule();
      
      // Get the latest currentSchedule from the store after fetching
      const latestSchedule = useScheduleStore.getState().currentSchedule;
      
      if (latestSchedule?.id) {
        await fetchShifts(latestSchedule.id);
        setManualScheduleId(latestSchedule.id);
      }
      
      // Also load all schedules for navigation
      await loadAllSchedules();
    } catch (err) {
      console.error("Error fetching current schedule:", err);
      toast.error("Failed to load current schedule");
    }
  }, [fetchCurrentSchedule, fetchShifts, loadAllSchedules]);
  
  /**
   * Fetch upcoming schedules
   */
  const fetchUpcomingSchedulesData = useCallback(async () => {
    try {
      const schedules = await fetchUpcomingSchedule();
      setUpcomingSchedules(schedules);
    } catch (err) {
      console.error("Error fetching upcoming schedules:", err);
      toast.error("Failed to load upcoming schedules");
    }
  }, [fetchUpcomingSchedule]);
  
  /**
   * Fetch previous schedules
   */
  const fetchPreviousSchedulesData = useCallback(async () => {
    try {
      await fetchPreviousSchedules();
    } catch (err) {
      console.error("Error fetching previous schedules:", err);
      toast.error("Failed to load previous schedules");
    }
  }, [fetchPreviousSchedules]);
  
  /**
   * Fetch shifts for a specific schedule
   */
  const fetchShiftsForSchedule = useCallback(async (scheduleId: string) => {
    try {
      await fetchShifts(scheduleId);
    } catch (err) {
      console.error("Error fetching shifts:", err);
      toast.error("Failed to load schedule shifts");
    }
  }, [fetchShifts]);
  
  /**
   * Navigate to the previous week's schedule
   */
  const handlePreviousWeek = useCallback(async () => {
    if (allSchedules.length === 0) {
      toast.info("No schedules available");
      return;
    }
    
    const currentIndex = allSchedules.findIndex(s => s.id === manualScheduleId);
    const nextIndex = currentIndex + 1; // Next index is previous week (sorted descending)
    
    if (nextIndex < allSchedules.length) {
      const prevSchedule = allSchedules[nextIndex];
      setManualScheduleId(prevSchedule.id);
      await fetchShifts(prevSchedule.id);
      toast.success(`Viewing week of ${prevSchedule.start_date}`);
    } else {
      toast.info("No earlier schedules available");
    }
  }, [allSchedules, manualScheduleId, fetchShifts]);
  
  /**
   * Navigate to the next week's schedule
   */
  const handleNextWeek = useCallback(async () => {
    if (allSchedules.length === 0) {
      toast.info("No schedules available");
      return;
    }
    
    const currentIndex = allSchedules.findIndex(s => s.id === manualScheduleId);
    const nextIndex = currentIndex - 1; // Previous index is next week (sorted descending)
    
    if (nextIndex >= 0) {
      const nextSchedule = allSchedules[nextIndex];
      setManualScheduleId(nextSchedule.id);
      await fetchShifts(nextSchedule.id);
      toast.success(`Viewing week of ${nextSchedule.start_date}`);
    } else {
      toast.info("No later schedules available");
    }
  }, [allSchedules, manualScheduleId, fetchShifts]);
  
  /**
   * Handle manual schedule selection from dropdown
   */
  const handleManualScheduleChange = useCallback(async (scheduleId: string) => {
    if (!scheduleId) return;
    
    setManualScheduleId(scheduleId);
    await fetchShifts(scheduleId);
    
    const selectedSchedule = allSchedules.find(s => s.id === scheduleId);
    if (selectedSchedule) {
      toast.success(`Viewing week of ${selectedSchedule.start_date}`);
    }
  }, [allSchedules, fetchShifts]);
  
  /**
   * Refresh the current schedule (used after updates/deletes)
   */
  const refreshCurrentSchedule = useCallback(async () => {
    await fetchCurrentScheduleData();
  }, [fetchCurrentScheduleData]);
  
  /**
   * Initial data fetch on component mount
   */
  useEffect(() => {
    if (!initialFetchDone) {
      const performInitialFetch = async () => {
        await fetchCurrentScheduleData();
        setInitialFetchDone(true);
      };
      performInitialFetch();
    }
  }, [initialFetchDone, fetchCurrentScheduleData]);
  
  /**
   * DEBUG: Log shifts changes for troubleshooting
   */
  useEffect(() => {
    if (scheduleShifts.length > 0) {
      console.log('=== SCHEDULE SHIFTS CHANGED ===');
      console.log('Total shifts:', scheduleShifts.length);
      console.log('Sample shift:', scheduleShifts[0]);
      console.log('All shift dates:', [...new Set(scheduleShifts.map(s => s.shift_date))].sort());
    }
  }, [scheduleShifts]);
  
  return {
    // Data
    currentSchedule,
    scheduleShifts,
    upcomingSchedules,
    previousSchedules,
    allSchedules,
    
    // Loading states
    isLoading,
    initialFetchDone,
    
    // Error state
    error,
    
    // Manual navigation state
    manualScheduleId,
    setManualScheduleId,
    
    // Fetch functions
    fetchCurrentScheduleData,
    fetchUpcomingSchedulesData,
    fetchPreviousSchedulesData,
    fetchShiftsForSchedule,
    loadAllSchedules,
    
    // Navigation functions
    handlePreviousWeek,
    handleNextWeek,
    handleManualScheduleChange,
    
    // Refresh function
    refreshCurrentSchedule,
  };
};
