import { supabase } from "@/lib/supabase";

type ActivityType =
  // Team activities
  | "team_member_added"
  | "team_member_updated"
  | "team_member_removed"
  | "role_assigned"
  | "role_removed"
  | "bulk_team_import"
  // Recipe activities
  | "recipe_created"
  | "recipe_updated"
  | "recipe_deleted"
  | "recipe_status_changed"
  // Schedule activities
  | "schedule_uploaded"
  | "schedule_activated"
  | "schedule_deleted"
  | "schedule_synced_7shifts"
  // Inventory activities
  | "inventory_updated"
  | "inventory_counted"
  | "inventory_adjusted"
  | "inventory_imported"
  // Vendor/Purchasing activities
  | "invoice_imported"
  | "price_change_detected"
  | "vendor_added"
  // Settings activities
  | "settings_changed"
  | "permissions_changed"
  | "notification_preferences_updated"
  // Task activities
  | "task_completed"
  | "task_created"
  | "task_assigned";

interface ActivityLogEntry {
  organization_id: string;
  user_id: string;
  activity_type: ActivityType;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}

export const logActivity = async ({
  organization_id,
  user_id,
  activity_type,
  details,
  metadata = {},
}: ActivityLogEntry): Promise<void> => {
  try {
    // Add user name to details if not present
    if (!details.user_name) {
      const { data: userData } = await supabase
        .from("organization_team_members")
        .select("first_name, last_name")
        .eq("user_id", user_id)
        .single();

      if (userData) {
        details.user_name = `${userData.first_name} ${userData.last_name}`;
      }
    }

    // Insert the activity log and get the ID
    const { data: logData, error } = await supabase
      .from("activity_logs")
      .insert([
        {
          organization_id,
          user_id,
          activity_type,
          details,
          metadata,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Error inserting activity log:", error);
      throw error;
    }

    // If there are diffs in the metadata, record them in activity_stream_diffs
    if (metadata.diffs && logData?.id) {
      const { table_name, record_id, old_values, new_values, diff } =
        metadata.diffs;

      if (table_name && record_id) {
        const { error: diffError } = await supabase
          .from("activity_stream_diffs")
          .insert([
            {
              activity_log_id: logData.id,
              organization_id,
              table_name,
              record_id,
              old_values: old_values || {},
              new_values: new_values || {},
              diff: diff || {},
            },
          ]);

        if (diffError) {
          console.error("Error inserting activity stream diff:", diffError);
        }
      }
    }
  } catch (err) {
    console.error("Error logging activity:", err);
    // Don't throw - we don't want to break the main flow if logging fails
  }
};
