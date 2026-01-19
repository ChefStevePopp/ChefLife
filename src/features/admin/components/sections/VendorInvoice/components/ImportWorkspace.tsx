import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  FileText,
  Camera,
  X,
  Info,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { DocumentPreview } from "./DocumentPreview";
import { InvoiceEntryPanel, LineItemState } from "./InvoiceEntryPanel";
import { parseInvoice, ParsedInvoice } from "@/lib/vendorPdfParsers";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { nexus } from "@/lib/nexus";
import { generateInvoiceReference } from "@/lib/friendly-id";
import toast from "react-hot-toast";
import { ImportRecord } from "./ImportHistory";
import { FileDropzone } from "@/shared/components/FileDropzone";
import { useDiagnostics } from "@/hooks/useDiagnostics";

// =============================================================================
// IMPORT WORKSPACE - L6 Design
// =============================================================================
// Two-column import: Document on right, editable table on left
// Philosophy: "C-suite accounting app that masquerades as restaurant software"
// Supports recall mode: loads previous document for correction
// =============================================================================

interface Props {
  vendorId: string;
  vendorName: string;
  importType: "pdf" | "photo";
  recallRecord?: ImportRecord | null;
  onDraftChange?: (hasDraft: boolean) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export const ImportWorkspace: React.FC<Props> = ({
  vendorId,
  vendorName,
  importType,
  recallRecord,
  onDraftChange,
  onComplete,
  onCancel,
}) => {
  const { user } = useAuth();
  const { organizationId } = useOrganizationId();
  const { showDiagnostics } = useDiagnostics();
  
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [file, setFile] = useState<File | null>(null);
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [items, setItems] = useState<LineItemState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isDocumentExpanded, setIsDocumentExpanded] = useState(true);
  const [isLoadingRecall, setIsLoadingRecall] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // DRAFT STATE - Notify parent when we have unsaved work
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const hasDraft = file !== null || items.length > 0;
    onDraftChange?.(hasDraft);
  }, [file, items.length, onDraftChange]);

  // ---------------------------------------------------------------------------
  // RECALL MODE - Load previous document for correction
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (recallRecord?.file_url) {
      loadRecalledDocument();
    }
  }, [recallRecord]);

  const loadRecalledDocument = async () => {
    if (!recallRecord?.file_url) return;

    setIsLoadingRecall(true);
    try {
      // Fetch the file from Supabase storage
      const { data, error } = await supabase.storage
        .from("vendor-invoices")
        .download(recallRecord.file_url);

      if (error) throw error;

      // Convert to File object
      const fileName = recallRecord.file_name || "recalled-document";
      const fileType = fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
      const recalledFile = new File([data], fileName, { type: fileType });

      setFile(recalledFile);
      toast.success(`Loaded ${fileName} for review`);
    } catch (error: any) {
      console.error("Failed to load recalled document:", error);
      toast.error(`Could not load previous document: ${error.message}`);
    } finally {
      setIsLoadingRecall(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FILE HANDLING
  // ---------------------------------------------------------------------------
  // Handle file from FileDropzone
  const handleFile = useCallback((uploadedFile: File) => {
    // Validate file size (10MB max)
    if (uploadedFile.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }
    setFile(uploadedFile);
    setParsedInvoice(null); // Reset parsed data
  }, []);

  const handleTextExtracted = (text: string) => {
    // Parse the extracted text
    const result = parseInvoice(text, vendorName);
    setParsedInvoice(result);
    
    if (result.parseConfidence < 50) {
      toast(`Low parse confidence (${result.parseConfidence}%). Please verify all items.`, {
        icon: "⚠️",
        duration: 5000,
      });
    } else if (result.parseWarnings.length > 0) {
      toast(`Parsed with ${result.parseWarnings.length} warning(s)`, {
        icon: "👀",
      });
    }
  };

  const clearFile = () => {
    setFile(null);
    setParsedInvoice(null);
    setItems([]);
  };

  // ---------------------------------------------------------------------------
  // SUBMIT HANDLER
  // ---------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!file || !user || !organizationId) {
      toast.error("Missing required data");
      return;
    }

    if (items.length === 0) {
      toast.error("No items to import");
      return;
    }

    const unverified = items.filter(i => !i.isVerified);
    if (unverified.length > 0) {
      toast.error(`Please verify all ${unverified.length} remaining items`);
      return;
    }

    setIsSubmitting(true);

    try {
      // ---------------------------------------------------------------------------
      // STEP 1: Upload document to Supabase Storage
      // ---------------------------------------------------------------------------
      const fileExt = file.name.split(".").pop();
      const fileName = `${organizationId}/${vendorId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("vendor-invoices")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Calculate file hash for integrity verification
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const documentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // ---------------------------------------------------------------------------
      // STEP 2: Create vendor_imports batch record (with AUTO version control)
      // ---------------------------------------------------------------------------
      // Version control is AUTOMATIC based on invoice_number OR file_name
      // Same invoice # or filename from same vendor = new version, old ones superseded
      
      // Check if we have a real invoice number from the parsed document
      const parsedInvoiceNumber = parsedInvoice?.invoiceNumber?.trim() || null;
      
      // For version control matching:
      // - If we have a parsed invoice number, match by invoice_number
      // - Otherwise, match by file_name
      let existingQuery = supabase
        .from("vendor_imports")
        .select("id, version, invoice_number, file_name")
        .eq("organization_id", organizationId)
        .eq("vendor_id", vendorId)
        .neq("status", "superseded");
      
      if (parsedInvoiceNumber) {
        existingQuery = existingQuery.eq("invoice_number", parsedInvoiceNumber);
      } else {
        existingQuery = existingQuery.eq("file_name", file.name);
      }
      
      const { data: existingImports } = await existingQuery;
      
      // Generate display reference: real invoice # or friendly reference
      const invoiceNumberForDisplay = parsedInvoiceNumber || generateInvoiceReference();
      
      // Calculate next version and supersede old imports
      let importVersion = 1;
      let isCorrection = false;
      
      if (existingImports && existingImports.length > 0) {
        isCorrection = true;
        // Get highest version
        const maxVersion = Math.max(...existingImports.map(i => i.version || 1));
        importVersion = maxVersion + 1;
        
        // Auto-supersede ALL previous non-superseded imports
        const idsToSupersede = existingImports.map(i => i.id);
        await supabase
          .from("vendor_imports")
          .update({
            status: "superseded",
            superseded_at: new Date().toISOString(),
            superseded_by: user.id,
          })
          .in("id", idsToSupersede);

        // NEXUS: Log the auto-correction
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'import_version_created',
          severity: 'info',
          details: {
            vendor: vendorName,
            vendor_id: vendorId,
            invoice_number: invoiceNumberForDisplay,
            file_name: file.name,
            superseded_count: existingImports.length,
            new_version: importVersion,
            superseded_ids: idsToSupersede,
          },
        });

        toast(`Auto-creating version ${importVersion} (${existingImports.length} previous version${existingImports.length > 1 ? 's' : ''} superseded)`, { icon: "📝" });
      }

      const { data: importRecord, error: importError } = await supabase
        .from("vendor_imports")
        .insert({
          organization_id: organizationId,
          vendor_id: vendorId,
          import_type: importType === "pdf" ? "pdf_import" : "photo_import",
          file_name: file.name,
          file_url: uploadData.path,
          items_count: items.length,
          price_changes: 0,
          new_items: 0,
          status: "processing",
          created_by: user.id,
          metadata: {
            parse_confidence: parsedInvoice?.parseConfidence,
            parse_warnings: parsedInvoice?.parseWarnings,
          },
          // Version control fields
          invoice_number: invoiceNumberForDisplay,
          invoice_date: invoiceDate.toISOString().split("T")[0],
          version: importVersion,
          supersedes_id: existingImports?.[0]?.id || null, // Link to most recent superseded
        })
        .select()
        .single();

      if (importError) throw importError;

      // ---------------------------------------------------------------------------
      // STEP 3: Create vendor_invoice record (header)
      // ---------------------------------------------------------------------------
      // For corrections, we still create a new vendor_invoices record linked to new import
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from("vendor_invoices")
        .insert({
          organization_id: organizationId,
          vendor_id: vendorId,
          invoice_date: invoiceDate.toISOString().split("T")[0],
          invoice_number: invoiceNumberForDisplay,
          total_amount: items.reduce((sum, i) => sum + (i.quantityReceived * i.unitPrice), 0),
          status: "pending",
          document_file_path: uploadData.path,
          document_hash: documentHash,
          created_by: user.id,
          import_id: importRecord.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // ---------------------------------------------------------------------------
      // STEP 4: Create vendor_invoice_items (line items with order/delivery tracking)
      // ---------------------------------------------------------------------------
      // NOTE: Only items WITH a master_ingredient_id can go here (NOT NULL constraint)
      const lineItems = items
        .filter(item => item.matchedIngredientId) // Only items with MIL match
        .map(item => ({
          invoice_id: invoiceRecord.id,
          master_ingredient_id: item.matchedIngredientId,
          vendor_code: item.itemCode || 'UNKNOWN',
          quantity: item.quantityReceived,
          quantity_ordered: item.quantityOrdered,
          quantity_received: item.quantityReceived,
          unit_price: item.unitPrice,
          total_price: item.quantityReceived * item.unitPrice,
          match_status: 'matched',
          match_confidence: item.matchConfidence || null,
          original_description: item.productName,
          discrepancy_type: item.discrepancyType || 'none',
          notes: item.notes || null,
        }));

      // ---------------------------------------------------------------------------
      // STEP 4b: Insert unmatched items into pending_import_items for Triage
      // ---------------------------------------------------------------------------
      const unmatchedItems = items.filter(item => !item.matchedIngredientId);
      if (unmatchedItems.length > 0) {
        console.log(`[VIM] ${unmatchedItems.length} unmatched items going to triage:`, 
          unmatchedItems.map(i => ({ code: i.itemCode, name: i.productName })));
        
        // Build pending items array - using actual column names from schema
        // vendor_description (not product_name), import_batch_id (not vendor_import_id)
        const pendingItems = unmatchedItems.map(item => ({
          organization_id: organizationId,
          vendor_id: vendorId,
          import_batch_id: importRecord.id,
          item_code: item.itemCode || `UNKNOWN-${Date.now()}`,
          vendor_description: item.productName,
          unit_price: item.unitPrice,
          unit_of_measure: item.unit || null,
          status: 'pending',
        }));

        // Upsert to handle re-imports of same item codes
        // Note: Unique constraint is (organization_id, vendor_id, item_code, status)
        const { error: pendingError } = await supabase
          .from("pending_import_items")
          .upsert(pendingItems, {
            onConflict: 'organization_id,vendor_id,item_code,status',
            ignoreDuplicates: false, // Update existing with new price/import_id
          });

        if (pendingError) {
          console.error("[VIM] Failed to insert pending items:", pendingError);
          // Non-fatal: log but don't fail the import
        } else {
          console.log(`[VIM] ${unmatchedItems.length} items queued for triage`);
        }
      }

      if (lineItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("vendor_invoice_items")
          .insert(lineItems);

        if (itemsError) throw itemsError;
      }

      // ---------------------------------------------------------------------------
      // STEP 5: Update prices and create price history
      // ---------------------------------------------------------------------------
      let priceChanges = 0;
      
      for (const item of items) {
        if (item.matchedIngredientId) {
          // Get current price
          const { data: ingredient } = await supabase
            .from("master_ingredients")
            .select("current_price")
            .eq("id", item.matchedIngredientId)
            .single();

          const previousPrice = ingredient?.current_price || 0;
          
          // Update current price
          await supabase
            .from("master_ingredients")
            .update({ 
              current_price: item.unitPrice,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.matchedIngredientId);

          // Create price history record with audit link
          const { data: invoiceItem } = await supabase
            .from("vendor_invoice_items")
            .select("id")
            .eq("invoice_id", invoiceRecord.id)
            .eq("vendor_code", item.itemCode || 'UNKNOWN')
            .single();

          await supabase
            .from("vendor_price_history")
            .insert({
              organization_id: organizationId,
              master_ingredient_id: item.matchedIngredientId,
              vendor_id: vendorId,
              price: item.unitPrice,
              previous_price: previousPrice,
              effective_date: invoiceDate.toISOString(),
              source_type: importType === "pdf" ? "pdf_import" : "photo_import",
              invoice_item_id: invoiceItem?.id,
              vendor_import_id: importRecord.id,
            });

          if (Math.abs(item.unitPrice - previousPrice) > 0.001) {
            priceChanges++;
          }
        }
      }

      // ---------------------------------------------------------------------------
      // STEP 6: Update import record with final stats
      // ---------------------------------------------------------------------------
      await supabase
        .from("vendor_imports")
        .update({
          status: "completed",
          price_changes: priceChanges,
        })
        .eq("id", importRecord.id);

      // Update invoice status
      await supabase
        .from("vendor_invoices")
        .update({ status: "completed" })
        .eq("id", invoiceRecord.id);

      // ---------------------------------------------------------------------------
      // DONE - Fire NEXUS events
      // ---------------------------------------------------------------------------
      const shortItems = items.filter(i => i.discrepancyType === 'short');
      const shortValue = shortItems.reduce((sum, i) => 
        sum + ((i.quantityOrdered - i.quantityReceived) * i.unitPrice), 0
      );
      
      // Log invoice import to activity stream
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'invoice_imported',
        details: {
          vendor: vendorName,
          vendor_id: vendorId,
          invoice_id: invoiceRecord.id,
          invoice_number: parsedInvoice?.invoiceNumber || null,
          invoice_date: invoiceDate.toISOString().split("T")[0],
          item_count: items.length,
          matched_count: lineItems.length,
          unmatched_count: unmatchedItems.length,
          total_amount: items.reduce((sum, i) => sum + (i.quantityReceived * i.unitPrice), 0),
          price_changes: priceChanges,
          import_type: importType,
          version: importVersion,
          is_correction: isCorrection,
          has_discrepancies: shortItems.length > 0,
          discrepancy_count: shortItems.length,
          discrepancy_value: shortValue,
        },
        metadata: {
          source: importType === 'pdf' ? 'pdf_import' : 'photo_import',
          parse_confidence: parsedInvoice?.parseConfidence,
        },
      });

      // Log significant price changes (>5% change)
      for (const item of items) {
        if (item.matchedIngredientId) {
          const { data: ingredient } = await supabase
            .from("master_ingredients")
            .select("current_price, product")
            .eq("id", item.matchedIngredientId)
            .single();

          const previousPrice = ingredient?.current_price || 0;
          const priceDiff = item.unitPrice - previousPrice;
          const percentChange = previousPrice > 0 
            ? Math.abs(priceDiff / previousPrice) * 100 
            : 0;

          // Only log if >5% change and price actually changed
          if (percentChange > 5 && Math.abs(priceDiff) > 0.01) {
            await nexus({
              organization_id: organizationId,
              user_id: user.id,
              activity_type: 'price_change_detected',
              severity: percentChange > 15 ? 'warning' : 'info',
              details: {
                item: ingredient?.product || item.productName,
                item_code: item.itemCode,
                vendor: vendorName,
                previous_price: previousPrice,
                new_price: item.unitPrice,
                change_amount: priceDiff,
                change_percent: percentChange.toFixed(1),
                direction: priceDiff > 0 ? 'increase' : 'decrease',
              },
            });
          }
        }
      }

      // Log delivery discrepancies if any
      if (shortItems.length > 0) {
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'invoice_discrepancy_recorded',
          severity: 'warning',
          details: {
            vendor: vendorName,
            vendor_id: vendorId,
            invoice_id: invoiceRecord.id,
            invoice_number: parsedInvoice?.invoiceNumber || null,
            discrepancy_count: shortItems.length,
            discrepancy_value: shortValue,
            discrepancies: shortItems.map(i => ({
              product: i.productName,
              item_code: i.itemCode,
              ordered: i.quantityOrdered,
              received: i.quantityReceived,
              short: i.quantityOrdered - i.quantityReceived,
              value: (i.quantityOrdered - i.quantityReceived) * i.unitPrice,
              type: i.discrepancyType,
              notes: i.notes,
            })),
          },
        });
      }
      
      const action = isCorrection ? 'Corrected' : 'Imported';
      const unmatchedMsg = unmatchedItems.length > 0 
        ? ` (${unmatchedItems.length} items need triage)` 
        : '';
      
      if (shortValue > 0) {
        toast.success(
          `${action} ${items.length} items. ${shortItems.length} shortage(s) totaling ${shortValue.toFixed(2)} documented.${unmatchedMsg}`,
          { duration: 5000 }
        );
      } else {
        toast.success(`${action} ${items.length} items with ${priceChanges} price updates${unmatchedMsg}`);
      }
      onComplete();

    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/VendorInvoice/components/ImportWorkspace.tsx
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-white">
              {importType === "pdf" ? "PDF Import" : "Manual Entry"}: {vendorName}
            </h3>
            {recallRecord && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
                Correction Mode
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {recallRecord 
              ? `Reviewing ${recallRecord.file_name} — upload new version to create correction`
              : file 
                ? file.name 
                : (importType === "pdf" ? "Upload PDF to begin" : "Upload invoice photo for audit trail")
            }
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700/50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Info Section */}
      <div className={`expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}>
        <button
          onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300">
              How {importType === "pdf" ? "PDF" : "Photo"} Import Works
            </span>
          </div>
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2 space-y-2 text-sm text-gray-400">
            <p>
              {importType === "pdf" 
                ? "Upload your vendor's PDF invoice. We'll extract the line items and match them to your ingredient list."
                : "Upload a photo of your invoice for the audit trail. Enter items manually with the photo visible for reference."
              }
            </p>
            <p className="text-xs text-gray-500">
              The document will be stored permanently for audit trail compliance. Re-uploading the same invoice creates a new version automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isLoadingRecall ? (
        /* Loading recalled document */
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-cyan-700/50 rounded-lg bg-cyan-900/10">
          <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-cyan-400 font-medium">Loading previous document...</p>
          <p className="text-sm text-gray-400 mt-1">{recallRecord?.file_name}</p>
        </div>
      ) : !file ? (
        /* Upload Zone - L5 placemat with FileDropzone */
        <div className="card p-6">
          <FileDropzone
            accept={importType === "pdf" ? ".pdf" : ".jpg,.jpeg,.png,.webp"}
            onFile={handleFile}
            variant={importType === "pdf" ? "green" : "amber"}
            label={importType === "pdf" 
              ? "Drop your PDF invoice here" 
              : "Drop invoice photo here (required for audit trail)"
            }
            hint={importType === "pdf"
              ? "We'll extract line items and match to your ingredient list"
              : "Photo stored permanently for audit compliance • Max 10MB"
            }
          />
        </div>
      ) : (
        /* Stacked Workspace: Document on top (collapsible), Table below (full width) */
        <div className="space-y-4">
          {/* Document Preview Section - Collapsible */}
          <div className={`expandable-info-section ${isDocumentExpanded ? "expanded" : ""}`}>
            <button
              onClick={() => setIsDocumentExpanded(!isDocumentExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                {importType === "pdf" ? (
                  <FileText className="w-4 h-4 text-primary-400" />
                ) : (
                  <Camera className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-sm font-medium text-gray-300">
                  {file?.name || "Document Preview"}
                </span>
                <span className="text-xs text-gray-500">
                  ({(file?.size ? (file.size / 1024).toFixed(1) : 0)} KB)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isDocumentExpanded ? (
                  <EyeOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-500" />
                )}
                {isDocumentExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>
            <div className="expandable-info-content">
              <div className="pt-2">
                <DocumentPreview
                  file={file}
                  fileType={importType}
                  onTextExtracted={importType === "pdf" ? handleTextExtracted : undefined}
                />
              </div>
            </div>
          </div>

          {/* Entry Table - Full Width */}
          <InvoiceEntryPanel
            parsedInvoice={parsedInvoice}
            vendorId={vendorId}
            onInvoiceDateChange={setInvoiceDate}
            onItemsChange={setItems}
            onSubmit={handleSubmit}
            onCancel={clearFile}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </div>
  );
};
