import React, { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import type { ExcelColumn } from "@/types";

// =============================================================================
// COLUMN FILTER - L5 Design (Smart Filters)
// =============================================================================
// Automatically chooses the best filter UI based on data:
// - Dropdown for categorical data (≤20 unique values)
// - Autocomplete for high-cardinality text (>20 unique values)
// - Min/Max range for numbers
// - Date range for dates
// =============================================================================

interface ColumnFilterProps {
  column: ExcelColumn;
  value: string | number | [number, number] | [string, string] | null;
  onChange: (value: any) => void;
  onClear: () => void;
  uniqueValues?: string[]; // Unique values from the data for this column
  forceDropdown?: boolean; // Force dropdown even with 0 values (for cascading filters)
}

const DROPDOWN_THRESHOLD = 20; // Show dropdown if ≤ this many unique values

export const ColumnFilter: React.FC<ColumnFilterProps> = ({
  column,
  value,
  onChange,
  onClear,
  uniqueValues = [],
  forceDropdown = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Close dropdown/autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine filter type - use filterType if specified, otherwise fall back to column type
  const effectiveType = column.filterType || column.type;

  // Determine filter type based on unique values count
  const shouldUseDropdown = forceDropdown || (uniqueValues.length > 0 && uniqueValues.length <= DROPDOWN_THRESHOLD);
  const shouldUseAutocomplete = !forceDropdown && uniqueValues.length > DROPDOWN_THRESHOLD;

  // For 'select' filterType, always use dropdown
  const isSelectType = effectiveType === "select";

  // Filter autocomplete suggestions
  const autocompleteSuggestions = shouldUseAutocomplete
    ? uniqueValues
        .filter((v) => v.toLowerCase().includes(autocompleteQuery.toLowerCase()))
        .slice(0, 10)
    : [];

  const renderFilterInput = () => {
    // Handle select type (forced dropdown with predefined options)
    if (isSelectType || (effectiveType === "text" && shouldUseDropdown)) {
      return (
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => uniqueValues.length > 0 && setIsDropdownOpen(!isDropdownOpen)}
            disabled={uniqueValues.length === 0}
            className={`input w-full py-1.5 px-3 text-sm text-left flex items-center justify-between gap-2 ${
              uniqueValues.length === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span className={value ? "text-white" : "text-gray-500"}>
              {uniqueValues.length === 0 
                ? `Select parent first...`
                : (value as string) || `Select ${column.name}...`
              }
            </span>
            <div className="flex items-center gap-1">
              {value && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="text-gray-500 hover:text-gray-300 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </div>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {/* Clear option - distinct styling */}
              <button
                onClick={() => {
                  onClear();
                  setIsDropdownOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-700/50 border-b border-gray-700/50 flex items-center gap-2"
              >
                <X className="w-3.5 h-3.5" />
                <span className="italic">Clear filter</span>
              </button>
              {/* Options */}
              {uniqueValues.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                    value === option 
                      ? "bg-primary-500/20 text-white font-medium" 
                      : "text-gray-200 hover:bg-gray-700/50"
                  }`}
                >
                  {value === option ? (
                    <Check className="w-4 h-4 text-primary-400" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={value === option ? "font-medium" : ""}>{option || "(empty)"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    switch (effectiveType) {
      case "text":
      case "custom": // Fall back to text filter for custom columns

        if (shouldUseAutocomplete) {
          return (
            <div ref={autocompleteRef} className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={(value as string) || autocompleteQuery}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setAutocompleteQuery(newValue);
                  onChange(newValue);
                  setShowAutocomplete(newValue.length > 0);
                }}
                onFocus={() => setShowAutocomplete(autocompleteQuery.length > 0 || (value as string)?.length > 0)}
                placeholder={`Filter ${column.name}...`}
                className="input w-full pl-8 pr-8 py-1.5 text-sm"
                data-filter-key={column.key}
              />
              {(value || autocompleteQuery) && (
                <button
                  onClick={() => {
                    setAutocompleteQuery("");
                    onClear();
                    setShowAutocomplete(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              
              {showAutocomplete && autocompleteSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {autocompleteSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        onChange(suggestion);
                        setAutocompleteQuery(suggestion);
                        setShowAutocomplete(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        value === suggestion
                          ? "bg-primary-500/20 text-white font-medium"
                          : "text-gray-200 hover:bg-gray-700/50"
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // Fallback: simple text input (no unique values provided)
        return (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={(value as string) || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Filter ${column.name}...`}
              className="input w-full pl-8 pr-8 py-1.5 text-sm"
              data-filter-key={column.key}
            />
            {value && (
              <button
                onClick={onClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );

      case "number":
      case "currency":
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={(value as [number, number])?.[0] ?? ""}
              onChange={(e) => {
                const min = e.target.value === "" ? null : Number(e.target.value);
                const max = (value as [number, number])?.[1] ?? null;
                onChange([min, max]);
              }}
              placeholder="Min"
              className="input flex-1 py-1.5 text-sm min-w-0"
              data-filter-key={column.key}
            />
            <span className="text-gray-500 text-sm flex-shrink-0">–</span>
            <input
              type="number"
              value={(value as [number, number])?.[1] ?? ""}
              onChange={(e) => {
                const min = (value as [number, number])?.[0] ?? null;
                const max = e.target.value === "" ? null : Number(e.target.value);
                onChange([min, max]);
              }}
              placeholder="Max"
              className="input flex-1 py-1.5 text-sm min-w-0"
            />
            {value && (
              <button
                onClick={onClear}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );

      case "date":
        return (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={(value as [string, string])?.[0] || ""}
              onChange={(e) => {
                const start = e.target.value;
                const end = (value as [string, string])?.[1] || "";
                onChange([start, end]);
              }}
              className="input flex-1 py-1.5 text-sm min-w-0"
              data-filter-key={column.key}
            />
            <span className="text-gray-500 text-sm flex-shrink-0">–</span>
            <input
              type="date"
              value={(value as [string, string])?.[1] || ""}
              onChange={(e) => {
                const start = (value as [string, string])?.[0] || "";
                const end = e.target.value;
                onChange([start, end]);
              }}
              className="input flex-1 py-1.5 text-sm min-w-0"
            />
            {value && (
              <button
                onClick={onClear}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return <div className="w-full">{renderFilterInput()}</div>;
};
