import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  X,
  Info,
  Tag,
  ArrowRightLeft,
  Calendar,
  Sparkles,
  Link2,
  Check,
  HelpCircle,
  Building2,
  Package,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { MasterIngredient } from "@/types/master-ingredient";
import toast from "react-hot-toast";

// =============================================================================
// Type for a suggested code group
// =============================================================================
interface SuggestedCodeGroup {
  key: string;
  vendor: string;
  productName: string;
  items: MasterIngredient[];
  codes: string[];
  codeCount: number;
}

// =============================================================================
// Wizard Steps
// =============================================================================
type WizardStep = "why" | "vendor" | "old-item" | "new-item" | "confirm" | "done";

const WIZARD_STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: "why", label: "Why Link?", number: 0 },
  { key: "vendor", label: "Vendor", number: 1 },
  { key: "old-item", label: "Old Item", number: 2 },
  { key: "new-item", label: "New Item", number: 3 },
  { key: "confirm", label: "Confirm", number: 4 },
  { key: "done", label: "Done", number: 5 },
];

export const ItemCodeGroupManager: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  
  const { ingredients, fetchIngredients, isLoading } = useMasterIngredientsStore();
  const { settings } = useOperationsStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedCodeGroup | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>("why");
  const [wizardVendor, setWizardVendor] = useState<string>("");
  const [wizardOldItem, setWizardOldItem] = useState<MasterIngredient | null>(null);
  const [wizardNewItem, setWizardNewItem] = useState<MasterIngredient | null>(null);
  const [wizardSearchOld, setWizardSearchOld] = useState("");
  const [wizardSearchNew, setWizardSearchNew] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Get vendors from operations settings
  const vendors = settings?.vendors || [];

  // Load ingredients on mount
  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // =============================================================================
  // SUGGESTED CODE GROUPS - Scan MIL for same vendor + EXACT same product + diff codes
  // =============================================================================
  const suggestedCodeGroups = useMemo(() => {
    const groups: Record<string, { 
      key: string;
      vendor: string; 
      productName: string; 
      items: MasterIngredient[];
    }> = {};
    
    ingredients.forEach((ing) => {
      if (!ing.vendor || !ing.product || !ing.item_code) return;
      
      const groupKey = `${ing.vendor.trim().toLowerCase()}|${ing.product.trim().toLowerCase()}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          vendor: ing.vendor,
          productName: ing.product,
          items: [],
        };
      }
      groups[groupKey].items.push(ing);
    });
    
    const suggestions: SuggestedCodeGroup[] = Object.values(groups)
      .filter((group) => {
        const uniqueCodes = new Set(group.items.map((i) => i.item_code));
        return uniqueCodes.size >= 2;
      })
      .map((group) => {
        const codes = [...new Set(group.items.map((i) => i.item_code).filter(Boolean))] as string[];
        return { ...group, codes, codeCount: codes.length };
      })
      .sort((a, b) => b.codeCount - a.codeCount);
    
    return suggestions;
  }, [ingredients]);

  // Filter suggestions based on search term
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm) return suggestedCodeGroups;
    const term = searchTerm.toLowerCase();
    return suggestedCodeGroups.filter(
      (group) =>
        group.vendor.toLowerCase().includes(term) ||
        group.productName.toLowerCase().includes(term) ||
        group.codes.some((code) => code.toLowerCase().includes(term))
    );
  }, [suggestedCodeGroups, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSuggestions.length / itemsPerPage));
  const paginatedSuggestions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSuggestions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSuggestions, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filter ingredients for wizard search (by selected vendor)
  const filteredOldItems = useMemo(() => {
    if (!wizardVendor || !wizardSearchOld) return [];
    const term = wizardSearchOld.toLowerCase();
    return ingredients
      .filter((ing) => 
        ing.vendor?.toLowerCase() === wizardVendor.toLowerCase() &&
        ing.item_code &&
        (ing.product.toLowerCase().includes(term) || 
         ing.item_code.toLowerCase().includes(term))
      )
      .slice(0, 10);
  }, [ingredients, wizardVendor, wizardSearchOld]);

  const filteredNewItems = useMemo(() => {
    if (!wizardVendor || !wizardSearchNew) return [];
    const term = wizardSearchNew.toLowerCase();
    return ingredients
      .filter((ing) => 
        ing.vendor?.toLowerCase() === wizardVendor.toLowerCase() &&
        ing.item_code &&
        ing.id !== wizardOldItem?.id && // Exclude the old item
        (ing.product.toLowerCase().includes(term) || 
         ing.item_code.toLowerCase().includes(term))
      )
      .slice(0, 10);
  }, [ingredients, wizardVendor, wizardSearchNew, wizardOldItem]);

  // Stats
  const totalSuggestions = suggestedCodeGroups.length;
  const totalCodesInvolved = suggestedCodeGroups.reduce((sum, g) => sum + g.codeCount, 0);

  // Reset wizard
  const resetWizard = () => {
    setWizardStep("why");
    setWizardVendor("");
    setWizardOldItem(null);
    setWizardNewItem(null);
    setWizardSearchOld("");
    setWizardSearchNew("");
    setIsCreating(false);
    setSelectedSuggestion(null);
  };

  // Start wizard
  const startWizard = () => {
    resetWizard();
    setIsCreating(true);
  };

  // Handle linking codes
  const handleLinkCodes = async () => {
    if (!wizardOldItem || !wizardNewItem) return;
    
    // TODO: Write to vendor_code_changes table
    toast.success(`Linked codes for "${wizardOldItem.product}"`);
    setWizardStep("done");
  };

  // Handle suggestion quick-link
  const handleSuggestionLink = async (suggestion: SuggestedCodeGroup) => {
    // TODO: Write to vendor_code_changes table
    toast.success(`Linked ${suggestion.codeCount} codes for "${suggestion.productName}"`);
  };

  // Get current step number for progress
  const currentStepNumber = WIZARD_STEPS.find(s => s.key === wizardStep)?.number || 0;

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/VendorInvoice/components/ItemCodeGroupManager.tsx
        </div>
      )}

      {/* L5 Sub-header */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box amber">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="subheader-title">Item Code Groups</h3>
              <p className="subheader-subtitle">Track code changes for the same product over time</p>
            </div>
          </div>
          
          <div className="subheader-right">
            {/* Stats Pills */}
            <span className="subheader-pill">
              <span className="subheader-pill-value">{totalSuggestions}</span>
              <span className="subheader-pill-label">Detected</span>
            </span>
            
            {/* Suggestions pill */}
            {suggestedCodeGroups.length > 0 && (
              <button
                onClick={startWizard}
                className="subheader-pill highlight animate-attention"
                title={`${suggestedCodeGroups.length} potential code changes detected`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="subheader-pill-value">{suggestedCodeGroups.length}</span>
                <span className="subheader-pill-label">Suggested</span>
              </button>
            )}
            
            {/* Divider */}
            <div className="subheader-divider" />
            
            {/* Action Buttons */}
            <button 
              onClick={() => fetchIngredients()} 
              className="btn-ghost px-2" 
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button onClick={startWizard} className="btn-ghost-blue ml-1">
              <Plus className="w-4 h-4 mr-1" />
              Link Codes
            </button>
          </div>
        </div>

        {/* Expandable Info Section */}
        <div className={`subheader-info expandable-info-section ${infoExpanded ? "expanded" : ""}`}>
          <button
            onClick={() => setInfoExpanded(!infoExpanded)}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white">About Item Code Groups</span>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${infoExpanded ? "" : "rotate-180"}`} />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <p className="text-sm text-gray-400">
                Code Groups track when the <span className="font-semibold">same product from the same vendor</span> has 
                multiple item codes. Linking codes preserves your price history when vendors change SKUs.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="subheader-feature-card">
                  <ArrowRightLeft className="w-4 h-4 text-amber-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Code Transitions</span>
                    <p className="subheader-feature-desc">Track when codes change (contract → market)</p>
                  </div>
                </div>
                
                <div className="subheader-feature-card">
                  <Tag className="w-4 h-4 text-amber-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Price Continuity</span>
                    <p className="subheader-feature-desc">Maintain price history across code changes</p>
                  </div>
                </div>
                
                <div className="subheader-feature-card">
                  <Calendar className="w-4 h-4 text-amber-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Vendor Accountability</span>
                    <p className="subheader-feature-desc">Vendors can't hide price creep behind SKU changes</p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Example: GFS Brisket #12345 (Contract) → #67890 (Market) — same product, different codes, one price history
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================== */}
      {/* INLINE WIZARD - Link Item Codes */}
      {/* =========================================================================== */}
      {isCreating && (
        <div className="card p-0 overflow-hidden border-amber-500/20">
          {/* Wizard Header with Progress */}
          <div className="bg-gray-800/80 px-4 py-3 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">Link Item Codes</h4>
                  <p className="text-xs text-gray-500">
                    {wizardStep === "done" ? "Complete!" : `Step ${currentStepNumber} of 4`}
                  </p>
                </div>
              </div>
              <button onClick={resetWizard} className="text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Progress Bar */}
            {wizardStep !== "done" && (
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      step <= currentStepNumber ? "bg-amber-500" : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Wizard Content */}
          <div className="p-4">
            {/* Step 0: Why */}
            {wizardStep === "why" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h5 className="text-base font-medium text-white mb-2">Why Link Codes?</h5>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      When vendors change item codes for the same product, your price history gets split 
                      into two separate items. Linking codes tells ChefLife <span className="text-amber-300">"these are the same product"</span> so 
                      your price tracking continues seamlessly.
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <p className="text-xs text-gray-500 mb-2">Example:</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-300">GFS Brisket</span>
                    <span className="font-mono text-amber-400">#12345</span>
                    <ArrowRight className="w-4 h-4 text-gray-600" />
                    <span className="font-mono text-amber-400">#67890</span>
                    <span className="text-xs text-gray-500">(catalog update)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Same product. One price history.</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setWizardStep("vendor")}
                    className="btn-primary"
                  >
                    Got it, Let's Start
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Select Vendor */}
            {wizardStep === "vendor" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-base font-medium text-white mb-1">Which vendor?</h5>
                    <p className="text-sm text-gray-500 mb-3">
                      Select the vendor that changed their item code.
                    </p>
                    
                    <select
                      value={wizardVendor}
                      onChange={(e) => setWizardVendor(e.target.value)}
                      className="input w-full max-w-md"
                    >
                      <option value="">Select a vendor...</option>
                      {vendors.map((vendor) => (
                        <option key={vendor} value={vendor}>{vendor}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setWizardStep("why")} className="btn-ghost">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep("old-item")}
                    className="btn-primary"
                    disabled={!wizardVendor}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Find OLD Item */}
            {wizardStep === "old-item" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-base font-medium text-white mb-1">Find the OLD item</h5>
                    <p className="text-sm text-gray-500 mb-3">
                      Search for the item with the code you <span className="text-amber-300">used to order</span>.
                    </p>
                    
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder={`Search ${wizardVendor} items...`}
                        value={wizardSearchOld}
                        onChange={(e) => setWizardSearchOld(e.target.value)}
                        className="input pl-10 w-full"
                        autoFocus
                      />
                    </div>

                    {/* Search Results */}
                    {wizardSearchOld && (
                      <div className="mt-2 max-w-md max-h-48 overflow-y-auto bg-gray-800/50 rounded-lg border border-gray-700/50">
                        {filteredOldItems.length === 0 ? (
                          <p className="p-3 text-sm text-gray-500">No items found</p>
                        ) : (
                          filteredOldItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setWizardOldItem(item);
                                setWizardSearchOld("");
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-700/50 transition-colors flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-300 truncate">{item.product}</span>
                              <span className="text-xs font-mono text-amber-400 ml-2">{item.item_code}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {/* Selected Item */}
                    {wizardOldItem && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{wizardOldItem.product}</p>
                            <p className="text-xs text-gray-500">
                              Code: <span className="font-mono text-amber-400">{wizardOldItem.item_code}</span>
                              {wizardOldItem.current_price && (
                                <span className="ml-2">${wizardOldItem.current_price.toFixed(2)}</span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => setWizardOldItem(null)}
                            className="text-gray-500 hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setWizardStep("vendor")} className="btn-ghost">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep("new-item")}
                    className="btn-primary"
                    disabled={!wizardOldItem}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Find NEW Item */}
            {wizardStep === "new-item" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-base font-medium text-white mb-1">Find the NEW item</h5>
                    
                    {/* Show old item reference */}
                    <div className="text-sm text-gray-500 mb-3">
                      OLD: <span className="text-gray-300">{wizardOldItem?.product}</span>
                      <span className="font-mono text-amber-400 ml-2">{wizardOldItem?.item_code}</span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3">
                      Now find the <span className="text-amber-300">replacement item</span> (new code, same product).
                    </p>
                    
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder={`Search ${wizardVendor} items...`}
                        value={wizardSearchNew}
                        onChange={(e) => setWizardSearchNew(e.target.value)}
                        className="input pl-10 w-full"
                        autoFocus
                      />
                    </div>

                    {/* Search Results */}
                    {wizardSearchNew && (
                      <div className="mt-2 max-w-md max-h-48 overflow-y-auto bg-gray-800/50 rounded-lg border border-gray-700/50">
                        {filteredNewItems.length === 0 ? (
                          <p className="p-3 text-sm text-gray-500">No items found</p>
                        ) : (
                          filteredNewItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setWizardNewItem(item);
                                setWizardSearchNew("");
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-700/50 transition-colors flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-300 truncate">{item.product}</span>
                              <span className="text-xs font-mono text-amber-400 ml-2">{item.item_code}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {/* Selected Item */}
                    {wizardNewItem && (
                      <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 max-w-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{wizardNewItem.product}</p>
                            <p className="text-xs text-gray-500">
                              Code: <span className="font-mono text-green-400">{wizardNewItem.item_code}</span>
                              {wizardNewItem.current_price && (
                                <span className="ml-2">${wizardNewItem.current_price.toFixed(2)}</span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => setWizardNewItem(null)}
                            className="text-gray-500 hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setWizardStep("old-item")} className="btn-ghost">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep("confirm")}
                    className="btn-primary"
                    disabled={!wizardNewItem}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {wizardStep === "confirm" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-base font-medium text-white mb-1">Confirm Link</h5>
                    <p className="text-sm text-gray-500 mb-4">
                      You're linking these two items as the <span className="text-amber-300">same product</span>:
                    </p>
                    
                    {/* Side by side comparison */}
                    <div className="grid grid-cols-2 gap-4 max-w-lg">
                      {/* Old Item */}
                      <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <p className="text-xs text-gray-500 mb-2">OLD CODE</p>
                        <p className="font-mono text-amber-400 text-lg mb-1">{wizardOldItem?.item_code}</p>
                        <p className="text-sm text-white truncate">{wizardOldItem?.product}</p>
                        {wizardOldItem?.current_price && (
                          <p className="text-xs text-gray-500 mt-1">${wizardOldItem.current_price.toFixed(2)}</p>
                        )}
                      </div>
                      
                      {/* Arrow */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden">
                        <ArrowRight className="w-6 h-6 text-amber-400" />
                      </div>
                      
                      {/* New Item */}
                      <div className="p-3 rounded-lg bg-gray-800/50 border border-green-500/20">
                        <p className="text-xs text-gray-500 mb-2">NEW CODE</p>
                        <p className="font-mono text-green-400 text-lg mb-1">{wizardNewItem?.item_code}</p>
                        <p className="text-sm text-white truncate">{wizardNewItem?.product}</p>
                        {wizardNewItem?.current_price && (
                          <p className="text-xs text-gray-500 mt-1">${wizardNewItem.current_price.toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 max-w-lg">
                      <p className="text-xs text-amber-300 flex items-start gap-2">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          This will combine price history from both codes. Only do this if they're 
                          truly the same product from the same vendor.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setWizardStep("new-item")} className="btn-ghost">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                  <button onClick={handleLinkCodes} className="btn-primary">
                    <Link2 className="w-4 h-4 mr-1" />
                    Yes, Link These Codes
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Done */}
            {wizardStep === "done" && (
              <div className="space-y-4 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                
                <div>
                  <h5 className="text-lg font-medium text-white mb-1">Codes Linked!</h5>
                  <p className="text-sm text-gray-400">
                    <span className="text-white">{wizardOldItem?.product}</span> now tracks price history 
                    across both codes.
                  </p>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button onClick={startWizard} className="btn-ghost">
                    Link Another
                  </button>
                  <button onClick={resetWizard} className="btn-primary">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Bar - Only show when not in wizard */}
      {!isCreating && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by vendor, product, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      )}

      {/* Suggestions List - Only show when not in wizard */}
      {!isCreating && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 rounded-xl">
              <div className="w-12 h-12 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center mb-3">
                <Boxes className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="text-base font-medium text-gray-300 mb-1">
                {searchTerm ? "No Matches" : "No Code Groups Detected"}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                {searchTerm
                  ? `No results for "${searchTerm}"`
                  : "When items with the same vendor and product name have different codes, they'll appear here."}
              </p>
              <button onClick={startWizard} className="btn-ghost text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                <Plus className="w-4 h-4 mr-1" />
                Manually Link Codes
              </button>
            </div>
          ) : (
            <>
              {paginatedSuggestions.map((group) => (
                <div 
                  key={group.key} 
                  className="card p-4 bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Boxes className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white flex items-center gap-2">
                          {group.productName}
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                            {group.codeCount} codes
                          </span>
                        </h3>
                        <p className="text-xs text-gray-500">
                          {group.vendor} • Codes: {group.codes.slice(0, 3).join(", ")}
                          {group.codes.length > 3 && ` +${group.codes.length - 3} more`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSuggestionLink(group)}
                      className="btn-ghost text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    >
                      <Link2 className="w-4 h-4 mr-1" />
                      Link
                    </button>
                  </div>
                </div>
              ))}

              {filteredSuggestions.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-gray-500">
                    {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredSuggestions.length)} of {filteredSuggestions.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-gray-800/50 text-gray-500 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-500 px-2">
                      {currentPage}/{totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg bg-gray-800/50 text-gray-500 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
