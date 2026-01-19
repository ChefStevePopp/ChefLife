import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * =============================================================================
 * PRICE STATS ZONE
 * =============================================================================
 * Stats zone for Price Watch / BOH Vitals context.
 * Shows: Current price, % change, trend indicator
 * =============================================================================
 */

export interface PriceStatsZoneProps {
  price: number;
  unit?: string;
  changePercent?: number;
}

export const PriceStatsZone: React.FC<PriceStatsZoneProps> = ({
  price,
  unit = "",
  changePercent = 0,
}) => {
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;
  const isStable = changePercent === 0;

  return (
    <div className="space-y-2">
      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold text-white tabular-nums">
          ${price.toFixed(2)}
        </span>
        {unit && (
          <span className="text-xs text-gray-500">/ {unit}</span>
        )}
      </div>

      {/* Change indicator */}
      <div className="flex items-center gap-1.5">
        {isUp && (
          <>
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20">
              <TrendingUp className="w-3 h-3 text-rose-400" />
            </div>
            <span className="text-sm font-semibold text-rose-400 tabular-nums">
              +{changePercent.toFixed(1)}%
            </span>
          </>
        )}
        {isDown && (
          <>
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20">
              <TrendingDown className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">
              {changePercent.toFixed(1)}%
            </span>
          </>
        )}
        {isStable && (
          <>
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-700/50">
              <Minus className="w-3 h-3 text-gray-500" />
            </div>
            <span className="text-sm text-gray-500">Stable</span>
          </>
        )}
      </div>
    </div>
  );
};

export default PriceStatsZone;
