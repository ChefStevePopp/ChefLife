import React, { useState } from 'react';
import { AlertTriangle, Plus, X, Lightbulb, ChevronUp } from 'lucide-react';

interface CrossContactNotesProps {
  notes: string[];
  onChange: (notes: string[]) => void;
}

const COMMON_NOTES = [
  'Shared equipment with wheat products',
  'Processed in a facility that also processes nuts',
  'May contain traces of milk due to shared processing lines',
  'Prepared in a kitchen that handles shellfish',
  'Potential cross-contact with soy products',
  'Shared fryer with breaded items',
  'Same prep surface as nut products',
  'Produced on shared equipment with egg products'
];

/**
 * =============================================================================
 * CROSS-CONTACT NOTES — Your Operational Knowledge
 * =============================================================================
 * Document contamination risks that go beyond ingredient-level allergen data.
 * These are YOUR observations about YOUR kitchen, YOUR equipment, YOUR
 * supplier chain. ChefLife records what you tell it.
 *
 * FUTURE: Full audit trail with auth-linked user_id, timestamps, and
 * change history stored in recipe_allergen_declarations table.
 * =============================================================================
 */
export const CrossContactNotes: React.FC<CrossContactNotesProps> = ({
  notes,
  onChange
}) => {
  const [expanded, setExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const addNote = (note: string) => {
    if (note.trim() && !notes.includes(note.trim())) {
      onChange([...notes, note.trim()]);
    }
    setNewNote('');
    setShowSuggestions(false);
  };
  
  const removeNote = (index: number) => {
    onChange(notes.filter((_, i) => i !== index));
  };
  
  const availableSuggestions = COMMON_NOTES.filter(
    suggestion => !notes.some(note => note.toLowerCase() === suggestion.toLowerCase())
  );
  
  return (
    <div className={`expandable-info-section ${expanded ? 'expanded' : ''}`}>
      
      {/* Expandable Header */}
      <button
        className="expandable-info-header w-full justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-medium text-white">Cross-Contact Notes</h3>
            <p className="text-xs text-gray-400">
              Your operational contamination risk observations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">
              {notes.length}
            </span>
          )}
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </div>
      </button>
      
      {/* Expandable Content */}
      <div className="expandable-info-content">
        <div className="px-5 pt-4 pb-5 space-y-4">
          
          {/* Existing Notes */}
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No cross-contact notes added</p>
          ) : (
            <div className="space-y-2">
              {notes.map((note, index) => (
                <div 
                  key={index}
                  className="group flex items-start gap-2 p-2 rounded-lg bg-gray-700/30"
                >
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span className="text-sm text-gray-300 flex-1">{note}</span>
                  <button
                    onClick={() => removeNote(index)}
                    className="p-1 rounded hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove note"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add Note Input */}
          <div className="relative pt-2 border-t border-gray-700/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newNote.trim()) {
                    addNote(newNote);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Add cross-contact note..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none"
              />
              <button
                onClick={() => newNote.trim() && addNote(newNote)}
                disabled={!newNote.trim()}
                className="px-3 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && availableSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                <div className="p-2 border-b border-gray-700 flex items-center gap-2 text-xs text-gray-400">
                  <Lightbulb className="w-3 h-3" />
                  Common notes (click to add)
                </div>
                {availableSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => addNote(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="w-full text-center px-3 py-2 text-xs text-gray-500 hover:text-gray-400 border-t border-gray-700"
                >
                  Close suggestions
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
