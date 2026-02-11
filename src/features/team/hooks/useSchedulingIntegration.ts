/**
 * useSchedulingIntegration Hook
 *
 * Reads the organization's active scheduling integration and provides:
 * - Which platform is selected (or null if none)
 * - Platform-specific export instructions for the Import tab
 * - Column mapping functions for CSV normalization
 * - Connection mode (csv / api)
 *
 * This is the bridge between Admin → Integrations and Team → Import.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  type SchedulingPlatformId,
  type ConnectionMode,
  type IntegrationDefinition,
  INTEGRATION_REGISTRY,
  getCSVTemplate,
} from '@/types/integrations';
import {
  autoMapColumns,
  normalizeCSV,
  detectPlatform,
  generateMappingPreview,
  type ColumnMappingResult,
  type DeltaField,
} from '@/features/team/services/columnMapper';

// =============================================================================
// TYPES
// =============================================================================

export interface SchedulingIntegrationState {
  /** Whether we're still loading the org's integration config */
  isLoading: boolean;

  /** The active scheduling platform ID, or null if none configured */
  platform: SchedulingPlatformId | null;

  /** The platform's display label (e.g., "7shifts", "HotSchedules (Fourth)") */
  platformLabel: string | null;

  /** How the org connects — CSV upload or API */
  connectionMode: ConnectionMode;

  /** Whether there's a live API connection (api mode + connected) */
  isApiConnected: boolean;

  /** Platform-specific export instructions (shown in Import tab) */
  exportInstructions: string | null;

  /** Platform help URL */
  helpUrl: string | null;

  /** The full integration definition from the registry */
  definition: IntegrationDefinition | null;

  /**
   * Map CSV content using the org's configured platform template.
   * Returns mapping result with success/failure + field assignments.
   * If no platform is configured, attempts auto-detection.
   */
  mapCSV: (csvContent: string) => ColumnMappingResult;

  /**
   * Normalize CSV content so its headers match the Delta Engine format.
   * Call this with the mapping from mapCSV before passing to the Delta Engine.
   */
  normalizeForDeltaEngine: (
    csvContent: string,
    mapping: Map<DeltaField, number>
  ) => string;

  /**
   * Generate a preview of how the first few rows will be interpreted.
   */
  previewMapping: (
    csvContent: string,
    mapping: Map<DeltaField, number>,
    maxRows?: number
  ) => Array<Record<DeltaField, string>>;

  /**
   * Auto-detect which platform a CSV came from (header fingerprinting).
   */
  detectCSVPlatform: (csvContent: string) => SchedulingPlatformId | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useSchedulingIntegration(): SchedulingIntegrationState {
  const { organizationId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<SchedulingPlatformId | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('csv');
  const [isApiConnected, setIsApiConnected] = useState(false);

  // Load the org's active scheduling integration
  useEffect(() => {
    const loadIntegration = async () => {
      if (!organizationId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('integrations')
          .eq('id', organizationId)
          .single();

        if (error) throw error;

        const integrations = data?.integrations || {};

        // Find the first connected scheduling integration
        const schedulingPlatforms = INTEGRATION_REGISTRY.filter(
          (i) => i.category === 'scheduling'
        );

        let found = false;
        for (const def of schedulingPlatforms) {
          const config = integrations[def.id];
          if (config?.enabled && config?.connected) {
            setActivePlatform(def.schedulingPlatformId || null);
            setConnectionMode(config.connection_mode || 'csv');
            setIsApiConnected(
              config.connection_mode === 'api' && config.connected
            );
            found = true;
            break;
          }
        }

        // If no connected integration found, check for any enabled one
        if (!found) {
          for (const def of schedulingPlatforms) {
            const config = integrations[def.id];
            if (config?.enabled) {
              setActivePlatform(def.schedulingPlatformId || null);
              setConnectionMode(config.connection_mode || 'csv');
              break;
            }
          }
        }
      } catch (err) {
        console.error('Error loading scheduling integration:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadIntegration();
  }, [organizationId]);

  // Get the integration definition from the registry
  const definition = useMemo(() => {
    if (!activePlatform) return null;
    return (
      INTEGRATION_REGISTRY.find(
        (i) => i.category === 'scheduling' && i.schedulingPlatformId === activePlatform
      ) || null
    );
  }, [activePlatform]);

  // Get the CSV template for the platform
  const template = useMemo(() => {
    if (!activePlatform) return null;
    return getCSVTemplate(activePlatform);
  }, [activePlatform]);

  // Derived values
  const platformLabel = definition?.label || null;
  const exportInstructions = template?.exportInstructions || null;
  const helpUrl = template?.helpUrl || null;

  // Column mapping function
  const mapCSV = useCallback(
    (csvContent: string): ColumnMappingResult => {
      // If we have a configured platform, use its template
      if (activePlatform) {
        return autoMapColumns(csvContent, activePlatform);
      }

      // No platform configured — try auto-detection
      const detected = detectPlatform(csvContent);
      if (detected) {
        return autoMapColumns(csvContent, detected);
      }

      // Fall back to mega-alias attempt (the "other" path)
      return autoMapColumns(csvContent, 'other');
    },
    [activePlatform]
  );

  // CSV normalization
  const normalizeForDeltaEngine = useCallback(
    (csvContent: string, mapping: Map<DeltaField, number>): string => {
      return normalizeCSV(csvContent, mapping);
    },
    []
  );

  // Preview generation
  const previewMapping = useCallback(
    (
      csvContent: string,
      mapping: Map<DeltaField, number>,
      maxRows?: number
    ) => {
      return generateMappingPreview(csvContent, mapping, maxRows);
    },
    []
  );

  // Platform detection
  const detectCSVPlatform = useCallback(
    (csvContent: string): SchedulingPlatformId | null => {
      return detectPlatform(csvContent);
    },
    []
  );

  return {
    isLoading,
    platform: activePlatform,
    platformLabel,
    connectionMode,
    isApiConnected,
    exportInstructions,
    helpUrl,
    definition,
    mapCSV,
    normalizeForDeltaEngine,
    previewMapping,
    detectCSVPlatform,
  };
}
