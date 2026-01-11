/**
 * TwoStageButton - Inline destructive action protection
 * 
 * First click: Expands to show confirmation ("Sure?")
 * Second click: Executes the action
 * Auto-resets after timeout if not confirmed
 * 
 * Use for: Cancel, Delete, Remove actions where a modal feels too heavy
 * but you still want to protect the user from accidental clicks.
 * 
 * @example
 * <TwoStageButton
 *   onConfirm={() => handleDelete()}
 *   icon={Trash2}
 *   confirmText="Delete?"
 *   variant="danger"
 * />
 */

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Variant = "danger" | "warning" | "neutral";

interface TwoStageButtonProps {
  onConfirm: () => void;
  icon?: LucideIcon;
  confirmText?: string;
  title?: string;
  variant?: Variant;
  timeout?: number; // ms before auto-reset (default 2000)
  disabled?: boolean;
  className?: string;
}

const variantStyles: Record<Variant, { resting: string; confirm: string }> = {
  danger: {
    resting: "bg-gray-800/50 text-gray-500 hover:bg-rose-500/10 hover:text-rose-400",
    confirm: "bg-rose-500/20 text-rose-400",
  },
  warning: {
    resting: "bg-gray-800/50 text-gray-500 hover:bg-amber-500/10 hover:text-amber-400",
    confirm: "bg-amber-500/20 text-amber-400",
  },
  neutral: {
    resting: "bg-gray-800/50 text-gray-500 hover:bg-gray-700 hover:text-gray-300",
    confirm: "bg-gray-700 text-white",
  },
};

export const TwoStageButton: React.FC<TwoStageButtonProps> = ({
  onConfirm,
  icon: Icon = X,
  confirmText = "Sure?",
  title = "Click to confirm",
  variant = "danger",
  timeout = 2000,
  disabled = false,
  className = "",
}) => {
  const [confirmMode, setConfirmMode] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset after timeout if not confirmed
  useEffect(() => {
    if (confirmMode) {
      timeoutRef.current = setTimeout(() => {
        setConfirmMode(false);
      }, timeout);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [confirmMode, timeout]);

  const handleClick = () => {
    if (disabled) return;
    
    if (confirmMode) {
      onConfirm();
      setConfirmMode(false);
    } else {
      setConfirmMode(true);
    }
  };

  const styles = variantStyles[variant];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`h-8 rounded-lg flex items-center justify-center transition-all ${
        confirmMode
          ? `${styles.confirm} px-3 gap-1.5`
          : `w-8 ${styles.resting}`
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      title={confirmMode ? `Click again to confirm` : title}
    >
      <Icon className="w-4 h-4" />
      {confirmMode && <span className="text-xs font-medium">{confirmText}</span>}
    </button>
  );
};

export default TwoStageButton;
