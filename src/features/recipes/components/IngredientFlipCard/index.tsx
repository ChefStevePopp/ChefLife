import React, { useState, useMemo } from "react";
import {
  Check,
  Package,
  CheckCircle,
} from "lucide-react";
import * as Icons from "lucide-react";
import { ALLERGENS } from "@/features/allergens/constants";
import type { AllergenType } from "@/features/allergens/types";
import type { MasterIngredient } from "@/types/master-ingredient";

/**
 * =============================================================================
 * INGREDIENT FLIP CARD - L5 Design (Mise en Place)
 * =============================================================================
 * Front: Allergen icons, product image, quantity + name
 * Back: Simplified - name, allergens, "I Have This" button
 *       No scrolling, no clutter - just confirm and move on
 * =============================================================================
 */

interface IngredientFlipCardProps {
  ingredient: {
    id: string;
    ingredient_name?: string;
    name?: string;
    quantity: number;
    unit: string;
    common_measure?: string;
    commonMeasure?: string;
    notes?: string;
    allergens?: string[];
    master_ingredient_id?: string;
  };
  masterInfo?: MasterIngredient | null;
  scaledMeasure: string | null;
  isChecked: boolean;
  onToggleCheck: () => void;
}

// Allergen color classes (full class names for Tailwind purging)
const ALLERGEN_COLORS: Record<string, { bg: string; text: string }> = {
  orange: { bg: "bg-orange-500/20", text: "text-orange-400" },
  red: { bg: "bg-red-500/20", text: "text-red-400" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-400" },
  pink: { bg: "bg-pink-500/20", text: "text-pink-400" },
  yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  green: { bg: "bg-green-500/20", text: "text-green-400" },
  blue: { bg: "bg-blue-500/20", text: "text-blue-400" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  indigo: { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  fuchsia: { bg: "bg-fuchsia-500/20", text: "text-fuchsia-400" },
  stone: { bg: "bg-stone-500/20", text: "text-stone-400" },
  rose: { bg: "bg-rose-500/20", text: "text-rose-400" },
  gray: { bg: "bg-gray-500/20", text: "text-gray-400" },
};

const getAllergenIcon = (allergenType: string) => {
  const allergen = ALLERGENS[allergenType as AllergenType];
  if (!allergen) return null;
  const Icon = Icons[allergen.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
  return Icon || null;
};

const getAllergenColors = (allergenType: string) => {
  const allergen = ALLERGENS[allergenType as AllergenType];
  const color = allergen?.color || 'gray';
  return ALLERGEN_COLORS[color] || ALLERGEN_COLORS.gray;
};

export const IngredientFlipCard: React.FC<IngredientFlipCardProps> = ({
  ingredient,
  masterInfo,
  scaledMeasure,
  isChecked,
  onToggleCheck,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imageError, setImageError] = useState(false);

  const ingredientName = ingredient.ingredient_name || masterInfo?.product || ingredient.name || "Ingredient";
  const allergens = ingredient.allergens || [];
  const quantityDisplay = scaledMeasure || `${ingredient.quantity} ${ingredient.unit}`;

  const imageSrc = useMemo(() => {
    if (imageError) return null;
    return masterInfo?.image_url || null;
  }, [masterInfo?.image_url, imageError]);

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCheck();
    setTimeout(() => setIsFlipped(false), 400);
  };

  return (
    <div className="group h-full w-full" style={{ perspective: "1000px" }}>
      <div
        onClick={handleFlip}
        className="relative w-full h-full cursor-pointer group-hover:[transform:rotateY(180deg)] card-responsive"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 500ms cubic-bezier(0.33, 1, 0.68, 1)",
        }}
      >
        {/* ================================================================ */}
        {/* FRONT FACE - Letterbox Layout                                    */}
        {/* ================================================================ */}
        <div
          className={`absolute inset-0 rounded-xl overflow-hidden border shadow-lg flex flex-col ${
            isChecked ? "border-emerald-500/50" : "border-gray-700/50"
          }`}
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          {/* TOP LETTERBOX - Allergens */}
          <div className="bg-gray-900 card-letterbox flex items-center flex-shrink-0">
            {allergens.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {allergens.slice(0, 5).map((allergen) => {
                  const Icon = getAllergenIcon(allergen);
                  const colors = getAllergenColors(allergen);
                  if (!Icon) return null;
                  return (
                    <div
                      key={allergen}
                      className={`card-allergen-badge rounded-full ${colors.bg} flex items-center justify-center`}
                      title={allergen.replace('_', ' ')}
                    >
                      <Icon className={colors.text} />
                    </div>
                  );
                })}
                {allergens.length > 5 && (
                  <span className="card-allergen-text text-gray-500 ml-1">+{allergens.length - 5}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-emerald-400">
                <div className="card-allergen-badge rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle />
                </div>
                <span className="card-allergen-text uppercase tracking-wide">None Defined</span>
              </div>
            )}
          </div>

          {/* MIDDLE - Product Image */}
          <div className="flex-1 relative bg-gray-800">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={ingredientName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                <Package className="w-16 h-16 text-gray-600" />
              </div>
            )}
            {isChecked && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl">
                  <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM LETTERBOX - Quantity + Name */}
          <div className="bg-gray-900 card-letterbox flex-shrink-0">
            <p className={`card-quantity tabular-nums ${isChecked ? "text-emerald-400" : "text-white"}`}>
              {quantityDisplay}
            </p>
            <h3 className={`card-name mt-1 line-clamp-2 ${isChecked ? "text-gray-500 line-through" : "text-gray-300"}`}>
              {ingredientName}
            </h3>
          </div>
        </div>

        {/* ================================================================ */}
        {/* BACK FACE - Simplified for Mise en Place                         */}
        {/* Just: Name confirmation, Allergens, Ready button                 */}
        {/* Uses same container query pattern as front face                  */}
        {/* ================================================================ */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-gray-700/50 shadow-xl bg-gray-800 card-responsive"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="h-full flex flex-col card-back-padding justify-between">
            {/* Ingredient Name - Confirmation */}
            <div className="text-center">
              <h3 className="card-back-name font-bold text-white leading-tight line-clamp-2">
                {ingredientName}
              </h3>
              <p className="card-back-quantity text-gray-400 tabular-nums">
                {quantityDisplay}
              </p>
            </div>

            {/* Allergens - Centered, prominent */}
            <div className="flex-1 flex flex-col items-center justify-center card-back-allergen-area">
              {allergens.length > 0 ? (
                <>
                  <span className="card-back-label font-bold text-amber-400/80 uppercase tracking-wider">
                    Contains Allergens
                  </span>
                  <div className="flex flex-wrap justify-center card-back-badge-gap">
                    {allergens.map((allergen) => {
                      const Icon = getAllergenIcon(allergen);
                      const colors = getAllergenColors(allergen);
                      const label = allergen.charAt(0).toUpperCase() + allergen.slice(1).replace(/_/g, ' ');
                      return (
                        <div
                          key={allergen}
                          className={`card-back-badge flex items-center rounded-lg ${colors.bg}`}
                        >
                          {Icon && <Icon className={`card-back-badge-icon ${colors.text}`} />}
                          <span className={`card-back-badge-text font-semibold ${colors.text}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center card-back-safe-gap">
                  <div className="card-back-safe-icon rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="text-emerald-400" style={{ width: '50%', height: '50%' }} />
                  </div>
                  <span className="card-back-safe-text font-medium text-emerald-400">No Allergens Declared</span>
                </div>
              )}
            </div>

            {/* Ready Button - scales with card */}
            <button
              onClick={handleCheck}
              className={`w-full flex justify-center card-back-button rounded-xl transition-all font-semibold items-center ${
                isChecked
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-gray-700 hover:bg-primary-500 text-gray-200 hover:text-white"
              }`}
            >
              <Check className={`card-back-button-icon ${isChecked ? '' : 'opacity-70'}`} />
              {isChecked ? "Ready!" : "I Have This"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngredientFlipCard;
