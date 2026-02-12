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
import {
  getUsersVault,
  getUserWagesVault,
  getRolesVault,
  type SevenShiftsUser,
  type SevenShiftsWage,
  type SevenShiftsWageResponse,
} from "@/lib/7shifts";
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

interface VerificationState {
  identity: boolean;
  roles: boolean;
  wages: boolean;
}

interface MatchCandidate {
  member: ChefLifeMember;
  matched7sUser: SevenShiftsUser | null;
  matchType: MatchType;
  confidence: number; // 0-100
  verified: VerificationState;
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
          verified: { identity: true, roles: true, wages: true },
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
        verified: { identity: false, roles: false, wages: false },
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
          verified: { identity: false, roles: false, wages: false },
        });
        continue;
      }
    }

    // Fuzzy name match â€” find best candidate above threshold
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
        verified: { identity: false, roles: false, wages: false },
      });
    } else {
      results.push({
        member,
        matched7sUser: null,
        matchType: 'unmatched',
        confidence: 0,
        verified: { identity: false, roles: false, wages: false },
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

  // Wage expansion state (expandable row â€” privacy by design)
  const [expandedWageRows, setExpandedWageRows] = useState<Set<string>>(new Set());
  const [wageCache, setWageCache] = useState<Record<string, {
    loading: boolean;
    error: string | null;
    data: SevenShiftsWageResponse | null;
  }>>({});
  const [roleNameMap, setRoleNameMap] = useState<Record<number, string>>({});

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  // â”€â”€ Load config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Track changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(savedConfig));
  }, [config, savedConfig]);

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Reset â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleReset = () => {
    setConfig(savedConfig);
    setHasChanges(false);
  };

  // â”€â”€ Card display helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const updateCardDisplay = (key: keyof CardDisplayConfig, value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      card_display: { ...prev.card_display, [key]: value },
    }));
  };

  // â”€â”€ Roster display helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Employee matching workflow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  /** Helper: check if a candidate is fully verified (all 3 steps) */
  const isFullyVerified = (c: MatchCandidate): boolean =>
    c.verified.identity && c.verified.roles && c.verified.wages;

  /** Helper: count verified steps for a candidate */
  const verifiedStepCount = (c: MatchCandidate): number =>
    [c.verified.identity, c.verified.roles, c.verified.wages].filter(Boolean).length;

  /** Toggle a specific verification step for a candidate */
  const toggleVerification = (idx: number, step: keyof VerificationState) => {
    setMatchCandidates(prev => prev.map((c, i) =>
      i === idx
        ? { ...c, verified: { ...c.verified, [step]: !c.verified[step] } }
        : c
    ));
  };

  /** Manually assign a 7shifts user to an unmatched candidate */
  const manualAssign = (idx: number, user: SevenShiftsUser) => {
    setMatchCandidates(prev => prev.map((c, i) =>
      i === idx
        ? { ...c, matched7sUser: user, matchType: "manual", confidence: 100, verified: { identity: true, roles: false, wages: false } }
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
        ? { ...c, matched7sUser: null, matchType: "unmatched", confidence: 0, verified: { identity: false, roles: false, wages: false } }
        : c
    ));
  };

  /** Save fully-verified matches (3/3) to database */
  const saveMatches = async () => {
    if (!organizationId || !user) return;
    setIsSavingMatches(true);

    try {
      const toSave = matchCandidates.filter(
        c => isFullyVerified(c) && c.matched7sUser && c.matchType !== "linked"
      );

      if (toSave.length === 0) {
        toast("No fully-verified matches to save (need 3/3)");
        setIsSavingMatches(false);
        return;
      }

      // Batch update each match
      for (const candidate of toSave) {
        const { error } = await supabase
          .from("organization_team_members")
          .update({
            external_id: String(candidate.matched7sUser!.id),
            external_source: "7shifts",
            external_data: candidate.matched7sUser as any,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", candidate.member.id);

        if (error) throw error;
      }

      // Mark all saved as linked in local state
      setMatchCandidates(prev => prev.map(c =>
        isFullyVerified(c) && c.matched7sUser && c.matchType !== "linked"
          ? { ...c, matchType: "linked" as MatchType, member: { ...c.member, external_id: String(c.matched7sUser!.id) } }
          : c
      ));

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: "settings_changed",
        details: {
          module: "team",
          action: "employee_match_3step",
          matched_count: toSave.length,
        },
      });

      toast.success(`${toSave.length} employee match${toSave.length === 1 ? "" : "es"} saved (3/3 verified)`);
    } catch (err: any) {
      console.error("Error saving matches:", err);
      toast.error("Failed to save matches");
    } finally {
      setIsSavingMatches(false);
    }
  };

  const fullyVerifiedCount = matchCandidates.filter(c => isFullyVerified(c) && c.matchType !== "linked").length;
  const partiallyVerifiedCount = matchCandidates.filter(c => verifiedStepCount(c) > 0 && !isFullyVerified(c) && c.matchType !== "linked").length;

  // â”€â”€ Wage row expand/collapse (lazy load on first expand) â”€â”€â”€â”€â”€
  const toggleWageRow = async (memberId: string, sevenShiftsUserId: number) => {
    const newExpanded = new Set(expandedWageRows);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
      setExpandedWageRows(newExpanded);
      return;
    }
    newExpanded.add(memberId);
    setExpandedWageRows(newExpanded);

    // Already cached? Don't re-fetch
    if (wageCache[memberId]?.data) return;

    // Fetch wages on-demand
    if (!organizationId) return;
    setWageCache(prev => ({ ...prev, [memberId]: { loading: true, error: null, data: null } }));

    try {
      // Fetch roles map if we don't have it yet (one-time)
      if (Object.keys(roleNameMap).length === 0) {
        try {
          const roles = await getRolesVault({ organizationId });
          const map: Record<number, string> = {};
          for (const r of roles) { map[r.id] = r.name || `Role ${r.id}`; }
          setRoleNameMap(map);
        } catch {
          // Non-fatal â€” we'll show role IDs instead of names
        }
      }

      const wages = await getUserWagesVault({
        organizationId,
        userId: sevenShiftsUserId,
      });
      setWageCache(prev => ({ ...prev, [memberId]: { loading: false, error: null, data: wages } }));
    } catch (err: any) {
      console.error(`Failed to fetch wages for user ${sevenShiftsUserId}:`, err);
      setWageCache(prev => ({ ...prev, [memberId]: { loading: false, error: err.message || 'Failed to load wages', data: null } }));
    }
  };

  /** Format wage_cents to dollar string */
  const formatWage = (cents: number): string => {
    const dollars = (cents / 100).toFixed(2);
    return "\u0024" + dollars;
  };

  // â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      {/* â”€â”€ L5 Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ Tab Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ Tab Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    {([['asc', 'A â†’ Z'], ['desc', 'Z â†’ A']] as const).map(([dir, label]) => (
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
                        ? 'Connected â€” roster enrichment available'
                        : 'Not connected â€” roster uses manual data only'}
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
                    Configure â†’
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

                      {(fullyVerifiedCount > 0 || partiallyVerifiedCount > 0) && (
                        <div className="flex items-center gap-3">
                          {partiallyVerifiedCount > 0 && (
                            <span className="text-xs text-amber-400">
                              {partiallyVerifiedCount} in progress
                            </span>
                          )}
                          <button
                            onClick={saveMatches}
                            disabled={isSavingMatches || fullyVerifiedCount === 0}
                            className={`btn-primary text-sm ${fullyVerifiedCount > 0 ? "bg-green-600 hover:bg-green-500" : "opacity-50 cursor-not-allowed"}`}
                          >
                            {isSavingMatches ? (
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-1.5" />
                            )}
                            Save {fullyVerifiedCount} Verified Match{fullyVerifiedCount === 1 ? "" : "es"}
                          </button>
                        </div>
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

                            const isLinked = candidate.matchType === "linked";
                            const canExpand = !!candidate.matched7sUser && (
                              isLinked ||
                              candidate.matchType === "exact" ||
                              candidate.matchType === "manual" ||
                              candidate.matchType === "suggested" ||
                              verifiedStepCount(candidate) > 0
                            );
                            const isExpanded = expandedWageRows.has(candidate.member.id);
                            const wageState = wageCache[candidate.member.id];
                            const stepCount = verifiedStepCount(candidate);
                            const fullyDone = isFullyVerified(candidate);

                            return (
                              <div key={candidate.member.id}>
                              <div
                                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm transition-colors ${
                                  fullyDone && candidate.matchType !== "linked"
                                    ? "bg-green-500/5"
                                    : stepCount > 0 && candidate.matchType !== "linked"
                                      ? "bg-amber-500/5"
                                      : canExpand
                                        ? "hover:bg-gray-800/30 cursor-pointer"
                                        : "hover:bg-gray-800/20"
                                } ${isExpanded ? "bg-gray-800/20" : ""}`}
                                onClick={canExpand ? () => toggleWageRow(candidate.member.id, candidate.matched7sUser!.id) : undefined}
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
                                    {candidate.member.punch_id || 'â€”'}
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
                                        {candidate.matched7sUser.email && ` â€¢ ${candidate.matched7sUser.email}`}
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
                                        <option value="">Assign manuallyâ€¦</option>
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

                                {/* Actions + Verification Progress */}
                                <div className="col-span-2 flex items-center justify-end gap-1">
                                  {candidate.matchType === "linked" ? (
                                    <span className="text-xs text-blue-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      3/3
                                      {canExpand && (
                                        <ChevronDown className={`w-3.5 h-3.5 ml-1 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                      )}
                                    </span>
                                  ) : candidate.matched7sUser ? (
                                    <>
                                      {/* Verification progress pill */}
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                        fullyDone
                                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                          : stepCount > 0
                                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                            : "bg-gray-700/50 text-gray-500"
                                      }`}>
                                        {stepCount}/3
                                      </span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); unlinkMatch(idx); }}
                                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                        title="Remove match"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                      {canExpand && (
                                        <ChevronDown className={`w-3.5 h-3.5 ml-0.5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                      )}
                                    </>
                                  ) : null}
                                </div>
                              </div>

                              {/* === 3-Step Verification Panel === */}
                              {isExpanded && canExpand && (
                                <div className="border-t border-gray-700/20 bg-gray-800/10">

                                  {/* Step 1: Identity */}
                                  <div className="px-4 py-3 border-b border-gray-700/10">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                          candidate.verified.identity
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-gray-700/50 text-gray-500 border border-gray-600/30"
                                        }`}>1</span>
                                        <span className="text-xs font-medium text-white">Confirm Identity</span>
                                        <span className="text-[10px] text-gray-500">
                                          {candidate.matched7sUser ? `${candidate.matched7sUser.first_name} ${candidate.matched7sUser.last_name} (7s ID: ${candidate.matched7sUser.id})` : ""}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleVerification(idx, "identity"); }}
                                        className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                                          candidate.verified.identity
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-gray-700/50 text-gray-400 hover:text-white border border-gray-700/50 hover:border-gray-600"
                                        }`}
                                      >
                                        {candidate.verified.identity ? "\u2713 Verified" : "Verify"}
                                      </button>
                                    </div>
                                    {candidate.matched7sUser?.email && (
                                      <div className="ml-7 mt-1 text-[11px] text-gray-500">
                                        {candidate.matched7sUser.email}
                                        {candidate.matched7sUser.mobile_phone ? ` \u00B7 ${candidate.matched7sUser.mobile_phone}` : ""}
                                      </div>
                                    )}
                                  </div>

                                  {/* Step 2: Roles */}
                                  <div className="px-4 py-3 border-b border-gray-700/10">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                          candidate.verified.roles
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-gray-700/50 text-gray-500 border border-gray-600/30"
                                        }`}>2</span>
                                        <span className="text-xs font-medium text-white">Confirm Roles</span>
                                        {candidate.matched7sUser?.type && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                            {candidate.matched7sUser.type}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleVerification(idx, "roles"); }}
                                        className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                                          candidate.verified.roles
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-gray-700/50 text-gray-400 hover:text-white border border-gray-700/50 hover:border-gray-600"
                                        }`}
                                      >
                                        {candidate.verified.roles ? "\u2713 Verified" : "Verify"}
                                      </button>
                                    </div>
                                    <div className="ml-7 mt-1 text-[11px] text-gray-500 italic">
                                      Role assignments from 7shifts will be used for scheduling sync
                                    </div>
                                  </div>

                                  {/* Step 3: Wages */}
                                  <div className="px-4 py-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                          candidate.verified.wages
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-gray-700/50 text-gray-500 border border-gray-600/30"
                                        }`}>3</span>
                                        <span className="text-xs font-medium text-white">Confirm Wages</span>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleVerification(idx, "wages"); }}
                                        className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                                          candidate.verified.wages
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-gray-700/50 text-gray-400 hover:text-white border border-gray-700/50 hover:border-gray-600"
                                        }`}
                                      >
                                        {candidate.verified.wages ? "\u2713 Verified" : "Verify"}
                                      </button>
                                    </div>

                                    {/* Wage detail â€” lazy loaded */}
                                    <div className="ml-7 mt-2">
                                      {wageState?.loading ? (
                                        <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                          Loading wages...
                                        </div>
                                      ) : wageState?.error ? (
                                        <div className="flex items-center gap-2 text-xs text-red-400 py-1">
                                          <AlertCircle className="w-3 h-3" />
                                          {wageState.error}
                                        </div>
                                      ) : wageState?.data ? (
                                        <div className="space-y-2">
                                          {wageState.data.current_wages.length > 0 ? (
                                            <div className="grid gap-1">
                                              {wageState.data.current_wages.map((w, wi) => (
                                                <div key={wi} className="flex items-center gap-3 text-xs bg-gray-800/30 rounded px-3 py-1.5">
                                                  <span className="text-white font-medium tabular-nums">{formatWage(w.wage_cents)}</span>
                                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${w.wage_type === "hourly" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                                                    {w.wage_type === "hourly" ? "/hr" : "salary"}
                                                  </span>
                                                  {w.role_id ? (
                                                    <span className="text-gray-400">{roleNameMap[w.role_id] || `Role #${w.role_id}`}</span>
                                                  ) : (
                                                    <span className="text-gray-500 italic">All roles</span>
                                                  )}
                                                  <span className="text-gray-600 ml-auto">eff. {w.effective_date}</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-[11px] text-gray-600 italic">No current wages in 7shifts</div>
                                          )}
                                          {wageState.data.upcoming_wages.length > 0 && (
                                            <div>
                                              <div className="text-[10px] uppercase tracking-wide text-amber-500/70 mb-1 font-medium">Upcoming</div>
                                              <div className="grid gap-1">
                                                {wageState.data.upcoming_wages.map((w, wi) => (
                                                  <div key={wi} className="flex items-center gap-3 text-xs bg-amber-500/5 border border-amber-500/10 rounded px-3 py-1.5">
                                                    <span className="text-amber-300 font-medium tabular-nums">{formatWage(w.wage_cents)}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${w.wage_type === "hourly" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                                                      {w.wage_type === "hourly" ? "/hr" : "salary"}
                                                    </span>
                                                    {w.role_id ? (
                                                      <span className="text-gray-400">{roleNameMap[w.role_id] || `Role #${w.role_id}`}</span>
                                                    ) : (
                                                      <span className="text-gray-500 italic">All roles</span>
                                                    )}
                                                    <span className="text-amber-500/50 ml-auto">starts {w.effective_date}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-gray-600 italic">Expand to load wage data</div>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              )}
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
