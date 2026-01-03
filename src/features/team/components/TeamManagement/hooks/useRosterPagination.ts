import { useState, useMemo, useCallback, useEffect } from 'react';

interface UseRosterPaginationProps {
  totalItems: number;
  initialPageSize?: number;
}

interface UseRosterPaginationReturn {
  // Current state
  currentPage: number;
  pageSize: number;
  
  // Derived
  totalPages: number;
  startIndex: number;
  endIndex: number;
  
  // Display helpers
  showingFrom: number;
  showingTo: number;
  
  // Actions
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  goToFirst: () => void;
  goToLast: () => void;
  
  // State checks
  canGoNext: boolean;
  canGoPrev: boolean;
  
  // Helper to slice array
  paginateItems: <T>(items: T[]) => T[];
}

export const useRosterPagination = ({ 
  totalItems, 
  initialPageSize = 20 
}: UseRosterPaginationProps): UseRosterPaginationReturn => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  // Reset to page 1 when total items or page size changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalItems, pageSize, totalPages, currentPage]);

  // Calculate indices
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  // Human-readable display (1-indexed)
  const showingFrom = totalItems === 0 ? 0 : startIndex + 1;
  const showingTo = endIndex;

  // Navigation checks
  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  // Navigation actions
  const nextPage = useCallback(() => {
    if (canGoNext) {
      setCurrentPage(prev => prev + 1);
    }
  }, [canGoNext]);

  const prevPage = useCallback(() => {
    if (canGoPrev) {
      setCurrentPage(prev => prev - 1);
    }
  }, [canGoPrev]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const goToFirst = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLast = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  // Handle page size change (reset to page 1)
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // Helper to paginate any array
  const paginateItems = useCallback(<T,>(items: T[]): T[] => {
    return items.slice(startIndex, endIndex);
  }, [startIndex, endIndex]);

  return {
    // Current state
    currentPage,
    pageSize,
    
    // Derived
    totalPages,
    startIndex,
    endIndex,
    
    // Display helpers
    showingFrom,
    showingTo,
    
    // Actions
    setCurrentPage,
    setPageSize: handleSetPageSize,
    nextPage,
    prevPage,
    goToPage,
    goToFirst,
    goToLast,
    
    // State checks
    canGoNext,
    canGoPrev,
    
    // Helper
    paginateItems,
  };
};
