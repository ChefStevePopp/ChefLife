import { useState, useCallback, useMemo } from 'react';

interface UseRosterSelectionProps {
  memberIds: string[];
}

interface UseRosterSelectionReturn {
  // State
  selectedIds: Set<string>;
  
  // Checks
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  hasSelection: boolean;
  selectedCount: number;
  
  // Actions
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelectAll: () => void;
}

export const useRosterSelection = ({ memberIds }: UseRosterSelectionProps): UseRosterSelectionReturn => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(memberIds));
  }, [memberIds]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === memberIds.length) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [selectedIds.size, memberIds.length, selectAll, deselectAll]);

  const isAllSelected = useMemo(() => {
    return memberIds.length > 0 && selectedIds.size === memberIds.length;
  }, [memberIds.length, selectedIds.size]);

  const isPartiallySelected = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < memberIds.length;
  }, [selectedIds.size, memberIds.length]);

  const hasSelection = selectedIds.size > 0;
  const selectedCount = selectedIds.size;

  return {
    selectedIds,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    hasSelection,
    selectedCount,
    toggleSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
  };
};
