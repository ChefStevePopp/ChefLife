import React, { useState, useEffect } from "react";
import {
  Package,
  Upload,
  Trash2,
  Download,
  Settings,
  Calendar,
  ClipboardCheck,
} from "lucide-react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { ExcelDataGrid } from "@/shared/components/ExcelDataGrid";
import { ImportExcelModal } from "@/features/admin/components/ImportExcelModal";
import { WelcomeScreen } from "./WelcomeScreen";
import { CategoryStats } from "./CategoryStats";
import { inventoryColumns } from "./columns";
import { LoadingLogo } from "@/features/shared/components";
import { generateInventoryTemplate } from "@/utils/excel";
import { InventoryReview } from "./InventoryReview";
import toast from "react-hot-toast";

// =============================================================================
// TYPES
// =============================================================================

type TabId = "inventory" | "review" | "history" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string; // L5 color class: primary, green, amber, rose
}

// =============================================================================
// CONSTANTS - L5 Tab Color Progression
// =============================================================================

const TABS: Tab[] = [
  { id: "inventory", label: "Inventory", icon: Package, color: "primary" },
  { id: "review", label: "Review Counts", icon: ClipboardCheck, color: "green" },
  { id: "history", label: "History", icon: Calendar, color: "amber" },
  { id: "settings", label: "Settings", icon: Settings, color: "rose" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export const InventoryManagement: React.FC = () => {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<TabId>("inventory");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Settings state (will be persisted later)
  const [inventoryType, setInventoryType] = useState<"physical" | "prepared">("physical");
  const [inventoryFrequency, setInventoryFrequency] = useState<string>("weekly");
  const [countMethod, setCountMethod] = useState<string>("full");
  const [valuationMethod, setValuationMethod] = useState<string>("fifo");
  const [showZeroItems, setShowZeroItems] = useState(true);
  const [groupByLocation, setGroupByLocation] = useState(false);
  const [showVariance, setShowVariance] = useState(true);
  const [autoCalculateUsage, setAutoCalculateUsage] = useState(true);

  // ---------------------------------------------------------------------------
  // STORES
  // ---------------------------------------------------------------------------
  const {
    items,
    isLoading: isLoadingInventory,
    error: inventoryError,
    fetchItems,
    clearItems,
    importItems,
  } = useInventoryStore();

  const {
    ingredients: masterIngredients,
    isLoading: isLoadingIngredients,
    error: ingredientsError,
    fetchIngredients,
  } = useMasterIngredientsStore();

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchItems(), fetchIngredients()]);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [fetchItems, fetchIngredients]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleImport = async (data: any[]) => {
    try {
      await importItems(data);
      setIsImportModalOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to import data");
      }
    }
  };

  const handleClearData = async () => {
    if (!window.confirm("Are you sure you want to clear all inventory data? This cannot be undone.")) {
      return;
    }
    try {
      await clearItems();
    } catch (error) {
      toast.error("Failed to clear inventory data");
    }
  };

  const handleDownloadTemplate = () => {
    try {
      generateInventoryTemplate();
      toast.success("Template downloaded successfully");
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Failed to generate template");
    }
  };

  const handleApproveInventory = () => {
    setActiveTab("inventory");
    toast.success("Inventory session approved");
  };

  const handleRejectInventory = () => {
    setActiveTab("inventory");
  };

  // ---------------------------------------------------------------------------
  // DERIVED STATE
  // ---------------------------------------------------------------------------
  const isLoading = isLoadingInventory || isLoadingIngredients;
  const error = inventoryError || ingredientsError;

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/InventoryManagement/index.tsx (loading)
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingLogo message="Loading inventory data..." />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ERROR STATE
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/InventoryManagement/index.tsx (error)
        </div>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => fetchItems()} className="btn-ghost text-primary-400">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // WELCOME SCREEN (no inventory data yet)
  // ---------------------------------------------------------------------------
  if ((!items || items.length === 0) && activeTab === "inventory") {
    return (
      <div className="space-y-6">
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/InventoryManagement/index.tsx → WelcomeScreen
        </div>
        
        {/* L5 Header */}
        <Header activeTab={activeTab} />
        
        {/* L5 Tab Navigation */}
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab ${tab.color} ${activeTab === tab.id ? "active" : ""}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <WelcomeScreen
          onImport={() => setIsImportModalOpen(true)}
          onDownloadTemplate={handleDownloadTemplate}
        />

        <ImportExcelModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImport}
          type="inventory"
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      <div className="text-xs text-gray-500 font-mono">
        src/features/admin/components/sections/InventoryManagement/index.tsx → activeTab="{activeTab}"
      </div>

      {/* L5 Header */}
      <Header 
        activeTab={activeTab}
        onDownloadTemplate={handleDownloadTemplate}
        onClearData={handleClearData}
        onImport={() => setIsImportModalOpen(true)}
        hasItems={items && items.length > 0}
      />

      {/* L5 Tab Navigation - Using CSS classes from index.css */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab ${tab.color} ${activeTab === tab.id ? "active" : ""}`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <CategoryStats
              masterIngredients={masterIngredients}
              selectedCategories={[]}
              onToggleCategory={() => {}}
            />
            <div className="card p-6">
              <ExcelDataGrid
                columns={inventoryColumns}
                data={items}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                type="inventory"
              />
            </div>
          </div>
        )}

        {activeTab === "review" && (
          <InventoryReview
            onApprove={handleApproveInventory}
            onReject={handleRejectInventory}
          />
        )}

        {activeTab === "history" && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Inventory History</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Historical inventory data will be displayed here. Complete your first approved
              inventory session to see the history.
            </p>
          </div>
        )}

        {activeTab === "settings" && (
          <SettingsPanel
            inventoryType={inventoryType}
            setInventoryType={setInventoryType}
            inventoryFrequency={inventoryFrequency}
            setInventoryFrequency={setInventoryFrequency}
            countMethod={countMethod}
            setCountMethod={setCountMethod}
            valuationMethod={valuationMethod}
            setValuationMethod={setValuationMethod}
            showZeroItems={showZeroItems}
            setShowZeroItems={setShowZeroItems}
            groupByLocation={groupByLocation}
            setGroupByLocation={setGroupByLocation}
            showVariance={showVariance}
            setShowVariance={setShowVariance}
            autoCalculateUsage={autoCalculateUsage}
            setAutoCalculateUsage={setAutoCalculateUsage}
          />
        )}
      </div>

      {/* Import Modal */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        type="inventory"
      />
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** L5 Header - Context-dependent title and actions */
const Header: React.FC<{
  activeTab: TabId;
  onDownloadTemplate?: () => void;
  onClearData?: () => void;
  onImport?: () => void;
  hasItems?: boolean;
}> = ({ activeTab, onDownloadTemplate, onClearData, onImport, hasItems }) => {
  // L5 Header config with explicit Tailwind classes (can't use template literals)
  const config: Record<TabId, { 
    title: string; 
    subtitle: string; 
    icon: React.ElementType; 
    iconBg: string;
    iconText: string;
  }> = {
    inventory: {
      title: "Food Inventory",
      subtitle: "Track and manage your current inventory levels",
      icon: Package,
      iconBg: "bg-primary-500/20",
      iconText: "text-primary-400",
    },
    review: {
      title: "Review Inventory Counts",
      subtitle: "Review and approve inventory counts before finalizing",
      icon: ClipboardCheck,
      iconBg: "bg-green-500/20",
      iconText: "text-green-400",
    },
    history: {
      title: "Inventory History",
      subtitle: "View past inventory counts and trends",
      icon: Calendar,
      iconBg: "bg-amber-500/20",
      iconText: "text-amber-400",
    },
    settings: {
      title: "Inventory Settings",
      subtitle: "Configure inventory counting preferences",
      icon: Settings,
      iconBg: "bg-rose-500/20",
      iconText: "text-rose-400",
    },
  };

  const { title, subtitle, icon: Icon, iconBg, iconText } = config[activeTab];

  return (
    <header className="flex justify-between items-center p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconText}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-gray-400">{subtitle}</p>
        </div>
      </div>

      {/* Context-dependent actions */}
      {activeTab === "inventory" && onDownloadTemplate && onClearData && onImport && (
        <div className="flex gap-2">
          <button onClick={onDownloadTemplate} className="btn-ghost text-amber-400 hover:text-amber-300">
            <Download className="w-5 h-5 mr-2" />
            Download Template
          </button>
          <button
            onClick={onClearData}
            className="btn-ghost text-red-400 hover:text-red-300"
            disabled={!hasItems}
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Clear Data
          </button>
          <button onClick={onImport} className="btn-primary">
            <Upload className="w-5 h-5 mr-2" />
            Import Excel
          </button>
        </div>
      )}

      {activeTab === "history" && (
        <button className="btn-ghost text-amber-400 hover:text-amber-300">
          <Download className="w-5 h-5 mr-2" />
          Export Data
        </button>
      )}
    </header>
  );
};

/** Settings Panel */
const SettingsPanel: React.FC<{
  inventoryType: string;
  setInventoryType: (v: any) => void;
  inventoryFrequency: string;
  setInventoryFrequency: (v: any) => void;
  countMethod: string;
  setCountMethod: (v: any) => void;
  valuationMethod: string;
  setValuationMethod: (v: any) => void;
  showZeroItems: boolean;
  setShowZeroItems: (v: boolean) => void;
  groupByLocation: boolean;
  setGroupByLocation: (v: boolean) => void;
  showVariance: boolean;
  setShowVariance: (v: boolean) => void;
  autoCalculateUsage: boolean;
  setAutoCalculateUsage: (v: boolean) => void;
}> = ({
  inventoryType,
  setInventoryType,
  inventoryFrequency,
  setInventoryFrequency,
  countMethod,
  setCountMethod,
  valuationMethod,
  setValuationMethod,
  showZeroItems,
  setShowZeroItems,
  groupByLocation,
  setGroupByLocation,
  showVariance,
  setShowVariance,
  autoCalculateUsage,
  setAutoCalculateUsage,
}) => (
  <div className="card p-6">
    <h2 className="text-xl font-bold text-white mb-6">Inventory Configuration</h2>
    
    {/* Primary Settings */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Inventory Type
        </label>
        <select
          className="input w-full"
          value={inventoryType}
          onChange={(e) => setInventoryType(e.target.value)}
        >
          <option value="physical">Physical Inventory</option>
          <option value="prepared">Prepared Items</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Count Frequency
        </label>
        <select
          className="input w-full"
          value={inventoryFrequency}
          onChange={(e) => setInventoryFrequency(e.target.value)}
        >
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annually">Annually</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Count Method
        </label>
        <select
          className="input w-full"
          value={countMethod}
          onChange={(e) => setCountMethod(e.target.value)}
        >
          <option value="full">Full Inventory</option>
          <option value="partial">Partial (By Category)</option>
          <option value="spot-check">Spot Check</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Valuation Method
        </label>
        <select
          className="input w-full"
          value={valuationMethod}
          onChange={(e) => setValuationMethod(e.target.value)}
        >
          <option value="fifo">FIFO (First In, First Out)</option>
          <option value="lifo">LIFO (Last In, First Out)</option>
          <option value="weighted-average">Weighted Average</option>
        </select>
      </div>
    </div>

    {/* Display Options */}
    <h3 className="text-lg font-medium text-white mb-4">Display Options</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 cursor-pointer hover:bg-gray-900/70">
        <input
          type="checkbox"
          checked={showZeroItems}
          onChange={(e) => setShowZeroItems(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-300">Show Zero-Quantity Items</span>
      </label>

      <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 cursor-pointer hover:bg-gray-900/70">
        <input
          type="checkbox"
          checked={groupByLocation}
          onChange={(e) => setGroupByLocation(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-300">Group by Storage Location</span>
      </label>

      <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 cursor-pointer hover:bg-gray-900/70">
        <input
          type="checkbox"
          checked={showVariance}
          onChange={(e) => setShowVariance(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-300">Show Variance from Previous</span>
      </label>

      <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 cursor-pointer hover:bg-gray-900/70">
        <input
          type="checkbox"
          checked={autoCalculateUsage}
          onChange={(e) => setAutoCalculateUsage(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-300">Auto-Calculate Usage</span>
      </label>
    </div>

    {/* Save Button */}
    <div className="mt-8 flex justify-end">
      <button className="btn-primary" onClick={() => toast.success("Settings saved (not yet persisted)")}>
        Save Settings
      </button>
    </div>
  </div>
);
