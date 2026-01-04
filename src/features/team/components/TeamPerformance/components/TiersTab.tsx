import React, { useState } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { 
  Star, 
  Users, 
  TrendingDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TeamMemberCard } from "@/features/team/components/TeamMemberCard";
import { AddPointEventModal } from "./AddPointEventModal";
import { AddPointReductionModal } from "./AddPointReductionModal";
import type { PerformanceTier } from "@/features/team/types";

interface TierConfig {
  tier: PerformanceTier;
  label: string;
  description: string;
  pointRange: string;
  icon: React.ElementType;
  benefits: string[];
}

export const TiersTab: React.FC = () => {
  const { teamPerformance, config } = usePerformanceStore();
  const performanceArray = Array.from(teamPerformance.values());

  // Modal state
  const [eventModalMember, setEventModalMember] = useState<string | null>(null);
  const [reductionModalMember, setReductionModalMember] = useState<string | null>(null);
  
  // Collapsed state for tiers
  const [collapsedTiers, setCollapsedTiers] = useState<Set<number>>(new Set());

  const toggleTier = (tier: number) => {
    const next = new Set(collapsedTiers);
    if (next.has(tier)) {
      next.delete(tier);
    } else {
      next.add(tier);
    }
    setCollapsedTiers(next);
  };

  // Tier configurations - muted, clean
  const tierConfigs: TierConfig[] = [
    {
      tier: 1,
      label: "Excellence",
      description: "Outstanding attendance and professional conduct",
      pointRange: `0–${config.tier_thresholds.tier1_max} points`,
      icon: Star,
      benefits: ["Priority scheduling", "Enhanced benefits", "$25 meal comp"],
    },
    {
      tier: 2,
      label: "Strong Performance",
      description: "Maintaining solid professional standards",
      pointRange: `${config.tier_thresholds.tier1_max + 1}–${config.tier_thresholds.tier2_max} points`,
      icon: Users,
      benefits: ["Standard scheduling", "50% meal discount"],
    },
    {
      tier: 3,
      label: "Improvement Focus",
      description: "Working with structured support to improve",
      pointRange: `${config.tier_thresholds.tier2_max + 1}+ points`,
      icon: TrendingDown,
      benefits: ["Operational scheduling", "Coaching support"],
    },
  ];

  // Group members by tier
  const membersByTier = tierConfigs.map(tierConfig => ({
    ...tierConfig,
    members: performanceArray
      .filter(p => p.tier === tierConfig.tier)
      .sort((a, b) => a.current_points - b.current_points),
  }));

  return (
    <div className="space-y-4">
      {membersByTier.map((tier) => {
        const isCollapsed = collapsedTiers.has(tier.tier);
        const hasMembers = tier.members.length > 0;
        
        return (
          <div 
            key={tier.tier}
            className="bg-gray-800/30 rounded-lg border border-gray-700/50"
          >
            {/* Tier Header - clickable to collapse */}
            <button
              onClick={() => toggleTier(tier.tier)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
                  <tier.icon className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">
                      Tier {tier.tier} — {tier.label}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/50 text-gray-400">
                      {tier.members.length}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{tier.pointRange}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Benefits - hidden on mobile */}
                <div className="hidden sm:flex items-center gap-2">
                  {tier.benefits.map((benefit, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-700/30 rounded"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
                
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>

            {/* Members Grid - collapsible */}
            {!isCollapsed && (
              <div className="p-4 pt-0">
                {hasMembers ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tier.members.map((member) => (
                      <TeamMemberCard
                        key={member.team_member_id}
                        member={member.team_member}
                        variant="performance"
                        points={member.current_points}
                        tier={member.tier}
                        coachingStage={member.coaching_stage}
                        onAddEvent={() => setEventModalMember(member.team_member_id)}
                        onAddReduction={() => setReductionModalMember(member.team_member_id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-gray-600">
                    No team members in this tier
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty State */}
      {performanceArray.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/30 mb-4">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Team Members</h3>
          <p className="text-gray-500 text-sm">
            Add team members to The Roster to see tier distribution.
          </p>
        </div>
      )}

      {/* Modals */}
      {eventModalMember && (
        <AddPointEventModal
          memberId={eventModalMember}
          isOpen={!!eventModalMember}
          onClose={() => setEventModalMember(null)}
        />
      )}

      {reductionModalMember && (
        <AddPointReductionModal
          memberId={reductionModalMember}
          isOpen={!!reductionModalMember}
          onClose={() => setReductionModalMember(null)}
        />
      )}
    </div>
  );
};

export default TiersTab;
