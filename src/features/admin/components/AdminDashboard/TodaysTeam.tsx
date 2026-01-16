import React, { useEffect, useState } from "react";
import { Users, Clock, ChevronRight } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useTeamStore } from "@/stores/teamStore";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import type { ScheduleShift } from "@/types/schedule";

/**
 * ============================================================================
 * TODAY'S TEAM - L5 Design
 * ============================================================================
 * Nexus Dashboard widget showing who's working today
 * 
 * L5 Design:
 * - Gray section icon (structural, not competing)
 * - Compact avatar row with overflow indicator
 * - Click to expand or navigate to full schedule
 * 
 * Data Source: 7shifts schedule via scheduleStore
 * ============================================================================
 */

export function TodaysTeam() {
  const navigate = useNavigate();
  const { currentSchedule, fetchCurrentSchedule, fetchShifts, scheduleShifts } =
    useScheduleStore();
  const { members, fetchTeamMembers } = useTeamStore();
  const { organization } = useAuth();
  const [todayShifts, setTodayShifts] = useState<ScheduleShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load team members
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Load the current schedule and shifts
  useEffect(() => {
    const loadSchedule = async () => {
      setIsLoading(true);
      try {
        const schedule = await fetchCurrentSchedule();
        if (schedule?.id) {
          await fetchShifts(schedule.id);
        }
      } catch (error) {
        console.error("Error loading schedule:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedule();
  }, [fetchCurrentSchedule, fetchShifts]);

  // Filter shifts for today's date
  useEffect(() => {
    const orgTimezone =
      organization?.settings?.default_timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    const today = new Date();
    let todayStr;
    try {
      todayStr = today
        .toLocaleDateString("en-CA", {
          timeZone: orgTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, "-");
    } catch (e) {
      todayStr = today.toISOString().split("T")[0];
    }

    // Filter shifts for today
    const shiftsForToday = scheduleShifts.filter(
      (shift) => shift.shift_date === todayStr
    );

    // Deduplicate by employee
    const uniqueShifts: Record<string, ScheduleShift> = {};
    shiftsForToday.forEach((shift) => {
      const key = shift.employee_id || shift.employee_name;
      if (!key) return;
      if (!uniqueShifts[key] || parseInt(shift.id) > parseInt(uniqueShifts[key].id)) {
        uniqueShifts[key] = shift;
      }
    });

    setTodayShifts(Object.values(uniqueShifts));
  }, [scheduleShifts, organization?.settings?.default_timezone]);

  // Get avatar URL for a shift
  const getAvatarUrl = (shift: ScheduleShift) => {
    const teamMember = members.find(
      (member) => String(member.punch_id) === String(shift.employee_id)
    );
    if (teamMember?.avatar_url) return teamMember.avatar_url;
    
    const seed = shift.employee_id || shift.employee_name?.replace(/\s+/g, "") || "default";
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  };

  // Get display name for a shift
  const getDisplayName = (shift: ScheduleShift) => {
    const teamMember = members.find(
      (member) => String(member.punch_id) === String(shift.employee_id)
    );
    if (teamMember?.display_name) return teamMember.display_name;
    
    const firstName = shift.first_name || shift.employee_name?.split(" ")[0] || "";
    return firstName;
  };

  // Format time
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "p" : "a";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, "0")}${period}`;
  };

  // Get today's day name
  const todayName = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: organization?.settings?.default_timezone || undefined,
  });

  const maxVisible = 6;
  const visibleShifts = todayShifts.slice(0, maxVisible);
  const overflowCount = todayShifts.length - maxVisible;

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Today's Team</h3>
            <p className="text-xs text-gray-500">{todayName}</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/admin/team?tab=schedule")}
          className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
        >
          View Schedule
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-20">
          <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : todayShifts.length > 0 ? (
        <div className="space-y-2">
          {/* Avatar Stack Row */}
          <div className="flex items-center gap-1">
            {visibleShifts.map((shift, idx) => (
              <div
                key={shift.id}
                className="relative group"
                style={{ zIndex: maxVisible - idx }}
              >
                <img
                  src={getAvatarUrl(shift)}
                  alt={getDisplayName(shift)}
                  className="w-9 h-9 rounded-full bg-gray-700 object-cover ring-2 ring-gray-800 hover:ring-primary-500/50 transition-all cursor-pointer"
                  title={`${getDisplayName(shift)} • ${formatTime(shift.start_time)}-${formatTime(shift.end_time)}`}
                  onError={(e) => {
                    const seed = shift.employee_id || shift.employee_name?.replace(/\s+/g, "") || "default";
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                  }}
                />
                {/* Green online dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-gray-800 rounded-full" />
              </div>
            ))}
            {overflowCount > 0 && (
              <div className="w-9 h-9 rounded-full bg-gray-700 ring-2 ring-gray-800 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-400">+{overflowCount}</span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-700/50">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Users className="w-3 h-3" />
              <span><span className="text-white font-medium">{todayShifts.length}</span> scheduled</span>
            </div>
            {todayShifts[0] && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>First in: <span className="text-white font-medium">{formatTime(todayShifts[0].start_time)}</span></span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="w-10 h-10 mx-auto bg-gray-800/50 rounded-full flex items-center justify-center mb-2">
            <span className="text-lg">🌞</span>
          </div>
          <p className="text-sm text-gray-400">No one scheduled today</p>
          <p className="text-xs text-gray-500 mt-1">Enjoy your day off!</p>
        </div>
      )}
    </div>
  );
}
