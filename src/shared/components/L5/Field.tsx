import React from "react";
import { useGuidedMode } from "./GuidedModeContext";

/**
 * =============================================================================
 * FIELD - Form Field Wrapper with Label
 * =============================================================================
 * Wraps form inputs with a label and optional hint text.
 * Hint text only shows in guided mode.
 * =============================================================================
 */

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}

export const Field: React.FC<FieldProps> = ({ 
  label, 
  hint, 
  children,
  required = false,
}) => {
  const { isGuided } = useGuidedMode();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1">
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {children}
      {isGuided && hint && (
        <p className="text-xs text-gray-500 mt-1.5">{hint}</p>
      )}
    </div>
  );
};

export default Field;
