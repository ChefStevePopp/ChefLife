import React from "react";

/**
 * =============================================================================
 * VITALS CARD GRID
 * =============================================================================
 * Responsive container for VitalsCards:
 * - Mobile: Horizontal scroll
 * - Desktop: Responsive grid (2-4 columns)
 * =============================================================================
 */

export interface VitalsCardGridProps {
  children: React.ReactNode;
  /** Number of columns on large screens (default: 4) */
  columns?: 2 | 3 | 4 | 5 | 6;
  /** Use horizontal scroll instead of wrapping grid */
  scrollable?: boolean;
  /** Additional className */
  className?: string;
}

export const VitalsCardGrid: React.FC<VitalsCardGridProps> = ({
  children,
  columns = 4,
  scrollable = false,
  className = "",
}) => {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
  };

  if (scrollable) {
    return (
      <div className={`overflow-x-auto pb-2 ${className}`}>
        <div className="flex gap-4" style={{ minWidth: "min-content" }}>
          {React.Children.map(children, (child) => (
            <div className="w-48 flex-shrink-0">{child}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${gridCols[columns]} ${className}`}>
      {children}
    </div>
  );
};

export default VitalsCardGrid;
