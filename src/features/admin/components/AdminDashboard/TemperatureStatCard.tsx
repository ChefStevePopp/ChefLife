import React, { useState, useEffect, useMemo } from "react";
import { ThermometerSnowflake, Wifi, WifiOff, AlertTriangle, CheckCircle } from "lucide-react";
import { useSensorPush } from "@/hooks/useSensorPush";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

/**
 * =============================================================================
 * TEMPERATURE STAT CARD - Dashboard Widget
 * =============================================================================
 * 
 * Displays real-time temperature monitoring on the admin dashboard.
 * Animates through all fridges and freezers being tracked via SensorPush.
 * 
 * Design Notes:
 * - Temperature value: White (neutral) - not colored by status
 * - Status icons: Colored (emerald checkmark, amber/red triangle)
 * - Fridge icon: Primary blue
 * - Freezer icon: Darker blue (blue-700)
 * - Summary: AlertTriangle with count pill for warnings/critical
 * - Progress bar: Subtle, 1 shade darker than card
 * 
 * Data Sources:
 * - SensorPush integration (useSensorPush hook)
 * - HACCP Equipment table (haccp_equipment)
 * =============================================================================
 */

interface EquipmentWithReading {
  id: string;
  name: string;
  type: "fridge" | "freezer";
  temperature: number | null;
  status: "normal" | "warning" | "critical";
  isConnected: boolean;
  location: string;
}

export const TemperatureStatCard: React.FC = () => {
  const { organization } = useAuth();
  const { sensors, readings, integration, getLatestReading, getTemperatureStatus } = useSensorPush();
  
  const [equipment, setEquipment] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Load equipment from database
  useEffect(() => {
    const loadEquipment = async () => {
      if (!organization?.id) return;

      try {
        const { data, error } = await supabase
          .from("haccp_equipment")
          .select("*")
          .eq("organization_id", organization.id)
          .eq("is_active", true)
          .in("equipment_type", ["fridge", "freezer"])
          .order("equipment_type", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;
        setEquipment(data || []);
      } catch (error) {
        console.error("Error loading equipment:", error);
      }
    };

    loadEquipment();
  }, [organization?.id]);

  // Build combined list of equipment with their readings
  const equipmentWithReadings: EquipmentWithReading[] = useMemo(() => {
    const items: EquipmentWithReading[] = [];

    // Add equipment with assigned sensors
    equipment.forEach((eq) => {
      const assignedSensor = eq.sensor_id
        ? sensors.find((s) => s.id === eq.sensor_id)
        : null;

      const latestReading = assignedSensor
        ? getLatestReading(assignedSensor.id)
        : null;

      const temperature = latestReading?.temperature ?? null;
      const status = temperature
        ? getTemperatureStatus(temperature, eq.equipment_type)
        : "normal";

      items.push({
        id: eq.id,
        name: eq.name,
        type: eq.equipment_type as "fridge" | "freezer",
        temperature,
        status,
        isConnected: !!assignedSensor?.active,
        location: eq.location_name || "Unknown",
      });
    });

    // If no equipment configured, show unassigned sensors as fallback
    if (items.length === 0 && sensors.length > 0) {
      sensors.forEach((sensor) => {
        const latestReading = getLatestReading(sensor.id);
        const temperature = latestReading?.temperature ?? null;
        const status = temperature
          ? getTemperatureStatus(temperature, "fridge")
          : "normal";

        items.push({
          id: sensor.id,
          name: sensor.name,
          type: "fridge",
          temperature,
          status,
          isConnected: sensor.active,
          location: sensor.location_name || "Unassigned",
        });
      });
    }

    return items;
  }, [equipment, sensors, readings, getLatestReading, getTemperatureStatus]);

  // Cycle through equipment every 4 seconds (pause on hover)
  useEffect(() => {
    if (equipmentWithReadings.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % equipmentWithReadings.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [equipmentWithReadings.length, isHovered]);

  // Current item to display
  const currentItem = equipmentWithReadings[currentIndex] || null;

  // Calculate overall status summary
  const statusSummary = useMemo(() => {
    const total = equipmentWithReadings.length;
    const critical = equipmentWithReadings.filter((e) => e.status === "critical").length;
    const warning = equipmentWithReadings.filter((e) => e.status === "warning").length;
    const normal = equipmentWithReadings.filter((e) => e.status === "normal").length;

    return { total, critical, warning, normal };
  }, [equipmentWithReadings]);

  // Icon colors by equipment type
  const iconBgClass = currentItem?.type === "freezer" 
    ? "bg-blue-700/20" 
    : "bg-primary-500/20";
  
  const iconTextClass = currentItem?.type === "freezer"
    ? "text-blue-400"
    : "text-primary-400";

  // Status icon color only (not text)
  const getStatusIconColor = (status: string) => {
    switch (status) {
      case "critical": return "text-red-400";
      case "warning": return "text-amber-400";
      default: return "text-emerald-400";
    }
  };

  // No integration
  if (!integration) {
    return (
      <div 
        className="card p-6 cursor-pointer hover:bg-gray-700/30 transition-all duration-200"
        onClick={() => window.location.href = '/admin/haccp'}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
            <ThermometerSnowflake className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Temperature Monitor</p>
            <p className="text-lg font-medium text-gray-500">Not Configured</p>
          </div>
        </div>
      </div>
    );
  }

  // No equipment
  if (equipmentWithReadings.length === 0) {
    return (
      <div 
        className="card p-6 cursor-pointer hover:bg-gray-700/30 transition-all duration-200"
        onClick={() => window.location.href = '/admin/haccp'}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <ThermometerSnowflake className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Temperature Monitor</p>
            <p className="text-lg font-medium text-primary-400">Add Equipment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card p-6 cursor-pointer hover:bg-gray-700/30 transition-all duration-200 relative overflow-hidden"
      onClick={() => window.location.href = '/admin/haccp'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Progress indicator - subtle, 1 shade darker than card */}
      {equipmentWithReadings.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
          <div
            className="h-full bg-gray-600/50 transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / equipmentWithReadings.length) * 100}%`,
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${iconBgClass} flex items-center justify-center relative`}>
          <ThermometerSnowflake className={`w-6 h-6 ${iconTextClass}`} />
          {/* Connection indicator */}
          <div className="absolute -bottom-1 -right-1">
            {currentItem?.isConnected ? (
              <Wifi className="w-3 h-3 text-emerald-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Equipment name */}
          <p className="text-sm text-gray-400 truncate" title={currentItem?.name}>
            {currentItem?.name || "Temperature Monitor"}
          </p>
          
          {/* Temperature (white/neutral) + Status Icon (colored) */}
          <div className="flex items-baseline gap-2">
            {currentItem?.temperature !== null ? (
              <>
                <p className="text-2xl font-bold text-white">
                  {currentItem.temperature.toFixed(1)}°F
                </p>
                <span className={getStatusIconColor(currentItem.status)}>
                  {currentItem.status === "critical" || currentItem.status === "warning" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </span>
              </>
            ) : (
              <p className="text-lg font-medium text-gray-500">No Data</p>
            )}
          </div>
        </div>

        {/* Summary - Alert icon with count pill OR checkmark */}
        <div className="flex flex-col items-end gap-1">
          {/* Cycling indicator */}
          <div className="text-xs text-gray-500">
            {currentIndex + 1}/{equipmentWithReadings.length}
          </div>
          
          {/* Status summary as icon + pill */}
          {statusSummary.critical > 0 ? (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="px-1.5 py-0.5 text-xs font-medium text-red-400 bg-red-500/20 rounded-full">
                {statusSummary.critical}
              </span>
            </div>
          ) : statusSummary.warning > 0 ? (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="px-1.5 py-0.5 text-xs font-medium text-amber-400 bg-amber-500/20 rounded-full">
                {statusSummary.warning}
              </span>
            </div>
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
        </div>
      </div>
    </div>
  );
};

export default TemperatureStatCard;
