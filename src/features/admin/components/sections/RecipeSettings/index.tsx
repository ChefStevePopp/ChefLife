import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LibraryBig,
  ArrowLeft,
  Settings,
  FileSpreadsheet,
  Printer,
  Globe,
  AlertTriangle,
  Info,
  ChevronUp,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SECURITY_LEVELS } from "@/config/security";

// =============================================================================
// RECIPE SETTINGS - L3/L4 Shell
// =============================================================================
// Module configuration for Recipe Manager. This is the "set it once, revisit
// when needed" screen — separate from daily recipe workflow.
//
// PLANNED TABS:
// 1. General - Default station, storage, yield unit, version control
// 2. Import - Excel templates, column mappings, default values for imports
// 3. Print Templates - Recipe card layouts, fields, branding, scaling
// 4. Website Embed - iframe export, styling, which recipes, embed code
// 5. Allergen Portal - Customer-facing allergen display, disclaimers
//
// This is architectural documentation in code form. Each tab section is
// stubbed with clear descriptions of what will be built when we return
// post-Recipe Manager completion.
// =============================================================================

type TabId = "general" | "import" | "print" | "embed" | "allergens";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const TABS: Tab[] = [
  {
    id: "general",
    label: "General",
    icon: Settings,
    color: "primary",
    description: "Default values and workflow rules",
  },
  {
    id: "import",
    label: "Import",
    icon: FileSpreadsheet,
    color: "green",
    description: "Excel templates and column mappings",
  },
  {
    id: "print",
    label: "Print Templates",
    icon: Printer,
    color: "amber",
    description: "Recipe card layouts for kitchen and training",
  },
  {
    id: "embed",
    label: "Website Embed",
    icon: Globe,
    color: "cyan",
    description: "iframe exports for your website",
  },
  {
    id: "allergens",
    label: "Allergen Portal",
    icon: AlertTriangle,
    color: "rose",
    description: "Customer-facing allergen information",
  },
];

// =============================================================================
// PLACEHOLDER COMPONENT
// =============================================================================

interface PlaceholderSectionProps {
  tab: Tab;
  features: string[];
  notes?: string;
}

const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({ tab, features, notes }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = tab.icon;
  
  // Color mapping for icon backgrounds
  const bgColorMap: Record<string, string> = {
    primary: "bg-primary-500/20",
    green: "bg-green-500/20",
    amber: "bg-amber-500/20",
    cyan: "bg-cyan-500/20",
    rose: "bg-rose-500/20",
  };
  
  const textColorMap: Record<string, string> = {
    primary: "text-primary-400",
    green: "text-green-400",
    amber: "text-amber-400",
    cyan: "text-cyan-400",
    rose: "text-rose-400",
  };

  return (
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/50">
        <div className={`w-10 h-10 rounded-lg ${bgColorMap[tab.color]} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${textColorMap[tab.color]}`} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{tab.label}</h3>
          <p className="text-sm text-gray-400">{tab.description}</p>
        </div>
      </div>

      {/* Under Construction Notice */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-4">
        <div className="flex items-start gap-3">
          <Wrench className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300 font-medium">Coming Soon</p>
            <p className="text-sm text-gray-500 mt-1">
              This section is planned but not yet implemented. Below is the feature roadmap.
            </p>
          </div>
        </div>
      </div>

      {/* Planned Features */}
      <div className={`expandable-info-section ${isExpanded ? 'expanded' : ''}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300">Planned Features</span>
          </div>
          <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2 space-y-3">
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="text-gray-600 mt-1">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {notes && (
              <p className="text-xs text-gray-500 pt-3 border-t border-gray-700/50">
                💡 {notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const RecipeSettings: React.FC = () => {
  const navigate = useNavigate();
  const { securityLevel } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  
  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;
  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];

  // Feature lists for each tab
  const tabFeatures: Record<TabId, { features: string[]; notes?: string }> = {
    general: {
      features: [
        "Default station assignment for new recipes",
        "Default storage area dropdown values",
        "Default yield unit (portion, batch, pan, etc.)",
        "Default recipe status (draft requiring approval, or approved immediately)",
        "Cost calculation method (ingredients only, +labor, +overhead)",
        "Version control settings (auto-increment on save, require change notes)",
        "Who can edit approved recipes (permissions model)",
      ],
      notes: "These defaults reduce data entry time and ensure consistency across your recipe library.",
    },
    import: {
      features: [
        "Excel template configuration (your existing recipe spreadsheets)",
        "Column mapping interface (map your columns to ChefLife fields)",
        "Default values for imported recipes (station, status, etc.)",
        "Duplicate detection rules (match by name, code, or both)",
        "Import preview and validation before committing",
        "Batch import history and audit trail",
      ],
      notes: "Designed to migrate your existing Excel recipe library into ChefLife with minimal rework.",
    },
    print: {
      features: [
        "Kitchen Copy template (production-focused, large text, steps only)",
        "Training Copy template (full details, photos, quality standards)",
        "Costing Copy template (ingredients, costs, margins - for management)",
        "Custom template builder (drag-and-drop field selection)",
        "Branding options (logo, colors, header/footer)",
        "Portion scaling on print (print for 2x batch, etc.)",
        "QR code linking back to digital recipe",
      ],
      notes: "Different audiences need different views of the same recipe. A line cook doesn't need costing data.",
    },
    embed: {
      features: [
        "Embed code generator (iframe snippet for your website)",
        "Recipe browser embed (searchable list of public recipes)",
        "Single recipe embed (individual recipe cards)",
        "Styling options (match your website's look and feel)",
        "Which recipes to expose (all, tagged, or hand-picked)",
        "Responsive design for mobile viewing",
        "Analytics on embed views (how many customers viewed)",
      ],
      notes: "Let customers explore your recipes without leaving your website. Great for transparency and marketing.",
    },
    allergens: {
      features: [
        "Customer-facing allergen portal configuration",
        "Which allergens to display (Big 9, Big 14, or custom list)",
        "Menu item → allergen linking display",
        "Disclaimer text customization",
        "\"May contain\" vs \"Contains\" distinction",
        "Cross-contact risk disclosure",
        "Embed code for allergen portal on your website",
        "QR code generation for table tents",
      ],
      notes: "Protect your guests and your business. Clear allergen communication is essential for food safety.",
    },
  };

  return (
    <div className="space-y-6">
      {/* Diagnostic Path - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/RecipeSettings/index.tsx
        </div>
      )}

      {/* L5 Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/modules')}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Back to Feature Modules"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <LibraryBig className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Recipe Manager Settings
              </h1>
              <p className="text-gray-400 text-sm">
                Configure defaults, imports, and exports
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab ${tab.color} ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <PlaceholderSection 
        tab={currentTab} 
        features={tabFeatures[activeTab].features}
        notes={tabFeatures[activeTab].notes}
      />

      {/* Architecture Note */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-400">
              <strong className="text-gray-300">Architecture Note:</strong> This settings screen is separate from 
              Recipe Manager's daily workflow. Configure these options once, then revisit when your needs change. 
              Settings will persist to <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">organization.modules.recipes.config</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeSettings;
