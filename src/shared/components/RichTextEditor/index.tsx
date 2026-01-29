/**
 * =============================================================================
 * RICH TEXT EDITOR - L6 Premium "Holy Crap" Edition
 * =============================================================================
 * 
 * Full-featured Tiptap-based editor for recipe instructions.
 * Designed to make managers say "Holy Crap, this is nice!"
 * 
 * PREMIUM FEATURES:
 * - Bold, Italic, Underline, Strikethrough, Highlight
 * - Headings (H2, H3)
 * - Bullet lists, Numbered lists, Task lists
 * - DYNAMIC ChefLife callout blocks (configurable in Recipe Settings)
 * - Slash commands (type "/" for beautiful dropdown)
 * - Bubble menu on text selection
 * - Keyboard shortcuts with visual hints
 * - Character/word count
 * - Focus ring with amber glow
 * - Premium morph animations
 * 
 * CALLOUT BLOCKS:
 * Blocks are loaded from Recipe Settings (admin/modules/recipes → Editor tab).
 * Default blocks include: Pro Tip, Caution, Critical, Info, FIFO, Temperature
 * Restaurants can add/remove/customize blocks to match their kitchen culture.
 * 
 * SLASH MENU POSITIONING:
 * - Detects available space below cursor
 * - Flips to appear ABOVE cursor if near bottom of screen
 * - Accounts for floating action bar (120px safe zone)
 * - z-index: 100 to ensure visibility above all overlays
 * 
 * USAGE:
 *   <RichTextEditor
 *     content={step.instruction}
 *     onChange={(html, json) => onUpdate(index, { instruction: html })}
 *     placeholder="Describe what to do in this step..."
 *   />
 * =============================================================================
 */

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Info,
  Heading2,
  Heading3,
  Undo,
  Redo,
  RemoveFormatting,
  Highlighter,
  Thermometer,
  RotateCcw,
  Quote,
  Minus,
  Pilcrow,
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
import { CalloutExtension, type CalloutType } from './CalloutExtension';
import { getActiveInstructionBlocks, type InstructionBlockTemplate } from '@/features/recipes/hooks/useRecipeConfig';
import './styles.css';

// ============================================================================
// TYPES
// ============================================================================

interface RichTextEditorProps {
  content: string;
  onChange: (html: string, json: any) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: string;
  disabled?: boolean;
}

// ============================================================================
// ICON MAPPING - Map icon names to Lucide components
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
// COLOR MAPPING - Tailwind color classes
// ============================================================================

const COLOR_MAP: Record<string, { text: string; hoverBg: string; variant: string }> = {
  emerald: { text: 'text-emerald-400', hoverBg: 'hover:bg-emerald-500/10', variant: 'tip' },
  amber: { text: 'text-amber-400', hoverBg: 'hover:bg-amber-500/10', variant: 'caution' },
  rose: { text: 'text-rose-400', hoverBg: 'hover:bg-rose-500/10', variant: 'critical' },
  blue: { text: 'text-blue-400', hoverBg: 'hover:bg-blue-500/10', variant: 'info' },
  primary: { text: 'text-primary-400', hoverBg: 'hover:bg-primary-500/10', variant: 'primary' },
  cyan: { text: 'text-cyan-400', hoverBg: 'hover:bg-cyan-500/10', variant: 'fifo' },
  orange: { text: 'text-orange-400', hoverBg: 'hover:bg-orange-500/10', variant: 'temperature' },
  purple: { text: 'text-purple-400', hoverBg: 'hover:bg-purple-500/10', variant: 'purple' },
  lime: { text: 'text-lime-400', hoverBg: 'hover:bg-lime-500/10', variant: 'lime' },
  pink: { text: 'text-pink-400', hoverBg: 'hover:bg-pink-500/10', variant: 'pink' },
  teal: { text: 'text-teal-400', hoverBg: 'hover:bg-teal-500/10', variant: 'teal' },
};

// ============================================================================
// TOOLBAR BUTTON COMPONENT
// ============================================================================

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  colorClass?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
  colorClass,
}) => {
  const baseClasses = isActive 
    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' 
    : 'text-gray-400 hover:text-white hover:bg-gray-700/50';
  
  const activeColorClass = colorClass && isActive 
    ? `bg-${colorClass}-500/30 text-${colorClass}-400 ring-1 ring-${colorClass}-500/30`
    : null;
  
  const hoverColorClass = colorClass && !isActive
    ? `text-${colorClass}-400/60 hover:text-${colorClass}-400 hover:bg-${colorClass}-500/20`
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded-lg transition-all duration-150
        disabled:opacity-30 disabled:cursor-not-allowed
        ${activeColorClass || hoverColorClass || baseClasses}
      `}
    >
      {children}
    </button>
  );
};

// ============================================================================
// TOOLBAR DIVIDER
// ============================================================================

const ToolbarDivider: React.FC = () => (
  <div className="w-px h-6 bg-gray-700/50 mx-1" />
);

// ============================================================================
// SLASH COMMAND MENU
// Smart positioning: flips above cursor if near bottom of screen
// ============================================================================

interface SlashMenuProps {
  editor: any;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number; bottom: number };
  insertCallout: (type: CalloutType) => void;
  calloutBlocks: InstructionBlockTemplate[];
}

const MENU_HEIGHT = 320; // max-h-80 = 20rem = 320px
const BOTTOM_SAFE_ZONE = 120; // Space for floating action bar + padding

const SlashMenu: React.FC<SlashMenuProps> = ({ 
  editor, 
  isOpen, 
  onClose, 
  position, 
  insertCallout,
  calloutBlocks,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Build command list from standard commands + dynamic callout blocks
  const allCommands = useMemo(() => {
    const standardCommands = [
      { 
        icon: Heading2, 
        label: 'Heading 2', 
        description: 'Large section heading',
        shortcut: '/h2',
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        color: 'text-gray-400',
      },
      { 
        icon: Heading3, 
        label: 'Heading 3', 
        description: 'Medium section heading',
        shortcut: '/h3',
        action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        color: 'text-gray-400',
      },
      { 
        icon: List, 
        label: 'Bullet List', 
        description: 'Create a bullet list',
        shortcut: '/bullet',
        action: () => editor.chain().focus().toggleBulletList().run(),
        color: 'text-gray-400',
      },
      { 
        icon: ListOrdered, 
        label: 'Numbered List', 
        description: 'Create a numbered list',
        shortcut: '/number',
        action: () => editor.chain().focus().toggleOrderedList().run(),
        color: 'text-gray-400',
      },
      { 
        icon: CheckSquare, 
        label: 'Task List', 
        description: 'Create a checklist',
        shortcut: '/task',
        action: () => editor.chain().focus().toggleTaskList().run(),
        color: 'text-gray-400',
      },
      { 
        icon: Quote, 
        label: 'Quote', 
        description: 'Add a blockquote',
        shortcut: '/quote',
        action: () => editor.chain().focus().toggleBlockquote().run(),
        color: 'text-gray-400',
      },
      { 
        icon: Minus, 
        label: 'Divider', 
        description: 'Add a horizontal line',
        shortcut: '/divider',
        action: () => editor.chain().focus().setHorizontalRule().run(),
        color: 'text-gray-400',
      },
    ];

    // Map callout blocks to menu items
    const calloutCommands = calloutBlocks.map(block => {
      const IconComponent = getIcon(block.icon);
      const colorConfig = COLOR_MAP[block.color] || COLOR_MAP.blue;
      return {
        icon: IconComponent,
        label: block.label,
        description: block.description,
        shortcut: `/${block.type}`,
        action: () => insertCallout(block.type as CalloutType),
        color: colorConfig.text,
      };
    });

    return [...standardCommands, ...calloutCommands];
  }, [editor, calloutBlocks, insertCallout]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % allCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + allCommands.length) % allCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allCommands[selectedIndex]) {
          allCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  // Calculate whether to show menu above or below cursor
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - position.top - BOTTOM_SAFE_ZONE;
  const showAbove = spaceBelow < MENU_HEIGHT;
  
  // Position the menu
  const menuStyle: React.CSSProperties = {
    left: Math.min(position.left, window.innerWidth - 300), // Keep within viewport
    ...(showAbove 
      ? { bottom: viewportHeight - position.bottom + 8 } 
      : { top: position.top }
    ),
  };

  return (
    <div
      ref={menuRef}
      className="slash-menu fixed z-[100] w-72 max-h-80 overflow-y-auto bg-gray-800 border border-gray-700 rounded-xl shadow-2xl"
      style={menuStyle}
    >
      <div className="p-2 border-b border-gray-700/50">
        <div className="text-xs text-gray-500 px-2 pb-1">Insert block</div>
      </div>
      <div className="p-1">
        {allCommands.map((cmd, index) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.label}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                transition-all duration-100
                ${index === selectedIndex 
                  ? 'bg-amber-500/20 text-white' 
                  : 'text-gray-300 hover:bg-gray-700/50'
                }
              `}
            >
              <div className={`w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center ${cmd.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{cmd.label}</div>
                <div className="text-xs text-gray-500 truncate">{cmd.description}</div>
              </div>
              <div className="text-xs text-gray-600 font-mono">{cmd.shortcut}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN EDITOR COMPONENT
// ============================================================================

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start typing, or press "/" for commands...',
  maxLength,
  minHeight = '200px',
  disabled = false,
}) => {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0, bottom: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  // Load active instruction blocks from config
  const calloutBlocks = useMemo(() => getActiveInstructionBlocks(), []);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Underline,
      Highlight.configure({
        multicolor: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
      CalloutExtension,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      onChange(html, json);

      // Check for slash command
      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      
      if (textBefore.endsWith('/')) {
        // Open slash menu - get both top and bottom for smart positioning
        const coords = editor.view.coordsAtPos($from.pos);
        setSlashMenuPosition({ 
          top: coords.bottom + 8, 
          left: coords.left,
          bottom: coords.top, // cursor top = where to anchor if showing above
        });
        setSlashMenuOpen(true);
      } else if (!textBefore.includes('/')) {
        setSlashMenuOpen(false);
      }
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content prose prose-invert max-w-none focus:outline-none',
        style: `min-height: ${minHeight}`,
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Escape' && slashMenuOpen) {
          setSlashMenuOpen(false);
          return true;
        }
        return false;
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const insertCallout = useCallback((type: CalloutType) => {
    if (editor) {
      // Delete the slash if present
      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      if (textBefore.endsWith('/')) {
        editor.chain()
          .focus()
          .deleteRange({ from: $from.pos - 1, to: $from.pos })
          .insertContent({
            type: 'callout',
            attrs: { type },
            content: [{ type: 'paragraph' }],
          })
          .run();
      } else {
        editor.chain()
          .focus()
          .insertContent({
            type: 'callout',
            attrs: { type },
            content: [{ type: 'paragraph' }],
          })
          .run();
      }
      setSlashMenuOpen(false);
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 animate-pulse">
        <div className="h-10 bg-gray-700/50 rounded-lg mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-700/30 rounded w-3/4" />
          <div className="h-4 bg-gray-700/30 rounded w-1/2" />
          <div className="h-4 bg-gray-700/30 rounded w-2/3" />
        </div>
      </div>
    );
  }

  const characterCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();

  return (
    <div 
      ref={editorRef}
      className={`rich-text-editor rounded-xl border-2 transition-all duration-300 ${
        editor.isFocused 
          ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' 
          : 'border-gray-700/50 hover:border-gray-600/50'
      } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
    >
      
      {/* ================================================================
       * TOOLBAR - Premium L6 Design
       * ================================================================ */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50 rounded-t-xl">
        {/* History */}
        <div className="flex items-center gap-0.5 mr-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Text Type */}
        <div className="flex items-center gap-0.5 mr-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive('paragraph') && !editor.isActive('heading')}
            title="Normal text"
          >
            <Pilcrow className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2 (Ctrl+Alt+2)"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3 (Ctrl+Alt+3)"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Text Formatting */}
        <div className="flex items-center gap-0.5 mr-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Lists */}
        <div className="flex items-center gap-0.5 mr-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Task List"
          >
            <CheckSquare className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Dynamic Callout Blocks */}
        <div className="flex items-center gap-0.5 mr-1">
          {calloutBlocks.map(block => {
            const IconComponent = getIcon(block.icon);
            const colorConfig = COLOR_MAP[block.color] || COLOR_MAP.blue;
            return (
              <ToolbarButton
                key={block.id}
                onClick={() => insertCallout(block.type as CalloutType)}
                isActive={editor.isActive('callout', { type: block.type })}
                title={`${block.label} Block`}
                colorClass={block.color}
              >
                <IconComponent className="w-4 h-4" />
              </ToolbarButton>
            );
          })}
        </div>

        <ToolbarDivider />

        {/* Clear Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </ToolbarButton>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-3 px-3 py-1 bg-gray-700/30 rounded-lg text-xs">
          <span className="text-gray-500">
            <span className="text-gray-400 font-medium">{wordCount}</span> words
          </span>
          <span className="w-px h-3 bg-gray-600" />
          <span className="text-gray-500">
            <span className="text-gray-400 font-medium">{characterCount}</span>
            {maxLength ? ` / ${maxLength}` : ''} chars
          </span>
        </div>
      </div>

      {/* ================================================================
       * BUBBLE MENU (appears on text selection)
       * ================================================================ */}
      <BubbleMenu 
        editor={editor} 
        tippyOptions={{ duration: 150, placement: 'top' }}
        className="bubble-menu flex items-center gap-0.5 p-1 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-700 mx-0.5" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </ToolbarButton>
      </BubbleMenu>

      {/* ================================================================
       * SLASH COMMAND MENU - Smart positioning
       * ================================================================ */}
      <SlashMenu
        editor={editor}
        isOpen={slashMenuOpen}
        onClose={() => setSlashMenuOpen(false)}
        position={slashMenuPosition}
        insertCallout={insertCallout}
        calloutBlocks={calloutBlocks}
      />

      {/* ================================================================
       * EDITOR CONTENT
       * ================================================================ */}
      <div className="p-4 bg-gray-800/20">
        <EditorContent editor={editor} />
      </div>

      {/* ================================================================
       * FOOTER - Shortcuts & Status
       * ================================================================ */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/60 border-t border-gray-700/30 rounded-b-xl">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            Type 
            <kbd className="px-1.5 py-0.5 rounded bg-gray-700/80 text-amber-400 font-mono text-[11px]">/</kbd>
            for commands
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-gray-700/50 text-gray-400 font-mono text-[10px]">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1 py-0.5 rounded bg-gray-700/50 text-gray-400 font-mono text-[10px]">B</kbd>
            <span className="text-gray-500 ml-1">Bold</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-gray-700/50 text-gray-400 font-mono text-[10px]">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1 py-0.5 rounded bg-gray-700/50 text-gray-400 font-mono text-[10px]">I</kbd>
            <span className="text-gray-500 ml-1">Italic</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
