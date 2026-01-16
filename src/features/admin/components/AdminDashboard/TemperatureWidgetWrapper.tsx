/**
 * =============================================================================
 * TEMPERATURE WIDGET WRAPPER
 * =============================================================================
 * 
 * A/B test wrapper to compare:
 * - "legacy": Original TemperatureStatCard
 * - "widget": New three-layer TemperatureWidget architecture
 * 
 * This is the WATERSHED TEST for the widget architecture.
 * 
 * =============================================================================
 */

import React from "react";
import { useVariantTesting } from "@/hooks/useVariantTesting";
import { VariantToggle } from "@/components/ui/VariantToggle";
import { useAuth } from "@/hooks/useAuth";

// Legacy implementation
import { TemperatureStatCard } from "./TemperatureStatCard";

// New widget architecture
import { TemperatureWidget, WidgetContext, SecurityLevel } from "@/widgets";

export const TemperatureWidgetWrapper: React.FC = () => {
  const { organization, user } = useAuth();

  // A/B test: Legacy vs Widget architecture
  const {
    activeVariant,
    setVariant,
    showToggle,
    variants,
  } = useVariantTesting(
    "TemperatureWidget-Architecture",
    ["legacy", "widget"] as const,
    "legacy" // Default to legacy until widget is proven
  );

  // Build widget context from auth
  const widgetContext: WidgetContext = {
    securityLevel: (user?.security_level ?? 1) as SecurityLevel,
    userId: user?.id ?? "",
    scope: "location",
    organizationId: organization?.id ?? "",
    locationId: undefined, // Will use org-level for now
    surface: "admin",
  };

  return (
    <div>
      {/* Architecture toggle - only when diagnostics enabled */}
      {showToggle && (
        <div className="mb-2">
          <VariantToggle
            componentName="Temp Widget"
            variants={[...variants]}
            activeVariant={activeVariant}
            onVariantChange={setVariant}
            labels={{
              legacy: "Legacy Card",
              widget: "New Widget",
            }}
          />
        </div>
      )}

      {/* Render active variant */}
      {activeVariant === "widget" ? (
        <TemperatureWidget context={widgetContext} />
      ) : (
        <TemperatureStatCard />
      )}
    </div>
  );
};

export default TemperatureWidgetWrapper;
