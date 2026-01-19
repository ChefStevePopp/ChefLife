/**
 * =============================================================================
 * VITALS CARD - Baseball Card Style Component System
 * =============================================================================
 * Modular card with configurable zones for different contexts:
 * 
 * Structure:
 * ┌─────────────────────────┐
 * │       HERO ZONE         │  ← Image (always)
 * │                         │
 * ├─────────────────────────┤
 * │     IDENTITY ZONE       │  ← Name, badges (always)
 * ├─────────────────────────┤
 * │       STATS ZONE        │  ← Configurable per use case
 * │                         │
 * ├─────────────────────────┤
 * │      FOOTER ZONE        │  ← Vendor + 3-dot animated menu
 * └─────────────────────────┘
 * 
 * Use Cases:
 * - Price Watch: Price, % change, trend arrow
 * - Inventory: On-hand qty, par level, status
 * - Recipe Usage: Cost/portion, recipes using it
 * - Vendor Compare: Price by vendor, best price badge
 * =============================================================================
 */

export { VitalsCard } from "./VitalsCard";
export type { VitalsCardProps, VitalsCardAction } from "./VitalsCard";

export { VitalsCardGrid } from "./VitalsCardGrid";
export type { VitalsCardGridProps } from "./VitalsCardGrid";

// Zone components
export * from "./zones";
