import React, { useState } from "react";
import {
  History,
  Clock,
  User,
  FileEdit,
  CheckCircle,
  Archive,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Lock,
  Shield,
  ArrowUpCircle,
  GitBranch,
  ClipboardCheck,
} from "lucide-react";
import type { Recipe } from "../../types/recipe";
import { useAuth } from "@/hooks/useAuth";
import { useUserNameMapping } from "@/hooks/useUserNameMapping";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useRecipeChangeDetection, type BumpTier } from "./useRecipeChangeDetection";
import toast from "react-hot-toast";

// ============================================================================
// VERSION HISTORY — Layer 3 of 7-Layer Allergen Integration
// ============================================================================
// Session 77: Separated Recipe Status (workflow) from Version History (audit).
//
// Two questions, two cards:
//   STATUS  → "Is this recipe ready for the kitchen?"
//   VERSION → "What changed and when?"
//
// The Pending Changes panel stays at the top — it's the action item.
// Status and Version are peers below it, each with a clear purpose.
// ============================================================================

interface VersionHistoryProps {
  recipe: Recipe | Omit<Recipe, "id">;
  onChange: (updates: Partial<Recipe>) => void;
  lastSavedRecipe?: Recipe | Omit<Recipe, "id"> | null;
  onVersionCreated?: () => void;
}

interface VersionEntry {
  version: string;
  date: string;
  changedBy: string;
  notes?: string;
  status: "draft" | "review" | "approved" | "archived";
  bumpType?: "patch" | "minor" | "major";
}

// Tier display configuration — colors, labels, communication levels
const TIER_CONFIG: Record<BumpTier, {
  label: string;
  communication: string;
  colorBorder: string;
  colorBg: string;
  colorText: string;
  colorBadge: string;
  buttonClass: string;
  buttonDisabledClass: string;
}> = {
  patch: {
    label: "Patch",
    communication: "Trust management — silent",
    colorBorder: "border-gray-700/50",
    colorBg: "bg-gray-800/50",
    colorText: "text-gray-400",
    colorBadge: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    buttonClass: "bg-gray-600 hover:bg-gray-500 text-white",
    buttonDisabledClass: "bg-gray-700 text-gray-500 cursor-not-allowed",
  },
  minor: {
    label: "Minor",
    communication: "Broadcast review — team notified",
    colorBorder: "border-amber-500/30",
    colorBg: "bg-amber-500/10",
    colorText: "text-amber-400",
    colorBadge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    buttonClass: "bg-amber-600 hover:bg-amber-500 text-white",
    buttonDisabledClass: "bg-gray-700 text-gray-500 cursor-not-allowed",
  },
  major: {
    label: "Major",
    communication: "Mandatory meeting + re-acknowledgment",
    colorBorder: "border-rose-500/30",
    colorBg: "bg-rose-500/10",
    colorText: "text-rose-400",
    colorBadge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    buttonClass: "bg-rose-600 hover:bg-rose-500 text-white",
    buttonDisabledClass: "bg-gray-700 text-gray-500 cursor-not-allowed",
  },
};

const TIER_RANK: Record<BumpTier, number> = { patch: 0, minor: 1, major: 2 };

// ============================================================================
// STATUS HELPERS
// ============================================================================

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    activeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: FileEdit,
    description: "Being developed and tested. Not ready for kitchen use.",
  },
  review: {
    label: "Review",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    activeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Info,
    description: "Ready for review by management or head chef.",
  },
  approved: {
    label: "Approved",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    activeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: CheckCircle,
    description: "Finalized and approved for kitchen production.",
  },
  archived: {
    label: "Archived",
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/20",
    activeBg: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    icon: Archive,
    description: "No longer in active use but kept for reference.",
  },
} as const;

type RecipeStatus = keyof typeof STATUS_CONFIG;

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  recipe,
  onChange,
  lastSavedRecipe = null,
  onVersionCreated,
}) => {
  const { user } = useAuth();
  const { getUserName } = useUserNameMapping();
  const { showDiagnostics } = useDiagnostics();
  const [showStatusConfirm, setShowStatusConfirm] = useState<string | null>(null);
  const [changesExpanded, setChangesExpanded] = useState(true);
  const [versionNotes, setVersionNotes] = useState("");
  const [selectedTier, setSelectedTier] = useState<BumpTier | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // ============================================================================
  // CHANGE DETECTION — Layer 3 core
  // ============================================================================
  const detection = useRecipeChangeDetection(recipe, lastSavedRecipe);

  // Effective tier = operator's selection (if valid) or auto-suggestion
  const effectiveTier: BumpTier = selectedTier || detection.suggestedTier;
  const tierConfig = TIER_CONFIG[effectiveTier];

  // ============================================================================
  // VERSION PARSING
  // ============================================================================
  const normalizeVersion = (v: string): string => {
    const parts = v.split(".").map((p) => parseInt(p) || 0);
    while (parts.length < 3) parts.push(0);
    return parts.slice(0, 3).join(".");
  };

  const currentVersion = normalizeVersion(recipe.version || "1.0.0");
  const [major, minor, patch] = currentVersion.split(".").map(Number);

  const nextPatchVersion = `${major}.${minor}.${patch + 1}`;
  const nextMinorVersion = `${major}.${minor + 1}.0`;
  const nextMajorVersion = `${major + 1}.0.0`;

  const getNextVersion = (tier: BumpTier): string => {
    switch (tier) {
      case "major": return nextMajorVersion;
      case "minor": return nextMinorVersion;
      case "patch": return nextPatchVersion;
    }
  };

  // Version history from recipe
  const versionHistory: VersionEntry[] = (recipe.versions || []).map((v: any) => ({
    version: normalizeVersion(v.version || "1.0.0"),
    date: v.date,
    changedBy: v.changedBy,
    notes: v.notes,
    status: v.status || "archived",
    bumpType: v.bumpType,
  }));

  // Current status config
  const currentStatus = (recipe.status || "draft") as RecipeStatus;
  const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  // ============================================================================
  // VERSION ACTIONS
  // ============================================================================

  const handleTierSelect = (tier: BumpTier) => {
    if (detection.hasSafetyFloor && TIER_RANK[tier] < TIER_RANK[detection.minimumTier]) {
      return;
    }
    setSelectedTier(tier);
  };

  const createNewVersion = () => {
    const newVersion = getNextVersion(effectiveTier);

    const currentVersionEntry = {
      version: currentVersion,
      date: recipe.updated_at || new Date().toISOString(),
      changedBy: recipe.modified_by || user?.id,
      notes: versionNotes,
      status: recipe.status,
      bumpType: effectiveTier,
    };

    const updates: Partial<Recipe> = {
      version: newVersion,
      versions: [currentVersionEntry, ...(recipe.versions || [])],
      modified_by: user?.id,
      updated_at: new Date().toISOString(),
    };

    if (effectiveTier !== "patch") {
      updates.status = "draft";
    }

    onChange(updates);
    setVersionNotes("");
    setSelectedTier(null);
    onVersionCreated?.();

    const tierLabel =
      effectiveTier === "major" ? "Mandatory meeting required"
      : effectiveTier === "minor" ? "Team will be notified"
      : "Silent update";
    toast.success(`Version ${newVersion} created — ${tierLabel}`);
  };

  // ============================================================================
  // STATUS ACTIONS
  // ============================================================================

  const handleStatusChange = (newStatus: string) => {
    setShowStatusConfirm(newStatus);
  };

  const confirmStatusChange = () => {
    if (!showStatusConfirm) return;
    const statusUpdates: Partial<Recipe> = { status: showStatusConfirm };

    if (showStatusConfirm === "approved") {
      statusUpdates.approved_by = user?.id;
      statusUpdates.approved_at = new Date().toISOString();
    } else if (showStatusConfirm === "review") {
      statusUpdates.last_reviewed_by = user?.id;
      statusUpdates.last_reviewed_at = new Date().toISOString();
    }
    statusUpdates.modified_by = user?.id;
    statusUpdates.updated_at = new Date().toISOString();

    onChange(statusUpdates);
    setShowStatusConfirm(null);
    toast.success(`Recipe status changed to ${showStatusConfirm}`);
  };

  // Can the commit button be pressed?
  const canCommit =
    detection.hasChanges &&
    (effectiveTier !== "major" || versionNotes.trim().length > 0);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="space-y-8">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeEditor/VersionHistory.tsx
        </div>
      )}

      {/* ================================================================== */}
      {/* L5 HEADER CARD                                                     */}
      {/* ================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <History className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Version & Status</h1>
              <p className="text-gray-400 text-sm">Recipe lifecycle and change history</p>
            </div>
          </div>

          {/* Expandable Info Section */}
          <div className={`expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">About Version & Status</span>
              </div>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-4">
                <p className="text-sm text-gray-400">
                  Every recipe change in ChefLife is tracked with a version number and a communication tier.
                  The system automatically detects what changed, suggests the right tier, and logs everything
                  so your team always knows what's current.
                </p>

                {/* Three-column explainer cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Versioning */}
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2 mb-1.5">
                      <GitBranch className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-purple-400">Versioning</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Patch changes are silent. Minor changes notify the team to review. Major changes require a mandatory meeting and re-acknowledgment.
                    </p>
                  </div>

                  {/* Status Workflow */}
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2 mb-1.5">
                      <ClipboardCheck className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Status Workflow</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Recipes move from Draft through Review to Approved for kitchen production. Archived recipes are retired but kept for reference.
                    </p>
                  </div>

                  {/* Safety Floor */}
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Shield className="w-4 h-4 text-rose-400" />
                      <span className="text-sm font-medium text-rose-400">Safety Floor</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      When a CONTAINS allergen is added or removed, the version tier locks to Major. This cannot be overridden — customer safety is non-negotiable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* PENDING CHANGES PANEL — The heart of Layer 3                       */}
      {/* Always visible. Not a modal. Not dismissable. The truth.           */}
      {/* ================================================================== */}
      <div
        className={`rounded-2xl border-2 transition-colors duration-300 ${
          detection.hasChanges
            ? `${tierConfig.colorBorder} ${tierConfig.colorBg}`
            : "border-gray-700/30 bg-gray-800/30"
        }`}
      >
        {/* Panel Header */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  detection.hasChanges
                    ? detection.hasSafetyFloor
                      ? "bg-rose-500/20"
                      : effectiveTier === "minor"
                        ? "bg-amber-500/20"
                        : "bg-gray-700/50"
                    : "bg-gray-700/50"
                }`}
              >
                {detection.hasSafetyFloor ? (
                  <Shield className="w-5 h-5 text-rose-400" />
                ) : detection.hasChanges ? (
                  <ArrowUpCircle className={`w-5 h-5 ${tierConfig.colorText}`} />
                ) : (
                  <CheckCircle className="w-5 h-5 text-gray-500" />
                )}
              </div>

              {detection.hasChanges ? (
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Pending Changes
                    <span className={`ml-2 text-sm font-normal ${tierConfig.colorText}`}>
                      ({detection.changes.length})
                    </span>
                  </h3>
                  <p className={`text-sm ${tierConfig.colorText}`}>
                    {detection.tierReason}
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-base font-medium text-gray-400">
                    No changes since v{currentVersion}
                  </h3>
                </div>
              )}
            </div>

            {detection.hasChanges && (
              <button
                onClick={() => setChangesExpanded(!changesExpanded)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                {changesExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Detected Changes List */}
        {detection.hasChanges && changesExpanded && (
          <div className="px-5 pb-2">
            <div className="space-y-1.5">
              {detection.changes.map((change) => {
                const changeTierConfig = TIER_CONFIG[change.suggestedTier];
                return (
                  <div
                    key={change.id}
                    className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg bg-black/20"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {change.isSafetyFloor && (
                        <Shield className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm text-gray-200 leading-relaxed">
                        {change.description}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${changeTierConfig.colorBadge}`}
                    >
                      {changeTierConfig.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Safety Floor Warning */}
        {detection.hasChanges && detection.hasSafetyFloor && (
          <div className="mx-5 mb-3 mt-1 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-300">
                  Allergen safety floor — cannot downgrade below {TIER_CONFIG[detection.minimumTier].label}
                </p>
                <p className="text-xs text-rose-400/70 mt-1">
                  A CONTAINS allergen was added or removed. This requires mandatory team communication.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tier Selector + Commit */}
        {detection.hasChanges && (
          <div className="px-5 pb-5 pt-2 space-y-4">
            <div className="border-t border-white/5" />

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Communication Tier
              </label>
              <div className="flex gap-2">
                {(["patch", "minor", "major"] as BumpTier[]).map((tier) => {
                  const config = TIER_CONFIG[tier];
                  const isSelected = effectiveTier === tier;
                  const isLocked =
                    detection.hasSafetyFloor &&
                    TIER_RANK[tier] < TIER_RANK[detection.minimumTier];
                  const isSuggested = tier === detection.suggestedTier;

                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleTierSelect(tier)}
                      disabled={isLocked}
                      className={`
                        relative flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200
                        min-h-[44px] text-center
                        ${isLocked
                          ? "border-gray-700/30 bg-gray-800/30 opacity-40 cursor-not-allowed"
                          : isSelected
                            ? `${config.colorBorder} ${config.colorBg}`
                            : "border-gray-700/50 bg-gray-800/50 hover:border-gray-600"
                        }
                      `}
                    >
                      {isLocked && (
                        <Lock className="w-3.5 h-3.5 text-gray-600 absolute top-2 right-2" />
                      )}
                      <div className={`text-lg font-bold font-mono ${isSelected ? config.colorText : isLocked ? "text-gray-600" : "text-gray-400"}`}>
                        {getNextVersion(tier)}
                      </div>
                      <div className={`text-xs font-medium mt-0.5 ${isSelected ? config.colorText : isLocked ? "text-gray-600" : "text-gray-500"}`}>
                        {config.label}
                      </div>
                      <div className={`text-[10px] mt-1 ${isSelected ? config.colorText : isLocked ? "text-gray-700" : "text-gray-600"}`}>
                        {config.communication}
                      </div>
                      {isSuggested && !isLocked && (
                        <div className={`mt-2 text-[10px] font-medium ${config.colorText} flex items-center justify-center gap-1`}>
                          <ArrowUpCircle className="w-3 h-3" />
                          Suggested
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Change Notes
                {effectiveTier === "major" && (
                  <span className="text-rose-400 ml-1 normal-case tracking-normal">(required for Major)</span>
                )}
              </label>
              <textarea
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                className="w-full h-20 px-4 py-3 rounded-xl bg-gray-900/80 border border-gray-700/50 text-gray-200 text-sm placeholder-gray-600 resize-none focus:outline-none focus:border-gray-600 transition-colors"
                placeholder={
                  effectiveTier === "patch"
                    ? "What was clarified or corrected..."
                    : effectiveTier === "minor"
                      ? "What changed and why the team should know..."
                      : "What changed — this will be shared in the mandatory team meeting..."
                }
              />
            </div>

            <button
              onClick={createNewVersion}
              disabled={!canCommit}
              className={`
                w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200
                min-h-[44px]
                ${canCommit ? tierConfig.buttonClass : tierConfig.buttonDisabledClass}
              `}
            >
              Create v{getNextVersion(effectiveTier)} —{" "}
              {effectiveTier === "patch"
                ? "Silent"
                : effectiveTier === "minor"
                  ? "Broadcast"
                  : "Mandatory"}
            </button>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* CARD 1: RECIPE STATUS                                              */}
      {/* "Is this recipe ready for the kitchen?"                            */}
      {/* ================================================================== */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="subheader-icon-box primary">
            <ClipboardCheck />
          </div>
          <div>
            <h3 className="subheader-title">Recipe Status</h3>
            <p className="text-sm text-gray-500">Is this recipe ready for the kitchen?</p>
          </div>
        </div>

        {/* Current Status — neutral card, colored icon + text only */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
          <div>
            <span className={`text-base font-semibold ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            <p className="text-sm text-gray-500 mt-0.5">{statusConfig.description}</p>
          </div>
        </div>

        {/* Status Selector */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Change Status
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(STATUS_CONFIG) as RecipeStatus[]).map((status) => {
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              const isActive = currentStatus === status;

              return (
                <button
                  key={status}
                  onClick={() => !isActive && handleStatusChange(status)}
                  disabled={isActive}
                  className={`
                    flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all
                    min-h-[44px]
                    ${isActive
                      ? config.activeBg
                      : "border-gray-700/50 bg-gray-800/50 hover:border-gray-600 text-gray-500 hover:text-gray-300"
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? config.color : ""}`} />
                  <span className={`text-xs font-medium ${isActive ? config.color : ""}`}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contextual metadata — only show what's relevant to current status */}
        <div className="mt-5 space-y-3">
          {/* Approval info — only when approved */}
          {currentStatus === "approved" && recipe.approved_at && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-emerald-400 font-medium">Approved</span>
                <span className="text-gray-400">
                  {" "}on {new Date(recipe.approved_at).toLocaleDateString()} by {getUserName(recipe.approved_by)}
                </span>
              </div>
            </div>
          )}

          {/* Review info — when there's been a review */}
          {recipe.last_reviewed_at && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-blue-400 font-medium">Last reviewed</span>
                <span className="text-gray-400">
                  {" "}on {new Date(recipe.last_reviewed_at).toLocaleDateString()} by {getUserName(recipe.last_reviewed_by)}
                </span>
              </div>
            </div>
          )}

          {/* Creation & modification — compact row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-800/30 border border-gray-700/30">
              <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="text-sm text-gray-400">
                Created {new Date(recipe.created_at || Date.now()).toLocaleDateString()}
                {recipe.created_by && <span className="text-gray-500"> · {getUserName(recipe.created_by)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-800/30 border border-gray-700/30">
              <FileEdit className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="text-sm text-gray-400">
                Modified {new Date(recipe.updated_at || Date.now()).toLocaleDateString()}
                {recipe.modified_by && <span className="text-gray-500"> · {getUserName(recipe.modified_by)}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* CARD 2: VERSION HISTORY                                            */}
      {/* "What changed and when?"                                           */}
      {/* ================================================================== */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="subheader-icon-box purple">
              <GitBranch />
            </div>
            <div>
              <h3 className="subheader-title">Version History</h3>
              <p className="text-sm text-gray-500">What changed and when</p>
            </div>
          </div>

          {/* Current version badge */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <span className="text-lg font-bold font-mono text-purple-400">
                v{currentVersion}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {versionHistory.length > 0 ? (
          <>
            <div className="space-y-3">
              {versionHistory.slice(0, historyExpanded ? undefined : 3).map((version, index) => (
                <div
                  key={index}
                  className="relative flex gap-4"
                >
                  {/* Timeline connector */}
                  {index < versionHistory.length - 1 && (
                    <div className="absolute left-[19px] top-[44px] bottom-0 w-px bg-gray-700/50" />
                  )}

                  {/* Version badge */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      version.bumpType === 'major'
                        ? 'bg-rose-500/20'
                        : version.bumpType === 'minor'
                          ? 'bg-amber-500/20'
                          : 'bg-gray-700/50'
                    }`}>
                      <span className={`text-xs font-bold font-mono ${
                        version.bumpType === 'major'
                          ? 'text-rose-400'
                          : version.bumpType === 'minor'
                            ? 'text-amber-400'
                            : 'text-gray-400'
                      }`}>
                        {version.version}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {version.bumpType && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            TIER_CONFIG[version.bumpType as BumpTier]?.colorBadge ||
                            "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          }`}
                        >
                          {version.bumpType === "major"
                            ? "Mandatory"
                            : version.bumpType === "minor"
                              ? "Broadcast"
                              : "Silent"}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(version.date).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                      <span className="text-xs text-gray-600">
                        · {getUserName(version.changedBy)}
                      </span>
                    </div>

                    {version.notes && (
                      <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">
                        {version.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Show more / less toggle */}
            {versionHistory.length > 3 && (
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {historyExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show all {versionHistory.length} versions
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <GitBranch className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No version history yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Changes will be tracked automatically when you save
            </p>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* STATUS CHANGE CONFIRMATION DIALOG                                  */}
      {/* ================================================================== */}
      {showStatusConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">
                Change Recipe Status?
              </h3>
            </div>

            <p className="text-gray-300 mb-6">
              {showStatusConfirm === "approved" &&
                "This will mark the recipe as APPROVED and make it available for kitchen production. Are you sure it's ready?"}
              {showStatusConfirm === "review" &&
                "This will mark the recipe for REVIEW by management. Continue?"}
              {showStatusConfirm === "draft" &&
                "This will change the recipe back to DRAFT status. Continue?"}
              {showStatusConfirm === "archived" &&
                "This will ARCHIVE the recipe and remove it from active use. This action should only be taken for recipes that are no longer needed."}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStatusConfirm(null)}
                className="btn-ghost min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className={`px-4 py-2 rounded-xl min-h-[44px] font-medium ${
                  STATUS_CONFIG[showStatusConfirm as RecipeStatus]?.activeBg ||
                  "bg-gray-500/20 text-gray-400"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
