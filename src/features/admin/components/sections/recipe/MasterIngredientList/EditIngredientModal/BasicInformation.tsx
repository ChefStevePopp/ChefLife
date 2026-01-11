import React, { useState, useEffect, useRef } from "react";
import { Link2 } from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";
import { useOperationsStore } from "@/stores/operationsStore";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// COMMON NAME AUTOCOMPLETE
// ---------------------------------------------------------------------------
interface CommonNameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  organizationId: string | undefined;
}

const CommonNameAutocomplete: React.FC<CommonNameAutocompleteProps> = ({
  value,
  onChange,
  organizationId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{ common_name: string; usage_count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch suggestions when value changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!organizationId || !value || value.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_common_name_suggestions', {
          p_org_id: organizationId,
          p_search: value,
          p_limit: 10
        });

        if (error) {
          // Fallback to direct query if RPC doesn't exist yet
          const { data: fallbackData } = await supabase
            .from('master_ingredients')
            .select('common_name')
            .eq('organization_id', organizationId)
            .not('common_name', 'is', null)
            .ilike('common_name', `%${value}%`)
            .limit(10);
          
          if (fallbackData) {
            const counts: Record<string, number> = {};
            fallbackData.forEach(item => {
              if (item.common_name) {
                counts[item.common_name] = (counts[item.common_name] || 0) + 1;
              }
            });
            const grouped = Object.entries(counts)
              .map(([common_name, usage_count]) => ({ common_name, usage_count }))
              .sort((a, b) => b.usage_count - a.usage_count);
            setSuggestions(grouped);
          }
        } else if (data) {
          setSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching common name suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [value, organizationId]);

  const handleSelect = (selectedName: string) => {
    onChange(selectedName);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="e.g., Back Ribs, Chicken Thighs"
        className="input w-full pr-8"
      />
      {value && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Links Code Groups and Umbrella Groups">
          <Link2 className="w-4 h-4 text-primary-400" />
        </div>
      )}
      
      {isOpen && (value?.length ?? 0) >= 2 && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1f2b] border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.common_name}
                  type="button"
                  onClick={() => handleSelect(suggestion.common_name)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-800/50 transition-colors ${
                    suggestion.common_name === value ? "text-primary-400 bg-primary-500/10" : "text-gray-300"
                  }`}
                >
                  <span>{suggestion.common_name}</span>
                  <span className="text-xs text-gray-500">{suggestion.usage_count} items</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// BASIC INFORMATION COMPONENT
// ---------------------------------------------------------------------------

interface BasicInformationProps {
  formData: MasterIngredient;
  onChange: (updates: Partial<MasterIngredient>) => void;
}

export const BasicInformation: React.FC<BasicInformationProps> = ({
  formData,
  onChange,
}) => {
  const { organization } = useAuth();
  const { settings, fetchSettings } = useOperationsStore();
  const {
    majorGroups,
    categories,
    subCategories,
    fetchFoodRelationships,
    isLoading,
  } = useFoodRelationshipsStore();

  // Fetch settings and food relationships on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchSettings(), fetchFoodRelationships()]);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [fetchSettings, fetchFoodRelationships]);

  // Get filtered categories based on major group
  const filteredCategories = React.useMemo(() => {
    if (!formData.major_group) return [];
    return categories.filter((c) => c.group_id === formData.major_group);
  }, [categories, formData.major_group]);

  // Get filtered subcategories based on category
  const filteredSubCategories = React.useMemo(() => {
    if (!formData.category) return [];
    return subCategories.filter((s) => s.category_id === formData.category);
  }, [subCategories, formData.category]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-400">Loading food relationships...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Product Name | Vendor */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Product Name*
          </label>
          <input
            type="text"
            value={formData.product}
            onChange={(e) => onChange({ product: e.target.value })}
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Vendor*
          </label>
          <select
            value={formData.vendor || ""}
            onChange={(e) => onChange({ vendor: e.target.value })}
            className="input w-full"
            required
          >
            <option value="">Select vendor...</option>
            {settings?.vendors?.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Common Name | Vendor Code */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Common Name
            <span className="ml-2 text-xs text-gray-500 font-normal">Links Code Groups & Umbrellas</span>
          </label>
          <CommonNameAutocomplete
            value={formData.common_name || ""}
            onChange={(v) => onChange({ common_name: v || null })}
            organizationId={organization?.id}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Vendor Code
          </label>
          <input
            type="text"
            value={formData.item_code || ""}
            onChange={(e) => onChange({ item_code: e.target.value })}
            className="input w-full"
          />
        </div>
      </div>

      {/* Row 3: Major Group | Category | Sub Category */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Major Group*
          </label>
          <select
            value={formData.major_group || ""}
            onChange={(e) => {
              onChange({
                major_group: e.target.value || null,
                category: null,
                sub_category: null,
              });
            }}
            className="input w-full"
            required
          >
            <option value="">Select major group...</option>
            {majorGroups?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Category*
          </label>
          <select
            value={formData.category || ""}
            onChange={(e) => {
              onChange({
                category: e.target.value || null,
                sub_category: null,
              });
            }}
            className="input w-full"
            required
            disabled={!formData.major_group}
          >
            <option value="">Select category...</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Sub Category
          </label>
          <select
            value={formData.sub_category || ""}
            onChange={(e) => {
              onChange({
                sub_category: e.target.value || null,
              });
            }}
            className="input w-full"
            disabled={!formData.category}
          >
            <option value="">Select sub-category...</option>
            {filteredSubCategories.map((subCategory) => (
              <option key={subCategory.id} value={subCategory.id}>
                {subCategory.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 4: Storage Area */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Storage Area
        </label>
        <select
          value={formData.storage_area || ""}
          onChange={(e) => onChange({ storage_area: e.target.value })}
          className="input w-full"
        >
          <option value="">Select storage area...</option>
          {settings?.storage_areas?.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
