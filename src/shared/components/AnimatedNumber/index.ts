/**
 * Premium Morph Animation Components
 * 
 * ChefLife's signature smooth transitions for numbers and text.
 * 
 * @example
 * ```tsx
 * import { AnimatedNumber, MorphingText } from "@/shared/components/AnimatedNumber";
 * 
 * // Temperature with smooth interpolation
 * <AnimatedNumber value={36.7} suffix="°F" decimals={1} />
 * 
 * // Price with dollar sign
 * <AnimatedNumber value={12.99} prefix="$" decimals={2} />
 * 
 * // Text with blur/slide morph
 * <MorphingText text={equipmentName} className="text-gray-400" />
 * ```
 */

export { AnimatedNumber } from "./AnimatedNumber";
export type { AnimatedNumberProps } from "./AnimatedNumber";

export { MorphingText } from "./MorphingText";
export type { MorphingTextProps } from "./MorphingText";
