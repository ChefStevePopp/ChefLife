import React from "react";
import { FlaskConical } from "lucide-react";

/**
 * VariantToggle - Visual A/B selector for dev/omega users
 * 
 * Tiny, unobtrusive, powerful.
 * Shows only to dev users, lets them switch between component variants
 * in real-world context to make informed decisions.
 * 
 * NOTE: Has known click event conflicts when used inside clickable containers.
 * Consider placing outside of click handlers or using a modal approach.
 */

interface VariantToggleProps<T extends string> {
  componentName: string;
  variants: T[];
  activeVariant: T;
  onVariantChange: (variant: T) => void;
  labels?: Record<T, string>; // Optional friendly labels
}

export function VariantToggle<T extends string>({
  componentName,
  variants,
  activeVariant,
  onVariantChange,
  labels,
}: VariantToggleProps<T>) {
  return (
    <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 mb-3">
      <FlaskConical className="w-4 h-4 text-purple-400" />
      <span className="text-xs text-purple-400 font-medium">{componentName}:</span>
      <div className="flex gap-1">
        {variants.map((variant) => (
          <button
            key={variant}
            onClick={() => onVariantChange(variant)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeVariant === variant
                ? "bg-purple-500 text-white"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
          >
            {labels?.[variant] || variant}
          </button>
        ))}
      </div>
    </div>
  );
}
