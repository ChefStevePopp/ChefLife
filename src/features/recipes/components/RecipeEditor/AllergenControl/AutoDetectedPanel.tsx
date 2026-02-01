import React, { useState } from 'react';
import { Eye, ChevronDown, ChevronRight, Package, ChefHat } from 'lucide-react';
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
        title="Click to see source ingredients"
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
 * Auto-Detected Panel - Read-only display of allergens from ingredients
 * Left side of the two-panel layout
 */
export const AutoDetectedPanel: React.FC<AutoDetectedPanelProps> = ({
  autoDetected,
  isLoading
}) => {
  const [containsExpanded, setContainsExpanded] = useState(true);
  const [mayContainExpanded, setMayContainExpanded] = useState(true);
  
  const containsCount = autoDetected.contains.size;
  const mayContainCount = autoDetected.mayContain.size;
  
  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/2"></div>
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
            <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
            <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Eye className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-medium text-white">Auto-Detected</h3>
            <p className="text-xs text-gray-400">From recipe ingredients</p>
          </div>
        </div>
      </div>
      
      {/* Contains Section */}
      <div className="border-b border-gray-700">
        <button
          onClick={() => setContainsExpanded(!containsExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            {containsExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm font-medium text-rose-400">CONTAINS</span>
            <span className="text-xs text-gray-500">({containsCount})</span>
          </div>
        </button>
        
        {containsExpanded && (
          <div className="px-4 pb-4">
            {containsCount === 0 ? (
              <p className="text-sm text-gray-500 italic">No allergens detected</p>
            ) : (
              <div className="flex flex-wrap gap-2">
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
        )}
      </div>
      
      {/* May Contain Section */}
      <div>
        <button
          onClick={() => setMayContainExpanded(!mayContainExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            {mayContainExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm font-medium text-amber-400">MAY CONTAIN</span>
            <span className="text-xs text-gray-500">({mayContainCount})</span>
          </div>
        </button>
        
        {mayContainExpanded && (
          <div className="px-4 pb-4">
            {mayContainCount === 0 ? (
              <p className="text-sm text-gray-500 italic">No potential allergens detected</p>
            ) : (
              <div className="flex flex-wrap gap-2">
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
        )}
      </div>
      
      {/* Footer hint */}
      <div className="p-3 border-t border-gray-700 bg-gray-800/30">
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Eye className="w-3 h-3" />
          Click any allergen to see source ingredients
        </p>
      </div>
    </div>
  );
};
