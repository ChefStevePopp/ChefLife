import React, { useState, useEffect, useMemo } from "react";
import { Thermometer, ThermometerSnowflake, Wifi, WifiOff, AlertTriangle, CheckCircle } from "lucide-react";
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
 * Features:
 * - Cycles through equipment every 4 seconds
 * - Shows temperature, status, and equipment type
 * - Color-coded status indicators (green/amber/red)
 * - Click to navigate to HACCP Manager
 * - Graceful handling when no sensors configured
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
        // Default to fridge status thresholds for unassigned sensors
        const status = temperature
          ? getTemperatureStatus(temperature, "fridge")
          : "normal";

        items.push({
          id: sensor.id,
          name: sensor.name,
          type: "fridge", // Default assumption
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
    const disconnected = equipmentWithReadings.filter((e) => !e.isConnected).length;

    return { total, critical, warning, normal, disconnected };
  }, [equipmentWithReadings]);

  // Determine card color based on worst status
  const getCardColor = () => {
    if (statusSummary.critical > 0) return "red";
    if (statusSummary.warning > 0) return "amber";
    return "cyan";
  };

  const cardColor = getCardColor();

  // Status color classes
  const getStatusClasses = (status: string) => {
    switch (status) {
      case "critical":
        return "text-red-400";
      case "warning":
        return "text-amber-400";
      default:
        return "text-green-400";
    }
  };

  // No integration or no equipment
  if (!integration) {
    return (
      <div 
        className="card p-6 cursor-pointer hover:bg-gray-700/30 transition-all duration-200"
        onClick={() => window.location.href = '/admin/haccp'}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
            <Thermometer className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Temperature Monitor</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-medium text-gray-500">Not Configured</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (equipmentWithReadings.length === 0) {
    return (
      <div 
        className="card p-6 cursor-pointer hover:bg-gray-700/30 transition-all duration-200"
        onClick={() => window.location.href = '/admin/haccp'}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Thermometer className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Temperature Monitor</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-medium text-cyan-400">Add Equipment</p>
            </div>
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
      {/* Progress indicator for cycling */}
      {equipmentWithReadings.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
          <div
            className={`h-full bg-${cardColor}-500/50 transition-all duration-300`}
            style={{
              width: `${((currentIndex + 1) / equipmentWithReadings.length) * 100}%`,
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl bg-${cardColor}-500/20 flex items-center justify-center relative`}>
          {currentItem?.type === "freezer" ? (
            <ThermometerSnowflake className={`w-6 h-6 text-${cardColor}-400`} />
          ) : (
            <Thermometer className={`w-6 h-6 text-${cardColor}-400`} />
          )}
          {/* Connection indicator */}
          <div className="absolute -bottom-1 -right-1">
            {currentItem?.isConnected ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Equipment name with truncation */}
          <p className="text-sm text-gray-400 truncate" title={currentItem?.name}>
            {currentItem?.name || "Temperature Monitor"}
          </p>
          
          {/* Temperature and status */}
          <div className="flex items-baseline gap-2">
            {currentItem?.temperature !== null ? (
              <>
                <p className={`text-2xl font-bold ${getStatusClasses(currentItem.status)}`}>
                  {currentItem.temperature.toFixed(1)}°F
                </p>
                <span className={`text-xs ${getStatusClasses(currentItem.status)}`}>
                  {currentItem.status === "critical" && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Critical
                    </span>
                  )}
                  {currentItem.status === "warning" && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Warning
                    </span>
                  )}
                  {currentItem.status === "normal" && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      OK
                    </span>
                  )}
                </span>
              </>
            ) : (
              <p className="text-lg font-medium text-gray-500">No Data</p>
            )}
          </div>
        </div>

        {/* Summary badge */}
        <div className="text-right">
          <div className="text-xs text-gray-500">
            {currentIndex + 1}/{equipmentWithReadings.length}
          </div>
          {statusSummary.critical > 0 && (
            <div className="text-xs text-red-400 font-medium">
              {statusSummary.critical} critical
            </div>
          )}
          {statusSummary.warning > 0 && statusSummary.critical === 0 && (
            <div className="text-xs text-amber-400 font-medium">
              {statusSummary.warning} warning
            </div>
          )}
          {statusSummary.critical === 0 && statusSummary.warning === 0 && (
            <div className="text-xs text-green-400 font-medium">
              All OK
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemperatureStatCard;
