import React, { useState, useMemo } from "react";
import {
  Check,
  Package,
  MapPin,
  Thermometer,
  Clock,
  AlertTriangle,
  Scale,
  CheckCircle,
} from "lucide-react";
import * as Icons from "lucide-react";
import { ALLERGENS } from "@/features/allergens/constants";
import type { AllergenType } from "@/features/allergens/types";
import type { MasterIngredient } from "@/types/master-ingredient";

/**
 * =============================================================================
 * INGREDIENT FLIP CARD - L5 Design (Matches RecipeFlipCard exactly)
 * =============================================================================
 */

interface ChefNotes {
  storageLocation?: string;
  prepState?: string;
  leadTime?: string;
  safetyNote?: string;
}

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
  chefNotes?: ChefNotes;
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

const getMockChefNotes = (ingredientName: string): ChefNotes => {
  const name = ingredientName?.toLowerCase() || "";
  
  if (name.includes("butter")) {
    return { storageLocation: "Walk-in, Dairy shelf", prepState: "Room temperature", leadTime: "Pull 1 hour before prep" };
  }
  if (name.includes("chicken") || name.includes("pork") || name.includes("beef") || name.includes("rib")) {
    return { storageLocation: "Walk-in, Meat drawer", prepState: "Thawed, patted dry", leadTime: "Pull 30 min before cooking", safetyNote: "Check internal temp" };
  }
  if (name.includes("cream") || name.includes("milk")) {
    return { storageLocation: "Walk-in, Dairy shelf", prepState: "Cold", safetyNote: "Smell check before use" };
  }
  if (name.includes("sauce") || name.includes("ketchup") || name.includes("vinegar") || name.includes("beer")) {
    return { storageLocation: "Line station" };
  }
  if (name.includes("spice") || name.includes("rub") || name.includes("seasoning") || name.includes("fire")) {
    return { storageLocation: "Spice rack", prepState: "Check for clumping" };
  }
  return { storageLocation: "Check prep sheet" };
};

export const IngredientFlipCard: React.FC<IngredientFlipCardProps> = ({
  ingredient,
  masterInfo,
  scaledMeasure,
  isChecked,
  onToggleCheck,
  chefNotes: providedNotes,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imageError, setImageError] = useState(false);

  const ingredientName = ingredient.ingredient_name || masterInfo?.product || ingredient.name || "Ingredient";
  const chefNotes = providedNotes || getMockChefNotes(ingredientName);
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
    <div className="group" style={{ perspective: "1000px" }}>
      <div
        onClick={handleFlip}
        className="relative w-full cursor-pointer group-hover:[transform:rotateY(180deg)]"
        style={{
          aspectRatio: "9 / 16",
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
          <div className="bg-gray-900 px-3 py-2 flex items-center min-h-[44px]">
            {allergens.length > 0 ? (
              <div className="flex items-center gap-1.5">
                {allergens.slice(0, 5).map((allergen) => {
                  const Icon = getAllergenIcon(allergen);
                  const colors = getAllergenColors(allergen);
                  if (!Icon) return null;
                  return (
                    <div
                      key={allergen}
                      className={`w-7 h-7 rounded-full ${colors.bg} flex items-center justify-center`}
                      title={allergen.replace('_', ' ')}
                    >
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                  );
                })}
                {allergens.length > 5 && (
                  <span className="text-xs text-gray-500 ml-1">+{allergens.length - 5}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-wide">No Allergens Declared</span>
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
          <div className="bg-gray-900 px-3 py-3">
            <p className={`text-xl font-bold tabular-nums leading-none ${isChecked ? "text-emerald-400" : "text-white"}`}>
              {quantityDisplay}
            </p>
            <h3 className={`text-sm font-medium leading-tight mt-1.5 line-clamp-2 ${isChecked ? "text-gray-500 line-through" : "text-gray-300"}`}>
              {ingredientName}
            </h3>
          </div>
        </div>

        {/* ================================================================ */}
        {/* BACK FACE - L5 Style (matches RecipeFlipCard exactly)            */}
        {/* ================================================================ */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-gray-700/50 shadow-xl bg-gray-800/50"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="h-full flex flex-col p-3 overflow-y-auto scrollbar-thin">
            {/* Header - Name left, Status right (matches RecipeFlipCard) */}
            <div className="flex items-start justify-between mb-3 pb-2 border-b border-gray-700/50">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                  {ingredientName}
                </h3>
              </div>
              {/* Status Badge - L5 Round */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                  isChecked ? "bg-emerald-500/20" : "bg-gray-500/20"
                }`}
              >
                <CheckCircle className={`w-3.5 h-3.5 ${isChecked ? "text-emerald-400" : "text-gray-400"}`} />
              </div>
            </div>

            {/* Two-Column Grid - L5 Pattern (matches RecipeFlipCard) */}
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Location */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-md bg-gray-700/50 flex items-center justify-center">
                      <MapPin className="w-3 h-3 text-gray-400" />
                    </span>
                    LOCATION
                  </div>
                  <span className={`text-xs ${chefNotes.storageLocation ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                    {chefNotes.storageLocation || "Unassigned"}
                  </span>
                </div>

                {/* Prep State */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-md bg-gray-700/50 flex items-center justify-center">
                      <Thermometer className="w-3 h-3 text-gray-400" />
                    </span>
                    PREP STATE
                  </div>
                  <span className={`text-xs ${chefNotes.prepState ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                    {chefNotes.prepState || "As received"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Quantity */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-md bg-gray-700/50 flex items-center justify-center">
                      <Scale className="w-3 h-3 text-gray-400" />
                    </span>
                    QUANTITY
                  </div>
                  <span className="text-xs text-gray-300 font-medium">
                    {quantityDisplay}
                  </span>
                </div>

                {/* Lead Time */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-md bg-gray-700/50 flex items-center justify-center">
                      <Clock className="w-3 h-3 text-gray-400" />
                    </span>
                    LEAD TIME
                  </div>
                  <span className={`text-xs ${chefNotes.leadTime ? 'text-gray-300' : 'text-gray-500'}`}>
                    {chefNotes.leadTime || "—"}
                  </span>
                </div>
              </div>

              {/* Safety Note - Only if present */}
              {chefNotes.safetyNote && (
                <div className="pt-2 border-t border-gray-700/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 rounded-md bg-rose-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                    </span>
                    <span className="text-[10px] font-bold text-rose-400/80">
                      SAFETY
                    </span>
                  </div>
                  <span className="text-xs text-rose-300 px-2 py-1 bg-rose-500/20 rounded-lg border border-rose-500/30 inline-block">
                    {chefNotes.safetyNote}
                  </span>
                </div>
              )}

              {/* Allergens - L5 Style (matches RecipeFlipCard) */}
              <div className="pt-2 border-t border-gray-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-md bg-gray-700/50 flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3 text-gray-400" />
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">
                    ALLERGENS
                  </span>
                </div>
                {allergens.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergens.map((allergen) => {
                      const label = allergen.charAt(0).toUpperCase() + allergen.slice(1).replace(/_/g, ' ');
                      return (
                        <span
                          key={allergen}
                          className="text-xs font-semibold text-amber-300 px-2 py-1 bg-amber-500/20 rounded-lg border border-amber-500/40"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">None Declared</span>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm Button - L5 Style (matches RecipeFlipCard) */}
            <button
              onClick={handleCheck}
              className={`mt-3 w-full flex justify-center py-2 px-3 rounded-lg transition-colors text-xs font-medium items-center gap-2 ${
                isChecked
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-gray-700/70 hover:bg-gray-600/80 text-gray-300 hover:text-white"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {isChecked ? "Ready!" : "I Have This Ready"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngredientFlipCard;
