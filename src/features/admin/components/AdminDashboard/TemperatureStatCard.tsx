import React, { useState, useEffect, useMemo } from "react";
import { ThermometerSnowflake, Wifi, WifiOff, AlertTriangle, CheckCircle } from "lucide-react";
import { useSensorPush } from "@/hooks/useSensorPush";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { AnimatedNumber, MorphingText } from "@/shared/components/AnimatedNumber";

/**
 * =============================================================================
 * TEMPERATURE STAT CARD - Dashboard Widget
 * =============================================================================
 * 
 * PREMIUM MORPH ANIMATION:
 * Uses shared AnimatedNumber and MorphingText components for smooth transitions.
 * - Temperature numbers smoothly interpolate between values (like a luxury car)
 * - Equipment name does a subtle blur-slide morph
 * - So smooth you're genuinely not sure if it changed
 * 
 * Timing:
 * - 8 second display per item
 * - 2 second morph transition
 * - Numbers animate at 60fps during morph
 * 
 * Reference: L5-BUILD-STRATEGY.md → Premium Interaction Patterns
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
    ? "bg-blue-700/20" 
    : "bg-primary-500/20";
  
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
      <div className="flex items-center gap-4">
        {/* Icon - morphs color based on type */}
        <div 
          className={`w-12 h-12 rounded-xl flex items-center justify-center relative transition-colors duration-1000 ${iconBgClass}`}
        >
          <ThermometerSnowflake className={`w-6 h-6 transition-colors duration-1000 ${iconTextClass}`} />
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
          {/* Equipment name - morphing text */}
          <MorphingText 
            text={currentItem?.name || "Temperature Monitor"} 
            className="text-sm text-gray-400 truncate block"
          />
          
          {/* Temperature - animated number + status */}
          <div className="flex items-baseline gap-2">
            <AnimatedNumber 
              value={currentItem?.temperature ?? null} 
              suffix="°F"
              decimals={1}
              duration={2000}
              className="text-2xl font-bold text-white"
              nullText="No Data"
              nullClassName="text-lg font-medium text-gray-500"
            />
            {currentItem?.temperature !== null && (
              <span className={`transition-colors duration-500 ${getStatusIconColor(currentItem.status)}`}>
                {currentItem.status === "critical" || currentItem.status === "warning" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-col items-end gap-1">
          {equipmentWithReadings.length > 1 && (
            <div className="text-[10px] text-gray-600 tabular-nums">
              {currentIndex + 1}/{equipmentWithReadings.length}
            </div>
          )}
          
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
