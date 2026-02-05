import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronUp,
  Calendar,
  Shield,
  Scale,
  Info,
  RefreshCw,
  Eye,
  TrendingUp,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";
// PolicyCategory import removed — categories are now configurable strings.
// See @/types/policies for canonical types, @/types/modules for PolicyCategoryConfig.

// =============================================================================
// POLICIES MANAGER - L5 Compliance Dashboard
// =============================================================================
// Operational screen for managers to track team compliance, acknowledgments,
// and recertification status. Policy CRUD operations are in HRSettings.
// =============================================================================

// Policy with compliance stats
interface PolicyWithCompliance {
  id: string;
  title: string;
  category: string;  // category_id from configurable PolicyCategoryConfig
  version: string;
  effective_date: string;
  requires_acknowledgment: boolean;
  recertification_required: boolean;
  is_active: boolean;
  // Compliance stats
  total_team_members: number;
  acknowledged_count: number;
  pending_count: number;
  overdue_count: number;
}

// Category display config
// TODO: Replace hardcoded map with org's policyCategories config (PolicyCategoryConfig[]).
// This map predates the configurable category system. See DEFAULT_POLICY_CATEGORIES in modules.ts.
const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
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

export const PoliciesManager: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, securityLevel, isLoading: authLoading } = useAuth();

  const [policies, setPolicies] = useState<PolicyWithCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "compliant" | "pending" | "overdue">("all");
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Fetch policies with compliance data
  useEffect(() => {
    const fetchPolicies = async () => {
      if (!organizationId) return;

      try {
        // For now, fetch policies without compliance joins (table may not exist)
        const { data, error } = await supabase
          .from("policies")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Map to compliance format with placeholder stats
        const policiesWithCompliance: PolicyWithCompliance[] = (data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          version: p.version,
          effective_date: p.effective_date,
          requires_acknowledgment: p.requires_acknowledgment,
          recertification_required: p.recertification_required,
          is_active: p.is_active,
          // Placeholder compliance stats until we have real data
          total_team_members: 0,
          acknowledged_count: 0,
          pending_count: 0,
          overdue_count: 0,
        }));

        setPolicies(policiesWithCompliance);
      } catch (error) {
        console.error("Error fetching policies:", error);
        setPolicies([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchPolicies();
    }
  }, [organizationId, authLoading]);

  // Filter policies
  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch = policy.title.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "compliant") return matchesSearch && policy.pending_count === 0 && policy.overdue_count === 0;
    if (statusFilter === "pending") return matchesSearch && policy.pending_count > 0;
    if (statusFilter === "overdue") return matchesSearch && policy.overdue_count > 0;

    return matchesSearch;
  });

  // Compliance summary stats
  const complianceStats = {
    totalPolicies: policies.length,
    fullyCompliant: policies.filter(p => p.pending_count === 0 && p.overdue_count === 0).length,
    pendingAcks: policies.reduce((sum, p) => sum + p.pending_count, 0),
    overdueRecerts: policies.reduce((sum, p) => sum + p.overdue_count, 0),
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading compliance data..." />
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/PoliciesManager/index.tsx
        </div>
      )}

      {/* ========================================================================
       * L5 HEADER CARD - Compliance Dashboard Pattern
       * Tab Identity: indigo
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Scale className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Policy Compliance
                </h1>
                <p className="text-gray-400 text-sm">
                  Track team acknowledgments and recertification status
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/admin/modules/hr")}
                className="btn-ghost text-indigo-400 hover:text-indigo-300 border border-indigo-500/30"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Policies
              </button>
            </div>
          </div>

          {/* Expandable Info Section */}
          <div className={`expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}>
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">
                  About Compliance Tracking
                </span>
              </div>
              <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-3">
                <p className="text-sm text-gray-400">
                  Monitor your team's policy compliance at a glance. See who has acknowledged
                  policies, track <span className="font-semibold">overdue recertifications</span>,
                  and ensure your organization stays compliant.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-400/80" />
                      <span className="text-sm font-medium text-gray-300">Overview</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Organization-wide compliance stats</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-400/80" />
                      <span className="text-sm font-medium text-gray-300">Acknowledgments</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Who's read and signed what</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-indigo-400/80" />
                      <span className="text-sm font-medium text-gray-300">Overdue</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Recertifications needing attention</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-indigo-400/80" />
                      <span className="text-sm font-medium text-gray-300">Drill-Down</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Per-policy and per-member details</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="card p-4 bg-gray-800/50 border border-gray-700/50 hover:border-indigo-500/50 transition-colors cursor-pointer"
          onClick={() => setStatusFilter("all")}
          title="View all policies"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active Policies</p>
              <p className="text-2xl font-bold text-indigo-400">{complianceStats.totalPolicies}</p>
            </div>
          </div>
        </div>

        <div
          className={`card p-4 bg-gray-800/50 border transition-colors cursor-pointer ${
            statusFilter === "compliant" ? "border-emerald-500/50" : "border-gray-700/50 hover:border-emerald-500/50"
          }`}
          onClick={() => setStatusFilter("compliant")}
          title="Fully compliant policies"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Compliant</p>
              <p className="text-2xl font-bold text-emerald-400">{complianceStats.fullyCompliant}</p>
            </div>
          </div>
        </div>

        <div
          className={`card p-4 bg-gray-800/50 border transition-colors cursor-pointer ${
            statusFilter === "pending" ? "border-amber-500/50" : "border-gray-700/50 hover:border-amber-500/50"
          }`}
          onClick={() => setStatusFilter("pending")}
          title="Pending acknowledgments"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-bold text-amber-400">{complianceStats.pendingAcks}</p>
            </div>
          </div>
        </div>

        <div
          className={`card p-4 bg-gray-800/50 border transition-colors cursor-pointer ${
            statusFilter === "overdue" ? "border-rose-500/50" : "border-gray-700/50 hover:border-rose-500/50"
          }`}
          onClick={() => setStatusFilter("overdue")}
          title="Overdue recertifications"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue</p>
              <p className="text-2xl font-bold text-rose-400">{complianceStats.overdueRecerts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance List */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Subheader with Search/Filters */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="appearance-none pl-4 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="compliant">Compliant</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="btn-ghost px-3"
              title="Clear filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Policy Compliance List */}
        {filteredPolicies.length === 0 ? (
          <EmptyState
            hasFilters={searchQuery !== "" || statusFilter !== "all"}
            onManagePolicies={() => navigate("/admin/modules/hr")}
          />
        ) : (
          <div className="divide-y divide-gray-700/50">
            {filteredPolicies.map((policy) => (
              <ComplianceRow key={policy.id} policy={policy} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// COMPLIANCE ROW
// =============================================================================

interface ComplianceRowProps {
  policy: PolicyWithCompliance;
}

const ComplianceRow: React.FC<ComplianceRowProps> = ({ policy }) => {
  const categoryConfig = CATEGORY_CONFIG[policy.category] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryConfig.icon;

  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/20 text-amber-400",
    rose: "bg-rose-500/20 text-rose-400",
    blue: "bg-blue-500/20 text-blue-400",
    purple: "bg-purple-500/20 text-purple-400",
    cyan: "bg-cyan-500/20 text-cyan-400",
    indigo: "bg-indigo-500/20 text-indigo-400",
    gray: "bg-gray-500/20 text-gray-400",
    slate: "bg-slate-500/20 text-slate-400",
  };

  // Determine compliance status
  const isFullyCompliant = policy.pending_count === 0 && policy.overdue_count === 0;
  const hasOverdue = policy.overdue_count > 0;
  const compliancePercent = policy.total_team_members > 0
    ? Math.round((policy.acknowledged_count / policy.total_team_members) * 100)
    : 100;

  return (
    <div className="p-4 hover:bg-gray-800/30 transition-colors cursor-pointer">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-lg ${colorClasses[categoryConfig.color]} flex items-center justify-center flex-shrink-0`}>
            <CategoryIcon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-medium truncate">{policy.title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                v{policy.version}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Effective {new Date(policy.effective_date).toLocaleDateString()}
              </span>
              {policy.requires_acknowledgment && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {policy.acknowledged_count}/{policy.total_team_members || "—"} signed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          {policy.requires_acknowledgment && policy.total_team_members > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isFullyCompliant ? "bg-emerald-500" : hasOverdue ? "bg-rose-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${compliancePercent}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8">{compliancePercent}%</span>
            </div>
          )}

          {/* Status badge */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            isFullyCompliant
              ? "bg-emerald-500/20 text-emerald-400"
              : hasOverdue
                ? "bg-rose-500/20 text-rose-400"
                : "bg-amber-500/20 text-amber-400"
          }`}>
            {isFullyCompliant ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Compliant
              </span>
            ) : hasOverdue ? (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {policy.overdue_count} Overdue
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {policy.pending_count} Pending
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  hasFilters: boolean;
  onManagePolicies: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasFilters, onManagePolicies }) => (
  <div className="p-12 text-center">
    <Scale className="w-12 h-12 text-gray-600 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-300 mb-2">
      {hasFilters ? "No policies match your filters" : "No Active Policies"}
    </h3>
    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
      {hasFilters
        ? "Try adjusting your search or status filter."
        : "Upload policies in the HR Configuration to start tracking team compliance."}
    </p>
    {!hasFilters && (
      <button
        onClick={onManagePolicies}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
      >
        <Settings className="w-4 h-4" />
        Manage Policies
      </button>
    )}
  </div>
);
