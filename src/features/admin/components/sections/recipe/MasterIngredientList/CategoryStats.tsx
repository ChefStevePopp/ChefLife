import React from "react";
import { MasterIngredient } from "@/types/master-ingredient";
import { Package, Layers, FolderTree, Grid3X3, TrendingUp } from "lucide-react";
import { StatBar, type StatItem } from "@/shared/components/StatBar";

// =============================================================================
// CATEGORY STATS - L5 Design
// =============================================================================
// Uses the L5 StatBar component with muted gray palette.
// Stats provide context without competing for visual attention.
// =============================================================================

interface CategoryStatsProps {
  ingredients: MasterIngredient[];
}

export const CategoryStats: React.FC<CategoryStatsProps> = ({ ingredients }) => {
  const stats = React.useMemo((): StatItem[] => {
    const activeIngredients = ingredients.filter((i) => !i.archived);
    const majorGroups = new Set(activeIngredients.map((i) => i.major_group).filter(Boolean));
    const categories = new Set(activeIngredients.map((i) => i.category).filter(Boolean));
    const subCategories = new Set(activeIngredients.map((i) => i.sub_category).filter(Boolean));
    const withPricing = activeIngredients.filter((i) => i.current_price && i.current_price > 0).length;
    const archivedCount = ingredients.filter((i) => i.archived).length;
    const pricingPercent = activeIngredients.length > 0 
      ? Math.round((withPricing / activeIngredients.length) * 100) 
      : 0;

    return [
      {
        icon: Package,
        label: "Ingredients",
        value: activeIngredients.length,
        subtext: archivedCount > 0 ? `+${archivedCount} archived` : undefined,
      },
      {
        icon: Layers,
        label: "Major Groups",
        value: majorGroups.size,
        subtext: "top-level",
      },
      {
        icon: FolderTree,
        label: "Categories",
        value: categories.size,
        subtext: "mid-level",
      },
      {
        icon: Grid3X3,
        label: "Sub-Categories",
        value: subCategories.size,
        subtext: "detail-level",
      },
      {
        icon: TrendingUp,
        label: "Priced",
        value: `${pricingPercent}%`,
        subtext: `${withPricing} of ${activeIngredients.length}`,
        progress: pricingPercent,
      },
    ];
  }, [ingredients]);

  return <StatBar stats={stats} primaryIndex={0} />;
};
