import React, { useState } from 'react';
import { Plus, X, ArrowUp, ArrowDown, MessageSquare, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { AllergenBadge } from '@/features/allergens/components/AllergenBadge';
import { ALLERGENS } from '@/features/allergens/constants';
import type { AllergenType } from '@/features/allergens/types';
import type { ManualAllergenOverrides, AllergenWithContext } from './types';

interface ManualOverridesProps {
  manualOverrides: ManualAllergenOverrides;
  allergensWithContext: AllergenWithContext[];
  onAddManual: (allergen: AllergenType, tier: 'contains' | 'mayContain', note?: string) => void;
  onRemoveManual: (allergen: AllergenType) => void;
  onPromote: (allergen: AllergenType) => void;
  onUnpromote: (allergen: AllergenType) => void;
  onUpdateNote: (allergen: AllergenType, note: string) => void;
}

/**
 * =============================================================================
 * MANUAL OVERRIDES — Your Professional Knowledge
 * =============================================================================
 * Where you add allergens based on your operational knowledge that goes
 * beyond what's in the MIL: cross-contact from shared equipment, supplier
 * verbal disclosures, chef experience with specific products.
 * 
 * Each override is YOUR decision. The audit trail records who added it,
 * when, and why — because this is your declaration, your accountability.
 *
 * FUTURE: Full audit trail with auth-linked user_id, timestamps, and
 * change history stored in recipe_allergen_declarations table.
 * =============================================================================
 */
export const ManualOverrides: React.FC<ManualOverridesProps> = ({
  manualOverrides,
  allergensWithContext,
  onAddManual,
  onRemoveManual,
  onPromote,
  onUnpromote,
  onUpdateNote,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const manualAllergens = allergensWithContext.filter(a => a.source === 'manual');
  const promotedAllergens = allergensWithContext.filter(a => a.source === 'promoted');
  const promotableAllergens = allergensWithContext.filter(
    a => a.source === 'auto' && a.tier === 'mayContain'
  );
  const existingAllergens = new Set<AllergenType>(allergensWithContext.map(a => a.type));
  
  const hasAnyOverrides = manualAllergens.length > 0 || promotedAllergens.length > 0;
  const overrideCount = manualAllergens.length + promotedAllergens.length;
  
  return (
    <div className={`expandable-info-section ${expanded ? 'expanded' : ''}`}>
      
      {/* Expandable Header */}
      <button
        className="expandable-info-header w-full justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
            <Pencil className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-medium text-white">Manual Overrides</h3>
            <p className="text-xs text-gray-400">
              Your professional knowledge beyond ingredient data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overrideCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
              {overrideCount}
            </span>
          )}
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </div>
      </button>
      
      {/* Expandable Content */}
      <div className="expandable-info-content">
        <div className="px-5 pt-4 pb-5 space-y-4">

          {/* Existing manual allergens */}
          {manualAllergens.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Added by you</h4>
              {manualAllergens.map(item => (
                <ManualAllergenRow
                  key={item.type}
                  item={item}
                  onRemove={() => onRemoveManual(item.type)}
                  onUpdateNote={(note) => onUpdateNote(item.type, note)}
                />
              ))}
            </div>
          )}

          {/* Promoted allergens */}
          {promotedAllergens.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Promoted to Contains
              </h4>
              {promotedAllergens.map(item => (
                <div
                  key={item.type}
                  className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/30 transition-colors"
                >
                  <AllergenBadge type={item.type} size="sm" disableTooltip />
                  <span className="text-sm text-white flex-1">
                    {ALLERGENS[item.type]?.label || item.type}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    <ArrowUp className="w-2.5 h-2.5 inline mr-0.5" />
                    PROMOTED
                  </span>
                  <button
                    onClick={() => onUnpromote(item.type)}
                    className="p-1 rounded hover:bg-amber-500/20 text-gray-500 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Revert to May Contain"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Promotable may-contain allergens */}
          {promotableAllergens.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Promote May Contain → Contains
              </h4>
              <p className="text-xs text-gray-500 mb-2">
                If you know a "may contain" is definite, promote it
              </p>
              {promotableAllergens.map(item => (
                <div
                  key={item.type}
                  className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/30 transition-colors"
                >
                  <AllergenBadge type={item.type} size="sm" disableTooltip />
                  <span className="text-sm text-gray-300 flex-1">
                    {ALLERGENS[item.type]?.label || item.type}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/60">
                    MAY CONTAIN
                  </span>
                  <button
                    onClick={() => onPromote(item.type)}
                    className="p-1 rounded hover:bg-emerald-500/20 text-gray-500 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Promote to Contains"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!hasAnyOverrides && promotableAllergens.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-2">
              No overrides at this time
            </p>
          )}

          {/* Add manual allergen dropdown */}
          <AddAllergenDropdown
            existingAllergens={existingAllergens}
            onAdd={onAddManual}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Single manual allergen row with remove + note controls
 */
const ManualAllergenRow: React.FC<{
  item: AllergenWithContext;
  onRemove: () => void;
  onUpdateNote: (note: string) => void;
}> = ({ item, onRemove, onUpdateNote }) => {
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState(item.note || '');

  return (
    <div className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/30 transition-colors">
      <AllergenBadge type={item.type} size="sm" disableTooltip />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white">{ALLERGENS[item.type]?.label || item.type}</span>
        {item.note && !editing && (
          <p className="text-xs text-gray-400 truncate">"{item.note}"</p>
        )}
        {editing && (
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => { onUpdateNote(noteText); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onUpdateNote(noteText); setEditing(false); } }}
            placeholder="e.g. Shared fryer with shellfish"
            className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder:text-gray-500"
            autoFocus
          />
        )}
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
        item.tier === 'contains' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
      }`}>
        {item.tier === 'contains' ? 'CONTAINS' : 'MAY CONTAIN'}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(!editing)}
          className="p-1 rounded hover:bg-blue-500/20 text-gray-500 hover:text-blue-400 transition-colors"
          title="Edit note"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-colors"
          title="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
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
                onClick={() => { onAdd(allergen, selectedTier); setIsOpen(false); }}
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
