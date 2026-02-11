import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useScheduleStore } from "@/stores/scheduleStore";
import { getLocalDateString } from "@/utils/dateUtils";

interface Use7ShiftsSyncReturn {
  // Connection state (from org settings)
  isConnected: boolean;
  isLoading: boolean;
  lastSyncAt: string | null;
  locationId: string | null;
  
  // Sync state
  isSyncing: boolean;
  
  // Sync date range
  syncStartDate: string;
  setSyncStartDate: (date: string) => void;
  syncEndDate: string;
  setSyncEndDate: (date: string) => void;
  
  // Actions
  syncSchedule: () => Promise<boolean>;
  
  // Computed
  canSync: boolean;
}

/**
 * Hook for syncing schedules from 7shifts
 * Uses credentials stored in organization integrations (set via Integrations page)
 */
export const use7ShiftsSync = (): Use7ShiftsSyncReturn => {
  const { organizationId } = useAuth();
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Sync date range - default to today + 13 days (2 weeks)
  const [syncStartDate, setSyncStartDate] = useState<string>(
    getLocalDateString()
  );
  const [syncEndDate, setSyncEndDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 13);
    return getLocalDateString(date);
  });
  
  // Get store functions
  const { sync7shiftsSchedule } = useScheduleStore();
  
  // Computed
  const canSync = isConnected && !isSyncing;
  
  /**
   * Load integration status from organization
   */
  useEffect(() => {
    const loadIntegrationStatus = async () => {
      if (!organizationId) return;
      
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('integrations')
          .eq('id', organizationId)
          .single();
        
        if (error) throw error;
        
        const sevenShifts = data?.integrations?.['7shifts'];
        
        if (sevenShifts && sevenShifts.connected) {
          setIsConnected(true);
          setLocationId(sevenShifts.config?.location_id || null);
          setLastSyncAt(sevenShifts.config?.last_sync_at || null);
          
          // Set credentials in schedule store
          if (sevenShifts.config?.api_key && sevenShifts.config?.location_id) {
            useScheduleStore.getState().setCredentials({
              accessToken: sevenShifts.config.api_key,
              companyId: sevenShifts.config.company_id || "7140",
              locationId: sevenShifts.config.location_id,
            });
          }
        } else {
          setIsConnected(false);
          setLocationId(null);
          setLastSyncAt(null);
        }
      } catch (error) {
        console.error('Error loading 7shifts status:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadIntegrationStatus();
  }, [organizationId]);
  
  /**
   * Sync schedule from 7shifts
   */
  const syncSchedule = useCallback(async (): Promise<boolean> => {
    if (!isConnected || !organizationId) {
      toast.error("7shifts is not connected. Please configure in Integrations.");
      return false;
    }
    
    if (!syncStartDate || !syncEndDate) {
      toast.error("Please select a date range");
      return false;
    }
    
    setIsSyncing(true);
    
    try {
      // Get credentials from org
      const { data: orgData } = await supabase
        .from('organizations')
        .select('integrations')
        .eq('id', organizationId)
        .single();
      
      const config = orgData?.integrations?.['7shifts']?.config;
      
      if (!config?.api_key || !config?.location_id) {
        toast.error("7shifts credentials not found. Please reconfigure in Integrations.");
        return false;
      }
      
      // Sync using the store
      await sync7shiftsSchedule(
        config.api_key,
        config.location_id,
        syncStartDate,
        syncEndDate
      );
      
      // Update last sync time
      const updatedConfig = {
        ...config,
        last_sync_at: new Date().toISOString(),
      };
      
      await supabase
        .from('organizations')
        .update({
          integrations: {
            ...orgData?.integrations,
            '7shifts': {
              ...orgData?.integrations?.['7shifts'],
              config: updatedConfig,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);
      
      setLastSyncAt(updatedConfig.last_sync_at);
      toast.success("Schedule synced successfully!");
      return true;
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Error syncing schedule");
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isConnected, organizationId, syncStartDate, syncEndDate, sync7shiftsSchedule]);
  
  return {
    // Connection state
    isConnected,
    isLoading,
    lastSyncAt,
    locationId,
    
    // Sync state
    isSyncing,
    
    // Sync date range
    syncStartDate,
    setSyncStartDate,
    syncEndDate,
    setSyncEndDate,
    
    // Actions
    syncSchedule,
    
    // Computed
    canSync,
  };
};
