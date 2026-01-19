import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Save,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Ban,
  RefreshCw,
  Plus,
  Boxes,
  Umbrella,
  Trash2,
  Link,
  Shield,
  ChevronDown,
  ChevronUp,
  PackageX,
  MessageSquare,
} from "lucide-react";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { motion, AnimatePresence } from "framer-motion";
import { EditIngredientModal } from "@/features/admin/components/sections/recipe/MasterIngredientList/EditIngredientModal";
import { LinkExistingIngredientModal } from "./LinkExistingIngredientModal";
import { NewIngredientInline } from "./NewIngredientInline";
import type { MasterIngredient } from "@/types/master-ingredient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
// Note: bulkUpdatePrices moved to vendorInvoiceAuditService for audit trail integrity
import { processInvoiceWithAuditTrail, type InvoiceLineItem } from "@/lib/vendorInvoiceAuditService";

interface Props {
  data: any[];
  vendorId: string;
  invoiceDate?: Date;
  sourceFile?: File; // Source file for audit trail
  importType?: 'csv_import' | 'pdf_import' | 'mobile_import' | 'manual_entry';
  // Supersede tracking
  supersedeInfo?: { isSupersede: boolean; existingDate: string };
  onConfirm: () => void;
  onCancel: () => void;
  onDateChange?: (date: Date) => void;
}

interface PriceChange {
  itemCode: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  approved?: boolean;
  rejected?: boolean;
}

// =============================================================================
// DISCREPANCY HANDLING - Alpha Bug Fix
// =============================================================================
// Problem: $0.00 prices from shorted items were polluting price history
// Solution: Detect and flag discrepancy items, skip price updates for them
// =============================================================================

type DiscrepancyType = 'short' | 'damaged' | 'wrong_item' | 'price_mismatch';

interface DiscrepancyInfo {
  type: DiscrepancyType;
  notes?: string;
}

// Items with $0.00 or very low prices are suspicious
const isSuspiciousPrice = (price: number): boolean => price <= 0;

const DISCREPANCY_LABELS: Record<DiscrepancyType, string> = {
  short: 'Short',
  damaged: 'Damaged',
  wrong_item: 'Wrong Item',
  price_mismatch: 'Price Mismatch',
};

export const DataPreview: React.FC<Props> = ({
  data,
  vendorId,
  invoiceDate,
  sourceFile,
  importType = 'csv_import',
  supersedeInfo,
  onConfirm,
  onCancel,
  onDateChange,
}) => {
  const { user } = useAuth();
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [masterIngredients, setMasterIngredients] = useState<
    MasterIngredient[]
  >([]);
  const [linkingIngredient, setLinkingIngredient] = useState<{
    matches: MasterIngredient[];
    row: any;
  } | null>(null);
  const [newIngredient, setNewIngredient] =
    useState<Partial<MasterIngredient> | null>(null);
  const [excludedItems, setExcludedItems] = useState<string[]>([]);
  const [dateConfirmed, setDateConfirmed] = useState<boolean>(true);
  // Stage 2: Inline expansion state (replaces modal for new items)
  const [expandedItemCode, setExpandedItemCode] = useState<string | null>(null);
  const [skippedItems, setSkippedItems] = useState<string[]>([]);
  
  // Discrepancy handling - Alpha bug fix for $0.00 prices
  const [discrepancyItems, setDiscrepancyItems] = useState<Map<string, DiscrepancyInfo>>(new Map());
  const [expandedDiscrepancy, setExpandedDiscrepancy] = useState<string | null>(null);

  // Find price changes and existing items on component mount
  useEffect(() => {
    const findPriceChanges = async () => {
      try {
        // Get all master ingredients from the view
        const { data: ingredients, error } = await supabase
          .from("master_ingredients_with_categories")
          .select("*");

        if (error) throw error;
        setMasterIngredients(ingredients || []);

        // Remove duplicate item codes, keeping only the first occurrence
        const uniqueItemsMap = new Map();
        data.forEach((item) => {
          if (!uniqueItemsMap.has(item.item_code)) {
            uniqueItemsMap.set(item.item_code, item);
          }
        });
        const uniqueItems = Array.from(uniqueItemsMap.values());

        // Calculate price changes for existing items
        const changes = uniqueItems
          .map((item) => {
            const current = ingredients?.find(
              (p) => p.item_code === item.item_code.toString(),
            );

            if (!current) return null;

            const oldPrice = current.current_price;
            const newPrice = parseFloat(item.unit_price);
            const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

            return {
              itemCode: item.item_code,
              oldPrice,
              newPrice,
              changePercent,
            };
          })
          .filter(Boolean);

        setPriceChanges(changes);
      } catch (error) {
        console.error("Error finding price changes:", error);
        toast.error("Failed to check price changes");
      }
    };

    findPriceChanges();
  }, [data]);

  const handleConfirm = async () => {
    try {
      // Remove duplicate item codes, keeping only the first occurrence
      const uniqueItemsMap = new Map();
      data.forEach((item) => {
        if (!uniqueItemsMap.has(item.item_code)) {
          uniqueItemsMap.set(item.item_code, item);
        }
      });
      const uniqueItems = Array.from(uniqueItemsMap.values());

      // First ensure all items exist or are explicitly handled (excluded or skipped)
      const unhandledItems = uniqueItems.filter(
        (row) =>
          !masterIngredients.find(
            (mi) => mi.item_code === row.item_code.toString(),
          ) && 
          !excludedItems.includes(row.item_code.toString()) &&
          !skippedItems.includes(row.item_code.toString()),
      );

      if (unhandledItems.length > 0) {
        toast.error("Please handle all new items before confirming");
        return;
      }

      // Save skipped items to pending_import_items table
      if (skippedItems.length > 0) {
        const skippedItemsData = skippedItems.map((itemCode) => {
          const row = uniqueItems.find((r) => r.item_code.toString() === itemCode);
          return {
            organization_id: user.user_metadata.organizationId,
            vendor_id: vendorId,
            item_code: itemCode,
            product_name: row?.product_name || '',
            unit_price: row ? parseFloat(row.unit_price) : null,
            unit_of_measure: row?.unit_of_measure || null,
            status: 'pending',
            created_by: user.id,
          };
        });

        const { error: pendingError } = await supabase
          .from('pending_import_items')
          .upsert(skippedItemsData, { 
            onConflict: 'organization_id,vendor_id,item_code,status',
            ignoreDuplicates: true 
          });

        if (pendingError) {
          console.warn('Failed to save pending items (table may not exist yet):', pendingError);
        }
      }

      if (!user?.user_metadata?.organizationId) {
        toast.error("Organization ID is required");
        return;
      }

      if (!user?.id) {
        toast.error("User ID is required");
        return;
      }

      // Record approved price changes - EXCLUDE DISCREPANCY ITEMS (Alpha bug fix)
      // This is the key fix: items marked as discrepancies should NOT pollute price history
      const approvedChanges = priceChanges.filter((change) => {
        // Must be approved
        if (!change.approved) return false;
        // Must NOT be a discrepancy item
        if (discrepancyItems.has(change.itemCode)) return false;
        return true;
      });

      // Prepare line items for audit service (excluding excluded items)
      const lineItems: InvoiceLineItem[] = uniqueItems
        .filter((item) => !excludedItems.includes(item.item_code.toString()))
        .map((item) => ({
          item_code: item.item_code.toString(),
          product_name: item.product_name,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price),
          unit_of_measure: item.unit_of_measure,
          original_description: item.product_name,
        }));

      // Generate invoice number from vendor + date + timestamp
      const invoiceDateStr = invoiceDate 
        ? invoiceDate.toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];
      const invoiceNumber = sourceFile?.name 
        ? sourceFile.name.replace(/\.[^/.]+$/, '') // Remove file extension
        : `${vendorId}_${invoiceDateStr}_${Date.now()}`;

      // Process with full audit trail
      const result = await processInvoiceWithAuditTrail(
        {
          organizationId: user.user_metadata.organizationId,
          vendorId,
          invoiceNumber,
          invoiceDate: invoiceDate || new Date(),
          lineItems,
          sourceFile: sourceFile,
          importType,
          createdBy: user.id,
          // Supersede tracking from CSVUploader
          isSupersede: supersedeInfo?.isSupersede || false,
          supersededFilename: sourceFile?.name,
          versionNumber: supersedeInfo?.isSupersede ? 2 : 1,
        },
        approvedChanges.map((change) => ({
          itemCode: change.itemCode,
          newPrice: change.newPrice,
        }))
      );

      onConfirm();
      toast.success(
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>
            Import complete with full audit trail
            {result.priceChangesCount > 0 && (
              <span className="text-emerald-400 ml-1">
                ({result.priceChangesCount} price changes)
              </span>
            )}
          </span>
        </div>
      );
    } catch (error: any) {
      console.error("Error processing with audit trail:", error);
      toast.error(error.message || "Failed to process import");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* L5 Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">Review Import Data</h3>
            <p className="text-sm text-gray-400">
              Verify mapped data before importing with audit trail
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 mr-4">
            <label htmlFor="invoice-date" className="text-sm text-gray-400">
              Invoice Date:
            </label>
            <div className="relative flex items-center">
              <input
                type="date"
                id="invoice-date"
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1 text-sm text-white"
                value={
                  invoiceDate
                    ? invoiceDate.toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0]
                }
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime()) && onDateChange) {
                    onDateChange(newDate);
                    setDateConfirmed(false);
                    setTimeout(() => setDateConfirmed(true), 300);
                  }
                }}
              />
              {dateConfirmed && (
                <motion.div
                  className="ml-2 w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </motion.div>
              )}
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                const { data: ingredients, error } = await supabase
                  .from("master_ingredients_with_categories")
                  .select("*");

                if (error) throw error;
                setMasterIngredients(ingredients || []);

                const uniqueItemsMap = new Map();
                data.forEach((item) => {
                  if (!uniqueItemsMap.has(item.item_code)) {
                    uniqueItemsMap.set(item.item_code, item);
                  }
                });
                const uniqueItems = Array.from(uniqueItemsMap.values());

                const changes = uniqueItems
                  .map((item) => {
                    const current = ingredients?.find(
                      (p) => p.item_code === item.item_code.toString(),
                    );
                    if (!current) return null;
                    const oldPrice = current.current_price;
                    const newPrice = parseFloat(item.unit_price);
                    const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
                    return { itemCode: item.item_code, oldPrice, newPrice, changePercent };
                  })
                  .filter(Boolean);

                setPriceChanges(changes);
                toast.success("Data refreshed");
              } catch (error) {
                console.error("Error refreshing data:", error);
                toast.error("Failed to refresh data");
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <div className="w-5 h-5 rounded bg-gray-700/50 flex items-center justify-center">
              <RefreshCw className="w-3 h-3" />
            </div>
            Refresh
          </button>
          <button 
            onClick={onCancel} 
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <div className="w-5 h-5 rounded bg-gray-700/50 flex items-center justify-center">
              <X className="w-3 h-3" />
            </div>
            Cancel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                Item Code
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                Product Name
              </th>

              <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">
                Current Price
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">
                New Price
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">
                Change
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {/* Create a map to track seen item codes */}
            {(() => {
              const seenItemCodes = new Set();
              return data.map((row, index) => {
                // Skip duplicate item codes after the first occurrence
                if (seenItemCodes.has(row.item_code)) {
                  return null;
                }
                seenItemCodes.add(row.item_code);

                const matchingIngredient = masterIngredients.find(
                  (mi) => mi.item_code === row.item_code.toString(),
                );
                const isExisting = matchingIngredient !== undefined;
                const priceChange = priceChanges.find(
                  (p) => p.itemCode === row.item_code,
                );
                const hasChange =
                  priceChange && Math.abs(priceChange.changePercent) > 0;
                const nameMismatch =
                  isExisting && matchingIngredient.product !== row.product_name;
                const isExcluded = excludedItems.includes(
                  row.item_code.toString(),
                );

                const isExpanded = expandedItemCode === row.item_code.toString();
                const isSkipped = skippedItems.includes(row.item_code.toString());
                
                // Discrepancy detection - Alpha bug fix
                const newPrice = parseFloat(row.unit_price);
                const isSuspicious = isSuspiciousPrice(newPrice);
                const discrepancy = discrepancyItems.get(row.item_code.toString());
                const hasDiscrepancy = discrepancy !== undefined;
                const isDiscrepancyExpanded = expandedDiscrepancy === row.item_code.toString();

                return (
                  <React.Fragment key={index}>
                  <tr
                    className={`
                      ${isExisting ? "bg-gray-800/50" : ""} 
                      ${hasChange && !hasDiscrepancy ? "bg-amber-500/5" : ""} 
                      ${nameMismatch ? "bg-blue-500/5" : ""}
                      ${isExcluded ? "bg-gray-900/80 opacity-60" : ""}
                      ${isExpanded ? "bg-emerald-500/5 border-l-2 border-l-emerald-500" : ""}
                      ${isSkipped ? "bg-amber-500/5" : ""}
                      ${hasDiscrepancy ? "bg-rose-500/10 border-l-2 border-l-rose-500" : ""}
                      ${isSuspicious && !hasDiscrepancy && !isExcluded ? "bg-amber-500/10 border-l-2 border-l-amber-400" : ""}
                    `}
                  >
                    <td
                      className={`px-4 py-2 text-sm ${isExcluded ? "text-gray-500 line-through" : "text-gray-300"}`}
                    >
                      {row.item_code}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm ${isExcluded ? "text-gray-500 line-through" : "text-gray-300"}`}
                    >
                      {row.product_name}
                      {nameMismatch && !isExcluded && (
                        <div className="text-xs text-blue-400 mt-1">
                          Current name: {matchingIngredient.product}
                        </div>
                      )}
                      {isExcluded && (
                        <div className="text-xs text-rose-400 mt-1">
                          Excluded from import
                        </div>
                      )}
                      {isSkipped && !isExcluded && (
                        <div className="text-xs text-amber-400 mt-1">
                          Skipped for now
                        </div>
                      )}
                      {/* Discrepancy indicator */}
                      {hasDiscrepancy && (
                        <div className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                          <PackageX className="w-3 h-3" />
                          {DISCREPANCY_LABELS[discrepancy.type]}
                          {discrepancy.notes && ` - ${discrepancy.notes}`}
                          <span className="text-gray-500">(price update skipped)</span>
                        </div>
                      )}
                      {/* Suspicious price warning */}
                      {isSuspicious && !hasDiscrepancy && !isExcluded && (
                        <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          $0.00 price - likely a short or shorted item
                        </div>
                      )}
                    </td>

                    <td
                      className={`px-4 py-2 text-sm text-right ${isExcluded ? "text-gray-500" : ""}`}
                    >
                      {isExisting ? (
                        <span
                          className={
                            isExcluded ? "text-gray-500" : "text-gray-300"
                          }
                        >
                          ${matchingIngredient.current_price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm text-right ${isExcluded ? "text-gray-500" : ""}`}
                    >
                      <span
                        className={
                          isExcluded ? "text-gray-500" : "text-gray-300"
                        }
                      >
                        ${parseFloat(row.unit_price).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      {hasChange && !isExcluded && (
                        <span
                          className={`inline-flex items-center gap-1 ${priceChange.changePercent > 0 ? "text-rose-400" : "text-emerald-400"}`}
                        >
                          {priceChange.changePercent > 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {Math.abs(priceChange.changePercent).toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        {isExcluded ? (
                          <button
                            onClick={() => {
                              setExcludedItems((prev) =>
                                prev.filter(
                                  (item) => item !== row.item_code.toString(),
                                ),
                              );
                              toast.success(
                                `Item ${row.item_code} restored to import`,
                              );
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Restore
                          </button>
                        ) : isExisting ? (
                          <>
                            {/* Discrepancy marking for existing items */}
                            {hasDiscrepancy ? (
                              <>
                                <button
                                  onClick={() => setExpandedDiscrepancy(
                                    isDiscrepancyExpanded ? null : row.item_code.toString()
                                  )}
                                  className="h-7 rounded-lg flex items-center justify-center px-2 gap-1 bg-rose-500/20 text-rose-400"
                                  title="Edit discrepancy"
                                >
                                  <PackageX className="w-3.5 h-3.5" />
                                  <span className="text-xs">{DISCREPANCY_LABELS[discrepancy.type]}</span>
                                  {isDiscrepancyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                <TwoStageButton
                                  onConfirm={() => {
                                    setDiscrepancyItems((prev) => {
                                      const next = new Map(prev);
                                      next.delete(row.item_code.toString());
                                      return next;
                                    });
                                    setExpandedDiscrepancy(null);
                                    toast.success(`Removed discrepancy from ${row.item_code}`);
                                  }}
                                  icon={X}
                                  confirmText="Clear?"
                                  variant="neutral"
                                  size="sm"
                                  title="Clear discrepancy"
                                />
                              </>
                            ) : isSuspicious ? (
                              /* Prominent "Mark as Short" for $0.00 prices */
                              <TwoStageButton
                                onConfirm={() => {
                                  setDiscrepancyItems((prev) => {
                                    const next = new Map(prev);
                                    next.set(row.item_code.toString(), { type: 'short' });
                                    return next;
                                  });
                                  // Also reject the price change
                                  setPriceChanges((prev) =>
                                    prev.map((p) =>
                                      p.itemCode === row.item_code
                                        ? { ...p, rejected: true, approved: false }
                                        : p
                                    )
                                  );
                                  toast.success(`Marked ${row.item_code} as short - price update skipped`);
                                  setExpandedDiscrepancy(row.item_code.toString());
                                }}
                                icon={PackageX}
                                confirmText="Short?"
                                variant="warning"
                                size="sm"
                                title="Mark as short (shorted item)"
                              />
                            ) : (
                              /* Normal approve/reject for regular items */
                              <>
                                <button
                                  onClick={() =>
                                    setPriceChanges((prev) =>
                                      prev.map((p) =>
                                        p.itemCode === row.item_code
                                          ? {
                                              ...p,
                                              approved: true,
                                              rejected: false,
                                            }
                                          : p,
                                      ),
                                    )
                                  }
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                    priceChange?.approved
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-gray-800/50 hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400"
                                  }`}
                                  title="Approve price change"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setPriceChanges((prev) =>
                                      prev.map((p) =>
                                        p.itemCode === row.item_code
                                          ? {
                                              ...p,
                                              rejected: true,
                                              approved: false,
                                            }
                                          : p,
                                      ),
                                    )
                                  }
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                    priceChange?.rejected
                                      ? "bg-rose-500/20 text-rose-400"
                                      : "bg-gray-800/50 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400"
                                  }`}
                                  title="Reject price change"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {/* Additional discrepancy button for non-suspicious items */}
                            {!isSuspicious && !hasDiscrepancy && (
                              <TwoStageButton
                                onConfirm={() => {
                                  setDiscrepancyItems((prev) => {
                                    const next = new Map(prev);
                                    next.set(row.item_code.toString(), { type: 'damaged' });
                                    return next;
                                  });
                                  setPriceChanges((prev) =>
                                    prev.map((p) =>
                                      p.itemCode === row.item_code
                                        ? { ...p, rejected: true, approved: false }
                                        : p
                                    )
                                  );
                                  setExpandedDiscrepancy(row.item_code.toString());
                                }}
                                icon={AlertTriangle}
                                confirmText="Issue?"
                                variant="warning"
                                size="sm"
                                title="Mark discrepancy (damaged, wrong item, etc.)"
                              />
                            )}
                          </>
                        ) : (
                          <div className="flex gap-2">
                            {/* Option 1: Quick Add (Inline Expansion) */}
                            <button
                              onClick={() => {
                                setExpandedItemCode(
                                  expandedItemCode === row.item_code.toString()
                                    ? null
                                    : row.item_code.toString()
                                );
                              }}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                expandedItemCode === row.item_code.toString()
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-gray-800/50 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400"
                              }`}
                              title="Quick Add Ingredient"
                            >
                              <Plus className={`w-3.5 h-3.5 transition-transform ${
                                expandedItemCode === row.item_code.toString() ? "rotate-45" : ""
                              }`} />
                            </button>

                            {/* Option for Discard */}
                            <button
                              onClick={() => {
                                setExcludedItems((prev) => [
                                  ...prev,
                                  row.item_code.toString(),
                                ]);
                                setExpandedItemCode(null);
                                toast.success(
                                  `Item ${row.item_code} excluded from import`,
                                );
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-800/50 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                              title="Discard Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Inline Quick-Add Expansion */}
                  {isExpanded && !isExisting && !isExcluded && (
                    <NewIngredientInline
                      invoiceData={{
                        item_code: row.item_code.toString(),
                        product_name: row.product_name,
                        unit_price: row.unit_price,
                        unit_of_measure: row.unit_of_measure,
                      }}
                      vendorId={vendorId}
                      onAdd={(newIngredient) => {
                        // Add to master ingredients list so it shows as existing
                        setMasterIngredients((prev) => [...prev, newIngredient]);
                        setExpandedItemCode(null);
                        // Remove from skipped if it was skipped before
                        setSkippedItems((prev) =>
                          prev.filter((code) => code !== row.item_code.toString())
                        );
                      }}
                      onSkip={() => {
                        // Mark as skipped for now (Stage 3 will handle pending queue)
                        setSkippedItems((prev) => [
                          ...prev,
                          row.item_code.toString(),
                        ]);
                        setExpandedItemCode(null);
                        toast("Skipped for now - you can add this later from the MIL", {
                          icon: "⏭️",
                        });
                      }}
                      onCancel={() => setExpandedItemCode(null)}
                    />
                  )}
                  
                  {/* Discrepancy Expanded Row - Edit type and notes */}
                  {isDiscrepancyExpanded && hasDiscrepancy && (
                    <tr className="bg-rose-500/5">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <PackageX className="w-4 h-4 text-rose-400" />
                            <span className="text-sm text-gray-400">Discrepancy Type:</span>
                            <select
                              value={discrepancy.type}
                              onChange={(e) => {
                                setDiscrepancyItems((prev) => {
                                  const next = new Map(prev);
                                  const current = next.get(row.item_code.toString());
                                  if (current) {
                                    next.set(row.item_code.toString(), {
                                      ...current,
                                      type: e.target.value as DiscrepancyType,
                                    });
                                  }
                                  return next;
                                });
                              }}
                              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-sm text-white"
                            >
                              <option value="short">Short (not delivered)</option>
                              <option value="damaged">Damaged</option>
                              <option value="wrong_item">Wrong Item</option>
                              <option value="price_mismatch">Price Mismatch</option>
                            </select>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-500" />
                            <input
                              type="text"
                              placeholder="Notes (optional) e.g., 'Only 2 of 3 cases delivered'"
                              value={discrepancy.notes || ''}
                              onChange={(e) => {
                                setDiscrepancyItems((prev) => {
                                  const next = new Map(prev);
                                  const current = next.get(row.item_code.toString());
                                  if (current) {
                                    next.set(row.item_code.toString(), {
                                      ...current,
                                      notes: e.target.value,
                                    });
                                  }
                                  return next;
                                });
                              }}
                              className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-1 text-sm text-white placeholder-gray-500"
                            />
                          </div>
                          <button
                            onClick={() => setExpandedDiscrepancy(null)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Items marked as discrepancies will NOT update price history. Use this for shorted items, damaged goods, or other delivery issues.
                        </p>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              });
            })().filter(Boolean)}
          </tbody>
        </table>
      </div>

      {/* Floating Action Bar with Summary */}
      {(() => {
        // Calculate suspicious items (unmarked $0.00 prices)
        const uniqueItemsMap = new Map();
        data.forEach((item) => {
          if (!uniqueItemsMap.has(item.item_code)) {
            uniqueItemsMap.set(item.item_code, item);
          }
        });
        const uniqueItems = Array.from(uniqueItemsMap.values());
        
        const unmarkedSuspicious = uniqueItems.filter((row) => {
          const price = parseFloat(row.unit_price);
          const isExcluded = excludedItems.includes(row.item_code.toString());
          const hasDiscrepancy = discrepancyItems.has(row.item_code.toString());
          return isSuspiciousPrice(price) && !isExcluded && !hasDiscrepancy;
        });
        
        const hasUnmarkedSuspicious = unmarkedSuspicious.length > 0;
        
        return (
          <div className={`floating-action-bar ${hasUnmarkedSuspicious ? 'warning' : ''}`}>
            <div className="floating-action-bar-inner">
              <div className="floating-action-bar-content">
                {/* Warning for unmarked $0.00 items */}
                {hasUnmarkedSuspicious && (
                  <>
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {unmarkedSuspicious.length} item{unmarkedSuspicious.length > 1 ? 's have' : ' has'} $0.00 price
                      </span>
                    </div>
                    <TwoStageButton
                      onConfirm={() => {
                        // Mark all suspicious items as shorts
                        setDiscrepancyItems((prev) => {
                          const next = new Map(prev);
                          unmarkedSuspicious.forEach((row) => {
                            next.set(row.item_code.toString(), { type: 'short' });
                          });
                          return next;
                        });
                        // Reject their price changes
                        setPriceChanges((prev) =>
                          prev.map((p) => {
                            if (unmarkedSuspicious.some(r => r.item_code === p.itemCode)) {
                              return { ...p, rejected: true, approved: false };
                            }
                            return p;
                          })
                        );
                        toast.success(`Marked ${unmarkedSuspicious.length} item${unmarkedSuspicious.length > 1 ? 's' : ''} as shorts`);
                      }}
                      icon={PackageX}
                      confirmText="Mark All Short"
                      variant="warning"
                      size="sm"
                      title="Mark all $0.00 items as shorts"
                    />
                    <div className="w-px h-6 bg-gray-700" />
                  </>
                )}
                
                {/* Summary Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Records:</span>
                    <span className="text-white font-medium">
                      {new Set(data.map((item) => item.item_code)).size}
                    </span>
                  </div>
                  
                  {discrepancyItems.size > 0 && (
                    <div className="flex items-center gap-2">
                      <PackageX className="w-4 h-4 text-rose-400" />
                      <span className="text-gray-500">Discrepancies:</span>
                      <span className="text-rose-400 font-medium">{discrepancyItems.size}</span>
                    </div>
                  )}
                  
                  {excludedItems.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Excluded:</span>
                      <span className="text-rose-400 font-medium">{excludedItems.length}</span>
                    </div>
                  )}
                  
                  {skippedItems.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Skipped:</span>
                      <span className="text-amber-400 font-medium">{skippedItems.length}</span>
                    </div>
                  )}
                  
                  {priceChanges.filter(p => p.approved && !discrepancyItems.has(p.itemCode)).length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Price Updates:</span>
                      <span className="text-emerald-400 font-medium">
                        {priceChanges.filter(p => p.approved && !discrepancyItems.has(p.itemCode)).length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="w-px h-6 bg-gray-700" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onCancel}
                    className="btn-ghost text-sm py-1.5 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="btn-primary text-sm py-1.5 px-4"
                    disabled={data.some(
                      (row) =>
                        !masterIngredients.find(
                          (mi) => mi.item_code === row.item_code.toString(),
                        ) && 
                        !excludedItems.includes(row.item_code.toString()) &&
                        !skippedItems.includes(row.item_code.toString()),
                    )}
                    title={
                      data.some(
                        (row) =>
                          !masterIngredients.find(
                            (mi) => mi.item_code === row.item_code.toString(),
                          ) && 
                          !excludedItems.includes(row.item_code.toString()) &&
                          !skippedItems.includes(row.item_code.toString()),
                      )
                        ? "Handle all new items first"
                        : ""
                    }
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Confirm Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Link Existing Modal */}
      {linkingIngredient && (
        <LinkExistingIngredientModal
          isOpen={true}
          onClose={() => {
            // Remove from excluded items when closed
            setExcludedItems((prev) =>
              prev.filter(
                (item) => item !== linkingIngredient.row.item_code.toString(),
              ),
            );
            setLinkingIngredient(null);
          }}
          newItemCode={linkingIngredient.row.item_code}
          newItemName={linkingIngredient.row.product_name}
          vendorId={vendorId}
          onSuccess={() => {
            // Refresh the data after successful linking
            toast.success(
              `Successfully linked ${linkingIngredient.row.item_code} to existing ingredient`,
            );
            // Refresh the data
            const refreshData = async () => {
              const { data: ingredients } = await supabase
                .from("master_ingredients_with_categories")
                .select("*");
              setMasterIngredients(ingredients || []);
            };
            refreshData();
            setLinkingIngredient(null);
          }}
        />
      )}

      {/* New Ingredient Modal */}
      {newIngredient && (
        <EditIngredientModal
          ingredient={
            {
              ...newIngredient,
              organization_id: user?.user_metadata?.organizationId, // Get from user_metadata
            } as MasterIngredient
          }
          onClose={() => setNewIngredient(null)}
          onSave={async (ingredient) => {
            try {
              // Log the current auth state
              console.log("Auth state during save:", {
                user,
                organizationId: user?.user_metadata?.organizationId,
              });

              if (!user?.user_metadata?.organizationId) {
                throw new Error("Organization ID is required");
              }

              const dataToSave = {
                ...ingredient,
                organization_id: user.user_metadata.organizationId, // Use correct path
              };

              console.log("Saving with data:", dataToSave);

              const { error } = await supabase
                .from("master_ingredients")
                .insert([dataToSave]);

              if (error) {
                console.error("Supabase insert error:", error);
                throw error;
              }

              toast.success("Ingredient added successfully");
              setNewIngredient(null);

              // Refresh price changes to update the list
              const { data: currentPrices } = await supabase
                .from("master_ingredients_with_categories")
                .select("id, item_code, current_price")
                .in(
                  "item_code",
                  data.map((item) => item.item_code),
                );

              if (currentPrices) {
                const changes = data
                  .map((item) => {
                    const current = currentPrices.find(
                      (p) => p.item_code === item.item_code,
                    );
                    if (!current) return null;
                    const oldPrice = current.current_price;
                    const newPrice = parseFloat(item.unit_price);
                    const changePercent =
                      ((newPrice - oldPrice) / oldPrice) * 100;
                    return {
                      itemCode: item.item_code,
                      oldPrice,
                      newPrice,
                      changePercent,
                    };
                  })
                  .filter(Boolean);
                setPriceChanges(changes);
              }
            } catch (error) {
              console.error("Error adding ingredient:", error);
              toast.error("Failed to add ingredient");
            }
          }}
        />
      )}
    </div>
  );
};
