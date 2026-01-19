import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * =============================================================================
 * L5 SELECT - Professional Dropdown Component
 * =============================================================================
 * A polished select component with grouped options support.
 * Matches the L5 design system with proper focus states and animations.
 * =============================================================================
 */

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface L5SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const L5Select: React.FC<L5SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  // Group options
  const grouped = options.reduce((acc, opt) => {
    const group = opt.group || "";
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, SelectOption[]>);

  const selectedOption = options.find((o) => o.value === value);
  const hasGroups = Object.keys(grouped).some((k) => k !== "");

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger - uses .input class to match header */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`input w-full flex items-center justify-between gap-2 text-left ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <span className={selectedOption ? "text-white" : "text-gray-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1f2b] border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Options */}
          <div className="max-h-64 overflow-y-auto">
            {/* Empty option */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-800/50 transition-colors ${
                !value ? "text-primary-400" : "text-gray-500"
              }`}
            >
              {placeholder}
            </button>

            {Object.entries(grouped).map(([group, opts]) => (
              <div key={group || "default"}>
                {/* Group header - only show if we have named groups */}
                {group && hasGroups && (
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-800/30 border-t border-gray-700/50">
                    {group}
                  </div>
                )}
                {/* Options */}
                {opts.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-800/50 transition-colors ${
                      opt.value === value
                        ? "text-primary-400 bg-primary-500/10"
                        : "text-gray-300"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default L5Select;
