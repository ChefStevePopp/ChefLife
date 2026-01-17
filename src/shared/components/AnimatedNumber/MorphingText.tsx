import React, { useState, useEffect } from "react";

/**
 * =============================================================================
 * MORPHING TEXT - Premium Blur/Slide Transition
 * =============================================================================
 * 
 * Text transitions with a subtle blur + slide effect.
 * Used for labels that change (equipment names, status text, etc.)
 * 
 * Philosophy: "So smooth you're not sure if it moved."
 * 
 * The Effect:
 * - Text fades out with slight blur and downward drift
 * - New text fades in, blur clears, drifts back to position
 * - 1 second each direction = 2 second total transition
 * 
 * Usage:
 * ```tsx
 * <MorphingText text={equipmentName} className="text-sm text-gray-400" />
 * ```
 * 
 * For CSS-only approach, use the .morph-text classes from index.css
 * 
 * Reference: L5-BUILD-STRATEGY.md → Premium Interaction Patterns
 * =============================================================================
 */

export interface MorphingTextProps {
  /** The text to display */
  text: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Transition duration for each direction in ms (default: 1000) */
  transitionDuration?: number;
}

export const MorphingText: React.FC<MorphingTextProps> = ({
  text,
  className = "",
  transitionDuration = 1000,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (text !== displayText) {
      setIsTransitioning(true);

      // Halfway through transition, swap the text
      const timeout = setTimeout(() => {
        setDisplayText(text);
        setIsTransitioning(false);
      }, transitionDuration);

      return () => clearTimeout(timeout);
    }
  }, [text, displayText, transitionDuration]);

  return (
    <span
      className={`inline-block transition-all ease-in-out ${className} ${
        isTransitioning
          ? "opacity-0 blur-[2px] translate-y-1"
          : "opacity-100 blur-0 translate-y-0"
      }`}
      style={{ transitionDuration: `${transitionDuration}ms` }}
    >
      {displayText}
    </span>
  );
};

export default MorphingText;
