import React from "react";
import {
  AlertTriangle,
  Book,
  Shield,
  Wrench,
  Printer,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { AllergenBadge } from "@/features/allergens/components/AllergenBadge";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import type { Recipe } from "../../../types/recipe";

/**
 * =============================================================================
 * OVERVIEW TAB - Dashboard Card Grid (L5 Viewer Pattern)
 * =============================================================================
 * 
 * DESIGN PHILOSOPHY:
 * - Tabs own color identity - cards stay neutral
 * - Gray icon boxes don't compete with tab colors
 * - Darker header stripe creates visual hierarchy within cards
 * - Content area uses standard gray palette
 * 
 * Visual Reference:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ [Gray Icon] Card Title                          │ Header   │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │   Card content in gray palette                              │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Grid: 1 col mobile → 2 cols tablet → 3 cols desktop
 * =============================================================================
 */

interface OverviewProps {
  recipe: Recipe;
}

// ============================================================================
// VIEWER CARD COMPONENT - Neutral palette, header stripe
// ============================================================================
interface ViewerCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  stat?: string | number;  // Optional stat badge in header
  statLabel?: string;
}

const ViewerCard: React.FC<ViewerCardProps> = ({
  icon: Icon,
  title,
  children,
  stat,
  statLabel,
}) => {
  return (
    <div className="card overflow-hidden">
      {/* Header Bar - Darker stripe with gray icon */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-800/70 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          {/* Gray Icon Box - doesn't compete with tabs */}
          <div className="w-8 h-8 rounded-lg bg-gray-700/60 flex items-center justify-center">
            <Icon className="w-4 h-4 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-white">{title}</h3>
        </div>
        
        {/* Optional Stat Badge */}
        {stat !== undefined && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-700/50">
            <span className="text-sm font-medium text-gray-300">{stat}</span>
            {statLabel && (
              <span className="text-xs text-gray-500">{statLabel}</span>
            )}
          </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className="p-4 text-sm text-gray-400">
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const Overview: React.FC<OverviewProps> = ({ recipe }) => {
  const { showDiagnostics } = useDiagnostics();

  // Extract allergen data - SAME LOGIC AS ALLERGENS TAB
  const allergenData = recipe.allergenInfo || {};
  const containsAllergens = Array.isArray(allergenData.contains)
    ? allergenData.contains
    : [];
  const mayContainAllergens = Array.isArray(allergenData.mayContain)
    ? allergenData.mayContain
    : [];
  const crossContactAllergens = Array.isArray(allergenData.crossContactRisk)
    ? allergenData.crossContactRisk
    : [];
  const hasAllergens =
    containsAllergens.length > 0 ||
    mayContainAllergens.length > 0 ||
    crossContactAllergens.length > 0;

  // Label requirements
  const labelRequirements = recipe.label_requirements || {};
  const useLabelPrinter = recipe.use_label_printer || false;
  const hasLabelRequirements = labelRequirements.required_fields?.length > 0 || labelRequirements.example_photo_url;

  return (
    <div>
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono mb-4">
          src/features/recipes/components/RecipeViewer/components/Overview.tsx
        </div>
      )}

      {/* ================================================================
       * DASHBOARD CARD GRID
       * Mobile: 1 col | Tablet: 2 cols | Desktop: 3 cols
       * Tab identity comes from the tab bar - cards stay neutral
       * ================================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        
        {/* ALLERGENS */}
        <ViewerCard 
          icon={AlertTriangle} 
          title="Allergens"
        >
          {hasAllergens ? (
            <div className="space-y-3">
              {containsAllergens.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Contains</div>
                  <div className="flex flex-wrap gap-1.5">
                    {containsAllergens.map((allergen) => (
                      <AllergenBadge key={allergen} type={allergen} showLabel />
                    ))}
                  </div>
                </div>
              )}
              {mayContainAllergens.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">May Contain</div>
                  <div className="flex flex-wrap gap-1.5">
                    {mayContainAllergens.map((allergen) => (
                      <AllergenBadge key={allergen} type={allergen} showLabel />
                    ))}
                  </div>
                </div>
              )}
              {crossContactAllergens.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Cross-Contact</div>
                  <div className="flex flex-wrap gap-1.5">
                    {crossContactAllergens.map((allergen) => (
                      <AllergenBadge key={allergen} type={allergen} showLabel />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-500">No allergens declared</span>
          )}
        </ViewerCard>

        {/* DESCRIPTION */}
        {recipe.description && (
          <ViewerCard 
            icon={Book} 
            title="Description"
          >
            <p className="leading-relaxed">{recipe.description}</p>
          </ViewerCard>
        )}

        {/* CHEF'S NOTES */}
        {recipe.production_notes && (
          <ViewerCard 
            icon={Lightbulb} 
            title="Chef's Notes"
          >
            <p className="leading-relaxed italic text-gray-300">"{recipe.production_notes}"</p>
          </ViewerCard>
        )}

        {/* EQUIPMENT */}
        <ViewerCard 
          icon={Wrench} 
          title="Required Equipment"
        >
          {recipe.equipment?.length > 0 ? (
            <ul className="space-y-1.5">
              {recipe.equipment.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                  <span>{item.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-gray-500">No equipment specified</span>
          )}
        </ViewerCard>

        {/* CERTIFICATIONS */}
        <ViewerCard 
          icon={Shield} 
          title="Required Certifications"
        >
          {recipe.training?.certificationRequired?.length > 0 ? (
            <ul className="space-y-1.5">
              {recipe.training.certificationRequired.map((cert, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                  <span>{cert}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-gray-500">No certifications required</span>
          )}
        </ViewerCard>

        {/* LABELING */}
        {(hasLabelRequirements || useLabelPrinter) && (
          <ViewerCard 
            icon={Printer} 
            title="Label Requirements"
          >
            <div className="space-y-3">
              {/* Example Photo */}
              {labelRequirements.example_photo_url && (
                <div className="aspect-video bg-gray-900/50 rounded-lg overflow-hidden">
                  <img
                    src={labelRequirements.example_photo_url}
                    alt="Label example"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Required Fields */}
              {labelRequirements.required_fields?.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Required Fields</div>
                  <ul className="space-y-1">
                    {labelRequirements.required_fields.map((field: string) => (
                      <li key={field} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
                        <span>{field.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Print Button */}
              {useLabelPrinter && (
                <button className="btn-primary w-full text-sm mt-2">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Label
                </button>
              )}
            </div>
          </ViewerCard>
        )}
      </div>
    </div>
  );
};
