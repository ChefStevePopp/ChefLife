import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Organization } from "@/types/organization";
import toast from "react-hot-toast";

export function useOrganizationSettings() {
  const {
    organization: authOrganization,
    organizationId,
    isLoading: authLoading,
  } = useAuth();
  const [localOrganization, setLocalOrganization] =
    useState<Organization | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track original state for unsaved changes detection
  const originalOrganization = useRef<Organization | null>(null);

  // Use organization from auth if available, otherwise use local state
  const organization = useMemo(() => {
    return localOrganization || authOrganization;
  }, [localOrganization, authOrganization]);

  // Only load organization if auth doesn't have it
  useEffect(() => {
    if (!authLoading && organizationId && !authOrganization) {
      loadOrganization(organizationId);
    } else if (authOrganization && !localOrganization) {
      // Initialize local state with auth organization and ensure settings exist
      const orgWithSettings = {
        ...authOrganization,
        settings: authOrganization.settings || {
          business_type: "restaurant",
          default_timezone: "America/Toronto",
          multi_unit: false,
          currency: "CAD",
          date_format: "MM/DD/YYYY",
          time_format: "12h",
        },
      };
      setLocalOrganization(orgWithSettings);
      originalOrganization.current = JSON.parse(JSON.stringify(orgWithSettings));
    }
  }, [authLoading, organizationId, authOrganization, localOrganization]);

  const loadOrganization = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      if (error) throw error;

      // Initialize empty settings if none exist
      if (!data.settings) {
        data.settings = {
          business_type: "restaurant",
          default_timezone: "America/Toronto",
          multi_unit: false,
          currency: "CAD",
          date_format: "MM/DD/YYYY",
          time_format: "12h",
        };
      }

      setLocalOrganization(data);
      originalOrganization.current = JSON.parse(JSON.stringify(data));
    } catch (error) {
      console.error("Error loading organization:", error);
      toast.error("Failed to load organization settings");
    }
  };

  const updateOrganization = useCallback((updates: Partial<Organization>) => {
    if (!organization) return;
    const updatedOrg = { ...organization, ...updates };
    setLocalOrganization(updatedOrg);
  }, [organization]);

  const handleSave = async () => {
    if (!organization) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("organizations")
        .update({
          ...organization,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organization.id);

      if (error) throw error;
      toast.success("Settings saved successfully");

      // Update the original reference after successful save
      originalOrganization.current = JSON.parse(JSON.stringify(organization));

      // Only reload if we don't have auth organization (to avoid unnecessary fetches)
      if (!authOrganization && organizationId) {
        await loadOrganization(organizationId);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!organization || !originalOrganization.current) return false;
    return JSON.stringify(organization) !== JSON.stringify(originalOrganization.current);
  }, [organization]);

  // Reset to original state
  const resetChanges = useCallback(() => {
    if (originalOrganization.current) {
      setLocalOrganization(JSON.parse(JSON.stringify(originalOrganization.current)));
    }
  }, []);

  return {
    organization,
    isLoading: authLoading && !organization,
    isSaving,
    updateOrganization,
    handleSave,
    hasUnsavedChanges,
    resetChanges,
  };
}
