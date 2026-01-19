import React from "react";

/**
 * =============================================================================
 * L5 INPUT - Professional Input Component
 * =============================================================================
 * A polished input component with prefix/suffix support.
 * Matches the L5 design system.
 * =============================================================================
 */

interface L5InputProps {
  type?: "text" | "number";
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export const L5Input: React.FC<L5InputProps> = ({
  type = "text",
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  min,
  max,
  step,
  className = "",
  disabled = false,
  readOnly = false,
}) => {
  return (
    <div className={`relative ${className}`}>
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        readOnly={readOnly}
        className={`input w-full ${prefix ? "pl-8" : ""} ${suffix ? "pr-10" : ""} ${
          disabled || readOnly ? "opacity-50 cursor-not-allowed" : ""
        }`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          {suffix}
        </span>
      )}
    </div>
  );
};

export default L5Input;
