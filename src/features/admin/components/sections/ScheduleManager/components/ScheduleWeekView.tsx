import React, { useMemo } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { ScheduleShift } from '@/types/schedule';

interface ScheduleWeekViewProps {
  scheduleShifts: ScheduleShift[];
  startDate: string;
  timeFormat?: '12h' | '24h';
}

// Helper function to format time
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

export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  scheduleShifts,
  startDate,
  timeFormat = '12h',
}) => {
  // Process shifts and filter to only days with shifts
  const daysWithShifts = useMemo(() => {
    // Group shifts by date
    const shiftsByDate = scheduleShifts.reduce((acc, shift) => {
      if (!acc[shift.shift_date]) {
        acc[shift.shift_date] = [];
      }
      acc[shift.shift_date].push(shift);
      return acc;
    }, {} as Record<string, ScheduleShift[]>);

    // Create array of all days - starting from MONDAY (not Sunday)
    const start = new Date(startDate + 'T00:00:00'); // Force local time to avoid timezone shift
    
    const allDays = Array(7).fill(null).map((_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      
      // Format date in local time (not UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Get day name from the local date components
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = dayNames[date.getDay()];
      
      // Format the display date from components
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const displayDate = `${monthNames[date.getMonth()]} ${date.getDate()}`;
      
      const dayShifts = shiftsByDate[dateStr] || [];
      
      return {
        date: dateStr,
        dayOfWeek: dayOfWeek,
        displayDate: displayDate,
        shifts: dayShifts,
      };
    });

    // Filter to only days with shifts
    return allDays.filter(day => day.shifts.length > 0);
  }, [scheduleShifts, startDate]);

  if (daysWithShifts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No shifts scheduled for this week
      </div>
    );
  }

  return (
    <>
      {/* Desktop Grid View (1200px+) */}
      <div className="hidden xl:grid xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {daysWithShifts.map((day) => (
          <DayColumn key={day.date} day={day} timeFormat={timeFormat} />
        ))}
      </div>

      {/* Tablet/Mobile Horizontal Scroll (< 1200px) */}
      <div className="xl:hidden relative">
        {/* Scroll Container */}
        <div 
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50"
          style={{ scrollbarWidth: 'thin' }}
        >
          {daysWithShifts.map((day) => (
            <div 
              key={day.date} 
              className="flex-shrink-0 snap-start"
              style={{ 
                width: 'clamp(180px, 40vw, 280px)' // Responsive width
              }}
            >
              <DayColumn day={day} timeFormat={timeFormat} />
            </div>
          ))}
        </div>
        
        {/* Scroll Hint */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-2">
          <span>Swipe for more</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </>
  );
};

// Day Column Component
interface DayColumnProps {
  day: {
    date: string;
    dayOfWeek: string;
    displayDate: string;
    shifts: ScheduleShift[];
  };
  timeFormat: '12h' | '24h';
}

const DayColumn: React.FC<DayColumnProps> = ({ day, timeFormat }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Day Header */}
      <div className="mb-3 text-center">
        <div className="text-lg font-semibold text-white">
          {day.dayOfWeek}
        </div>
        <div className="text-sm text-gray-400">
          {day.displayDate}
        </div>
      </div>

      {/* Shifts Container */}
      <div className="flex-1 flex flex-col">
        <div 
          className="space-y-3 overflow-y-auto pr-1"
          style={{ 
            maxHeight: day.shifts.length > 6 ? '600px' : 'auto',
          }}
        >
          {day.shifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} timeFormat={timeFormat} />
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

// Vertical Shift Card Component
interface ShiftCardProps {
  shift: ScheduleShift;
  timeFormat: '12h' | '24h';
}

const ShiftCard: React.FC<ShiftCardProps> = ({ shift, timeFormat }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 hover:bg-gray-800/70 transition-colors border border-gray-700/50 group">
      {/* Vertical Stack Layout */}
      <div className="flex flex-col items-center text-center gap-2">
        {/* Avatar - Larger and centered */}
        <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
          {shift.avatar_url ? (
            <img
              src={shift.avatar_url}
              alt={shift.employee_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${shift.employee_name}`}
              alt={shift.employee_name}
              className="w-full h-full"
            />
          )}
        </div>

        {/* Name - Centered, no truncation needed */}
        <div className="text-white font-medium text-sm leading-tight">
          {shift.employee_name}
        </div>

        {/* Role Badge - Full width, centered */}
        {shift.role && (
          <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wide border ${getRoleColor(shift.role)}`}>
            {shift.role}
          </div>
        )}

        {/* Time - Centered with icon */}
        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-300">
          <Clock className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">
            {formatTime(shift.start_time, timeFormat)}
          </span>
          <span>-</span>
          <span className="whitespace-nowrap">
            {formatTime(shift.end_time, timeFormat)}
          </span>
        </div>

        {/* Break duration if present */}
        {shift.break_duration && shift.break_duration > 0 && (
          <div className="text-xs text-gray-500">
            {shift.break_duration}min break
          </div>
        )}

        {/* Notes if present */}
        {shift.notes && (
          <div className="w-full pt-2 mt-2 border-t border-gray-700/30 text-xs text-gray-400 text-center">
            {shift.notes}
          </div>
        )}
      </div>
    </div>
  );
};
