import React, { useEffect, useState, useMemo } from "react";
import { useTeamStore } from "@/stores/teamStore";
import { CreateTeamMemberModal } from "../CreateTeamMemberModal";
import { EditTeamMemberModal } from "../EditTeamMemberModal";
import { ImportTeamModal } from "../ImportTeamModal";
import { TeamList } from "../TeamList";
import { Plus, Upload, Download, Users, UserX, Info, ChevronUp } from "lucide-react";
import { RosterFilters } from "./components";
import { useRosterFilters } from "./hooks";
import type { TeamMember } from "../../types";

type TabType = 'active' | 'deactivated';

export const TeamManagement: React.FC = () => {
  const { fetchTeamMembers, members } = useTeamStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('active');

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

  // Clear filters when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    clearFilters();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row p-4 pb-3 justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
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
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate} className="btn-ghost text-sm">
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Template</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="btn-ghost text-sm"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Member</span>
            </button>
          </div>
        </div>

        {/* Expandable Info Section */}
        <div className="expandable-info-section mx-4 mb-3">
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
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tabs */}
        <div className="border-b border-gray-700">
          <div className="flex">
            <button
              onClick={() => handleTabChange('active')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'active'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              Active
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'active'
                  ? 'bg-primary-500/20 text-primary-300'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {activeMembers.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('deactivated')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'deactivated'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <UserX className="w-4 h-4" />
              Deactivated
              {deactivatedMembers.length > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'deactivated'
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {deactivatedMembers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-700/50">
          <RosterFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            departments={availableDepartments}
            roles={availableRoles}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            resultCount={resultCount}
            totalCount={tabMembers.length}
          />
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
            <TeamList 
              viewMode="full" 
              onEdit={handleEdit}
              members={filteredMembers}
            />
          )}
        </div>
      </div>

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
