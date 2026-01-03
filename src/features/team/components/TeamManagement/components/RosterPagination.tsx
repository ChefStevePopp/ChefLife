import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface RosterPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  showingFrom: number;
  showingTo: number;
  totalItems: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onFirst: () => void;
  onLast: () => void;
}

const PAGE_SIZE_OPTIONS = [12, 20, 40, 60];

export const RosterPagination: React.FC<RosterPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  showingFrom,
  showingTo,
  totalItems,
  canGoNext,
  canGoPrev,
  onPageChange,
  onPageSizeChange,
  onNext,
  onPrev,
  onFirst,
  onLast,
}) => {
  // Don't show pagination if only one page
  if (totalPages <= 1 && totalItems <= PAGE_SIZE_OPTIONS[0]) {
    return null;
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsisThreshold = 7;
    
    if (totalPages <= showEllipsisThreshold) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-700/50">
      {/* Left: Showing count & page size */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          Showing <span className="text-white font-medium">{showingFrom}-{showingTo}</span> of <span className="text-white font-medium">{totalItems}</span>
        </span>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Page navigation */}
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          onClick={onFirst}
          disabled={!canGoPrev}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous */}
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((page, idx) => (
            page === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">…</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 px-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === page
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last */}
        <button
          onClick={onLast}
          disabled={!canGoNext}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
