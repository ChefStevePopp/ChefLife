import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useScheduleStore } from "@/stores/scheduleStore";
import { nexus } from "@/lib/nexus";

export interface SevenShiftsCredentials {
  api_key: string;
  company_id: string;
  location_id: string;
}

export interface SevenShiftsSettings {
  auto_sync: boolean;
  sync_frequency: 'manual' | 'daily' | 'weekly';
  notify_changes: boolean;
  last_sync_at?: string;
}

interface Use7ShiftsIntegrationReturn {
  // Credentials
  apiKey: string;
  setApiKey: (key: string) => void;
  companyId: string;
  setCompanyId: (id: string) => void;
  locationId: string;
  setLocationId: (id: string) => void;
  
  // Connection state
  isLoading: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;
  
  // Settings
  autoSync: boolean;
  setAutoSync: (enabled: boolean) => void;
  syncFrequency: 'manual' | 'daily' | 'weekly';
  setSyncFrequency: (freq: 'manual' | 'daily' | 'weekly') => void;
  notifyChanges: boolean;
  setNotifyChanges: (enabled: boolean) => void;
  lastSyncAt: string | null;
  
  // Actions
  testConnection: () => Promise<boolean>;
  saveCredentials: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  
  // Validation
  hasCredentials: boolean;
  hasUnsavedChanges: boolean;
}

/**
 * Hook for managing 7shifts integration from the Integrations page
 * Persists credentials and settings to Supabase
 */
export const use7ShiftsIntegration = (): Use7ShiftsIntegrationReturn => {
  const { organizationId, user } = useAuth();
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Credentials (local state for form)
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("7140"); // Default company ID
  const [locationId, setLocationId] = useState("");
  
  // Saved credentials (from DB)
  const [savedCredentials, setSavedCredentials] = useState<SevenShiftsCredentials | null>(null);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  
  // Settings
  const [autoSync, setAutoSync] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState<'manual' | 'daily' | 'weekly'>('manual');
  const [notifyChanges, setNotifyChanges] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  
  // Get store functions for testing connection
  const { testConnection: storeTestConnection } = useScheduleStore();
  
  // Computed values
  const hasCredentials = Boolean(apiKey && locationId);
  const hasUnsavedChanges = Boolean(
    apiKey !== (savedCredentials?.api_key || "") ||
    locationId !== (savedCredentials?.location_id || "") ||
    companyId !== (savedCredentials?.company_id || "7140")
  );
  
  /**
   * Load integration config from organization
   */
  useEffect(() => {
    const loadIntegration = async () => {
      if (!organizationId) return;
      
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('integrations')
          .eq('id', organizationId)
          .single();
        
        if (error) throw error;
        
        const sevenShifts = data?.integrations?.['7shifts'];
        
        if (sevenShifts) {
          const config = sevenShifts.config || {};
          
          // Set credentials
          setApiKey(config.api_key || "");
          setCompanyId(config.company_id || "7140");
          setLocationId(config.location_id || "");
          
          setSavedCredentials({
            api_key: config.api_key || "",
            company_id: config.company_id || "7140",
            location_id: config.location_id || "",
          });
          
          // Set connection state
          setIsConnected(sevenShifts.connected || false);
          
          // Set settings
          setAutoSync(config.auto_sync || false);
          setSyncFrequency(config.sync_frequency || 'manual');
          setNotifyChanges(config.notify_changes || false);
          setLastSyncAt(config.last_sync_at || null);
          
          // If connected, set credentials in schedule store
          if (sevenShifts.connected && config.api_key && config.location_id) {
            useScheduleStore.getState().setCredentials({
              accessToken: config.api_key,
              companyId: config.company_id || "7140",
              locationId: config.location_id,
            });
          }
        }
      } catch (error) {
        console.error('Error loading 7shifts integration:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadIntegration();
  }, [organizationId]);
  
  /**
   * Test connection to 7shifts API
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!apiKey || !locationId) {
      toast.error("Please enter API key and location ID");
      return false;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Set credentials in the store
      useScheduleStore.getState().setCredentials({
        accessToken: apiKey,
        companyId: companyId,
        locationId: locationId,
      });
      
      // Test the connection
      const success = await storeTestConnection();
      
      if (success) {
        toast.success("Connection successful!");
        setIsConnected(true);
        return true;
      } else {
        setConnectionError("Connection failed. Please check your credentials.");
        toast.error("Connection failed. Please check your credentials.");
        setIsConnected(false);
        return false;
      }
    } catch (error) {
      console.error("Connection test error:", error);
      const message = error instanceof Error ? error.message : "Error testing connection";
      setConnectionError(message);
      toast.error(message);
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [apiKey, companyId, locationId, storeTestConnection]);
  
  /**
   * Save credentials and settings to Supabase
   */
  const saveCredentials = useCallback(async (): Promise<boolean> => {
    if (!organizationId || !user) {
      toast.error("Not authenticated");
      return false;
    }
    
    if (!apiKey || !locationId) {
      toast.error("Please enter API key and location ID");
      return false;
    }
    
    setIsConnecting(true);
    
    try {
      // First test connection
      const connectionSuccess = await testConnection();
      
      if (!connectionSuccess) {
        return false;
      }
      
      // Get current integrations
      const { data: orgData, error: fetchError } = await supabase
        .from('organizations')
        .select('integrations')
        .eq('id', organizationId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentIntegrations = orgData?.integrations || {};
      
      // Update 7shifts integration
      const updatedIntegrations = {
        ...currentIntegrations,
        '7shifts': {
          enabled: true,
          connected: true,
          connected_at: new Date().toISOString(),
          connected_by: user.id,
          config: {
            api_key: apiKey,
            company_id: companyId,
            location_id: locationId,
            auto_sync: autoSync,
            sync_frequency: syncFrequency,
            notify_changes: notifyChanges,
            last_sync_at: lastSyncAt,
          },
        },
      };
      
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          integrations: updatedIntegrations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);
      
      if (updateError) throw updateError;
      
      // Update saved credentials
      setSavedCredentials({
        api_key: apiKey,
        company_id: companyId,
        location_id: locationId,
      });
      
      // Log to nexus
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          integration_id: '7shifts',
          integration_name: '7shifts',
          action: 'connected',
        },
      });
      
      toast.success("7shifts connected successfully!");
      return true;
    } catch (error) {
      console.error('Error saving 7shifts credentials:', error);
      toast.error("Failed to save credentials");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [organizationId, user, apiKey, companyId, locationId, autoSync, syncFrequency, notifyChanges, lastSyncAt, testConnection]);
  
  /**
   * Disconnect 7shifts integration
   */
  const disconnect = useCallback(async (): Promise<boolean> => {
    if (!organizationId || !user) {
      toast.error("Not authenticated");
      return false;
    }
    
    try {
      // Get current integrations
      const { data: orgData, error: fetchError } = await supabase
        .from('organizations')
        .select('integrations')
        .eq('id', organizationId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentIntegrations = orgData?.integrations || {};
      
      // Update 7shifts integration
      const updatedIntegrations = {
        ...currentIntegrations,
        '7shifts': {
          enabled: false,
          connected: false,
          connected_at: null,
          connected_by: null,
          config: null,
        },
      };
      
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          integrations: updatedIntegrations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);
      
      if (updateError) throw updateError;
      
      // Reset local state
      setApiKey("");
      setLocationId("");
      setCompanyId("7140");
      setSavedCredentials(null);
      setIsConnected(false);
      setAutoSync(false);
      setSyncFrequency('manual');
      setNotifyChanges(false);
      setLastSyncAt(null);
      
      // Clear credentials from schedule store
      useScheduleStore.getState().setCredentials({
        accessToken: "",
        companyId: "",
        locationId: "",
      });
      
      // Log to nexus
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          integration_id: '7shifts',
          integration_name: '7shifts',
          action: 'disconnected',
        },
      });
      
      toast.success("7shifts disconnected");
      return true;
    } catch (error) {
      console.error('Error disconnecting 7shifts:', error);
      toast.error("Failed to disconnect");
      return false;
    }
  }, [organizationId, user]);
  
  return {
    // Credentials
    apiKey,
    setApiKey,
    companyId,
    setCompanyId,
    locationId,
    setLocationId,
    
    // Connection state
    isLoading,
    isConnecting,
    isConnected,
    connectionError,
    
    // Settings
    autoSync,
    setAutoSync,
    syncFrequency,
    setSyncFrequency,
    notifyChanges,
    setNotifyChanges,
    lastSyncAt,
    
    // Actions
    testConnection,
    saveCredentials,
    disconnect,
    
    // Validation
    hasCredentials,
    hasUnsavedChanges,
  };
};
