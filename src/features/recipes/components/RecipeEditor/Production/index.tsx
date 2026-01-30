import React from "react";
import { Factory } from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import {
  GuidedModeProvider,
  GuidedModeToggle,
} from "@/shared/components/L5";
import type { Recipe } from "../../../types/recipe";

// Section components
import {
  CostSummary,
  BaseYieldSection,
  TimeSection,
  StorageLocationSection,
  ShelfLifeSection,
  TemperatureSection,
  PrepNotesSection,
} from "./sections";

/**
 * =============================================================================
 * PRODUCTION TAB
 * =============================================================================
 * Consolidated production specifications and storage requirements.
 * 
 * L5 Design:
 * - Tab color: Amber (3rd in progression: primary → green → amber → rose...)
 * - Guided mode support with toggleable verbose help
 * - Fluid typography throughout
 * - Modular section architecture
 * 
 * Sections:
 * 1. Cost Summary (read-only from Basic Info)
 * 2. Base Recipe Yield (scaling base)
 * 3. Time Requirements (prep/cook/rest)
 * 4. Storage Location (container, areas, photos)
 * 5. Shelf Life (duration, thawing, expiration)
 * 6. Temperature Controls (storage temp, CCP)
 * 7. Preparation Notes (working temps, time management)
 * =============================================================================
 */

interface ProductionProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const Production: React.FC<ProductionProps> = ({
  recipe,
  onChange,
}) => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <GuidedModeProvider>
      <div className="space-y-6">
        {showDiagnostics && (
          <div className="text-fluid-xs text-gray-500 font-mono">
            src/features/recipes/components/RecipeEditor/Production/index.tsx
          </div>
        )}

        {/* Header - L5 subheader pattern with amber (3rd tab) */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Factory className="w-5 h-5 text-amber-400/80" />
            </div>
            <div>
              <h2 className="text-fluid-xl font-semibold text-white">
                Production
              </h2>
              <p className="text-fluid-sm text-gray-400">
                Yield, timing, storage, and temperature requirements
              </p>
            </div>
          </div>
          
          {/* Guided Mode Toggle */}
          <GuidedModeToggle />
        </div>

        {/* Cost Summary - Read-only from Basic Info */}
        <CostSummary recipe={recipe} />

        {/* Base Recipe Yield */}
        <BaseYieldSection recipe={recipe} onChange={onChange} />

        {/* Time Requirements */}
        <TimeSection recipe={recipe} onChange={onChange} />

        {/* Storage Location */}
        <StorageLocationSection recipe={recipe} onChange={onChange} />

        {/* Shelf Life */}
        <ShelfLifeSection recipe={recipe} onChange={onChange} />

        {/* Temperature Controls */}
        <TemperatureSection recipe={recipe} onChange={onChange} />

        {/* Preparation Notes */}
        <PrepNotesSection recipe={recipe} onChange={onChange} />
      </div>
    </GuidedModeProvider>
  );
};

export default Production;
