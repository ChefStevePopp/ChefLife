/**
 * =============================================================================
 * INGREDIENT SEARCH - Smart Search Component
 * =============================================================================
 * L5 Design - Direction-aware dropdown, grouped results, sandbox creation
 * =============================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, ChefHat, Package, Plus, AlertCircle } from "lucide-react";
import type { IngredientSearchProps, MasterIngredientOption, PreparedItemOption } from "./types";

export const IngredientSearch: React.FC<IngredientSearchProps> = ({
  value,
  onChange,
  onSandboxCreate,
  rawIngredients,
  preparedItems,
  placeholder = "Search ingredients or prep items...",
  autoFocus = false,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropDirection, setDropDirection] = useState<'down' | 'up'>('down');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected ingredient for display
  const selectedRaw = rawIngredients.find((i) => i.id === value);
  const selectedPrep = preparedItems.find((i) => i.id === value);
  const selectedName = selectedRaw?.product || selectedPrep?.name || "";

  // Sync search with selected value
  useEffect(() => {
    if (!open) {
      setSearch(selectedName);
    }
  }, [selectedName, open]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown direction based on viewport position
  const updateDropDirection = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 320; // Approximate max height
      
      // Prefer down, but flip up if not enough space below and more space above
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropDirection('up');
      } else {
        setDropDirection('down');
      }
    }
  };

  // Filter ingredients
  const filteredRaw = useMemo(() => {
    if (!search.trim()) return rawIngredients.slice(0, 20);
    const term = search.toLowerCase();
    return rawIngredients.filter(
      (item) =>
        item.product.toLowerCase().includes(term) ||
        item.common_name?.toLowerCase().includes(term) ||
        item.vendor_codes?.current?.code?.toLowerCase().includes(term)
    ).slice(0, 15);
  }, [search, rawIngredients]);

  const filteredPrep = useMemo(() => {
    if (!search.trim()) return preparedItems.slice(0, 10);
    const term = search.toLowerCase();
    return preparedItems.filter(
      (item) => item.name.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [search, preparedItems]);

  const hasResults = filteredRaw.length > 0 || filteredPrep.length > 0;
  const showSandboxOption = !hasResults && search.trim().length > 2;

  const handleFocus = () => {
    updateDropDirection();
    setOpen(true);
    setSearch(""); // Clear to show all options
  };

  const handleSelect = (id: string, type: 'raw' | 'prepared', name: string) => {
    onChange(id, type);
    setSearch(name);
    setOpen(false);
  };

  const handleSandboxClick = () => {
    onSandboxCreate?.();
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="input w-full bg-gray-800/50 pl-10 pr-4 py-3 text-base"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute z-50 w-full bg-gray-800 rounded-lg border border-gray-700 shadow-xl max-h-80 overflow-auto
            ${dropDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          <div className="p-2 space-y-1">
            {/* Raw Ingredients Section */}
            {filteredRaw.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 uppercase sticky top-0 bg-gray-800">
                  <Package className="w-3.5 h-3.5" />
                  Raw Ingredients
                </div>
                {filteredRaw.map((item) => (
                  <button
                    key={`raw-${item.id}`}
                    onClick={() => handleSelect(item.id, "raw", item.product)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors
                      ${value === item.id 
                        ? "bg-primary-500/20 text-primary-400 border border-primary-500/30" 
                        : "hover:bg-gray-700/50 text-gray-300"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.product}</div>
                        {item.common_name && (
                          <div className="text-xs text-gray-500 truncate">
                            aka {item.common_name}
                          </div>
                        )}
                      </div>
                      {item.cost_per_recipe_unit !== undefined && item.cost_per_recipe_unit > 0 && (
                        <div className="text-xs text-emerald-400 whitespace-nowrap">
                          ${item.cost_per_recipe_unit.toFixed(2)}/{item.recipe_unit_type}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {item.recipe_unit_type && (
                        <span>Unit: {item.recipe_unit_type}</span>
                      )}
                      {item.vendor_codes?.current?.code && (
                        <span className="text-gray-600">
                          {item.vendor_codes.current.vendor} #{item.vendor_codes.current.code}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Prepared Items Section */}
            {filteredPrep.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 uppercase sticky top-0 bg-gray-800">
                  <ChefHat className="w-3.5 h-3.5" />
                  Prepared Items
                </div>
                {filteredPrep.map((item) => (
                  <button
                    key={`prep-${item.id}`}
                    onClick={() => handleSelect(item.id, "prepared", item.name)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors
                      ${value === item.id 
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                        : "hover:bg-gray-700/50 text-gray-300"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ChefHat className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      {item.cost_per_unit !== undefined && item.cost_per_unit > 0 && (
                        <div className="text-xs text-emerald-400 whitespace-nowrap">
                          ${item.cost_per_unit.toFixed(2)}/{item.unit_type}
                        </div>
                      )}
                    </div>
                    {item.unit_type && (
                      <div className="text-xs text-gray-500 mt-1 ml-6">
                        Unit: {item.unit_type}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No Results + Sandbox Option */}
            {!hasResults && (
              <div className="py-4 px-3 text-center">
                <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 mb-3">
                  No ingredients found for "{search}"
                </p>
                {showSandboxOption && onSandboxCreate && (
                  <button
                    onClick={handleSandboxClick}
                    className="btn-ghost text-amber-400 border-amber-500/30 hover:bg-amber-500/10 w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Sandbox Ingredient
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientSearch;
