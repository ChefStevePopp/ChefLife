import React, { useEffect, useState, useMemo } from "react";
import { useTeamStore } from "@/stores/teamStore";
import { CreateTeamMemberModal } from "../CreateTeamMemberModal";
import { EditTeamMemberModal } from "../EditTeamMemberModal";
import { ImportTeamModal } from "../ImportTeamModal";
import { TeamList } from "../TeamList";
import { Plus, Upload, Download, Users, UserX } from "lucide-react";
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

  // Filter members by active status
  const { activeMembers, deactivatedMembers } = useMemo(() => {
    const active = members.filter(m => m.is_active !== false);
    const deactivated = members.filter(m => m.is_active === false);
    return { activeMembers: active, deactivatedMembers: deactivated };
  }, [members]);

  const displayedMembers = activeTab === 'active' ? activeMembers : deactivatedMembers;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex p-4 justify-between items-center bg-[#1a1f2b] rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Team Management
          </h1>
          <p className="text-gray-400">
            Manage your organization's team members
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="btn-ghost">
            <Download className="w-5 h-5 mr-2" />
            Template
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-ghost"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        <div className="border-b border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('active')}
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
              onClick={() => setActiveTab('deactivated')}
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

        {/* Tab Content */}
        <div className="p-4">
          {displayedMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                activeTab === 'active' ? 'bg-blue-500/10' : 'bg-gray-700/50'
              }`}>
                {activeTab === 'active' ? (
                  <Users className="w-8 h-8 text-blue-400" />
                ) : (
                  <UserX className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                {activeTab === 'active' ? 'No active team members' : 'No deactivated team members'}
              </h3>
              <p className="text-gray-400 text-sm">
                {activeTab === 'active'
                  ? 'Add your first team member to get started'
                  : 'Deactivated members will appear here'}
              </p>
            </div>
          ) : (
            <TeamList 
              viewMode="full" 
              onEdit={handleEdit}
              members={displayedMembers}
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
