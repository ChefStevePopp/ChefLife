import React, { useState, useEffect, useMemo } from "react";
import { ThermometerSnowflake, Wifi, WifiOff, AlertTriangle, CheckCircle } from "lucide-react";
import { useSensorPush } from "@/hooks/useSensorPush";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { AnimatedNumber, MorphingText } from "@/shared/components/AnimatedNumber";

/**
 * =============================================================================
 * TEMPERATURE STAT CARD - COMPACT VERSION (Subheader)
 * =============================================================================
 * 
 * Stripped-down version of TemperatureStatCard for embedding in subheaders.
 * - No .card wrapper (inherits parent styling)
 * - Reduced padding
 * - ~15% smaller icons and text
 * - Same premium morph animations
 * 
 * Reference: TemperatureStatCard.tsx
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

export const TemperatureStatCardCompact: React.FC = () => {
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

  // Cycle through equipment - slower for premium feel
  useEffect(() => {
    if (equipmentWithReadings.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % equipmentWithReadings.length);
    }, 8000); // 8 seconds per item

    return () => clearInterval(interval);
  }, [equipmentWithReadings.length, isHovered]);

  // Current item to display
  const currentItem = equipmentWithReadings[currentIndex] || null;

  // Calculate overall status summary
  const statusSummary = useMemo(() => {
    const total = equipmentWithReadings.length;
    const critical = equipmentWithReadings.filter((e) => e.status === "critical").length;
    const warning = equipmentWithReadings.filter((e) => e.status === "warning").length;

    return { total, critical, warning };
  }, [equipmentWithReadings]);

  // Icon colors by equipment type
  const iconBgClass = currentItem?.type === "freezer" 
    ? "bg-blue-700/30" 
    : "bg-primary-500/30";
  
  const iconTextClass = currentItem?.type === "freezer"
    ? "text-blue-400"
    : "text-primary-400";

  const getStatusIconColor = (status: string) => {
    switch (status) {
      case "critical": return "text-red-400";
      case "warning": return "text-amber-400";
      default: return "text-emerald-400";
    }
  };

  // No integration - compact placeholder
  if (!integration) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={() => window.location.href = '/admin/haccp'}
      >
        <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
          <ThermometerSnowflake className="w-4 h-4 text-gray-500" />
        </div>
        <span className="text-sm text-gray-500">Not Configured</span>
      </div>
    );
  }

  // No equipment - compact placeholder
  if (equipmentWithReadings.length === 0) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={() => window.location.href = '/admin/haccp'}
      >
        <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
          <ThermometerSnowflake className="w-4 h-4 text-primary-400" />
        </div>
        <span className="text-sm text-primary-400">Add Equipment</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-4 px-4 py-1.5 rounded-lg bg-gray-800/50 cursor-pointer hover:bg-gray-700/50 transition-colors"
      onClick={() => window.location.href = '/admin/haccp'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon - scaled down */}
      <div 
        className={`w-9 h-9 rounded-lg flex items-center justify-center relative transition-colors duration-1000 flex-shrink-0 ${iconBgClass}`}
      >
        <ThermometerSnowflake className={`w-5 h-5 transition-colors duration-1000 ${iconTextClass}`} />
        <div className="absolute -bottom-0.5 -right-0.5">
          {currentItem?.isConnected ? (
            <Wifi className="w-2.5 h-2.5 text-emerald-500" />
          ) : (
            <WifiOff className="w-2.5 h-2.5 text-red-500" />
          )}
        </div>
      </div>

      {/* Content - horizontal layout */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Name + Temp stacked tight */}
        <div className="flex flex-col leading-tight">
          <MorphingText 
            text={currentItem?.name || "Temperature"} 
            className="text-xs text-gray-400 truncate"
          />
          <div className="flex items-center gap-1.5">
            <AnimatedNumber 
              value={currentItem?.temperature ?? null} 
              suffix="°F"
              decimals={1}
              duration={2000}
              className="text-lg font-bold text-white"
              nullText="--"
              nullClassName="text-sm font-medium text-gray-500"
            />
            {currentItem?.temperature !== null && (
              <span className={`transition-colors duration-500 ${getStatusIconColor(currentItem.status)}`}>
                {currentItem.status === "critical" || currentItem.status === "warning" ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary - more horizontal spacing */}
      <div className="flex items-center gap-3 ml-auto">
        {equipmentWithReadings.length > 1 && (
          <span className="text-[10px] text-gray-600 tabular-nums">
            {currentIndex + 1}/{equipmentWithReadings.length}
          </span>
        )}
        
        {statusSummary.critical > 0 ? (
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="px-1.5 py-0.5 text-xs font-medium text-red-400 bg-red-500/20 rounded-full">
              {statusSummary.critical}
            </span>
          </div>
        ) : statusSummary.warning > 0 ? (
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="px-1.5 py-0.5 text-xs font-medium text-amber-400 bg-amber-500/20 rounded-full">
              {statusSummary.warning}
            </span>
          </div>
        ) : (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        )}
      </div>
    </div>
  );
};

export default TemperatureStatCardCompact;
