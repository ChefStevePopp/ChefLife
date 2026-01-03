import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { 
  User, Shield, Building2, Mail, Phone, Award, Bell, Camera,
  ChevronRight, Edit3, Info
} from "lucide-react";
import { LoadingLogo } from "@/components/LoadingLogo";
import { supabase } from "@/lib/supabase";
import { EditTeamMemberModal } from "../EditTeamMemberModal";
import { ImportedBadge } from "@/shared/components/ImportedBadge";
import { getSecurityConfig, getProtocolCode, type SecurityLevel, SECURITY_LEVELS } from "@/config/security";
import type { TeamMember, Certification } from "../../types";

// Section header component - L5 design system
const SectionHeader: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, iconColor, bgColor, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700/50">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
    </div>
    {action}
  </div>
);

// Info row component
const InfoRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
  muted?: boolean;
}> = ({ icon: Icon, label, value, muted }) => (
  <div className="flex items-center gap-3 py-2">
    <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
    <span className="text-sm text-gray-400 w-28 flex-shrink-0">{label}</span>
    <span className={`text-sm ${muted ? 'text-gray-500' : 'text-gray-200'}`}>{value}</span>
  </div>
);

// Certification badge
const CertificationBadge: React.FC<{ cert: Certification }> = ({ cert }) => {
  const isExpired = cert.expiry_date && new Date(cert.expiry_date) < new Date();
  const isExpiringSoon = cert.expiry_date && !isExpired && 
    new Date(cert.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className={`px-3 py-1.5 rounded-lg border text-xs ${
      isExpired 
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        : isExpiringSoon
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          : 'bg-green-500/10 border-green-500/30 text-green-400'
    }`}>
      {cert.name}
    </div>
  );
};

export const MyProfile: React.FC = () => {
  const { user, organization, organizationId, securityLevel, isLoading: authLoading } = useAuth();
  const location = useLocation();
  
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<string | undefined>();

  // Check for navigation state (from UserMenu)
  useEffect(() => {
    const state = location.state as { openProfile?: boolean; tab?: string } | null;
    if (state?.openProfile && teamMember) {
      setInitialTab(state.tab);
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, teamMember]);

  // Fetch team member data
  useEffect(() => {
    const fetchTeamMember = async () => {
      if (!user?.email || !organizationId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("organization_team_members")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("email", user.email)
          .single();

        if (!error && data) {
          setTeamMember(data as TeamMember);
        }
      } catch (err) {
        console.error("Error fetching team member:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchTeamMember();
    }
  }, [user?.email, organizationId, authLoading]);

  // Refresh team member after modal closes
  const handleModalClose = async () => {
    setIsModalOpen(false);
    setInitialTab(undefined);
    
    if (user?.email && organizationId) {
      const { data } = await supabase
        .from("organization_team_members")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("email", user.email)
        .single();
      
      if (data) setTeamMember(data as TeamMember);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingLogo message="Loading your profile..." />
      </div>
    );
  }

  if (!user || !organization) {
    return (
      <div className="space-y-6">
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-amber-400">Account Not Available</h2>
              <p className="mt-1 text-sm text-gray-400">
                Unable to load account information. Please try signing in again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get security info
  const level = (securityLevel ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
  const securityConfig = getSecurityConfig(level);
  const protocolCode = getProtocolCode(level);
  const showProtocolBadge = level <= 3;

  // Get display info
  const displayName = teamMember?.display_name 
    || `${teamMember?.first_name || ''} ${teamMember?.last_name || ''}`.trim()
    || user.email?.split("@")[0];

  const avatarUrl = teamMember?.avatar_url 
    || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=1e293b`;

  // Check if imported
  const isImported = !!teamMember?.import_source && teamMember.import_source !== 'manual';

  // Certifications
  const certifications = teamMember?.certifications || [];
  const expiredCerts = certifications.filter(c => c.expiry_date && new Date(c.expiry_date) < new Date());
  const validCerts = certifications.filter(c => !c.expiry_date || new Date(c.expiry_date) >= new Date());

  return (
    <div className="space-y-6">
      {/* Header - Matching Team page style */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              My Profile
            </h1>
            <p className="text-gray-400 text-sm">
              View and manage your account
            </p>
          </div>
        </div>
      </div>

      {/* Profile Card with darker inner header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        {/* Inner header section - darker background */}
        <div className="bg-[#262d3c] rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div className="relative group">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-800 object-cover border border-gray-600"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=1e293b`;
                }}
              />
              <button
                onClick={() => {
                  setInitialTab('avatar');
                  setIsModalOpen(true);
                }}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-white">{displayName}</h2>
                {isImported && <ImportedBadge source={teamMember?.import_source} />}
              </div>
              <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
              
              {/* Protocol Badge */}
              <div className="flex items-center gap-2 mt-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                  level <= 1 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  level <= 2 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                  level <= 3 ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                  'bg-gray-500/10 border-gray-500/30 text-gray-400'
                }`}>
                  {showProtocolBadge && <span className="font-mono font-bold">{protocolCode}</span>}
                  {securityConfig.name}
                </span>
                <span className="text-xs text-gray-500">at {organization.name}</span>
              </div>

              {/* Imported notice */}
              {isImported && (
                <p className="text-xs text-gray-500 mt-2">
                  Some of your info was imported from CSV and may be updated on the next import.
                </p>
              )}
            </div>

            {/* Edit button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary text-sm"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contact Information */}
          <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
            <SectionHeader
              icon={Mail}
              iconColor="text-gray-400"
              bgColor="bg-gray-700/50"
              title="Contact"
              subtitle="How to reach you"
              action={
                <button
                  onClick={() => {
                    setInitialTab('basic');
                    setIsModalOpen(true);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Edit
                </button>
              }
            />
            <div className="space-y-1">
              <InfoRow icon={Mail} label="Email" value={teamMember?.email || user.email || '—'} />
              <InfoRow icon={Phone} label="Phone" value={teamMember?.phone || '—'} muted={!teamMember?.phone} />
            </div>
          </div>

          {/* Organization */}
          <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
            <SectionHeader
              icon={Building2}
              iconColor="text-gray-400"
              bgColor="bg-gray-700/50"
              title="Organization"
              subtitle="Your workplace"
            />
            <div className="space-y-1">
              <InfoRow icon={Building2} label="Company" value={organization.name} />
              <InfoRow 
                icon={Shield} 
                label="Access Level" 
                value={
                  <span className="flex items-center gap-1.5">
                    {showProtocolBadge && <span className="font-mono font-bold text-gray-400">{protocolCode}</span>}
                    {securityConfig.name}
                  </span>
                } 
              />
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
            <SectionHeader
              icon={Award}
              iconColor="text-gray-400"
              bgColor="bg-gray-700/50"
              title="Certifications"
              subtitle={`${certifications.length} on file`}
              action={
                <button
                  onClick={() => {
                    setInitialTab('certifications');
                    setIsModalOpen(true);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  View All
                </button>
              }
            />
            {certifications.length > 0 ? (
              <div className="space-y-2">
                {expiredCerts.length > 0 && (
                  <p className="text-xs text-rose-400">{expiredCerts.length} expired</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {validCerts.slice(0, 3).map((cert) => (
                    <CertificationBadge key={cert.id} cert={cert} />
                  ))}
                  {validCerts.length > 3 && (
                    <span className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-xs text-gray-500">
                      +{validCerts.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No certifications on file</p>
            )}
          </div>

          {/* Notifications */}
          <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
            <SectionHeader
              icon={Bell}
              iconColor="text-gray-400"
              bgColor="bg-gray-700/50"
              title="Notifications"
              subtitle="Your preferences"
              action={
                <button
                  onClick={() => {
                    setInitialTab('notifications');
                    setIsModalOpen(true);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Manage
                </button>
              }
            />
            <p className="text-sm text-gray-500">
              Configure how you receive schedule updates, team announcements, and alerts.
            </p>
            <button
              onClick={() => {
                setInitialTab('notifications');
                setIsModalOpen(true);
              }}
              className="mt-3 flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Manage preferences
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {teamMember && (
        <EditTeamMemberModal
          member={teamMember}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          isSelfEdit={true}
          initialTab={initialTab as any}
        />
      )}
    </div>
  );
};
