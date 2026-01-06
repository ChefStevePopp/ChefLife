/**
 * AddSickDayModal - Log a sick day for a team member
 * 
 * L5 Design: Clean modal for manually recording ESA-protected sick days.
 * Logs to NEXUS for tracking, respects reset period from config.
 */

import React, { useState } from "react";
import { X, Thermometer, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTeamStore } from "@/stores/teamStore";
import { usePerformanceStore } from "@/stores/performanceStore";
import { nexus } from "@/lib/nexus";
import { getLocalDateString } from "@/utils/dateUtils";
import toast from "react-hot-toast";

interface AddSickDayModalProps {
  memberId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddSickDayModal: React.FC<AddSickDayModalProps> = ({
  memberId,
  isOpen,
  onClose,
}) => {
  const { organizationId, user } = useAuth();
  const { members } = useTeamStore();
  const { fetchTeamPerformance, teamPerformance } = usePerformanceStore();
  
  const [sickDate, setSickDate] = useState(() => getLocalDateString());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const member = members.find(m => m.id === memberId);
  const memberPerformance = teamPerformance.get(memberId);
  const memberName = member 
    ? `${member.first_name} ${member.last_name}` 
    : 'Team Member';

  // Get current usage
  const sickDaysUsed = memberPerformance?.time_off?.sick_days_used ?? 0;
  const sickDaysAvailable = memberPerformance?.time_off?.sick_days_available ?? 3;
  const isAtLimit = sickDaysUsed >= sickDaysAvailable;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !user || !memberId) return;

    setIsSubmitting(true);
    try {
      // Log sick day via NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_excused',
        details: {
          team_member_id: memberId,
          name: memberName,
          event_type: 'sick_day_manual',
          reason: 'SICK OK',
          event_date: sickDate,
          notes: notes || undefined,
          source: 'manual_entry',
        },
      });

      // Refresh performance data to update counts
      await fetchTeamPerformance();

      toast.success(`Sick day logged for ${member?.first_name || 'team member'}`);
      onClose();
    } catch (err) {
      console.error('Error logging sick day:', err);
      toast.error('Failed to log sick day');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1a1f2b] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Log Sick Day</h2>
              <p className="text-sm text-gray-400">{memberName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Current Usage Display */}
          <div className={`p-3 rounded-lg border ${
            isAtLimit 
              ? 'bg-rose-500/10 border-rose-500/30' 
              : 'bg-gray-800/40 border-gray-700/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">ESA Protected Days Used</span>
              <span className={`text-lg font-semibold ${
                isAtLimit ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {sickDaysUsed} / {sickDaysAvailable}
              </span>
            </div>
            {isAtLimit && (
              <p className="text-xs text-rose-400 mt-2">
                ESA allotment exhausted. Additional sick days may not be protected.
              </p>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Sick Day Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={sickDate}
                onChange={(e) => setSickDate(e.target.value)}
                max={getLocalDateString()}
                className="input w-full pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cannot log future sick days
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Notes <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Called in at 9am"
              rows={2}
              className="input w-full resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
            <p className="text-xs text-primary-300">
              <strong>Note:</strong> This logs an ESA-protected sick day. Under Ontario ESA, 
              employees are entitled to {sickDaysAvailable} unpaid sick days per calendar year 
              without penalty.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Thermometer className="w-4 h-4" />
                  Log Sick Day
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSickDayModal;
