/**
 * usePointActions — Shared ledger action handlers
 * 
 * Modify, excuse, and remove point events/reductions.
 * Used by both ByMemberView and TeamLedgerView.
 * All mutations write to NEXUS audit trail.
 * 
 * @diagnostics src/features/team/components/TeamPerformance/components/PointsTab/usePointActions.ts
 */

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePerformanceStore } from "@/stores/performanceStore";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import type { TeamMemberPerformance } from "@/features/team/types";

export function usePointActions() {
  const { user, organizationId } = useAuth();
  const { fetchTeamPerformance } = usePerformanceStore();
  const [processingEntryId, setProcessingEntryId] = useState<string | null>(null);

  /**
   * Reclassify an existing point event
   */
  const handleModifyEvent = useCallback(async (
    entry: any,
    isReduction: boolean,
    newEventType: string,
    newPoints: number,
    member: TeamMemberPerformance
  ) => {
    if (!organizationId || !user || !member) return;
    
    setProcessingEntryId(entry.id);
    try {
      const table = isReduction ? 'performance_point_reductions' : 'performance_point_events';
      const typeField = isReduction ? 'reduction_type' : 'event_type';
      
      const { error } = await supabase
        .from(table)
        .update({
          [typeField]: newEventType,
          points: newPoints,
          notes: `${entry.notes || ''} [Modified from ${isReduction ? entry.reduction_type : entry.event_type}]`.trim(),
        })
        .eq('id', entry.id);
      
      if (error) throw error;
      
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_modified',
        details: {
          team_member_id: member.team_member_id,
          name: `${member.team_member.first_name} ${member.team_member.last_name}`,
          entry_id: entry.id,
          original_type: isReduction ? entry.reduction_type : entry.event_type,
          new_type: newEventType,
          original_points: entry.points,
          new_points: newPoints,
          event_date: entry.event_date,
        },
      });
      
      await fetchTeamPerformance();
      toast.success('Event reclassified');
    } catch (err: any) {
      console.error('Error modifying event:', err);
      toast.error(`Failed to modify: ${err.message}`);
    } finally {
      setProcessingEntryId(null);
    }
  }, [organizationId, user, fetchTeamPerformance]);

  /**
   * Excuse an entry (delete with reason logged to NEXUS)
   */
  const handleExcuseEntry = useCallback(async (
    entry: any,
    isReduction: boolean,
    reason: string,
    member: TeamMemberPerformance
  ) => {
    if (!organizationId || !user || !member) return;
    
    setProcessingEntryId(entry.id);
    try {
      const table = isReduction ? 'performance_point_reductions' : 'performance_point_events';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', entry.id);
      
      if (error) throw error;
      
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_excused',
        details: {
          team_member_id: member.team_member_id,
          name: `${member.team_member.first_name} ${member.team_member.last_name}`,
          entry_id: entry.id,
          event_type: isReduction ? entry.reduction_type : entry.event_type,
          points: entry.points,
          event_date: entry.event_date,
          excuse_reason: reason,
          original_notes: entry.notes,
        },
      });
      
      await fetchTeamPerformance();
      toast.success(`Excused: ${reason}`);
    } catch (err: any) {
      console.error('Error excusing entry:', err);
      toast.error(`Failed to excuse: ${err.message}`);
    } finally {
      setProcessingEntryId(null);
    }
  }, [organizationId, user, fetchTeamPerformance]);

  /**
   * Remove an entry entirely (delete, logged as removal)
   */
  const handleRemoveEntry = useCallback(async (
    entry: any,
    isReduction: boolean,
    member: TeamMemberPerformance
  ) => {
    if (!organizationId || !user || !member) return;
    
    setProcessingEntryId(entry.id);
    try {
      const table = isReduction ? 'performance_point_reductions' : 'performance_point_events';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', entry.id);
      
      if (error) throw error;
      
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_removed',
        details: {
          team_member_id: member.team_member_id,
          name: `${member.team_member.first_name} ${member.team_member.last_name}`,
          entry_id: entry.id,
          event_type: isReduction ? entry.reduction_type : entry.event_type,
          points: entry.points,
          event_date: entry.event_date,
          original_notes: entry.notes,
        },
      });
      
      await fetchTeamPerformance();
      toast('Entry removed', { icon: '🗑️' });
    } catch (err: any) {
      console.error('Error removing entry:', err);
      toast.error(`Failed to remove: ${err.message}`);
    } finally {
      setProcessingEntryId(null);
    }
  }, [organizationId, user, fetchTeamPerformance]);

  return {
    processingEntryId,
    handleModifyEvent,
    handleExcuseEntry,
    handleRemoveEntry,
  };
}
