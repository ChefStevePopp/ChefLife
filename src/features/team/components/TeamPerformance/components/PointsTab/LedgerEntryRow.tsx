/**
 * LedgerEntryRow — Individual point event row (By Member view)
 * 
 * Inline action modes: modify (reclassify), excuse, confirm remove.
 * Same action pattern as TeamTab staged events.
 * 
 * @diagnostics src/features/team/components/TeamPerformance/components/PointsTab/LedgerEntryRow.tsx
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Pencil,
  Shield,
  Trash2,
  Check,
  RefreshCw,
  Flag,
} from "lucide-react";
import { formatDateForDisplay } from "@/utils/dateUtils";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import {
  EVENT_TYPE_LABELS,
  REDUCTION_TYPE_LABELS,
  DEMERIT_OPTIONS,
  EXCUSE_OPTIONS,
} from "./pointsConstants";

// =============================================================================
// TYPES
// =============================================================================

interface LedgerEntryRowProps {
  entry: any;
  canManage: boolean;
  isProcessing: boolean;
  isDuplicate: boolean;
  onModify: (newType: string, newPoints: number) => void;
  onExcuse: (reason: string) => void;
  onRemove: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const LedgerEntryRow: React.FC<LedgerEntryRowProps> = ({
  entry,
  canManage,
  isProcessing,
  isDuplicate,
  onModify,
  onExcuse,
  onRemove,
}) => {
  const { showDiagnostics } = useDiagnostics();
  const [mode, setMode] = useState<'default' | 'modify' | 'excuse' | 'confirm_remove'>('default');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedPoints, setSelectedPoints] = useState(0);
  const [excuseReason, setExcuseReason] = useState('');

  const isReduction = 'reduction_type' in entry;
  const eventType = isReduction ? entry.reduction_type : entry.event_type;
  const label = isReduction 
    ? REDUCTION_TYPE_LABELS[eventType] || eventType
    : EVENT_TYPE_LABELS[eventType] || eventType;

  const handleEventTypeChange = (newType: string) => {
    const option = DEMERIT_OPTIONS.find(o => o.id === newType);
    if (option) {
      setSelectedEventType(newType);
      setSelectedPoints(option.points);
    }
  };

  const resetMode = () => {
    setMode('default');
    setSelectedEventType('');
    setSelectedPoints(0);
    setExcuseReason('');
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50">
      {showDiagnostics && <span className="text-[10px] text-gray-600 font-mono mr-2">LedgerEntryRow</span>}
      
      {/* Entry Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isReduction ? 'bg-green-500/20' : 'bg-rose-500/20'
        }`}>
          {isReduction 
            ? <CheckCircle className="w-4 h-4 text-green-400" />
            : <AlertTriangle className="w-4 h-4 text-rose-400" />
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">{label}</span>
            {isDuplicate && (
              <Flag 
                className="w-3.5 h-3.5 text-amber-400" 
                title="Possible duplicate entry"
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formatDateForDisplay(entry.event_date)}
            {entry.notes && <span className="truncate">• {entry.notes}</span>}
          </div>
        </div>
      </div>

      {/* Points & Actions */}
      <div className="flex items-center gap-2 ml-3">
        {/* DEFAULT MODE */}
        {mode === 'default' && (
          <>
            <span className={`text-sm font-medium ${
              entry.points > 0 ? 'text-rose-400' : 'text-green-400'
            }`}>
              {entry.points > 0 ? '+' : ''}{entry.points}
            </span>
            <span className="text-sm text-gray-500 w-12 text-right">
              = {entry.running_balance}
            </span>
            
            {canManage && (
              <div className="flex items-center gap-1 ml-2">
                {!isReduction && (
                  <button
                    onClick={() => setMode('modify')}
                    disabled={isProcessing}
                    className="p-1.5 rounded hover:bg-gray-600/50 text-gray-500 hover:text-primary-400 transition-colors"
                    title="Reclassify event"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setMode('excuse')}
                  disabled={isProcessing}
                  className="p-1.5 rounded hover:bg-gray-600/50 text-gray-500 hover:text-amber-400 transition-colors"
                  title="Excuse (remove with reason)"
                >
                  <Shield className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMode('confirm_remove')}
                  disabled={isProcessing}
                  className="p-1.5 rounded hover:bg-gray-600/50 text-gray-500 hover:text-rose-400 transition-colors"
                  title="Remove entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* MODIFY MODE */}
        {mode === 'modify' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedEventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="input text-xs py-1 min-w-[180px]"
              autoFocus
            >
              <option value="" disabled>Reclassify as...</option>
              {DEMERIT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.points} pts)
                </option>
              ))}
            </select>
            
            <button
              onClick={() => {
                if (selectedEventType) {
                  onModify(selectedEventType, selectedPoints);
                  resetMode();
                }
              }}
              disabled={!selectedEventType || isProcessing}
              className={`p-1.5 rounded transition-colors ${
                selectedEventType ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-500'
              }`}
              title="Confirm"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            
            <button
              onClick={resetMode}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-gray-200 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* EXCUSE MODE */}
        {mode === 'excuse' && (
          <div className="flex items-center gap-2">
            <select
              value={excuseReason}
              onChange={(e) => setExcuseReason(e.target.value)}
              className="input text-xs py-1 min-w-[180px]"
              autoFocus
            >
              <option value="" disabled>Select reason...</option>
              {EXCUSE_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            
            <button
              onClick={() => {
                if (excuseReason) {
                  onExcuse(excuseReason);
                  resetMode();
                }
              }}
              disabled={!excuseReason || isProcessing}
              className={`p-1.5 rounded transition-colors ${
                excuseReason ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-500'
              }`}
              title="Confirm excuse"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            
            <button
              onClick={resetMode}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-gray-200 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CONFIRM REMOVE MODE */}
        {mode === 'confirm_remove' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-400">Remove permanently?</span>
            
            <button
              onClick={() => {
                onRemove();
                resetMode();
              }}
              disabled={isProcessing}
              className="p-1.5 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
              title="Confirm remove"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            
            <button
              onClick={resetMode}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-gray-200 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerEntryRow;
