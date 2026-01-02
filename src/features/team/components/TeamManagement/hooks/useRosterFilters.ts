import { useState, useMemo, useCallback, useEffect } from 'react';
import type { TeamMember } from '../../../types';

interface UseRosterFiltersProps {
  members: TeamMember[];
}

interface UseRosterFiltersReturn {
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearch: string;
  
  // Filters
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  
  // Derived data
  filteredMembers: TeamMember[];
  availableDepartments: string[];
  availableRoles: string[];
  
  // Actions
  clearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount: number;
}

export const useRosterFilters = ({ members }: UseRosterFiltersProps): UseRosterFiltersReturn => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Filter state
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Extract unique departments from all members
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    members.forEach(member => {
      member.departments?.forEach(dept => depts.add(dept));
    });
    return Array.from(depts).sort();
  }, [members]);

  // Extract unique roles from all members
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    members.forEach(member => {
      if (member.kitchen_role) {
        roles.add(member.kitchen_role);
      }
    });
    return Array.from(roles).sort();
  }, [members]);

  // Filter members based on search and filters
  const filteredMembers = useMemo(() => {
    let result = [...members];
    
    // Apply search filter
    if (debouncedSearch.trim()) {
      const search = debouncedSearch.toLowerCase().trim();
      result = result.filter(member => {
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
        const email = (member.email || '').toLowerCase();
        const role = (member.kitchen_role || '').toLowerCase();
        const punchId = (member.punch_id || '').toLowerCase();
        
        return (
          fullName.includes(search) ||
          email.includes(search) ||
          role.includes(search) ||
          punchId.includes(search)
        );
      });
    }
    
    // Apply department filter
    if (selectedDepartment) {
      result = result.filter(member => 
        member.departments?.includes(selectedDepartment)
      );
    }
    
    // Apply role filter
    if (selectedRole) {
      result = result.filter(member => 
        member.kitchen_role === selectedRole
      );
    }
    
    return result;
  }, [members, debouncedSearch, selectedDepartment, selectedRole]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(searchQuery.trim() || selectedDepartment || selectedRole);
  }, [searchQuery, selectedDepartment, selectedRole]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedDepartment('');
    setSelectedRole('');
  }, []);

  return {
    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    
    // Filters
    selectedDepartment,
    setSelectedDepartment,
    selectedRole,
    setSelectedRole,
    
    // Derived data
    filteredMembers,
    availableDepartments,
    availableRoles,
    
    // Actions
    clearFilters,
    hasActiveFilters,
    resultCount: filteredMembers.length,
  };
};
