import React, { useState } from "react";
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
} from "lucide-react";
import type { PolicyTemplate, PolicyCategory } from "@/types/modules";

/**
 * PolicyCard - L5 Collapsible Card (following RecipeCardL5 pattern)
 *
 * Features:
 * - Collapsible design (click to expand/collapse)
 * - Category color-coding and icons
 * - Version badge
 * - Expandable details with 2-column grid
 * - Action buttons (View PDF, Edit, Delete) when expanded
 */

interface PolicyCardProps {
  policy: PolicyTemplate;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  confirmDelete?: boolean;
  className?: string;
}

// Category display config (matching PoliciesManager pattern)
const CATEGORY_CONFIG: Record<
  PolicyCategory,
  { label: string; color: string; icon: React.ElementType }
> = {
  food_safety: { label: "Food Safety", color: "emerald", icon: Shield },
  workplace_safety: { label: "Workplace Safety", color: "amber", icon: AlertTriangle },
  harassment: { label: "Harassment & Discrimination", color: "rose", icon: Users },
  attendance: { label: "Attendance", color: "blue", icon: Clock },
  dress_code: { label: "Dress Code", color: "purple", icon: Users },
  technology: { label: "Technology Use", color: "cyan", icon: Settings },
  confidentiality: { label: "Confidentiality", color: "indigo", icon: Shield },
  general: { label: "General", color: "gray", icon: FileText },
  custom: { label: "Custom", color: "slate", icon: FileText },
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  rose: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" },
  blue: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
  indigo: { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30" },
  gray: { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/30" },
  slate: { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30" },
};

export const PolicyCard: React.FC<PolicyCardProps> = ({
  policy,
  onView,
  onEdit,
  onDelete,
  isDeleting = false,
  confirmDelete = false,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[policy.category] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryConfig.icon;
  const colorClass = COLOR_CLASSES[categoryConfig.color];

  // Format effective date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get recertification interval label
  const getRecertificationLabel = () => {
    if (!policy.recertification.required) return "None";
    const interval = policy.recertification.interval;
    if (interval === "none") return "None";
    if (interval === "30_days") return "30 Days";
    if (interval === "90_days") return "90 Days";
    if (interval === "180_days") return "180 Days";
    if (interval === "annual") return "Annual";
    if (interval === "biennial") return "Biennial";
    if (interval === "custom" && policy.recertification.customDays) {
      return `${policy.recertification.customDays} Days`;
    }
    return "None";
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't toggle if clicking on a button
    if (!target.closest("button")) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`w-full text-left bg-gray-800/50 rounded-2xl transition-all duration-300
                 shadow-lg relative group overflow-hidden border border-gray-700/50 ${className} cursor-pointer
                 ${isExpanded ? "z-40" : ""}`}
      aria-label={`Policy card for ${policy.title}`}
      role="button"
      tabIndex={0}
    >
      {/* Header Section - Always Visible */}
      <div className="p-4">
        {/* Category Badge */}
        <div className="flex items-center justify-between mb-3">
          <div
            className={`px-3 py-1.5 rounded-full ${colorClass.bg} border ${colorClass.border} flex items-center gap-2`}
          >
            <CategoryIcon className={`w-3.5 h-3.5 ${colorClass.text}`} />
            <span className={`text-xs font-medium ${colorClass.text}`}>
              {categoryConfig.label}
            </span>
          </div>

          {/* Status: Active badge */}
          {policy.isActive && (
            <div className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span className="text-xs font-medium">Active</span>
            </div>
          )}
        </div>

        {/* Title & Version */}
        <div className="mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
              {policy.title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
              v{policy.version}
            </span>
          </div>
        </div>

        {/* Effective Date */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>Effective {formatDate(policy.effectiveDate)}</span>
        </div>

        {/* Expand indicator */}
        <div className="absolute top-4 right-4">
          <div
            className={`p-1 rounded-full bg-gray-800/80 border border-gray-700 transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Expandable Content Section */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 space-y-4">
          {/* Description */}
          {policy.description && (
            <div>
              <p className="text-sm text-gray-300 leading-relaxed">{policy.description}</p>
            </div>
          )}

          {/* Details Grid - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Acknowledgment Required */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                </span>
                ACKNOWLEDGMENT
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm ${policy.requiresAcknowledgment ? "text-green-400" : "text-gray-500"}`}>
                  {policy.requiresAcknowledgment ? "Required" : "Not Required"}
                </span>
              </div>
            </div>

            {/* Recertification */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                </span>
                RECERTIFICATION
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-300">{getRecertificationLabel()}</span>
              </div>
            </div>

            {/* Applicability */}
            <div className="col-span-2">
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                </span>
                APPLIES TO
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {(policy.applicableDepartments?.length === 0 &&
                  policy.applicableScheduledRoles?.length === 0 &&
                  policy.applicableKitchenStations?.length === 0) ? (
                  <span className="text-sm text-gray-300">All Team Members</span>
                ) : (
                  <>
                    {policy.applicableDepartments?.map((dept) => (
                      <span key={dept} className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {dept}
                      </span>
                    ))}
                    {policy.applicableScheduledRoles?.map((role) => (
                      <span key={role} className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {role}
                      </span>
                    ))}
                    {policy.applicableKitchenStations?.map((station) => (
                      <span key={station} className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {station}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              View PDF
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-gray-700/70 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              className={`flex justify-center items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium border ${
                confirmDelete
                  ? "bg-rose-600/40 border-rose-500/60 text-rose-300 animate-pulse"
                  : "bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 border-rose-500/30"
              } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isDeleting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {confirmDelete && <span className="text-xs">Click again to confirm</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Hover border effect */}
      <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500/50 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
};
