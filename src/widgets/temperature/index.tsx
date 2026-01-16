/**
 * =============================================================================
 * TEMPERATURE WIDGET
 * =============================================================================
 * 
 * Three-layer widget for temperature monitoring.
 * 
 * LAYERS:
 * - Launcher (5%) → Status badge, glance at temps
 * - Review Space (80%) → View all equipment, log temps, see trends
 * - Full Feature (15%) → HACCP Manager (configuration, reports)
 * 
 * CONTEXT DIMENSIONS:
 * - SecurityLevel → Information density (Omega shows status only, Echo shows everything)
 * - Scope → Data breadth (location/region/organization)
 * - Surface → Interaction style (admin/kitchen/mobile)
 * 
 * A/B TESTING:
 * When diagnostics enabled, toggle between security levels to test visibility.
 * 
 * =============================================================================
 */

import React, { useState } from "react";
import {
  ThermometerSnowflake,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Minus,
  ClipboardCheck,
  History,
  TrendingUp as ChartIcon,
  Settings,
  X,
} from "lucide-react";

import { useVariantTesting } from "@/hooks/useVariantTesting";
import { VariantToggle } from "@/components/ui/VariantToggle";

import { WidgetContext, SecurityLevel, SECURITY_LEVEL_NAMES, STATUS_COLORS } from "../types";
import { getTemperatureVisibility, TemperatureVisibility } from "./visibility";
import { useTemperatureData, EquipmentReading } from "./useTemperatureData";

// =============================================================================
// PROPS
// =============================================================================

interface TemperatureWidgetProps {
  context: WidgetContext;
}

// =============================================================================
// MAIN WIDGET COMPONENT
// =============================================================================

export const TemperatureWidget: React.FC<TemperatureWidgetProps> = ({ context }) => {
  // A/B Testing: Security level override for testing
  // Omega (0) = Developer (highest clearance) down to Echo (5) = Team Member (lowest)
  const {
    activeVariant: testSecurityLevel,
    setVariant: setTestSecurityLevel,
    showToggle,
    variants,
  } = useVariantTesting(
    "TemperatureWidget-Security",
    ["omega", "alpha", "bravo", "charlie", "delta", "echo"] as const,
    SECURITY_LEVEL_NAMES[context.securityLevel].toLowerCase() as any
  );

  // Map variant name back to security level
  // Lower number = higher clearance: Omega (0) sees most, Echo (5) sees least
  const securityLevelMap: Record<string, SecurityLevel> = {
    omega: 0,     // Developer - highest clearance
    alpha: 1,     // Owner
    bravo: 2,     // Manager
    charlie: 3,   // Supervisor
    delta: 4,     // Shift Lead
    echo: 5,      // Team Member - lowest clearance
  };

  // Use test level if diagnostics on, otherwise use context
  const effectiveSecurityLevel: SecurityLevel = showToggle
    ? securityLevelMap[testSecurityLevel]
    : context.securityLevel;

  // Get visibility config based on effective security level
  const visibility = getTemperatureVisibility(effectiveSecurityLevel);

  // Fetch data
  const data = useTemperatureData(context);

  // Review Space state
  const [showReviewSpace, setShowReviewSpace] = useState(false);

  // Handle launcher click - ALWAYS opens Review Space first
  // Review Space is where 80% of work happens
  const handleLauncherClick = () => {
    setShowReviewSpace(true);
  };

  return (
    <div className="relative">
      {/* A/B Testing Toggle - Security Level Simulation */}
      {showToggle && (
        <div className="mb-2">
          <VariantToggle
            componentName="Security Level"
            variants={[...variants]}
            activeVariant={testSecurityLevel}
            onVariantChange={setTestSecurityLevel}
            labels={{
              omega: "Ω Omega (Dev)",
              alpha: "α Alpha (Owner)",
              bravo: "β Bravo (Mgr)",
              charlie: "χ Charlie (Sup)",
              delta: "δ Delta (Lead)",
              echo: "ε Echo (Team)",
            }}
          />
        </div>
      )}

      {/* Layer 1: Launcher */}
      <TemperatureLauncher
        data={data}
        visibility={visibility}
        onClick={handleLauncherClick}
      />

      {/* Layer 2: Review Space (Modal) */}
      {showReviewSpace && (
        <TemperatureReviewSpace
          data={data}
          visibility={visibility}
          securityLevel={effectiveSecurityLevel}
          onClose={() => setShowReviewSpace(false)}
        />
      )}
    </div>
  );
};

// =============================================================================
// LAYER 1: LAUNCHER
// =============================================================================

interface LauncherProps {
  data: ReturnType<typeof useTemperatureData>;
  visibility: TemperatureVisibility;
  onClick: () => void;
}

const TemperatureLauncher: React.FC<LauncherProps> = ({ data, visibility, onClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Cycle through equipment (pause on hover)
  React.useEffect(() => {
    if (data.equipment.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % data.equipment.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [data.equipment.length, isHovered]);

  const currentItem = data.equipment[currentIndex];
  const statusColors = STATUS_COLORS[data.overallStatus];

  // Not configured state
  if (!data.isConfigured) {
    return (
      <div className="card p-6 cursor-pointer hover:bg-gray-700/30 transition-all" onClick={onClick}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
            <ThermometerSnowflake className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Temperature</p>
            <p className="text-lg font-medium text-gray-500">Not Configured</p>
          </div>
        </div>
      </div>
    );
  }

  // No equipment state
  if (data.equipment.length === 0) {
    return (
      <div className="card p-6 cursor-pointer hover:bg-gray-700/30 transition-all" onClick={onClick}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <ThermometerSnowflake className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Temperature</p>
            <p className="text-lg font-medium text-primary-400">Add Equipment</p>
          </div>
        </div>
      </div>
    );
  }

  // Icon color by equipment type
  const iconBgClass = currentItem?.type === "freezer" ? "bg-blue-700/20" : "bg-primary-500/20";
  const iconTextClass = currentItem?.type === "freezer" ? "text-blue-400" : "text-primary-400";

  return (
    <div
      className="card p-6 cursor-pointer hover:bg-gray-700/30 transition-all relative overflow-hidden"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Progress indicator */}
      {data.equipment.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
          <div
            className="h-full bg-gray-600/50 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / data.equipment.length) * 100}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${iconBgClass} flex items-center justify-center relative`}>
          <ThermometerSnowflake className={`w-6 h-6 ${iconTextClass}`} />
          
          {/* Connection indicator (Bravo+) */}
          {visibility.showConnectionStatus && currentItem && (
            <div className="absolute -bottom-1 -right-1">
              {currentItem.isConnected ? (
                <Wifi className="w-3 h-3 text-emerald-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Equipment name (Bravo+) or generic label */}
          <p className="text-sm text-gray-400 truncate">
            {visibility.showEquipmentName && currentItem
              ? currentItem.name
              : "Temperature"}
          </p>

          {/* Temperature display based on security level */}
          <div className="flex items-center gap-2">
            {/* Omega: Status indicator only */}
            {!visibility.showTemperature && (
              <div className={`w-4 h-4 rounded-full ${statusColors.bg}`}>
                <div className={`w-full h-full rounded-full ${statusColors.icon}`} />
              </div>
            )}

            {/* Alpha+: Temperature value */}
            {visibility.showTemperature && currentItem?.temperature !== null && (
              <p className="text-2xl font-bold text-white">
                {currentItem.temperature.toFixed(1)}°F
              </p>
            )}

            {/* Alpha+: Status icon */}
            {visibility.showTemperature && (
              <span className={statusColors.icon}>
                {data.overallStatus === "critical" || data.overallStatus === "warning" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : data.overallStatus === "ok" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : null}
              </span>
            )}

            {/* Charlie+: Trend indicator */}
            {visibility.showTrend && currentItem?.trend && (
              <span className="text-gray-400">
                {currentItem.trend === "down" && <TrendingDown className="w-4 h-4" />}
                {currentItem.trend === "up" && <TrendingUp className="w-4 h-4" />}
                {currentItem.trend === "stable" && <Minus className="w-4 h-4" />}
              </span>
            )}
          </div>
        </div>

        {/* Right side: Fleet summary (Delta+) */}
        <div className="flex flex-col items-end gap-1">
          {/* Cycling indicator (always if multiple) */}
          {data.equipment.length > 1 && (
            <div className="text-xs text-gray-500">
              {currentIndex + 1}/{data.equipment.length}
            </div>
          )}

          {/* Fleet status (Delta+) */}
          {visibility.showFleetStatus && (
            <>
              {data.summary.critical > 0 ? (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="px-1.5 py-0.5 text-xs font-medium text-red-400 bg-red-500/20 rounded-full">
                    {data.summary.critical}
                  </span>
                </div>
              ) : data.summary.warning > 0 ? (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="px-1.5 py-0.5 text-xs font-medium text-amber-400 bg-amber-500/20 rounded-full">
                    {data.summary.warning}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-gray-500">{data.summary.ok}/{data.summary.total}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// LAYER 2: REVIEW SPACE
// =============================================================================

interface ReviewSpaceProps {
  data: ReturnType<typeof useTemperatureData>;
  visibility: TemperatureVisibility;
  securityLevel: SecurityLevel;
  onClose: () => void;
}

const TemperatureReviewSpace: React.FC<ReviewSpaceProps> = ({
  data,
  visibility,
  securityLevel,
  onClose,
}) => {
  const handleLogAll = () => {
    // TODO: Implement batch logging
    console.log("Log all temperatures");
  };

  const handleViewHistory = () => {
    // TODO: Navigate to history or open history modal
    console.log("View history");
  };

  const handleViewTrends = () => {
    // TODO: Navigate to trends or open trends modal
    console.log("View trends");
  };

  const handleOpenFull = () => {
    window.location.href = "/admin/haccp";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <ThermometerSnowflake className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Temperature Review</h2>
              <p className="text-xs text-gray-500">
                {data.summary.total} sensors monitored
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {data.equipment.map((eq) => (
            <EquipmentRow
              key={eq.id}
              equipment={eq}
              visibility={visibility}
            />
          ))}
        </div>

        {/* Footer: Actions */}
        <div className="p-4 border-t border-gray-700/50 space-y-3">
          {/* Primary actions */}
          <div className="flex gap-2">
            {visibility.canLog && (
              <button
                onClick={handleLogAll}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                <ClipboardCheck className="w-4 h-4" />
                Log All
              </button>
            )}
            {visibility.canViewHistory && (
              <button
                onClick={handleViewHistory}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
                History
              </button>
            )}
            {visibility.canViewTrends && (
              <button
                onClick={handleViewTrends}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <ChartIcon className="w-4 h-4" />
                Trends
              </button>
            )}
          </div>

          {/* Launch to full feature (Delta+) */}
          {visibility.canLaunchFull && (
            <button
              onClick={handleOpenFull}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Open HACCP Manager →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// EQUIPMENT ROW (Review Space)
// =============================================================================

interface EquipmentRowProps {
  equipment: EquipmentReading;
  visibility: TemperatureVisibility;
}

const EquipmentRow: React.FC<EquipmentRowProps> = ({ equipment, visibility }) => {
  const statusColors = STATUS_COLORS[equipment.status];
  const iconBgClass = equipment.type === "freezer" ? "bg-blue-700/20" : "bg-primary-500/20";
  const iconTextClass = equipment.type === "freezer" ? "text-blue-400" : "text-primary-400";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg ${iconBgClass} flex items-center justify-center`}>
        <ThermometerSnowflake className={`w-4 h-4 ${iconTextClass}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {visibility.showEquipmentName && (
          <p className="text-sm font-medium text-white truncate">{equipment.name}</p>
        )}
        
        {/* Thresholds (Delta+) */}
        {visibility.showThresholds && (
          <p className="text-xs text-gray-500">
            Range: {equipment.thresholdMin}°F – {equipment.thresholdMax}°F
          </p>
        )}
      </div>

      {/* Temperature + Status */}
      <div className="flex items-center gap-2">
        {/* Trend (Charlie+) */}
        {visibility.showTrend && equipment.trend && (
          <span className="text-gray-400">
            {equipment.trend === "down" && <TrendingDown className="w-3 h-3" />}
            {equipment.trend === "up" && <TrendingUp className="w-3 h-3" />}
          </span>
        )}

        {/* Temperature */}
        {visibility.showTemperature && equipment.temperature !== null ? (
          <span className="text-lg font-bold text-white">
            {equipment.temperature.toFixed(1)}°F
          </span>
        ) : (
          <span className="text-gray-500">--</span>
        )}

        {/* Status indicator */}
        <span className={statusColors.icon}>
          {equipment.status === "critical" || equipment.status === "warning" ? (
            <AlertTriangle className="w-4 h-4" />
          ) : equipment.status === "ok" ? (
            <CheckCircle className="w-4 h-4" />
          ) : equipment.status === "offline" ? (
            <WifiOff className="w-4 h-4" />
          ) : null}
        </span>
      </div>

      {/* Connection indicator */}
      {visibility.showConnectionStatus && (
        <div className="ml-1">
          {equipment.isConnected ? (
            <Wifi className="w-3 h-3 text-emerald-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-500" />
          )}
        </div>
      )}
    </div>
  );
};

export default TemperatureWidget;
