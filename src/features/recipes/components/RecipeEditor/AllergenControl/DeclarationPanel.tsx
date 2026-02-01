import React, { useState } from 'react';
import { Shield, Lock, Plus, X, ArrowUp, MessageSquare, ChevronDown } from 'lucide-react';
import { AllergenBadge } from '@/features/allergens/components/AllergenBadge';
import { ALLERGENS } from '@/features/allergens/constants';
import type { AllergenType } from '@/features/allergens/types';
import type { AllergenWithContext, ManualAllergenOverrides, AutoDetectedAllergens } from './types';

interface DeclarationPanelProps {
  allergensWithContext: AllergenWithContext[];
  autoDetected: AutoDetectedAllergens;
  manualOverrides: ManualAllergenOverrides;
  onAddManual: (allergen: AllergenType, tier: 'contains' | 'mayContain', note?: string) => void;
  onRemoveManual: (allergen: AllergenType) => void;
  onPromote: (allergen: AllergenType) => void;
  onUnpromote: (allergen: AllergenType) => void;
  onUpdateNote: (allergen: AllergenType, note: string) => void;
}

/**
 * Badge showing source type (AUTO locked, MANUAL removable, PROMOTED)
 */
const SourceBadge: React.FC<{ source: 'auto' | 'manual' | 'promoted' }> = ({ source }) => {
  switch (source) {
    case 'auto':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
          <Lock className="w-2.5 h-2.5" />
          AUTO
        </span>
      );
    case 'manual':
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
          MANUAL
        </span>
      );
    case 'promoted':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
          <ArrowUp className="w-2.5 h-2.5" />
          PROMOTED
        </span>
      );
  }
};

/**
 * Single allergen row in the declaration
 */
const AllergenRow: React.FC<{
  item: AllergenWithContext;
  canPromote: boolean;
  onRemove?: () => void;
  onPromote?: () => void;
  onUnpromote?: () => void;
  onUpdateNote?: (note: string) => void;
}> = ({ item, canPromote, onRemove, onPromote, onUnpromote, onUpdateNote }) => {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(item.note || '');
  
  const isRemovable = item.source === 'manual';
  const isPromotable = canPromote && item.source === 'auto' && item.tier === 'mayContain';
  const isUnpromotable = item.source === 'promoted';
  
  return (
    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/30 transition-colors">
      <AllergenBadge type={item.type} size="sm" disableTooltip />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">{ALLERGENS[item.type]?.label || item.type}</span>
          <SourceBadge source={item.source} />
        </div>
        
        {item.note && !showNote && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">"{item.note}"</p>
        )}
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Promote button (may contain → contains) */}
        {isPromotable && onPromote && (
          <button
            onClick={onPromote}
            className="p-1.5 rounded hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors"
            title="Promote to Contains"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
        
        {/* Unpromote button */}
        {isUnpromotable && onUnpromote && (
          <button
            onClick={onUnpromote}
            className="p-1.5 rounded hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 transition-colors"
            title="Revert to May Contain"
          >
            <ArrowUp className="w-4 h-4 rotate-180" />
          </button>
        )}
        
        {/* Add/edit note button */}
        {item.source === 'manual' && onUpdateNote && (
          <button
            onClick={() => setShowNote(!showNote)}
            className="p-1.5 rounded hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors"
            title="Add note"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
        
        {/* Remove button (manual only) */}
        {isRemovable && onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Note editor */}
      {showNote && item.source === 'manual' && (
        <div className="absolute left-0 right-0 top-full mt-1 p-2 bg-gray-700 rounded-lg shadow-lg z-10">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => {
              onUpdateNote?.(noteText);
              setShowNote(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateNote?.(noteText);
                setShowNote(false);
              }
            }}
            placeholder="Add a note (e.g., 'Shared fryer')"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder:text-gray-500"
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

/**
 * Add Allergen Dropdown
 */
const AddAllergenDropdown: React.FC<{
  existingAllergens: Set<AllergenType>;
  onAdd: (allergen: AllergenType, tier: 'contains' | 'mayContain') => void;
}> = ({ existingAllergens, onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'contains' | 'mayContain'>('contains');
  
  const availableAllergens = Object.keys(ALLERGENS).filter(
    key => !existingAllergens.has(key as AllergenType)
  ) as AllergenType[];
  
  if (availableAllergens.length === 0) return null;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-primary-500 hover:text-primary-400 transition-colors w-full"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Add manual allergen</span>
        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-64 overflow-hidden">
          {/* Tier selector */}
          <div className="p-2 border-b border-gray-700 flex gap-2">
            <button
              onClick={() => setSelectedTier('contains')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                selectedTier === 'contains' 
                  ? 'bg-rose-500/20 text-rose-400' 
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              Contains
            </button>
            <button
              onClick={() => setSelectedTier('mayContain')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                selectedTier === 'mayContain' 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              May Contain
            </button>
          </div>
          
          {/* Allergen list */}
          <div className="max-h-48 overflow-y-auto p-2">
            {availableAllergens.map(allergen => (
              <button
                key={allergen}
                onClick={() => {
                  onAdd(allergen, selectedTier);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition-colors"
              >
                <AllergenBadge type={allergen} size="sm" disableTooltip />
                <span className="text-sm text-gray-300">{ALLERGENS[allergen]?.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Declaration Panel - Editable allergen declaration for the recipe
 * Right side of the two-panel layout
 */
export const DeclarationPanel: React.FC<DeclarationPanelProps> = ({
  allergensWithContext,
  autoDetected,
  manualOverrides,
  onAddManual,
  onRemoveManual,
  onPromote,
  onUnpromote,
  onUpdateNote
}) => {
  // Split by tier
  const containsAllergens = allergensWithContext.filter(a => a.tier === 'contains');
  const mayContainAllergens = allergensWithContext.filter(a => a.tier === 'mayContain');
  
  // Get all existing allergens for the add dropdown
  const existingAllergens = new Set<AllergenType>(allergensWithContext.map(a => a.type));
  
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-medium text-white">Recipe Declaration</h3>
            <p className="text-xs text-gray-400">What customers see</p>
          </div>
        </div>
      </div>
      
      {/* Contains Section */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-sm font-medium text-rose-400 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          CONTAINS ({containsAllergens.length})
        </h4>
        
        {containsAllergens.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No allergens declared</p>
        ) : (
          <div className="space-y-1">
            {containsAllergens.map(item => (
              <AllergenRow
                key={item.type}
                item={item}
                canPromote={false}
                onRemove={item.source === 'manual' ? () => onRemoveManual(item.type) : undefined}
                onUpdateNote={item.source === 'manual' ? (note) => onUpdateNote(item.type, note) : undefined}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* May Contain Section */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          MAY CONTAIN ({mayContainAllergens.length})
        </h4>
        
        {mayContainAllergens.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No potential allergens</p>
        ) : (
          <div className="space-y-1">
            {mayContainAllergens.map(item => (
              <AllergenRow
                key={item.type}
                item={item}
                canPromote={true}
                onRemove={item.source === 'manual' ? () => onRemoveManual(item.type) : undefined}
                onPromote={item.source === 'auto' ? () => onPromote(item.type) : undefined}
                onUnpromote={item.source === 'promoted' ? () => onUnpromote(item.type) : undefined}
                onUpdateNote={item.source === 'manual' ? (note) => onUpdateNote(item.type, note) : undefined}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Add Manual Allergen */}
      <div className="p-4">
        <AddAllergenDropdown
          existingAllergens={existingAllergens}
          onAdd={onAddManual}
        />
      </div>
    </div>
  );
};
