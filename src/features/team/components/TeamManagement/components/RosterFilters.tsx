import React from 'react';
import { Search, X, Filter, ChevronDown } from 'lucide-react';

interface RosterFiltersProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Filters
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  
  // Options
  departments: string[];
  roles: string[];
  
  // Actions
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  
  // Stats
  resultCount: number;
  totalCount: number;
}

export const RosterFilters: React.FC<RosterFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  selectedRole,
  onRoleChange,
  departments,
  roles,
  onClearFilters,
  hasActiveFilters,
  resultCount,
  totalCount,
}) => {
  return (
    <div className="space-y-3">
      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email, role, or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Department Filter */}
        <div className="relative min-w-[160px]">
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
        <div className="relative min-w-[160px]">
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
        <div className="flex items-center gap-2 text-sm">
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
