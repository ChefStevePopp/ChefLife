import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Printer,
  ChefHat,
  Clock,
  Scale,
  LayoutDashboard,
  UtensilsCrossed,
  BookOpen,
  Factory,
  Package,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  GraduationCap,
  Image,
  CheckCircle,
  FileEdit,
  Eye,
  Archive,
  FolderTree,
  ImageOff,
} from "lucide-react";
import { useRecipeStore } from "../../stores/recipeStore";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { getLucideIcon } from "@/utils/iconMapping";
import { Overview } from "./components/Overview";
import { Ingredients } from "./components/Ingredients";
import { Method } from "./components/Method";
import { Production } from "./components/Production";
import { Storage } from "./components/Storage";
import { Quality } from "./components/Quality";
import { Equipment } from "./components/Equipment";
import { Allergens } from "./components/Allergens";
import { Training } from "./components/Training";
import { Media } from "./components/Media";
import type { Recipe } from "../../types/recipe";

/**
 * =============================================================================
 * FULL PAGE VIEWER - FOH Recipe Display (L5 Pattern)
 * =============================================================================
 * 
 * DESIGN PHILOSOPHY:
 * - iPad landscape in folio is PRIMARY target (line cooks, prep cooks)
 * - Large touch targets for greasy/floury hands (min 44px)
 * - High contrast for busy kitchen lighting
 * - Quick-glance information hierarchy
 * 
 * L5 RESPONSIVE CONTAINER STRATEGY (apply to all user screens):
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Content Type          │ Max Width      │ Why                       │
 * ├───────────────────────┼────────────────┼───────────────────────────┤
 * │ Visual grids          │ 1600px         │ Flip cards, galleries     │
 * │ (ingredients, media)  │                │ need room for 4-5 cols    │
 * ├───────────────────────┼────────────────┼───────────────────────────┤
 * │ Dashboard cards       │ max-w-7xl      │ Overview, settings        │
 * │ (overview, etc)       │ (1280px)       │ 2-3 column grids          │
 * ├───────────────────────┼────────────────┼───────────────────────────┤
 * │ Text-heavy            │ max-w-4xl      │ Method steps, procedures  │
 * │ (method, training)    │ (896px)        │ Readable line lengths     │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * L5 STRUCTURE:
 * 1. Hero Header (image, back button, recipe name, quick stats)
 * 2. Horizontal Tab Pills (scrollable on mobile/tablet)
 * 3. Tab Content with premium morph transitions
 * 
 * Routes: /kitchen/recipes/:id
 * =============================================================================
 */

// ============================================================================
// TAB DEFINITIONS - L5 Color Progression
// Order: primary → green → amber → rose → purple → lime → red → cyan
// ============================================================================
const VIEWER_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, color: "primary" },
  { id: "ingredients", label: "Ingredients", icon: UtensilsCrossed, color: "green" },
  { id: "method", label: "Method", icon: BookOpen, color: "amber" },
  { id: "production", label: "Production", icon: Factory, color: "rose" },
  { id: "storage", label: "Storage", icon: Package, color: "purple" },
  { id: "quality", label: "Quality", icon: CheckCircle2, color: "lime" },
  { id: "allergens", label: "Allergens", icon: AlertTriangle, color: "red" },
  { id: "equipment", label: "Equipment", icon: Wrench, color: "cyan" },
  { id: "training", label: "Training", icon: GraduationCap, color: "primary" },
  { id: "media", label: "Media", icon: Image, color: "green" },
] as const;

type TabId = (typeof VIEWER_TABS)[number]["id"];

// ============================================================================
// LOADING SKELETON
// ============================================================================
const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-900">
    {/* Hero skeleton */}
    <div className="h-56 sm:h-64 bg-gray-800 animate-pulse" />
    
    {/* Tabs skeleton */}
    <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-3">
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-11 w-28 bg-gray-800 rounded-xl animate-pulse flex-shrink-0" />
        ))}
      </div>
    </div>
    
    {/* Content skeleton */}
    <div className="p-4 space-y-4">
      <div className="h-8 bg-gray-800 rounded-lg animate-pulse w-1/3" />
      <div className="h-32 bg-gray-800/50 rounded-lg animate-pulse" />
      <div className="h-48 bg-gray-800/50 rounded-lg animate-pulse" />
    </div>
  </div>
);

// ============================================================================
// STATUS CONFIG (matches admin PageHeader)
// ============================================================================
const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved":
      return {
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        icon: CheckCircle,
        label: "Approved",
      };
    case "draft":
      return {
        bg: "bg-amber-500/20",
        border: "border-amber-500/30",
        text: "text-amber-400",
        icon: FileEdit,
        label: "Draft",
      };
    case "review":
      return {
        bg: "bg-blue-500/20",
        border: "border-blue-500/30",
        text: "text-blue-400",
        icon: Eye,
        label: "In Review",
      };
    case "archived":
      return {
        bg: "bg-gray-500/20",
        border: "border-gray-500/30",
        text: "text-gray-400",
        icon: Archive,
        label: "Archived",
      };
    default:
      return null;
  }
};

// ============================================================================
// HERO HEADER COMPONENT (matches admin PageHeader design)
// ============================================================================
interface HeroHeaderProps {
  recipe: Recipe;
  onBack: () => void;
  onPrint: () => void;
}

const HeroHeader: React.FC<HeroHeaderProps> = ({ recipe, onBack, onPrint }) => {
  const [imageError, setImageError] = useState(false);
  
  // Get major group info from Food Relationships
  const { majorGroups, fetchFoodRelationships } = useFoodRelationshipsStore();

  useEffect(() => {
    if (majorGroups.length === 0) {
      fetchFoodRelationships();
    }
  }, [majorGroups.length, fetchFoodRelationships]);

  const majorGroup = useMemo(() => {
    if (!recipe.major_group) return null;
    return majorGroups.find((g) => g.id === recipe.major_group);
  }, [recipe.major_group, majorGroups]);

  // Dynamic icon based on major group or recipe type
  const GroupIcon = useMemo(() => {
    if (majorGroup?.icon) {
      return getLucideIcon(majorGroup.icon);
    }
    if (recipe.type === "prepared") return ChefHat;
    if (recipe.type === "final") return UtensilsCrossed;
    return FolderTree;
  }, [majorGroup?.icon, recipe.type]);

  // Primary image from media array
  const primaryImage = useMemo(() => {
    if (imageError) return null;
    const primaryMedia = recipe.media?.find((m) => m.is_primary && m.type === "image");
    return primaryMedia?.url || recipe.image_url || null;
  }, [recipe.media, recipe.image_url, imageError]);

  // Status config
  const statusConfig = recipe.status ? getStatusConfig(recipe.status) : null;
  const StatusIcon = statusConfig?.icon;

  // Major group display name
  const majorGroupName = majorGroup?.name 
    || recipe.major_group_name
    || (recipe.type === "prepared" ? "Prep Item" 
      : recipe.type === "final" ? "Final Plate" 
      : "Recipe");

  return (
    <div className="relative print:hidden">
      {/* ===================================================================
       * HERO BANNER - Responsive height matching admin PageHeader
       * Mobile: compact | Tablet: medium | Desktop: tall | 4K: impact
       * =================================================================== */}
      <div className="relative w-full h-32 sm:h-36 md:h-40 lg:h-48 xl:h-56 2xl:h-64 overflow-hidden">
        {/* Gradient Overlay - stronger at bottom for badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-gray-900/20 z-10" />

        {/* Background Image or Placeholder */}
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={recipe.name}
            className="w-full h-full object-cover object-center"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <ImageOff className="w-12 h-12 text-gray-700" />
          </div>
        )}

        {/* Top Left: Back Button + Major Group Badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-10 h-10 sm:w-11 sm:h-11 bg-gray-900/80 backdrop-blur-sm rounded-full flex items-center justify-center 
                       hover:bg-gray-800 active:bg-gray-700 transition-colors touch-manipulation"
            aria-label="Back to recipes"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          
          {/* Major Group Badge */}
          <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gray-900/90 border border-gray-700 flex items-center gap-1.5 sm:gap-2">
            <GroupIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-primary-400" />
            <span className="text-xs font-medium text-gray-300">{majorGroupName}</span>
          </div>
        </div>

        {/* Top Right: Print Button + Status Badge */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-2">
          {/* Status Badge (icon only, matches admin) */}
          {statusConfig && StatusIcon && (
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center`}
              title={`Status: ${statusConfig.label}`}
            >
              <StatusIcon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${statusConfig.text}`} />
            </div>
          )}
          
          <button
            onClick={onPrint}
            className="w-10 h-10 sm:w-11 sm:h-11 bg-gray-900/80 backdrop-blur-sm rounded-full flex items-center justify-center 
                       hover:bg-gray-800 active:bg-gray-700 transition-colors touch-manipulation"
            aria-label="Print recipe"
          >
            <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>

        {/* Center: Title + Station (vertically and horizontally centered, matches admin) */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center px-4">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
              {recipe.name || "Untitled Recipe"}
            </h1>
            {recipe.station && (
              <p className="font-body text-sm sm:text-base lg:text-lg text-gray-300 mt-1 drop-shadow-md">
                {recipe.station_name || recipe.station}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Right: Stat Pills (L5 colored badge style) */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 lg:bottom-5 lg:right-5 flex items-center gap-1.5 sm:gap-2 z-30">
          {/* Time pill - amber theme */}
          {(recipe.prep_time > 0 || recipe.cook_time > 0) && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-medium text-amber-300">
                {recipe.prep_time + recipe.cook_time}m
              </span>
            </div>
          )}
          
          {/* Yield pill - emerald theme */}
          {recipe.yield_amount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
              <Scale className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">
                {recipe.yield_amount} {recipe.yield_unit}
              </span>
            </div>
          )}

          {/* Version pill - purple theme */}
          {recipe.version && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs font-medium text-purple-300 backdrop-blur-sm">
              v{recipe.version}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HORIZONTAL TAB BAR COMPONENT - Uses .tab class from index.css
// ============================================================================
interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      const container = tabsRef.current;
      const tab = activeTabRef.current;

      // Calculate scroll position to center the tab
      const scrollLeft =
        tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2;
      
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: "smooth",
      });
    }
  }, [activeTab]);

  return (
    <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 print:hidden">
      <div
        ref={tabsRef}
        className="flex gap-2 p-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {VIEWER_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : undefined}
              onClick={() => onTabChange(tab.id)}
              className={`tab ${tab.color} ${isActive ? "active" : ""} flex-shrink-0 snap-start touch-manipulation min-h-[44px]`}
            >
              <TabIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Mobile swipe hint */}
      <div className="flex justify-center pb-2 sm:hidden">
        <span className="text-[10px] text-gray-600">← Swipe for more tabs →</span>
      </div>
    </div>
  );
};

// ============================================================================
// TAB CONTENT WITH PREMIUM MORPH
// ============================================================================
interface TabContentProps {
  activeTab: TabId;
  recipe: Recipe;
}

const TabContent: React.FC<TabContentProps> = ({ activeTab, recipe }) => {
  const [displayedTab, setDisplayedTab] = useState(activeTab);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Premium morph transition
  // Fix: Combined both state updates into single timeout to prevent
  // cleanup from clearing the fade-in timeout when displayedTab changes
  useEffect(() => {
    if (activeTab !== displayedTab) {
      setIsTransitioning(true);
      
      // After fade-out completes, switch content AND fade back in
      const timer = setTimeout(() => {
        setDisplayedTab(activeTab);
        // Use rAF to ensure React renders new content before fading in
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [activeTab, displayedTab]);

  // L5 Container Strategy:
  // - Visual grids (ingredients, media): Extra wide for card layouts
  // - Dashboard cards (overview): Wide for 2-3 column grids
  // - Text-heavy (method): Narrower for readable line lengths
  const getContainerClass = () => {
    switch (displayedTab) {
      case 'ingredients':
      case 'media':
        return 'max-w-[1600px]'; // Wide - flip cards, galleries
      case 'method':
        return 'max-w-4xl'; // Narrow - readable steps
      default:
        return 'max-w-7xl'; // Medium - dashboard cards
    }
  };

  const renderTabContent = () => {
    switch (displayedTab) {
      case "overview":
        return <Overview recipe={recipe} />;
      case "ingredients":
        return <Ingredients recipe={recipe} />;
      case "method":
        return <Method recipe={recipe} />;
      case "production":
        return <Production recipe={recipe} />;
      case "storage":
        return <Storage recipe={recipe} />;
      case "quality":
        return <Quality recipe={recipe} />;
      case "equipment":
        return <Equipment recipe={recipe} />;
      case "allergens":
        return <Allergens recipe={recipe} />;
      case "training":
        return <Training recipe={recipe} />;
      case "media":
        return <Media recipe={recipe} />;
      default:
        return <Overview recipe={recipe} />;
    }
  };

  return (
    <div
      className={`
        p-4 sm:p-6 transition-all duration-200
        ${isTransitioning ? "opacity-0 blur-[2px] translate-y-1" : "opacity-100 blur-0 translate-y-0"}
      `}
      style={{
        transitionTimingFunction: isTransitioning ? "ease-in" : "ease-out",
      }}
    >
      <div className={`${getContainerClass()} mx-auto`}>
        {renderTabContent()}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const FullPageViewer: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, fetchRecipes } = useRecipeStore();
  const { showDiagnostics } = useDiagnostics();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isLoading, setIsLoading] = useState(true);

  // Load recipes
  useEffect(() => {
    const loadRecipe = async () => {
      try {
        await fetchRecipes();
      } catch (error) {
        console.error("Error loading recipe:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRecipe();
  }, [fetchRecipes]);

  // Find the recipe
  const recipe = recipes.find((r) => r.id === id);

  // Handlers
  const handleBack = () => {
    navigate("/kitchen/recipes");
  };

  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Not found state
  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Recipe Not Found</h2>
          <p className="text-gray-400 mb-6">
            This recipe may have been removed or doesn't exist.
          </p>
          <button onClick={handleBack} className="btn-primary">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Recipes
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-900">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono p-2 bg-gray-900">
          src/features/recipes/components/RecipeViewer/FullPageViewer.tsx
        </div>
      )}

      {/* Hero Header */}
      <HeroHeader recipe={recipe} onBack={handleBack} onPrint={handlePrint} />

      {/* Horizontal Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content with Premium Morph */}
      <TabContent activeTab={activeTab} recipe={recipe} />

      {/* Print-only Header */}
      <div className="hidden print:block p-6 border-b-2 border-gray-300">
        <h1 className="text-3xl font-bold text-gray-900">{recipe.name}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          {recipe.station && <span>Station: {recipe.station_name || recipe.station}</span>}
          {recipe.yield_amount > 0 && <span>Yield: {recipe.yield_amount} {recipe.yield_unit}</span>}
          {(recipe.prep_time > 0 || recipe.cook_time > 0) && (
            <span>Time: {recipe.prep_time + recipe.cook_time} min</span>
          )}
        </div>
      </div>
    </div>
  );
};
