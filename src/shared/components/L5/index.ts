/**
 * =============================================================================
 * L5 DESIGN SYSTEM COMPONENTS
 * =============================================================================
 * Shared components for building professional, polished interfaces.
 * 
 * These components follow the L5 design philosophy:
 * - Consistent styling across the app
 * - Guided mode support for onboarding
 * - Accessible and responsive
 * 
 * Usage:
 *   import { L5Select, L5Input, Field, ExpandableSection, GuidanceTip } from "@/shared/components/L5";
 * =============================================================================
 */

// Form components
export { L5Select } from "./L5Select";
export type { SelectOption } from "./L5Select";
export { L5Input } from "./L5Input";
export { Field } from "./Field";

// Layout components
export { ExpandableSection } from "./ExpandableSection";

// Guided mode
export { 
  GuidedModeProvider, 
  GuidedModeToggle, 
  useGuidedMode 
} from "./GuidedModeContext";
export { GuidanceTip } from "./GuidanceTip";
