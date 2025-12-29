import React, { useMemo } from 'react';
import { Clock, MoreVertical, ChevronDown } from 'lucide-react';
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
    'text-yellow-400 bg-yellow-400/10',
    'text-green-400 bg-green-400/10',
    'text-blue-400 bg-blue-400/10',
    'text-purple-400 bg-purple-400/10',
    'text-orange-400 bg-orange-400/10',
    'text-pink-400 bg-pink-400/10',
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
    console.log('ScheduleWeekView startDate:', startDate, 'parsed as:', start);
    
    const allDays = Array(7).fill(null).map((_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      
      // Format date in local time (not UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Get day name from the local date components (not the date object which might shift)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = dayNames[date.getDay()];
      
      // Format the display date from components (not by creating a new Date object)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const displayDate = `${monthNames[date.getMonth()]} ${date.getDate()}`;
      
      const dayShifts = shiftsByDate[dateStr] || [];
      
      console.log(`ScheduleWeekView Day ${i}: ${dateStr} (${dayOfWeek}) - ${dayShifts.length} shifts`);
      
      return {
        date: dateStr,
        dayOfWeek: dayOfWeek,
        dayName: dayOfWeek.substring(0, 3),
        monthDay: date.getDate(),
        displayDate: displayDate, // Add formatted display date
        shifts: dayShifts,
      };
    });

    // Filter to only days with shifts (cleaner, more responsive)
    return allDays.filter(day => day.shifts.length > 0);
  }, [scheduleShifts, startDate]);

  // Dynamic grid columns based on number of days
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    7: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7',
  }[daysWithShifts.length] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  if (daysWithShifts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No shifts scheduled for this week
      </div>
    );
  }

  return (
    <div className={`grid ${gridColsClass} gap-4`}>
      {daysWithShifts.map((day) => (
        <div key={day.date} className="flex flex-col">
          {/* Day Header */}
          <div className="mb-3">
            <div className="text-lg font-semibold text-white">
              {day.dayOfWeek}
            </div>
            <div className="text-sm text-gray-400">
              {day.displayDate}
            </div>
          </div>

          {/* Shifts Container - Show 6, scroll for rest */}
          <div className="flex-1 flex flex-col">
            <div 
              className="space-y-3 overflow-y-auto pr-1"
              style={{ 
                maxHeight: day.shifts.length > 6 ? '600px' : 'auto',
              }}
            >
              {day.shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 hover:bg-gray-800/70 transition-colors border border-gray-700/50 group"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
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

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <div className="text-white font-medium truncate mb-1">
                        {shift.employee_name}
                      </div>

                      {/* Role Badge */}
                      {shift.role && (
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${getRoleColor(shift.role)}`}>
                            {shift.role}
                          </span>
                        </div>
                      )}

                      {/* Time */}
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {formatTime(shift.start_time, timeFormat)} - {formatTime(shift.end_time, timeFormat)}
                        </span>
                      </div>

                      {/* Break duration if present */}
                      {shift.break_duration && shift.break_duration > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {shift.break_duration}min break
                        </div>
                      )}
                    </div>

                    {/* Quick Actions Menu */}
                    <button 
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Add menu actions (edit, delete, swap shift, etc.)
                      }}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Notes if present */}
                  {shift.notes && (
                    <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-gray-400">
                      {shift.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Scroll Indicator & Count */}
            <div className="mt-3 pt-3 border-t border-gray-700/30 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {day.shifts.length} {day.shifts.length === 1 ? 'shift' : 'shifts'}
              </div>
              {day.shifts.length > 6 && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>Scroll for more</span>
                  <ChevronDown className="w-3 h-3 animate-bounce" />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
