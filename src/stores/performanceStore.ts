/**
 * Performance Store
 * 
 * Manages team performance data including:
 * - Point events and reductions
 * - Performance cycles
 * - Coaching records
 * - Performance Improvement Plans (PIPs)
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import type {
  PointEvent,
  PointReduction,
  PerformanceCycle,
  CoachingRecord,
  PerformanceImprovementPlan,
  TeamMemberPerformance,
  PerformanceConfig,
  PerformanceTier,
  CoachingStage,
  PointEventType,
  PointReductionType,
  DEFAULT_PERFORMANCE_CONFIG,
} from "@/features/team/types";

// =============================================================================
// STORE TYPES
// =============================================================================

interface PerformanceStore {
  // State
  isLoading: boolean;
  error: string | null;
  currentCycle: PerformanceCycle | null;
  cycles: PerformanceCycle[];
  config: PerformanceConfig;
  
  // Team performance data
  teamPerformance: Map<string, TeamMemberPerformance>;
  
  // Actions
  fetchCurrentCycle: () => Promise<void>;
  fetchAllCycles: () => Promise<void>;
  fetchConfig: () => Promise<void>;
  fetchTeamPerformance: (cycleId?: string) => Promise<void>;
  fetchMemberPerformance: (memberId: string, cycleId?: string) => Promise<TeamMemberPerformance | null>;
  
  // Point management
  addPointEvent: (memberId: string, eventType: PointEventType, notes?: string, eventDate?: string) => Promise<void>;
  addPointReduction: (memberId: string, reductionType: PointReductionType, notes?: string, eventDate?: string) => Promise<void>;
  
  // Coaching management
  updateCoachingRecord: (recordId: string, updates: Partial<CoachingRecord>) => Promise<void>;
  generateCoachingLetter: (recordId: string) => Promise<string | null>;
  
  // PIP management
  createPIP: (memberId: string, pip: Omit<PerformanceImprovementPlan, 'id' | 'created_at' | 'organization_id'>) => Promise<void>;
  updatePIP: (pipId: string, updates: Partial<PerformanceImprovementPlan>) => Promise<void>;
  
  // Utility
  calculateTier: (points: number) => PerformanceTier;
  calculateCoachingStage: (points: number) => CoachingStage | null;
  getReductionsInLast30Days: (memberId: string) => number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const calculateTierFromConfig = (points: number, config: PerformanceConfig): PerformanceTier => {
  if (points <= config.tier_thresholds.tier1_max) return 1;
  if (points <= config.tier_thresholds.tier2_max) return 2;
  return 3;
};

const calculateCoachingStageFromConfig = (points: number, config: PerformanceConfig): CoachingStage | null => {
  const { coaching_thresholds } = config;
  if (points >= coaching_thresholds.stage5) return 5;
  if (points >= coaching_thresholds.stage4) return 4;
  if (points >= coaching_thresholds.stage3) return 3;
  if (points >= coaching_thresholds.stage2) return 2;
  if (points >= coaching_thresholds.stage1) return 1;
  return null;
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const usePerformanceStore = create<PerformanceStore>((set, get) => ({
  isLoading: false,
  error: null,
  currentCycle: null,
  cycles: [],
  config: {
    point_values: {
      no_call_no_show: 6,
      dropped_shift_no_coverage: 4,
      unexcused_absence: 2,
      tardiness_major: 2,
      tardiness_minor: 1,
      early_departure: 2,
      late_notification: 1,
      food_safety_violation: 3,
      insubordination: 3,
    },
    reduction_values: {
      cover_shift_urgent: -2,
      cover_shift_standard: -1,
      stay_late: -1,
      arrive_early: -1,
      training_mentoring: -1,
      special_event: -1,
    },
    tier_thresholds: {
      tier1_max: 2,
      tier2_max: 5,
    },
    coaching_thresholds: {
      stage1: 6,
      stage2: 8,
      stage3: 10,
      stage4: 12,
      stage5: 15,
    },
    cycle_length_months: 4,
    max_reduction_per_30_days: 3,
  },
  teamPerformance: new Map(),

  // =========================================================================
  // FETCH OPERATIONS
  // =========================================================================

  fetchCurrentCycle: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      const { data, error } = await supabase
        .from("performance_cycles")
        .select("*")
        .eq("organization_id", user.user_metadata.organizationId)
        .eq("is_current", true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      // If no current cycle, create one
      if (!data) {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + get().config.cycle_length_months);
        endDate.setDate(0); // Last day of previous month

        const { data: newCycle, error: createError } = await supabase
          .from("performance_cycles")
          .insert({
            organization_id: user.user_metadata.organizationId,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            is_current: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        set({ currentCycle: newCycle });
      } else {
        set({ currentCycle: data });
      }
    } catch (error) {
      console.error("Error fetching current cycle:", error);
      set({ error: "Failed to load performance cycle" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAllCycles: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      const { data, error } = await supabase
        .from("performance_cycles")
        .select("*")
        .eq("organization_id", user.user_metadata.organizationId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      set({ cycles: data || [] });
    } catch (error) {
      console.error("Error fetching cycles:", error);
    }
  },

  fetchConfig: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      // Fetch performance_config from organizations table
      const { data, error } = await supabase
        .from("organizations")
        .select("performance_config")
        .eq("id", user.user_metadata.organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.performance_config) {
        set({ config: data.performance_config });
      }
    } catch (error) {
      console.error("Error fetching performance config:", error);
      // Keep default config
    }
  },

  fetchTeamPerformance: async (cycleId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      const targetCycleId = cycleId || get().currentCycle?.id;
      if (!targetCycleId) {
        await get().fetchCurrentCycle();
      }

      const finalCycleId = cycleId || get().currentCycle?.id;
      if (!finalCycleId) throw new Error("No cycle available");

      // Fetch all team members
      const { data: members, error: membersError } = await supabase
        .from("organization_team_members")
        .select("*")
        .eq("organization_id", user.user_metadata.organizationId)
        .eq("is_active", true);

      if (membersError) throw membersError;

      // Fetch all point events for cycle
      const { data: events, error: eventsError } = await supabase
        .from("performance_point_events")
        .select("*")
        .eq("organization_id", user.user_metadata.organizationId)
        .eq("cycle_id", finalCycleId);

      if (eventsError) throw eventsError;

      // Fetch all point reductions for cycle
      const { data: reductions, error: reductionsError } = await supabase
        .from("performance_point_reductions")
        .select("*")
        .eq("organization_id", user.user_metadata.organizationId)
        .eq("cycle_id", finalCycleId);

      if (reductionsError) throw reductionsError;

      // Fetch all coaching records
      const { data: coaching, error: coachingError } = await supabase
        .from("performance_coaching_records")
        .select("*")
        .eq("organization_id", user.user_metadata.organizationId);

      if (coachingError) throw coachingError;

      // Fetch all active PIPs
      const { data: pips, error: pipsError } = await supabase
        .from("performance_improvement_plans")
        .select("*")
        .eq("organization_id", user.user_metadata.organizationId)
        .eq("status", "active");

      if (pipsError) throw pipsError;

      // Build performance map
      const performanceMap = new Map<string, TeamMemberPerformance>();
      const config = get().config;

      members?.forEach(member => {
        const memberEvents = events?.filter(e => e.team_member_id === member.id) || [];
        const memberReductions = reductions?.filter(r => r.team_member_id === member.id) || [];
        const memberCoaching = coaching?.filter(c => c.team_member_id === member.id) || [];
        const memberPIP = pips?.find(p => p.team_member_id === member.id);

        // Calculate total points
        const totalEventPoints = memberEvents.reduce((sum, e) => sum + e.points, 0);
        const totalReductionPoints = memberReductions.reduce((sum, r) => sum + r.points, 0);
        const currentPoints = Math.max(0, totalEventPoints + totalReductionPoints);

        // Combine and sort events/reductions by date
        const allEntries = [
          ...memberEvents.map(e => ({ ...e, entry_type: 'event' as const })),
          ...memberReductions.map(r => ({ ...r, entry_type: 'reduction' as const })),
        ].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

        // Calculate running balances
        let runningBalance = 0;
        allEntries.forEach(entry => {
          runningBalance = Math.max(0, runningBalance + entry.points);
          entry.running_balance = runningBalance;
        });

        performanceMap.set(member.id, {
          team_member_id: member.id,
          team_member: member,
          current_points: currentPoints,
          tier: calculateTierFromConfig(currentPoints, config),
          coaching_stage: calculateCoachingStageFromConfig(currentPoints, config),
          active_pip: memberPIP,
          events: allEntries as any,
          coaching_records: memberCoaching,
        });
      });

      set({ teamPerformance: performanceMap });
    } catch (error) {
      console.error("Error fetching team performance:", error);
      set({ error: "Failed to load team performance data" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMemberPerformance: async (memberId: string, cycleId?: string) => {
    // Check if we have it cached
    const cached = get().teamPerformance.get(memberId);
    if (cached) return cached;

    // Otherwise fetch fresh
    await get().fetchTeamPerformance(cycleId);
    return get().teamPerformance.get(memberId) || null;
  },

  // =========================================================================
  // POINT MANAGEMENT
  // =========================================================================

  addPointEvent: async (memberId: string, eventType: PointEventType, notes?: string, eventDate?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      const config = get().config;
      const points = config.point_values[eventType];
      const cycle = get().currentCycle;

      if (!cycle) throw new Error("No active cycle");

      // Get member name for toast
      const { data: member } = await supabase
        .from("organization_team_members")
        .select("first_name, last_name")
        .eq("id", memberId)
        .single();

      const { error } = await supabase
        .from("performance_point_events")
        .insert({
          team_member_id: memberId,
          organization_id: user.user_metadata.organizationId,
          event_type: eventType,
          points,
          event_date: eventDate || new Date().toISOString().split('T')[0],
          cycle_id: cycle.id,
          notes,
          created_by: user.id,
        });

      if (error) throw error;

      // Log via Nexus
      await nexus({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "team_member_updated",
        details: {
          team_member_id: memberId,
          name: member ? `${member.first_name} ${member.last_name}` : 'Team member',
          action: 'point_event_added',
          event_type: eventType,
          points,
        },
      });

      // Refresh data
      await get().fetchTeamPerformance();

      // Check if this triggered a coaching threshold
      const memberPerf = get().teamPerformance.get(memberId);
      if (memberPerf?.coaching_stage) {
        // Check if we need to create a new coaching record
        const existingRecord = memberPerf.coaching_records.find(
          r => r.stage === memberPerf.coaching_stage && r.status !== 'completed'
        );
        
        if (!existingRecord) {
          // Create new coaching record
          await supabase
            .from("performance_coaching_records")
            .insert({
              team_member_id: memberId,
              organization_id: user.user_metadata.organizationId,
              stage: memberPerf.coaching_stage,
              triggered_at: new Date().toISOString(),
              triggered_points: memberPerf.current_points,
              status: 'pending',
              conversation_scheduled: false,
              barriers_discussed: false,
              resources_identified: false,
              strategy_developed: false,
              letter_generated: false,
            });

          toast.error(
            `${member?.first_name || 'Team member'} has reached Stage ${memberPerf.coaching_stage} coaching threshold`,
            { duration: 6000 }
          );
        }
      }
    } catch (error) {
      console.error("Error adding point event:", error);
      toast.error("Failed to add point event");
    }
  },

  addPointReduction: async (memberId: string, reductionType: PointReductionType, notes?: string, eventDate?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      const config = get().config;

      // Check 30-day reduction limit
      const reductionsInLast30Days = get().getReductionsInLast30Days(memberId);
      if (Math.abs(reductionsInLast30Days) >= config.max_reduction_per_30_days) {
        toast.error(`Maximum ${config.max_reduction_per_30_days} point reduction per 30 days reached`);
        return;
      }

      const points = config.reduction_values[reductionType]; // Already negative
      const cycle = get().currentCycle;

      if (!cycle) throw new Error("No active cycle");

      // Check if this would exceed the limit
      const potentialTotal = Math.abs(reductionsInLast30Days) + Math.abs(points);
      const adjustedPoints = potentialTotal > config.max_reduction_per_30_days
        ? -(config.max_reduction_per_30_days - Math.abs(reductionsInLast30Days))
        : points;

      if (adjustedPoints === 0) {
        toast.error(`Maximum ${config.max_reduction_per_30_days} point reduction per 30 days reached`);
        return;
      }

      // Get member name for toast
      const { data: member } = await supabase
        .from("organization_team_members")
        .select("first_name, last_name")
        .eq("id", memberId)
        .single();

      const { error } = await supabase
        .from("performance_point_reductions")
        .insert({
          team_member_id: memberId,
          organization_id: user.user_metadata.organizationId,
          reduction_type: reductionType,
          points: adjustedPoints,
          event_date: eventDate || new Date().toISOString().split('T')[0],
          cycle_id: cycle.id,
          notes,
          created_by: user.id,
        });

      if (error) throw error;

      // Log via Nexus
      await nexus({
        organization_id: user.user_metadata.organizationId,
        user_id: user.id,
        activity_type: "team_member_updated",
        details: {
          team_member_id: memberId,
          name: member ? `${member.first_name} ${member.last_name}` : 'Team member',
          action: 'point_reduction_added',
          reduction_type: reductionType,
          points: adjustedPoints,
        },
      });

      // Refresh data
      await get().fetchTeamPerformance();

      if (adjustedPoints !== points) {
        toast.success(`${Math.abs(adjustedPoints)} point reduction applied (capped at 30-day limit)`);
      }
    } catch (error) {
      console.error("Error adding point reduction:", error);
      toast.error("Failed to add point reduction");
    }
  },

  // =========================================================================
  // COACHING MANAGEMENT
  // =========================================================================

  updateCoachingRecord: async (recordId: string, updates: Partial<CoachingRecord>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      const { error } = await supabase
        .from("performance_coaching_records")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recordId)
        .eq("organization_id", user.user_metadata.organizationId);

      if (error) throw error;

      // Refresh data
      await get().fetchTeamPerformance();
      toast.success("Coaching record updated");
    } catch (error) {
      console.error("Error updating coaching record:", error);
      toast.error("Failed to update coaching record");
    }
  },

  generateCoachingLetter: async (recordId: string) => {
    // TODO: Implement letter generation
    // This will integrate with document templates
    toast.error("Letter generation coming soon");
    return null;
  },

  // =========================================================================
  // PIP MANAGEMENT
  // =========================================================================

  createPIP: async (memberId: string, pip: Omit<PerformanceImprovementPlan, 'id' | 'created_at' | 'organization_id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      const { error } = await supabase
        .from("performance_improvement_plans")
        .insert({
          ...pip,
          team_member_id: memberId,
          organization_id: user.user_metadata.organizationId,
        });

      if (error) throw error;

      // Refresh data
      await get().fetchTeamPerformance();
      toast.success("Performance Improvement Plan created");
    } catch (error) {
      console.error("Error creating PIP:", error);
      toast.error("Failed to create PIP");
    }
  },

  updatePIP: async (pipId: string, updates: Partial<PerformanceImprovementPlan>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) throw new Error("No organization ID");

      const { error } = await supabase
        .from("performance_improvement_plans")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pipId)
        .eq("organization_id", user.user_metadata.organizationId);

      if (error) throw error;

      // Refresh data
      await get().fetchTeamPerformance();
      toast.success("PIP updated");
    } catch (error) {
      console.error("Error updating PIP:", error);
      toast.error("Failed to update PIP");
    }
  },

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  calculateTier: (points: number) => {
    return calculateTierFromConfig(points, get().config);
  },

  calculateCoachingStage: (points: number) => {
    return calculateCoachingStageFromConfig(points, get().config);
  },

  getReductionsInLast30Days: (memberId: string) => {
    const memberPerf = get().teamPerformance.get(memberId);
    if (!memberPerf) return 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return memberPerf.events
      .filter(e => 
        'reduction_type' in e && 
        new Date(e.event_date) >= thirtyDaysAgo
      )
      .reduce((sum, e) => sum + e.points, 0);
  },
}));
