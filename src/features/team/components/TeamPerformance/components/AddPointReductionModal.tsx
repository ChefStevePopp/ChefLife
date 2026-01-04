import React, { useState } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { X, AlertTriangle } from "lucide-react";
import type { PointReductionType } from "@/features/team/types";

const REDUCTION_TYPE_LABELS: Record<PointReductionType, string> = {
  cover_shift_urgent: "Covered Shift (<24hr)",
  cover_shift_standard: "Covered Shift (24-48hr)",
  stay_late: "Stayed 2+ Hours Late",
  arrive_early: "Arrived 2+ Hours Early",
  training_mentoring: "Training/Mentoring",
  special_event: "Special Event/Catering",
};

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
  const [selectedReductionType, setSelectedReductionType] = useState<PointReductionType | null>(null);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const member = teamPerformance.get(memberId);
  const reductionsUsed = Math.abs(getReductionsInLast30Days(memberId));
  const reductionsRemaining = config.max_reduction_per_30_days - reductionsUsed;

  const handleSubmit = async () => {
    if (!selectedReductionType || reductionsRemaining <= 0) return;
    setIsSubmitting(true);
    try {
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

          {/* Reduction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Reduction Type</label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(REDUCTION_TYPE_LABELS) as PointReductionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedReductionType(type)}
                  disabled={reductionsRemaining <= 0}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    selectedReductionType === type
                      ? 'border-primary-500 bg-primary-500/10'
                      : reductionsRemaining <= 0
                        ? 'border-gray-700 opacity-50 cursor-not-allowed'
                        : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <span className="text-sm text-white">{REDUCTION_TYPE_LABELS[type]}</span>
                  <span className="text-sm font-medium text-green-400">{config.reduction_values[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Remaining Allowance */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Reduction allowance remaining</span>
              <span className={`font-medium ${reductionsRemaining <= 0 ? 'text-rose-400' : 'text-white'}`}>
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReductionType || isSubmitting || reductionsRemaining <= 0}
            className="btn-primary"
          >
            {isSubmitting ? 'Adding...' : 'Add Reduction'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPointReductionModal;
