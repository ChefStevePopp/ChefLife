import React, { useState, useEffect, useRef } from "react";
import { useTeamStore } from "@/stores/teamStore";
import { Users, Edit2, Trash2, Mail, Phone, MoreVertical, Check, Shield } from "lucide-react";
import { SECURITY_CONFIG, SECURITY_LEVELS, getProtocolCode, getSecurityConfig, type SecurityLevel } from "@/config/security";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import type { TeamMember } from "../../types";

interface TeamListProps {
  viewMode?: "full" | "compact";
  onEdit?: (member: TeamMember) => void;
  members?: TeamMember[]; // Optional override
  // Selection props
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

// Protocol level colors - consistent scheme
const getProtocolColor = (level: SecurityLevel): string => {
  const colors: Record<SecurityLevel, string> = {
    0: 'bg-gray-400/20 text-gray-400 border-gray-400/30',      // Omega - System
    1: 'bg-amber-400/20 text-amber-400 border-amber-400/30',   // Alpha - Owner
    2: 'bg-rose-400/20 text-rose-400 border-rose-400/30',      // Bravo - Manager
    3: 'bg-purple-400/20 text-purple-400 border-purple-400/30', // Charlie - Asst Manager
    4: 'bg-green-400/20 text-green-400 border-green-400/30',   // Delta - Supervisor
    5: 'bg-primary-400/20 text-primary-400 border-primary-400/30', // Echo - Team Member
  };
  return colors[level] || colors[5];
};

// Convert multi-word departments to acronyms
// "Back of House" → "BOH", "Front of House" → "FOH", "Kitchen" → "Kitchen"
const toAcronym = (text: string): string => {
  const words = text.trim().split(/\s+/);
  if (words.length === 1) return text;
  return words.map(word => word[0].toUpperCase()).join('');
};

export const TeamList: React.FC<TeamListProps> = ({
  viewMode = "full",
  onEdit,
  members: membersProp,
  selectable = false,
  selectedIds = new Set(),
  onToggleSelect,
}) => {
  const { members: storeMembers, isLoading, error, deleteTeamMember } = useTeamStore();
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Use prop if provided, otherwise use store
  const members = membersProp || storeMembers;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId && listRef.current && !listRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleDeleteClick = (member: TeamMember) => {
    setOpenMenuId(null);
    setMemberToDelete(member);
  };

  const handleEditClick = (member: TeamMember) => {
    setOpenMenuId(null);
    onEdit?.(member);
  };

  const toggleMenu = (e: React.MouseEvent, memberId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === memberId ? null : memberId);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteTeamMember(memberToDelete.id);
    } finally {
      setIsDeleting(false);
      setMemberToDelete(null);
    }
  };

  const handleCardClick = (member: TeamMember) => {
    if (selectable && onToggleSelect) {
      onToggleSelect(member.id);
    }
  };

  if (isLoading && !membersProp) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 animate-pulse"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-700" />
              <div className="space-y-2 w-full">
                <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto" />
                <div className="h-6 bg-gray-700 rounded w-1/2 mx-auto" />
                <div className="h-3 bg-gray-700 rounded w-2/3 mx-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && !membersProp) {
    return (
      <div className="p-4 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
        <h2 className="text-lg font-medium">Error Loading Team</h2>
        <p className="mt-2">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {viewMode === "full" && !membersProp && (
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-medium text-white">Team Members</h2>
          </div>
        )}

        <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map((member) => {
            const isSelected = selectedIds.has(member.id);
            const securityLevel = (member.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
            const securityConfig = getSecurityConfig(securityLevel);
            
            return (
              <div
                key={member.id}
                onClick={() => handleCardClick(member)}
                className={`bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 group flex flex-col relative ${
                  isSelected 
                    ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30 scale-[1.02]' 
                    : 'border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 hover:scale-[1.01]'
                } ${selectable ? 'cursor-pointer' : ''}`}
              >
                {/* Selection Checkbox */}
                {selectable && (
                  <div 
                    className={`absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                      isSelected 
                        ? 'bg-primary-500 border-primary-500 scale-110' 
                        : 'border-gray-600 bg-gray-800/50 group-hover:border-gray-500'
                    }`}
                  >
                    <Check className={`w-3 h-3 text-white transition-all duration-200 ${isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                  </div>
                )}

                {/* Vertical Stack Layout - matching Schedule Manager */}
                <div className="flex flex-col items-center text-center gap-3 flex-1">
                  {/* Avatar - Larger and centered */}
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full bg-gray-700 overflow-hidden ring-2 transition-all ${
                      isSelected 
                        ? 'ring-primary-500/50' 
                        : 'ring-gray-700/50 group-hover:ring-primary-500/30'
                    }`}>
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={`${member.first_name}'s avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`}
                          alt={member.first_name}
                          className="w-full h-full"
                        />
                      )}
                    </div>
                    {/* Active indicator */}
                    {member.is_active !== false && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-white font-medium text-base leading-tight">
                    {member.first_name} {member.last_name}
                  </div>

                  {/* Role Badge - Shows Protocol Name from Security Level */}
                  <div className="h-7 flex items-center gap-2">
                    <div 
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide border ${getProtocolColor(securityLevel)}`}
                      title={`${securityConfig.protocol}: ${securityConfig.description}`}
                    >
                      {/* Show protocol symbol for elevated users (Omega through Charlie) */}
                      {securityLevel <= 3 && (
                        <span className="font-mono font-bold">{getProtocolCode(securityLevel)}</span>
                      )}
                      {securityConfig.name}
                    </div>
                  </div>

                  {/* Departments - fixed height container, muted to not compete with role */}
                  <div className="h-6 flex items-center justify-center mb-2">
                    {member.departments && member.departments.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {member.departments.slice(0, 3).map((dept, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-700/50 rounded-full border border-gray-600/30"
                            title={dept}
                          >
                            {toAcronym(dept)}
                          </span>
                        ))}
                        {member.departments.length > 3 && (
                          <span 
                            className="px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-700/30 rounded-full border border-gray-600/30"
                            title={member.departments.slice(3).join(', ')}
                          >
                            +{member.departments.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600">—</span>
                    )}
                  </div>
                </div>

                {/* Footer section - always at bottom */}
                <div className="mt-auto pt-3 border-t border-gray-700/30">
                  {/* Contact Info */}
                  <div className="space-y-1 opacity-60 group-hover:opacity-100 transition-opacity min-h-[40px] flex flex-col justify-center">
                    {member.email ? (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[160px]">{member.email}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span>No email</span>
                      </div>
                    )}
                    {member.phone ? (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{member.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>No phone</span>
                      </div>
                    )}
                  </div>

                  {/* 3-dot Menu - only show when not in selection mode */}
                  {viewMode === "full" && !selectable && (
                    <div className="relative flex justify-end pt-2">
                      {/* Animated Menu - slides in horizontally from right */}
                      <div 
                        className={`flex items-center gap-2 mr-2 transition-all duration-200 ease-out ${
                          openMenuId === member.id 
                            ? 'opacity-100 translate-x-0' 
                            : 'opacity-0 translate-x-4 pointer-events-none'
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(member);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-400 bg-gray-800 hover:bg-rose-500/20 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(member);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </div>

                      <button
                        onClick={(e) => toggleMenu(e, member.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          openMenuId === member.id 
                            ? 'text-primary-400 bg-gray-700/50' 
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                        }`}
                        aria-label="Member actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No team members found.
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Team Member"
        message={memberToDelete 
          ? `Are you sure you want to remove ${memberToDelete.first_name} ${memberToDelete.last_name} from the roster? This action cannot be undone.`
          : ''
        }
        confirmLabel="Remove"
        cancelLabel="Keep"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};
