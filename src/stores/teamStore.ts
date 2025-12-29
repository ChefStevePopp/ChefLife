import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { TeamMember, TeamStore } from "@/features/team/types";
import { logActivity } from "@/lib/activity-logger";
import toast from "react-hot-toast";

export const useTeamStore = create<TeamStore>((set, get) => ({
  members: [],
  isLoading: false,
  error: null,

  fetchTeamMembers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID found");

      const { data, error } = await supabase
        .from("organization_team_members")
        .select("*")
        .eq("organization_id", user.user_metadata.organizationId)
        .order("is_active", { ascending: false })
        .order("first_name", { ascending: true });

      if (error) throw error;
      set({ members: data || [], error: null });
    } catch (error) {
      console.error("Error fetching team members:", error);
      set({ error: "Failed to load team members", members: [] });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateTeamMember: async (id: string, updates: Partial<TeamMember>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID found");

      const { data: currentMember, error: fetchError } = await supabase
        .from("organization_team_members")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentMember) throw new Error("Team member not found");

      const updateData: any = {
        organization_id: user.user_metadata.organizationId,
        first_name: updates.first_name || currentMember.first_name,
        last_name: updates.last_name || currentMember.last_name,
        display_name: updates.display_name || currentMember.display_name,
        email: updates.email || currentMember.email,
        phone: updates.phone || currentMember.phone || null,
        punch_id: updates.punch_id || currentMember.punch_id || null,
        avatar_url: updates.avatar_url || currentMember.avatar_url || null,
        roles: updates.roles || currentMember.roles || [],
        departments: updates.departments || currentMember.departments || [],
        locations: updates.locations || currentMember.locations || [],
        notification_preferences: updates.notification_preferences || currentMember.notification_preferences || null,
        updated_at: new Date().toISOString(),
      };

      if (updates.kitchen_role) updateData.kitchen_role = updates.kitchen_role;
      if (updates.kitchen_stations) updateData.kitchen_stations = updates.kitchen_stations;

      const { error: updateError } = await supabase
        .from("organization_team_members")
        .update(updateData)
        .match({ id, organization_id: user.user_metadata.organizationId });

      if (updateError) throw updateError;

      await logActivity({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "team_member_updated",
        details: { team_member_id: id, changes: updates },
      });
      await get().fetchTeamMembers();
      toast.success("Team member updated successfully");
    } catch (error) {
      console.error("Error updating team member:", error);
      toast.error("Failed to update team member");
      throw error;
    }
  },

  createTeamMember: async (member: Omit<TeamMember, "id">) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID found");

      const { data, error } = await supabase
        .from("organization_team_members")
        .insert([{
          first_name: member.first_name,
          last_name: member.last_name,
          display_name: member.display_name,
          email: member.email,
          phone: member.phone || null,
          punch_id: member.punch_id || null,
          avatar_url: member.avatar_url,
          roles: member.roles || [],
          departments: member.departments || [],
          locations: member.locations || [],
          notification_preferences: member.notification_preferences || null,
          kitchen_role: member.kitchen_role || "team_member",
          kitchen_stations: member.kitchen_stations || [],
          is_active: member.is_active !== undefined ? member.is_active : true,
          organization_id: user.user_metadata.organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      await logActivity({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "team_member_added",
        details: { team_member_id: data.id, team_member: member },
      });
      await get().fetchTeamMembers();
      toast.success("Team member added successfully");
    } catch (error) {
      console.error("Error creating team member:", error);
      set({ error: "Failed to create team member" });
      toast.error("Failed to add team member");
    } finally {
      set({ isLoading: false });
    }
  },

  importTeamMembers: async (csvData: any[]) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID found");

      const { data: existingMembers, error: fetchError } = await supabase
        .from("organization_team_members")
        .select("*")
        .eq("organization_id", user.user_metadata.organizationId);

      if (fetchError) throw fetchError;

      const existingEmails = new Set(existingMembers?.map(m => m.email?.toLowerCase()).filter(Boolean) || []);
      const existingPunchIds = new Set(existingMembers?.map(m => m.punch_id).filter(Boolean) || []);

      const csvEmails = new Set<string>();
      const csvPunchIds = new Set<string>();
      csvData.forEach((row: any) => {
        const email = row["Email"]?.trim().toLowerCase();
        const punchId = row["Punch ID"]?.trim();
        if (email) csvEmails.add(email);
        if (punchId) csvPunchIds.add(punchId);
      });

      const membersNotInCSV = existingMembers?.filter((member) => {
        const emailMatch = member.email && csvEmails.has(member.email.toLowerCase());
        const punchIdMatch = member.punch_id && csvPunchIds.has(member.punch_id);
        return !emailMatch && !punchIdMatch;
      }) || [];

      const newMembers: any[] = [];
      const duplicateMembers: any[] = [];
      const seenInCSV = new Set<string>();

      csvData.forEach((row: any) => {
        if (!row["First Name"] || !row["Last name"]) return;

        const email = row["Email"]?.trim().toLowerCase();
        const punchId = row["Punch ID"]?.trim();
        if (!email && !punchId) return;

        const rowKey = email || punchId || "";
        if (seenInCSV.has(rowKey)) {
          duplicateMembers.push(row);
          return;
        }

        const isDuplicate = (email && existingEmails.has(email)) || (punchId && existingPunchIds.has(punchId));
        if (isDuplicate) {
          duplicateMembers.push(row);
          return;
        }

        seenInCSV.add(rowKey);

        const departments = row["Departments"] ? row["Departments"].split(",").map((d: string) => d.trim()) : [];
        const roles = row["Roles"] ? row["Roles"].split(",").map((r: string) => r.trim()) : [];

        newMembers.push({
          first_name: row["First Name"]?.trim() || "",
          last_name: row["Last name"]?.trim() || "",
          display_name: `${row["First Name"]?.trim() || ""} ${row["Last name"]?.trim() || ""}`.trim(),
          email: row["Email"]?.trim() || null,
          phone: row["Mobile phone"]?.trim() || null,
          punch_id: row["Punch ID"]?.trim() || null,
          avatar_url: null,
          roles,
          departments,
          locations: row["Locations"] ? [row["Locations"].trim()] : [],
          kitchen_role: "team_member",
          kitchen_stations: [],
          is_active: true,
          notification_preferences: null,
          organization_id: user.user_metadata.organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });

      return {
        newMembers,
        duplicateCount: duplicateMembers.length,
        notInCSV: membersNotInCSV,
        needsConfirmation: membersNotInCSV.length > 0,
      };
    } catch (error) {
      console.error("Error preparing team import:", error);
      set({ error: "Failed to prepare team import" });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  executeTeamImport: async (newMembers: any[], handleMissingAction: 'keep' | 'inactive' | 'delete', missingMemberIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID found");

      if (newMembers.length > 0) {
        const { error: insertError } = await supabase
          .from("organization_team_members")
          .insert(newMembers);
        if (insertError) throw insertError;
      }

      if (missingMemberIds.length > 0) {
        if (handleMissingAction === 'delete') {
          const { error: deleteError } = await supabase
            .from("organization_team_members")
            .delete()
            .in('id', missingMemberIds)
            .eq('organization_id', user.user_metadata.organizationId);
          if (deleteError) throw deleteError;
        } else if (handleMissingAction === 'inactive') {
          const { error: updateError } = await supabase
            .from("organization_team_members")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .in('id', missingMemberIds)
            .eq('organization_id', user.user_metadata.organizationId);
          if (updateError) throw updateError;
        }
      }

      await logActivity({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "bulk_team_import",
        details: {
          imported: newMembers.length,
          removed: handleMissingAction === 'delete' ? missingMemberIds.length : 0,
          action: handleMissingAction,
        },
      });

      await get().fetchTeamMembers();

      let message = `Successfully imported ${newMembers.length} new team members`;
      if (missingMemberIds.length > 0) {
        if (handleMissingAction === 'delete') {
          message += ` and removed ${missingMemberIds.length} members`;
        } else if (handleMissingAction === 'inactive') {
          message += ` and deactivated ${missingMemberIds.length} members`;
        }
      }
      toast.success(message);
      return newMembers.length;
    } catch (error) {
      console.error("Error executing team import:", error);
      set({ error: "Failed to execute team import" });
      toast.error("Failed to import team members");
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteTeamMember: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID found");

      const { error } = await supabase
        .from("organization_team_members")
        .delete()
        .match({ id, organization_id: user.user_metadata.organizationId });

      if (error) throw error;

      await logActivity({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "team_member_removed",
        details: { team_member_id: id },
      });
      await get().fetchTeamMembers();
      toast.success("Team member removed successfully");
    } catch (error) {
      console.error("Error deleting team member:", error);
      set({ error: "Failed to delete team member" });
      toast.error("Failed to remove team member");
    } finally {
      set({ isLoading: false });
    }
  },
}));
