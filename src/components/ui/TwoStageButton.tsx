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
type Size = "xs" | "sm" | "md";

interface TwoStageButtonProps {
  onConfirm: () => void;
  icon?: LucideIcon;
  confirmIcon?: LucideIcon; // Optional different icon for confirm state
  confirmText?: string;
  title?: string;
  variant?: Variant;
  size?: Size;
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

const sizeStyles: Record<Size, { button: string; icon: string; text: string }> = {
  xs: { button: "h-6", icon: "w-3 h-3", text: "text-[10px]" },
  sm: { button: "h-7", icon: "w-3.5 h-3.5", text: "text-xs" },
  md: { button: "h-8", icon: "w-4 h-4", text: "text-xs" },
};

export const TwoStageButton: React.FC<TwoStageButtonProps> = ({
  onConfirm,
  icon: Icon = X,
  confirmIcon: ConfirmIcon,
  confirmText = "Sure?",
  title = "Click to confirm",
  variant = "danger",
  size = "md",
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
  const sizes = sizeStyles[size];
  const ActiveIcon = confirmMode && ConfirmIcon ? ConfirmIcon : Icon;
  const restingWidth = size === "xs" ? "w-6" : size === "sm" ? "w-7" : "w-8";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`${sizes.button} rounded-lg flex items-center justify-center transition-all ${
        confirmMode
          ? `${styles.confirm} px-2 gap-1`
          : `${restingWidth} ${styles.resting}`
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      title={confirmMode ? `Click again to confirm` : title}
    >
      <ActiveIcon className={sizes.icon} />
      {confirmMode && <span className={`${sizes.text} font-medium`}>{confirmText}</span>}
    </button>
  );
};

export default TwoStageButton;
