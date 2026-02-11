/**
 * useShiftGaps - Hook for Shift Attendance Gap Scanner
 * 
 * Fetches scheduled shifts with no matching worked shift,
 * then cross-references against NEXUS activity_logs to determine
 * if a decision (excuse/demerit/sick day) already exists.
 * 
 * Dates: dateUtils.ts (shift_date as YYYY-MM-DD)
 * Times: date.ts (time_in/time_out as timestamptz → Date → formatTime)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatDateForDisplay, formatDateShort, getLocalDateString } from "@/utils/dateUtils";
import { formatTime } from "@/utils/date";

// =============================================================================
// TYPES
// =============================================================================

export interface ShiftGap {
  scheduled_shift_id: string;
  organization_id: string;
  team_member_id: string;
  external_employee_id: string;
  employee_first_name: string;
  employee_last_name: string;
  shift_date: string; // YYYY-MM-DD — format with dateUtils
  scheduled_time_in: string | null; // timestamptz — format with new Date() + formatTime
  scheduled_time_out: string | null; // timestamptz — format with new Date() + formatTime
  role: string | null;
  location: string | null;
  scheduled_hours: number;
  wage_rate: number | null;
  scheduled_pay: number | null;
  import_batch_id: string;
}

export type GapResolution = 'unresolved' | 'excused' | 'demerit' | 'sick_day' | 'dismissed';

export interface ResolvedGap extends ShiftGap {
  resolution: GapResolution;
  resolution_details?: {
    activity_log_id: string;
    activity_type: string;
    reason?: string;
    resolved_at: string;
  };
}

// =============================================================================
// DISPLAY HELPERS (using dateUtils + date.ts)
// =============================================================================

/**
 * Format a timestamptz string to local time display
 * Uses date.ts formatTime — which handles timezone correctly via Date constructor
 */
export const formatShiftTime = (timestamptz: string | null): string => {
  if (!timestamptz) return '—';
  return formatTime(new Date(timestamptz));
};

/**
 * Format shift date using dateUtils (safe from UTC midnight shift)
 */
export const formatShiftDate = (dateStr: string): string => {
  return formatDateForDisplay(dateStr);
};

/**
 * Format shift date short (no year) using dateUtils
 */
export const formatShiftDateShort = (dateStr: string): string => {
  return formatDateShort(dateStr);
};

// =============================================================================
// HOOK
// =============================================================================

interface UseShiftGapsOptions {
  /** Only fetch gaps after this date (YYYY-MM-DD) */
  startDate?: string;
  /** Only fetch gaps before this date (YYYY-MM-DD) */
  endDate?: string;
  /** Filter by team member ID */
  teamMemberId?: string;
}

export const useShiftGaps = (options: UseShiftGapsOptions = {}) => {
  const { organizationId } = useAuth();
  const [gaps, setGaps] = useState<ResolvedGap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGaps = useCallback(async () => {
    if (!organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch raw gaps from the view
      let query = supabase
        .from('shift_attendance_gaps')
        .select('*')
        .eq('organization_id', organizationId)
        .order('shift_date', { ascending: true });

      if (options.startDate) {
        query = query.gte('shift_date', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('shift_date', options.endDate);
      }
      if (options.teamMemberId) {
        query = query.eq('team_member_id', options.teamMemberId);
      }

      const { data: rawGaps, error: gapError } = await query;

      if (gapError) throw gapError;
      if (!rawGaps || rawGaps.length === 0) {
        setGaps([]);
        return;
      }

      // 2. Cross-reference against NEXUS activity_logs for existing decisions
      // Look for performance_event_excused, performance_event_approved, 
      // and sick_day_manual entries that match (team_member_id + event_date)
      const memberIds = [...new Set(rawGaps.map(g => g.team_member_id))];
      const shiftDates = [...new Set(rawGaps.map(g => g.shift_date))];

      const { data: nexusEvents, error: nexusError } = await supabase
        .from('activity_logs')
        .select('id, activity_type, details, created_at')
        .eq('organization_id', organizationId)
        .in('activity_type', [
          'performance_event_excused',
          'performance_event_approved',
          'performance_event_rejected',
        ]);

      if (nexusError) {
        console.warn('Could not fetch NEXUS events for cross-reference:', nexusError);
      }

      // Build a lookup: "memberId|date" → resolution
      const resolutionMap = new Map<string, {
        activity_log_id: string;
        activity_type: string;
        reason?: string;
        resolved_at: string;
      }>();

      if (nexusEvents) {
        for (const event of nexusEvents) {
          const details = event.details as Record<string, any>;
          const memberId = details?.team_member_id;
          const eventDate = details?.event_date;

          if (memberId && eventDate) {
            const key = `${memberId}|${eventDate}`;
            // Check if this is for one of our gap members/dates
            if (memberIds.includes(memberId) && shiftDates.includes(eventDate)) {
              resolutionMap.set(key, {
                activity_log_id: event.id,
                activity_type: event.activity_type,
                reason: details.reason,
                resolved_at: event.created_at,
              });
            }
          }
        }
      }

      // 3. Merge gaps with resolution status
      const resolvedGaps: ResolvedGap[] = rawGaps.map(gap => {
        const key = `${gap.team_member_id}|${gap.shift_date}`;
        const resolution = resolutionMap.get(key);

        let resolutionType: GapResolution = 'unresolved';
        if (resolution) {
          if (resolution.activity_type === 'performance_event_excused') {
            // Check if it's specifically a sick day
            resolutionType = resolution.reason?.includes('SICK') ? 'sick_day' : 'excused';
          } else if (resolution.activity_type === 'performance_event_approved') {
            resolutionType = 'demerit';
          } else if (resolution.activity_type === 'performance_event_rejected') {
            resolutionType = 'dismissed';
          }
        }

        return {
          ...gap,
          scheduled_hours: Number(gap.scheduled_hours),
          wage_rate: gap.wage_rate ? Number(gap.wage_rate) : null,
          scheduled_pay: gap.scheduled_pay ? Number(gap.scheduled_pay) : null,
          resolution: resolutionType,
          resolution_details: resolution || undefined,
        };
      });

      setGaps(resolvedGaps);
    } catch (err) {
      console.error('Error fetching shift gaps:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance gaps');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, options.startDate, options.endDate, options.teamMemberId]);

  useEffect(() => {
    fetchGaps();
  }, [fetchGaps]);

  // Derived stats
  const stats = useMemo(() => {
    const total = gaps.length;
    const unresolved = gaps.filter(g => g.resolution === 'unresolved').length;
    const excused = gaps.filter(g => g.resolution === 'excused' || g.resolution === 'sick_day').length;
    const demerits = gaps.filter(g => g.resolution === 'demerit').length;
    const dismissed = gaps.filter(g => g.resolution === 'dismissed').length;
    const unresolvedHours = gaps
      .filter(g => g.resolution === 'unresolved')
      .reduce((sum, g) => sum + g.scheduled_hours, 0);
    const unresolvedPay = gaps
      .filter(g => g.resolution === 'unresolved')
      .reduce((sum, g) => sum + (g.scheduled_pay || 0), 0);

    return { total, unresolved, excused, demerits, dismissed, unresolvedHours, unresolvedPay };
  }, [gaps]);

  return {
    gaps,
    stats,
    isLoading,
    error,
    refetch: fetchGaps,
  };
};
