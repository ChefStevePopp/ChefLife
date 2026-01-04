import React from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Star,
  ChevronRight,
} from "lucide-react";
import type { TeamMemberPerformance } from "@/features/team/types";

export const OverviewTab: React.FC = () => {
  const { teamPerformance, config } = usePerformanceStore();
  const performanceArray = Array.from(teamPerformance.values());

  // Calculate tier distribution
  const tierCounts = {
    tier1: performanceArray.filter(p => p.tier === 1).length,
    tier2: performanceArray.filter(p => p.tier === 2).length,
    tier3: performanceArray.filter(p => p.tier === 3).length,
  };

  const totalMembers = performanceArray.length;

  // Find attention needed
  const attentionNeeded = performanceArray
    .filter(p => p.coaching_stage && p.coaching_stage >= 1)
    .sort((a, b) => (b.current_points || 0) - (a.current_points || 0));

  // Find approaching tier changes (within 1 point of threshold)
  const approachingTierChange = performanceArray.filter(p => {
    if (p.tier === 1 && p.current_points === config.tier_thresholds.tier1_max) return true;
    if (p.tier === 2 && p.current_points === config.tier_thresholds.tier2_max) return true;
    return false;
  });

  // Get coaching stage label
  const getCoachingStageLabel = (stage: number) => {
    switch (stage) {
      case 1: return "Informal Coaching";
      case 2: return "Formal Coaching";
      case 3: return "Final Professional Dev";
      case 4: return "Employment Review";
      case 5: return "Automatic Termination";
      default: return "";
    }
  };

  // Get tier color classes
  const getTierColors = (tier: 1 | 2 | 3) => {
    switch (tier) {
      case 1: return { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", bar: "bg-green-500" };
      case 2: return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", bar: "bg-amber-500" };
      case 3: return { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", bar: "bg-rose-500" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Tier Distribution */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          Team Health at a Glance
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tier 1 */}
          <div className={`p-4 rounded-lg border ${getTierColors(1).bg} ${getTierColors(1).border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Star className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-green-400">Tier 1</div>
                  <div className="text-xs text-gray-500">Excellence</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-400">{tierCounts.tier1}</div>
            </div>
            <div className="text-xs text-gray-500 mb-2">0-{config.tier_thresholds.tier1_max} points</div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${totalMembers > 0 ? (tierCounts.tier1 / totalMembers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Tier 2 */}
          <div className={`p-4 rounded-lg border ${getTierColors(2).bg} ${getTierColors(2).border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-amber-400">Tier 2</div>
                  <div className="text-xs text-gray-500">Strong Performance</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-400">{tierCounts.tier2}</div>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {config.tier_thresholds.tier1_max + 1}-{config.tier_thresholds.tier2_max} points
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${totalMembers > 0 ? (tierCounts.tier2 / totalMembers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Tier 3 */}
          <div className={`p-4 rounded-lg border ${getTierColors(3).bg} ${getTierColors(3).border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-rose-400">Tier 3</div>
                  <div className="text-xs text-gray-500">Improvement Focus</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-400">{tierCounts.tier3}</div>
            </div>
            <div className="text-xs text-gray-500 mb-2">{config.tier_thresholds.tier2_max + 1}+ points</div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${totalMembers > 0 ? (tierCounts.tier3 / totalMembers) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attention Needed */}
      {attentionNeeded.length > 0 && (
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-medium text-white">Attention Needed</h3>
          </div>
          <div className="space-y-2">
            {attentionNeeded.map((member) => (
              <div 
                key={member.team_member_id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {member.team_member.first_name?.[0]}{member.team_member.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {member.team_member.first_name} {member.team_member.last_name?.[0]}.
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.current_points} points • Stage {member.coaching_stage}: {getCoachingStageLabel(member.coaching_stage!)}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approaching Tier Change */}
      {approachingTierChange.length > 0 && (
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-medium text-white">Approaching Tier Change</h3>
            <span className="text-xs text-gray-500">({approachingTierChange.length} team members)</span>
          </div>
          <div className="space-y-2">
            {approachingTierChange.map((member) => (
              <div 
                key={member.team_member_id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {member.team_member.first_name?.[0]}{member.team_member.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {member.team_member.first_name} {member.team_member.last_name?.[0]}.
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.current_points} points — 1 point from Tier {member.tier + 1}
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getTierColors(member.tier).bg} ${getTierColors(member.tier).text}`}>
                  Tier {member.tier}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {performanceArray.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
            <Users className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Team Members</h3>
          <p className="text-gray-400 text-sm">
            Add team members to The Roster to start tracking performance.
          </p>
        </div>
      )}

      {/* All Good State */}
      {performanceArray.length > 0 && attentionNeeded.length === 0 && approachingTierChange.length === 0 && (
        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-green-400">Team is Looking Good!</div>
              <div className="text-xs text-gray-400">
                No team members require immediate attention. Keep up the great work!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
