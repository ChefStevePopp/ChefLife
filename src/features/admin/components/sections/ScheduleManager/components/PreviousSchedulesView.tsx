/**
 * Previous Schedules View
 * Grouped-by-month archive of past schedules with search, source filter, and export.
 *
 * @diagnostics src/features/admin/components/sections/ScheduleManager/components/PreviousSchedulesView.tsx
 * @pattern L5 grouped-list
 */
import React, { useState, useMemo } from 'react';
import { Calendar, Download, Eye, Trash2, Search, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { Schedule } from '@/types/schedule';
import { parseLocalDate, formatDateForDisplay, formatDateShort } from '@/utils/dateUtils';

interface PreviousSchedulesViewProps {
  schedules: Schedule[];
  onView: (scheduleId: string) => void;
  onExport: (scheduleId: string) => void;
  onDelete?: (scheduleId: string) => void;
  isLoading: boolean;
}

export const PreviousSchedulesView: React.FC<PreviousSchedulesViewProps> = ({
  schedules,
  onView,
  onExport,
  onDelete,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'csv' | '7shifts'>('all');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Group schedules by month and deduplicate
  const groupedSchedules = useMemo(() => {
    // First deduplicate by schedule ID
    const uniqueSchedules = Array.from(
      new Map(schedules.map(s => [s.id, s])).values()
    );

    // Filter by source
    const filtered = sourceFilter === 'all' 
      ? uniqueSchedules
      : uniqueSchedules.filter(s => s.source === sourceFilter);

    // Filter by search term
    const searched = searchTerm
      ? filtered.filter(s => 
          s.start_date.includes(searchTerm) ||
          s.end_date.includes(searchTerm) ||
          (s.source && s.source.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : filtered;

    // Group by year and month (using parseLocalDate to avoid UTC shift)
    const groups = searched.reduce((acc, schedule) => {
      const date = parseLocalDate(schedule.start_date);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const key = `${year}-${month}`;
      
      if (!acc[key]) {
        acc[key] = {
          year,
          month,
          monthName: date.toLocaleDateString('en-US', { month: 'long' }),
          schedules: [],
        };
      }
      
      acc[key].schedules.push(schedule);
      return acc;
    }, {} as Record<string, { year: number; month: number; monthName: string; schedules: Schedule[] }>);

    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [schedules, searchTerm, sourceFilter]);

  const toggleMonth = (key: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedMonths(newExpanded);
  };

  // Auto-expand the most recent month
  useMemo(() => {
    if (groupedSchedules.length > 0 && expandedMonths.size === 0) {
      const firstKey = `${groupedSchedules[0].year}-${groupedSchedules[0].month}`;
      setExpandedMonths(new Set([firstKey]));
    }
  }, [groupedSchedules]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const totalSchedules = schedules.length;
  const uniqueSchedules = new Map(schedules.map(s => [s.id, s])).size;
  const hasDuplicates = totalSchedules !== uniqueSchedules;

  return (
    <div className="space-y-6">
      {/* Duplicate Warning */}
      {hasDuplicates && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-amber-400 text-sm">
            ⚠️ Found {totalSchedules - uniqueSchedules} duplicate schedule entries. Showing {uniqueSchedules} unique schedules.
          </p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full pl-10"
          />
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="input w-auto"
          >
            <option value="all">All Sources</option>
            <option value="csv">CSV Uploads</option>
            <option value="7shifts">7shifts Sync</option>
          </select>
        </div>
      </div>

      {/* Grouped Schedule List */}
      {groupedSchedules.length > 0 ? (
        <div className="space-y-4">
          {groupedSchedules.map((group) => {
            const key = `${group.year}-${group.month}`;
            const isExpanded = expandedMonths.has(key);

            return (
              <div key={key} className="bg-gray-800/30 rounded-lg border border-gray-700/50">
                {/* Month Header */}
                <button
                  onClick={() => toggleMonth(key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-white text-left">
                        {group.monthName} {group.year}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {group.schedules.length} {group.schedules.length === 1 ? 'schedule' : 'schedules'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </div>
                </button>

                {/* Schedules in this month */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {group.schedules
                      .sort((a, b) => b.start_date.localeCompare(a.start_date)) // Newest first
                      .map((schedule) => (
                        <div
                          key={schedule.id}
                          className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors border border-gray-700/30"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-5 h-5 text-amber-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-medium">
                                  {formatDateShort(schedule.start_date)} – {formatDateForDisplay(schedule.end_date)}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    schedule.source === '7shifts'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-purple-500/20 text-purple-400'
                                  }`}>
                                    {schedule.source === '7shifts' ? '7shifts' : 'CSV Upload'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Added {new Date(schedule.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => onView(schedule.id)}
                                className="btn-ghost text-sm"
                                title="View schedule details"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </button>
                              <button
                                onClick={() => onExport(schedule.id)}
                                className="btn-ghost text-sm"
                                title="Export as CSV"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Export
                              </button>
                              {onDelete && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete schedule for ${formatDateForDisplay(schedule.start_date)} - ${formatDateForDisplay(schedule.end_date)}?`)) {
                                      onDelete(schedule.id);
                                    }
                                  }}
                                  className="btn-ghost text-sm text-rose-400 hover:text-rose-300"
                                  title="Delete schedule"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800/50 rounded-lg">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm || sourceFilter !== 'all' 
              ? 'No Schedules Found'
              : 'No Previous Schedules'
            }
          </h3>
          <p className="text-gray-400 max-w-md mx-auto">
            {searchTerm || sourceFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'When you upload and activate schedules, they will appear here for future reference.'
            }
          </p>
        </div>
      )}
    </div>
  );
};
