import React, { useState, useMemo } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { 
  Search, 
  Plus, 
  Minus, 
  Calendar,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";
import { AddPointEventModal } from "./AddPointEventModal";
import { AddPointReductionModal } from "./AddPointReductionModal";
import type { TeamMemberPerformance } from "@/features/team/types";

// Event type labels
const EVENT_TYPE_LABELS: Record<string, string> = {
  no_call_no_show: "No-call/No-show",
  dropped_shift_no_coverage: "Dropped Shift (No Coverage)",
  unexcused_absence: "Unexcused Absence",
  tardiness_major: "Tardiness (>15 min)",
  tardiness_minor: "Tardiness (5-15 min)",
  early_departure: "Early Departure",
  late_notification: "Late Notification",
  food_safety_violation: "Food Safety Violation",
  insubordination: "Insubordination",
};

const REDUCTION_TYPE_LABELS: Record<string, string> = {
  cover_shift_urgent: "Covered Shift (<24hr)",
  cover_shift_standard: "Covered Shift (24-48hr)",
  stay_late: "Stayed 2+ Hours Late",
  arrive_early: "Arrived 2+ Hours Early",
  training_mentoring: "Training/Mentoring",
  special_event: "Special Event/Catering",
};

export const PointsTab: React.FC = () => {
  const { 
    teamPerformance, 
    config, 
    getReductionsInLast30Days,
  } = usePerformanceStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddReductionModal, setShowAddReductionModal] = useState(false);

  const performanceArray = Array.from(teamPerformance.values());

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return performanceArray;
    const query = searchQuery.toLowerCase();
    return performanceArray.filter(p => 
      p.team_member.first_name?.toLowerCase().includes(query) ||
      p.team_member.last_name?.toLowerCase().includes(query) ||
      p.team_member.email?.toLowerCase().includes(query)
    );
  }, [performanceArray, searchQuery]);

  // Get selected member
  const selectedMember = selectedMemberId 
    ? teamPerformance.get(selectedMemberId) 
    : null;

  // Get tier color
  const getTierColor = (tier: 1 | 2 | 3) => {
    switch (tier) {
      case 1: return "text-green-400 bg-green-500/20";
      case 2: return "text-amber-400 bg-amber-500/20";
      case 3: return "text-rose-400 bg-rose-500/20";
    }
  };

  // Get reductions info
  const reductionsUsed = selectedMemberId ? Math.abs(getReductionsInLast30Days(selectedMemberId)) : 0;
  const reductionsRemaining = config.max_reduction_per_30_days - reductionsUsed;

  return (
    <div className="space-y-6">
      {/* Member Selector */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search team member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>

        {/* Cycle Selector (future enhancement) */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-300">Current Cycle</span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
      </div>

      {/* Member Cards / Selection */}
      {!selectedMemberId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMembers.map((member) => (
            <button
              key={member.team_member_id}
              onClick={() => setSelectedMemberId(member.team_member_id)}
              className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30 hover:border-primary-500/50 hover:bg-gray-800/50 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                    {member.team_member.avatar_url ? (
                      <img 
                        src={member.team_member.avatar_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.team_member.email || member.team_member_id}`}
                        alt=""
                        className="w-full h-full"
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {member.team_member.first_name} {member.team_member.last_name}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTierColor(member.tier)}`}>
                  Tier {member.tier}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Current Points</span>
                <span className="text-lg font-bold text-white">{member.current_points}</span>
              </div>
              <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    member.tier === 1 ? 'bg-green-500' :
                    member.tier === 2 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, (member.current_points / 15) * 100)}%` }}
                />
              </div>
            </button>
          ))}

          {filteredMembers.length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">No team members found</p>
            </div>
          )}
        </div>
      ) : (
        /* Selected Member Detail View */
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedMemberId(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                  {selectedMember?.team_member.avatar_url ? (
                    <img 
                      src={selectedMember.team_member.avatar_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember?.team_member.email || selectedMemberId}`}
                      alt=""
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div>
                  <div className="text-lg font-medium text-white">
                    {selectedMember?.team_member.first_name} {selectedMember?.team_member.last_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTierColor(selectedMember?.tier || 1)}`}>
                      Tier {selectedMember?.tier}
                    </span>
                    <span className="text-sm text-gray-500">
                      {selectedMember?.current_points} points
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddReductionModal(true)}
                className="btn-ghost text-sm"
                disabled={reductionsRemaining <= 0}
              >
                <Minus className="w-4 h-4 mr-1" />
                Add Reduction
              </button>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="btn-primary text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Event
              </button>
            </div>
          </div>

          {/* Reduction Limit Warning */}
          {reductionsRemaining < config.max_reduction_per_30_days && (
            <div className={`p-3 rounded-lg border ${
              reductionsRemaining <= 0 
                ? 'bg-rose-500/10 border-rose-500/30' 
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${reductionsRemaining <= 0 ? 'text-rose-400' : 'text-amber-400'}`} />
                <span className={`text-sm ${reductionsRemaining <= 0 ? 'text-rose-300' : 'text-amber-300'}`}>
                  {reductionsRemaining <= 0 
                    ? `Maximum ${config.max_reduction_per_30_days} point reduction per 30 days reached`
                    : `${reductionsUsed} of ${config.max_reduction_per_30_days} point reduction used this 30-day period`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Point Ledger */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/30">
              <h4 className="text-sm font-medium text-white">Point Ledger</h4>
            </div>
            
            {selectedMember?.events && selectedMember.events.length > 0 ? (
              <div className="divide-y divide-gray-700/30">
                {[...selectedMember.events].reverse().map((entry, idx) => {
                  const isReduction = 'reduction_type' in entry;
                  return (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isReduction ? 'bg-green-500/20' : 'bg-rose-500/20'
                        }`}>
                          {isReduction 
                            ? <CheckCircle className="w-4 h-4 text-green-400" />
                            : <AlertTriangle className="w-4 h-4 text-rose-400" />
                          }
                        </div>
                        <div>
                          <div className="text-sm text-white">
                            {isReduction 
                              ? REDUCTION_TYPE_LABELS[(entry as any).reduction_type]
                              : EVENT_TYPE_LABELS[(entry as any).event_type]
                            }
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {new Date(entry.event_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            {entry.notes && <span>• {entry.notes}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-medium ${
                          entry.points > 0 ? 'text-rose-400' : 'text-green-400'
                        }`}>
                          {entry.points > 0 ? '+' : ''}{entry.points}
                        </span>
                        <span className="text-sm text-gray-500 w-12 text-right">
                          = {entry.running_balance}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No events recorded this cycle</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedMemberId && (
        <>
          <AddPointEventModal
            memberId={selectedMemberId}
            isOpen={showAddEventModal}
            onClose={() => setShowAddEventModal(false)}
          />
          <AddPointReductionModal
            memberId={selectedMemberId}
            isOpen={showAddReductionModal}
            onClose={() => setShowAddReductionModal(false)}
          />
        </>
      )}
    </div>
  );
};

export default PointsTab;
