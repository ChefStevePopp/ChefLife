import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { TeamMember, TeamStore } from "@/features/team/types";
import { nexus } from "@/lib/nexus";
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

      const memberName = `${currentMember.first_name} ${currentMember.last_name}`;

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

      // Handle is_active explicitly (can be false)
      if (updates.is_active !== undefined) {
        updateData.is_active = updates.is_active;
      }

      if (updates.kitchen_role) updateData.kitchen_role = updates.kitchen_role;
      if (updates.kitchen_stations) updateData.kitchen_stations = updates.kitchen_stations;
      if (updates.security_level !== undefined) updateData.security_level = updates.security_level;
      if (updates.hire_date !== undefined) updateData.hire_date = updates.hire_date;

      const { error: updateError } = await supabase
        .from("organization_team_members")
        .update(updateData)
        .match({ id, organization_id: user.user_metadata.organizationId });

      if (updateError) throw updateError;

      // Determine activity type based on what changed
      let activityType: "team_member_updated" | "team_member_deactivated" | "team_member_reactivated" = "team_member_updated";
      if (updates.is_active === false) {
        activityType = "team_member_deactivated";
      } else if (updates.is_active === true && currentMember.is_active === false) {
        activityType = "team_member_reactivated";
      }

      // Nexus handles both logging AND toast
      await nexus({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: activityType,
        details: { 
          team_member_id: id, 
          name: memberName,
          changes: updates 
        },
      });

      await get().fetchTeamMembers();
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
          security_level: member.security_level ?? 5, // Default to Team Member
          hire_date: member.hire_date || null,
          is_active: member.is_active !== undefined ? member.is_active : true,
          organization_id: user.user_metadata.organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      // Nexus handles both logging AND toast
      await nexus({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "team_member_added",
        details: { 
          team_member_id: data.id, 
          name: `${member.first_name} ${member.last_name}`,
        },
      });

      await get().fetchTeamMembers();
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

      // Build lookup maps for existing members
      const existingByEmail = new Map<string, any>();
      const existingByPunchId = new Map<string, any>();
      
      existingMembers?.forEach(m => {
        if (m.email) existingByEmail.set(m.email.toLowerCase(), m);
        if (m.punch_id) existingByPunchId.set(m.punch_id, m);
      });

      // Track what's in the CSV
      const csvEmails = new Set<string>();
      const csvPunchIds = new Set<string>();
      csvData.forEach((row: any) => {
        const email = row["Email"]?.trim().toLowerCase();
        const punchId = row["Punch ID"]?.trim();
        if (email) csvEmails.add(email);
        if (punchId) csvPunchIds.add(punchId);
      });

      // Find members NOT in CSV (for 86'd handling)
      const membersNotInCSV = existingMembers?.filter((member) => {
        const emailMatch = member.email && csvEmails.has(member.email.toLowerCase());
        const punchIdMatch = member.punch_id && csvPunchIds.has(member.punch_id);
        return !emailMatch && !punchIdMatch;
      }) || [];

      const newMembers: any[] = [];
      const existingToUpdate: { id: string; data: any }[] = [];
      const seenInCSV = new Set<string>();

      csvData.forEach((row: any) => {
        if (!row["First Name"] || !row["Last name"]) return;

        const email = row["Email"]?.trim().toLowerCase();
        const punchId = row["Punch ID"]?.trim();
        if (!email && !punchId) return;

        const rowKey = email || punchId || "";
        if (seenInCSV.has(rowKey)) return; // Skip CSV duplicates
        seenInCSV.add(rowKey);

        const departments = row["Departments"] ? row["Departments"].split(",").map((d: string) => d.trim()).filter(Boolean) : [];
        const roles = row["Roles"] ? row["Roles"].split(",").map((r: string) => r.trim()).filter(Boolean) : [];

        // Check if this matches an existing member
        const existingMember = (email && existingByEmail.get(email)) || 
                               (punchId && existingByPunchId.get(punchId));

        const memberData = {
          first_name: row["First Name"]?.trim() || "",
          last_name: row["Last name"]?.trim() || "",
          display_name: `${row["First Name"]?.trim() || ""} ${row["Last name"]?.trim() || ""}`.trim(),
          email: row["Email"]?.trim() || null,
          phone: row["Mobile phone"]?.trim() || null,
          punch_id: row["Punch ID"]?.trim() || null,
          roles,
          departments,
          locations: row["Locations"] ? [row["Locations"].trim()] : [],
          updated_at: new Date().toISOString(),
        };

        if (existingMember) {
          // Update existing member
          existingToUpdate.push({
            id: existingMember.id,
            data: memberData,
          });
        } else {
          // New member
          newMembers.push({
            ...memberData,
            avatar_url: null,
            kitchen_role: "team_member",
            kitchen_stations: [],
            is_active: true,
            notification_preferences: null,
            organization_id: user.user_metadata.organizationId,
            created_at: new Date().toISOString(),
          });
        }
      });

      return {
        newMembers,
        existingToUpdate,
        updateCount: existingToUpdate.length,
        notInCSV: membersNotInCSV,
        needsConfirmation: membersNotInCSV.length > 0 || existingToUpdate.length > 0,
      };
    } catch (error) {
      console.error("Error preparing team import:", error);
      set({ error: "Failed to prepare team import" });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  executeTeamImport: async (newMembers: any[], handleMissingAction: 'keep' | 'inactive' | 'delete', missingMemberIds: string[], file?: File, existingToUpdate?: { id: string; data: any }[]) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID found");

      const organizationId = user.user_metadata.organizationId;

      // Save the CSV file to storage (like schedules do)
      let fileUrl: string | null = null;
      if (file) {
        const timestamp = Date.now();
        const filePath = `${organizationId}/team-imports/${timestamp}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("team-imports")
          .upload(filePath, file);

        if (uploadError) {
          console.warn("Could not save import file:", uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from("team-imports")
            .getPublicUrl(filePath);
          fileUrl = publicUrl;
        }
      }

      const importMeta = {
        import_source: 'csv' as const,
        import_file_url: fileUrl,
        imported_at: new Date().toISOString(),
      };

      // 1. Insert new members with import metadata
      if (newMembers.length > 0) {
        const membersWithMeta = newMembers.map(m => ({
          ...m,
          ...importMeta,
        }));

        const { error: insertError } = await supabase
          .from("organization_team_members")
          .insert(membersWithMeta);
        if (insertError) throw insertError;
      }

      // 2. Update existing members with CSV data + import metadata
      if (existingToUpdate && existingToUpdate.length > 0) {
        for (const { id, data } of existingToUpdate) {
          const { error: updateError } = await supabase
            .from("organization_team_members")
            .update({
              ...data,
              ...importMeta,
            })
            .eq('id', id)
            .eq('organization_id', organizationId);
          
          if (updateError) {
            console.warn(`Failed to update member ${id}:`, updateError);
          }
        }
      }

      // 3. Handle members not in CSV
      if (missingMemberIds.length > 0) {
        if (handleMissingAction === 'delete') {
          const { error: deleteError } = await supabase
            .from("organization_team_members")
            .delete()
            .in('id', missingMemberIds)
            .eq('organization_id', organizationId);
          if (deleteError) throw deleteError;
        } else if (handleMissingAction === 'inactive') {
          const { error: updateError } = await supabase
            .from("organization_team_members")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .in('id', missingMemberIds)
            .eq('organization_id', organizationId);
          if (updateError) throw updateError;
        }
      }

      // Nexus handles both logging AND toast
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: "bulk_team_import",
        details: {
          imported: newMembers.length,
          updated: existingToUpdate?.length || 0,
          removed: handleMissingAction === 'delete' ? missingMemberIds.length : 0,
          deactivated: handleMissingAction === 'inactive' ? missingMemberIds.length : 0,
          action: handleMissingAction,
          file_name: file?.name,
          file_url: fileUrl,
        },
      });

      await get().fetchTeamMembers();
      return newMembers.length + (existingToUpdate?.length || 0);
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

      // Get member name before deleting
      const { data: member } = await supabase
        .from("organization_team_members")
        .select("first_name, last_name")
        .eq("id", id)
        .single();

      const memberName = member ? `${member.first_name} ${member.last_name}` : 'Team member';

      const { error } = await supabase
        .from("organization_team_members")
        .delete()
        .match({ id, organization_id: user.user_metadata.organizationId });

      if (error) throw error;

      // Nexus handles both logging AND toast
      await nexus({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "team_member_removed",
        details: { 
          team_member_id: id,
          name: memberName,
        },
      });

      await get().fetchTeamMembers();
    } catch (error) {
      console.error("Error deleting team member:", error);
      set({ error: "Failed to delete team member" });
      toast.error("Failed to remove team member");
    } finally {
      set({ isLoading: false });
    }
  },
}));
