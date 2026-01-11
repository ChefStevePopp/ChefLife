import { useState, useCallback } from "react";
import { useDiagnostics } from "./useDiagnostics";

/**
 * useVariantTesting - A/B testing for dev/omega users
 * 
 * Proliferation and evolution without destruction.
 * Build multiple versions, compare them in real-world context,
 * pick the winner. Zero risk to production users.
 * 
 * Usage:
 *   const { activeVariant, setVariant, showToggle, VariantToggle } = useVariantTesting(
 *     "VendorSelector",
 *     ["original", "compact", "minimal"],
 *     "original" // default for non-dev users
 *   );
 * 
 *   return (
 *     <>
 *       {showToggle && <VariantToggle />}
 *       {activeVariant === "original" && <OriginalComponent />}
 *       {activeVariant === "compact" && <CompactComponent />}
 *     </>
 *   );
 */

interface UseVariantTestingReturn<T extends string> {
  activeVariant: T;
  setVariant: (variant: T) => void;
  showToggle: boolean;
  variants: T[];
  componentName: string;
}

export function useVariantTesting<T extends string>(
  componentName: string,
  variants: T[],
  defaultVariant: T
): UseVariantTestingReturn<T> {
  const { showDiagnostics } = useDiagnostics();
  
  // Storage key for this component's variant choice
  const storageKey = `cheflife-variant-${componentName}`;
  
  // Initialize from localStorage if dev user, otherwise use default
  const [activeVariant, setActiveVariant] = useState<T>(() => {
    if (typeof window === "undefined") return defaultVariant;
    
    const stored = localStorage.getItem(storageKey);
    if (stored && variants.includes(stored as T)) {
      return stored as T;
    }
    return defaultVariant;
  });

  const setVariant = useCallback((variant: T) => {
    setActiveVariant(variant);
    localStorage.setItem(storageKey, variant);
  }, [storageKey]);

  return {
    activeVariant: showDiagnostics ? activeVariant : defaultVariant,
    setVariant,
    showToggle: showDiagnostics,
    variants,
    componentName,
  };
}
