import React from "react";

/**
 * =============================================================================
 * VENDOR ZONE
 * =============================================================================
 * Footer zone showing vendor logo/name badge.
 * =============================================================================
 */

export interface VendorZoneProps {
  vendorName: string;
  vendorLogoUrl?: string | null;
}

export const VendorZone: React.FC<VendorZoneProps> = ({
  vendorName,
  vendorLogoUrl,
}) => {
  return (
    <div className="flex items-center gap-2">
      {vendorLogoUrl ? (
        <img
          src={vendorLogoUrl}
          alt={vendorName}
          className="w-5 h-5 rounded object-contain bg-white"
        />
      ) : (
        <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center">
          <span className="text-[10px] font-bold text-gray-400">
            {vendorName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <span className="text-xs text-gray-500 truncate">{vendorName}</span>
    </div>
  );
};

export default VendorZone;
