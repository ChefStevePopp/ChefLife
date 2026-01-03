import React from 'react';
import { X, Filter, ChevronDown, ArrowUpAZ, ArrowDownAZ, CheckSquare, Square } from 'lucide-react';
import type { SortField, SortDirection } from '../hooks';

interface RosterFiltersProps {
  // Filters
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  
  // Sort
  sortField: SortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: SortField) => void;
  onSortDirectionToggle: () => void;
  
  // Options
  departments: string[];
  roles: string[];
  
  // Actions
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  
  // Stats
  resultCount: number;
  totalCount: number;

  // Selection mode toggle
  selectionMode?: boolean;
  onToggleSelectionMode?: () => void;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'role', label: 'Role' },
  { value: 'department', label: 'Department' },
  { value: 'recent', label: 'Recently Added' },
];

export const RosterFilters: React.FC<RosterFiltersProps> = ({
  selectedDepartment,
  onDepartmentChange,
  selectedRole,
  onRoleChange,
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionToggle,
  departments,
  roles,
  onClearFilters,
  hasActiveFilters,
  resultCount,
  totalCount,
  selectionMode = false,
  onToggleSelectionMode,
}) => {
  return (
    <div className="space-y-3">
      {/* Filters Row - Centered, wraps on mobile */}
      <div className="flex flex-wrap justify-center items-center gap-3">
        {/* Selection Mode Toggle with Label */}
        {onToggleSelectionMode && (
          <button
            onClick={onToggleSelectionMode}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${selectionMode
                ? 'text-primary-400 bg-primary-500/20 border border-primary-500/30'
                : 'text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            title={selectionMode ? 'Exit selection mode (Esc)' : 'Select multiple members (then Ctrl+A to select all)'}
          >
            {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span className="hidden sm:inline">{selectionMode ? 'Selecting' : 'Select'}</span>
          </button>
        )}

        {/* Divider */}
        {onToggleSelectionMode && (
          <div className="w-px h-6 bg-gray-700 hidden sm:block" />
        )}

        {/* Department Filter */}
        <div className="relative flex-1 min-w-[140px] sm:flex-none sm:min-w-[160px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>

        {/* Role Filter */}
        <div className="relative flex-1 min-w-[120px] sm:flex-none sm:min-w-[140px]">
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="w-full pl-4 pr-8 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 flex-1 min-w-[160px] sm:flex-none">
          <div className="relative flex-1 sm:min-w-[140px]">
            <select
              value={sortField}
              onChange={(e) => onSortFieldChange(e.target.value as SortField)}
              className="w-full pl-4 pr-8 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all cursor-pointer"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>Sort: {option.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          
          {/* Direction Toggle */}
          <button
            onClick={onSortDirectionToggle}
            className="p-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all flex-shrink-0"
            title={sortDirection === 'asc' ? 'Ascending (A→Z)' : 'Descending (Z→A)'}
          >
            {sortDirection === 'asc' ? (
              <ArrowUpAZ className="w-4 h-4" />
            ) : (
              <ArrowDownAZ className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white bg-gray-800/30 hover:bg-gray-700/50 border border-gray-700/50 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-gray-400">
            Showing <span className="text-white font-medium">{resultCount}</span> of <span className="text-white font-medium">{totalCount}</span> members
          </span>
          {resultCount === 0 && (
            <span className="text-amber-400">— No matches found</span>
          )}
        </div>
      )}
    </div>
  );
};
