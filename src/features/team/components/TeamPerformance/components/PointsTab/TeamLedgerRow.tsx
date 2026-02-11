/**
 * TeamLedgerRow — Single row in the Team Ledger chronological view
 * 
 * Inline action modes: modify (reclassify), excuse, confirm remove.
 * Clicking a member name navigates to their By Member detail view.
 * 
 * @diagnostics src/features/team/components/TeamPerformance/components/PointsTab/TeamLedgerRow.tsx
 */

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Pencil,
  Shield,
  Trash2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { formatDateShort } from "@/utils/dateUtils";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { DEMERIT_OPTIONS, EXCUSE_OPTIONS } from "./pointsConstants";

// =============================================================================
// TYPES
// =============================================================================

export interface TeamLedgerEntry {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string | null;
  memberTier: 1 | 2 | 3;
  eventDate: string;
  eventType: string;
  eventLabel: string;
  points: number;
  notes?: string;
  isReduction: boolean;
  isSickDay?: boolean;
  runningBalance: number;
  createdAt?: string;
}

interface TeamLedgerRowProps {
  entry: TeamLedgerEntry;
  canManage: boolean;
  isProcessing: boolean;
  onModify: (newType: string, newPoints: number) => void;
  onExcuse: (reason: string) => void;
  onRemove: () => void;
  onViewMember: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TeamLedgerRow: React.FC<TeamLedgerRowProps> = ({
  entry,
  canManage,
  isProcessing,
  onModify,
  onExcuse,
  onRemove,
  onViewMember,
}) => {
  const { showDiagnostics } = useDiagnostics();
  const [mode, setMode] = useState<'default' | 'modify' | 'excuse' | 'confirm_remove'>('default');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedPoints, setSelectedPoints] = useState(0);
  const [excuseReason, setExcuseReason] = useState('');

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

  const getTierBadgeColor = (tier: 1 | 2 | 3) => {
    switch (tier) {
      case 1: return 'bg-emerald-500/20 text-emerald-400';
      case 2: return 'bg-amber-500/20 text-amber-400';
      case 3: return 'bg-rose-500/20 text-rose-400';
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-800/50 items-center">
      {/* Date */}
      <div className="col-span-2 text-sm text-gray-400">
        {formatDateShort(entry.eventDate)}
      </div>

      {/* Team Member */}
      <div className="col-span-3">
        <button
          onClick={onViewMember}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
            {entry.memberAvatar ? (
              <img src={entry.memberAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.memberId}`}
                alt=""
                className="w-full h-full"
              />
            )}
          </div>
          <span className="text-sm text-white truncate">{entry.memberName}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${getTierBadgeColor(entry.memberTier)}`}>
            T{entry.memberTier}
          </span>
        </button>
      </div>

      {/* Event Type */}
      <div className="col-span-3 flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          entry.isReduction ? 'bg-emerald-500/20' : 'bg-amber-500/20'
        }`}>
          {entry.isReduction 
            ? <TrendingDown className="w-3 h-3 text-emerald-400" />
            : <TrendingUp className="w-3 h-3 text-amber-400" />
          }
        </div>
        <span className="text-sm text-gray-300 truncate">{entry.eventLabel}</span>
      </div>

      {/* Points */}
      <div className="col-span-1 text-right">
        <span className={`text-sm font-medium ${
          entry.points > 0 ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          {entry.points > 0 ? '+' : ''}{entry.points}
        </span>
      </div>

      {/* Notes & Actions */}
      <div className="col-span-3 flex items-center justify-between gap-2">
        {mode === 'default' && (
          <>
            <span className="text-xs text-gray-500 truncate flex-1">
              {entry.notes || '—'}
            </span>
            
            {canManage && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {!entry.isReduction && (
                  <button
                    onClick={() => setMode('modify')}
                    disabled={isProcessing}
                    className="
                      flex items-center justify-center w-7 h-7 rounded-full
                      bg-gray-700/30 border border-gray-600/30
                      text-gray-400 hover:text-primary-400 hover:bg-primary-500/10 hover:border-primary-500/30
                      transition-all duration-200 disabled:opacity-50
                    "
                    title="Reclassify"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setMode('excuse')}
                  disabled={isProcessing}
                  className="
                    flex items-center justify-center w-7 h-7 rounded-full
                    bg-gray-700/30 border border-gray-600/30
                    text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30
                    transition-all duration-200 disabled:opacity-50
                  "
                  title="Excuse"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setMode('confirm_remove')}
                  disabled={isProcessing}
                  className="
                    flex items-center justify-center w-7 h-7 rounded-full
                    bg-gray-700/30 border border-gray-600/30
                    text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30
                    transition-all duration-200 disabled:opacity-50
                  "
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}

        {/* MODIFY MODE */}
        {mode === 'modify' && (
          <div className="flex items-center gap-1 w-full">
            <select
              value={selectedEventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="input text-xs py-1 flex-1 min-w-0"
              autoFocus
            >
              <option value="" disabled>Reclassify...</option>
              {DEMERIT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
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
              className="p-1 rounded bg-emerald-500/20 text-emerald-400"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={resetMode} className="p-1 rounded text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* EXCUSE MODE */}
        {mode === 'excuse' && (
          <div className="flex items-center gap-1 w-full">
            <select
              value={excuseReason}
              onChange={(e) => setExcuseReason(e.target.value)}
              className="input text-xs py-1 flex-1 min-w-0"
              autoFocus
            >
              <option value="" disabled>Reason...</option>
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
              className="p-1 rounded bg-emerald-500/20 text-emerald-400"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={resetMode} className="p-1 rounded text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* CONFIRM REMOVE MODE */}
        {mode === 'confirm_remove' && (
          <div className="flex items-center gap-1 w-full justify-end">
            <span className="text-xs text-rose-400">Remove?</span>
            <button
              onClick={() => {
                onRemove();
                resetMode();
              }}
              disabled={isProcessing}
              className="p-1 rounded bg-rose-500/20 text-rose-400"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={resetMode} className="p-1 rounded text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamLedgerRow;
