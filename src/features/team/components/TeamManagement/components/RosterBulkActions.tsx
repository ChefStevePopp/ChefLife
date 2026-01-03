import React from 'react';
import { X, UserX, UserCheck, Trash2, CheckSquare, AlertTriangle } from 'lucide-react';

interface RosterBulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onDeactivate?: () => void;
  onReactivate?: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isDeactivating?: boolean;
  isReactivating?: boolean;
  isDeleting?: boolean;
  showDeactivate?: boolean;
  showReactivate?: boolean;
}

export const RosterBulkActions: React.FC<RosterBulkActionsProps> = ({
  selectedCount,
  totalCount,
  onDeactivate,
  onReactivate,
  onDelete,
  onClearSelection,
  isDeactivating = false,
  isReactivating = false,
  isDeleting = false,
  showDeactivate = false,
  showReactivate = false,
}) => {
  if (selectedCount === 0) return null;

  // Warning threshold - selecting more than 50% of team triggers caution styling
  const isHighRisk = selectedCount > totalCount * 0.5 && totalCount > 2;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Outer glow container */}
      <div className="relative">
        {/* Animated gradient glow ring */}
        <div 
          className="absolute -inset-[3px] rounded-2xl opacity-75 blur-sm animate-gradient-x"
          style={{
            background: 'linear-gradient(90deg, #0ea5e9, #22d3ee, #0ea5e9, #22d3ee, #0ea5e9)',
            backgroundSize: '200% 100%',
          }}
        />
        
        {/* Sharper inner ring */}
        <div 
          className="absolute -inset-[2px] rounded-2xl animate-gradient-x"
          style={{
            background: 'linear-gradient(90deg, #0ea5e9, #22d3ee, #0ea5e9, #22d3ee, #0ea5e9)',
            backgroundSize: '200% 100%',
          }}
        />
        
        {/* Inner content */}
        <div className="relative flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-xl">
          {/* Label */}
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider pr-3 border-r border-gray-700">
            Bulk Actions
          </span>

          {/* Selection count */}
          <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
            <CheckSquare className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium text-white">
              {selectedCount} selected
            </span>
            {isHighRisk && (
              <div className="flex items-center gap-1 ml-1 px-2 py-0.5 bg-amber-500/20 rounded-full">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">High selection</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {showReactivate && onReactivate && (
              <button
                onClick={onReactivate}
                disabled={isReactivating}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                {isReactivating ? 'Reactivating...' : 'Reactivate'}
              </button>
            )}

            {showDeactivate && onDeactivate && (
              <button
                onClick={onDeactivate}
                disabled={isDeactivating}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <UserX className="w-4 h-4" />
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            )}
            
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Removing...' : 'Remove'}
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClearSelection}
            className="ml-2 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
