import React, { useState } from "react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import {
  FileText,
  Shield,
  AlertTriangle,
  Users,
  Clock,
  Settings,
  Scale,
  ChevronDown,
  Eye,
  Edit3,
  Trash2,
  Calendar,
  CheckCircle,
  RefreshCw,
  Utensils,
  Lock,
  GraduationCap,
  Briefcase,
  Heart,
  HeartPulse,
  Star,
  Flame,
  Zap,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  ChefHat,
  Thermometer,
  Building2,
  Award,
  Bell,
  Wrench,
  Archive,
  FilePenLine,
  type LucideIcon,
} from "lucide-react";
import type { Policy } from "@/types/policies";
import type { PolicyCategoryConfig } from "@/types/modules";

/**
 * PolicyCard — L5/L6 Visual Entity Card (Phase 1 Relational)
 *
 * Baseball-card treatment matching CategoryManager's visual language:
 * - Hero area with category cover image (or gradient + icon fallback)
 * - Category badge + version + status overlaid on hero
 * - Title, date, and status below hero
 * - Collapsible details with acknowledgment info, applicability, actions
 *
 * Phase 1 change: reads from Policy (relational snake_case) instead of
 * PolicyTemplate (JSONB camelCase). Visual output is identical.
 */

interface PolicyCardProps {
  policy: Policy;
  categories: PolicyCategoryConfig[];
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  confirmDelete?: boolean;
  className?: string;
}

// =============================================================================
// ICON RESOLVER — full set matching CategoryManager's POLICY_ICON_OPTIONS
// =============================================================================
const ICON_MAP: Record<string, LucideIcon> = {
  // Safety & Compliance
  Shield, AlertTriangle, Scale, Lock, Eye,
  // People & Teams
  Users, GraduationCap, Heart, HeartPulse, Award,
  // Documents & Process
  FileText, ClipboardCheck, ClipboardList, BookOpen,
  // Kitchen & Operations
  Utensils, ChefHat, Thermometer,
  // General Purpose
  Settings, Briefcase, Building2, Clock, Calendar,
  Bell, Star, Wrench, Flame, Zap,
  // Action icons (used in details)
  CheckCircle, RefreshCw, Edit3,
};

const resolveIcon = (iconName: string): LucideIcon =>
  ICON_MAP[iconName] || FileText;

// =============================================================================
// COLOR CLASSES — shared with CategoryManager
// =============================================================================
const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; swatch: string }> = {
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", swatch: "bg-emerald-500" },
  blue:    { bg: "bg-blue-500/20",    text: "text-blue-400",    border: "border-blue-500/30",    swatch: "bg-blue-500" },
  amber:   { bg: "bg-amber-500/20",   text: "text-amber-400",   border: "border-amber-500/30",   swatch: "bg-amber-500" },
  rose:    { bg: "bg-rose-500/20",    text: "text-rose-400",    border: "border-rose-500/30",    swatch: "bg-rose-500" },
  indigo:  { bg: "bg-indigo-500/20",  text: "text-indigo-400",  border: "border-indigo-500/30",  swatch: "bg-indigo-500" },
  violet:  { bg: "bg-violet-500/20",  text: "text-violet-400",  border: "border-violet-500/30",  swatch: "bg-violet-500" },
  cyan:    { bg: "bg-cyan-500/20",    text: "text-cyan-400",    border: "border-cyan-500/30",    swatch: "bg-cyan-500" },
  purple:  { bg: "bg-purple-500/20",  text: "text-purple-400",  border: "border-purple-500/30",  swatch: "bg-purple-500" },
  teal:    { bg: "bg-teal-500/20",    text: "text-teal-400",    border: "border-teal-500/30",    swatch: "bg-teal-500" },
  sky:     { bg: "bg-sky-500/20",     text: "text-sky-400",     border: "border-sky-500/30",     swatch: "bg-sky-500" },
  slate:   { bg: "bg-slate-500/20",   text: "text-slate-400",   border: "border-slate-500/30",   swatch: "bg-slate-500" },
  gray:    { bg: "bg-gray-500/20",    text: "text-gray-400",    border: "border-gray-500/30",    swatch: "bg-gray-500" },
};

const safeColor = (color: string) => COLOR_CLASSES[color] || COLOR_CLASSES.gray;

// =============================================================================
// STATUS CONFIG
// =============================================================================
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; Icon: LucideIcon }> = {
  draft:     { label: "Draft",     bg: "bg-gray-500/20",    text: "text-gray-300",    border: "border-gray-500/30",    Icon: FilePenLine },
  published: { label: "Active",    bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", Icon: CheckCircle },
  archived:  { label: "Archived",  bg: "bg-amber-500/20",   text: "text-amber-400",   border: "border-amber-500/30",   Icon: Archive },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const PolicyCard: React.FC<PolicyCardProps> = ({
  policy,
  categories,
  onView,
  onEdit,
  onDelete,
  isDeleting = false,
  confirmDelete = false,
  className = "",
}) => {
  const { showDiagnostics } = useDiagnostics();
  const [isExpanded, setIsExpanded] = useState(false);

  // ---------------------------------------------------------------------------
  // CATEGORY RESOLUTION
  // ---------------------------------------------------------------------------
  const categoryConfig = categories.find((c) => c.id === policy.category_id);
  const categoryLabel = categoryConfig?.label || policy.category_id;
  const categoryColor = categoryConfig?.color || "gray";
  const categoryImageUrl = categoryConfig?.imageUrl || null;
  const CategoryIcon = resolveIcon(categoryConfig?.icon || "FileText");
  const colors = safeColor(categoryColor);

  // ---------------------------------------------------------------------------
  // STATUS RESOLUTION
  // ---------------------------------------------------------------------------
  const statusCfg = STATUS_CONFIG[policy.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.Icon;

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRecertificationLabel = () => {
    if (!policy.recertification_required) return null;
    const interval = policy.recertification_interval;
    if (interval === "none") return null;
    if (interval === "30_days") return "every 30 days";
    if (interval === "90_days") return "every 90 days";
    if (interval === "180_days") return "every 180 days";
    if (interval === "annual") return "annually";
    if (interval === "biennial") return "every 2 years";
    if (interval === "custom" && policy.recertification_custom_days) {
      return `every ${policy.recertification_custom_days} days`;
    }
    return null;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("button")) {
      setIsExpanded(!isExpanded);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div
      onClick={handleCardClick}
      className={`w-full text-left bg-gray-800/50 backdrop-blur-sm rounded-xl border overflow-hidden
                 transition-all duration-300 cursor-pointer group
                 ${isExpanded
                   ? "border-primary-500/30 ring-1 ring-primary-500/20 z-40"
                   : "border-gray-700/50 hover:border-gray-600"
                 } ${className}`}
      aria-label={`Policy card for ${policy.title}`}
      role="button"
      tabIndex={0}
    >
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono px-4 pt-2">
          src/features/admin/components/sections/HRSettings/components/PolicyCard.tsx
        </div>
      )}

      {/* ================================================================== */}
      {/* HERO AREA — cover image or gradient fallback                       */}
      {/* ================================================================== */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {categoryImageUrl ? (
          <img
            src={categoryImageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full ${colors.bg} flex items-center justify-center`}>
            <CategoryIcon className={`w-12 h-12 ${colors.text} opacity-30`} />
          </div>
        )}

        {/* Gradient overlays — dark top (badges) + dark bottom (title) */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />

        {/* Category badge — top-left */}
        <div className="absolute top-2.5 left-2.5">
          <div className={`px-2.5 py-1 rounded-lg ${colors.bg} border ${colors.border} backdrop-blur-sm flex items-center gap-1.5`}>
            <CategoryIcon className={`w-3 h-3 ${colors.text}`} />
            <span className={`text-[11px] font-medium ${colors.text}`}>
              {categoryLabel}
            </span>
          </div>
        </div>

        {/* Version + Status badges — top-right */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-gray-300 border border-gray-600/50 font-medium tabular-nums">
            v{policy.version}
          </span>
          <span className={`px-2 py-0.5 rounded-md ${statusCfg.bg} backdrop-blur-sm ${statusCfg.text} border ${statusCfg.border} flex items-center gap-1`}>
            <StatusIcon className="w-2.5 h-2.5" />
            <span className="text-[11px] font-medium">{statusCfg.label}</span>
          </span>
        </div>

        {/* Expand chevron — bottom-right of hero */}
        <div className="absolute bottom-2 right-2.5">
          <div className={`w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm border border-gray-600/50
                          flex items-center justify-center transition-transform duration-300
                          ${isExpanded ? "rotate-180" : ""}`}>
            <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
          </div>
        </div>

        {/* Title overlaid on bottom of hero */}
        <div className="absolute bottom-2 left-3 right-10">
          <h3 className="text-base font-semibold text-white truncate drop-shadow-lg">
            {policy.title}
          </h3>
        </div>
      </div>

      {/* ================================================================== */}
      {/* BODY — date + quick stats (always visible)                         */}
      {/* ================================================================== */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Effective {formatDate(policy.effective_date)}
          </span>
          {policy.requires_acknowledgment && (
            <span className="flex items-center gap-1">
              <ClipboardCheck className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400/80">Requires completion</span>
            </span>
          )}
        </div>
        {getRecertificationLabel() && (
          <span className="flex items-center gap-1 text-xs text-cyan-400/70">
            <RefreshCw className="w-3 h-3" />
            Renews {getRecertificationLabel()}
          </span>
        )}
      </div>

      {/* ================================================================== */}
      {/* EXPANDABLE DETAILS                                                  */}
      {/* ================================================================== */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out
                       ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-3 pb-3 space-y-3">

          {/* Description */}
          {policy.description && (
            <p className="text-sm text-gray-300 leading-relaxed border-t border-gray-700/30 pt-3">
              {policy.description}
            </p>
          )}

          {/* Details Grid — 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            {/* Acknowledgment */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 border-t border-gray-700/30 pt-2.5">
                <span className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center">
                  <ClipboardCheck className="w-3 h-3 text-slate-400" />
                </span>
                Completion
              </div>
              <p className={`text-sm mt-1.5 ${policy.requires_acknowledgment ? "text-emerald-400" : "text-gray-500"}`}>
                {policy.requires_acknowledgment ? "Required" : "Not Required"}
              </p>
            </div>

            {/* Recertification */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 border-t border-gray-700/30 pt-2.5">
                <span className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center">
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                </span>
                Renewal
              </div>
              <p className="text-sm text-gray-300 mt-1.5">
                {getRecertificationLabel()
                  ? getRecertificationLabel()!.charAt(0).toUpperCase() + getRecertificationLabel()!.slice(1)
                  : "Not required"}
              </p>
            </div>

            {/* Applicability */}
            <div className="col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 border-t border-gray-700/30 pt-2.5">
                <span className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center">
                  <Users className="w-3 h-3 text-slate-400" />
                </span>
                Applies To
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {(policy.applicable_departments?.length === 0 &&
                  policy.applicable_scheduled_roles?.length === 0 &&
                  policy.applicable_kitchen_stations?.length === 0) ? (
                  <span className="text-sm text-gray-300">All Team Members</span>
                ) : (
                  <>
                    {policy.applicable_departments?.map((dept) => (
                      <span key={dept} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 border border-gray-600/30">
                        {dept}
                      </span>
                    ))}
                    {policy.applicable_scheduled_roles?.map((role) => (
                      <span key={role} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 border border-gray-600/30">
                        {role}
                      </span>
                    ))}
                    {policy.applicable_kitchen_stations?.map((station) => (
                      <span key={station} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 border border-gray-600/30">
                        {station}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Authorship & Dates */}
          {(policy.prepared_by || policy.last_revision_date) && (
            <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-700/30 pt-2.5">
              {policy.prepared_by && (
                <span>Prepared by {policy.prepared_by}{policy.author_title ? `, ${policy.author_title}` : ""}</span>
              )}
              {policy.last_revision_date && (
                <span>Last revised {formatDate(policy.last_revision_date)}</span>
              )}
            </div>
          )}

          {/* Action Buttons — View, Edit, Delete only. Lifecycle lives in PolicyUploadForm. */}
          <div className="pt-1 flex gap-2 border-t border-gray-700/30">
            <button
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="btn-soft-primary flex-1 justify-center py-2"
            >
              <Eye className="w-4 h-4" />
              View PDF
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="btn-ghost flex-1 justify-center py-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={isDeleting}
              className={`flex justify-center items-center gap-2 px-3 py-2 rounded-lg
                         transition-colors text-sm font-medium border
                         ${confirmDelete
                           ? "bg-rose-600/40 border-rose-500/60 text-rose-300 animate-pulse"
                           : "bg-gray-700/50 hover:bg-rose-500/15 text-gray-500 hover:text-rose-400 border-gray-700 hover:border-rose-500/30"
                         } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isDeleting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {confirmDelete && <span className="text-xs">Confirm?</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
