/**
 * AddVacationModal - Log vacation time for a team member
 * 
 * L5 Design: Clean modal for recording vacation hours.
 * Logs to NEXUS for tracking. Phase 2 will add 7shifts integration.
 */

import React, { useState } from "react";
import { X, Palmtree, Calendar, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTeamStore } from "@/stores/teamStore";
import { usePerformanceStore } from "@/stores/performanceStore";
import { nexus } from "@/lib/nexus";
import { getLocalDateString } from "@/utils/dateUtils";
import toast from "react-hot-toast";

interface AddVacationModalProps {
  memberId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddVacationModal: React.FC<AddVacationModalProps> = ({
  memberId,
  isOpen,
  onClose,
}) => {
  const { organizationId, user } = useAuth();
  const { members } = useTeamStore();
  const { fetchTeamPerformance, teamPerformance } = usePerformanceStore();
  
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [hours, setHours] = useState<number>(8);
  const [entryMode, setEntryMode] = useState<'hours' | 'dates'>('hours');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const member = members.find(m => m.id === memberId);
  const memberPerformance = teamPerformance.get(memberId);
  const memberName = member 
    ? `${member.first_name} ${member.last_name}` 
    : 'Team Member';

  // Get current usage (Phase 2: will come from actual tracking)
  const vacationHoursUsed = memberPerformance?.time_off?.vacation_hours_used ?? 0;
  const vacationHoursAvailable = memberPerformance?.time_off?.vacation_hours_available ?? 0;

  // Calculate hours from date range (assuming 8-hour days)
  const calculateHoursFromDates = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays * 8;
  };

  const effectiveHours = entryMode === 'dates' ? calculateHoursFromDates() : hours;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !user || !memberId) return;

    if (effectiveHours <= 0) {
      toast.error('Please enter valid vacation time');
      return;
    }

    setIsSubmitting(true);
    try {
      // Log vacation via NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_vacation_logged',
        details: {
          team_member_id: memberId,
          name: memberName,
          hours: effectiveHours,
          start_date: startDate,
          end_date: entryMode === 'dates' ? endDate : startDate,
          notes: notes || undefined,
          source: 'manual_entry',
        },
      });

      // Refresh performance data to update counts
      await fetchTeamPerformance();

      toast.success(`${effectiveHours}h vacation logged for ${member?.first_name || 'team member'}`);
      onClose();
    } catch (err) {
      console.error('Error logging vacation:', err);
      toast.error('Failed to log vacation');
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
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <Palmtree className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Log Vacation</h2>
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
          {vacationHoursAvailable > 0 && (
            <div className="p-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Vacation Hours Used</span>
                <span className="text-lg font-semibold text-sky-400">
                  {vacationHoursUsed} / {vacationHoursAvailable}h
                </span>
              </div>
            </div>
          )}

          {/* Entry Mode Toggle */}
          <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg">
            <button
              type="button"
              onClick={() => setEntryMode('hours')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                entryMode === 'hours'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Clock className="w-4 h-4 inline-block mr-1.5" />
              By Hours
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('dates')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                entryMode === 'dates'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 inline-block mr-1.5" />
              By Dates
            </button>
          </div>

          {/* Hours Entry */}
          {entryMode === 'hours' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input w-full pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Hours
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                    min={1}
                    max={80}
                    step={1}
                    className="input w-full pl-10"
                    required
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[4, 8, 16, 24, 40].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(h)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        hours === h
                          ? 'bg-sky-500/20 text-sky-400'
                          : 'bg-gray-700/50 text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Date Range Entry */}
          {entryMode === 'dates' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="input w-full"
                  required
                />
              </div>
              <div className="col-span-2 text-center p-2 bg-gray-800/40 rounded-lg">
                <span className="text-sm text-gray-400">
                  = <span className="text-sky-400 font-semibold">{calculateHoursFromDates()}h</span>
                  {' '}({Math.ceil(calculateHoursFromDates() / 8)} days × 8h)
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Notes <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Family trip, approved by manager"
              rows={2}
              className="input w-full resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg">
            <p className="text-xs text-sky-300">
              <strong>Phase 2:</strong> Vacation tracking will integrate with 7shifts 
              for automatic import. For now, hours are logged manually.
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
              disabled={isSubmitting || effectiveHours <= 0}
              className="btn-primary flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Palmtree className="w-4 h-4" />
                  Log {effectiveHours}h Vacation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVacationModal;
