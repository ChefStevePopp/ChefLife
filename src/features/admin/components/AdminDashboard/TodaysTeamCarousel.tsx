import React, { useEffect, useState, useRef } from "react";
import { Users, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useTeamStore } from "@/stores/teamStore";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import type { ScheduleShift } from "@/types/schedule";

/**
 * ============================================================================
 * TODAY'S TEAM CAROUSEL - L5 Design
 * ============================================================================
 * Swipeable horizontal carousel with 2-up stacked team member cards
 * 
 * Layout: 4 columns x 2 rows = 8 visible at once on desktop
 * Each column shows 2 team members stacked vertically
 * ============================================================================
 */

export function TodaysTeamCarousel() {
  const navigate = useNavigate();
  const { fetchCurrentSchedule, fetchShifts, scheduleShifts } = useScheduleStore();
  const { members, fetchTeamMembers } = useTeamStore();
  const { organization } = useAuth();
  const [todayShifts, setTodayShifts] = useState<ScheduleShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Columns visible (responsive) - each column shows 2 people stacked
  const [columnsVisible, setColumnsVisible] = useState(4);

  useEffect(() => {
    const updateColumnsVisible = () => {
      if (window.innerWidth < 640) setColumnsVisible(2);
      else if (window.innerWidth < 768) setColumnsVisible(3);
      else if (window.innerWidth < 1024) setColumnsVisible(4);
      else setColumnsVisible(4);
    };
    updateColumnsVisible();
    window.addEventListener("resize", updateColumnsVisible);
    return () => window.removeEventListener("resize", updateColumnsVisible);
  }, []);

  // Load team members
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Load schedule
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

  // Filter shifts for today
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

    // Sort by start time
    const sorted = Object.values(uniqueShifts).sort((a, b) => {
      return (a.start_time || "").localeCompare(b.start_time || "");
    });

    setTodayShifts(sorted);
  }, [scheduleShifts, organization?.settings?.default_timezone]);

  // Get team member data
  const getTeamMember = (shift: ScheduleShift) => {
    return members.find(
      (member) => String(member.punch_id) === String(shift.employee_id)
    );
  };

  const getAvatarUrl = (shift: ScheduleShift) => {
    const teamMember = getTeamMember(shift);
    if (teamMember?.avatar_url) return teamMember.avatar_url;
    const seed = shift.employee_id || shift.employee_name?.replace(/\s+/g, "") || "default";
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  };

  const getDisplayName = (shift: ScheduleShift) => {
    const teamMember = getTeamMember(shift);
    if (teamMember?.display_name) return teamMember.display_name;
    const firstName = shift.first_name || shift.employee_name?.split(" ")[0] || "";
    return firstName;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "p" : "a";
    const hour12 = hours % 12 || 12;
    return `${hour12}${minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : ""}${period}`;
  };

  const todayName = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: organization?.settings?.default_timezone || undefined,
  });

  // Pagination - 2 people per column
  const peoplePerPage = columnsVisible * 2;
  const totalPages = Math.ceil(todayShifts.length / peoplePerPage);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < totalPages - 1;

  const goBack = () => {
    if (canGoBack) setCurrentIndex(currentIndex - 1);
  };

  const goForward = () => {
    if (canGoForward) setCurrentIndex(currentIndex + 1);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && canGoForward) {
        goForward();
      } else if (diff < 0 && canGoBack) {
        goBack();
      }
    }
    setTouchStart(null);
  };

  // Get visible shifts for current page
  const visibleShifts = todayShifts.slice(
    currentIndex * peoplePerPage,
    (currentIndex + 1) * peoplePerPage
  );

  // Organize into columns (2 per column)
  const columns: ScheduleShift[][] = [];
  for (let i = 0; i < visibleShifts.length; i += 2) {
    columns.push(visibleShifts.slice(i, i + 2));
  }

  // Single team member row component
  const TeamMemberRow = ({ shift }: { shift: ScheduleShift }) => {
    const teamMember = getTeamMember(shift);
    return (
      <div
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
        onClick={() => navigate(`/admin/team?member=${shift.employee_id}`)}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={getAvatarUrl(shift)}
            alt={getDisplayName(shift)}
            className="w-10 h-10 rounded-full bg-gray-700 object-cover ring-2 ring-gray-600"
            onError={(e) => {
              const seed = shift.employee_id || "default";
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
            }}
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {getDisplayName(shift)}
            </span>
            <span className="px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded text-[10px] font-medium flex-shrink-0">
              {shift.role || teamMember?.primary_role || "Staff"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatTime(shift.start_time)}-{formatTime(shift.end_time)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Today's Team</h3>
            <p className="text-xs text-gray-500">{todayName} • {todayShifts.length} scheduled</p>
          </div>
        </div>

        {/* Navigation Arrows */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                canGoBack
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 min-w-[3rem] text-center">
              {currentIndex + 1} / {totalPages}
            </span>
            <button
              onClick={goForward}
              disabled={!canGoForward}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                canGoForward
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel */}
      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : todayShifts.length > 0 ? (
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Columns Grid - each column has 2 stacked team members */}
          <div 
            className="grid gap-3" 
            style={{ gridTemplateColumns: `repeat(${columnsVisible}, 1fr)` }}
          >
            {columns.map((column, colIdx) => (
              <div 
                key={colIdx} 
                className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden"
              >
                {column.map((shift, rowIdx) => (
                  <div key={shift.id}>
                    {rowIdx > 0 && <div className="border-t border-gray-700/50" />}
                    <TeamMemberRow shift={shift} />
                  </div>
                ))}
                {/* Fill empty slot if odd number in column */}
                {column.length === 1 && (
                  <div className="border-t border-gray-700/50 p-2 h-[60px]" />
                )}
              </div>
            ))}
          </div>

          {/* Dot Indicators */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1.5 mt-4">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? "bg-primary-500 w-4"
                      : "bg-gray-600 hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto bg-gray-800/50 rounded-full flex items-center justify-center mb-2">
            <span className="text-xl">🌞</span>
          </div>
          <h4 className="text-sm font-medium text-white mb-1">No One Scheduled Today</h4>
          <p className="text-xs text-gray-400">Enjoy your day off!</p>
        </div>
      )}
    </div>
  );
}
