import React from "react";

/**
 * =============================================================================
 * CUSTOM TOOLTIP
 * =============================================================================
 * Custom tooltip for Recharts with change indicator.
 * =============================================================================
 */

interface TooltipPayloadItem {
  color: string;
  name: string;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const date = new Date(label || 0).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const hasChange = (payload[0] as any)?.payload?.hasChange;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs text-gray-400">{date}</p>
        {hasChange === false && (
          <span className="text-2xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-500">
            no change
          </span>
        )}
      </div>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300">{entry.name}</span>
          </div>
          <span className="font-medium text-white">${entry.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};
