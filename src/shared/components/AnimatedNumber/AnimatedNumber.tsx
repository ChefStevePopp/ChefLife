import React, { useState, useEffect, useRef } from "react";

/**
 * =============================================================================
 * ANIMATED NUMBER - Premium Morph Animation
 * =============================================================================
 * 
 * Numbers smoothly interpolate between values at 60fps using requestAnimationFrame.
 * Used for temperatures, prices, percentages - anywhere numbers update.
 * 
 * Philosophy: "So smooth you're not sure if it moved."
 * 
 * Key Features:
 * - 60fps animation via requestAnimationFrame
 * - Ease-out cubic easing (decelerates like a luxury gauge)
 * - tabular-nums prevents digit width jumping
 * - Configurable duration, decimals, prefix, suffix
 * 
 * Usage:
 * ```tsx
 * // Temperature
 * <AnimatedNumber value={36.7} suffix="°F" decimals={1} />
 * 
 * // Price
 * <AnimatedNumber value={12.99} prefix="$" decimals={2} />
 * 
 * // Percentage
 * <AnimatedNumber value={85} suffix="%" decimals={0} />
 * 
 * // With custom styling
 * <AnimatedNumber 
 *   value={1234.56} 
 *   prefix="$" 
 *   decimals={2}
 *   className="text-3xl font-bold text-emerald-400"
 *   duration={1500}
 * />
 * ```
 * 
 * Reference: L5-BUILD-STRATEGY.md → Premium Interaction Patterns
 * =============================================================================
 */

export interface AnimatedNumberProps {
  /** The target value to animate to */
  value: number | null;
  
  /** Animation duration in milliseconds (default: 2000) */
  duration?: number;
  
  /** Number of decimal places (default: 1) */
  decimals?: number;
  
  /** Prefix string (e.g., "$") */
  prefix?: string;
  
  /** Suffix string (e.g., "°F", "%") */
  suffix?: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Text to show when value is null (default: "—") */
  nullText?: string;
  
  /** Class for null state text */
  nullClassName?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 2000,
  decimals = 1,
  prefix = "",
  suffix = "",
  className = "",
  nullText = "—",
  nullClassName = "text-gray-500",
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number | null>(null);

  useEffect(() => {
    // Handle null values - no animation needed
    if (value === null) {
      setDisplayValue(null);
      return;
    }

    // First render - set immediately, no animation
    if (displayValue === null) {
      setDisplayValue(value);
      return;
    }

    // Same value - no animation needed
    if (value === displayValue) {
      return;
    }

    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic - decelerates like a luxury gauge
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentValue =
        startValueRef.current! + (value - startValueRef.current!) * eased;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we land exactly on target
        setDisplayValue(value);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  // Null state
  if (displayValue === null) {
    return <span className={nullClassName}>{nullText}</span>;
  }

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
