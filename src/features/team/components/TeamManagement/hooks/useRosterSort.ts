import { useState, useMemo, useCallback } from 'react';
import type { TeamMember } from '../../../types';

export type SortField = 'name' | 'role' | 'department' | 'recent';
export type SortDirection = 'asc' | 'desc';

interface UseRosterSortProps {
  members: TeamMember[];
}

interface UseRosterSortReturn {
  sortField: SortField;
  sortDirection: SortDirection;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  toggleDirection: () => void;
  sortedMembers: TeamMember[];
  sortLabel: string;
}

const SORT_LABELS: Record<SortField, string> = {
  name: 'Name',
  role: 'Role',
  department: 'Department',
  recent: 'Recently Added',
};

export const useRosterSort = ({ members }: UseRosterSortProps): UseRosterSortReturn => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleDirection = useCallback(() => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const sortedMembers = useMemo(() => {
    const sorted = [...members];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
          
        case 'role':
          const roleA = (a.kitchen_role || 'zzz').toLowerCase(); // Push empty to end
          const roleB = (b.kitchen_role || 'zzz').toLowerCase();
          comparison = roleA.localeCompare(roleB);
          break;
          
        case 'department':
          const deptA = (a.departments?.[0] || 'zzz').toLowerCase();
          const deptB = (b.departments?.[0] || 'zzz').toLowerCase();
          comparison = deptA.localeCompare(deptB);
          break;
          
        case 'recent':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = dateB - dateA; // Newest first by default
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [members, sortField, sortDirection]);

  const sortLabel = SORT_LABELS[sortField];

  return {
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    toggleDirection,
    sortedMembers,
    sortLabel,
  };
};
