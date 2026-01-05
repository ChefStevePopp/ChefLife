/**
 * ReportsTab - Weekly Performance Digest
 * 
 * Generates personalized weekly reports for team members.
 * - Echo (ε): Personal report only
 * - Delta (δ): Personal + direct reports
 * - Charlie (γ): Personal + department summary
 * - Bravo (β): Personal + full team summary
 * - Alpha (α): Personal + full team summary + trends/alerts
 * - Omega (Ω): Platform-wide (The One Above All)
 */

import React, { useState, useMemo } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useTeamStore } from "@/stores/teamStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { SECURITY_LEVELS } from "@/config/security";
import toast from "react-hot-toast";
import {
  FileText,
  Info,
  ChevronUp,
  User,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle,
  Send,
  Download,
  Eye,
  Settings,
  ChevronRight,
  Sparkles,
  X,
  Mail,
  Loader2,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface WeekDay {
  date: string;
  dayName: string;
  events: string[];
}

interface PersonalDigest {
  memberId: string;
  memberName: string;
  weekOf: string;
  weekDays: WeekDay[];
  pointsThisWeek: number;
  pointsTotal: number;
  attendanceThisWeek: number;
  attendanceYTD: number;
  currentTier: 1 | 2 | 3;
  coachingStage: number | null;
  mvpContributions: number;
  seniority: number; // years
  sicKDaysUsed: number;
  sickDaysRemaining: number;
  vacationHoursTotal: number;
  vacationHoursUsed: number;
  vacationHoursRemaining: number;
}

interface TeamSummary {
  totalMembers: number;
  attendanceAverage: number;
  pointsIssued: number;
  pointsReduced: number;
  tierDistribution: { tier1: number; tier2: number; tier3: number };
  tierMovement: { up: number; down: number; same: number };
  approachingThreshold: number;
  activeCoaching: number;
  topMVP: { name: string; contributions: number } | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getWeekDates = (): { start: Date; end: Date; weekOf: string; weekStart: string; weekEnd: string } => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday - 7); // Last Monday
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Last Sunday
  
  const weekOf = start.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: '2-digit',
  });

  // ISO date strings for API
  const weekStart = start.toISOString().split('T')[0];
  const weekEnd = end.toISOString().split('T')[0];
  
  return { start, end, weekOf, weekStart, weekEnd };
};

const getTierColor = (tier: 1 | 2 | 3) => {
  switch (tier) {
    case 1: return { bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-400" };
    case 2: return { bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400" };
    case 3: return { bg: "bg-rose-500/20", border: "border-rose-500/30", text: "text-rose-400" };
  }
};

const getTierLabel = (tier: 1 | 2 | 3) => {
  switch (tier) {
    case 1: return "Excellence";
    case 2: return "Strong";
    case 3: return "Focus";
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ReportsTabProps {
  selectedCycleId?: string | null;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ selectedCycleId }) => {
  const { user, securityLevel, organizationId } = useAuth();
  const { teamPerformance, currentCycle, cycles, config } = usePerformanceStore();
  const { members } = useTeamStore();
  
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'personal' | 'team'>('personal');
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTarget, setSendTarget] = useState<'all' | 'selected'>('all');
  const [isSending, setIsSending] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  
  const performanceArray = Array.from(teamPerformance.values());
  
  // Get the active cycle (selected or current)
  const activeCycle = useMemo(() => {
    if (selectedCycleId) {
      return cycles.find(c => c.id === selectedCycleId) || currentCycle;
    }
    return currentCycle;
  }, [selectedCycleId, cycles, currentCycle]);

  const { weekOf, weekStart, weekEnd } = getWeekDates();
  
  // Determine access level
  const canViewTeamSummary = securityLevel !== undefined && securityLevel <= SECURITY_LEVELS.DELTA;
  const canViewFullTeam = securityLevel !== undefined && securityLevel <= SECURITY_LEVELS.BRAVO;
  const canViewTrends = securityLevel !== undefined && securityLevel <= SECURITY_LEVELS.ALPHA;
  
  // Build personal digest for current user or selected member
  const currentMemberPerf = useMemo(() => {
    if (selectedMemberId) {
      return teamPerformance.get(selectedMemberId);
    }
    // Find current user in team
    return performanceArray.find(p => p.team_member.email === user?.email);
  }, [selectedMemberId, teamPerformance, performanceArray, user]);
  
  // Build team summary (for managers)
  const teamSummary: TeamSummary | null = useMemo(() => {
    if (!canViewTeamSummary || performanceArray.length === 0) return null;
    
    const tier1 = performanceArray.filter(p => p.tier === 1).length;
    const tier2 = performanceArray.filter(p => p.tier === 2).length;
    const tier3 = performanceArray.filter(p => p.tier === 3).length;
    
    // Points this week (would need date filtering in real implementation)
    const totalPoints = performanceArray.reduce((sum, p) => sum + (p.current_points || 0), 0);
    
    // Find approaching threshold
    const approaching = performanceArray.filter(p => {
      if (p.tier === 1 && p.current_points === config.tier_thresholds.tier1_max) return true;
      if (p.tier === 2 && p.current_points === config.tier_thresholds.tier2_max) return true;
      return false;
    }).length;
    
    // Active coaching
    const coaching = performanceArray.filter(p => p.coaching_stage && p.coaching_stage >= 1).length;
    
    // TODO: Calculate MVP from reductions
    
    return {
      totalMembers: performanceArray.length,
      attendanceAverage: 96.2, // TODO: Calculate from schedule data
      pointsIssued: totalPoints,
      pointsReduced: 0, // TODO: Sum reductions
      tierDistribution: { tier1, tier2, tier3 },
      tierMovement: { up: 0, down: 0, same: performanceArray.length }, // TODO: Track week-over-week
      approachingThreshold: approaching,
      activeCoaching: coaching,
      topMVP: null, // TODO: Find top contributor
    };
  }, [canViewTeamSummary, performanceArray, config]);

  // Get members with email for sending
  const sendableMembers = useMemo(() => {
    return performanceArray.filter(p => p.team_member.email);
  }, [performanceArray]);

  // Handle send reports
  const handleSendReports = async () => {
    const recipients = sendTarget === 'all' 
      ? sendableMembers 
      : sendableMembers.filter(m => selectedRecipients.has(m.team_member_id));
    
    if (recipients.length === 0) {
      toast.error('No recipients selected');
      return;
    }

    if (!activeCycle?.id) {
      toast.error('No active cycle selected');
      return;
    }

    setIsSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-weekly-digest', {
        body: {
          organizationId,
          cycleId: activeCycle.id,
          recipientIds: recipients.map(r => r.team_member_id),
          weekOf,
          weekStart,
          weekEnd,
        }
      });

      if (error) throw error;

      const { summary, results } = data;
      
      // Show appropriate toast based on results
      if (summary.failed > 0 && summary.sent > 0) {
        toast.success(
          `Sent ${summary.sent} digest${summary.sent !== 1 ? 's' : ''}, ${summary.failed} failed`,
          { duration: 5000 }
        );
      } else if (summary.failed > 0 && summary.sent === 0) {
        toast.error(`Failed to send ${summary.failed} digest${summary.failed !== 1 ? 's' : ''}`);
      } else if (summary.skipped > 0 && summary.sent === 0) {
        toast.error('All recipients were skipped (already sent or no email)');
      } else {
        toast.success(`Sent ${summary.sent} digest${summary.sent !== 1 ? 's' : ''} successfully`);
      }

      // Log any specific failures to console for debugging
      const failures = results.filter((r: any) => r.status === 'failed');
      if (failures.length > 0) {
        console.warn('Failed sends:', failures);
      }

      setShowSendModal(false);
      setSelectedRecipients(new Set());
    } catch (err: any) {
      console.error('Error sending reports:', err);
      toast.error(err.message || 'Failed to send reports');
    } finally {
      setIsSending(false);
    }
  };

  // Toggle recipient selection
  const toggleRecipient = (memberId: string) => {
    const next = new Set(selectedRecipients);
    if (next.has(memberId)) {
      next.delete(memberId);
    } else {
      next.add(memberId);
    }
    setSelectedRecipients(next);
  };

  // Select/deselect all recipients
  const toggleAllRecipients = () => {
    if (selectedRecipients.size === sendableMembers.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(sendableMembers.map(m => m.team_member_id)));
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Expandable Info Section */}
      <div className="expandable-info-section">
        <button
          onClick={(e) => {
            const section = e.currentTarget.closest('.expandable-info-section');
            section?.classList.toggle('expanded');
          }}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-lime-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300">About Weekly Digests</span>
          </div>
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2 space-y-4">
            <p className="text-sm text-gray-400">
              Weekly Performance Digests are personalized reports delivered every Monday morning. 
              Each team member sees their own attendance, points, tier status, and MVP contributions. 
              Managers see an additional team summary with health metrics and attention alerts.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-lime-400" />
                  <span className="text-sm font-medium text-white">Personal Digest</span>
                </div>
                <p className="text-xs text-gray-500">
                  Your week at a glance, points, tier, MVP contributions, and time-off balances.
                </p>
              </div>
              
              <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-lime-400" />
                  <span className="text-sm font-medium text-white">Team Summary</span>
                  <span className="text-xs text-gray-500">(δ+)</span>
                </div>
                <p className="text-xs text-gray-500">
                  Team health, tier distribution, attention alerts, and top contributors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-lime-500/10 rounded-lg border border-lime-500/30">
              <Sparkles className="w-4 h-4 text-lime-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-lime-200">
                Team members can opt out of email delivery in their notification preferences. 
                In-app digests are always available.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-white">Week of {weekOf}</p>
            <p className="text-xs text-gray-500">Preview this week's digest</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canViewTeamSummary && (
            <div className="flex items-center bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('personal')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  previewMode === 'personal' 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 inline mr-1.5" />
                Personal
              </button>
              <button
                onClick={() => setPreviewMode('team')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  previewMode === 'team' 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1.5" />
                Team
              </button>
            </div>
          )}
          
          <button className="btn-ghost text-sm">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview PDF</span>
          </button>
          
          <button 
            onClick={() => setShowSendModal(true)}
            className="btn-primary text-sm"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send Now</span>
          </button>
        </div>
      </div>

      {/* Preview Content */}
      {previewMode === 'personal' ? (
        <PersonalDigestPreview 
          memberPerf={currentMemberPerf}
          weekOf={weekOf}
          config={config}
        />
      ) : (
        <TeamSummaryPreview 
          summary={teamSummary}
          weekOf={weekOf}
          canViewTrends={canViewTrends}
        />
      )}

      {/* Member Selector (for managers) */}
      {canViewFullTeam && previewMode === 'personal' && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-300">Preview Other Team Members</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedMemberId(null)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                !selectedMemberId 
                  ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30' 
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:border-gray-600'
              }`}
            >
              Me
            </button>
            {performanceArray.slice(0, 10).map((p) => (
              <button
                key={p.team_member_id}
                onClick={() => setSelectedMemberId(p.team_member_id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedMemberId === p.team_member_id 
                    ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30' 
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:border-gray-600'
                }`}
              >
                {p.team_member.first_name} {p.team_member.last_name?.[0]}.
              </button>
            ))}
            {performanceArray.length > 10 && (
              <span className="px-3 py-1.5 text-sm text-gray-500">
                +{performanceArray.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Send Reports Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2b] rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-lime-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-lime-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Send Weekly Digests</h3>
                  <p className="text-xs text-gray-500">Week of {weekOf}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh]">
              {/* Send Target Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Send to:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSendTarget('all')}
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      sendTarget === 'all'
                        ? 'bg-lime-500/20 border-lime-500/30 text-lime-300'
                        : 'bg-gray-800/50 border-gray-700/30 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Users className="w-4 h-4 mx-auto mb-1" />
                    All Team ({sendableMembers.length})
                  </button>
                  <button
                    onClick={() => setSendTarget('selected')}
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      sendTarget === 'selected'
                        ? 'bg-lime-500/20 border-lime-500/30 text-lime-300'
                        : 'bg-gray-800/50 border-gray-700/30 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <User className="w-4 h-4 mx-auto mb-1" />
                    Select Members
                  </button>
                </div>
              </div>

              {/* Member Selection (when 'selected' target) */}
              {sendTarget === 'selected' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">
                      Select Recipients ({selectedRecipients.size} selected)
                    </label>
                    <button
                      onClick={toggleAllRecipients}
                      className="text-xs text-primary-400 hover:text-primary-300"
                    >
                      {selectedRecipients.size === sendableMembers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-2 max-h-48 overflow-y-auto">
                    {sendableMembers.map((m) => (
                      <label
                        key={m.team_member_id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-700/30 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.has(m.team_member_id)}
                          onChange={() => toggleRecipient(m.team_member_id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-lime-500 focus:ring-lime-500/20"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            {m.team_member.first_name} {m.team_member.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {m.team_member.email}
                          </p>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                          m.tier === 1 ? 'bg-emerald-500/20 text-emerald-400' :
                          m.tier === 2 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-rose-500/20 text-rose-400'
                        }`}>
                          T{m.tier}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">
                    {sendTarget === 'all' 
                      ? `Will send ${sendableMembers.length} personalized digest${sendableMembers.length !== 1 ? 's' : ''}`
                      : `Will send ${selectedRecipients.size} personalized digest${selectedRecipients.size !== 1 ? 's' : ''}`
                    }
                  </span>
                </div>
              </div>

              {/* Warning for members without email */}
              {performanceArray.length > sendableMembers.length && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200">
                    {performanceArray.length - sendableMembers.length} team member{performanceArray.length - sendableMembers.length !== 1 ? 's' : ''} without email address will not receive a digest.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/20">
              <button
                onClick={() => setShowSendModal(false)}
                disabled={isSending}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReports}
                disabled={isSending || (sendTarget === 'selected' && selectedRecipients.size === 0)}
                className="btn-primary"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Digests
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// PERSONAL DIGEST PREVIEW COMPONENT
// =============================================================================

interface PersonalDigestPreviewProps {
  memberPerf: ReturnType<typeof usePerformanceStore.getState>['teamPerformance'] extends Map<string, infer T> ? T : never | undefined;
  weekOf: string;
  config: ReturnType<typeof usePerformanceStore.getState>['config'];
}

const PersonalDigestPreview: React.FC<PersonalDigestPreviewProps> = ({
  memberPerf,
  weekOf,
  config,
}) => {
  if (!memberPerf) {
    return (
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-8 text-center">
        <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">No Performance Data</h3>
        <p className="text-sm text-gray-500">
          Performance tracking data not available for this user.
        </p>
      </div>
    );
  }

  const tierColors = getTierColor(memberPerf.tier);
  const tierLabel = getTierLabel(memberPerf.tier);
  const firstName = memberPerf.team_member.first_name || 'Team Member';

  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
      {/* Digest Header */}
      <div className="p-6 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/50 to-gray-800/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center overflow-hidden">
            {memberPerf.team_member.avatar_url ? (
              <img 
                src={memberPerf.team_member.avatar_url} 
                alt="" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-gray-400">
                {firstName[0]}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              Hi {firstName}!
            </h2>
            <p className="text-gray-400">
              This is what last week looked like for you at work.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Week of {weekOf}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="p-6 space-y-6">
        {/* Points & Tier Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Points This Week */}
          <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Points This Week</span>
            </div>
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-xs text-gray-500">points</p>
          </div>

          {/* Points Total */}
          <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Cycle Total</span>
            </div>
            <p className="text-3xl font-bold text-white">{memberPerf.current_points}</p>
            <p className="text-xs text-gray-500">points</p>
          </div>

          {/* Current Tier */}
          <div className={`p-4 rounded-lg border ${tierColors.bg} ${tierColors.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Current Tier</span>
            </div>
            <p className={`text-3xl font-bold ${tierColors.text}`}>Tier {memberPerf.tier}</p>
            <p className={`text-xs ${tierColors.text}`}>{tierLabel}</p>
          </div>
        </div>

        {/* Attendance Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">This Week</span>
              <span className="text-xs text-gray-500">Attendance</span>
            </div>
            <p className="text-4xl font-bold text-white">100.0%</p>
          </div>
          
          <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">Year to Date</span>
              <span className="text-xs text-gray-500">Attendance</span>
            </div>
            <p className="text-4xl font-bold text-white">98.5%</p>
          </div>
        </div>

        {/* MVP Contributions */}
        <div className="p-4 bg-lime-500/10 rounded-lg border border-lime-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-lime-400" />
            <span className="text-sm font-medium text-lime-300">Team MVP Contributions</span>
          </div>
          <p className="text-sm text-gray-300">
            🤝 Thanks for helping the team out <strong className="text-white">0 times</strong> so far this cycle
          </p>
        </div>

        {/* Being Present Section */}
        <div className="p-5 bg-gray-800/20 rounded-lg border border-gray-700/30">
          <h3 className="text-lg font-semibold text-white mb-3">Being Present Matters</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Every shift you show up with intention is an investment in your story. 
            When you're here — truly here, mind and heart engaged — you're not just filling 
            a position, you're investing in your craft, building your connections, and 
            contributing to a story worth sharing.
          </p>
          <p className="text-sm text-gray-500 mt-3 italic">
            Be present. Be purposeful. Be brilliant, never bland.
          </p>
        </div>

        {/* Quick Reminder */}
        <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30">
          <h4 className="text-sm font-medium text-white mb-2">A Quick Reminder About Your Attendance</h4>
          <p className="text-xs text-gray-400">
            Your numbers above show where you stand this week. If anything seems unclear — 
            your points, your tier status, how the reset cycle works, or how to reduce points — 
            please ask your supervisor, review 7Shifts announcements, or ask Chef Steve directly.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700/30 bg-gray-800/20">
        <p className="text-xs text-gray-500 text-center">
          This Weekly Report Brought to You By ChefLife® for Memphis Fire Barbeque Company Inc.
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// TEAM SUMMARY PREVIEW COMPONENT
// =============================================================================

interface TeamSummaryPreviewProps {
  summary: TeamSummary | null;
  weekOf: string;
  canViewTrends: boolean;
}

const TeamSummaryPreview: React.FC<TeamSummaryPreviewProps> = ({
  summary,
  weekOf,
  canViewTrends,
}) => {
  if (!summary) {
    return (
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-8 text-center">
        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">No Team Data</h3>
        <p className="text-sm text-gray-500">
          Team performance data not available.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
      {/* Summary Header */}
      <div className="p-6 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/50 to-gray-800/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-lime-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-lime-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Memphis Fire Team Summary</h2>
            <p className="text-sm text-gray-400">Week of {weekOf}</p>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-6 space-y-6">
        {/* Overview Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30 text-center">
            <p className="text-3xl font-bold text-white">{summary.totalMembers}</p>
            <p className="text-xs text-gray-500">Active Members</p>
          </div>
          <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30 text-center">
            <p className="text-3xl font-bold text-white">{summary.attendanceAverage}%</p>
            <p className="text-xs text-gray-500">Team Attendance</p>
          </div>
          <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30 text-center">
            <p className="text-3xl font-bold text-amber-400">{summary.pointsIssued}</p>
            <p className="text-xs text-gray-500">Points Issued</p>
          </div>
          <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30 text-center">
            <p className="text-3xl font-bold text-emerald-400">{summary.pointsReduced}</p>
            <p className="text-xs text-gray-500">Points Reduced</p>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30">
          <h4 className="text-sm font-medium text-gray-300 mb-4">Tier Distribution</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-2">
                <span className="text-lg font-bold text-emerald-400">{summary.tierDistribution.tier1}</span>
              </div>
              <p className="text-xs text-gray-500">Tier 1</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 mb-2">
                <span className="text-lg font-bold text-amber-400">{summary.tierDistribution.tier2}</span>
              </div>
              <p className="text-xs text-gray-500">Tier 2</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/20 mb-2">
                <span className="text-lg font-bold text-rose-400">{summary.tierDistribution.tier3}</span>
              </div>
              <p className="text-xs text-gray-500">Tier 3</p>
            </div>
          </div>
        </div>

        {/* Attention Required */}
        {(summary.approachingThreshold > 0 || summary.activeCoaching > 0) && (
          <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Attention Required</span>
            </div>
            <div className="space-y-2">
              {summary.approachingThreshold > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Approaching coaching threshold</span>
                  <span className="font-medium text-amber-400">{summary.approachingThreshold}</span>
                </div>
              )}
              {summary.activeCoaching > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">In active coaching</span>
                  <span className="font-medium text-amber-400">{summary.activeCoaching}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Good State */}
        {summary.approachingThreshold === 0 && summary.activeCoaching === 0 && (
          <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">Team is Looking Good</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              No team members require immediate attention this week.
            </p>
          </div>
        )}

        {/* Top MVP */}
        {summary.topMVP && (
          <div className="p-4 bg-lime-500/10 rounded-lg border border-lime-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-lime-400" />
              <span className="text-sm font-medium text-lime-300">Top Contributor</span>
            </div>
            <p className="text-sm text-gray-300">
              🏆 <strong className="text-white">{summary.topMVP.name}</strong> with {summary.topMVP.contributions} team assists this week
            </p>
          </div>
        )}

        {/* Trends (Alpha only) */}
        {canViewTrends && (
          <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-gray-300">4-Week Trends</span>
              <span className="text-xs text-gray-600">(α only)</span>
            </div>
            <p className="text-xs text-gray-500 italic">
              Trend analysis coming soon — will show attendance patterns, common point events, and team health trajectory.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700/30 bg-gray-800/20">
        <p className="text-xs text-gray-500 text-center">
          Team Summary • ChefLife® for Memphis Fire Barbeque Company Inc.
        </p>
      </div>
    </div>
  );
};

export default ReportsTab;
