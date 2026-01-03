import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { SECURITY_LEVELS, type SecurityLevel } from "@/config/security";

interface Organization {
  id: string;
  name: string;
  owner_id: string;
  settings?: any;
}

interface TeamMemberProfile {
  id: string;
  security_level: SecurityLevel;
  kitchen_role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [teamMemberProfile, setTeamMemberProfile] = useState<TeamMemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchOrganization(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchOrganization(session.user.id);
      } else {
        setUser(null);
        setOrganization(null);
        setTeamMemberProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchOrganization = async (userId: string) => {
    try {
      console.log("[useAuth] Fetching organization for user:", userId);

      // Get the current user from the session to avoid stale closure
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user;

      if (!currentUser) {
        console.log("[useAuth] No current user found");
        setIsLoading(false);
        return;
      }

      console.log(
        "[useAuth] Current user metadata:",
        currentUser.user_metadata,
      );

      // First check if user has organizationId in metadata
      const orgId = currentUser.user_metadata?.organizationId;

      if (orgId) {
        console.log("[useAuth] Found org ID in metadata:", orgId);
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgId)
          .single();

        if (!error && data) {
          console.log("[useAuth] Organization found:", data);
          setOrganization(data);
          
          // Fetch team member profile for security level
          await fetchTeamMemberProfile(orgId, currentUser.email);
          
          setIsLoading(false);
          return;
        } else {
          console.error("[useAuth] Error fetching org by metadata ID:", error);
        }
      }

      // Fallback: check organization_roles table
      console.log("[useAuth] Checking organization_roles table");
      const { data: roleData, error: roleError } = await supabase
        .from("organization_roles")
        .select("organization_id")
        .eq("user_id", userId)
        .single();

      if (!roleError && roleData) {
        console.log(
          "[useAuth] Found org ID in roles:",
          roleData.organization_id,
        );
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", roleData.organization_id)
          .single();

        if (!orgError && orgData) {
          console.log("[useAuth] Organization found from roles:", orgData);
          setOrganization(orgData);
          
          // Fetch team member profile for security level
          await fetchTeamMemberProfile(roleData.organization_id, currentUser.email);
        } else {
          console.error("[useAuth] Error fetching org by role ID:", orgError);
        }
      } else {
        console.error(
          "[useAuth] Error fetching organization roles:",
          roleError,
        );
      }
    } catch (error) {
      console.error("[useAuth] Error fetching organization:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMemberProfile = async (orgId: string, email?: string | null) => {
    if (!email) return;
    
    try {
      const { data, error } = await supabase
        .from("organization_team_members")
        .select("id, security_level, kitchen_role")
        .eq("organization_id", orgId)
        .eq("email", email)
        .single();

      if (!error && data) {
        console.log("[useAuth] Team member profile found:", data);
        setTeamMemberProfile({
          id: data.id,
          security_level: (data.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel,
          kitchen_role: data.kitchen_role,
        });
      } else {
        console.log("[useAuth] No team member profile found, defaulting to Echo");
        // User exists but not in team_members table - default to lowest access
        setTeamMemberProfile(null);
      }
    } catch (error) {
      console.error("[useAuth] Error fetching team member profile:", error);
    }
  };

  // Get display name from metadata
  const displayName = user
    ? `${user.user_metadata?.firstName || ""} ${user.user_metadata?.lastName || ""}`.trim()
    : "";

  // Security level from team member profile, or check for dev in metadata
  const securityLevel: SecurityLevel = 
    user?.user_metadata?.system_role === "dev" || user?.user_metadata?.role === "dev"
      ? SECURITY_LEVELS.OMEGA  // Dev = Omega (0)
      : (teamMemberProfile?.security_level ?? SECURITY_LEVELS.ECHO); // Default to Echo (5)

  // Check if user has dev system role (Omega)
  const isDev = securityLevel === SECURITY_LEVELS.OMEGA;

  // Check if user has admin access (Omega, Alpha, or Bravo)
  const hasAdminAccess = securityLevel <= SECURITY_LEVELS.BRAVO;

  const signIn = async (email: string, password: string, rememberMe = true) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) throw error;
      toast.success("Signed in successfully");
    } catch (error: any) {
      toast.error("Invalid email or password");
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    }
  };

  return {
    user,
    organization,
    organizationId: organization?.id || null,
    displayName,
    isLoading,
    isDev,
    hasAdminAccess,
    isAuthenticated: !!user,
    signIn,
    signOut,
    error: null,
    // New security fields
    securityLevel,
    teamMemberId: teamMemberProfile?.id || null,
    kitchenRole: teamMemberProfile?.kitchen_role || null,
  };
}
