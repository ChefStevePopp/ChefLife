import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  X,
  Plus,
  Minus,
  Search,
  ShoppingCart,
  Receipt,
  Upload,
  Trash2,
  Check,
  ChevronRight,
  Store,
  Clock,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useOperationsStore } from "@/stores/operationsStore";
import { MasterIngredient } from "@/types/master-ingredient";
import toast from "react-hot-toast";

// =============================================================================
// MOBILE INVOICE - L6 Design
// =============================================================================
// Philosophy: Fast entry beats photo gymnastics
// See: docs/promises/PROMISE-Fast-Entry-Not-Photo-Gymnastics.md
// =============================================================================

interface CartItem {
  ingredient: MasterIngredient;
  quantity: number;
  unitPrice: number;
}

interface Vendor {
  id: string;
  name: string;
  lastUsed?: Date;
  invoiceCount?: number;
}

interface Props {
  selectedVendorId?: string;
  onSubmit: (data: any[], invoiceDate: Date, photoFile?: File) => void;
  onCancel: () => void;
}

type Step = "vendor" | "items" | "review";

export const MobileInvoice: React.FC<Props> = ({
  selectedVendorId,
  onSubmit,
  onCancel,
}) => {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const { user } = useAuth();
  const { settings, fetchSettings } = useOperationsStore();
  
  const [step, setStep] = useState<Step>(selectedVendorId ? "items" : "vendor");
  const [vendorId, setVendorId] = useState(selectedVendorId || "");
  const [vendorName, setVendorName] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  
  const [ingredients, setIngredients] = useState<MasterIngredient[]>([]);
  const [frequentItems, setFrequentItems] = useState<MasterIngredient[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const [tempQty, setTempQty] = useState("1");
  
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // LOAD VENDORS (from operations_settings, with invoice stats)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Ensure settings are loaded
    if (!settings) {
      fetchSettings();
      return;
    }

    const loadVendorStats = async () => {
      const vendorNames = settings.vendors || [];
      
      if (vendorNames.length === 0) {
        setVendors([]);
        return;
      }

      try {
        // Get invoice stats for each vendor
        const { data: invoiceStats, error } = await supabase
          .from("vendor_invoices")
          .select("vendor_id, invoice_date")
          .in("vendor_id", vendorNames)
          .order("invoice_date", { ascending: false });

        if (error) throw error;

        // Group stats by vendor
        const statsMap = new Map<string, { count: number; lastDate?: Date }>();
        
        (invoiceStats || []).forEach((inv: any) => {
          const existing = statsMap.get(inv.vendor_id);
          if (existing) {
            existing.count++;
          } else {
            statsMap.set(inv.vendor_id, {
              count: 1,
              lastDate: new Date(inv.invoice_date),
            });
          }
        });

        // Build vendor list with stats
        const vendorList: Vendor[] = vendorNames.map((name) => {
          const stats = statsMap.get(name);
          return {
            id: name, // vendor_id is the name string
            name: name,
            invoiceCount: stats?.count || 0,
            lastUsed: stats?.lastDate,
          };
        });

        // Sort: recent vendors first, then alphabetically
        vendorList.sort((a, b) => {
          if (a.lastUsed && b.lastUsed) {
            return b.lastUsed.getTime() - a.lastUsed.getTime();
          }
          if (a.lastUsed) return -1;
          if (b.lastUsed) return 1;
          return a.name.localeCompare(b.name);
        });

        setVendors(vendorList);
      } catch (error) {
        console.error("Error loading vendor stats:", error);
        // Fall back to just the vendor names without stats
        setVendors(
          vendorNames.map((name) => ({
            id: name,
            name: name,
            invoiceCount: 0,
          }))
        );
      }
    };

    loadVendorStats();
  }, [settings, fetchSettings]);

  // ---------------------------------------------------------------------------
  // LOAD VENDOR'S INGREDIENTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!vendorId) return;

    const loadVendorIngredients = async () => {
      setIsLoadingIngredients(true);
      try {
        // Get ingredients linked to this vendor via primary_vendor_id
        const { data: directIngredients, error: directError } = await supabase
          .from("master_ingredients")
          .select("*")
          .eq("primary_vendor_id", vendorId)
          .order("product");

        if (directError) throw directError;

        // Also get ingredients from invoice history for this vendor
        // vendor_invoice_items links through invoice_id to vendor_invoices.vendor_id
        const { data: invoiceIngredients, error: invoiceError } = await supabase
          .from("vendor_invoice_items")
          .select(`
            master_ingredient_id,
            master_ingredients (*),
            vendor_invoices!inner (vendor_id)
          `)
          .eq("vendor_invoices.vendor_id", vendorId)
          .not("master_ingredient_id", "is", null);

        if (invoiceError) {
          console.warn("Could not load invoice ingredients:", invoiceError);
          // Continue with just direct ingredients
        }

        // Merge and deduplicate
        const allIngredients = new Map<string, MasterIngredient>();
        
        (directIngredients || []).forEach((ing: MasterIngredient) => {
          allIngredients.set(ing.id, ing);
        });

        (invoiceIngredients || []).forEach((item: any) => {
          if (item.master_ingredients) {
            allIngredients.set(item.master_ingredients.id, item.master_ingredients);
          }
        });

        const ingredientList = Array.from(allIngredients.values());
        setIngredients(ingredientList);

        // Get frequent items (most purchased from this vendor)
        // Need to aggregate by ingredient across invoices
        if (invoiceIngredients && invoiceIngredients.length > 0) {
          const counts = new Map<string, { ingredient: MasterIngredient; count: number }>();
          
          invoiceIngredients.forEach((item: any) => {
            if (item.master_ingredients && item.master_ingredient_id) {
              const existing = counts.get(item.master_ingredient_id);
              if (existing) {
                existing.count++;
              } else {
                counts.set(item.master_ingredient_id, {
                  ingredient: item.master_ingredients,
                  count: 1,
                });
              }
            }
          });

          const sorted = Array.from(counts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)
            .map((c) => c.ingredient);

          setFrequentItems(sorted);
        } else {
          setFrequentItems([]);
        }
      } catch (error) {
        console.error("Error loading vendor ingredients:", error);
        toast.error("Failed to load vendor items");
        setIngredients([]);
        setFrequentItems([]);
      } finally {
        setIsLoadingIngredients(false);
      }
    };

    loadVendorIngredients();
  }, [vendorId]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const selectVendor = (vendor: Vendor) => {
    setVendorId(vendor.id);
    setVendorName(vendor.name);
    setStep("items");
  };

  const addToCart = (ingredient: MasterIngredient) => {
    // Check if already in cart
    const existing = cart.find((c) => c.ingredient.id === ingredient.id);
    if (existing) {
      toast.error("Item already in cart - tap to edit");
      return;
    }

    setActiveItemId(ingredient.id);
    setTempPrice(ingredient.current_price?.toString() || "");
    setTempQty("1");
    
    // Focus price input after render
    setTimeout(() => priceInputRef.current?.focus(), 100);
  };

  const confirmAddToCart = () => {
    if (!activeItemId) return;

    const ingredient = ingredients.find((i) => i.id === activeItemId);
    if (!ingredient) return;

    const price = parseFloat(tempPrice);
    const qty = parseInt(tempQty) || 1;

    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        ingredient,
        quantity: qty,
        unitPrice: price,
      },
    ]);

    setActiveItemId(null);
    setTempPrice("");
    setTempQty("1");
    toast.success(`Added ${ingredient.product}`);
  };

  const cancelAdd = () => {
    setActiveItemId(null);
    setTempPrice("");
    setTempQty("1");
  };

  const updateCartItem = (index: number, field: "quantity" | "unitPrice", value: number) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Photo too large. Maximum 10MB.");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  const handleSubmit = () => {
    if (cart.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    // Transform cart to expected format
    const data = cart.map((item) => ({
      item_code: item.ingredient.item_code,
      product_name: item.ingredient.product,
      unit_price: item.unitPrice,
      unit_of_measure: item.ingredient.case_size || "EA",
      quantity: item.quantity,
      master_ingredient_id: item.ingredient.id,
    }));

    onSubmit(data, new Date(invoiceDate), photoFile || undefined);
  };

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const filteredIngredients = ingredients.filter((i) =>
    i.product?.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.item_code?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const recentVendors = vendors.filter((v) => v.lastUsed).slice(0, 4);

  // ---------------------------------------------------------------------------
  // RENDER: VENDOR SELECTION
  // ---------------------------------------------------------------------------
  if (step === "vendor") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-primary-400" />
            Select Vendor
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recent Vendors */}
        {recentVendors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recent
            </p>
            <div className="grid grid-cols-2 gap-2">
              {recentVendors.map((vendor) => (
                <button
                  key={vendor.id}
                  onClick={() => selectVendor(vendor)}
                  className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-left transition-colors border border-gray-700/50"
                >
                  <p className="font-medium text-white truncate">{vendor.name}</p>
                  <p className="text-xs text-gray-500">
                    {vendor.invoiceCount} invoices
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            placeholder="Search vendors..."
            className="input w-full pl-10 bg-gray-800 border-gray-700"
          />
        </div>

        {/* All Vendors */}
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {filteredVendors.map((vendor) => (
            <button
              key={vendor.id}
              onClick={() => selectVendor(vendor)}
              className="w-full p-3 hover:bg-gray-800/50 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <span className="text-gray-300 group-hover:text-white">
                {vendor.name}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: ITEM SELECTION
  // ---------------------------------------------------------------------------
  if (step === "items") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                setStep("vendor");
                setVendorId("");
                setVendorName("");
                setIngredients([]);
                setCart([]);
              }}
              className="text-xs text-primary-400 hover:text-primary-300 mb-1"
            >
              ← Change Vendor
            </button>
            <h3 className="text-lg font-medium text-white">{vendorName}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Date */}
        <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <Receipt className="w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="input bg-transparent border-0 p-0 text-sm flex-1"
          />
        </div>

        {/* Search Items */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search items..."
            className="input w-full pl-10 bg-gray-800 border-gray-700"
          />
        </div>

        {/* Frequent Items */}
        {frequentItems.length > 0 && !itemSearch && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Star className="w-3 h-3" />
              Frequently Purchased
            </p>
            <div className="flex flex-wrap gap-2">
              {frequentItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={cart.some((c) => c.ingredient.id === item.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    cart.some((c) => c.ingredient.id === item.id)
                      ? "bg-green-500/20 text-green-400 cursor-default"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  {cart.some((c) => c.ingredient.id === item.id) && (
                    <Check className="w-3 h-3 inline mr-1" />
                  )}
                  {item.product}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price Entry Modal */}
        {activeItemId && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-t-xl sm:rounded-xl w-full max-w-sm border border-gray-700 shadow-xl">
              <div className="p-4 border-b border-gray-800">
                <h4 className="font-medium text-white">
                  {ingredients.find((i) => i.id === activeItemId)?.product}
                </h4>
                <p className="text-sm text-gray-500">
                  {ingredients.find((i) => i.id === activeItemId)?.item_code}
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTempQty(Math.max(1, parseInt(tempQty) - 1).toString())}
                      className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                      className="input text-center w-20 bg-gray-800 border-gray-700"
                      min="1"
                    />
                    <button
                      onClick={() => setTempQty((parseInt(tempQty) + 1).toString())}
                      className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Unit Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      ref={priceInputRef}
                      type="number"
                      step="0.01"
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                      placeholder="0.00"
                      className="input w-full pl-7 bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-800 flex gap-2">
                <button
                  onClick={cancelAdd}
                  className="flex-1 btn-ghost bg-gray-800 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddToCart}
                  className="flex-1 btn-primary"
                >
                  Add to Invoice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Item List */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {isLoadingIngredients ? (
            <div className="text-center py-8 text-gray-500">
              Loading vendor items...
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No items found for this vendor</p>
              <p className="text-xs text-gray-600">
                Items will appear here after you import invoices from this vendor
              </p>
            </div>
          ) : (
            filteredIngredients.map((item) => {
              const inCart = cart.find((c) => c.ingredient.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => !inCart && addToCart(item)}
                  disabled={!!inCart}
                  className={`w-full p-3 rounded-lg text-left transition-colors flex items-center justify-between ${
                    inCart
                      ? "bg-green-500/10 border border-green-500/30"
                      : "hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${inCart ? "text-green-400" : "text-gray-300"}`}>
                      {item.product}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.item_code}
                      {item.current_price && ` • Last: $${item.current_price.toFixed(2)}`}
                    </p>
                  </div>
                  {inCart ? (
                    <span className="text-green-400 text-sm">
                      {inCart.quantity} × ${inCart.unitPrice.toFixed(2)}
                    </span>
                  ) : (
                    <Plus className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Cart Summary / Continue */}
        {cart.length > 0 && (
          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 pt-4 -mx-4 px-4 -mb-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-400">{cart.length} items</p>
                <p className="text-lg font-semibold text-white">
                  ${cartTotal.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setStep("review")}
                className="btn-primary"
              >
                Review Invoice
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: REVIEW & SUBMIT
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setStep("items")}
            className="text-xs text-primary-400 hover:text-primary-300 mb-1"
          >
            ← Back to Items
          </button>
          <h3 className="text-lg font-medium text-white">Review Invoice</h3>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white p-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Vendor & Date */}
      <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <p className="font-medium text-white">{vendorName}</p>
        <p className="text-sm text-gray-500">
          {new Date(invoiceDate).toLocaleDateString()}
        </p>
      </div>

      {/* Photo Attachment */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
          <Camera className="w-3 h-3" />
          Receipt Photo (Audit Trail)
        </p>
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Receipt"
              className="w-full h-32 object-cover rounded-lg border border-gray-700"
            />
            <button
              onClick={clearPhoto}
              className="absolute top-2 right-2 p-1 bg-gray-900/80 rounded-full hover:bg-gray-800"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-4 border-2 border-dashed border-gray-700 rounded-lg hover:border-gray-600 transition-colors flex flex-col items-center gap-2"
          >
            <ImageIcon className="w-6 h-6 text-gray-500" />
            <span className="text-sm text-gray-400">Attach receipt photo</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />
        <p className="text-xs text-gray-600">
          Optional - photo stored for audit trail
        </p>
      </div>

      {/* Cart Items */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Items ({cart.length})
        </p>
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {cart.map((item, index) => (
            <div
              key={item.ingredient.id}
              className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-300 truncate">
                  {item.ingredient.product}
                </p>
                <p className="text-xs text-gray-500">{item.ingredient.item_code}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateCartItem(index, "quantity", parseInt(e.target.value) || 1)
                  }
                  className="input w-12 text-center bg-gray-800 border-gray-700 p-1 text-sm"
                  min="1"
                />
                <span className="text-gray-600">×</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateCartItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                    }
                    className="input w-20 pl-5 bg-gray-800 border-gray-700 p-1 text-sm"
                  />
                </div>
              </div>
              <button
                onClick={() => removeFromCart(index)}
                className="p-1 text-gray-500 hover:text-rose-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total</span>
          <span className="text-xl font-semibold text-white">
            ${cartTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 btn-ghost bg-gray-800 hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 btn-primary"
        >
          <Check className="w-4 h-4 mr-2" />
          Save Invoice
        </button>
      </div>
    </div>
  );
};
