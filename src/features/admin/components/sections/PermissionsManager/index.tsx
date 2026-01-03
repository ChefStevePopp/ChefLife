import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Info, Users, ChevronDown, ChevronUp, Check, X, Search, UserX, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { 
  SECURITY_LEVELS, 
  SECURITY_CONFIG, 
  type SecurityLevel,
  getProtocolCode,
  getAssignableLevels,
  isAlphaProtected,
} from "@/config/security";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  security_level: SecurityLevel;
  kitchen_role: string;
  avatar_url?: string;
}

type ViewMode = 'users' | 'protocols';

export const PermissionsManager: React.FC = () => {
  const { organizationId, securityLevel: userSecurityLevel, user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProtocol, setExpandedProtocol] = useState<SecurityLevel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('users');

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!organizationId) return;

      setIsLoading(true);
      setError(null);

      try {
        const { data: teamData, error: teamError } = await supabase
          .from("organization_team_members")
          .select("id, first_name, last_name, email, security_level, kitchen_role, avatar_url")
          .eq("organization_id", organizationId)
          .eq("is_active", true)
          .order("first_name", { ascending: true });

        if (teamError) throw teamError;
        setTeamMembers(teamData || []);
      } catch (error) {
        console.error("Error loading team members:", error);
        setError("Failed to load team members");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [organizationId]);

  // Count Alphas for protection logic
  const alphaCount = useMemo(() => {
    return teamMembers.filter(m => (m.security_level ?? SECURITY_LEVELS.ECHO) === SECURITY_LEVELS.ALPHA).length;
  }, [teamMembers]);

  // Assignable levels for current user (include Alpha if user is Omega/Alpha)
  const assignableLevels = useMemo(() => {
    const levels = getAssignableLevels(userSecurityLevel, true);
    return levels;
  }, [userSecurityLevel]);

  // Handle protocol change
  const handleProtocolChange = async (memberId: string, newLevel: SecurityLevel) => {
    if (!organizationId || !user) return;
    
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    const currentLevel = (member.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
    
    // No change? Exit early
    if (currentLevel === newLevel) return;
    
    // Check if trying to demote the last Alpha
    if (currentLevel === SECURITY_LEVELS.ALPHA && newLevel > SECURITY_LEVELS.ALPHA && alphaCount <= 1) {
      toast.error("Cannot demote the last Owner. Promote someone else first.");
      return;
    }

    setUpdatingMemberId(memberId);
    try {
      const { error: updateError } = await supabase
        .from("organization_team_members")
        .update({ security_level: newLevel, updated_at: new Date().toISOString() })
        .eq("id", memberId)
        .eq("organization_id", organizationId);

      if (updateError) throw updateError;

      // Update local state
      setTeamMembers(prev => 
        prev.map(m => m.id === memberId ? { ...m, security_level: newLevel } : m)
      );

      // Determine activity type based on direction
      const oldConfig = SECURITY_CONFIG[currentLevel];
      const newConfig = SECURITY_CONFIG[newLevel];
      const isPromotion = newLevel < currentLevel; // Lower number = higher access
      
      // Log to nexus
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: isPromotion ? 'security_protocol_promoted' : 'security_protocol_demoted',
        details: {
          member_id: memberId,
          member_name: `${member.first_name} ${member.last_name}`,
          old_level: currentLevel,
          new_level: newLevel,
          old_protocol: oldConfig.protocol,
          new_protocol: newConfig.protocol,
        },
        severity: 'warning', // Security changes are important
      });
    } catch (error) {
      console.error("Error updating protocol:", error);
      toast.error("Failed to update protocol");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return teamMembers;
    const query = searchQuery.toLowerCase();
    return teamMembers.filter(m => 
      m.first_name.toLowerCase().includes(query) ||
      m.last_name.toLowerCase().includes(query) ||
      m.email?.toLowerCase().includes(query) ||
      m.kitchen_role?.toLowerCase().includes(query)
    );
  }, [teamMembers, searchQuery]);

  // Group members by protocol level (for protocols view)
  const membersByProtocol = useMemo(() => {
    return filteredMembers.reduce((acc, member) => {
      const level = (member.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
      if (!acc[level]) acc[level] = [];
      acc[level].push(member);
      return acc;
    }, {} as Record<SecurityLevel, TeamMember[]>);
  }, [filteredMembers]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // Protocols to display (exclude Omega for non-Omega users)
  const visibleProtocols: SecurityLevel[] = userSecurityLevel === SECURITY_LEVELS.OMEGA
    ? [0, 1, 2, 3, 4, 5]
    : [1, 2, 3, 4, 5];

  // Count totals
  const totalMembers = teamMembers.length;

  // Determine if a member can have their protocol changed
  const canChangeMemberProtocol = (member: TeamMember): boolean => {
    const level = (member.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
    
    // Omega can never be changed
    if (level === SECURITY_LEVELS.OMEGA) return false;
    
    // Alpha can be changed ONLY if there are 2+ Alphas AND actor is Omega/Alpha
    if (level === SECURITY_LEVELS.ALPHA) {
      if (userSecurityLevel > SECURITY_LEVELS.ALPHA) return false;
      if (alphaCount <= 1) return false;
      return true;
    }
    
    // Other levels - check if actor has permission
    return assignableLevels.length > 0 && userSecurityLevel <= level;
  };

  // Get dropdown options for a specific member
  const getDropdownOptions = (member: TeamMember): SecurityLevel[] => {
    const currentLevel = (member.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
    
    // If current is Alpha and there are 2+ Alphas, include Alpha in options
    // but also allow demotion to lower levels
    if (currentLevel === SECURITY_LEVELS.ALPHA && alphaCount > 1) {
      return assignableLevels;
    }
    
    // For non-Alpha members, show all assignable levels
    return assignableLevels;
  };

  return (
    <div className="space-y-6">
      {/* Header - matching The Roster exactly */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  App Access
                </h1>
                <p className="text-gray-400 text-sm">
                  Who can do what in the system?
                </p>
              </div>
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
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About App Access</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <p className="text-sm text-gray-400">
                Security protocols control what team members can access and do in the system. 
                Lower protocol numbers indicate higher clearance levels. Assign protocols based on 
                each person's responsibilities and trust level.
              </p>
              
              {/* Protocol Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {visibleProtocols.map((level) => {
                  const config = SECURITY_CONFIG[level];
                  return (
                    <div 
                      key={level}
                      className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg border border-gray-700/30"
                    >
                      <span className="text-lg font-mono font-bold text-white">
                        {getProtocolCode(level)}
                      </span>
                      <span className="text-xs text-gray-400">{config.name}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500">
                <span className="text-gray-400">Failsafe:</span> If there's only one Owner (α), they cannot be demoted. 
                If there are multiple Owners, any can be changed to ensure mistakes can be corrected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tabs and Search */}
        <div className="border-b border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('users')}
                className={`tab amber ${viewMode === 'users' ? 'active' : ''}`}
              >
                <Users className="w-4 h-4" />
                <span>All Users</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  viewMode === 'users' 
                    ? 'bg-amber-500/20 text-amber-300' 
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {totalMembers}
                </span>
              </button>
              <button
                onClick={() => setViewMode('protocols')}
                className={`tab primary ${viewMode === 'protocols' ? 'active' : ''}`}
              >
                <Shield className="w-4 h-4" />
                <span>By Protocol</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, email, role..."
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

        {/* Content */}
        <div className="p-4">
          {/* Users View - Flat list with protocol assignment */}
          {viewMode === 'users' && (
            <>
              {filteredMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMembers.map((member) => {
                    const level = (member.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
                    const config = SECURITY_CONFIG[level];
                    const canChange = canChangeMemberProtocol(member);
                    const isUpdating = updatingMemberId === member.id;
                    const isOmega = level === SECURITY_LEVELS.OMEGA;
                    const isAlpha = level === SECURITY_LEVELS.ALPHA;
                    const isLastAlpha = isAlpha && alphaCount <= 1;
                    const dropdownOptions = getDropdownOptions(member);

                    return (
                      <div 
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-colors"
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.first_name}
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
                        
                        {/* Name & Role */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.kitchen_role || 'Team Member'}
                          </p>
                        </div>
                        
                        {/* Protocol Assignment */}
                        {canChange ? (
                          <div className="relative flex-shrink-0">
                            <select
                              value={level}
                              onChange={(e) => handleProtocolChange(member.id, parseInt(e.target.value) as SecurityLevel)}
                              disabled={isUpdating}
                              className="appearance-none bg-gray-700 border border-gray-600 rounded-lg pl-3 pr-8 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-gray-500 disabled:opacity-50 min-w-[100px]"
                            >
                              {dropdownOptions.map((l) => {
                                const c = SECURITY_CONFIG[l];
                                return (
                                  <option key={l} value={l}>
                                    {getProtocolCode(l)} {c.name}
                                  </option>
                                );
                              })}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg flex-shrink-0"
                            title={isLastAlpha ? "Last Owner - promote someone else before demoting" : isOmega ? "System access cannot be changed" : ""}
                          >
                            <span className="text-sm font-mono font-bold text-white">
                              {getProtocolCode(level)}
                            </span>
                            <span className="text-xs text-gray-400">{config.name}</span>
                            {(isOmega || isLastAlpha) && <Lock className="w-3 h-3 text-gray-500" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-4">
                    <UserX className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {searchQuery ? 'No members match your search' : 'No team members'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {searchQuery ? 'Try adjusting your search terms' : 'Add team members in The Roster first'}
                  </p>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="mt-4 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}

              {/* Alpha Count Warning */}
              {alphaCount === 1 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-300 font-medium">Single Owner Protected</p>
                    <p className="text-xs text-gray-400 mt-1">
                      There is only one Owner (α) in the organization. This account is protected from demotion. 
                      To change their access level, first promote another team member to Owner.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Protocols View - Grouped by protocol */}
          {viewMode === 'protocols' && (
            <div className="space-y-3">
              {visibleProtocols.map((level) => {
                const config = SECURITY_CONFIG[level];
                const members = membersByProtocol[level] || [];
                const isExpanded = expandedProtocol === level;
                const isProtected = level === SECURITY_LEVELS.OMEGA || (level === SECURITY_LEVELS.ALPHA && alphaCount <= 1);

                return (
                  <div 
                    key={level}
                    className="rounded-xl border border-gray-700/50 overflow-hidden bg-gray-800/30"
                  >
                    {/* Protocol Header */}
                    <button 
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                      onClick={() => setExpandedProtocol(isExpanded ? null : level)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg border border-gray-600 bg-gray-800 flex items-center justify-center">
                          <span className="text-xl font-mono font-bold text-white">
                            {getProtocolCode(level)}
                          </span>
                        </div>
                        
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-white">{config.protocol}</h3>
                            {isProtected && <Lock className="w-3.5 h-3.5 text-gray-500" />}
                          </div>
                          <p className="text-sm text-gray-500">{config.name} — {config.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Users className="w-4 h-4" />
                          <span className="text-sm tabular-nums">{members.length}</span>
                        </div>
                        
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-gray-700/30 space-y-5">
                        {/* Capabilities */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                            Capabilities
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {[
                              { key: 'canViewTeam', label: 'View Team' },
                              { key: 'canEditTeamMembers', label: 'Edit Team' },
                              { key: 'canEditPermissions', label: 'Change Protocols' },
                              { key: 'canEditImportedData', label: 'Override Imports' },
                              { key: 'canDeactivateMembers', label: 'Deactivate' },
                              { key: 'canDeleteMembers', label: 'Delete Members' },
                              { key: 'canManageSchedules', label: 'Schedules' },
                              { key: 'canManageRecipes', label: 'Recipes' },
                              { key: 'canManageInventory', label: 'Inventory' },
                              { key: 'canViewReports', label: 'Reports' },
                              { key: 'canManageSettings', label: 'Settings' },
                            ].map(({ key, label }) => {
                              const hasAccess = config.capabilities[key as keyof typeof config.capabilities];
                              return (
                                <div 
                                  key={key}
                                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                                    hasAccess 
                                      ? 'bg-gray-700/30 text-gray-300' 
                                      : 'text-gray-600'
                                  }`}
                                >
                                  {hasAccess ? (
                                    <Check className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <X className="w-4 h-4 text-gray-700" />
                                  )}
                                  {label}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Assigned Members */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                            Assigned Personnel ({members.length})
                          </h4>
                          {members.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {members.map((member) => (
                                <div 
                                  key={member.id}
                                  className="flex items-center gap-3 px-3 py-2 bg-gray-800/40 rounded-lg border border-gray-700/30"
                                >
                                  <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                    {member.avatar_url ? (
                                      <img
                                        src={member.avatar_url}
                                        alt={member.first_name}
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
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                      {member.first_name} {member.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {member.kitchen_role || '—'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 italic">
                              No personnel assigned
                            </p>
                          )}
                        </div>

                        {/* Protection Notice */}
                        {isProtected && (
                          <div className="flex items-start gap-3 p-3 bg-gray-800/40 border border-gray-700/30 rounded-lg">
                            <Lock className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-500">
                              {level === SECURITY_LEVELS.OMEGA 
                                ? 'System-level protocol. Reserved for development and IT operations.'
                                : alphaCount <= 1
                                  ? 'Single Owner protected. Promote another member to Owner before making changes.'
                                  : 'Owner protocol. Members can be changed when multiple Owners exist.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
