import React from "react";
import {
  Carrot,
  ListOrdered,
  Factory,
  Tag,
  Wrench,
  Star,
  AlertTriangle,
  Image,
  GraduationCap,
  History,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * =============================================================================
 * RECIPE TABS - L5 Design System
 * =============================================================================
 * Tab navigation for recipe detail page sections.
 * Uses .tab class with L5 color progression styling.
 * 
 * Tab order follows L5 color progression:
 * 1. Ingredients (Primary/Blue) - What goes IN + costing
 * 2. Instructions (Green) - How to make it
 * 3. Production (Amber) - What comes OUT + storage + temps
 * 4. Labels (Rose) - Labeling requirements
 * 5. Stations (Purple) - Equipment & workspace
 * 6. Quality (Lime) - Standards & plating
 * 7. Allergens (Red) - Safety info
 * 8. Media (Cyan) - Photos & videos
 * 9. Training (Primary) - Staff education
 * 10. Versions (Gray) - Change history
 * =============================================================================
 */

interface RecipeTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  changedTabs?: string[];
}

const TABS = [
  { id: "recipe", label: "Ingredients", icon: Carrot, color: "primary" },
  { id: "instructions", label: "Instructions", icon: ListOrdered, color: "green" },
  { id: "production", label: "Production", icon: Factory, color: "amber" },
  { id: "labels", label: "Labels", icon: Tag, color: "rose" },
  { id: "stations", label: "Stations", icon: Wrench, color: "purple" },
  { id: "quality", label: "Quality", icon: Star, color: "lime" },
  { id: "allergens", label: "Allergens", icon: AlertTriangle, color: "red" },
  { id: "media", label: "Media", icon: Image, color: "cyan" },
  { id: "training", label: "Training", icon: GraduationCap, color: "primary" },
  { id: "versions", label: "Versions", icon: History, color: "primary" },
];

export const RecipeTabs: React.FC<RecipeTabsProps> = ({
  activeTab,
  onTabChange,
  changedTabs = [],
}) => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="w-full min-w-0">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono mb-2">
          src/features/recipes/components/RecipeDetailPage/RecipeTabs.tsx
        </div>
      )}
      <div className="flex flex-wrap gap-1 pb-2">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasChanges = changedTabs.includes(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`tab ${tab.color} ${isActive ? "active" : ""}`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
              
              {/* Change indicator dot */}
              {hasChanges && (
                <span
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                    isActive ? "bg-primary-400" : "bg-amber-400"
                  } ring-2 ring-gray-900`}
                  title="Has unsaved changes"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecipeTabs;
