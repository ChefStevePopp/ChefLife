import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Hash,
  Check,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Search,
  Loader2,
  Package,
  DollarSign,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
  LifeBuoy,
} from "lucide-react";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { useOperationsStore } from "@/stores/operationsStore";
import { supabase } from "@/lib/supabase";
import { MasterIngredient } from "@/types/master-ingredient";
import { ParsedInvoice, ParsedLineItem } from "@/lib/vendorPdfParsers";
import toast from "react-hot-toast";

// =============================================================================
// INVOICE ENTRY PANEL - L5 Design (Hybrid Workflow)
// =============================================================================
// Unified review table for all import types (CSV, PDF, Photo)
// 
// WORKFLOW:
// 1. Parse spills items into editable table
// 2. User reviews, edits, adds missed rows
// 3. Process button splits items:
//    - Matched items → Audit Trail (prices updated)
//    - Unmatched items → Triage (for later completion)
//
// PRICING MODES:
// 1. Catch Weight: Order by case, price by weight (meat products)
// 2. Fixed Price: Order by case, price per case (boxed items)
// =============================================================================

// Weight-based units trigger catch weight pricing mode
const WEIGHT_UNITS = ['kg', 'lb', 'g', 'oz'];
const isWeightUnit = (unit: string) => WEIGHT_UNITS.some(w => unit.toLowerCase() === w.toLowerCase());

export type PricingMode = 'catch_weight' | 'fixed_price';

export interface LineItemState extends ParsedLineItem {
  id: string;
  isIncluded: boolean;  // Whether to process this row (replaces isVerified)
  isVerified?: boolean; // Legacy compatibility - maps from isIncluded
  matchedIngredientId?: string;
  matchedIngredientName?: string;
  matchConfidence?: number;
  isEditing?: boolean;
  // Order vs Delivery tracking
  quantityOrdered: number;
  quantityReceived: number;
  // Catch weight support
  pricingMode: PricingMode;
  weightReceived?: number;
  pricePerUnit: number;
  // Discrepancy tracking
  discrepancyType: 'none' | 'short' | 'over' | 'damaged' | 'substituted' | 'rejected' | 'other';
  discrepancyReason?: string;
  notes?: string;
  isExpanded?: boolean;
}

interface Props {
  parsedInvoice: ParsedInvoice | null;
  vendorId: string;
  onInvoiceDateChange: (date: Date) => void;
  onItemsChange: (items: LineItemState[]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const InvoiceEntryPanel: React.FC<Props> = ({
  parsedInvoice,
  vendorId,
  onInvoiceDateChange,
  onItemsChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState<LineItemState[]>([]);
  const [isMatchingItems, setIsMatchingItems] = useState(false);
  const [isParseInfoExpanded, setIsParseInfoExpanded] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MasterIngredient[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Operations store for purchase units
  const { settings: operationsSettings, fetchSettings: fetchOperationsSettings } = useOperationsStore();
  const purchaseUnits = operationsSettings?.purchase_unit_measures || ['Case', 'Each', 'kg', 'lb', 'Box', 'Bag'];

  // Fetch operations settings on mount
  useEffect(() => {
    fetchOperationsSettings();
  }, [fetchOperationsSettings]);

  // ---------------------------------------------------------------------------
  // INITIALIZE FROM PARSED INVOICE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (parsedInvoice) {
      // Set date
      if (parsedInvoice.invoiceDate) {
        const dateStr = parsedInvoice.invoiceDate.toISOString().split("T")[0];
        setInvoiceDate(dateStr);
        onInvoiceDateChange(parsedInvoice.invoiceDate);
      }
      
      // Set invoice number
      if (parsedInvoice.invoiceNumber) {
        setInvoiceNumber(parsedInvoice.invoiceNumber);
      }
      
      // Initialize items - ALL included by default
      const initialItems: LineItemState[] = parsedInvoice.lineItems.map((item, index) => {
        const unit = item.unit || 'Case';
        const isCatchWeight = WEIGHT_UNITS.some(w => unit.toLowerCase() === w.toLowerCase());
        
        return {
          ...item,
          id: `item-${index}-${Date.now()}`,
          isIncluded: true,  // All items included by default
          matchConfidence: 0,

          pricingMode: isCatchWeight ? 'catch_weight' : 'fixed_price',
          unit: unit,
          quantityOrdered: isCatchWeight ? 1 : item.quantity,
          quantityReceived: isCatchWeight ? 1 : item.quantity,
          weightReceived: isCatchWeight ? item.quantity : undefined,
          pricePerUnit: item.unitPrice,
          discrepancyType: 'none',
        };
      });
      
      setItems(initialItems);
      
      // Auto-match items to MIL
      if (initialItems.length > 0 && vendorId) {
        matchItemsToIngredients(initialItems);
      }
    }
  }, [parsedInvoice, vendorId]);

  // ---------------------------------------------------------------------------
  // NOTIFY PARENT OF CHANGES (only included items)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const includedItems = items.filter(item => item.isIncluded);
    const normalizedItems = includedItems.map(item => ({
      ...item,
      quantity: item.pricingMode === 'catch_weight' 
        ? (item.weightReceived || 0) 
        : item.quantityReceived,
      unitPrice: item.pricePerUnit,
      // Map isIncluded back to isVerified for parent compatibility
      isVerified: item.isIncluded,
    }));
    onItemsChange(normalizedItems);
  }, [items]);

  // ---------------------------------------------------------------------------
  // AUTO-MATCH TO MASTER INGREDIENTS
  // ---------------------------------------------------------------------------
  const matchItemsToIngredients = async (itemsToMatch: LineItemState[]) => {
    if (!vendorId) return;
    
    setIsMatchingItems(true);
    
    try {
      // Get all ingredients for this vendor
      const { data: vendorIngredients, error } = await supabase
        .from("master_ingredients_with_categories")
        .select("*")
        .eq("vendor", vendorId)
        .eq("ingredient_type", "purchased");

      if (error) throw error;

      // Also get ingredients from invoice history
      const { data: historyItems } = await supabase
        .from("vendor_invoice_items")
        .select(`
          master_ingredient_id,
          vendor_invoices!inner (vendor_id)
        `)
        .eq("vendor_invoices.vendor_id", vendorId)
        .not("master_ingredient_id", "is", null);

      const historyIds = [...new Set(
        (historyItems || []).map((h: any) => h.master_ingredient_id)
      )];

      let allIngredients = vendorIngredients || [];
      
      if (historyIds.length > 0) {
        const { data: historicalIngredients } = await supabase
          .from("master_ingredients_with_categories")
          .select("*")
          .in("id", historyIds);
        
        if (historicalIngredients) {
          const existingIds = new Set(allIngredients.map(i => i.id));
          historicalIngredients.forEach(ing => {
            if (!existingIds.has(ing.id)) {
              allIngredients.push(ing);
            }
          });
        }
      }

      // Match each item
      const matchedItems = itemsToMatch.map(item => {
        const match = findBestMatch(item, allIngredients);
        const confidence = match ? calculateMatchConfidence(item, match) : 0;
        return {
          ...item,
          matchedIngredientId: match?.id,
          matchedIngredientName: match?.product,
          matchConfidence: confidence,
          // Keep included - matching doesn't affect inclusion
        };
      });

      setItems(matchedItems);
      
      // Report match results
      const matchedCount = matchedItems.filter(i => i.matchedIngredientId).length;
      const unmatchedCount = matchedItems.filter(i => !i.matchedIngredientId).length;
      
      if (matchedCount > 0 && unmatchedCount === 0) {
        toast.success(`All ${matchedCount} items matched to ingredients`);
      } else if (matchedCount > 0) {
        toast.success(`Matched ${matchedCount} items, ${unmatchedCount} will go to Triage`);
      } else if (unmatchedCount > 0) {
        toast(`${unmatchedCount} new items will go to Triage`, { icon: "📥" });
      }
    } catch (error) {
      console.error("Error matching items:", error);
      toast.error("Failed to auto-match items");
    } finally {
      setIsMatchingItems(false);
    }
  };

  const findBestMatch = (
    item: ParsedLineItem,
    ingredients: MasterIngredient[]
  ): MasterIngredient | null => {
    // Try exact item code match first
    const codeMatch = ingredients.find(
      ing => ing.item_code?.toLowerCase() === item.itemCode.toLowerCase()
    );
    if (codeMatch) return codeMatch;

    // Try fuzzy name match
    const itemNameLower = item.productName.toLowerCase();
    const nameMatches = ingredients
      .map(ing => ({
        ingredient: ing,
        score: calculateNameSimilarity(itemNameLower, ing.product?.toLowerCase() || ""),
      }))
      .filter(m => m.score > 0.5)
      .sort((a, b) => b.score - a.score);

    return nameMatches[0]?.ingredient || null;
  };

  const calculateNameSimilarity = (a: string, b: string): number => {
    const wordsA = a.split(/\s+/).filter(w => w.length > 2);
    const wordsB = b.split(/\s+/).filter(w => w.length > 2);
    
    if (wordsA.length === 0 || wordsB.length === 0) return 0;
    
    const matches = wordsA.filter(wa => 
      wordsB.some(wb => wb.includes(wa) || wa.includes(wb))
    ).length;
    
    return matches / Math.max(wordsA.length, wordsB.length);
  };

  const calculateMatchConfidence = (item: ParsedLineItem, ingredient: MasterIngredient): number => {
    let confidence = 0;
    
    if (ingredient.item_code?.toLowerCase() === item.itemCode.toLowerCase()) {
      confidence += 60;
    }
    
    confidence += calculateNameSimilarity(
      item.productName.toLowerCase(),
      ingredient.product?.toLowerCase() || ""
    ) * 40;
    
    return Math.min(100, Math.round(confidence));
  };

  // ---------------------------------------------------------------------------
  // SEARCH FOR INGREDIENTS
  // ---------------------------------------------------------------------------
  const handleSearch = (query: string, index: number) => {
    setSearchQuery(query);
    setActiveSearchIndex(index);
    
    const input = inputRefs.current.get(index);
    if (input) {
      const rect = input.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("master_ingredients_with_categories")
          .select("*")
          .or(`product.ilike.%${query}%,item_code.ilike.%${query}%`)
          .eq("ingredient_type", "purchased")
          .limit(10);
        
        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const selectIngredient = (index: number, ingredient: MasterIngredient) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? {
        ...item,
        matchedIngredientId: ingredient.id,
        matchedIngredientName: ingredient.product,
        matchConfidence: 100,
        productName: ingredient.product || item.productName,
        itemCode: ingredient.item_code || item.itemCode,
      } : item
    ));
    setSearchResults([]);
    setActiveSearchIndex(null);
    setSearchQuery("");
  };

  // ---------------------------------------------------------------------------
  // ITEM HANDLERS
  // ---------------------------------------------------------------------------
  const updateItem = (index: number, field: keyof LineItemState, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const updates: Partial<LineItemState> = { [field]: value };
      
      if (field === 'unit') {
        const newMode: PricingMode = isWeightUnit(value) ? 'catch_weight' : 'fixed_price';
        if (newMode !== item.pricingMode) {
          updates.pricingMode = newMode;
          if (newMode === 'catch_weight') {
            updates.weightReceived = item.quantityReceived;
            updates.quantityReceived = 1;
          } else {
            updates.quantityReceived = item.weightReceived || 1;
            updates.weightReceived = undefined;
          }
        }
      }
      
      return { ...item, ...updates };
    }));
  };

  const toggleInclude = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isIncluded: !item.isIncluded } : item
    ));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      id: `item-new-${Date.now()}`,
      quantity: 1,
      itemCode: "",
      unit: "Case",
      unitPrice: 0,
      lineTotal: 0,
      productName: "",
      isIncluded: true,
      isEditing: true,
      pricingMode: 'fixed_price',
      quantityOrdered: 1,
      quantityReceived: 1,
      pricePerUnit: 0,
      discrepancyType: 'none',
    }]);
  };

  // ---------------------------------------------------------------------------
  // DATE HANDLER
  // ---------------------------------------------------------------------------
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceDate(e.target.value);
    onInvoiceDateChange(new Date(e.target.value));
  };

  // ---------------------------------------------------------------------------
  // CALCULATE LINE TOTAL
  // ---------------------------------------------------------------------------
  const calculateLineTotal = (item: LineItemState): number => {
    if (item.pricingMode === 'catch_weight') {
      return (item.weightReceived || 0) * item.pricePerUnit;
    }
    return item.quantityReceived * item.pricePerUnit;
  };

  // ---------------------------------------------------------------------------
  // DISCREPANCY HANDLERS
  // ---------------------------------------------------------------------------
  const handleQuantityChange = (index: number, field: 'quantityOrdered' | 'quantityReceived' | 'weightReceived', value: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const newItem = { ...item, [field]: value };
      
      if (item.pricingMode === 'catch_weight') {
        if (field === 'quantityReceived') {
          if (value < item.quantityOrdered) {
            newItem.discrepancyType = 'short';
          } else if (value > item.quantityOrdered) {
            newItem.discrepancyType = 'over';
          } else if (item.discrepancyType === 'short' || item.discrepancyType === 'over') {
            newItem.discrepancyType = 'none';
          }
        }
      } else {
        const ordered = field === 'quantityOrdered' ? value : item.quantityOrdered;
        const received = field === 'quantityReceived' ? value : item.quantityReceived;
        
        if (received < ordered) {
          newItem.discrepancyType = 'short';
        } else if (received > ordered) {
          newItem.discrepancyType = 'over';
        } else if (item.discrepancyType === 'short' || item.discrepancyType === 'over') {
          newItem.discrepancyType = 'none';
        }
      }
      
      return newItem;
    }));
  };

  const toggleExpanded = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isExpanded: !item.isExpanded } : item
    ));
  };

  // ---------------------------------------------------------------------------
  // COMPUTED - Split stats for action bar
  // ---------------------------------------------------------------------------
  const includedItems = items.filter(i => i.isIncluded);
  const matchedItems = includedItems.filter(i => i.matchedIngredientId);
  const unmatchedItems = includedItems.filter(i => !i.matchedIngredientId);
  
  const totalCount = items.length;
  const includedCount = includedItems.length;
  const matchedCount = matchedItems.length;
  const unmatchedCount = unmatchedItems.length;
  
  const invoiceTotal = includedItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const hasDiscrepancies = includedItems.some(i => i.discrepancyType !== 'none');
  
  const totalShortValue = includedItems.reduce((sum, item) => {
    if (item.discrepancyType === 'short') {
      if (item.pricingMode === 'fixed_price') {
        return sum + ((item.quantityOrdered - item.quantityReceived) * item.pricePerUnit);
      }
      return sum + ((item.quantityOrdered - item.quantityReceived) * item.pricePerUnit * 10);
    }
    return sum;
  }, 0);

  // ---------------------------------------------------------------------------
  // VALIDATION & SUBMIT
  // ---------------------------------------------------------------------------
  const [noInvoiceNumberConfirmed, setNoInvoiceNumberConfirmed] = useState(false);
  const [invoiceNumberPing, setInvoiceNumberPing] = useState(false);
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!invoiceNumber.trim() && !noInvoiceNumberConfirmed) {
      pingTimerRef.current = setTimeout(() => {
        setInvoiceNumberPing(true);
      }, 30000);
    } else {
      if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
      setInvoiceNumberPing(false);
    }
    return () => {
      if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
    };
  }, [invoiceNumber, noInvoiceNumberConfirmed]);

  const handleInvoiceNumberBlur = () => {
    if (!invoiceNumber.trim() && !noInvoiceNumberConfirmed) {
      setInvoiceNumberPing(true);
    }
  };

  const handleSubmit = () => {
    // Validate included items have required fields
    const incompleteItems = includedItems.filter(item => 
      !item.productName.trim() || 
      item.pricePerUnit <= 0
    );

    if (incompleteItems.length > 0) {
      const missing: string[] = [];
      if (incompleteItems.some(i => !i.productName.trim())) missing.push('product name');
      if (incompleteItems.some(i => i.pricePerUnit <= 0)) missing.push('price');
      
      toast.error(`${incompleteItems.length} item${incompleteItems.length > 1 ? 's' : ''} missing ${missing.join(' and ')}`);
      return;
    }

    if (!invoiceNumber.trim() && !noInvoiceNumberConfirmed) {
      toast.error('Confirm "No Invoice #" before saving');
      return;
    }

    if (includedCount === 0) {
      toast.error('No items selected for import');
      return;
    }

    onSubmit();
  };

  useEffect(() => {
    if (invoiceNumber.trim()) {
      setNoInvoiceNumberConfirmed(false);
    }
  }, [invoiceNumber]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full">
      {/* Header Info */}
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Invoice Date
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={handleDateChange}
              className="input w-full bg-gray-800 border-gray-700 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Invoice #
            </label>
            <div className="relative">
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                onBlur={handleInvoiceNumberBlur}
                placeholder="Enter invoice #"
                className="input w-full bg-gray-800 border-gray-700 text-sm pr-10"
              />
              {!invoiceNumber.trim() && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  {noInvoiceNumberConfirmed ? (
                    <div 
                      className="h-7 w-7 rounded-lg flex items-center justify-center bg-emerald-500/20 text-emerald-400"
                      title="No invoice # - confirmed"
                    >
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className={invoiceNumberPing ? 'animate-ping-rose rounded-lg' : ''}>
                      <TwoStageButton
                        onConfirm={() => setNoInvoiceNumberConfirmed(true)}
                        icon={AlertTriangle}
                        confirmText="No #?"
                        variant="danger"
                        title="No invoice number - click to confirm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Parse Confidence - Expandable Info Section */}
        {parsedInvoice && (
          <div className={`expandable-info-section ${isParseInfoExpanded ? 'expanded' : ''}`}>
            <button
              onClick={() => setIsParseInfoExpanded(!isParseInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                {parsedInvoice.parseConfidence >= 80 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : parsedInvoice.parseConfidence >= 50 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-300">
                  Parse Results: {parsedInvoice.parseConfidence}% confidence
                </span>
                {parsedInvoice.parseWarnings.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                    {parsedInvoice.parseWarnings.length} warning{parsedInvoice.parseWarnings.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Parsed</div>
                    <div className="text-lg font-semibold text-white">{parsedInvoice.totalItems}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Matched</div>
                    <div className="text-lg font-semibold text-emerald-400">{matchedCount}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">→ Triage</div>
                    <div className="text-lg font-semibold text-amber-400">{unmatchedCount}</div>
                  </div>
                </div>
                
                {parsedInvoice.parseWarnings.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Warnings</p>
                    <ul className="space-y-1">
                      {parsedInvoice.parseWarnings.map((warning, i) => (
                        <li key={i} className="text-sm text-amber-400 flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  Matched items will update prices. Unmatched items go to Triage for ingredient creation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="flex-1 overflow-hidden flex flex-col border border-gray-700/50 rounded-lg">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-1 p-3 bg-gray-800/50 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700/50">
          <div className="col-span-4 text-left pl-2">Product</div>
          <div className="col-span-1 text-center">Code</div>
          <div className="col-span-1 text-center">Ord</div>
          <div className="col-span-1 text-center">Rcvd</div>
          <div className="col-span-1 text-center">Unit</div>
          <div className="col-span-1 text-center">Price</div>
          <div className="col-span-1 text-center">Total</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto pb-20">
          {isMatchingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400 mr-2" />
              <span className="text-gray-400">Matching items to ingredients...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Package className="w-8 h-8 mb-2" />
              <p>No items yet</p>
              <button
                onClick={addItem}
                className="mt-2 text-primary-400 hover:text-primary-300 text-sm"
              >
                + Add item manually
              </button>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={item.id}>
                {/* Main Row */}
                <div
                  className={`grid grid-cols-12 gap-1 p-2 border-b border-gray-800/50 items-center hover:bg-gray-800/30 ${
                    !item.isIncluded 
                      ? "opacity-40" 
                      : item.discrepancyType !== 'none' 
                      ? "bg-rose-500/5 border-l-2 border-l-rose-500" 
                      : !item.matchedIngredientId
                      ? "bg-blue-950/40 border-l-2 border-l-blue-500"  // Dark blue for unmatched - matches CSV flow
                      : "bg-emerald-500/5 border-l-2 border-l-emerald-500"
                  }`}
                >
                  {/* Product Name with Search */}
                  <div className="col-span-4">
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current.set(index, el);
                        else inputRefs.current.delete(index);
                      }}
                      type="text"
                      value={activeSearchIndex === index ? searchQuery : item.productName}
                      onChange={(e) => handleSearch(e.target.value, index)}
                      onFocus={() => handleSearch(item.productName, index)}
                      onBlur={() => setTimeout(() => {
                        if (activeSearchIndex === index) {
                          // Save the edited name if user didn't select from search
                          if (searchQuery !== item.productName) {
                            updateItem(index, 'productName', searchQuery);
                          }
                          setActiveSearchIndex(null);
                          setSearchResults([]);
                          setDropdownPosition(null);
                        }
                      }, 200)}
                      className="input w-full bg-transparent border-0 p-1.5 text-sm text-left rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50 truncate"
                      placeholder="Search or type product name..."
                      title={item.productName}  // Full name on hover
                    />
                  </div>

                  {/* Item Code */}
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={item.itemCode}
                      onChange={(e) => updateItem(index, "itemCode", e.target.value)}
                      className="input w-full bg-transparent border-0 p-1.5 text-sm text-center text-gray-400 rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50"
                    />
                  </div>

                  {/* Quantity Ordered */}
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="1"
                      value={item.quantityOrdered}
                      onChange={(e) => handleQuantityChange(index, 'quantityOrdered', parseFloat(e.target.value) || 0)}
                      className="input w-full bg-transparent border-0 p-1.5 text-sm text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50"
                      min="0"
                      title="Cases ordered"
                    />
                  </div>

                  {/* Received */}
                  <div className="col-span-1">
                    {item.pricingMode === 'catch_weight' ? (
                      <input
                        type="number"
                        step="0.01"
                        value={item.weightReceived || ''}
                        onChange={(e) => updateItem(index, 'weightReceived', parseFloat(e.target.value) || 0)}
                        className="input w-full bg-transparent border-0 p-1.5 text-sm text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50 text-cyan-400"
                        min="0"
                        placeholder="kg"
                        title="Weight received (kg)"
                      />
                    ) : (
                      <input
                        type="number"
                        step="1"
                        value={item.quantityReceived}
                        onChange={(e) => handleQuantityChange(index, 'quantityReceived', parseFloat(e.target.value) || 0)}
                        className={`input w-full bg-transparent border-0 p-1.5 text-sm text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50 ${
                          item.discrepancyType === 'short' ? 'text-rose-400 font-medium' :
                          item.discrepancyType === 'over' ? 'text-amber-400 font-medium' : ''
                        }`}
                        min="0"
                        title="Quantity received"
                      />
                    )}
                  </div>

                  {/* Unit */}
                  <div className="col-span-1">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, "unit", e.target.value)}
                      className={`input w-full bg-transparent border-0 p-1.5 text-xs text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50 cursor-pointer ${
                        item.pricingMode === 'catch_weight' 
                          ? 'text-cyan-400' 
                          : 'text-gray-400'
                      }`}
                    >
                      {purchaseUnits.map((unit) => (
                        <option key={unit} value={unit} className="bg-gray-800">
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div className="col-span-1">
                    <div className="relative flex items-center">
                      <span className="absolute left-1 text-gray-600 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.pricePerUnit}
                        onChange={(e) => updateItem(index, "pricePerUnit", parseFloat(e.target.value) || 0)}
                        className="input w-full bg-transparent border-0 p-1 pl-4 text-sm text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50"
                      />
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="col-span-1 text-center text-sm text-gray-400 font-medium">
                    ${calculateLineTotal(item).toFixed(2)}
                  </div>

                  {/* Actions - Status icon + buttons */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {/* Match status indicator */}
                    {item.matchedIngredientId ? (
                      <div 
                        className="h-7 w-7 rounded-lg flex items-center justify-center bg-emerald-500/20 text-emerald-400 flex-shrink-0"
                        title={`Matched: ${item.matchedIngredientName}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div 
                        className="h-7 w-7 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400 flex-shrink-0"
                        title="Will go to Triage"
                      >
                        <LifeBuoy className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <button
                      onClick={() => toggleExpanded(index)}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                        item.notes || item.discrepancyType !== 'none'
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-gray-700/50 text-gray-500 hover:text-gray-300"
                      }`}
                      title="Notes & Discrepancy"
                    >
                      {item.isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => toggleInclude(index)}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                        item.isIncluded
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-700/50 text-gray-500 hover:text-gray-300"
                      }`}
                      title={item.isIncluded ? "Included - click to exclude" : "Excluded - click to include"}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <TwoStageButton
                      onConfirm={() => removeItem(index)}
                      icon={Trash2}
                      confirmText="Sure?"
                      variant="danger"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Expanded Row: Notes & Discrepancy */}
                {item.isExpanded && (
                  <div className="px-3 py-2 bg-gray-800/30 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                      {item.discrepancyType !== 'none' && (
                        <>
                          <select
                            value={item.discrepancyType}
                            onChange={(e) => updateItem(index, 'discrepancyType', e.target.value)}
                            className="input bg-gray-800 border-gray-700 text-sm py-1.5 px-2 w-28"
                          >
                            <option value="short">Short</option>
                            <option value="over">Over</option>
                            <option value="damaged">Damaged</option>
                            <option value="substituted">Substituted</option>
                            <option value="rejected">Rejected</option>
                            <option value="other">Other</option>
                          </select>
                          {item.discrepancyType === 'short' && item.pricingMode === 'fixed_price' && (
                            <span className="text-xs text-rose-400 whitespace-nowrap">
                              Credit: ${((item.quantityOrdered - item.quantityReceived) * item.pricePerUnit).toFixed(2)}
                            </span>
                          )}
                          <div className="w-px h-6 bg-gray-700" />
                        </>
                      )}
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-gray-500 whitespace-nowrap">Notes:</span>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          placeholder="e.g., 'Thighs shorted', 'Box damaged'..."
                          className="input flex-1 bg-gray-800 border-gray-700 text-sm py-1.5 px-2"
                        />
                      </div>
                      <button
                        onClick={() => toggleExpanded(index)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors flex-shrink-0"
                        title="Collapse"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Item Button */}
        {items.length > 0 && (
          <button
            onClick={addItem}
            className="w-full py-2 text-sm text-primary-400 hover:text-primary-300 hover:bg-gray-800/50 transition-colors border-t border-gray-700/50"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Add Item
          </button>
        )}
      </div>

      {/* Floating Action Bar - Shows split */}
      {totalCount > 0 && (
        <div className={`floating-action-bar ${hasDiscrepancies ? 'danger' : unmatchedCount > 0 ? 'warning' : ''}`}>
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              {/* Split indicator */}
              <div className="flex items-center gap-3 text-sm">
                {matchedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">{matchedCount}</span>
                    <span className="text-gray-500 text-xs">→ prices</span>
                  </div>
                )}
                {unmatchedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <LifeBuoy className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-medium">{unmatchedCount}</span>
                    <span className="text-gray-500 text-xs">→ triage</span>
                  </div>
                )}
              </div>
              
              {hasDiscrepancies && (
                <>
                  <div className="w-px h-6 bg-gray-700" />
                  <div className="flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-400 font-medium">${totalShortValue.toFixed(2)}</span>
                  </div>
                </>
              )}
              
              <div className="w-px h-6 bg-gray-700" />
              
              <div className="text-lg font-semibold text-white">
                ${invoiceTotal.toFixed(2)}
              </div>
              
              <div className="w-px h-6 bg-gray-700" />
              
              <button
                onClick={onCancel}
                className="btn-ghost text-sm py-1.5 px-4"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={includedCount === 0 || isSubmitting}
                className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Process {includedCount} Item{includedCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Search Dropdown */}
      {activeSearchIndex !== null && searchResults.length > 0 && dropdownPosition && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
          }}
        >
          {searchResults.map(ing => (
            <button
              key={ing.id}
              onMouseDown={() => selectIngredient(activeSearchIndex, ing)}
              className="w-full px-3 py-2 text-left hover:bg-gray-700/50 text-sm"
            >
              <div className="text-gray-200">{ing.product}</div>
              <div className="text-xs text-gray-500">{ing.item_code}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
