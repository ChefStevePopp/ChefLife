import React from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Star,
  ChevronRight,
  BarChart3,
} from "lucide-react";

export const OverviewTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
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

  return (
    <div className="space-y-6">
      {showDiagnostics && <div className="text-xs text-gray-500 font-mono">src/features/team/components/TeamPerformance/components/OverviewTab.tsx</div>}
      {/* Tier Distribution - L5: Colored icon badge only */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-5">
        {/* Section Header - L5 style */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Team Health</h3>
            <p className="text-xs text-gray-500">Distribution across performance tiers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tier 1 */}
          <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-700/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Star className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Tier 1</div>
                  <div className="text-xs text-gray-500">Excellence</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{tierCounts.tier1}</div>
            </div>
            <div className="text-xs text-gray-500 mb-2">0–{config.tier_thresholds.tier1_max} points</div>
            <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500/50 transition-all duration-500"
                style={{ width: `${totalMembers > 0 ? (tierCounts.tier1 / totalMembers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Tier 2 */}
          <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-700/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Tier 2</div>
                  <div className="text-xs text-gray-500">Strong</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{tierCounts.tier2}</div>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {config.tier_thresholds.tier1_max + 1}–{config.tier_thresholds.tier2_max} points
            </div>
            <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500/50 transition-all duration-500"
                style={{ width: `${totalMembers > 0 ? (tierCounts.tier2 / totalMembers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Tier 3 */}
          <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-700/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Tier 3</div>
                  <div className="text-xs text-gray-500">Focus</div>
                </div>
              </div>
              <div className={`text-2xl font-bold ${tierCounts.tier3 > 0 ? 'text-rose-400' : 'text-white'}`}>
                {tierCounts.tier3}
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-2">{config.tier_thresholds.tier2_max + 1}+ points</div>
            <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500/50 transition-all duration-500"
                style={{ width: `${totalMembers > 0 ? (tierCounts.tier3 / totalMembers) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attention Needed */}
      {attentionNeeded.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-5">
          {/* Section Header - L5 style */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Needs Attention</h3>
              <p className="text-xs text-gray-500">{attentionNeeded.length} team member{attentionNeeded.length !== 1 ? 's' : ''} in coaching</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {attentionNeeded.map((member) => (
              <div 
                key={member.team_member_id}
                className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg hover:bg-gray-700/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-300">
                      {member.team_member.first_name?.[0]}{member.team_member.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {member.team_member.first_name} {member.team_member.last_name?.[0]}.
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.current_points} pts • Stage {member.coaching_stage}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approaching Tier Change */}
      {approachingTierChange.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-5">
          {/* Section Header - L5 style */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gray-700/50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Approaching Tier Change</h3>
              <p className="text-xs text-gray-500">{approachingTierChange.length} team member{approachingTierChange.length !== 1 ? 's' : ''} at threshold</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {approachingTierChange.map((member) => (
              <div 
                key={member.team_member_id}
                className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-300">
                      {member.team_member.first_name?.[0]}{member.team_member.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {member.team_member.first_name} {member.team_member.last_name?.[0]}.
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.current_points} pts — 1 point from Tier {member.tier + 1}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-400">
                  Tier {member.tier}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {performanceArray.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Team Members</h3>
          <p className="text-gray-500 text-sm">
            Add team members to The Roster to start tracking performance.
          </p>
        </div>
      )}

      {/* All Good State */}
      {performanceArray.length > 0 && attentionNeeded.length === 0 && approachingTierChange.length === 0 && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Team is Looking Good</div>
              <div className="text-xs text-gray-500">
                No team members require immediate attention
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
