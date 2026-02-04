import React, { useState, useRef, useEffect } from "react";
import {
  // =========================================================================
  // ICON PICKER OPTIONS — curated for policy categories
  // =========================================================================
  Shield,
  AlertTriangle,
  Scale,
  Lock,
  Users,
  FileText,
  ClipboardCheck,
  ClipboardList,
  Settings,
  Utensils,
  ChefHat,
  Thermometer,
  Clock,
  Briefcase,
  Calendar,
  Building2,
  Award,
  Eye,
  Heart,
  HeartPulse,
  Star,
  BookOpen,
  Bell,
  Wrench,
  GraduationCap,
  // =========================================================================
  // UI ACTION ICONS
  // =========================================================================
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
  X,
  Upload,
  Info,
  ChevronUp,
  Check,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { ImageUploadModal } from "@/shared/components";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { optimizeImage } from "@/utils/imageOptimization";
import type { PolicyCategoryConfig } from "@/types/modules";

// =============================================================================
// CONSTANTS
// =============================================================================

interface PolicyIconOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

/** Curated icon set for policy categories */
const POLICY_ICON_OPTIONS: PolicyIconOption[] = [
  // Safety & Compliance
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "AlertTriangle", label: "Warning", icon: AlertTriangle },
  { value: "Scale", label: "Scale / Legal", icon: Scale },
  { value: "Lock", label: "Security", icon: Lock },
  { value: "Eye", label: "Oversight", icon: Eye },
  // People & Teams
  { value: "Users", label: "People", icon: Users },
  { value: "GraduationCap", label: "Training", icon: GraduationCap },
  { value: "Heart", label: "Wellbeing", icon: Heart },
  { value: "HeartPulse", label: "Health & Safety", icon: HeartPulse },
  { value: "Award", label: "Recognition", icon: Award },
  // Documents & Process
  { value: "FileText", label: "Document", icon: FileText },
  { value: "ClipboardCheck", label: "Checklist", icon: ClipboardCheck },
  { value: "ClipboardList", label: "List", icon: ClipboardList },
  { value: "BookOpen", label: "Handbook", icon: BookOpen },
  // Kitchen & Operations
  { value: "Utensils", label: "Food / Kitchen", icon: Utensils },
  { value: "ChefHat", label: "Chef / Cooking", icon: ChefHat },
  { value: "Thermometer", label: "Temperature", icon: Thermometer },
  // General Purpose
  { value: "Settings", label: "Operations", icon: Settings },
  { value: "Briefcase", label: "Employment", icon: Briefcase },
  { value: "Building2", label: "Facility", icon: Building2 },
  { value: "Clock", label: "Scheduling", icon: Clock },
  { value: "Calendar", label: "Calendar", icon: Calendar },
  { value: "Bell", label: "Notifications", icon: Bell },
  { value: "Star", label: "General", icon: Star },
  { value: "Wrench", label: "Maintenance", icon: Wrench },
];

/** Quick lookup: icon name → component */
const ICON_LOOKUP: Record<string, LucideIcon> = {};
POLICY_ICON_OPTIONS.forEach((opt) => {
  ICON_LOOKUP[opt.value] = opt.icon;
});

/** Helper to safely resolve an icon name to a component */
const getIconComponent = (name: string): LucideIcon =>
  ICON_LOOKUP[name] || FileText;

/** Color options for categories */
const CATEGORY_COLORS = [
  { id: "emerald", label: "Emerald" },
  { id: "blue", label: "Blue" },
  { id: "amber", label: "Amber" },
  { id: "rose", label: "Rose" },
  { id: "indigo", label: "Indigo" },
  { id: "violet", label: "Violet" },
  { id: "cyan", label: "Cyan" },
  { id: "purple", label: "Purple" },
  { id: "teal", label: "Teal" },
  { id: "sky", label: "Sky" },
  { id: "slate", label: "Slate" },
  { id: "gray", label: "Gray" },
];

/**
 * Static Tailwind class map — keeps Tailwind's purge happy.
 * Every color used in the picker MUST have entries here.
 */
const COLOR_CLASSES: Record<
  string,
  { bg: string; text: string; border: string; swatch: string }
> = {
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", swatch: "bg-emerald-500" },
  blue:    { bg: "bg-blue-500/20",    text: "text-blue-400",    border: "border-blue-500/30",    swatch: "bg-blue-500" },
  amber:   { bg: "bg-amber-500/20",   text: "text-amber-400",   border: "border-amber-500/30",   swatch: "bg-amber-500" },
  rose:    { bg: "bg-rose-500/20",    text: "text-rose-400",    border: "border-rose-500/30",    swatch: "bg-rose-500" },
  indigo:  { bg: "bg-indigo-500/20",  text: "text-indigo-400",  border: "border-indigo-500/30",  swatch: "bg-indigo-500" },
  violet:  { bg: "bg-violet-500/20",  text: "text-violet-400",  border: "border-violet-500/30",  swatch: "bg-violet-500" },
  cyan:    { bg: "bg-cyan-500/20",    text: "text-cyan-400",    border: "border-cyan-500/30",    swatch: "bg-cyan-500" },
  purple:  { bg: "bg-purple-500/20",  text: "text-purple-400",  border: "border-purple-500/30",  swatch: "bg-purple-500" },
  teal:    { bg: "bg-teal-500/20",    text: "text-teal-400",    border: "border-teal-500/30",    swatch: "bg-teal-500" },
  sky:     { bg: "bg-sky-500/20",     text: "text-sky-400",     border: "border-sky-500/30",     swatch: "bg-sky-500" },
  slate:   { bg: "bg-slate-500/20",   text: "text-slate-400",   border: "border-slate-500/30",   swatch: "bg-slate-500" },
  gray:    { bg: "bg-gray-500/20",    text: "text-gray-400",    border: "border-gray-500/30",    swatch: "bg-gray-500" },
};

const safeColor = (color: string) => COLOR_CLASSES[color] || COLOR_CLASSES.gray;

// =============================================================================
// TYPES
// =============================================================================

interface CategoryManagerProps {
  categories: PolicyCategoryConfig[];
  onCategoriesChange: (categories: PolicyCategoryConfig[]) => void;
}

interface FormState {
  id: string;
  label: string;
  icon: string;
  color: string;
  imageUrl: string | null;
}

const EMPTY_FORM: FormState = {
  id: "",
  label: "",
  icon: "FileText",
  color: "gray",
  imageUrl: null,
};

// =============================================================================
// COMPONENT
// =============================================================================

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onCategoriesChange,
}) => {
  const { organizationId } = useAuth();
  const { showDiagnostics } = useDiagnostics();
  const formRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isGuidanceExpanded, setIsGuidanceExpanded] = useState(false);

  // Sorted for display
  const sortedCategories = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  // Scroll form into view when it appears
  useEffect(() => {
    if (mode !== "list" && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
  }, [mode]);

  // ---------------------------------------------------------------------------
  // HANDLERS — MODE
  // ---------------------------------------------------------------------------
  const handleAddClick = () => {
    setMode("add");
    setForm({
      id: crypto.randomUUID(),
      label: "",
      icon: "FileText",
      color: "gray",
      imageUrl: null,
    });
  };

  const handleEditClick = (cat: PolicyCategoryConfig) => {
    setMode("edit");
    setForm({
      id: cat.id,
      label: cat.label,
      icon: cat.icon,
      color: cat.color,
      imageUrl: cat.imageUrl || null,
    });
  };

  const handleCancel = () => {
    setMode("list");
    setForm(EMPTY_FORM);
  };

  // ---------------------------------------------------------------------------
  // HANDLERS — SAVE
  // ---------------------------------------------------------------------------
  const handleFormSave = () => {
    const trimmedLabel = form.label.trim();

    if (!trimmedLabel) {
      toast.error("Category name is required");
      return;
    }

    // Duplicate check (case-insensitive, exclude self when editing)
    const isDuplicate = categories.some(
      (cat) =>
        cat.label.toLowerCase() === trimmedLabel.toLowerCase() &&
        cat.id !== form.id
    );
    if (isDuplicate) {
      toast.error("A category with that name already exists");
      return;
    }

    if (mode === "add") {
      const maxSort = categories.reduce(
        (max, c) => Math.max(max, c.sortOrder),
        0
      );
      const newCategory: PolicyCategoryConfig = {
        id: form.id,
        label: trimmedLabel,
        icon: form.icon,
        color: form.color,
        isDefault: false,
        sortOrder: maxSort + 1,
        imageUrl: form.imageUrl,
      };
      onCategoriesChange([...categories, newCategory]);
    } else {
      // Edit — preserve isDefault and sortOrder
      const updated = categories.map((cat) =>
        cat.id === form.id
          ? {
              ...cat,
              label: trimmedLabel,
              icon: form.icon,
              color: form.color,
              imageUrl: form.imageUrl,
            }
          : cat
      );
      onCategoriesChange(updated);
    }

    setMode("list");
    setForm(EMPTY_FORM);
  };

  // ---------------------------------------------------------------------------
  // HANDLERS — DELETE
  // ---------------------------------------------------------------------------
  const handleDelete = (id: string) => {
    onCategoriesChange(categories.filter((cat) => cat.id !== id));
    if (mode === "edit" && form.id === id) {
      handleCancel();
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS — REORDER
  // ---------------------------------------------------------------------------
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const items = [...sortedCategories];
    const prevSort = items[index - 1].sortOrder;
    items[index - 1] = {
      ...items[index - 1],
      sortOrder: items[index].sortOrder,
    };
    items[index] = { ...items[index], sortOrder: prevSort };
    onCategoriesChange(items);
  };

  const handleMoveDown = (index: number) => {
    if (index >= sortedCategories.length - 1) return;
    const items = [...sortedCategories];
    const nextSort = items[index + 1].sortOrder;
    items[index + 1] = {
      ...items[index + 1],
      sortOrder: items[index].sortOrder,
    };
    items[index] = { ...items[index], sortOrder: nextSort };
    onCategoriesChange(items);
  };

  // ---------------------------------------------------------------------------
  // HANDLERS — IMAGE
  // ---------------------------------------------------------------------------
  const handleImageUpload = async (file: File): Promise<string> => {
    if (!organizationId) throw new Error("No organization context");

    // Compress & convert to WebP (512px max — hero areas render 400px+ wide)
    const optimized = await optimizeImage(file, {
      maxSize: 512,
      quality: 0.82,
      outputName: form.id,
    });

    const basePath = `${organizationId}/policy-categories/${form.id}`;

    // Delete all possible extensions (catch orphaned files)
    const extensions = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
    const filesToDelete = extensions.map((ext) => `${basePath}.${ext}`);
    await supabase.storage.from("policy-documents").remove(filesToDelete).catch(() => {});

    // Upload optimized WebP
    const newPath = `${basePath}.webp`;
    const { error } = await supabase.storage
      .from("policy-documents")
      .upload(newPath, optimized, { contentType: "image/webp", upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from("policy-documents").getPublicUrl(newPath);
    const url = `${data.publicUrl}?t=${Date.now()}`;

    // Update form state
    setForm((f) => ({ ...f, imageUrl: url }));
    return url;
  };

  const handleImageRemove = async (): Promise<void> => {
    if (organizationId && form.id) {
      const basePath = `${organizationId}/policy-categories/${form.id}`;
      const extensions = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
      const filesToDelete = extensions.map((ext) => `${basePath}.${ext}`);
      await supabase.storage.from("policy-documents").remove(filesToDelete).catch(() => {});
    }
    setForm((f) => ({ ...f, imageUrl: null }));
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  const PreviewIcon = getIconComponent(form.icon);
  const previewColors = safeColor(form.color);

  return (
    <div className="space-y-4">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/HRSettings/components/CategoryManager.tsx
        </div>
      )}

      {/* ================================================================ */}
      {/* CATEGORY CARD HEADER                                             */}
      {/* ================================================================ */}
      <div className="card overflow-hidden">
        {/* Card Header */}
        <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-white">
              Policy Categories
            </h3>
            <p className="text-xs text-gray-500">
              Organize your policies into groups your team can browse
            </p>
          </div>
          <button
            onClick={handleAddClick}
            disabled={mode !== "list"}
            className={`btn-primary text-sm ${mode !== "list" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Expandable Guidance */}
        <div
          className={`expandable-info-section ${isGuidanceExpanded ? "expanded" : ""}`}
        >
          <button
            onClick={() => setIsGuidanceExpanded(!isGuidanceExpanded)}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">
                How categories work
              </span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-1.5 text-xs text-gray-500">
              <p>
                These are the groups your team sees when browsing policies. Add a
                cover image to make each one easy to spot at a glance.
              </p>
              <p>
                We've started you with the categories most restaurants use —
                rename them, reorder them, remove what doesn't fit, add your own.
                Make it yours.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BASEBALL CARD GRID                                           */}
        {/* ============================================================ */}
        {sortedCategories.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400 mb-1">No categories yet</p>
            <p className="text-xs text-gray-500">
              Add your first to start organizing your policy library.
            </p>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sortedCategories.map((cat, index) => {
                const IconComp = getIconComponent(cat.icon);
                const colors = safeColor(cat.color);
                const isBeingEdited = mode === "edit" && form.id === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`group relative bg-gray-800/50 backdrop-blur-sm rounded-xl border overflow-hidden transition-all duration-200 hover:scale-[1.02] ${
                      isBeingEdited
                        ? "border-primary-500/50 ring-1 ring-primary-500/30 scale-[1.02]"
                        : "border-gray-700/50 hover:border-gray-600"
                    }`}
                  >
                    {/* -------------------------------------------------- */}
                    {/* HERO: Cover Image or Icon Fallback                  */}
                    {/* -------------------------------------------------- */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {cat.imageUrl ? (
                        <img
                          src={cat.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* Gradient fallback with large centered icon */
                        <div
                          className={`w-full h-full ${colors.bg} flex items-center justify-center`}
                        >
                          <IconComp
                            className={`w-10 h-10 ${colors.text} opacity-40`}
                          />
                        </div>
                      )}

                      {/* Sort order badge — top-left */}
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-md bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-[10px] font-medium text-gray-300 tabular-nums">
                          {index + 1}
                        </span>
                      </div>

                      {/* Icon badge — top-right (always visible, identifies category at a glance) */}
                      <div
                        className={`absolute top-2 right-2 w-7 h-7 rounded-lg ${colors.bg} border ${colors.border} backdrop-blur-sm flex items-center justify-center`}
                      >
                        <IconComp className={`w-3.5 h-3.5 ${colors.text}`} />
                      </div>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* BODY: Name + Badges                                 */}
                    {/* -------------------------------------------------- */}
                    <div className="px-3 pt-2.5 pb-2">
                      <p className="text-sm font-medium text-white truncate">
                        {cat.label}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {/* Color dot */}
                        <div
                          className={`w-2 h-2 rounded-full ${colors.swatch}`}
                        />
                        {cat.isDefault ? (
                          <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                            Default
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-600 uppercase tracking-wide">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* FOOTER: Reorder + Actions — round badge buttons  */}
                    {/* -------------------------------------------------- */}
                    <div className="px-2.5 pb-2.5 pt-1.5 border-t border-gray-700/30 flex items-center justify-between">
                      {/* Reorder arrows */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            index === 0
                              ? "bg-gray-800/30 text-gray-700 cursor-not-allowed"
                              : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white"
                          }`}
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === sortedCategories.length - 1}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            index === sortedCategories.length - 1
                              ? "bg-gray-800/30 text-gray-700 cursor-not-allowed"
                              : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white"
                          }`}
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Edit + Delete */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditClick(cat)}
                          disabled={mode !== "list"}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            mode !== "list"
                              ? "bg-gray-800/30 text-gray-700 cursor-not-allowed"
                              : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white"
                          }`}
                          title="Edit category"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <TwoStageButton
                          onConfirm={() => handleDelete(cat.id)}
                          icon={Trash2}
                          confirmText="Delete?"
                          variant="danger"
                          size="md"
                          disabled={mode !== "list"}
                          className="!rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* ADD / EDIT FORM CARD                                             */}
      {/* ================================================================ */}
      {mode !== "list" && (
        <div
          ref={formRef}
          className="card overflow-hidden border border-primary-500/30"
        >
          {/* Form Header */}
          <div className="p-4 flex items-center justify-between border-b border-gray-700/50">
            <h3 className="text-base font-medium text-white">
              {mode === "add"
                ? "New Category"
                : `Editing: ${form.label || "..."}`}
            </h3>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* -------------------------------------------------------------- */}
            {/* LABEL                                                           */}
            {/* -------------------------------------------------------------- */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Category Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="e.g., Workplace Safety, Kitchen Protocols"
                className="input w-full max-w-sm"
                autoFocus
              />
            </div>

            {/* -------------------------------------------------------------- */}
            {/* ICON PICKER                                                     */}
            {/* -------------------------------------------------------------- */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Icon</label>
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
                {POLICY_ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = form.icon === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setForm((f) => ({ ...f, icon: opt.value }))
                      }
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-primary-500/30 ring-2 ring-primary-500/50 text-primary-300"
                          : "bg-gray-800/50 text-gray-500 hover:bg-gray-700/50 hover:text-gray-300"
                      }`}
                      title={opt.label}
                      type="button"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* COLOR PICKER                                                    */}
            {/* -------------------------------------------------------------- */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Color</label>
              <div className="flex flex-wrap gap-2.5">
                {CATEGORY_COLORS.map((color) => {
                  const isSelected = form.color === color.id;
                  const classes = COLOR_CLASSES[color.id];
                  return (
                    <button
                      key={color.id}
                      onClick={() =>
                        setForm((f) => ({ ...f, color: color.id }))
                      }
                      className={`w-7 h-7 rounded-full transition-all ${classes.swatch} ${
                        isSelected
                          ? "ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-110"
                          : "opacity-60 hover:opacity-100 hover:scale-105"
                      }`}
                      title={color.label}
                      type="button"
                    />
                  );
                })}
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* COVER IMAGE                                                     */}
            {/* -------------------------------------------------------------- */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Cover Image{" "}
                <span className="text-gray-600">
                  (optional — gives your cards personality)
                </span>
              </label>
              <div className="flex items-center gap-4">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="w-20 h-14 rounded-lg object-cover border border-gray-700"
                  />
                ) : (
                  <div className="w-20 h-14 rounded-lg bg-gray-800/50 border border-dashed border-gray-600 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <button
                    onClick={() => setIsImageModalOpen(true)}
                    className="btn-ghost text-sm"
                    type="button"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {form.imageUrl ? "Change Image" : "Upload Image"}
                    </span>
                  </button>
                  {form.imageUrl && (
                    <button
                      onClick={() =>
                        setForm((f) => ({ ...f, imageUrl: null }))
                      }
                      className="block text-xs text-gray-500 hover:text-rose-400 transition-colors"
                      type="button"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* LIVE CARD PREVIEW                                               */}
            {/* -------------------------------------------------------------- */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Card Preview
              </label>
              <div className="inline-block w-48">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                  {/* Mini hero */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {form.imageUrl ? (
                      <img
                        src={form.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full ${previewColors.bg} flex items-center justify-center`}
                      >
                        <PreviewIcon
                          className={`w-8 h-8 ${previewColors.text} opacity-40`}
                        />
                      </div>
                    )}
                    <div
                      className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-md ${previewColors.bg} border ${previewColors.border} backdrop-blur-sm flex items-center justify-center`}
                    >
                      <PreviewIcon
                        className={`w-3 h-3 ${previewColors.text}`}
                      />
                    </div>
                  </div>
                  {/* Mini body */}
                  <div className="px-2.5 py-2">
                    <p className="text-xs font-medium text-white truncate">
                      {form.label || "Category Name"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${previewColors.swatch}`}
                      />
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">
                        Preview
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* ACTIONS                                                         */}
            {/* -------------------------------------------------------------- */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-700/30">
              <button onClick={handleCancel} className="btn-ghost" type="button">
                Cancel
              </button>
              <button
                onClick={handleFormSave}
                className="btn-primary"
                type="button"
              >
                <Check className="w-4 h-4" />
                <span>
                  {mode === "add" ? "Add Category" : "Save Changes"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* IMAGE UPLOAD MODAL                                               */}
      {/* ================================================================ */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onUpload={handleImageUpload}
        onRemove={form.imageUrl ? handleImageRemove : undefined}
        currentImageUrl={form.imageUrl || undefined}
        title="Category Cover Image"
        subtitle={form.label || "New Category"}
        aspectHint="16:9 or square works well for policy cards"
      />
    </div>
  );
};
