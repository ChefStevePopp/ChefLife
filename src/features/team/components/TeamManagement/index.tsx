import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTeamStore } from "@/stores/teamStore";
import { CreateTeamMemberModal } from "../CreateTeamMemberModal";
import { EditTeamMemberModal } from "../EditTeamMemberModal";
import { ImportTeamModal } from "../ImportTeamModal";
import { TeamList } from "../TeamList";
import { Plus, Upload, Download, Users, UserX, Info, ChevronUp, Search, X, CheckSquare, Link2 } from "lucide-react";
import { RosterFilters, RosterPagination, RosterBulkActions } from "./components";
import { useRosterFilters, useRosterPagination, useRosterSort, useRosterSelection } from "./hooks";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { nexus } from "@/lib/nexus";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import type { TeamMember } from "../../types";

type TabType = 'active' | 'deactivated';

export const TeamManagement: React.FC = () => {
  const { fetchTeamMembers, members } = useTeamStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Bulk action states
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);
  const [isBulkReactivating, setIsBulkReactivating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkDeactivateConfirm, setShowBulkDeactivateConfirm] = useState(false);
  const [showBulkReactivateConfirm, setShowBulkReactivateConfirm] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Filter members by active status first
  const { activeMembers, deactivatedMembers } = useMemo(() => {
    const active = members.filter(m => m.is_active !== false);
    const deactivated = members.filter(m => m.is_active === false);
    return { activeMembers: active, deactivatedMembers: deactivated };
  }, [members]);

  // Get the base members for current tab
  const tabMembers = activeTab === 'active' ? activeMembers : deactivatedMembers;

  // Use the roster filters hook
  const {
    searchQuery,
    setSearchQuery,
    selectedDepartment,
    setSelectedDepartment,
    selectedRole,
    setSelectedRole,
    filteredMembers,
    availableDepartments,
    availableRoles,
    clearFilters,
    hasActiveFilters,
    resultCount,
  } = useRosterFilters({ members: tabMembers });

  // Use sort hook
  const {
    sortField,
    sortDirection,
    setSortField,
    toggleDirection,
    sortedMembers,
  } = useRosterSort({ members: filteredMembers });

  // Use pagination hook
  const {
    currentPage,
    pageSize,
    totalPages,
    showingFrom,
    showingTo,
    canGoNext,
    canGoPrev,
    setCurrentPage,
    setPageSize,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    paginateItems,
  } = useRosterPagination({ totalItems: sortedMembers.length, initialPageSize: 20 });

  // Get paginated members (from sorted, which comes from filtered)
  const paginatedMembers = paginateItems(sortedMembers);

  // Use selection hook - based on current page's member IDs
  const {
    selectedIds,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    hasSelection,
    selectedCount,
    toggleSelection,
    toggleSelectAll,
    deselectAll,
  } = useRosterSelection({ memberIds: paginatedMembers.map(m => m.id) });

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setIsEditModalOpen(true);
  };

  const downloadTemplate = () => {
    const headers = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "employee_id",
      "kitchen_role",
      "departments",
      "roles",
    ].join(",");

    const exampleRow = [
      "John",
      "Smith",
      "john.smith@example.com",
      "555-0123",
      "EMP001",
      "Line Cook",
      "Kitchen,Prep",
      "Grill,Sauté",
    ].join(",");

    const csvContent = `${headers}\n${exampleRow}`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear filters, pagination, and selection when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    clearFilters();
    setCurrentPage(1);
    setSelectionMode(false);
    deselectAll();
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    if (selectionMode) {
      deselectAll();
    }
    setSelectionMode(!selectionMode);
  };

  // Bulk deactivate - direct DB update + single nexus event
  const handleBulkDeactivate = async () => {
    const count = selectedCount;
    setIsBulkDeactivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      // Direct bulk update
      const { error } = await supabase
        .from("organization_team_members")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', Array.from(selectedIds))
        .eq('organization_id', user.user_metadata.organizationId);

      if (error) throw error;

      // Single nexus event for bulk action
      await nexus({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "bulk_team_deactivated",
        details: { count },
      });

      await fetchTeamMembers();
      deselectAll();
      setSelectionMode(false);
    } catch (error) {
      console.error('Bulk deactivate error:', error);
      toast.error('Failed to deactivate team members');
    } finally {
      setIsBulkDeactivating(false);
      setShowBulkDeactivateConfirm(false);
    }
  };

  // Bulk reactivate - direct DB update + single nexus event
  const handleBulkReactivate = async () => {
    const count = selectedCount;
    setIsBulkReactivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      // Direct bulk update
      const { error } = await supabase
        .from("organization_team_members")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .in('id', Array.from(selectedIds))
        .eq('organization_id', user.user_metadata.organizationId);

      if (error) throw error;

      // Single nexus event for bulk action
      await nexus({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "bulk_team_reactivated",
        details: { count },
      });

      await fetchTeamMembers();
      deselectAll();
      setSelectionMode(false);
    } catch (error) {
      console.error('Bulk reactivate error:', error);
      toast.error('Failed to reactivate team members');
    } finally {
      setIsBulkReactivating(false);
      setShowBulkReactivateConfirm(false);
    }
  };

  // Bulk delete - direct DB delete + single nexus event
  const handleBulkDelete = async () => {
    const count = selectedCount;
    setIsBulkDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      // Direct bulk delete
      const { error } = await supabase
        .from("organization_team_members")
        .delete()
        .in('id', Array.from(selectedIds))
        .eq('organization_id', user.user_metadata.organizationId);

      if (error) throw error;

      // Single nexus event for bulk action
      await nexus({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "bulk_team_removed",
        details: { count },
        severity: 'warning',
      });

      await fetchTeamMembers();
      deselectAll();
      setSelectionMode(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to remove team members');
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDepartment, selectedRole, setCurrentPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Escape - exit selection mode
      if (e.key === 'Escape' && selectionMode) {
        e.preventDefault();
        deselectAll();
        setSelectionMode(false);
      }

      // Ctrl/Cmd + A - select all (when in selection mode)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && selectionMode) {
        e.preventDefault();
        toggleSelectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionMode, deselectAll, toggleSelectAll]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  The Roster
                </h1>
                <p className="text-gray-400 text-sm">
                  Who's on the team?
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button onClick={downloadTemplate} className="btn-ghost text-sm flex-1 sm:flex-none justify-center">
                <Download className="w-4 h-4 mr-2" />
                Template
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="btn-ghost text-sm flex-1 sm:flex-none justify-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary text-sm w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Info Section */}
        <div className="expandable-info-section mt-4">
          <button
            onClick={(e) => {
              const section = e.currentTarget.closest('.expandable-info-section');
              section?.classList.toggle('expanded');
            }}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About The Roster</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <p className="text-sm text-gray-400">
                The Roster is your central hub for managing everyone on your team. Add new members manually, 
                assign roles and departments, and keep contact information up to date. Use the search and filters 
                to quickly find who you're looking for.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Template Download */}
                <div className="flex gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <Download className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">Download Template</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Get a CSV template with the correct column headers. Fill it out with your team data, 
                      then use Import to bring everyone in at once.
                    </p>
                  </div>
                </div>

                {/* Import */}
                <div className="flex gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <Upload className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">Import from CSV</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Bulk import team members from a spreadsheet. Great for onboarding your whole team 
                      or syncing from another system like 7shifts.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                <span className="text-gray-400">Tip:</span> Deactivated members are preserved for historical records 
                but won't appear in schedules or active lists.
              </p>

              <p className="text-xs text-gray-500">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full text-xs mr-1">
                  <Link2 className="w-3 h-3" />
                </span>
                This icon indicates data imported from CSV. Changes may be overwritten on re-import.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tabs with Search */}
        <div className="border-b border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
            {/* Tab Buttons - using standard .tab class */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTabChange('active')}
                className={`tab primary ${activeTab === 'active' ? 'active' : ''}`}
              >
                <Users className="w-4 h-4" />
                <span>Active</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'active'
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'bg-gray-700 text-gray-400'
                  }`}>
                  {activeMembers.length}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('deactivated')}
                className={`tab amber ${activeTab === 'deactivated' ? 'active' : ''}`}
              >
                <UserX className="w-4 h-4" />
                <span>Deactivated</span>
                {deactivatedMembers.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'deactivated'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-gray-700 text-gray-400'
                    }`}>
                    {deactivatedMembers.length}
                  </span>
                )}
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, email, role, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters - with Select All when in selection mode */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Select All Checkbox - only in selection mode */}
            {selectionMode && paginatedMembers.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isAllSelected 
                    ? 'bg-primary-500 border-primary-500' 
                    : isPartiallySelected
                      ? 'bg-primary-500/50 border-primary-500'
                      : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                }`}>
                  {(isAllSelected || isPartiallySelected) && <CheckSquare className="w-3 h-3 text-white" />}
                </div>
                <span>Select all on page</span>
              </button>
            )}

            <div className={selectionMode ? 'flex-1' : 'w-full'}>
              <RosterFilters
                selectedDepartment={selectedDepartment}
                onDepartmentChange={setSelectedDepartment}
                selectedRole={selectedRole}
                onRoleChange={setSelectedRole}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortFieldChange={setSortField}
                onSortDirectionToggle={toggleDirection}
                departments={availableDepartments}
                roles={availableRoles}
                onClearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
                resultCount={resultCount}
                totalCount={tabMembers.length}
                // Selection mode
                selectionMode={selectionMode}
                onToggleSelectionMode={toggleSelectionMode}
              />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                hasActiveFilters ? 'bg-amber-500/10' : activeTab === 'active' ? 'bg-blue-500/10' : 'bg-gray-700/50'
              }`}>
                {hasActiveFilters ? (
                  <Users className="w-8 h-8 text-amber-400" />
                ) : activeTab === 'active' ? (
                  <Users className="w-8 h-8 text-blue-400" />
                ) : (
                  <UserX className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                {hasActiveFilters 
                  ? 'No members match your filters'
                  : activeTab === 'active' 
                    ? 'No active team members' 
                    : 'No deactivated team members'
                }
              </h3>
              <p className="text-gray-400 text-sm">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : activeTab === 'active'
                    ? 'Add your first team member to get started'
                    : 'Deactivated members will appear here'
                }
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <TeamList 
                viewMode="full" 
                onEdit={handleEdit}
                members={paginatedMembers}
                selectable={selectionMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelection}
              />
              
              {/* Pagination */}
              <RosterPagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                showingFrom={showingFrom}
                showingTo={showingTo}
                totalItems={filteredMembers.length}
                canGoNext={canGoNext}
                canGoPrev={canGoPrev}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                onNext={nextPage}
                onPrev={prevPage}
                onFirst={goToFirst}
                onLast={goToLast}
              />
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions Floating Bar */}
      <RosterBulkActions
        selectedCount={selectedCount}
        totalCount={tabMembers.length}
        onDeactivate={() => setShowBulkDeactivateConfirm(true)}
        onReactivate={() => setShowBulkReactivateConfirm(true)}
        onDelete={() => setShowBulkDeleteConfirm(true)}
        onClearSelection={deselectAll}
        isDeactivating={isBulkDeactivating}
        isReactivating={isBulkReactivating}
        isDeleting={isBulkDeleting}
        showDeactivate={activeTab === 'active'}
        showReactivate={activeTab === 'deactivated'}
      />

      {/* Bulk Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeactivateConfirm}
        onClose={() => setShowBulkDeactivateConfirm(false)}
        onConfirm={handleBulkDeactivate}
        title="Deactivate Team Members"
        message={`Are you sure you want to deactivate ${selectedCount} team member${selectedCount > 1 ? 's' : ''}? They will be moved to the Deactivated tab and won't appear in schedules.`}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        variant="warning"
        isLoading={isBulkDeactivating}
      />

      {/* Bulk Reactivate Confirmation */}
      <ConfirmDialog
        isOpen={showBulkReactivateConfirm}
        onClose={() => setShowBulkReactivateConfirm(false)}
        onConfirm={handleBulkReactivate}
        title="Reactivate Team Members"
        message={`Reactivate ${selectedCount} team member${selectedCount > 1 ? 's' : ''}? They will be moved back to the Active tab and can be scheduled again.`}
        confirmLabel="Reactivate"
        cancelLabel="Cancel"
        variant="info"
        isLoading={isBulkReactivating}
      />

      {/* Bulk Delete Confirmation - Enhanced warning for high-risk actions */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={selectedCount > tabMembers.length * 0.5 && tabMembers.length > 2 
          ? "⚠️ Warning: Mass Deletion" 
          : "Remove Team Members"
        }
        message={
          selectedCount > tabMembers.length * 0.5 && tabMembers.length > 2
            ? `You are about to permanently delete ${selectedCount} of ${tabMembers.length} team members (${Math.round(selectedCount / tabMembers.length * 100)}% of your ${activeTab} roster). This is a significant action that cannot be undone. All associated data will be lost forever.\n\nAre you absolutely sure you want to proceed?`
            : `Are you sure you want to permanently remove ${selectedCount} team member${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`
        }
        confirmLabel={selectedCount > tabMembers.length * 0.5 && tabMembers.length > 2 
          ? "Yes, Delete All" 
          : "Remove"
        }
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isBulkDeleting}
      />

      {/* Modals */}
      <CreateTeamMemberModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {selectedMember && (
        <EditTeamMemberModal
          member={selectedMember}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedMember(null);
          }}
        />
      )}

      <ImportTeamModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
