import React, { useState } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useAuth } from "@/hooks/useAuth";
import { nexus } from "@/lib/nexus";
import { X, AlertTriangle, ShieldAlert } from "lucide-react";
import type { PointReductionType } from "@/features/team/types";

const REDUCTION_TYPE_LABELS: Record<PointReductionType, string> = {
  cover_shift_urgent: "Covered Shift (<24hr)",
  cover_shift_standard: "Covered Shift (24-48hr)",
  stay_late: "Stayed 2+ Hours Late",
  arrive_early: "Arrived 2+ Hours Early",
  training_mentoring: "Training/Mentoring",
  special_event: "Special Event/Catering",
};

// Security levels that can override limits
const OVERRIDE_SECURITY_LEVELS = [0, 1, 2];

interface AddPointReductionModalProps {
  memberId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddPointReductionModal: React.FC<AddPointReductionModalProps> = ({
  memberId,
  isOpen,
  onClose,
}) => {
  const { config, addPointReduction, teamPerformance, getReductionsInLast30Days } = usePerformanceStore();
  const { user, organizationId, securityLevel } = useAuth();
  
  const [selectedReductionType, setSelectedReductionType] = useState<PointReductionType | null>(null);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  const member = teamPerformance.get(memberId);
  const reductionsUsed = Math.abs(getReductionsInLast30Days(memberId));
  const reductionsRemaining = config.max_reduction_per_30_days - reductionsUsed;
  const isOverLimit = reductionsRemaining <= 0;
  const canOverride = OVERRIDE_SECURITY_LEVELS.includes(securityLevel);

  const handleSubmit = async () => {
    if (!selectedReductionType) return;
    if (isOverLimit && !overrideConfirmed) return;
    
    setIsSubmitting(true);
    try {
      // Log override to NEXUS if applicable
      if (isOverLimit && overrideConfirmed && organizationId && user) {
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'performance_reduction_limit_override',
          details: {
            team_member_id: memberId,
            name: member ? `${member.team_member.first_name} ${member.team_member.last_name}` : 'Unknown',
            configured_limit: config.max_reduction_per_30_days,
            current_usage: reductionsUsed,
            reduction_type: selectedReductionType,
            reduction_points: config.reduction_values[selectedReductionType],
          },
        });
      }
      
      await addPointReduction(memberId, selectedReductionType, notes, eventDate);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1f2b] rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-medium text-white">Add Point Reduction</h3>
            {member && (
              <p className="text-sm text-gray-400">
                {member.team_member.first_name} {member.team_member.last_name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Reduction Limit Info - L5 muted style */}
          {reductionsUsed > 0 && (
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isOverLimit ? 'text-amber-400' : 'text-gray-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    {isOverLimit 
                      ? `Limit reached: ${reductionsUsed} of ${config.max_reduction_per_30_days} points used this 30-day period`
                      : `${reductionsUsed} of ${config.max_reduction_per_30_days} point reduction used this 30-day period`
                    }
                  </p>
                  {isOverLimit && canOverride && (
                    <p className="text-xs text-gray-500 mt-1">
                      Managers can override this limit when necessary
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manager Override Checkbox */}
          {isOverLimit && canOverride && (
            <label className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700/30 cursor-pointer hover:bg-gray-800/50 transition-colors">
              <input
                type="checkbox"
                checked={overrideConfirmed}
                onChange={(e) => setOverrideConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500/50"
              />
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-white">Override limit</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This action will be logged for audit purposes
                </p>
              </div>
            </label>
          )}

          {/* Reduction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Reduction Type</label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(REDUCTION_TYPE_LABELS) as PointReductionType[]).map((type) => {
                const isDisabled = isOverLimit && !overrideConfirmed;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedReductionType(type)}
                    disabled={isDisabled}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      selectedReductionType === type
                        ? 'border-primary-500 bg-primary-500/10'
                        : isDisabled
                          ? 'border-gray-700/50 opacity-50 cursor-not-allowed'
                          : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-sm text-white">{REDUCTION_TYPE_LABELS[type]}</span>
                    <span className="text-sm font-medium text-green-400">{config.reduction_values[type]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remaining Allowance */}
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Reduction allowance remaining</span>
              <span className={`font-medium ${
                isOverLimit ? 'text-amber-400' : 'text-white'
              }`}>
                {reductionsRemaining} points
              </span>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Event Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              disabled={isOverLimit && !overrideConfirmed}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context..."
              rows={2}
              disabled={isOverLimit && !overrideConfirmed}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 disabled:opacity-50"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReductionType || isSubmitting || (isOverLimit && !overrideConfirmed)}
            className="btn-primary"
          >
            {isSubmitting ? 'Adding...' : isOverLimit && overrideConfirmed ? 'Add (Override)' : 'Add Reduction'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPointReductionModal;
