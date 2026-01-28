import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LibraryBig,
  ArrowLeft,
  Settings,
  FileSpreadsheet,
  Printer,
  Globe,
  AlertTriangle,
  Info,
  ChevronUp,
  Wrench,
  Save,
  RotateCcw,
  Clock,
  Sparkles,
  Scale,
  Eye,
  EyeOff,
  Type,
  Plus,
  Trash2,
  GripVertical,
  Lock,
  Lightbulb,
  AlertOctagon,
  Thermometer,
  RotateCcw as FifoIcon,
  ShieldAlert,
  Timer,
  Utensils,
  Flame,
  Snowflake,
  CheckCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SECURITY_LEVELS } from "@/config/security";
import { useRecipeConfig } from "@/features/recipes/hooks/useRecipeConfig";
import toast from "react-hot-toast";

// =============================================================================
// RECIPE SETTINGS - L5 Module Configuration
// =============================================================================
// Module configuration for Recipe Manager. This is the "set it once, revisit
// when needed" screen — separate from daily recipe workflow.
// =============================================================================

type TabId = "general" | "editor" | "import" | "print" | "embed" | "allergens";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const TABS: Tab[] = [
  {
    id: "general",
    label: "General",
    icon: Settings,
    color: "primary",
    description: "Default values and workflow rules",
  },
  {
    id: "editor",
    label: "Editor",
    icon: Type,
    color: "amber",
    description: "Instruction blocks and rich text settings",
  },
  {
    id: "import",
    label: "Import",
    icon: FileSpreadsheet,
    color: "green",
    description: "Excel templates and column mappings",
  },
  {
    id: "print",
    label: "Print Templates",
    icon: Printer,
    color: "purple",
    description: "Recipe card layouts for kitchen and training",
  },
  {
    id: "embed",
    label: "Website Embed",
    icon: Globe,
    color: "cyan",
    description: "iframe exports for your website",
  },
  {
    id: "allergens",
    label: "Allergen Portal",
    icon: AlertTriangle,
    color: "rose",
    description: "Customer-facing allergen information",
  },
];

// =============================================================================
// INSTRUCTION BLOCK TYPES & DEFAULTS
// =============================================================================

interface InstructionBlockTemplate {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
}

// Lucide icon mapping for the selector
const AVAILABLE_ICONS: { name: string; icon: React.ElementType }[] = [
  { name: "Lightbulb", icon: Lightbulb },
  { name: "AlertTriangle", icon: AlertTriangle },
  { name: "AlertOctagon", icon: AlertOctagon },
  { name: "Info", icon: Info },
  { name: "RotateCcw", icon: FifoIcon },
  { name: "Thermometer", icon: Thermometer },
  { name: "ShieldAlert", icon: ShieldAlert },
  { name: "Timer", icon: Timer },
  { name: "Utensils", icon: Utensils },
  { name: "Flame", icon: Flame },
  { name: "Snowflake", icon: Snowflake },
  { name: "CheckCircle", icon: CheckCircle },
  { name: "Eye", icon: Eye },
  { name: "Clock", icon: Clock },
];

const AVAILABLE_COLORS = [
  { name: "emerald", label: "Emerald", class: "bg-emerald-500", text: "text-emerald-400" },
  { name: "amber", label: "Amber", class: "bg-amber-500", text: "text-amber-400" },
  { name: "rose", label: "Rose", class: "bg-rose-500", text: "text-rose-400" },
  { name: "blue", label: "Blue", class: "bg-blue-500", text: "text-blue-400" },
  { name: "primary", label: "Primary", class: "bg-primary-500", text: "text-primary-400" },
  { name: "cyan", label: "Cyan", class: "bg-cyan-500", text: "text-cyan-400" },
  { name: "orange", label: "Orange", class: "bg-orange-500", text: "text-orange-400" },
  { name: "purple", label: "Purple", class: "bg-purple-500", text: "text-purple-400" },
  { name: "lime", label: "Lime", class: "bg-lime-500", text: "text-lime-400" },
  { name: "pink", label: "Pink", class: "bg-pink-500", text: "text-pink-400" },
  { name: "teal", label: "Teal", class: "bg-teal-500", text: "text-teal-400" },
];

// ChefLife sensible defaults - these are system blocks
const DEFAULT_INSTRUCTION_BLOCKS: InstructionBlockTemplate[] = [
  {
    id: "tip",
    type: "tip",
    label: "Pro Tip",
    description: "Best practices, shortcuts, chef knowledge",
    icon: "Lightbulb",
    color: "emerald",
    isSystem: true,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: "caution",
    type: "caution",
    label: "Caution",
    description: "Warnings, things to watch for",
    icon: "AlertTriangle",
    color: "amber",
    isSystem: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "critical",
    type: "critical",
    label: "Critical",
    description: "Safety critical, must-do items",
    icon: "AlertOctagon",
    color: "rose",
    isSystem: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "info",
    type: "info",
    label: "Info",
    description: "Additional context, FYI notes",
    icon: "Info",
    color: "blue",
    isSystem: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "fifo",
    type: "fifo",
    label: "FIFO Reminder",
    description: "First In, First Out stock rotation",
    icon: "RotateCcw",
    color: "cyan",
    isSystem: false,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: "temperature",
    type: "temperature",
    label: "Temperature",
    description: "Temperature-specific notes and targets",
    icon: "Thermometer",
    color: "orange",
    isSystem: false,
    isActive: true,
    sortOrder: 5,
  },
];

// =============================================================================
// ICON COMPONENT HELPER
// =============================================================================

const IconDisplay: React.FC<{ iconName: string; className?: string }> = ({ iconName, className }) => {
  const iconConfig = AVAILABLE_ICONS.find(i => i.name === iconName);
  if (!iconConfig) return <Info className={className} />;
  const IconComponent = iconConfig.icon;
  return <IconComponent className={className} />;
};

// =============================================================================
// INSTRUCTION BLOCK EDITOR MODAL
// =============================================================================

interface BlockEditorModalProps {
  block: InstructionBlockTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: InstructionBlockTemplate) => void;
  existingTypes: string[];
}

const BlockEditorModal: React.FC<BlockEditorModalProps> = ({
  block,
  isOpen,
  onClose,
  onSave,
  existingTypes,
}) => {
  const [formData, setFormData] = useState<Partial<InstructionBlockTemplate>>({
    type: "",
    label: "",
    description: "",
    icon: "Lightbulb",
    color: "emerald",
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (block) {
      setFormData({ ...block });
    } else {
      setFormData({
        type: "",
        label: "",
        description: "",
        icon: "Lightbulb",
        color: "emerald",
        isActive: true,
      });
    }
    setErrors({});
  }, [block, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.label?.trim()) {
      newErrors.label = "Label is required";
    }
    
    if (!formData.type?.trim()) {
      newErrors.type = "Type key is required";
    } else if (!/^[a-z_]+$/.test(formData.type)) {
      newErrors.type = "Type must be lowercase letters and underscores only";
    } else if (!block && existingTypes.includes(formData.type)) {
      newErrors.type = "This type already exists";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      id: block?.id || formData.type || "",
      type: formData.type || "",
      label: formData.label || "",
      description: formData.description || "",
      icon: formData.icon || "Lightbulb",
      color: formData.color || "emerald",
      isSystem: block?.isSystem || false,
      isActive: formData.isActive ?? true,
      sortOrder: block?.sortOrder ?? 999,
    });
    onClose();
  };

  if (!isOpen) return null;

  const colorConfig = AVAILABLE_COLORS.find(c => c.name === formData.color) || AVAILABLE_COLORS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-[#1a1f2b] rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
          <h3 className="text-lg font-semibold text-white">
            {block ? "Edit Instruction Block" : "Add Instruction Block"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Preview Card */}
          <div className={`rounded-lg border-l-4 p-4 bg-${formData.color}-950/40 border-l-${formData.color}-500`}
            style={{
              backgroundColor: `rgb(var(--color-${formData.color}-950) / 0.4)`,
              borderLeftColor: `rgb(var(--color-${formData.color}-500))`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${colorConfig.text}`}
                style={{ backgroundColor: `rgb(var(--color-${formData.color}-500) / 0.2)` }}
              >
                <IconDisplay iconName={formData.icon || "Lightbulb"} className="w-3.5 h-3.5" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${colorConfig.text}`}>
                {formData.label || "Block Label"}
              </span>
            </div>
            <p className="text-sm text-gray-300">
              {formData.description || "Block description will appear here..."}
            </p>
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Label <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.label || ""}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="e.g., Pro Tip, Safety Alert"
              className="input w-full"
              disabled={block?.isSystem}
            />
            {errors.label && <p className="text-xs text-rose-400 mt-1">{errors.label}</p>}
          </div>

          {/* Type Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Type Key <span className="text-rose-400">*</span>
              <span className="text-gray-500 font-normal ml-2">(internal identifier)</span>
            </label>
            <input
              type="text"
              value={formData.type || ""}
              onChange={(e) => setFormData({ ...formData, type: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })}
              placeholder="e.g., pro_tip, safety_alert"
              className="input w-full font-mono"
              disabled={!!block}
            />
            {errors.type && <p className="text-xs text-rose-400 mt-1">{errors.type}</p>}
            {!block && (
              <p className="text-xs text-gray-500 mt-1">
                Lowercase letters and underscores only. Cannot be changed after creation.
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description shown in slash menu"
              className="input w-full"
            />
          </div>

          {/* Icon & Color Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Icon Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Icon</label>
              <div className="grid grid-cols-7 gap-1 p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                {AVAILABLE_ICONS.map((iconOption) => {
                  const IconComp = iconOption.icon;
                  const isSelected = formData.icon === iconOption.name;
                  return (
                    <button
                      key={iconOption.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconOption.name })}
                      className={`p-2 rounded transition-all ${
                        isSelected
                          ? `bg-${formData.color}-500/30 ${colorConfig.text} ring-1 ring-${formData.color}-500/50`
                          : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                      }`}
                      title={iconOption.name}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Color</label>
              <div className="grid grid-cols-5 gap-1 p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                {AVAILABLE_COLORS.map((colorOption) => {
                  const isSelected = formData.color === colorOption.name;
                  return (
                    <button
                      key={colorOption.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: colorOption.name })}
                      className={`w-8 h-8 rounded-lg transition-all ${colorOption.class} ${
                        isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800" : "opacity-60 hover:opacity-100"
                      }`}
                      title={colorOption.label}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center gap-3">
              {formData.isActive ? (
                <Eye className="w-5 h-5 text-emerald-400" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <p className="text-sm font-medium text-white">Active</p>
                <p className="text-xs text-gray-500">Show this block in the editor toolbar</p>
              </div>
            </div>
            <label className="toggle-switch emerald">
              <input
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
              />
              <span className="toggle-switch-track" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700/50">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            <Save className="w-4 h-4 mr-1.5" />
            {block ? "Save Changes" : "Add Block"}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// INSTRUCTION BLOCKS SECTION (EDITOR TAB)
// =============================================================================

const InstructionBlocksSection: React.FC = () => {
  const { config, updateConfig } = useRecipeConfig();
  const [blocks, setBlocks] = useState<InstructionBlockTemplate[]>([]);
  const [editingBlock, setEditingBlock] = useState<InstructionBlockTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from config or defaults
  useEffect(() => {
    const savedBlocks = config.instructionBlocks as InstructionBlockTemplate[] | undefined;
    if (savedBlocks && savedBlocks.length > 0) {
      setBlocks(savedBlocks);
    } else {
      setBlocks(DEFAULT_INSTRUCTION_BLOCKS);
    }
  }, [config.instructionBlocks]);

  const handleToggleActive = (blockId: string) => {
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, isActive: !b.isActive } : b
    ));
    setHasChanges(true);
  };

  const handleEditBlock = (block: InstructionBlockTemplate) => {
    setEditingBlock(block);
    setIsModalOpen(true);
  };

  const handleAddBlock = () => {
    setEditingBlock(null);
    setIsModalOpen(true);
  };

  const handleSaveBlock = (block: InstructionBlockTemplate) => {
    setBlocks(prev => {
      const existingIndex = prev.findIndex(b => b.id === block.id);
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = block;
        return updated;
      } else {
        // Add new
        return [...prev, { ...block, sortOrder: prev.length }];
      }
    });
    setHasChanges(true);
  };

  const handleDeleteBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (block?.isSystem) {
      toast.error("System blocks cannot be deleted");
      return;
    }
    if (confirm(`Delete "${block?.label}" block? This cannot be undone.`)) {
      setBlocks(prev => prev.filter(b => b.id !== blockId));
      setHasChanges(true);
      toast.success("Block deleted");
    }
  };

  const handleSave = () => {
    updateConfig({ instructionBlocks: blocks });
    setHasChanges(false);
    toast.success("Instruction blocks saved");
  };

  const handleReset = () => {
    if (confirm("Reset all instruction blocks to ChefLife defaults? Custom blocks will be removed.")) {
      setBlocks(DEFAULT_INSTRUCTION_BLOCKS);
      setHasChanges(true);
      toast.success("Reset to defaults - click Save to apply");
    }
  };

  const systemBlocks = blocks.filter(b => b.isSystem);
  const customBlocks = blocks.filter(b => !b.isSystem);
  const existingTypes = blocks.map(b => b.type);

  return (
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-700/50">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Type className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white">Instruction Blocks</h3>
          <p className="text-sm text-gray-400">
            Customize the callout blocks available in the recipe instruction editor
          </p>
        </div>
        <button onClick={handleAddBlock} className="btn-primary text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Block
        </button>
      </div>

      {/* System Blocks */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-400">System Blocks</h4>
          <span className="text-xs text-gray-600">(labels locked, can toggle visibility)</span>
        </div>
        <div className="space-y-2">
          {systemBlocks.map((block) => {
            const colorConfig = AVAILABLE_COLORS.find(c => c.name === block.color) || AVAILABLE_COLORS[0];
            return (
              <div
                key={block.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  block.isActive
                    ? "bg-gray-800/50 border-gray-700/50"
                    : "bg-gray-900/30 border-gray-800/30 opacity-50"
                }`}
              >
                {/* Icon & Label */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorConfig.text}`}
                  style={{ backgroundColor: `color-mix(in srgb, currentColor 15%, transparent)` }}
                >
                  <IconDisplay iconName={block.icon} className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{block.label}</span>
                    <span className={`w-2 h-2 rounded-full ${colorConfig.class}`} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{block.description}</p>
                </div>

                {/* Toggle */}
                <label 
                  className="toggle-switch emerald" 
                  title={block.isActive ? "Visible in editor" : "Hidden from editor"}
                >
                  <input
                    type="checkbox"
                    checked={block.isActive}
                    onChange={() => handleToggleActive(block.id)}
                  />
                  <span className="toggle-switch-track" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Blocks */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-medium text-gray-400">Custom Blocks</h4>
          <span className="text-xs text-gray-600">(fully customizable)</span>
        </div>
        
        {customBlocks.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700/50">
            <Plus className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No custom blocks yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Add blocks specific to your kitchen's needs
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customBlocks.map((block) => {
              const colorConfig = AVAILABLE_COLORS.find(c => c.name === block.color) || AVAILABLE_COLORS[0];
              return (
                <div
                  key={block.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    block.isActive
                      ? "bg-gray-800/50 border-gray-700/50"
                      : "bg-gray-900/30 border-gray-800/30 opacity-50"
                  }`}
                >
                  {/* Drag Handle (future) */}
                  <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />

                  {/* Icon & Label */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorConfig.text}`}
                    style={{ backgroundColor: `color-mix(in srgb, currentColor 15%, transparent)` }}
                  >
                    <IconDisplay iconName={block.icon} className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{block.label}</span>
                      <span className={`w-2 h-2 rounded-full ${colorConfig.class}`} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">{block.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditBlock(block)}
                      className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title="Edit block"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-2 hover:bg-rose-500/20 rounded-lg text-gray-400 hover:text-rose-400 transition-colors"
                      title="Delete block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <label className="toggle-switch emerald">
                      <input
                        type="checkbox"
                        checked={block.isActive}
                        onChange={() => handleToggleActive(block.id)}
                      />
                      <span className="toggle-switch-track" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
        <button onClick={handleReset} className="btn-ghost text-sm">
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`btn-primary text-sm ${!hasChanges ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Save className="w-4 h-4 mr-1.5" />
          Save Changes
        </button>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            Instruction blocks appear in the rich text editor when writing recipe steps. 
            Type <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-amber-400 font-mono">/</kbd> in 
            the editor to insert a block. Changes apply to all recipes.
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      <BlockEditorModal
        block={editingBlock}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBlock}
        existingTypes={existingTypes}
      />
    </div>
  );
};

// =============================================================================
// GENERAL SETTINGS SECTION (LIVE)
// =============================================================================

const GeneralSettingsSection: React.FC = () => {
  const { config, updateConfig, resetConfig, DEFAULT_CONFIG } = useRecipeConfig();
  const [localUpdatedDays, setLocalUpdatedDays] = useState(config.updatedBadgeDays);
  const [localNewDays, setLocalNewDays] = useState(config.newBadgeDays);
  
  // Sourcing Instructions local state
  const [sourcingEnabled, setSourcingEnabled] = useState(config.sourcingInstructions?.enabled ?? true);
  const [sourcingTitle, setSourcingTitle] = useState(config.sourcingInstructions?.title ?? DEFAULT_CONFIG.sourcingInstructions.title);
  const [sourcingBody, setSourcingBody] = useState(config.sourcingInstructions?.body ?? DEFAULT_CONFIG.sourcingInstructions.body);
  const [sourcingFooter, setSourcingFooter] = useState(config.sourcingInstructions?.footer ?? DEFAULT_CONFIG.sourcingInstructions.footer);
  
  const hasChanges = 
    localUpdatedDays !== config.updatedBadgeDays || 
    localNewDays !== config.newBadgeDays ||
    sourcingEnabled !== (config.sourcingInstructions?.enabled ?? true) ||
    sourcingTitle !== (config.sourcingInstructions?.title ?? DEFAULT_CONFIG.sourcingInstructions.title) ||
    sourcingBody !== (config.sourcingInstructions?.body ?? DEFAULT_CONFIG.sourcingInstructions.body) ||
    sourcingFooter !== (config.sourcingInstructions?.footer ?? DEFAULT_CONFIG.sourcingInstructions.footer);

  const handleSave = () => {
    updateConfig({
      updatedBadgeDays: localUpdatedDays,
      newBadgeDays: localNewDays,
      sourcingInstructions: {
        enabled: sourcingEnabled,
        title: sourcingTitle,
        body: sourcingBody,
        footer: sourcingFooter,
      },
    });
    toast.success('Recipe settings saved');
  };

  const handleReset = () => {
    setLocalUpdatedDays(DEFAULT_CONFIG.updatedBadgeDays);
    setLocalNewDays(DEFAULT_CONFIG.newBadgeDays);
    setSourcingEnabled(DEFAULT_CONFIG.sourcingInstructions.enabled);
    setSourcingTitle(DEFAULT_CONFIG.sourcingInstructions.title);
    setSourcingBody(DEFAULT_CONFIG.sourcingInstructions.body);
    setSourcingFooter(DEFAULT_CONFIG.sourcingInstructions.footer);
    resetConfig();
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-700/50">
        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
          <Settings className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">General Settings</h3>
          <p className="text-sm text-gray-400">Configure recipe display and workflow defaults</p>
        </div>
      </div>

      {/* Badge Duration Settings */}
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Recipe Badge Display
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Control how long NEW and UPDATED badges appear on recipe cards in the Recipe Library.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NEW Badge Duration */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  <Sparkles className="w-3 h-3" />
                  NEW
                </span>
                <span className="text-sm text-gray-400">badge duration</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={localNewDays}
                  onChange={(e) => setLocalNewDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                  className="w-20 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
                <span className="text-sm text-gray-400">days after creation</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Recipes created within this window show a NEW badge.
              </p>
            </div>

            {/* UPDATED Badge Duration */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Clock className="w-3 h-3" />
                  UPDATED
                </span>
                <span className="text-sm text-gray-400">badge duration</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={localUpdatedDays}
                  onChange={(e) => setLocalUpdatedDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                  className="w-20 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
                <span className="text-sm text-gray-400">days after modification</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Recipes modified within this window show an UPDATED badge.
              </p>
            </div>
          </div>
        </div>

        {/* Sourcing Instructions */}
        <div id="sourcing" className="pt-6 border-t border-gray-700/50">
          <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            Sourcing Instructions
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Customize the guidance shown to cooks on the Ingredients tab. This sets the tone for your kitchen's mise en place culture.
          </p>
          
          {/* Enable/Disable Toggle */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {sourcingEnabled ? (
                  <Eye className="w-5 h-5 text-emerald-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">Show Sourcing Section</p>
                  <p className="text-xs text-gray-500">Display sourcing instructions on the Ingredients tab</p>
                </div>
              </div>
              <label className="toggle-switch emerald">
                <input
                  type="checkbox"
                  checked={sourcingEnabled}
                  onChange={() => setSourcingEnabled(!sourcingEnabled)}
                />
                <span className="toggle-switch-track" />
              </label>
            </div>
          </div>

          {/* Sourcing Fields - Only show when enabled */}
          {sourcingEnabled && (
            <div className="space-y-4">
              {/* Title */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={sourcingTitle}
                  onChange={(e) => setSourcingTitle(e.target.value)}
                  placeholder="e.g., Source First, Then Start"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-gray-600 mt-2">
                  The headline shown in the expandable info section
                </p>
              </div>

              {/* Body */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Instructions
                </label>
                <textarea
                  value={sourcingBody}
                  onChange={(e) => setSourcingBody(e.target.value)}
                  rows={4}
                  placeholder="Your kitchen's sourcing philosophy and guidance..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-600 mt-2">
                  The main body text. Use line breaks for paragraphs. This is where you communicate your kitchen's culture.
                </p>
              </div>

              {/* Footer */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Footer Note
                </label>
                <input
                  type="text"
                  value={sourcingFooter}
                  onChange={(e) => setSourcingFooter(e.target.value)}
                  placeholder="e.g., Check with your lead if unsure."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-gray-600 mt-2">
                  A brief note at the bottom — great for directing questions to the right person
                </p>
              </div>

              {/* Preview */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Preview</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">{sourcingTitle || '(No title)'}</p>
                  <p className="text-sm text-gray-400 whitespace-pre-line">{sourcingBody || '(No instructions)'}</p>
                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-700/50">
                    {sourcingFooter || '(No footer)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-700/50">
          <button
            onClick={handleReset}
            className="btn-ghost text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`btn-primary text-sm ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Planned Features */}
      <PlannedFeaturesAccordion 
        features={[
          "Default station assignment for new recipes",
          "Default storage area dropdown values",
          "Default yield unit (portion, batch, pan, etc.)",
          "Default recipe status (draft requiring approval, or approved immediately)",
          "Cost calculation method (ingredients only, +labor, +overhead)",
          "Version control settings (auto-increment on save, require change notes)",
          "Who can edit approved recipes (permissions model)",
        ]}
        notes="These defaults reduce data entry time and ensure consistency across your recipe library."
      />
    </div>
  );
};

// =============================================================================
// PLANNED FEATURES ACCORDION
// =============================================================================

interface PlannedFeaturesAccordionProps {
  features: string[];
  notes?: string;
}

const PlannedFeaturesAccordion: React.FC<PlannedFeaturesAccordionProps> = ({ features, notes }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`expandable-info-section mt-6 ${isExpanded ? 'expanded' : ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="expandable-info-header w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300">More Features Coming Soon</span>
        </div>
        <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
      </button>
      <div className="expandable-info-content">
        <div className="p-4 pt-2 space-y-3">
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="text-gray-600 mt-1">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          {notes && (
            <p className="text-xs text-gray-500 pt-3 border-t border-gray-700/50">
              💡 {notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// PLACEHOLDER COMPONENT (for other tabs)
// =============================================================================

interface PlaceholderSectionProps {
  tab: Tab;
  features: string[];
  notes?: string;
}

const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({ tab, features, notes }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = tab.icon;
  
  const bgColorMap: Record<string, string> = {
    primary: "bg-primary-500/20",
    green: "bg-green-500/20",
    amber: "bg-amber-500/20",
    cyan: "bg-cyan-500/20",
    rose: "bg-rose-500/20",
    purple: "bg-purple-500/20",
  };
  
  const textColorMap: Record<string, string> = {
    primary: "text-primary-400",
    green: "text-green-400",
    amber: "text-amber-400",
    cyan: "text-cyan-400",
    rose: "text-rose-400",
    purple: "text-purple-400",
  };

  return (
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/50">
        <div className={`w-10 h-10 rounded-lg ${bgColorMap[tab.color]} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${textColorMap[tab.color]}`} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{tab.label}</h3>
          <p className="text-sm text-gray-400">{tab.description}</p>
        </div>
      </div>

      {/* Under Construction Notice */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-4">
        <div className="flex items-start gap-3">
          <Wrench className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300 font-medium">Coming Soon</p>
            <p className="text-sm text-gray-500 mt-1">
              This section is planned but not yet implemented. Below is the feature roadmap.
            </p>
          </div>
        </div>
      </div>

      {/* Planned Features */}
      <div className={`expandable-info-section ${isExpanded ? 'expanded' : ''}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300">Planned Features</span>
          </div>
          <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2 space-y-3">
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="text-gray-600 mt-1">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {notes && (
              <p className="text-xs text-gray-500 pt-3 border-t border-gray-700/50">
                💡 {notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const RecipeSettings: React.FC = () => {
  const navigate = useNavigate();
  const { securityLevel } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  
  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;
  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];

  // Feature lists for placeholder tabs
  const tabFeatures: Record<TabId, { features: string[]; notes?: string }> = {
    general: { features: [], notes: "" },
    editor: { features: [], notes: "" }, // Handled by InstructionBlocksSection
    import: {
      features: [
        "Excel template configuration (your existing recipe spreadsheets)",
        "Column mapping interface (map your columns to ChefLife fields)",
        "Default values for imported recipes (station, status, etc.)",
        "Duplicate detection rules (match by name, code, or both)",
        "Import preview and validation before committing",
        "Batch import history and audit trail",
      ],
      notes: "Designed to migrate your existing Excel recipe library into ChefLife with minimal rework.",
    },
    print: {
      features: [
        "Kitchen Copy template (production-focused, large text, steps only)",
        "Training Copy template (full details, photos, quality standards)",
        "Costing Copy template (ingredients, costs, margins - for management)",
        "Custom template builder (drag-and-drop field selection)",
        "Branding options (logo, colors, header/footer)",
        "Portion scaling on print (print for 2x batch, etc.)",
        "QR code linking back to digital recipe",
      ],
      notes: "Different audiences need different views of the same recipe. A line cook doesn't need costing data.",
    },
    embed: {
      features: [
        "Embed code generator (iframe snippet for your website)",
        "Recipe browser embed (searchable list of public recipes)",
        "Single recipe embed (individual recipe cards)",
        "Styling options (match your website's look and feel)",
        "Which recipes to expose (all, tagged, or hand-picked)",
        "Responsive design for mobile viewing",
        "Analytics on embed views (how many customers viewed)",
      ],
      notes: "Let customers explore your recipes without leaving your website. Great for transparency and marketing.",
    },
    allergens: {
      features: [
        "Customer-facing allergen portal configuration",
        "Which allergens to display (Big 9, Big 14, or custom list)",
        "Menu item → allergen linking display",
        "Disclaimer text customization",
        "\"May contain\" vs \"Contains\" distinction",
        "Cross-contact risk disclosure",
        "Embed code for allergen portal on your website",
        "QR code generation for table tents",
      ],
      notes: "Protect your guests and your business. Clear allergen communication is essential for food safety.",
    },
  };

  return (
    <div className="space-y-6">
      {/* Diagnostic Path - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/RecipeSettings/index.tsx
        </div>
      )}

      {/* L5 Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/modules')}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Back to Feature Modules"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <LibraryBig className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Recipe Manager Settings
              </h1>
              <p className="text-gray-400 text-sm">
                Configure defaults, imports, and exports
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab ${tab.color} ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "general" ? (
        <GeneralSettingsSection />
      ) : activeTab === "editor" ? (
        <InstructionBlocksSection />
      ) : (
        <PlaceholderSection 
          tab={currentTab} 
          features={tabFeatures[activeTab].features}
          notes={tabFeatures[activeTab].notes}
        />
      )}

      {/* Architecture Note */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-400">
              <strong className="text-gray-300">Architecture Note:</strong> This settings screen is separate from 
              Recipe Manager's daily workflow. Configure these options once, then revisit when your needs change. 
              Settings will persist to <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">organization.modules.recipes.config</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeSettings;
