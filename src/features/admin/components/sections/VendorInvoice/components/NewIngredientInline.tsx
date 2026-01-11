import React, { useState, useEffect } from "react";
import {
  Plus,
  SkipForward,
  Sparkles,
  GraduationCap,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";
import { useOperationsStore } from "@/stores/operationsStore";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { CommonNameAutocomplete } from "./CommonNameAutocomplete";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
interface NewIngredientInlineProps {
  /** Data from the invoice row */
  invoiceData: {
    item_code: string;
    product_name: string;
    unit_price: string;
    unit_of_measure?: string;
  };
  /** Vendor ID from the import */
  vendorId: string;
  /** Called when ingredient is successfully added */
  onAdd: (ingredient: MasterIngredient) => void;
  /** Called when user clicks "Skip for Now" */
  onSkip: () => void;
  /** Called when user cancels/closes the inline form */
  onCancel: () => void;
}


// ---------------------------------------------------------------------------
// GUIDANCE TIP COMPONENT
// ---------------------------------------------------------------------------
interface GuidanceTipProps {
  children: React.ReactNode;
  isVisible: boolean;
}

const GuidanceTip: React.FC<GuidanceTipProps> = ({ children, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg border bg-primary-500/10 border-primary-500/20 mt-2">
      <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary-400" />
      <p className="text-xs text-gray-300 leading-relaxed">{children}</p>
    </div>
  );
};


// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export const NewIngredientInline: React.FC<NewIngredientInlineProps> = ({
  invoiceData,
  vendorId,
  onAdd,
  onSkip,
  onCancel,
}) => {
  const { organization, user } = useAuth();
  const { settings, fetchSettings } = useOperationsStore();
  const {
    majorGroups,
    categories,
    subCategories,
    fetchFoodRelationships,
    isLoading: isLoadingRelationships,
  } = useFoodRelationshipsStore();

  // Guided mode - uses same localStorage key as IngredientDetailPage for consistency
  const [isGuided, setIsGuided] = useState(() => {
    const stored = localStorage.getItem("cheflife-guided-mode");
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem("cheflife-guided-mode", isGuided.toString());
  }, [isGuided]);

  // Form state
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    product: invoiceData.product_name,
    common_name: "",
    major_group: "",
    category: "",
    sub_category: "",
  });

  // Load settings and food relationships
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchSettings(), fetchFoodRelationships()]);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [fetchSettings, fetchFoodRelationships]);

  // Filtered categories based on major group
  const filteredCategories = React.useMemo(() => {
    if (!formData.major_group) return [];
    return categories.filter((c) => c.group_id === formData.major_group);
  }, [categories, formData.major_group]);

  // Filtered subcategories based on category
  const filteredSubCategories = React.useMemo(() => {
    if (!formData.category) return [];
    return subCategories.filter((s) => s.category_id === formData.category);
  }, [subCategories, formData.category]);

  // Handle form changes
  const handleChange = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Handle category cascade - clear child selections when parent changes
  const handleMajorGroupChange = (value: string) => {
    handleChange({ major_group: value, category: "", sub_category: "" });
  };

  const handleCategoryChange = (value: string) => {
    handleChange({ category: value, sub_category: "" });
  };

  // Save handler
  const handleSave = async () => {
    if (!formData.product || !formData.major_group || !formData.category) {
      toast.error("Please fill in Product Name, Major Group, and Category");
      return;
    }

    if (!organization?.id || !user?.id) {
      toast.error("Organization or user not found");
      return;
    }

    setIsSaving(true);
    try {
      const newIngredient: Partial<MasterIngredient> = {
        id: crypto.randomUUID(),
        organization_id: organization.id,
        product: formData.product,
        common_name: formData.common_name || null,
        vendor: vendorId,
        item_code: invoiceData.item_code,
        current_price: parseFloat(invoiceData.unit_price) || 0,
        unit_of_measure: invoiceData.unit_of_measure || "",
        major_group: formData.major_group || null,
        category: formData.category || null,
        sub_category: formData.sub_category || null,
        // Defaults - use 1 to avoid division by zero in cost calculations
        case_size: "",
        units_per_case: 1,
        recipe_unit_type: "",
        yield_percent: 100,
        cost_per_recipe_unit: parseFloat(invoiceData.unit_price) || 0,
        recipe_unit_per_purchase_unit: 1,
        storage_area: "",
        image_url: null,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert the ingredient
      const { error: insertError } = await supabase
        .from("master_ingredients")
        .insert([newIngredient]);

      if (insertError) throw insertError;

      // Capture to ML training mappings for future suggestions
      try {
        await supabase.from("ml_training_mappings").insert({
          organization_id: organization.id,
          vendor_id: vendorId,
          vendor_description: invoiceData.product_name,
          mapped_ingredient_id: newIngredient.id,
          mapped_common_name: formData.common_name || null,
          mapped_major_group: formData.major_group || null,
          mapped_category: formData.category || null,
          mapped_sub_category: formData.sub_category || null,
          confidence_score: 1.0, // User-verified = 100% confidence
          source: "user_import",
          created_by: user.id,
        });
      } catch (mlError) {
        // Don't fail the whole operation if ML capture fails
        console.warn("ML training capture failed (table may not exist yet):", mlError);
      }

      toast.success(`Added: ${formData.product}`);
      onAdd(newIngredient as MasterIngredient);
    } catch (error: any) {
      console.error("Error saving ingredient:", error);
      toast.error(error.message || "Failed to add ingredient");
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard handler for rapid entry
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  if (isLoadingRelationships) {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-6 bg-gray-800/30 border-t border-gray-700/50">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-gray-800/30 border-t border-gray-700/50" onKeyDown={handleKeyDown}>
      <td colSpan={6} className="px-4 py-4">
        {/* Header with Guided Toggle - L5 styling */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Quick Add Ingredient</h3>
              <span className="text-xs text-gray-500">Code: {invoiceData.item_code}</span>
            </div>
          </div>
          
          {/* Guided Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsGuided(!isGuided)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              isGuided 
                ? "bg-primary-500/20 text-primary-400 border border-primary-500/30" 
                : "bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:text-gray-400"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{isGuided ? "Guided" : "Guide"}</span>
          </button>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Product Name - pre-filled */}
          <div className="col-span-5">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={formData.product}
              onChange={(e) => handleChange({ product: e.target.value })}
              className="input w-full text-sm"
            />
          </div>

          {/* Common Name - THE KEY FIELD */}
          <div className="col-span-4">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Common Name
              {isGuided && <span className="text-primary-400 ml-1">★</span>}
            </label>
            <CommonNameAutocomplete
              value={formData.common_name}
              onChange={(v) => handleChange({ common_name: v })}
              organizationId={organization?.id}
              autoFocus
            />
            <GuidanceTip isVisible={isGuided}>
              The kitchen name linking this across vendors. Type "Back Ribs" and it connects 
              to every back rib you buy — GFS, Flanagan, whoever. One name = unified costing.
            </GuidanceTip>
          </div>

          {/* Auto-filled info */}
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Invoice Price
            </label>
            <div className="input w-full text-sm bg-gray-900/50 text-gray-400 cursor-not-allowed">
              ${parseFloat(invoiceData.unit_price).toFixed(2)}
            </div>
          </div>

          {/* Category Cascade Row */}
          <div className="col-span-4">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Major Group*
            </label>
            <select
              value={formData.major_group}
              onChange={(e) => handleMajorGroupChange(e.target.value)}
              className="input w-full text-sm"
            >
              <option value="">Select...</option>
              {majorGroups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-4">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Category*
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="input w-full text-sm"
              disabled={!formData.major_group}
            >
              <option value="">Select...</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-4">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Sub Category
            </label>
            <select
              value={formData.sub_category}
              onChange={(e) => handleChange({ sub_category: e.target.value })}
              className="input w-full text-sm"
              disabled={!formData.category}
            >
              <option value="">Select...</option>
              {filteredSubCategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions - subtle color at rest, all on right, cancel is two-stage */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-700/50">
          {/* Skip - amber tint */}
          <button
            type="button"
            onClick={onSkip}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400/70 hover:bg-amber-500/20 hover:text-amber-400 transition-colors"
            title="Skip for Now"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Add - emerald tint */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !formData.product || !formData.major_group || !formData.category}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400/70 hover:bg-emerald-500/20 hover:text-emerald-400 disabled:bg-gray-800/30 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            title="Add + Next"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-700 mx-1" />

          {/* Cancel - two stage */}
          <TwoStageButton
            onConfirm={onCancel}
            icon={X}
            confirmText="Sure?"
            title="Cancel"
            variant="danger"
          />
        </div>

        {/* Keyboard hint */}
        {isGuided && (
          <div className="text-xs text-gray-500 text-center mt-3">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">⌘/Ctrl</kbd> + 
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 ml-1">Enter</kbd> to save • 
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 ml-2">Esc</kbd> to cancel
          </div>
        )}
      </td>
    </tr>
  );
};
