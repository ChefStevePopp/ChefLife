import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useScheduleStore } from "@/stores/scheduleStore";

interface SevenShiftsSettings {
  apiKey: string;
  locationId: string;
  autoSync: boolean;
  notifyChanges: boolean;
}

interface Use7shiftsIntegrationReturn {
  // Credentials
  apiKey: string;
  setApiKey: (key: string) => void;
  locationId: string;
  setLocationId: (id: string) => void;
  
  // Connection state
  isConnecting: boolean;
  isConnected: boolean;
  
  // Sync settings
  autoSync: boolean;
  setAutoSync: (enabled: boolean) => void;
  notifyChanges: boolean;
  setNotifyChanges: (enabled: boolean) => void;
  
  // Sync date range
  syncStartDate: string;
  setSyncStartDate: (date: string) => void;
  syncEndDate: string;
  setSyncEndDate: (date: string) => void;
  
  // Actions
  testConnection: () => Promise<boolean>;
  syncSchedule: () => Promise<boolean>;
  saveSettings: () => void;
  
  // Validation
  hasCredentials: boolean;
  canSync: boolean;
}

const STORAGE_KEY = "7shifts-settings";

/**
 * Custom hook for managing 7shifts integration
 * Handles credentials, connection testing, syncing, and settings persistence
 * Reusable pattern for other scheduling integrations
 */
export const use7shiftsIntegration = (): Use7shiftsIntegrationReturn => {
  // Credentials state
  const [apiKey, setApiKey] = useState("");
  const [locationId, setLocationId] = useState("");
  
  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Sync settings
  const [autoSync, setAutoSync] = useState(false);
  const [notifyChanges, setNotifyChanges] = useState(false);
  
  // Sync date range - default to today + 13 days (2 weeks)
  const [syncStartDate, setSyncStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [syncEndDate, setSyncEndDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 13);
    return date.toISOString().split("T")[0];
  });
  
  // Get store functions
  const {
    testConnection: storeTestConnection,
    sync7shiftsSchedule,
    error: scheduleError,
  } = useScheduleStore();
  
  // Computed values
  const hasCredentials = Boolean(apiKey && locationId);
  const canSync = hasCredentials && isConnected;
  
  /**
   * Load settings from localStorage on mount
   */
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const settings: SevenShiftsSettings = JSON.parse(savedSettings);
        setApiKey(settings.apiKey || "");
        setLocationId(settings.locationId || "");
        setAutoSync(settings.autoSync || false);
        setNotifyChanges(settings.notifyChanges || false);
        
        // If we have credentials, test connection on load
        if (settings.apiKey && settings.locationId) {
          // Set credentials in store
          useScheduleStore.getState().setCredentials({
            accessToken: settings.apiKey,
            companyId: "7140",
            locationId: settings.locationId,
          });
          
          // Test connection silently
          storeTestConnection().then((success) => {
            setIsConnected(success);
          });
        }
      } catch (error) {
        console.error("Error loading 7shifts settings:", error);
      }
    }
  }, [storeTestConnection]);
  
  /**
   * Test connection to 7shifts API
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!apiKey || !locationId) {
      toast.error("Please enter both API key and location ID");
      return false;
    }
    
    setIsConnecting(true);
    try {
      // Set credentials in the store
      useScheduleStore.getState().setCredentials({
        accessToken: apiKey,
        companyId: "7140", // Default company ID
        locationId: locationId,
      });
      
      // Test the connection
      const success = await storeTestConnection();
      
      if (success) {
        toast.success("Connection successful!");
        setIsConnected(true);
      } else {
        toast.error("Connection failed. Please check your credentials.");
        setIsConnected(false);
      }
      
      return success;
    } catch (error) {
      console.error("Connection test error:", error);
      toast.error("Error testing connection");
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [apiKey, locationId, storeTestConnection]);
  
  /**
   * Sync schedule from 7shifts
   */
  const syncSchedule = useCallback(async (): Promise<boolean> => {
    if (!apiKey || !locationId) {
      toast.error("Please enter both API key and location ID");
      return false;
    }
    
    if (!syncStartDate || !syncEndDate) {
      toast.error("Please select a date range");
      return false;
    }
    
    setIsConnecting(true);
    try {
      // First set the credentials
      useScheduleStore.getState().setCredentials({
        accessToken: apiKey,
        companyId: "7140",
        locationId: locationId,
      });
      
      // Try to sync directly first to test the API
      const shifts = await useScheduleStore
        .getState()
        .syncSchedule(syncStartDate, syncEndDate);
      
      if (shifts && shifts.length > 0) {
        // If we got shifts, save them to the database
        await sync7shiftsSchedule(
          apiKey,
          locationId,
          syncStartDate,
          syncEndDate
        );
        toast.success(
          `Schedule synced successfully with ${shifts.length} shifts!`
        );
        return true;
      } else {
        toast.warning("No shifts found in the selected date range");
        return false;
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(scheduleError || "Error syncing schedule");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [apiKey, locationId, syncStartDate, syncEndDate, sync7shiftsSchedule, scheduleError]);
  
  /**
   * Save settings to localStorage
   */
  const saveSettings = useCallback(() => {
    const settings: SevenShiftsSettings = {
      apiKey,
      locationId,
      autoSync,
      notifyChanges,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast.success("Settings saved successfully");
  }, [apiKey, locationId, autoSync, notifyChanges]);
  
  return {
    // Credentials
    apiKey,
    setApiKey,
    locationId,
    setLocationId,
    
    // Connection state
    isConnecting,
    isConnected,
    
    // Sync settings
    autoSync,
    setAutoSync,
    notifyChanges,
    setNotifyChanges,
    
    // Sync date range
    syncStartDate,
    setSyncStartDate,
    syncEndDate,
    setSyncEndDate,
    
    // Actions
    testConnection,
    syncSchedule,
    saveSettings,
    
    // Validation
    hasCredentials,
    canSync,
  };
};
