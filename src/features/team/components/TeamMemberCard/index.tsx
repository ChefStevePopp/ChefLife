import React from "react";
import { Mail, Phone, MoreVertical, AlertTriangle } from "lucide-react";
import { SECURITY_LEVELS, getProtocolCode, getSecurityConfig, type SecurityLevel } from "@/config/security";
import type { TeamMember, PerformanceTier, CoachingStage } from "@/features/team/types";

// ============================================================================
// TYPES
// ============================================================================

interface TeamMemberCardProps {
  member: TeamMember;
  variant?: 'roster' | 'performance';
  // Roster-specific
  onEdit?: () => void;
  onDelete?: () => void;
  showMenu?: boolean;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  // Selection
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  // Performance-specific
  points?: number;
  tier?: PerformanceTier;
  coachingStage?: CoachingStage | null;
  onAddEvent?: () => void;
  onAddReduction?: () => void;
  onViewDetails?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const getProtocolColor = (level: SecurityLevel): string => {
  const colors: Record<SecurityLevel, string> = {
    0: 'bg-gray-400/20 text-gray-400 border-gray-400/30',
    1: 'bg-amber-400/20 text-amber-400 border-amber-400/30',
    2: 'bg-rose-400/20 text-rose-400 border-rose-400/30',
    3: 'bg-purple-400/20 text-purple-400 border-purple-400/30',
    4: 'bg-green-400/20 text-green-400 border-green-400/30',
    5: 'bg-primary-400/20 text-primary-400 border-primary-400/30',
  };
  return colors[level] || colors[5];
};

// Tier badge - small, subtle, like security protocol badge
const getTierBadge = (tier: PerformanceTier) => {
  const configs: Record<PerformanceTier, { label: string; classes: string }> = {
    1: { label: 'T1', classes: 'bg-green-400/20 text-green-400 border-green-400/30' },
    2: { label: 'T2', classes: 'bg-amber-400/20 text-amber-400 border-amber-400/30' },
    3: { label: 'T3', classes: 'bg-rose-400/20 text-rose-400 border-rose-400/30' },
  };
  return configs[tier];
};

const toAcronym = (text: string): string => {
  const words = text.trim().split(/\s+/);
  if (words.length === 1) return text;
  return words.map(word => word[0].toUpperCase()).join('');
};

// ============================================================================
// COMPONENT
// ============================================================================

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  variant = 'roster',
  onEdit,
  onDelete,
  showMenu = true,
  menuOpen = false,
  onToggleMenu,
  selectable = false,
  selected = false,
  onToggleSelect,
  points = 0,
  tier = 1,
  coachingStage,
  onAddEvent,
  onAddReduction,
  onViewDetails,
}) => {
  const securityLevel = (member.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
  const securityConfig = getSecurityConfig(securityLevel);
  const tierBadge = getTierBadge(tier);
  const isPerformance = variant === 'performance';

  const handleCardClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect();
    } else if (isPerformance && onViewDetails) {
      onViewDetails();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 group flex flex-col relative ${
        selected 
          ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30 scale-[1.02]' 
          : 'border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 hover:scale-[1.01]'
      } ${(selectable || (isPerformance && onViewDetails)) ? 'cursor-pointer' : ''}`}
    >
      {/* Selection Checkbox */}
      {selectable && (
        <div 
          className={`absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
            selected 
              ? 'bg-primary-500 border-primary-500 scale-110' 
              : 'border-gray-600 bg-gray-800/50 group-hover:border-gray-500'
          }`}
        >
          <svg className={`w-3 h-3 text-white transition-all duration-200 ${selected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col items-center text-center gap-3 flex-1">
        {/* Avatar with small status indicator */}
        <div className="relative">
          <div className={`w-16 h-16 rounded-full bg-gray-700 overflow-hidden ring-2 transition-all ${
            selected 
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
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email || member.id}`}
                alt={member.first_name}
                className="w-full h-full"
              />
            )}
          </div>
          
          {/* Small status dot - green for active (Roster) or tier-colored (Performance) */}
          {isPerformance ? (
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-800 ${
              tier === 1 ? 'bg-green-500' : tier === 2 ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
          ) : (
            member.is_active !== false && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
            )
          )}
        </div>

        {/* Name */}
        <div className="text-white font-medium text-base leading-tight">
          {member.first_name} {member.last_name}
        </div>

        {/* Badge Row - small, consistent with Roster's security badge */}
        <div className="h-7 flex items-center gap-2">
          {isPerformance ? (
            /* Performance: Tier badge + Points */
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wide border ${tierBadge.classes}`}>
                {tierBadge.label}
              </div>
              <span className="text-sm text-gray-400">
                {points} {points === 1 ? 'pt' : 'pts'}
              </span>
            </div>
          ) : (
            /* Roster: Security protocol badge */
            <div 
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide border ${getProtocolColor(securityLevel)}`}
              title={`${securityConfig.protocol}: ${securityConfig.description}`}
            >
              {securityLevel <= 3 && (
                <span className="font-mono font-bold">{getProtocolCode(securityLevel)}</span>
              )}
              {securityConfig.name}
            </div>
          )}
        </div>

        {/* Coaching Stage Warning - only color pop when there's an issue */}
        {isPerformance && coachingStage && coachingStage >= 1 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 rounded-full border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span className="text-xs font-medium text-rose-400">
              Stage {coachingStage}
            </span>
          </div>
        )}

        {/* Departments (Roster only) */}
        {!isPerformance && (
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
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-gray-700/30">
        {isPerformance ? (
          /* Performance Actions - ghost buttons, color on hover only */
          <div className="flex items-center justify-center gap-2">
            {onAddEvent && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddEvent(); }}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-gray-700/50 hover:border-rose-500/30 transition-colors"
              >
                + Event
              </button>
            )}
            {onAddReduction && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddReduction(); }}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg border border-gray-700/50 hover:border-green-500/30 transition-colors"
              >
                − Reduce
              </button>
            )}
          </div>
        ) : (
          /* Roster Contact Info & Menu */
          <>
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

            {/* 3-dot Menu */}
            {showMenu && !selectable && onToggleMenu && (
              <div className="relative flex justify-end pt-2">
                <div 
                  className={`flex items-center gap-2 mr-2 transition-all duration-200 ease-out ${
                    menuOpen 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 translate-x-4 pointer-events-none'
                  }`}
                >
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-400 bg-gray-800 hover:bg-rose-500/20 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
                    >
                      Remove
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    menuOpen 
                      ? 'text-primary-400 bg-gray-700/50' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                  aria-label="Member actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TeamMemberCard;
