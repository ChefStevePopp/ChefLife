/**
 * PointsTab — Points Management, Team Ledger & Absences
 * 
 * Orchestrator: view mode toggle + delegates to sub-views.
 * Three lenses on one ledger:
 *   - By Member: Card grid → individual point ledger
 *   - Team Ledger: Chronological feed of ALL events
 *   - Absences: Absence Ledger (Alpha/Omega only)
 * 
 * @diagnostics src/features/team/components/TeamPerformance/components/PointsTab/index.tsx
 */

import React, { useState } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { formatDateForDisplay, formatDateShort } from "@/utils/dateUtils";
import { Users, List, CalendarCheck } from "lucide-react";
import { ActionLegend } from "../ActionLegend";
import { GapScannerTab } from "../GapScannerTab";
import { SECURITY_LEVELS } from "@/config/security";
import { ByMemberView } from "./ByMemberView";
import { TeamLedgerView } from "./TeamLedgerView";
import type { ViewMode } from "./pointsConstants";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PointsTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  const { securityLevel } = useAuth();
  const { currentCycle } = usePerformanceStore();

  // Shared state — owned here because TeamLedger's "view member" navigates across views
  const [viewMode, setViewMode] = useState<ViewMode>('by_member');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {showDiagnostics && <div className="text-xs text-gray-500 font-mono">src/features/team/components/TeamPerformance/components/PointsTab/index.tsx</div>}

      {/* Help Legend */}
      <ActionLegend context="points" />

      {/* View Mode Toggle — L5 Pill Design */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg border border-gray-700/30">
          <button
            onClick={() => { setViewMode('by_member'); setSelectedMemberId(null); }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${viewMode === 'by_member'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-gray-400 hover:text-gray-300 border border-transparent'
              }
            `}
          >
            <Users className="w-4 h-4" />
            By Member
          </button>
          <button
            onClick={() => setViewMode('team_ledger')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${viewMode === 'team_ledger'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-gray-400 hover:text-gray-300 border border-transparent'
              }
            `}
          >
            <List className="w-4 h-4" />
            Team Ledger
          </button>
          {/* Absences — Alpha/Omega only */}
          {(securityLevel === SECURITY_LEVELS.OMEGA || securityLevel === SECURITY_LEVELS.ALPHA) && (
            <button
              onClick={() => setViewMode('absences')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${viewMode === 'absences'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-gray-400 hover:text-gray-300 border border-transparent'
                }
              `}
            >
              <CalendarCheck className="w-4 h-4" />
              Absences
            </button>
          )}
        </div>

        {/* Cycle indicator */}
        {currentCycle && (
          <div className="text-xs text-gray-500">
            Cycle: {formatDateShort(currentCycle.start_date)} 
            {' - '}
            {formatDateForDisplay(currentCycle.end_date)}
          </div>
        )}
      </div>

      {/* =========================================================================
          BY MEMBER VIEW
          ========================================================================= */}
      {viewMode === 'by_member' && (
        <ByMemberView
          selectedMemberId={selectedMemberId}
          onSelectMember={(id) => setSelectedMemberId(id)}
          onClearMember={() => setSelectedMemberId(null)}
        />
      )}

      {/* =========================================================================
          TEAM LEDGER VIEW
          ========================================================================= */}
      {viewMode === 'team_ledger' && (
        <TeamLedgerView
          onViewMember={(memberId) => {
            setViewMode('by_member');
            setSelectedMemberId(memberId);
          }}
        />
      )}

      {/* =========================================================================
          ABSENCES VIEW (Absence Ledger)
          ========================================================================= */}
      {viewMode === 'absences' && <GapScannerTab />}
    </div>
  );
};

export default PointsTab;
