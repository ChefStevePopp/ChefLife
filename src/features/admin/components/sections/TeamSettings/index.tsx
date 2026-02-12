/**
 * Team Settings
 * Unified configuration for The Team core module:
 * Schedule display, Roster preferences, and Profile settings.
 *
 * @diagnostics src/features/admin/components/sections/TeamSettings/index.tsx
 * @pattern L5 module-config (tabbed)
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ArrowLeft,
  Calendar,
  User,
  Save,
  RotateCcw,
  Loader2,
  Info,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Link2,
  Unlink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { getUsersVault, type SevenShiftsUser } from "@/lib/7shifts";
import {
  type CardDisplayConfig,
  type RosterDisplayConfig,
  type TeamModuleConfig,
  DEFAULT_TEAM_CONFIG,
} from "./types";

// Types & config imported from ./types (separated for Vite Fast Refresh compatibility)

// =============================================================================
// TAB CONFIG
// =============================================================================

type TabId = "schedule" | "roster" | "profile";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const TABS: Tab[] = [
  {
    id: "schedule",
    label: "Schedule",
    icon: Calendar,
    color: "primary",
    description: "Shift card display and view preferences",
  },
  {
    id: "roster",
    label: "Roster",
    icon: Users,
    color: "green",
    description: "Team list display and sorting options",
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    color: "amber",
    description: "Team member profile field visibility",
  },
];

// =============================================================================
// TOGGLE ROW COMPONENT
// =============================================================================

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  disabledReason,
}) => (
  <div
    className={`flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
      disabled ? "opacity-50" : "hover:bg-gray-800/30"
    }`}
  >
    <div className="flex-1 min-w-0 mr-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white">{label}</span>
        {disabled && disabledReason && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-500 uppercase tracking-wide">
            {disabledReason}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        disabled
          ? "cursor-not-allowed bg-gray-700"
          : checked
            ? "cursor-pointer bg-primary-500"
            : "cursor-pointer bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

// =============================================================================
// EMPLOYEE MATCHING TYPES & HELPERS
// =============================================================================

interface ChefLifeMember {
  id: string;
  first_name: string;
  last_name: string;
  punch_id: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  external_id: string | null;
  external_source: string | null;
}

type MatchType = 'exact' | 'suggested' | 'manual' | 'linked' | 'unmatched';

interface MatchCandidate {
  member: ChefLifeMember;
  matched7sUser: SevenShiftsUser | null;
  matchType: MatchType;
  confidence: number; // 0-100
  confirmed: boolean;
}

/** Normalize a name string for comparison */
function normalizeName(name: string): string {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Calculate similarity between two strings (0-100) */
function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  // Check if one contains the other (handles "Chef Steve" vs "Steve")
  if (na.includes(nb) || nb.includes(na)) return 75;
  // Simple character overlap ratio
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return Math.round((matches / longer.length) * 100);
}

/**
 * Match ChefLife members to 7shifts users.
 * Priority: already-linked > exact name > email > fuzzy name
 */
function buildMatches(
  members: ChefLifeMember[],
  sevenUsers: SevenShiftsUser[]
): MatchCandidate[] {
  const available7s = [...sevenUsers];
  const results: MatchCandidate[] = [];

  for (const member of members) {
    // Already linked?
    if (member.external_id) {
      const linked = available7s.find(u => String(u.id) === member.external_id);
      if (linked) {
        available7s.splice(available7s.indexOf(linked), 1);
        results.push({
          member,
          matched7sUser: linked,
          matchType: 'linked',
          confidence: 100,
          confirmed: true,
        });
        continue;
      }
    }

    // Exact name match
    const memberFull = normalizeName(`${member.first_name} ${member.last_name}`);
    const exactIdx = available7s.findIndex(u =>
      normalizeName(`${u.first_name} ${u.last_name}`) === memberFull
    );
    if (exactIdx >= 0) {
      const match = available7s.splice(exactIdx, 1)[0];
      results.push({
        member,
        matched7sUser: match,
        matchType: 'exact',
        confidence: 95,
        confirmed: false,
      });
      continue;
    }

    // Email match
    if (member.email) {
      const emailIdx = available7s.findIndex(u =>
        u.email && normalizeName(u.email) === normalizeName(member.email!)
      );
      if (emailIdx >= 0) {
        const match = available7s.splice(emailIdx, 1)[0];
        results.push({
          member,
          matched7sUser: match,
          matchType: 'exact',
          confidence: 90,
          confirmed: false,
        });
        continue;
      }
    }

    // Fuzzy name match — find best candidate above threshold
    let bestScore = 0;
    let bestIdx = -1;
    for (let i = 0; i < available7s.length; i++) {
      const u = available7s[i];
      const firstScore = nameSimilarity(member.first_name, u.first_name);
      const lastScore = nameSimilarity(member.last_name, u.last_name);
      // Weight: first_name and last_name both matter
      const combined = (firstScore * 0.4) + (lastScore * 0.6);
      if (combined > bestScore) {
        bestScore = combined;
        bestIdx = i;
      }
    }

    if (bestScore >= 60 && bestIdx >= 0) {
      const match = available7s.splice(bestIdx, 1)[0];
      results.push({
        member,
        matched7sUser: match,
        matchType: 'suggested',
        confidence: Math.round(bestScore),
        confirmed: false,
      });
    } else {
      results.push({
        member,
        matched7sUser: null,
        matchType: 'unmatched',
        confidence: 0,
        confirmed: false,
      });
    }
  }

  return results;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TeamSettings: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, securityLevel, user } = useAuth();
  const { showDiagnostics } = useDiagnostics();
  const [activeTab, setActiveTab] = useState<TabId>("schedule");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Config state
  const [config, setConfig] = useState<TeamModuleConfig>(DEFAULT_TEAM_CONFIG);
  const [savedConfig, setSavedConfig] = useState<TeamModuleConfig>(DEFAULT_TEAM_CONFIG);

  // 7shifts connection state (for roster sync indicator)
  const [is7shiftsConnected, setIs7shiftsConnected] = useState(false);

  // Team Performance module state (for tier toggle gating)
  const [perfModuleEnabled, setPerfModuleEnabled] = useState(false);

  // Employee matching state
  const [matchExpanded, setMatchExpanded] = useState(false);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isSavingMatches, setIsSavingMatches] = useState(false);
  const [unmatched7sUsers, setUnmatched7sUsers] = useState<SevenShiftsUser[]>([]);

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  // ── Load config ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!organizationId) return;
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("modules, integrations")
          .eq("id", organizationId)
          .single();

        if (error) throw error;

        // Load team config from scheduling module
        const moduleConfig = data?.modules?.scheduling?.config;
        if (moduleConfig) {
          const merged: TeamModuleConfig = {
            ...DEFAULT_TEAM_CONFIG,
            ...moduleConfig,
            card_display: {
              ...DEFAULT_TEAM_CONFIG.card_display,
              ...moduleConfig.card_display,
            },
            roster_display: {
              ...DEFAULT_TEAM_CONFIG.roster_display,
              ...moduleConfig.roster_display,
            },
          };
          setConfig(merged);
          setSavedConfig(merged);
        }

        // Check 7shifts connection (lives in organizations.integrations column, not modules)
        const sevenShifts = data?.integrations?.['7shifts'];
        setIs7shiftsConnected(sevenShifts?.status === 'active' && sevenShifts?.connected === true);

        // Check if Team Performance module is enabled
        const perfEnabled = data?.modules?.team_performance?.enabled ?? false;
        setPerfModuleEnabled(perfEnabled);
      } catch (err) {
        console.error("Error loading team config:", err);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [organizationId]);

  // ── Track changes ──────────────────────────────────────────────
  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(savedConfig));
  }, [config, savedConfig]);

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!organizationId || !user) return;
    setIsSaving(true);

    try {
      // Get current modules to merge
      const { data: orgData, error: fetchError } = await supabase
        .from("organizations")
        .select("modules")
        .eq("id", organizationId)
        .single();

      if (fetchError) throw fetchError;

      const currentModules = orgData?.modules || {};
      const updatedModules = {
        ...currentModules,
        scheduling: {
          ...currentModules.scheduling,
          config: config,
        },
      };

      const { error } = await supabase
        .from("organizations")
        .update({
          modules: updatedModules,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (error) throw error;

      setSavedConfig(config);
      setHasChanges(false);

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: "settings_changed",
        details: {
          module: "team",
          section: activeTab,
          changes: config,
        },
      });

      toast.success("Team settings saved");
    } catch (err) {
      console.error("Error saving team config:", err);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────
  const handleReset = () => {
    setConfig(savedConfig);
    setHasChanges(false);
  };

  // ── Card display helper ────────────────────────────────────────
  const updateCardDisplay = (key: keyof CardDisplayConfig, value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      card_display: { ...prev.card_display, [key]: value },
    }));
  };

  // ── Roster display helpers ─────────────────────────────────────
  const updateRosterDisplay = <K extends keyof RosterDisplayConfig>(
    key: K,
    value: RosterDisplayConfig[K]
  ) => {
    setConfig((prev) => ({
      ...prev,
      roster_display: { ...prev.roster_display, [key]: value },
    }));
  };

  const updateRosterToggle = (key: keyof RosterDisplayConfig, value: boolean) => {
    updateRosterDisplay(key, value as any);
  };

  // ── Employee matching workflow ──────────────────────────────────
  const runMatchPreview = async () => {
    if (!organizationId) return;
    setIsLoadingMatch(true);
    setMatchError(null);
    setMatchCandidates([]);
    setUnmatched7sUsers([]);

    try {
      // 1. Fetch ChefLife team members
      const { data: members, error: membersErr } = await supabase
        .from('organization_team_members')
        .select('id, first_name, last_name, punch_id, email, phone, is_active, external_id, external_source')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('last_name');

      if (membersErr) throw membersErr;

      // 2. Fetch 7shifts users
      const sevenUsers = await getUsersVault({
        organizationId,
        status: 'active',
      });

      // 3. Run matching algorithm
      const candidates = buildMatches(members || [], sevenUsers);
      setMatchCandidates(candidates);

      // 4. Track unmatched 7shifts users (in 7shifts but not in ChefLife)
      const matched7sIds = new Set(
        candidates
          .filter(c => c.matched7sUser)
          .map(c => c.matched7sUser!.id)
      );
      const remaining = sevenUsers.filter(u => !matched7sIds.has(u.id));
      setUnmatched7sUsers(remaining);

      const exactCount = candidates.filter(c => c.matchType === 'exact').length;
      const linkedCount = candidates.filter(c => c.matchType === 'linked').length;
      const suggestedCount = candidates.filter(c => c.matchType === 'suggested').length;
      const unmatchedCount = candidates.filter(c => c.matchType === 'unmatched').length;
      toast.success(
        `Match preview: ${linkedCount} linked, ${exactCount} exact, ${suggestedCount} suggested, ${unmatchedCount} unmatched`
      );
    } catch (err: any) {
      console.error('Employee matching failed:', err);
      setMatchError(err.message || 'Failed to load match data');
      toast.error('Failed to load match preview');
    } finally {
      setIsLoadingMatch(false);
    }
  };

  /** Toggle a candidate's confirmed status */
  const toggleConfirm = (idx: number) => {
    setMatchCandidates(prev => prev.map((c, i) =>
      i === idx ? { ...c, confirmed: !c.confirmed } : c
    ));
  };

  /** Manually assign a 7shifts user to an unmatched candidate */
  const manualAssign = (idx: number, user: SevenShiftsUser) => {
    setMatchCandidates(prev => prev.map((c, i) =>
      i === idx
        ? { ...c, matched7sUser: user, matchType: 'manual', confidence: 100, confirmed: true }
        : c
    ));
    // Remove from unmatched pool
    setUnmatched7sUsers(prev => prev.filter(u => u.id !== user.id));
  };

  /** Unlink a matched candidate (return 7shifts user to pool) */
  const unlinkMatch = (idx: number) => {
    const candidate = matchCandidates[idx];
    if (candidate?.matched7sUser) {
      setUnmatched7sUsers(prev => [...prev, candidate.matched7sUser!]);
    }
    setMatchCandidates(prev => prev.map((c, i) =>
      i === idx
        ? { ...c, matched7sUser: null, matchType: 'unmatched', confidence: 0, confirmed: false }
        : c
    ));
  };

  /** Save confirmed matches to database */
  const saveMatches = async () => {
    if (!organizationId || !user) return;
    setIsSavingMatches(true);

    try {
      const toSave = matchCandidates.filter(
        c => c.confirmed && c.matched7sUser && c.matchType !== 'linked'
      );

      if (toSave.length === 0) {
        toast('No new matches to save');
        setIsSavingMatches(false);
        return;
      }

      // Batch update each match
      for (const candidate of toSave) {
        const { error } = await supabase
          .from('organization_team_members')
          .update({
            external_id: String(candidate.matched7sUser!.id),
            external_source: '7shifts',
            external_data: candidate.matched7sUser as any,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', candidate.member.id);

        if (error) throw error;
      }

      // Mark all saved as 'linked' in local state
      setMatchCandidates(prev => prev.map(c =>
        c.confirmed && c.matched7sUser && c.matchType !== 'linked'
          ? { ...c, matchType: 'linked', member: { ...c.member, external_id: String(c.matched7sUser!.id) } }
          : c
      ));

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          module: 'team',
          action: 'employee_match',
          matched_count: toSave.length,
        },
      });

      toast.success(`${toSave.length} employee match${toSave.length === 1 ? '' : 'es'} saved`);
    } catch (err: any) {
      console.error('Error saving matches:', err);
      toast.error('Failed to save matches');
    } finally {
      setIsSavingMatches(false);
    }
  };

  const confirmedCount = matchCandidates.filter(c => c.confirmed && c.matchType !== 'linked').length;

  // ── Loading ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading team settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Diagnostics */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/TeamSettings/index.tsx
        </div>
      )}

      {/* ── L5 Header ───────────────────────────────────────────── */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/modules")}
              className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
              title="Back to Modules"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                The Team
              </h1>
              <p className="text-gray-400 text-sm">
                Schedule display, roster preferences, and profile settings
              </p>
            </div>
          </div>

          {/* Save / Reset */}
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="btn-ghost text-sm"
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`btn-primary text-sm ${
                !hasChanges ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-[#1a1f2b] rounded-lg">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? "bg-gray-800/80 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        {/* Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {/* Section: Shift Card Display */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-primary-400" />
                <h3 className="text-base font-semibold text-white">
                  Shift Card Display
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Control which data pills appear on each shift card in the
                schedule view. Changes apply to all users.
              </p>

              <div className="divide-y divide-gray-700/30 rounded-lg border border-gray-700/30">
                <ToggleRow
                  label="Shift Hours"
                  description="Duration of the individual shift (e.g. 5h, 8.5h)"
                  checked={config.card_display.show_shift_hours}
                  onChange={(v) => updateCardDisplay("show_shift_hours", v)}
                />
                <ToggleRow
                  label="Weekly Hours"
                  description="Total scheduled hours for this employee across the entire week"
                  checked={config.card_display.show_weekly_hours}
                  onChange={(v) => updateCardDisplay("show_weekly_hours", v)}
                />
                <ToggleRow
                  label="Department"
                  description="FOH or BOH badge derived from the shift role"
                  checked={config.card_display.show_department}
                  onChange={(v) => updateCardDisplay("show_department", v)}
                />
                <ToggleRow
                  label="Performance Tier"
                  description="Tier 1 / 2 / 3 badge from the Team Performance module"
                  checked={config.card_display.show_tier}
                  onChange={(v) => updateCardDisplay("show_tier", v)}
                  disabled={!perfModuleEnabled}
                  disabledReason={
                    !perfModuleEnabled ? "Module not active" : undefined
                  }
                />
                <ToggleRow
                  label="Break Duration"
                  description="Show break length when assigned (e.g. 30min break)"
                  checked={config.card_display.show_break_duration}
                  onChange={(v) => updateCardDisplay("show_break_duration", v)}
                />
                <ToggleRow
                  label="Notes"
                  description="Shift notes or special instructions from the schedule"
                  checked={config.card_display.show_notes}
                  onChange={(v) => updateCardDisplay("show_notes", v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Roster Tab */}
        {activeTab === "roster" && (
          <div className="space-y-6">
            {/* Section: Layout & Sorting */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-green-400" />
                <h3 className="text-base font-semibold text-white">
                  Layout & Sorting
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Control how the team roster is displayed and organized.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Layout */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Default Layout
                  </label>
                  <div className="inline-flex rounded-lg border border-gray-700/50 overflow-hidden text-xs">
                    {(['grid', 'list'] as const).map(layout => (
                      <button
                        key={layout}
                        onClick={() => updateRosterDisplay('layout', layout)}
                        className={`px-4 py-2 font-medium transition-colors capitalize ${
                          config.roster_display.layout === layout
                            ? 'bg-green-500/20 text-green-400'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                        }`}
                      >
                        {layout}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Group By */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Group By
                  </label>
                  <select
                    value={config.roster_display.group_by}
                    onChange={(e) => updateRosterDisplay('group_by', e.target.value as any)}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-green-500/50 cursor-pointer"
                  >
                    <option value="none">No Grouping</option>
                    <option value="department">Department (FOH / BOH)</option>
                    <option value="role">Role</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Sort By
                  </label>
                  <select
                    value={config.roster_display.sort_by}
                    onChange={(e) => updateRosterDisplay('sort_by', e.target.value as any)}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-green-500/50 cursor-pointer"
                  >
                    <option value="name">Name</option>
                    <option value="role">Role</option>
                    <option value="department">Department</option>
                    <option value="hire_date">Hire Date</option>
                  </select>
                </div>

                {/* Sort Direction */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Sort Direction
                  </label>
                  <div className="inline-flex rounded-lg border border-gray-700/50 overflow-hidden text-xs">
                    {([['asc', 'A → Z'], ['desc', 'Z → A']] as const).map(([dir, label]) => (
                      <button
                        key={dir}
                        onClick={() => updateRosterDisplay('sort_direction', dir)}
                        className={`px-4 py-2 font-medium transition-colors ${
                          config.roster_display.sort_direction === dir
                            ? 'bg-green-500/20 text-green-400'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Visible Fields */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-green-400" />
                <h3 className="text-base font-semibold text-white">
                  Roster Card Fields
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Control which information appears on each team member card in the roster view.
              </p>

              <div className="divide-y divide-gray-700/30 rounded-lg border border-gray-700/30">
                <ToggleRow
                  label="Email Address"
                  description="Show team member email on roster cards"
                  checked={config.roster_display.show_email}
                  onChange={(v) => updateRosterToggle('show_email', v)}
                />
                <ToggleRow
                  label="Phone Number"
                  description="Show phone number on roster cards"
                  checked={config.roster_display.show_phone}
                  onChange={(v) => updateRosterToggle('show_phone', v)}
                />
                <ToggleRow
                  label="Hire Date"
                  description="Show when the team member was hired"
                  checked={config.roster_display.show_hire_date}
                  onChange={(v) => updateRosterToggle('show_hire_date', v)}
                />
                <ToggleRow
                  label="Role"
                  description="Display assigned role(s) on roster cards"
                  checked={config.roster_display.show_role}
                  onChange={(v) => updateRosterToggle('show_role', v)}
                />
                <ToggleRow
                  label="Department"
                  description="Show FOH/BOH department assignment"
                  checked={config.roster_display.show_department}
                  onChange={(v) => updateRosterToggle('show_department', v)}
                />
                <ToggleRow
                  label="Active Status"
                  description="Show active/inactive badge on roster cards"
                  checked={config.roster_display.show_status}
                  onChange={(v) => updateRosterToggle('show_status', v)}
                />
              </div>
            </div>

            {/* Section: 7shifts Sync Status */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-green-400" />
                <h3 className="text-base font-semibold text-white">
                  Data Source
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                The roster can be enriched with data from your 7shifts integration.
              </p>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                is7shiftsConnected
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-gray-800/30 border-gray-700/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <img
                      src="https://framerusercontent.com/images/GTwNANjmDcbIsFhKyhhH32pNv4.png?scale-down-to=512"
                      alt="7shifts"
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      7shifts User Sync
                    </div>
                    <div className="text-xs text-gray-400">
                      {is7shiftsConnected
                        ? 'Connected — roster enrichment available'
                        : 'Not connected — roster uses manual data only'}
                    </div>
                  </div>
                </div>
                {is7shiftsConnected ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => navigate('/admin/integrations')}
                    className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                  >
                    Configure →
                  </button>
                )}
              </div>
            </div>

            {/* Section: Employee Data Matching (only when 7shifts connected) */}
            {is7shiftsConnected && (
              <div>
                <button
                  onClick={() => setMatchExpanded(!matchExpanded)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-green-400" />
                    <h3 className="text-base font-semibold text-white">
                      Employee Data Matching
                    </h3>
                    {matchCandidates.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400">
                        {matchCandidates.filter(c => c.matchType === 'linked').length}/
                        {matchCandidates.length} linked
                      </span>
                    )}
                  </div>
                  {matchExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-300" />
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Match ChefLife team members to their 7shifts profiles. This links
                  punch_id (your internal clock-in code) with the 7shifts user ID for
                  roster enrichment and sync.
                </p>

                {matchExpanded && (
                  <div className="space-y-4">
                    {/* Action bar */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={runMatchPreview}
                        disabled={isLoadingMatch}
                        className="btn-primary text-sm"
                      >
                        {isLoadingMatch ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-1.5" />
                        )}
                        {matchCandidates.length > 0 ? 'Refresh Match' : 'Preview Match'}
                      </button>

                      {confirmedCount > 0 && (
                        <button
                          onClick={saveMatches}
                          disabled={isSavingMatches}
                          className="btn-primary text-sm bg-green-600 hover:bg-green-500"
                        >
                          {isSavingMatches ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-1.5" />
                          )}
                          Save {confirmedCount} Match{confirmedCount === 1 ? '' : 'es'}
                        </button>
                      )}
                    </div>

                    {/* Error */}
                    {matchError && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {matchError}
                      </div>
                    )}

                    {/* Match results table */}
                    {matchCandidates.length > 0 && (
                      <div className="rounded-lg border border-gray-700/30 overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-800/50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                          <div className="col-span-4">ChefLife Member</div>
                          <div className="col-span-1 text-center">Punch ID</div>
                          <div className="col-span-1 text-center">Status</div>
                          <div className="col-span-4">7shifts Match</div>
                          <div className="col-span-2 text-right">Action</div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-gray-700/20">
                          {matchCandidates.map((candidate, idx) => {
                            const statusColors = {
                              linked: 'text-blue-400 bg-blue-500/10',
                              exact: 'text-green-400 bg-green-500/10',
                              suggested: 'text-amber-400 bg-amber-500/10',
                              manual: 'text-purple-400 bg-purple-500/10',
                              unmatched: 'text-gray-500 bg-gray-700/30',
                            };
                            const statusLabels = {
                              linked: 'Linked',
                              exact: 'Exact',
                              suggested: 'Fuzzy',
                              manual: 'Manual',
                              unmatched: 'None',
                            };

                            return (
                              <div
                                key={candidate.member.id}
                                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm transition-colors ${
                                  candidate.confirmed && candidate.matchType !== 'linked'
                                    ? 'bg-green-500/5'
                                    : 'hover:bg-gray-800/20'
                                }`}
                              >
                                {/* ChefLife member */}
                                <div className="col-span-4">
                                  <div className="text-white font-medium">
                                    {candidate.member.first_name} {candidate.member.last_name}
                                  </div>
                                  {candidate.member.email && (
                                    <div className="text-xs text-gray-500 truncate">
                                      {candidate.member.email}
                                    </div>
                                  )}
                                </div>

                                {/* Punch ID */}
                                <div className="col-span-1 text-center">
                                  <span className="text-xs font-mono text-gray-400 bg-gray-800/50 px-1.5 py-0.5 rounded">
                                    {candidate.member.punch_id || '—'}
                                  </span>
                                </div>

                                {/* Match status badge */}
                                <div className="col-span-1 text-center">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[candidate.matchType]}`}>
                                    {statusLabels[candidate.matchType]}
                                    {candidate.matchType === 'suggested' && ` ${candidate.confidence}%`}
                                  </span>
                                </div>

                                {/* 7shifts user */}
                                <div className="col-span-4">
                                  {candidate.matched7sUser ? (
                                    <div>
                                      <div className="text-white">
                                        {candidate.matched7sUser.first_name} {candidate.matched7sUser.last_name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        7s ID: {candidate.matched7sUser.id}
                                        {candidate.matched7sUser.email && ` • ${candidate.matched7sUser.email}`}
                                      </div>
                                    </div>
                                  ) : (
                                    /* Manual assignment dropdown for unmatched */
                                    unmatched7sUsers.length > 0 ? (
                                      <select
                                        value=""
                                        onChange={(e) => {
                                          const userId = parseInt(e.target.value);
                                          const user7s = unmatched7sUsers.find(u => u.id === userId);
                                          if (user7s) manualAssign(idx, user7s);
                                        }}
                                        className="bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1 text-xs text-gray-400 w-full focus:outline-none focus:border-green-500/50"
                                      >
                                        <option value="">Assign manually…</option>
                                        {unmatched7sUsers.map(u => (
                                          <option key={u.id} value={u.id}>
                                            {u.first_name} {u.last_name} (ID: {u.id})
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className="text-xs text-gray-600 italic">No match found</span>
                                    )
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex items-center justify-end gap-1">
                                  {candidate.matchType === 'linked' ? (
                                    <span className="text-xs text-blue-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Saved
                                    </span>
                                  ) : candidate.matched7sUser ? (
                                    <>
                                      <button
                                        onClick={() => toggleConfirm(idx)}
                                        className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                                          candidate.confirmed
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-gray-700/50 text-gray-400 hover:text-white border border-gray-700/50 hover:border-gray-600'
                                        }`}
                                      >
                                        {candidate.confirmed ? '✓ Confirmed' : 'Confirm'}
                                      </button>
                                      <button
                                        onClick={() => unlinkMatch(idx)}
                                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                        title="Remove match"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Summary footer */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/30 border-t border-gray-700/30">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              <span className="text-blue-400 font-medium">
                                {matchCandidates.filter(c => c.matchType === 'linked').length}
                              </span> linked
                            </span>
                            <span>
                              <span className="text-green-400 font-medium">
                                {matchCandidates.filter(c => c.matchType === 'exact').length}
                              </span> exact
                            </span>
                            <span>
                              <span className="text-amber-400 font-medium">
                                {matchCandidates.filter(c => c.matchType === 'suggested').length}
                              </span> suggested
                            </span>
                            <span>
                              <span className="text-gray-400 font-medium">
                                {matchCandidates.filter(c => c.matchType === 'unmatched').length}
                              </span> unmatched
                            </span>
                          </div>
                          {unmatched7sUsers.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {unmatched7sUsers.length} 7shifts user{unmatched7sUsers.length === 1 ? '' : 's'} not in ChefLife
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {!isLoadingMatch && matchCandidates.length === 0 && !matchError && (
                      <div className="text-center py-8 text-sm text-gray-500">
                        Click <strong>Preview Match</strong> to compare your ChefLife roster with 7shifts users.
                        No changes are made until you confirm and save.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Profile Settings
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Team member profile field visibility, required fields, and default
              profile layout will be configured here.
            </p>
            <span className="mt-4 text-xs px-3 py-1 rounded-full bg-gray-700/50 text-gray-400">
              Coming Soon
            </span>
          </div>
        )}
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-500/20 border border-amber-500/30 rounded-lg px-4 py-2 text-sm text-amber-400 shadow-lg backdrop-blur-sm z-50">
          You have unsaved changes
        </div>
      )}
    </div>
  );
};
