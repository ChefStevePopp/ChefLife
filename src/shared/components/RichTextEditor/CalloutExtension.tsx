/**
 * =============================================================================
 * CALLOUT EXTENSION - L6 Custom Tiptap Node
 * =============================================================================
 * 
 * Dynamic callout blocks for recipe instructions.
 * Block types and styles are loaded from Recipe Settings configuration.
 * 
 * DEFAULT BLOCKS (can be customized):
 * 💡 Tip (emerald) - Pro tips, best practices, shortcuts
 * ⚠️ Caution (amber) - Warnings, things to watch for
 * 🔥 Critical (rose) - Safety critical, must-do items
 * ℹ️ Info (blue) - Additional context, FYI
 * 🧊 FIFO (cyan) - First In First Out reminders
 * 🌡️ Temperature (orange) - Temperature-specific notes
 * 
 * Restaurants can add custom blocks like:
 * - 🧤 Safety Gear (purple) - Required PPE
 * - ⏱️ Timing (lime) - Time-critical steps
 * - 🍽️ Plating (pink) - Presentation notes
 * =============================================================================
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { 
  Lightbulb, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  X, 
  RotateCcw, 
  Thermometer, 
  GripVertical,
  ShieldAlert,
  Timer,
  Utensils,
  Flame,
  Snowflake,
  CheckCircle,
  Eye,
  Clock,
  LucideIcon,
} from 'lucide-react';
import { getActiveInstructionBlocks } from '@/features/recipes/hooks/useRecipeConfig';

// ============================================================================
// CALLOUT TYPES
// ============================================================================

export type CalloutType = string; // Dynamic - any type from config

// ============================================================================
// ICON MAPPING
// ============================================================================

const ICON_MAP: Record<string, LucideIcon> = {
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Info,
  RotateCcw,
  Thermometer,
  ShieldAlert,
  Timer,
  Utensils,
  Flame,
  Snowflake,
  CheckCircle,
  Eye,
  Clock,
};

const getIcon = (iconName: string): LucideIcon => {
  return ICON_MAP[iconName] || Info;
};

// ============================================================================
// COLOR CONFIG
// ============================================================================

interface ColorConfig {
  bgColor: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  hoverBg: string;
}

const COLOR_CONFIG: Record<string, ColorConfig> = {
  emerald: {
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-50',
    hoverBg: 'hover:bg-emerald-950/50',
  },
  amber: {
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-50',
    hoverBg: 'hover:bg-amber-950/50',
  },
  rose: {
    bgColor: 'bg-rose-950/40',
    borderColor: 'border-l-rose-500',
    iconBg: 'bg-rose-500/20',
    iconColor: 'text-rose-400',
    textColor: 'text-rose-50',
    hoverBg: 'hover:bg-rose-950/50',
  },
  blue: {
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    textColor: 'text-blue-50',
    hoverBg: 'hover:bg-blue-950/50',
  },
  primary: {
    bgColor: 'bg-primary-950/40',
    borderColor: 'border-l-primary-500',
    iconBg: 'bg-primary-500/20',
    iconColor: 'text-primary-400',
    textColor: 'text-primary-50',
    hoverBg: 'hover:bg-primary-950/50',
  },
  cyan: {
    bgColor: 'bg-cyan-950/40',
    borderColor: 'border-l-cyan-500',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    textColor: 'text-cyan-50',
    hoverBg: 'hover:bg-cyan-950/50',
  },
  orange: {
    bgColor: 'bg-orange-950/40',
    borderColor: 'border-l-orange-500',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    textColor: 'text-orange-50',
    hoverBg: 'hover:bg-orange-950/50',
  },
  purple: {
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-l-purple-500',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    textColor: 'text-purple-50',
    hoverBg: 'hover:bg-purple-950/50',
  },
  lime: {
    bgColor: 'bg-lime-950/40',
    borderColor: 'border-l-lime-500',
    iconBg: 'bg-lime-500/20',
    iconColor: 'text-lime-400',
    textColor: 'text-lime-50',
    hoverBg: 'hover:bg-lime-950/50',
  },
  pink: {
    bgColor: 'bg-pink-950/40',
    borderColor: 'border-l-pink-500',
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
    textColor: 'text-pink-50',
    hoverBg: 'hover:bg-pink-950/50',
  },
  teal: {
    bgColor: 'bg-teal-950/40',
    borderColor: 'border-l-teal-500',
    iconBg: 'bg-teal-500/20',
    iconColor: 'text-teal-400',
    textColor: 'text-teal-50',
    hoverBg: 'hover:bg-teal-950/50',
  },
};

// Fallback for unknown colors
const DEFAULT_COLOR_CONFIG: ColorConfig = COLOR_CONFIG.blue;

// ============================================================================
// REACT COMPONENT FOR RENDERING CALLOUT
// ============================================================================

interface CalloutNodeViewProps {
  node: {
    attrs: {
      type: string;
    };
  };
  deleteNode: () => void;
  selected: boolean;
}

const CalloutNodeView: React.FC<CalloutNodeViewProps> = ({ node, deleteNode, selected }) => {
  const type = node.attrs.type;
  
  // Get block config from recipe settings
  const blocks = getActiveInstructionBlocks();
  const blockConfig = blocks.find(b => b.type === type);
  
  // Get styling based on config or fallbacks
  const iconName = blockConfig?.icon || 'Info';
  const colorName = blockConfig?.color || 'blue';
  const label = blockConfig?.label || type.charAt(0).toUpperCase() + type.slice(1);
  
  const config = COLOR_CONFIG[colorName] || DEFAULT_COLOR_CONFIG;
  const IconComponent = getIcon(iconName);

  return (
    <NodeViewWrapper className="callout-wrapper my-4" data-callout-type={type}>
      <div
        className={`
          group relative rounded-lg border-l-4 transition-all duration-200
          ${config.bgColor} ${config.borderColor} ${config.hoverBg}
          ${selected ? 'ring-2 ring-amber-500/40 ring-offset-2 ring-offset-gray-900' : ''}
        `}
      >
        {/* Drag Handle - shows on hover */}
        <div className="absolute -left-6 top-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className="w-4 h-4 text-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg ${config.iconBg} flex items-center justify-center`}>
              <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${config.iconColor}`}>
              {label}
            </span>
          </div>
          <button
            type="button"
            onClick={deleteNode}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-all"
            title="Remove block"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - editable area */}
        <div className="px-4 pb-4">
          <NodeViewContent 
            className={`callout-content ${config.textColor} text-sm leading-relaxed min-h-[1.5rem]`}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

// ============================================================================
// TIPTAP EXTENSION
// ============================================================================

export const CalloutExtension = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-callout-type') || 'info',
        renderHTML: attributes => ({
          'data-callout-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-callout': '' }, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  addKeyboardShortcuts() {
    return {
      // Backspace at start of empty callout removes it
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;
        const node = $from.node(-1);
        
        if (node?.type.name === 'callout') {
          const isAtStart = $from.parentOffset === 0;
          const isEmpty = node.textContent.length === 0;
          
          if (isAtStart && isEmpty) {
            return editor.commands.deleteNode('callout');
          }
        }
        
        return false;
      },
      // Enter at end of callout creates new paragraph outside
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { $from, empty } = selection;
        
        if (!empty) return false;
        
        const node = $from.node(-1);
        if (node?.type.name !== 'callout') return false;
        
        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
        const isEmpty = $from.parent.textContent.length === 0;
        
        // If at end of empty paragraph in callout, exit the callout
        if (isAtEnd && isEmpty) {
          return editor.chain()
            .deleteNode('paragraph')
            .insertContentAt($from.after(-1), { type: 'paragraph' })
            .focus()
            .run();
        }
        
        return false;
      },
    };
  },

  addCommands() {
    return {
      setCallout: (type: CalloutType) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { type },
          content: [{ type: 'paragraph' }],
        });
      },
      toggleCallout: (type: CalloutType) => ({ commands, editor }) => {
        if (editor.isActive(this.name, { type })) {
          return commands.lift(this.name);
        }
        return commands.setCallout(type);
      },
    };
  },
});

export default CalloutExtension;
