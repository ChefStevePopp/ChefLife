/**
 * ViewModeSwitcher - Unified toggle for Compact/Guided/Focus modes
 */

import React from 'react';
import { LayoutList, BookOpen, Focus } from 'lucide-react';
import type { ViewMode, ViewModeSwitcherProps } from './shared/types';

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({ mode, onChange }) => (
  <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-800/50 border border-gray-700/50">
    <button
      onClick={() => onChange('compact')}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        mode === 'compact'
          ? 'bg-gray-700 text-white shadow-sm'
          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
      }`}
      title="Compact - quick reference"
    >
      <LayoutList className="w-4 h-4" />
      <span className="hidden sm:inline">Compact</span>
    </button>
    <button
      onClick={() => onChange('guided')}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        mode === 'guided'
          ? 'bg-amber-500/15 text-amber-400 shadow-sm'
          : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10'
      }`}
      title="Guided - cookbook style"
    >
      <BookOpen className="w-4 h-4" />
      <span className="hidden sm:inline">Guided</span>
    </button>
    <button
      onClick={() => onChange('focus')}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        mode === 'focus'
          ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
          : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
      }`}
      title="Focus - fullscreen cooking mode"
    >
      <Focus className="w-4 h-4" />
      <span className="hidden sm:inline">Focus</span>
    </button>
  </div>
);

export default ViewModeSwitcher;
