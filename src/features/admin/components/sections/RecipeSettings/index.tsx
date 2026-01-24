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
  Save,
  RotateCcw,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SECURITY_LEVELS } from "@/config/security";
import { useRecipeConfig } from "@/features/recipes/hooks/useRecipeConfig";
import toast from "react-hot-toast";

// =============================================================================
// RECIPE SETTINGS - L3/L4 Shell
// =============================================================================
// Module configuration for Recipe Manager. This is the "set it once, revisit
// when needed" screen — separate from daily recipe workflow.
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
// GENERAL SETTINGS SECTION (LIVE)
// =============================================================================

const GeneralSettingsSection: React.FC = () => {
  const { config, updateConfig, resetConfig, DEFAULT_CONFIG } = useRecipeConfig();
  const [localUpdatedDays, setLocalUpdatedDays] = useState(config.updatedBadgeDays);
  const [localNewDays, setLocalNewDays] = useState(config.newBadgeDays);
  
  const hasChanges = 
    localUpdatedDays !== config.updatedBadgeDays || 
    localNewDays !== config.newBadgeDays;

  const handleSave = () => {
    updateConfig({
      updatedBadgeDays: localUpdatedDays,
      newBadgeDays: localNewDays,
    });
    toast.success('Recipe settings saved');
  };

  const handleReset = () => {
    setLocalUpdatedDays(DEFAULT_CONFIG.updatedBadgeDays);
    setLocalNewDays(DEFAULT_CONFIG.newBadgeDays);
    resetConfig();
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-700/50">
        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
          <Settings className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">General Settings</h3>
          <p className="text-sm text-gray-400">Configure recipe display and workflow defaults</p>
        </div>
      </div>

      {/* Badge Duration Settings */}
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Recipe Badge Display
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Control how long NEW and UPDATED badges appear on recipe cards in the Recipe Library.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NEW Badge Duration */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  <Sparkles className="w-3 h-3" />
                  NEW
                </span>
                <span className="text-sm text-gray-400">badge duration</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={localNewDays}
                  onChange={(e) => setLocalNewDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                  className="w-20 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
                <span className="text-sm text-gray-400">days after creation</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Recipes created within this window show a NEW badge.
              </p>
            </div>

            {/* UPDATED Badge Duration */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Clock className="w-3 h-3" />
                  UPDATED
                </span>
                <span className="text-sm text-gray-400">badge duration</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={localUpdatedDays}
                  onChange={(e) => setLocalUpdatedDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                  className="w-20 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
                <span className="text-sm text-gray-400">days after modification</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Recipes modified within this window show an UPDATED badge.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <button
            onClick={handleReset}
            className="btn-ghost text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`btn-primary text-sm ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Planned Features */}
      <PlannedFeaturesAccordion 
        features={[
          "Default station assignment for new recipes",
          "Default storage area dropdown values",
          "Default yield unit (portion, batch, pan, etc.)",
          "Default recipe status (draft requiring approval, or approved immediately)",
          "Cost calculation method (ingredients only, +labor, +overhead)",
          "Version control settings (auto-increment on save, require change notes)",
          "Who can edit approved recipes (permissions model)",
        ]}
        notes="These defaults reduce data entry time and ensure consistency across your recipe library."
      />
    </div>
  );
};

// =============================================================================
// PLANNED FEATURES ACCORDION
// =============================================================================

interface PlannedFeaturesAccordionProps {
  features: string[];
  notes?: string;
}

const PlannedFeaturesAccordion: React.FC<PlannedFeaturesAccordionProps> = ({ features, notes }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`expandable-info-section mt-6 ${isExpanded ? 'expanded' : ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="expandable-info-header w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300">More Features Coming Soon</span>
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
  );
};

// =============================================================================
// PLACEHOLDER COMPONENT (for other tabs)
// =============================================================================

interface PlaceholderSectionProps {
  tab: Tab;
  features: string[];
  notes?: string;
}

const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({ tab, features, notes }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = tab.icon;
  
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

  // Feature lists for placeholder tabs
  const tabFeatures: Record<TabId, { features: string[]; notes?: string }> = {
    general: { features: [], notes: "" }, // Handled by GeneralSettingsSection
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
      {activeTab === "general" ? (
        <GeneralSettingsSection />
      ) : (
        <PlaceholderSection 
          tab={currentTab} 
          features={tabFeatures[activeTab].features}
          notes={tabFeatures[activeTab].notes}
        />
      )}

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
