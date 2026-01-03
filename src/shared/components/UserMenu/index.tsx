import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Settings,
  LogOut,
  Building2,
  User,
  Bell,
  ChevronDown,
  Shield,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSecurityConfig, getProtocolCode, type SecurityLevel, SECURITY_LEVELS } from "@/config/security";

export const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, organization, organizationId, securityLevel, signOut } = useAuth();
  const [teamMember, setTeamMember] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch team member data for avatar
  useEffect(() => {
    const fetchTeamMember = async () => {
      if (!user?.email || !organizationId) return;

      try {
        const { data, error } = await supabase
          .from("organization_team_members")
          .select("id, first_name, last_name, display_name, avatar_url, email")
          .eq("organization_id", organizationId)
          .eq("email", user.email)
          .single();

        if (!error && data) {
          setTeamMember(data);
        }
      } catch (err) {
        console.error("Error fetching team member:", err);
      }
    };

    fetchTeamMember();
  }, [user?.email, organizationId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  if (!user) return null;

  // Get display info
  const displayName = teamMember?.display_name 
    || `${teamMember?.first_name || ''} ${teamMember?.last_name || ''}`.trim()
    || user.user_metadata?.firstName && user.user_metadata?.lastName
      ? `${user.user_metadata.firstName} ${user.user_metadata.lastName}`
      : user.email?.split("@")[0]?.replace(/[._-]/g, " ");

  // Security protocol info
  const level = (securityLevel ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
  const securityConfig = getSecurityConfig(level);
  const protocolCode = getProtocolCode(level);
  const showProtocolBadge = level <= 3; // Show Greek letter for Omega through Charlie

  // Avatar URL
  const avatarUrl = teamMember?.avatar_url 
    || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=1e293b`;

  // Can access admin
  const canAccessAdmin = level <= SECURITY_LEVELS.BRAVO;

  // Menu items
  const menuSections = [
    {
      items: [
        {
          icon: User,
          label: "My Profile",
          sublabel: "View your information",
          onClick: () => {
            navigate("/admin/team/my-profile");
            setIsOpen(false);
          },
        },
        {
          icon: Bell,
          label: "Notifications",
          sublabel: "Manage preferences",
          onClick: () => {
            navigate("/admin/team/my-profile");
            setIsOpen(false);
          },
        },
      ],
    },
    ...(canAccessAdmin ? [{
      items: [
        {
          icon: Settings,
          label: "Admin Dashboard",
          sublabel: "Manage your organization",
          onClick: () => {
            navigate("/admin");
            setIsOpen(false);
          },
        },
      ],
    }] : []),
    {
      items: [
        {
          icon: LogOut,
          label: "Sign Out",
          onClick: () => {
            signOut();
            setIsOpen(false);
          },
          danger: true,
        },
      ],
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
      >
        {/* Avatar */}
        <div className="relative">
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-9 h-9 rounded-lg bg-gray-800 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=1e293b`;
            }}
          />
          {/* Protocol badge */}
          {showProtocolBadge && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded bg-gray-800 border border-gray-700 flex items-center justify-center">
              <span className="text-xs font-mono font-bold text-gray-300">{protocolCode}</span>
            </div>
          )}
        </div>

        {/* Name & Org - Hidden on mobile */}
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-white">{displayName}</div>
          {organization && (
            <div className="text-xs text-gray-500">{organization.name}</div>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-gray-800 rounded-xl border border-gray-700/50 shadow-xl overflow-hidden z-50">
          {/* User Header */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-12 h-12 rounded-xl bg-gray-700 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=1e293b`;
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{displayName}</div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
            </div>

            {/* Organization & Protocol */}
            <div className="mt-3 pt-3 border-t border-gray-700/30 space-y-2">
              {organization && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">{organization.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield className="w-3.5 h-3.5" />
                <span className="flex items-center gap-1.5">
                  {showProtocolBadge && (
                    <span className="font-mono font-bold">{protocolCode}</span>
                  )}
                  {securityConfig.name}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Sections */}
          {menuSections.map((section, sectionIndex) => (
            <div 
              key={sectionIndex} 
              className={sectionIndex > 0 ? 'border-t border-gray-700/50' : ''}
            >
              {section.items.map((item, itemIndex) => (
                <button
                  key={itemIndex}
                  onClick={item.onClick}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                    item.danger
                      ? 'text-rose-400 hover:bg-rose-500/10'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.label}</p>
                    {item.sublabel && (
                      <p className="text-xs text-gray-500">{item.sublabel}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}

          {/* Debug Info - Dev only */}
          {process.env.NODE_ENV === "development" && level === SECURITY_LEVELS.OMEGA && (
            <div className="px-4 py-3 border-t border-gray-700/50 bg-gray-900/50">
              <p className="text-xs text-gray-600 font-mono">
                UID: {user.id.slice(0, 8)}... | OID: {organizationId?.slice(0, 8)}... | L{level}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
