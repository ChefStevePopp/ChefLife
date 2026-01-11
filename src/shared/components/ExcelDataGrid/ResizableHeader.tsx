import React, { useRef, useCallback } from "react";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import type { ExcelColumn } from "@/types";

// =============================================================================
// RESIZABLE HEADER - L5 Design
// =============================================================================
// Clickable header for sorting, draggable edge for resizing
// Supports column alignment via column.align property
// =============================================================================

interface ResizableHeaderProps {
  column: ExcelColumn;
  onResize: (width: number) => void;
  onSort: () => void;
  sortDirection: "asc" | "desc" | null;
  isFiltered: boolean;
  onToggleFilter: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: () => void;
  className?: string;
}

export const ResizableHeader: React.FC<ResizableHeaderProps> = ({
  column,
  onResize,
  onSort,
  sortDirection,
  isFiltered,
  onDragStart,
  onDragEnd,
  onDragOver,
  className,
}) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const isResizingRef = useRef<boolean>(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const delta = e.clientX - startXRef.current;
    const newWidth = Math.max(50, startWidthRef.current + delta);
    onResize(newWidth);
  }, [onResize]);

  const handleMouseUp = useCallback(() => {
    isResizingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = headerRef.current?.offsetWidth || column.width;
    
    // Visual feedback during resize
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Determine alignment class
  const alignClass = column.align === "center" 
    ? "justify-center text-center" 
    : column.align === "right" 
    ? "justify-end text-right" 
    : "text-left";

  return (
    <div
      ref={headerRef}
      className={`relative flex w-full h-full select-none group ${className || ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      {/* Header content - clickable for sorting */}
      <button
        type="button"
        className={`flex-1 flex items-center gap-1.5 px-4 py-3 hover:bg-gray-800/50 transition-colors ${alignClass}`}
        onClick={onSort}
      >
        <span className={`font-medium text-sm ${isFiltered ? "text-primary-400" : "text-gray-300"}`}>
          {column.name}
        </span>
        
        {/* Sort indicator */}
        {sortDirection && (
          <span className="text-primary-400">
            {sortDirection === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </button>

      {/* Resize handle - wider hit area, visible on hover */}
      <div
        className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize flex items-center justify-center
                   opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={handleMouseDown}
      >
        <div className="w-0.5 h-4 bg-gray-600 group-hover:bg-primary-500 rounded-full transition-colors" />
      </div>
    </div>
  );
};
