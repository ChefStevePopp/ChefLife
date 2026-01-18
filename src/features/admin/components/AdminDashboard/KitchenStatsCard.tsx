import React from "react";
import {
  Thermometer,
  FileText,
  ClipboardList,
  CookingPot,
  LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/shared/components/AnimatedNumber";

/**
 * =============================================================================
 * KITCHEN STATS CARD - Dashboard Widget
 * =============================================================================
 * 
 * Matches the visual style of TemperatureStatCard for visual harmony.
 * Uses the same .card styling, icon proportions, and AnimatedNumber component.
 * 
 * Layout: 2x2 grid of stats matching temp widget's premium feel.
 * 
 * Reference: TemperatureStatCard.tsx, L5-BUILD-STRATEGY.md
 * =============================================================================
 */

interface KitchenStat {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  onClick?: () => void;
}

interface KitchenStatsCardProps {
  stats?: KitchenStat[];
}

export const KitchenStatsCard: React.FC<KitchenStatsCardProps> = ({ stats }) => {
  // Default stats if none provided
  const defaultStats: KitchenStat[] = [
    {
      icon: Thermometer,
      label: "HACCP",
      value: 0,
      suffix: " flags",
      decimals: 0,
    },
    {
      icon: FileText,
      label: "Recipes",
      value: 2,
      suffix: " new",
      decimals: 0,
    },
    {
      icon: ClipboardList,
      label: "Tasks",
      value: 15,
      suffix: " pending",
      decimals: 0,
    },
    {
      icon: CookingPot,
      label: "Prep",
      value: 85,
      suffix: "%",
      decimals: 0,
    },
  ];

  const displayStats = stats || defaultStats;

  return (
    <div className="card p-4 h-full">
      <div className="grid grid-cols-2 gap-3 h-full">
        {displayStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/30 transition-colors cursor-pointer"
              onClick={stat.onClick}
            >
              {/* Icon - 70% ratio: w-10 container → w-6 icon */}
              <div className="w-10 h-10 rounded-xl bg-gray-700/40 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-gray-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                  {stat.label}
                </div>
                <div className="flex items-baseline">
                  <AnimatedNumber
                    value={stat.value}
                    decimals={stat.decimals ?? 0}
                    duration={1500}
                    className="text-xl font-bold text-white"
                  />
                  {stat.suffix && (
                    <span className="text-sm text-gray-500 ml-0.5">{stat.suffix}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenStatsCard;
