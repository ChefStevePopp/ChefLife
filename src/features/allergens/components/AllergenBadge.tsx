import React from "react";
import * as Icons from "lucide-react";
import { ALLERGENS, SEVERITY_COLORS } from "../constants";
import type { AllergenType } from "../types";

interface AllergenBadgeProps {
  type: AllergenType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  disableTooltip?: boolean;
  className?: string;
}

export const AllergenBadge: React.FC<AllergenBadgeProps> = ({
  type,
  size = "md",
  showLabel = false,
  disableTooltip = false,
  className = "",
}) => {
  const allergen = ALLERGENS[type];

  // =========================================================================
  // CUSTOM ALLERGEN FALLBACK
  // =========================================================================
  // Custom allergens from master ingredient fields (allergen_custom1_name etc)
  // flow through the cascade as lowercase strings (e.g. "wine"). They won't
  // exist in the ALLERGENS constant. Rather than returning null and silently
  // dropping them, we render a fallback badge with the raw type name.
  // =========================================================================
  const isCustom = !allergen;
  const customLabel = isCustom
    ? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
    : '';

  const Icon = isCustom
    ? Icons.AlertTriangle
    : Icons[allergen.icon as keyof typeof Icons];
  if (!Icon) return null;

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const badgeColor = isCustom ? 'violet' : allergen.color;
  const badgeLabel = isCustom ? customLabel : allergen.label;
  const badgeSeverity = isCustom ? 'medium' : allergen.severity;
  const severityColor = SEVERITY_COLORS[badgeSeverity];
  const badgeDescription = isCustom
    ? 'Custom allergen from ingredient data'
    : allergen.description;

  return (
    <div className={`group relative inline-flex items-center ${className}`}>
      {/* Badge Circle */}
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full
          flex items-center justify-center
          bg-${badgeColor}-500/20
          text-${badgeColor}-400
          transition-transform
          hover:scale-110
          cursor-help
        `}
        role="img"
        aria-label={`${badgeLabel} allergen indicator`}
      >
        <Icon
          className={size === "sm" ? "w-4 h-4" : "w-5 h-5"}
          aria-hidden="true"
        />
      </div>

      {/* Optional Label */}
      {showLabel && (
        <span className="ml-2 text-sm text-gray-300">{badgeLabel}</span>
      )}

      {/* Tooltip - only if not disabled */}
      {!disableTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded bg-gray-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
          role="tooltip"
        >
          <div className="font-medium mb-1 flex items-center gap-2">
            {badgeLabel}
            {isCustom && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-violet-500/20 text-violet-400">
                custom
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs bg-${severityColor}-500/20 text-${severityColor}-400`}
            >
              {badgeSeverity}
            </span>
          </div>
          <p className="text-gray-300 text-xs">{badgeDescription}</p>
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-gray-800"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
};
