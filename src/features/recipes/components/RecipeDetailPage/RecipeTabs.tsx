import React from "react";
import {
  FileText,
  ListOrdered,
  Factory,
  Tag,
  Warehouse,
  Wrench,
  Star,
  AlertTriangle,
  Image,
  GraduationCap,
  History,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * RecipeTabs - L5 Design System
 * Tab navigation for recipe detail page sections.
 * Now with change indicators showing which tabs have unsaved modifications.
 */

interface RecipeTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  changedTabs?: string[];
}

const TABS = [
  { id: "recipe", label: "Recipe Info", icon: FileText },
  { id: "instructions", label: "Instructions", icon: ListOrdered },
  { id: "production", label: "Production", icon: Factory },
  { id: "labels", label: "Labels", icon: Tag },
  { id: "storage", label: "Storage", icon: Warehouse },
  { id: "stations", label: "Stations", icon: Wrench },
  { id: "quality", label: "Quality", icon: Star },
  { id: "allergens", label: "Allergens", icon: AlertTriangle },
  { id: "media", label: "Media", icon: Image },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "versions", label: "Versions", icon: History },
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
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              isActive
                ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                : hasChanges
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
                : "bg-gray-800/50 text-gray-400 border border-transparent hover:bg-gray-800 hover:text-gray-300"
            }`}
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
