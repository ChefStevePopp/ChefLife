/**
 * Schedule Week View
 * 7-day grid/scroll view of shifts with role colors, data pills, and filters.
 *
 * @diagnostics src/features/admin/components/sections/ScheduleManager/components/ScheduleWeekView.tsx
 * @pattern L5 responsive-grid
 */
import React, { useMemo, useState } from 'react';
import { Clock, ChevronDown, Filter } from 'lucide-react';
import { ScheduleShift } from '@/types/schedule';
import { parseLocalDate, getLocalDateString, formatDateShort } from '@/utils/dateUtils';
import type { PerformanceTier } from '@/features/team/types';
import type { TeamModuleConfig } from '../../TeamSettings/types';
import { DEFAULT_TEAM_CONFIG } from '../../TeamSettings/types';

type CardDisplayConfig = TeamModuleConfig['card_display'];

interface ScheduleWeekViewProps {
  scheduleShifts: ScheduleShift[];
  startDate: string;
  timeFormat?: '12h' | '24h';
  tierMap?: Record<string, PerformanceTier>;
  cardDisplay?: CardDisplayConfig;
}

// ── Helpers ──────────────────────────────────────────────────────

const formatTime = (timeStr: string, format: "12h" | "24h"): string => {
  if (!timeStr) return "";
  if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
    return format === "12h" ? timeStr : convertTo24Hour(timeStr);
  }
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
    return format === "24h" ? timeStr : convertTo12Hour(timeStr);
  }
  return timeStr;
};

const convertTo12Hour = (time24: string): string => {
  const [hourStr, minute] = time24.split(":");
  const hour = parseInt(hourStr, 10);
  if (hour === 0) return `12:${minute} AM`;
  if (hour < 12) return `${hour}:${minute} AM`;
  if (hour === 12) return `12:${minute} PM`;
  return `${hour - 12}:${minute} PM`;
};

const convertTo24Hour = (time12: string): string => {
  const [timePart, meridiem] = time12.toLowerCase().split(/(am|pm)/);
  let [hourStr, minute] = timePart.trim().split(":");
  let hour = parseInt(hourStr, 10);
  if (meridiem.includes("pm") && hour < 12) hour += 12;
  else if (meridiem.includes("am") && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${minute}`;
};

/** Calculate shift duration in hours */
const calcShiftHours = (startTime: string, endTime: string, breakMin: number = 0): number => {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight
  return Math.max(0, (mins - (breakMin || 0)) / 60);
};

/** Derive department from role string */
const getDepartment = (role?: string): 'FOH' | 'BOH' => {
  if (!role) return 'BOH';
  const upper = role.toUpperCase();
  if (upper.startsWith('FOH')) return 'FOH';
  return 'BOH';
};

// Role colors
const getRoleColor = (role: string): string => {
  const roleHash = role.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'bg-yellow-400/20 text-yellow-400 border-yellow-400/30',
    'bg-green-400/20 text-green-400 border-green-400/30',
    'bg-blue-400/20 text-blue-400 border-blue-400/30',
    'bg-purple-400/20 text-purple-400 border-purple-400/30',
    'bg-orange-400/20 text-orange-400 border-orange-400/30',
    'bg-pink-400/20 text-pink-400 border-pink-400/30',
  ];
  return colors[roleHash % colors.length];
};

// ── Main Component ───────────────────────────────────────────────

export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  scheduleShifts,
  startDate,
  timeFormat = '12h',
  tierMap,
  cardDisplay = DEFAULT_TEAM_CONFIG.card_display,
}) => {
  // Filter state
  const [deptFilter, setDeptFilter] = useState<'ALL' | 'FOH' | 'BOH'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Pre-compute weekly hours per employee (from ALL shifts, pre-filter)
  const weeklyHours = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of scheduleShifts) {
      const key = s.employee_name;
      const hrs = calcShiftHours(s.start_time, s.end_time, s.break_duration);
      map[key] = (map[key] || 0) + hrs;
    }
    return map;
  }, [scheduleShifts]);

  // Extract unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const s of scheduleShifts) {
      if (s.role) roles.add(s.role);
    }
    return Array.from(roles).sort();
  }, [scheduleShifts]);

  // Apply filters
  const filteredShifts = useMemo(() => {
    return scheduleShifts.filter(s => {
      if (deptFilter !== 'ALL' && getDepartment(s.role) !== deptFilter) return false;
      if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
      return true;
    });
  }, [scheduleShifts, deptFilter, roleFilter]);

  // Process filtered shifts into day columns
  const daysWithShifts = useMemo(() => {
    const shiftsByDate = filteredShifts.reduce((acc, shift) => {
      if (!acc[shift.shift_date]) acc[shift.shift_date] = [];
      acc[shift.shift_date].push(shift);
      return acc;
    }, {} as Record<string, ScheduleShift[]>);

    const start = parseLocalDate(startDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const allDays = Array(7).fill(null).map((_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = getLocalDateString(date);
      return {
        date: dateStr,
        dayOfWeek: dayNames[date.getDay()],
        displayDate: formatDateShort(dateStr),
        shifts: shiftsByDate[dateStr] || [],
      };
    });

    return allDays.filter(day => day.shifts.length > 0);
  }, [filteredShifts, startDate]);

  // Summary stats
  const totalShifts = filteredShifts.length;
  const totalHours = Object.values(weeklyHours).reduce((sum, h) => sum + h, 0);
  const isFiltered = deptFilter !== 'ALL' || roleFilter !== 'ALL';

  return (
    <div className="space-y-4">
      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-1">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />

        {/* Department Toggle */}
        <div className="inline-flex rounded-lg border border-gray-700/50 overflow-hidden text-xs">
          {(['ALL', 'FOH', 'BOH'] as const).map(dept => (
            <button
              key={dept}
              onClick={() => { setDeptFilter(dept); setRoleFilter('ALL'); }}
              className={`px-3 py-1.5 font-medium transition-colors ${
                deptFilter === dept
                  ? dept === 'FOH'
                    ? 'bg-blue-500/20 text-blue-400'
                    : dept === 'BOH'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-gray-700/50 text-white'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {dept === 'ALL' ? 'All' : dept}
            </button>
          ))}
        </div>

        {/* Role Dropdown */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-primary-500/50 cursor-pointer"
        >
          <option value="ALL">All Roles</option>
          {uniqueRoles
            .filter(r => deptFilter === 'ALL' || getDepartment(r) === deptFilter)
            .map(role => (
              <option key={role} value={role}>{role}</option>
            ))
          }
        </select>

        {/* Filter Summary */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-xs text-gray-500">
          <span className="whitespace-nowrap">{totalShifts} shifts</span>
          <span className="text-gray-700 hidden sm:inline">|</span>
          <span className="whitespace-nowrap hidden sm:inline">{totalHours.toFixed(1)}h total</span>
          {isFiltered && (
            <button
              onClick={() => { setDeptFilter('ALL'); setRoleFilter('ALL'); }}
              className="text-primary-400 hover:text-primary-300 font-medium whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Schedule Grid ───────────────────────────────────── */}
      {daysWithShifts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {isFiltered ? 'No shifts match the selected filters' : 'No shifts scheduled for this week'}
        </div>
      ) : (
        <>
          {/* Desktop Grid View — lg (1024px+) catches iPad landscape (1180px) */}
          <div className="hidden lg:grid lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3 xl:gap-4">
            {daysWithShifts.map((day) => (
              <DayColumn key={day.date} day={day} timeFormat={timeFormat} weeklyHours={weeklyHours} tierMap={tierMap} cardDisplay={cardDisplay} />
            ))}
          </div>

          {/* Tablet Portrait / Mobile — Horizontal Scroll (< 1024px) */}
          <div className="lg:hidden relative">
            <div
              className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50 -mx-2 px-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {daysWithShifts.map((day) => (
                <div
                  key={day.date}
                  className="flex-shrink-0 snap-start"
                  style={{ width: 'clamp(200px, 38vw, 260px)' }}
                >
                  <DayColumn day={day} timeFormat={timeFormat} weeklyHours={weeklyHours} tierMap={tierMap} cardDisplay={cardDisplay} />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-1">
              <span>Swipe for more</span>
              <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── Day Column ──────────────────────────────────────────────────

interface DayColumnProps {
  day: {
    date: string;
    dayOfWeek: string;
    displayDate: string;
    shifts: ScheduleShift[];
  };
  timeFormat: '12h' | '24h';
  weeklyHours: Record<string, number>;
  tierMap?: Record<string, PerformanceTier>;
  cardDisplay?: CardDisplayConfig;
}

const DayColumn: React.FC<DayColumnProps> = ({ day, timeFormat, weeklyHours, tierMap, cardDisplay }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Day Header */}
      <div className="mb-3 text-center">
        <div className="text-lg font-semibold text-white">{day.dayOfWeek}</div>
        <div className="text-sm text-gray-400">{day.displayDate}</div>
      </div>

      {/* Shifts */}
      <div className="flex-1 flex flex-col">
        <div
          className="space-y-3 overflow-y-auto pr-1"
          style={{ maxHeight: day.shifts.length > 6 ? '600px' : 'auto' }}
        >
          {day.shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              timeFormat={timeFormat}
              weeklyHours={weeklyHours[shift.employee_name] || 0}
              tier={tierMap?.[shift.employee_name]}
              cardDisplay={cardDisplay}
            />
          ))}
        </div>

        {/* Shift Count */}
        <div className="mt-3 pt-3 border-t border-gray-700/30 text-center">
          <div className="text-xs text-gray-500">
            {day.shifts.length} {day.shifts.length === 1 ? 'shift' : 'shifts'}
          </div>
          {day.shifts.length > 6 && (
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-1">
              <span>Scroll for more</span>
              <ChevronDown className="w-3 h-3 animate-bounce" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Shift Card ──────────────────────────────────────────────────

interface ShiftCardProps {
  shift: ScheduleShift;
  timeFormat: '12h' | '24h';
  weeklyHours: number;
  tier?: PerformanceTier;
  cardDisplay?: CardDisplayConfig;
}

const ShiftCard: React.FC<ShiftCardProps> = ({ shift, timeFormat, weeklyHours, tier, cardDisplay }) => {
  const dept = getDepartment(shift.role);
  const shiftHrs = calcShiftHours(shift.start_time, shift.end_time, shift.break_duration);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 hover:bg-gray-800/70 transition-colors border border-gray-700/50 group">
      <div className="flex flex-col items-center text-center gap-1.5 sm:gap-2">
        {/* Avatar */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
          {shift.avatar_url ? (
            <img src={shift.avatar_url} alt={shift.employee_name} className="w-full h-full object-cover" />
          ) : (
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${shift.employee_name}`} alt={shift.employee_name} className="w-full h-full" />
          )}
        </div>

        {/* Name */}
        <div className="text-white font-medium text-sm leading-tight">
          {shift.employee_name}
        </div>

        {/* Role Badge */}
        {shift.role && (
          <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wide border ${getRoleColor(shift.role)}`}>
            {shift.role}
          </div>
        )}

        {/* Time */}
        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-300">
          <Clock className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{formatTime(shift.start_time, timeFormat)}</span>
          <span>-</span>
          <span className="whitespace-nowrap">{formatTime(shift.end_time, timeFormat)}</span>
        </div>

        {/* ── Data Pills (controlled by TeamSettings config) ── */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {/* Shift hours */}
          {cardDisplay?.show_shift_hours !== false && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700/60 text-gray-300">
              {shiftHrs % 1 === 0 ? shiftHrs : shiftHrs.toFixed(1)}h
            </span>
          )}
          {/* Weekly total */}
          {cardDisplay?.show_weekly_hours !== false && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-500/15 text-primary-400">
              {weeklyHours % 1 === 0 ? weeklyHours : weeklyHours.toFixed(1)}h/wk
            </span>
          )}
          {/* Department */}
          {cardDisplay?.show_department !== false && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              dept === 'FOH'
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-orange-500/15 text-orange-400'
            }`}>
              {dept}
            </span>
          )}
          {/* Tier (only when Team Performance module is active) */}
          {cardDisplay?.show_tier !== false && tier != null && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              tier === 1
                ? 'bg-emerald-500/15 text-emerald-400'
                : tier === 2
                  ? 'bg-yellow-500/15 text-yellow-400'
                  : 'bg-rose-500/15 text-rose-400'
            }`}>
              T{tier}
            </span>
          )}
        </div>

        {/* Break duration if present */}
        {cardDisplay?.show_break_duration !== false && shift.break_duration != null && shift.break_duration > 0 && (
          <div className="text-xs text-gray-500">
            {shift.break_duration}min break
          </div>
        )}

        {/* Notes if present */}
        {cardDisplay?.show_notes !== false && shift.notes && (
          <div className="w-full pt-2 mt-2 border-t border-gray-700/30 text-xs text-gray-400 text-center">
            {shift.notes}
          </div>
        )}
      </div>
    </div>
  );
};
