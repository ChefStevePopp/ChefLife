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
} from "lucide-react";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { useOperationsStore } from "@/stores/operationsStore";
import { supabase } from "@/lib/supabase";
import { MasterIngredient } from "@/types/master-ingredient";
import { ParsedInvoice, ParsedLineItem } from "@/lib/vendorPdfParsers";
import toast from "react-hot-toast";

// =============================================================================
// INVOICE ENTRY PANEL - L5 Design
// =============================================================================
// Left panel of two-column import workspace
// Editable item table with verification workflow
// C-suite accounting: Order vs Delivery tracking, discrepancy notes
// =============================================================================

export interface LineItemState extends ParsedLineItem {
  id: string;
  isVerified: boolean;
  matchedIngredientId?: string;
  matchedIngredientName?: string;
  matchConfidence?: number;
  isEditing?: boolean;
  // Order vs Delivery tracking
  quantityOrdered: number;
  quantityReceived: number;
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
      
      // Initialize items
      const initialItems: LineItemState[] = parsedInvoice.lineItems.map((item, index) => ({
        ...item,
        id: `item-${index}-${Date.now()}`,
        isVerified: false,
        matchConfidence: 0,
        // Default: ordered = received (no discrepancy)
        quantityOrdered: item.quantity,
        quantityReceived: item.quantity,
        discrepancyType: 'none',
      }));
      
      setItems(initialItems);
      
      // Auto-match items to MIL
      if (initialItems.length > 0 && vendorId) {
        matchItemsToIngredients(initialItems);
      }
    }
  }, [parsedInvoice, vendorId]);

  // ---------------------------------------------------------------------------
  // NOTIFY PARENT OF CHANGES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    onItemsChange(items);
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

      // Get unique ingredient IDs from history
      const historyIds = [...new Set(
        (historyItems || []).map((h: any) => h.master_ingredient_id)
      )];

      // Fetch those ingredients too
      let allIngredients = vendorIngredients || [];
      
      if (historyIds.length > 0) {
        const { data: historicalIngredients } = await supabase
          .from("master_ingredients_with_categories")
          .select("*")
          .in("id", historyIds);
        
        if (historicalIngredients) {
          // Merge, avoiding duplicates
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
        return {
          ...item,
          matchedIngredientId: match?.id,
          matchedIngredientName: match?.product,
          matchConfidence: match ? calculateMatchConfidence(item, match) : 0,
          isVerified: match ? calculateMatchConfidence(item, match) >= 90 : false,
        };
      });

      setItems(matchedItems);
      
      // Report match results
      const autoVerified = matchedItems.filter(i => i.isVerified).length;
      const needsReview = matchedItems.filter(i => !i.isVerified).length;
      
      if (autoVerified > 0) {
        toast.success(`Auto-matched ${autoVerified} items`);
      }
      if (needsReview > 0) {
        toast(`${needsReview} items need review`, { icon: "👀" });
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
    // Simple word overlap scoring
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
    
    // Item code match (high confidence)
    if (ingredient.item_code?.toLowerCase() === item.itemCode.toLowerCase()) {
      confidence += 60;
    }
    
    // Name similarity
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
    
    // Calculate dropdown position from input
    const input = inputRefs.current.get(index);
    if (input) {
      const rect = input.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    
    // Debounce search
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
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const toggleVerify = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isVerified: !item.isVerified } : item
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
      isVerified: false,
      isEditing: true,
      quantityOrdered: 1,
      quantityReceived: 1,
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
  // COMPUTED
  // ---------------------------------------------------------------------------
  const verifiedCount = items.filter(i => i.isVerified).length;
  const totalCount = items.length;
  const allVerified = totalCount > 0 && verifiedCount === totalCount;
  const invoiceTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantityReceived), 0);
  const hasDiscrepancies = items.some(i => i.discrepancyType !== 'none');
  const totalShortValue = items.reduce((sum, item) => {
    if (item.discrepancyType === 'short') {
      return sum + ((item.quantityOrdered - item.quantityReceived) * item.unitPrice);
    }
    return sum;
  }, 0);

  // Update discrepancy type when quantities change
  const handleQuantityChange = (index: number, field: 'quantityOrdered' | 'quantityReceived', value: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const newItem = { ...item, [field]: value };
      const ordered = field === 'quantityOrdered' ? value : item.quantityOrdered;
      const received = field === 'quantityReceived' ? value : item.quantityReceived;
      
      // Auto-detect discrepancy
      if (received < ordered) {
        newItem.discrepancyType = 'short';
      } else if (received > ordered) {
        newItem.discrepancyType = 'over';
      } else if (item.discrepancyType === 'short' || item.discrepancyType === 'over') {
        newItem.discrepancyType = 'none';
      }
      
      // Update legacy quantity field to received
      newItem.quantity = received;
      
      return newItem;
    }));
  };

  const toggleExpanded = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isExpanded: !item.isExpanded } : item
    ));
  };

  // ---------------------------------------------------------------------------
  // VALIDATION & SUBMIT
  // ---------------------------------------------------------------------------
  const [noInvoiceNumberConfirmed, setNoInvoiceNumberConfirmed] = useState(false);
  const [invoiceNumberPing, setInvoiceNumberPing] = useState(false);
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start 30 sec timer when field is empty and not confirmed
  useEffect(() => {
    if (!invoiceNumber.trim() && !noInvoiceNumberConfirmed) {
      pingTimerRef.current = setTimeout(() => {
        setInvoiceNumberPing(true);
      }, 30000);
    } else {
      // Clear timer and ping if they enter a number or confirm
      if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
      setInvoiceNumberPing(false);
    }
    return () => {
      if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
    };
  }, [invoiceNumber, noInvoiceNumberConfirmed]);

  // Trigger ping on blur from empty field
  const handleInvoiceNumberBlur = () => {
    if (!invoiceNumber.trim() && !noInvoiceNumberConfirmed) {
      setInvoiceNumberPing(true);
    }
  };

  const handleSubmit = () => {
    // Check for incomplete items (required for Triage pipeline)
    const incompleteItems = items.filter(item => 
      !item.productName.trim() || 
      item.unitPrice <= 0
    );

    if (incompleteItems.length > 0) {
      const missing: string[] = [];
      if (incompleteItems.some(i => !i.productName.trim())) missing.push('product name');
      if (incompleteItems.some(i => i.unitPrice <= 0)) missing.push('price');
      
      toast.error(`${incompleteItems.length} item${incompleteItems.length > 1 ? 's' : ''} missing ${missing.join(' and ')}`);
      return;
    }

    // Block if no invoice number and not confirmed
    if (!invoiceNumber.trim() && !noInvoiceNumberConfirmed) {
      toast.error('Confirm "No Invoice #" before saving');
      return;
    }

    onSubmit();
  };

  // Reset confirmation if they enter an invoice number
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
              {/* Two-stage confirmation when no invoice number - inside field */}
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
        
        {/* Parse Confidence */}
        {parsedInvoice && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            parsedInvoice.parseConfidence >= 80 
              ? "bg-emerald-500/10 text-emerald-400"
              : parsedInvoice.parseConfidence >= 50
              ? "bg-amber-500/10 text-amber-400"
              : "bg-rose-500/10 text-rose-400"
          }`}>
            {parsedInvoice.parseConfidence >= 80 ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>Parse confidence: {parsedInvoice.parseConfidence}%</span>
            {parsedInvoice.parseWarnings.length > 0 && (
              <span className="text-xs opacity-70">
                ({parsedInvoice.parseWarnings.length} warnings)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="flex-1 overflow-hidden flex flex-col border border-gray-700/50 rounded-lg">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 p-3 bg-gray-800/50 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700/50">
          <div className="col-span-3 text-center">Product</div>
          <div className="col-span-1 text-center">Code</div>
          <div className="col-span-1 text-center">Ordered</div>
          <div className="col-span-1 text-center">Received</div>
          <div className="col-span-1 text-center">Unit</div>
          <div className="col-span-1 text-center">Price</div>
          <div className="col-span-2 text-center">Total</div>
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
                  className={`grid grid-cols-12 gap-2 p-2 border-b border-gray-800/50 items-center hover:bg-gray-800/30 ${
                    item.discrepancyType !== 'none' 
                      ? "bg-rose-500/5 border-l-2 border-l-rose-500" 
                      : !item.isVerified 
                      ? "bg-amber-500/5" 
                      : ""
                  }`}
                >
                  {/* Product Name with Search */}
                  <div className="col-span-3 relative">
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
                          setActiveSearchIndex(null);
                          setSearchResults([]);
                          setDropdownPosition(null);
                        }
                      }, 200)}
                      className="input w-full bg-transparent border-0 p-1.5 text-sm text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50"
                      placeholder="Search..."
                    />
                    
                    {/* Match indicator */}
                    {item.matchConfidence !== undefined && item.matchConfidence > 0 && (
                      <div className={`absolute right-1 top-1/2 -translate-y-1/2 text-xs px-1 rounded ${
                        item.matchConfidence >= 90 
                          ? "bg-emerald-500/20 text-emerald-400"
                          : item.matchConfidence >= 50
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-rose-500/20 text-rose-400"
                      }`}>
                        {item.matchConfidence}%
                      </div>
                    )}
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
                      step="any"
                      value={item.quantityOrdered}
                      onChange={(e) => handleQuantityChange(index, 'quantityOrdered', parseFloat(e.target.value) || 0)}
                      className="input w-full bg-transparent border-0 p-1.5 text-sm text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50"
                      min="0"
                    />
                  </div>

                  {/* Quantity Received */}
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="any"
                      value={item.quantityReceived}
                      onChange={(e) => handleQuantityChange(index, 'quantityReceived', parseFloat(e.target.value) || 0)}
                      className={`input w-full bg-transparent border-0 p-1.5 text-sm text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50 ${
                        item.discrepancyType === 'short' ? 'text-rose-400 font-medium' :
                        item.discrepancyType === 'over' ? 'text-amber-400 font-medium' : ''
                      }`}
                      min="0"
                    />
                  </div>

                  {/* Purchase Unit */}
                  <div className="col-span-1">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, "unit", e.target.value)}
                      className="input w-full bg-transparent border-0 p-1.5 text-sm text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50 cursor-pointer"
                    >
                      {purchaseUnits.map((unit) => (
                        <option key={unit} value={unit} className="bg-gray-800">
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-1">
                    <div className="relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="input w-full bg-transparent border-0 p-1.5 pl-5 text-sm text-center rounded-lg focus:bg-slate-700/50 focus:ring-1 focus:ring-primary-500/50"
                      />
                    </div>
                  </div>

                  {/* Line Total (based on received) */}
                  <div className="col-span-2 text-center text-sm text-gray-400 font-medium">
                    ${(item.quantityReceived * item.unitPrice).toFixed(2)}
                  </div>

                  {/* Actions - L5 sizing: h-8 w-8 buttons, w-4 h-4 icons */}
                  <div className="col-span-2 flex items-center justify-center gap-1">
                    <button
                      onClick={() => toggleExpanded(index)}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                        item.notes || item.discrepancyType !== 'none'
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-gray-700/50 text-gray-500 hover:text-gray-300"
                      }`}
                      title="Notes & Discrepancy"
                    >
                      {item.isExpanded ? <ChevronUp className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => toggleVerify(index)}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                        item.isVerified
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-700/50 text-gray-500 hover:text-gray-300"
                      }`}
                      title={item.isVerified ? "Verified" : "Click to verify"}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <TwoStageButton
                      onConfirm={() => removeItem(index)}
                      icon={Trash2}
                      confirmText="Sure?"
                      variant="danger"
                    />
                  </div>
                </div>

                {/* Expanded Row: Notes & Discrepancy - Single line layout */}
                {item.isExpanded && (
                  <div className="px-3 py-2 bg-gray-800/30 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                      {/* Discrepancy Type */}
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
                          {item.discrepancyType === 'short' && (
                            <span className="text-xs text-rose-400 whitespace-nowrap">
                              Credit: ${((item.quantityOrdered - item.quantityReceived) * item.unitPrice).toFixed(2)}
                            </span>
                          )}
                          <div className="w-px h-6 bg-gray-700" />
                        </>
                      )}
                      {/* Notes - single line input */}
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
                      {/* Collapse button */}
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

      {/* Floating Action Bar */}
      {totalCount > 0 && (
        <div className={`floating-action-bar ${hasDiscrepancies ? 'danger' : !allVerified ? 'warning' : ''}`}>
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              {/* Verified count */}
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-gray-400">Verified:</span>
                <span className={verifiedCount === totalCount ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                  {verifiedCount}/{totalCount}
                </span>
              </div>
              
              {/* Shorts value (if any) */}
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
              
              {/* Invoice total */}
              <div className="text-lg font-semibold text-white">
                ${invoiceTotal.toFixed(2)}
              </div>
              
              <div className="w-px h-6 bg-gray-700" />
              
              {/* Actions */}
              <button
                onClick={onCancel}
                className="btn-ghost text-sm py-1.5 px-4"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allVerified || totalCount === 0 || isSubmitting}
                className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Search Dropdown - renders outside scroll container */}
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
