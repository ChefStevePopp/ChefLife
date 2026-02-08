import React, { useState } from 'react';
import { Database, ChevronUp, ChevronDown, ChevronRight, Package, ChefHat, Eye } from 'lucide-react';
import { AllergenBadge } from '@/features/allergens/components/AllergenBadge';
import type { AllergenType } from '@/features/allergens/types';
import type { AutoDetectedAllergens, AllergenSource } from './types';

interface AutoDetectedPanelProps {
  autoDetected: AutoDetectedAllergens;
  isLoading: boolean;
}

/**
 * Source Popover - Shows which ingredients contributed an allergen
 */
const SourcePopover: React.FC<{
  allergen: AllergenType;
  sources: AllergenSource[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ allergen, sources, isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="absolute z-50 top-full left-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">Source Ingredients</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      </div>
      <div className="p-2 max-h-48 overflow-y-auto">
        {sources.map((source, idx) => (
          <div 
            key={`${source.ingredientId}-${idx}`}
            className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50"
          >
            {source.ingredientType === 'raw' ? (
              <Package className="w-4 h-4 text-blue-400" />
            ) : (
              <ChefHat className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-sm text-gray-300">{source.ingredientName}</span>
            <span className="text-xs text-gray-500 ml-auto">
              {source.ingredientType === 'raw' ? 'Raw' : 'Prep'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Allergen Badge with click-to-reveal sources
 */
const AllergenWithSource: React.FC<{
  allergen: AllergenType;
  sources: AllergenSource[];
}> = ({ allergen, sources }) => {
  const [showSources, setShowSources] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowSources(!showSources)}
        className="group flex items-center gap-1 p-1 rounded hover:bg-gray-700/50 transition-colors"
        title="Click to see which of your ingredients contributed this"
      >
        <AllergenBadge type={allergen} size="md" showLabel disableTooltip />
        <Eye className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      
      <SourcePopover
        allergen={allergen}
        sources={sources}
        isOpen={showSources}
        onClose={() => setShowSources(false)}
      />
    </div>
  );
};

/**
 * =============================================================================
 * YOUR ALLERGEN DATA — From Your Master Ingredient List
 * =============================================================================
 * ChefLife is a mirror, not an oracle. This panel reflects the allergen data
 * that YOU entered in the Master Ingredient List. ChefLife cascades it through
 * recipe ingredients — but the data is yours, the responsibility is yours.
 * 
 * Language is critical here: never "we detected" or "auto-detected."
 * Always "your data shows" or "from your ingredient entries."
 * =============================================================================
 */
export const AutoDetectedPanel: React.FC<AutoDetectedPanelProps> = ({
  autoDetected,
  isLoading
}) => {
  const [expanded, setExpanded] = useState(true);
  
  const containsCount = autoDetected.contains.size;
  const mayContainCount = autoDetected.mayContain.size;
  const totalCount = containsCount + mayContainCount;
  
  if (isLoading) {
    return (
      <div className="expandable-info-section expanded">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700 rounded w-1/2"></div>
            <div className="flex gap-2">
              <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
              <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
              <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`expandable-info-section ${expanded ? 'expanded' : ''}`}>
      
      {/* Expandable Header */}
      <button
        className="expandable-info-header w-full justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-medium text-white">Your Allergen Data</h3>
            <p className="text-xs text-gray-400">
              Populated from your Master Ingredient List entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
              {totalCount} allergen{totalCount !== 1 ? 's' : ''}
            </span>
          )}
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </div>
      </button>
      
      {/* Expandable Content */}
      <div className="expandable-info-content">
        <div className="px-5 pt-4 pb-5 space-y-4">
          
          {/* Contains Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-sm font-medium text-rose-400">CONTAINS</span>
              <span className="text-xs text-gray-500">({containsCount})</span>
            </div>
            {containsCount === 0 ? (
              <p className="text-sm text-gray-500 italic pl-5">
                No allergen data found in your ingredient entries
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pl-5">
                {Array.from(autoDetected.contains.entries()).map(([allergen, sources]) => (
                  <AllergenWithSource 
                    key={allergen} 
                    allergen={allergen} 
                    sources={sources} 
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* May Contain Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-sm font-medium text-amber-400">MAY CONTAIN</span>
              <span className="text-xs text-gray-500">({mayContainCount})</span>
            </div>
            {mayContainCount === 0 ? (
              <p className="text-sm text-gray-500 italic pl-5">
                No potential allergens in your ingredient data
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pl-5">
                {Array.from(autoDetected.mayContain.entries()).map(([allergen, sources]) => (
                  <AllergenWithSource 
                    key={allergen} 
                    allergen={allergen} 
                    sources={sources} 
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Footer hint */}
          <p className="text-xs text-gray-500 flex items-center gap-1 pt-2 border-t border-gray-700/50">
            <Eye className="w-3 h-3" />
            Click any allergen to trace it back to your ingredients
          </p>
        </div>
      </div>
    </div>
  );
};
