import React from "react";
import {
  AlertTriangle,
  Book,
  Shield,
  Wrench,
  Printer,
  Lightbulb,
  Image,
  CheckCircle2,
} from "lucide-react";
import { AllergenBadge } from "@/features/allergens/components/AllergenBadge";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import type { Recipe } from "../../../types/recipe";

/**
 * =============================================================================
 * OVERVIEW TAB - Dashboard Card Grid (L5 Pattern)
 * =============================================================================
 * 
 * Uses L5 CSS classes from index.css:
 * - .card - Dashboard card container
 * - .icon-badge-{color} - Icon box with color identity
 * - .subheader - Optional subheader (not used here, cards are the content)
 * 
 * Tab Identity: Overview = primary (blue) - first in tab progression
 * Card Colors: Each card gets its own identity color via icon-badge
 * 
 * Grid: 2 columns on tablet+, single column mobile
 * =============================================================================
 */

interface OverviewProps {
  recipe: Recipe;
}

// ============================================================================
// DASHBOARD CARD COMPONENT (Using .card class from index.css)
// ============================================================================
interface DashboardCardProps {
  iconBadgeClass: string;  // e.g., "icon-badge-rose", "icon-badge-primary"
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  iconBadgeClass,
  icon: Icon,
  title,
  children,
}) => {
  return (
    <div className="card p-4">
      {/* Header: Icon Badge + Title */}
      <div className="flex items-center gap-3 mb-3">
        <div className={iconBadgeClass}>
          <Icon />
        </div>
        <h3 className="text-sm font-medium text-white">{title}</h3>
      </div>
      {/* Content: Gray palette */}
      <div className="text-sm text-gray-400">
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
       * Mobile: 1 col | Tablet+: 2 cols
       * Tab identity comes from the tab bar - no subheader needed here
       * ================================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* ALLERGENS - Rose identity */}
        <DashboardCard 
          iconBadgeClass="icon-badge-rose" 
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
            <span className="text-gray-500">No allergens flagged</span>
          )}
        </DashboardCard>

        {/* DESCRIPTION - Primary (tab identity) */}
        {recipe.description && (
          <DashboardCard 
            iconBadgeClass="icon-badge-primary" 
            icon={Book} 
            title="Description"
          >
            <p className="leading-relaxed">{recipe.description}</p>
          </DashboardCard>
        )}

        {/* CHEF'S NOTES - Amber */}
        {recipe.production_notes && (
          <DashboardCard 
            iconBadgeClass="icon-badge-amber" 
            icon={Lightbulb} 
            title="Chef's Notes"
          >
            <p className="leading-relaxed italic">"{recipe.production_notes}"</p>
          </DashboardCard>
        )}

        {/* EQUIPMENT - Emerald */}
        <DashboardCard 
          iconBadgeClass="icon-badge-emerald" 
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
        </DashboardCard>

        {/* CERTIFICATIONS - Purple */}
        <DashboardCard 
          iconBadgeClass="icon-badge-purple" 
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
        </DashboardCard>

        {/* LABELING - Gray (neutral utility) */}
        {(hasLabelRequirements || useLabelPrinter) && (
          <DashboardCard 
            iconBadgeClass="icon-badge-gray" 
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
          </DashboardCard>
        )}
      </div>
    </div>
  );
};
