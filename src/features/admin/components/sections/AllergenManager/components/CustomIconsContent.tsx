import React from "react";
import { Wrench, Info } from "lucide-react";
import { ALLERGEN_LIST } from "@/features/allergens/types";
import { ALLERGENS } from "@/features/allergens/constants";
import { AllergenBadge } from "@/features/allergens/components/AllergenBadge";

// =============================================================================
// CUSTOM ICONS CONTENT (Stubbed)
// =============================================================================

export const CustomIconsContent: React.FC = () => (
  <div className="pt-4 space-y-4">
    {/* Coming Soon Notice */}
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-start gap-3">
        <Wrench className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-300 font-medium">Under Development</p>
          <p className="text-sm text-gray-500 mt-1">
            Upload custom SVG icons for each allergen to match your brand.
            Will support both icon pack selection and per-allergen overrides.
          </p>
        </div>
      </div>
    </div>

    {/* Preview Grid (stubbed) */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {ALLERGEN_LIST.slice(0, 10).map((allergen) => (
        <div
          key={allergen}
          className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30 opacity-50"
        >
          <div className="flex flex-col items-center gap-2">
            <AllergenBadge type={allergen} size="sm" disableTooltip />
            <span className="text-xs text-gray-500 text-center truncate w-full">
              {ALLERGENS[allergen]?.label}
            </span>
            <button
              disabled
              className="w-full text-xs py-1 px-2 rounded bg-gray-700/30 text-gray-600 cursor-not-allowed"
            >
              Upload
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* Future Features Note */}
    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Planned Features:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Icon pack selection (Modern, Classic, Minimal)</li>
            <li>Per-allergen custom SVG upload</li>
            <li>Fallback to default if no custom icon</li>
            <li>Preview before applying</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);
