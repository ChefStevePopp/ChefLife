import React from "react";
import { Link2 } from "lucide-react";

interface ImportedBadgeProps {
  source?: 'csv' | '7shifts' | 'manual' | string | null;
}

/**
 * Simple badge indicating data was imported from an external source
 * Matches the department pill styling - subtle gray
 */
export const ImportedBadge: React.FC<ImportedBadgeProps> = ({ source }) => {
  if (!source || source === 'manual') return null;

  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full text-xs"
      title="Imported from CSV"
    >
      <Link2 className="w-3 h-3" />
    </span>
  );
};
