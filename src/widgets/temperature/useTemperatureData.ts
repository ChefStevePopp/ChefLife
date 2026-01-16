/**
 * =============================================================================
 * TEMPERATURE WIDGET - DATA HOOK
 * =============================================================================
 * 
 * Fetches and transforms temperature data for the widget.
 * Combines SensorPush readings with HACCP equipment configuration.
 * 
 * =============================================================================
 */

import { useState, useEffect, useMemo } from "react";
import { useSensorPush } from "@/hooks/useSensorPush";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { WidgetContext, WidgetStatus } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface EquipmentReading {
  id: string;
  name: string;
  type: "fridge" | "freezer";
  temperature: number | null;
  status: WidgetStatus;
  isConnected: boolean;
  location: string;
  
  // Extended data (higher security levels)
  trend?: "up" | "down" | "stable";
  trendDelta?: number;
  lastLogged?: Date;
  thresholdMin?: number;
  thresholdMax?: number;
  calibrationDue?: Date;
  riskCost?: number;
}

export interface TemperatureData {
  // Equipment list
  equipment: EquipmentReading[];
  
  // Summary stats
  summary: {
    total: number;
    ok: number;
    warning: number;
    critical: number;
    offline: number;
  };
  
  // Overall status
  overallStatus: WidgetStatus;
  
  // Integration status
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useTemperatureData(context: WidgetContext): TemperatureData {
  const { organization } = useAuth();
  const { 
    sensors, 
    readings, 
    integration, 
    getLatestReading, 
    getTemperatureStatus 
  } = useSensorPush();

  const [rawEquipment, setRawEquipment] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load equipment from database
  useEffect(() => {
    const loadEquipment = async () => {
      // Use context.organizationId if available, fallback to auth
      const orgId = context.organizationId || organization?.id;
      if (!orgId) return;

      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("haccp_equipment")
          .select("*")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .in("equipment_type", ["fridge", "freezer"])
          .order("equipment_type", { ascending: true })
          .order("name", { ascending: true });

        // Scope filtering
        if (context.scope === "location" && context.locationId) {
          query = query.eq("location_id", context.locationId);
        } else if (context.scope === "region" && context.regionId) {
          // TODO: Filter by region when location_id -> region relationship exists
          // For now, show all org equipment
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setRawEquipment(data || []);
      } catch (err) {
        console.error("Error loading equipment:", err);
        setError("Failed to load equipment");
      } finally {
        setIsLoading(false);
      }
    };

    loadEquipment();
  }, [context.organizationId, context.scope, context.locationId, context.regionId, organization?.id]);

  // Transform raw data into EquipmentReading[]
  const equipment: EquipmentReading[] = useMemo(() => {
    const items: EquipmentReading[] = [];

    rawEquipment.forEach((eq) => {
      const assignedSensor = eq.sensor_id
        ? sensors.find((s) => s.id === eq.sensor_id)
        : null;

      const latestReading = assignedSensor
        ? getLatestReading(assignedSensor.id)
        : null;

      const temperature = latestReading?.temperature ?? null;
      const rawStatus = temperature
        ? getTemperatureStatus(temperature, eq.equipment_type)
        : "unknown";

      // Map to WidgetStatus
      const status: WidgetStatus = !assignedSensor?.active
        ? "offline"
        : rawStatus === "critical"
        ? "critical"
        : rawStatus === "warning"
        ? "warning"
        : rawStatus === "normal"
        ? "ok"
        : "unknown";

      items.push({
        id: eq.id,
        name: eq.name,
        type: eq.equipment_type as "fridge" | "freezer",
        temperature,
        status,
        isConnected: !!assignedSensor?.active,
        location: eq.location_name || "Unknown",

        // Extended data (would come from additional queries/calculations)
        thresholdMin: eq.equipment_type === "freezer" ? -10 : 33,
        thresholdMax: eq.equipment_type === "freezer" ? 0 : 40,
        
        // Placeholder for trend calculation
        trend: "stable",
        trendDelta: 0,
        
        // Placeholder - would come from HACCP logs
        lastLogged: undefined,
        calibrationDue: undefined,
        riskCost: 0,
      });
    });

    // If no equipment configured, show unassigned sensors as fallback
    if (items.length === 0 && sensors.length > 0) {
      sensors.forEach((sensor) => {
        const latestReading = getLatestReading(sensor.id);
        const temperature = latestReading?.temperature ?? null;
        const rawStatus = temperature
          ? getTemperatureStatus(temperature, "fridge")
          : "unknown";

        const status: WidgetStatus = !sensor.active
          ? "offline"
          : rawStatus === "critical"
          ? "critical"
          : rawStatus === "warning"
          ? "warning"
          : rawStatus === "normal"
          ? "ok"
          : "unknown";

        items.push({
          id: sensor.id,
          name: sensor.name,
          type: "fridge",
          temperature,
          status,
          isConnected: sensor.active,
          location: sensor.location_name || "Unassigned",
          thresholdMin: 33,
          thresholdMax: 40,
          trend: "stable",
          trendDelta: 0,
          riskCost: 0,
        });
      });
    }

    return items;
  }, [rawEquipment, sensors, readings, getLatestReading, getTemperatureStatus]);

  // Calculate summary stats
  const summary = useMemo(() => {
    return {
      total: equipment.length,
      ok: equipment.filter((e) => e.status === "ok").length,
      warning: equipment.filter((e) => e.status === "warning").length,
      critical: equipment.filter((e) => e.status === "critical").length,
      offline: equipment.filter((e) => e.status === "offline").length,
    };
  }, [equipment]);

  // Calculate overall status
  const overallStatus: WidgetStatus = useMemo(() => {
    if (summary.critical > 0) return "critical";
    if (summary.warning > 0) return "warning";
    if (summary.offline === summary.total) return "offline";
    if (summary.ok > 0) return "ok";
    return "unknown";
  }, [summary]);

  return {
    equipment,
    summary,
    overallStatus,
    isConfigured: !!integration,
    isLoading,
    error,
  };
}
