import React, { useState, useEffect, useMemo } from "react";
import {
  Check,
  X,
  AlertTriangle,
  Edit2,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Printer,
  Package,
  Clock,
  User,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import { useInventorySessionsStore } from "@/stores/inventorySessionsStore";
import { LoadingLogo } from "@/features/shared/components";
import {
  SESSION_TYPE_LABELS,
  COUNT_STATUS_LABELS,
  type ReviewCount,
  type PendingReviewSession,
} from "@/types/inventory-sessions";
import toast from "react-hot-toast";

interface InventoryReviewProps {
  onApprove: () => void;
  onReject: () => void;
}

export const InventoryReview: React.FC<InventoryReviewProps> = ({
  onApprove,
  onReject,
}) => {
  // Store
  const {
    pendingReviews,
    selectedSession,
    countsForReview,
    isLoading,
    isLoadingCounts,
    error,
    fetchPendingReviews,
    fetchSession,
    fetchCountsForReview,
    approveSession,
    rejectSession,
    approveCount,
    flagCount,
    adjustCount,
    setSelectedSession,
  } = useInventorySessionsStore();

  // Local state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [showFlagModal, setShowFlagModal] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  
  // Filters
  const [filterOptions, setFilterOptions] = useState({
    showOnlyVariance: false,
    categoryFilter: "all",
    locationFilter: "all",
    statusFilter: "all",
  });

  // Load pending reviews on mount
  useEffect(() => {
    fetchPendingReviews();
  }, [fetchPendingReviews]);

  // Load counts when session is selected
  useEffect(() => {
    if (selectedSession) {
      fetchCountsForReview(selectedSession.id);
    }
  }, [selectedSession, fetchCountsForReview]);

  // Filter counts
  const filteredCounts = useMemo(() => {
    if (!countsForReview) return [];

    return countsForReview.filter((count) => {
      if (filterOptions.showOnlyVariance && count.variance === 0) return false;
      if (filterOptions.categoryFilter !== "all" && count.category !== filterOptions.categoryFilter) return false;
      if (filterOptions.locationFilter !== "all" && count.storageArea !== filterOptions.locationFilter) return false;
      if (filterOptions.statusFilter !== "all" && count.status !== filterOptions.statusFilter) return false;
      return true;
    });
  }, [countsForReview, filterOptions]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalItems = filteredCounts.length;
    const itemsWithVariance = filteredCounts.filter((c) => c.variance !== 0).length;
    const totalValue = filteredCounts.reduce((sum, c) => sum + c.totalValue, 0);
    const varianceValue = filteredCounts.reduce((sum, c) => sum + (c.variance * c.unitCost), 0);
    const variancePercent = totalValue > 0 ? (varianceValue / totalValue) * 100 : 0;
    const approvedItems = filteredCounts.filter((c) => c.status === "approved").length;
    const flaggedItems = filteredCounts.filter((c) => c.status === "flagged").length;
    const pendingItems = filteredCounts.filter((c) => c.status === "pending").length;

    return {
      totalItems,
      itemsWithVariance,
      totalValue,
      varianceValue,
      variancePercent,
      approvedItems,
      flaggedItems,
      pendingItems,
    };
  }, [filteredCounts]);

  // Get unique categories and locations for filters
  const { categories, locations } = useMemo(() => {
    const cats = new Set<string>();
    const locs = new Set<string>();
    countsForReview.forEach((c) => {
      if (c.category) cats.add(c.category);
      if (c.storageArea) locs.add(c.storageArea);
    });
    return {
      categories: Array.from(cats).sort(),
      locations: Array.from(locs).sort(),
    };
  }, [countsForReview]);

  // Handlers
  const handleSelectSession = async (session: PendingReviewSession) => {
    const fullSession = await fetchSession(session.session_id);
    if (fullSession) {
      setSelectedSession(fullSession);
    }
  };

  const handleApproveSession = async () => {
    if (!selectedSession) return;
    await approveSession(selectedSession.id, approvalNotes);
    setSelectedSession(null);
    setApprovalNotes("");
    onApprove();
  };

  const handleRejectSession = async () => {
    if (!selectedSession || !rejectNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    await rejectSession(selectedSession.id, rejectNotes);
    setSelectedSession(null);
    setRejectNotes("");
    setShowRejectModal(false);
    onReject();
  };

  const handleApproveCount = async (countId: string) => {
    await approveCount(countId);
  };

  const handleFlagCount = async () => {
    if (!showFlagModal || !flagReason.trim()) {
      toast.error("Please provide a reason for flagging");
      return;
    }
    await flagCount(showFlagModal, flagReason);
    setShowFlagModal(null);
    setFlagReason("");
  };

  const handleAdjustCount = async (countId: string) => {
    if (!adjustmentReason.trim()) {
      toast.error("Please provide a reason for the adjustment");
      return;
    }
    await adjustCount(countId, editValue, adjustmentReason);
    setEditingItem(null);
    setAdjustmentReason("");
  };

  // Status badge renderer
  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      approved: { bg: "bg-green-500/20", text: "text-green-400" },
      flagged: { bg: "bg-red-500/20", text: "text-red-400" },
      adjusted: { bg: "bg-blue-500/20", text: "text-blue-400" },
      pending: { bg: "bg-gray-500/20", text: "text-gray-400" },
      verified: { bg: "bg-amber-500/20", text: "text-amber-400" },
    };
    const { bg, text } = config[status] || config.pending;
    return (
      <span className={`px-2 py-1 ${bg} ${text} rounded-full text-xs`}>
        {COUNT_STATUS_LABELS[status as keyof typeof COUNT_STATUS_LABELS] || status}
      </span>
    );
  };

  // Variance indicator renderer
  const getVarianceIndicator = (variance: number) => {
    if (variance === 0) return <span className="text-gray-500">—</span>;
    if (variance > 0) {
      return (
        <span className="flex items-center text-green-400">
          <ArrowUpRight className="w-4 h-4 mr-1" />
          +{variance.toFixed(2)}
        </span>
      );
    }
    return (
      <span className="flex items-center text-red-400">
        <ArrowDownRight className="w-4 h-4 mr-1" />
        {variance.toFixed(2)}
      </span>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/InventoryManagement/InventoryReview.tsx (loading)
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingLogo message="Loading inventory reviews..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/InventoryManagement/InventoryReview.tsx (error)
        </div>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => fetchPendingReviews()} className="btn-ghost text-primary-400">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No session selected - show pending reviews list
  if (!selectedSession) {
    return (
      <div className="space-y-6">
        {/* L5 Diagnostic Path */}
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/InventoryManagement/InventoryReview.tsx
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Pending Inventory Reviews</h2>
            <p className="text-gray-400">
              {pendingReviews.length} session{pendingReviews.length !== 1 ? "s" : ""} awaiting approval
            </p>
          </div>
          <button onClick={() => fetchPendingReviews()} className="btn-ghost">
            Refresh
          </button>
        </div>

        {pendingReviews.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-400">
              No inventory sessions are pending review. New sessions will appear here when submitted.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingReviews.map((review) => (
              <div
                key={review.session_id}
                className="card p-6 hover:bg-gray-800/50 cursor-pointer transition-colors"
                onClick={() => handleSelectSession(review)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Package className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {review.session_name || SESSION_TYPE_LABELS[review.session_type]}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(review.started_at).toLocaleDateString()}
                        </span>
                        {review.started_by_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {review.started_by_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {review.total_counts} items
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      ${review.total_value?.toFixed(2) || "0.00"}
                    </div>
                    {review.items_with_variance > 0 && (
                      <div className={`text-sm ${review.variance_value < 0 ? "text-red-400" : "text-green-400"}`}>
                        {review.items_with_variance} variance{review.items_with_variance !== 1 ? "s" : ""} (
                        {review.variance_percent?.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <span className="flex items-center gap-1 text-primary-400 text-sm">
                    Review <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Session selected - show review interface
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedSession(null)}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">
              {selectedSession.name || SESSION_TYPE_LABELS[selectedSession.sessionType]}
            </h2>
            <p className="text-gray-400">
              Started {new Date(selectedSession.startedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-ghost">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button className="btn-ghost">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
          <button
            className="btn-primary bg-green-500 hover:bg-green-600"
            onClick={handleApproveSession}
            disabled={stats.flaggedItems > 0}
          >
            <Check className="w-4 h-4 mr-2" />
            Approve All
          </button>
          <button
            className="btn-ghost text-red-400 hover:text-red-300"
            onClick={() => setShowRejectModal(true)}
          >
            <X className="w-4 h-4 mr-2" />
            Reject
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Items</div>
          <div className="text-2xl font-bold text-white">{stats.totalItems}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.itemsWithVariance} with variance
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Value</div>
          <div className="text-2xl font-bold text-white">
            ${stats.totalValue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.approvedItems} approved, {stats.pendingItems} pending
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Variance Value</div>
          <div className={`text-2xl font-bold ${stats.varianceValue < 0 ? "text-red-400" : "text-green-400"}`}>
            ${Math.abs(stats.varianceValue).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.variancePercent.toFixed(2)}% of total
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Review Status</div>
          <div className="text-2xl font-bold text-white">
            {stats.flaggedItems > 0 ? "Needs Attention" : "Ready"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.flaggedItems} flagged for review
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 rounded-lg p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center">
          <Filter className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-400">Filters:</span>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="showVariance"
            checked={filterOptions.showOnlyVariance}
            onChange={(e) =>
              setFilterOptions({ ...filterOptions, showOnlyVariance: e.target.checked })
            }
            className="mr-2"
          />
          <label htmlFor="showVariance" className="text-sm text-gray-300">
            Show Only Variance
          </label>
        </div>

        <select
          className="input text-sm py-1"
          value={filterOptions.categoryFilter}
          onChange={(e) =>
            setFilterOptions({ ...filterOptions, categoryFilter: e.target.value })
          }
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          className="input text-sm py-1"
          value={filterOptions.locationFilter}
          onChange={(e) =>
            setFilterOptions({ ...filterOptions, locationFilter: e.target.value })
          }
        >
          <option value="all">All Locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        <select
          className="input text-sm py-1"
          value={filterOptions.statusFilter}
          onChange={(e) =>
            setFilterOptions({ ...filterOptions, statusFilter: e.target.value })
          }
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="flagged">Flagged</option>
          <option value="adjusted">Adjusted</option>
        </select>
      </div>

      {/* Counts Table */}
      {isLoadingCounts ? (
        <div className="flex items-center justify-center py-12">
          <LoadingLogo message="Loading counts..." />
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Location</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Expected</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Counted</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Variance</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Value</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredCounts.map((count) => (
                <tr key={count.id} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-sm text-white">{count.product}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{count.category || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{count.storageArea || "—"}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-300">
                    {count.expectedCount?.toFixed(2) || "—"} {count.unitOfMeasure}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {editingItem === count.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          className="input w-20 text-right py-1"
                          value={editValue}
                          onChange={(e) => setEditValue(Number(e.target.value))}
                          min="0"
                          step="0.01"
                          autoFocus
                        />
                        <input
                          type="text"
                          className="input w-32 py-1"
                          placeholder="Reason..."
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                        />
                        <button
                          onClick={() => handleAdjustCount(count.id)}
                          className="text-green-400 hover:text-green-300"
                          disabled={!adjustmentReason.trim()}
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(null);
                            setAdjustmentReason("");
                          }}
                          className="text-gray-400 hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-white">
                        {count.currentCount.toFixed(2)} {count.unitOfMeasure}
                        <button
                          onClick={() => {
                            setEditingItem(count.id);
                            setEditValue(count.currentCount);
                          }}
                          className="ml-2 text-gray-400 hover:text-primary-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {getVarianceIndicator(count.variance)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-white">
                    ${count.totalValue.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {getStatusBadge(count.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleApproveCount(count.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10"
                        disabled={count.status === "approved"}
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowFlagModal(count.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        disabled={count.status === "flagged"}
                        title="Flag for Review"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCounts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No counts match the current filters
            </div>
          )}
        </div>
      )}

      {/* Approval Notes */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <label className="text-sm text-gray-400 block mb-2">Approval Notes (optional)</label>
        <textarea
          className="input w-full"
          rows={2}
          placeholder="Add any notes about this inventory review..."
          value={approvalNotes}
          onChange={(e) => setApprovalNotes(e.target.value)}
        />
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">Flag for Review</h3>
            <p className="text-gray-400 mb-4">
              Please provide a reason for flagging this count for investigation.
            </p>
            <textarea
              className="input w-full mb-4"
              rows={3}
              placeholder="Reason for flagging..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowFlagModal(null);
                  setFlagReason("");
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleFlagCount}
                className="btn-primary bg-red-500 hover:bg-red-600"
                disabled={!flagReason.trim()}
              >
                Flag Count
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">Reject Inventory Session</h3>
            <p className="text-gray-400 mb-4">
              This will send the inventory back for recount. Please provide a reason.
            </p>
            <textarea
              className="input w-full mb-4"
              rows={3}
              placeholder="Reason for rejection..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNotes("");
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSession}
                className="btn-primary bg-red-500 hover:bg-red-600"
                disabled={!rejectNotes.trim()}
              >
                Reject Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
