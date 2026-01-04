import React, { useState } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { X } from "lucide-react";
import type { PointEventType } from "@/features/team/types";

const EVENT_TYPE_LABELS: Record<PointEventType, string> = {
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

interface AddPointEventModalProps {
  memberId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddPointEventModal: React.FC<AddPointEventModalProps> = ({
  memberId,
  isOpen,
  onClose,
}) => {
  const { config, addPointEvent, teamPerformance } = usePerformanceStore();
  const [selectedEventType, setSelectedEventType] = useState<PointEventType | null>(null);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const member = teamPerformance.get(memberId);

  const handleSubmit = async () => {
    if (!selectedEventType) return;
    setIsSubmitting(true);
    try {
      await addPointEvent(memberId, selectedEventType, notes, eventDate);
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
            <h3 className="text-lg font-medium text-white">Add Point Event</h3>
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
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Event Type</label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(EVENT_TYPE_LABELS) as PointEventType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedEventType(type)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    selectedEventType === type
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <span className="text-sm text-white">{EVENT_TYPE_LABELS[type]}</span>
                  <span className="text-sm font-medium text-rose-400">+{config.point_values[type]}</span>
                </button>
              ))}
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
            disabled={!selectedEventType || isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPointEventModal;
