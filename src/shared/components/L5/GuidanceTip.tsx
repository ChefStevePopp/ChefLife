import React from "react";
import { Sparkles } from "lucide-react";
import { useGuidedMode } from "./GuidedModeContext";

/**
 * =============================================================================
 * GUIDANCE TIP - Contextual Help Banner
 * =============================================================================
 * Shows helpful tips/guidance when guided mode is enabled.
 * Hidden when guided mode is off.
 * 
 * Usage:
 *   <GuidanceTip>
 *     Look at your vendor invoice for this item...
 *   </GuidanceTip>
 * 
 *   <GuidanceTip color="amber">
 *     Warning: This field affects cost calculations...
 *   </GuidanceTip>
 * =============================================================================
 */

interface GuidanceTipProps {
  children: React.ReactNode;
  color?: "green" | "amber" | "blue" | "rose";
}

const colorClasses = {
  green: {
    bg: "bg-green-500/10 border-green-500/20",
    icon: "text-green-400",
  },
  amber: {
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: "text-amber-400",
  },
  blue: {
    bg: "bg-primary-500/10 border-primary-500/20",
    icon: "text-primary-400",
  },
  rose: {
    bg: "bg-rose-500/10 border-rose-500/20",
    icon: "text-rose-400",
  },
};

export const GuidanceTip: React.FC<GuidanceTipProps> = ({
  children,
  color = "blue",
}) => {
  const { isGuided } = useGuidedMode();

  if (!isGuided) return null;

  const colors = colorClasses[color];

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${colors.bg} mb-4`}
    >
      <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.icon}`} />
      <p className="text-sm text-gray-300">{children}</p>
    </div>
  );
};

export default GuidanceTip;
