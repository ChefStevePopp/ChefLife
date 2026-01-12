import React, { useState, useRef, useCallback } from "react";
import {
  FileText,
  Camera,
  Upload,
  X,
  AlertCircle,
  Info,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { DocumentPreview } from "./DocumentPreview";
import { InvoiceEntryPanel, LineItemState } from "./InvoiceEntryPanel";
import { parseInvoice, ParsedInvoice } from "@/lib/vendorPdfParsers";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";

// =============================================================================
// IMPORT WORKSPACE - L6 Design
// =============================================================================
// Two-column import: Document on right, editable table on left
// Philosophy: "C-suite accounting app that masquerades as restaurant software"
// =============================================================================

interface Props {
  vendorId: string;
  vendorName: string;
  importType: "pdf" | "photo";
  onComplete: () => void;
  onCancel: () => void;
}

export const ImportWorkspace: React.FC<Props> = ({
  vendorId,
  vendorName,
  importType,
  onComplete,
  onCancel,
}) => {
  const { user } = useAuth();
  const { organizationId } = useOrganizationId();
  
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [file, setFile] = useState<File | null>(null);
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [items, setItems] = useState<LineItemState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isDocumentExpanded, setIsDocumentExpanded] = useState(true); // Collapsible document preview

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // FILE HANDLING
  // ---------------------------------------------------------------------------
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      // Validate file size (10MB max)
      if (uploadedFile.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }
      setFile(uploadedFile);
      setParsedInvoice(null); // Reset parsed data
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: importType === "pdf" 
      ? { "application/pdf": [".pdf"] }
      : { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: false,
  });

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
      // STEP 2: Create vendor_imports batch record
      // ---------------------------------------------------------------------------
      const { data: importRecord, error: importError } = await supabase
        .from("vendor_imports")
        .insert({
          organization_id: organizationId,
          vendor_id: vendorId,
          import_type: importType === "pdf" ? "pdf_import" : "photo_import",
          file_name: file.name,
          file_url: uploadData.path,
          items_count: items.length,
          price_changes: 0, // Will be updated after processing
          new_items: 0,
          status: "processing",
          created_by: user.id,
          metadata: {
            parse_confidence: parsedInvoice?.parseConfidence,
            parse_warnings: parsedInvoice?.parseWarnings,
          },
        })
        .select()
        .single();

      if (importError) throw importError;

      // ---------------------------------------------------------------------------
      // STEP 3: Create vendor_invoice record (header)
      // ---------------------------------------------------------------------------
      // Generate reference if no invoice number (register receipts, etc.)
      const invoiceNumberValue = parsedInvoice?.invoiceNumber?.trim() 
        || `NOINV-${invoiceDate.toISOString().split("T")[0].replace(/-/g, "")}-${vendorName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}`;

      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from("vendor_invoices")
        .insert({
          organization_id: organizationId,
          vendor_id: vendorId,
          invoice_date: invoiceDate.toISOString().split("T")[0],
          invoice_number: invoiceNumberValue,
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
      const lineItems = items.map(item => ({
        invoice_id: invoiceRecord.id,
        organization_id: organizationId,
        item_code: item.itemCode,
        product_name: item.productName,
        quantity: item.quantityReceived, // Received quantity
        quantity_ordered: item.quantityOrdered,
        quantity_received: item.quantityReceived,
        unit_price: item.unitPrice,
        unit_of_measure: item.unit,
        line_total: item.quantityReceived * item.unitPrice,
        master_ingredient_id: item.matchedIngredientId || null,
        match_status: item.matchedIngredientId ? "matched" : "unmatched",
        match_confidence: item.matchConfidence || null,
        original_description: item.productName,
        discrepancy_type: item.discrepancyType || 'none',
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from("vendor_invoice_items")
        .insert(lineItems);

      if (itemsError) throw itemsError;

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
            .eq("item_code", item.itemCode)
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
          total_amount: items.reduce((sum, i) => sum + (i.quantityReceived * i.unitPrice), 0),
          price_changes: priceChanges,
          import_type: importType,
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
      
      if (shortValue > 0) {
        toast.success(
          `Imported ${items.length} items. ${shortItems.length} shortage(s) totaling ${shortValue.toFixed(2)} documented.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`Imported ${items.length} items with ${priceChanges} price updates`);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">
            {importType === "pdf" ? "PDF Import" : "Manual Entry"}: {vendorName}
          </h3>
          <p className="text-sm text-gray-400">
            {file ? file.name : (importType === "pdf" ? "Upload PDF to begin" : "Upload invoice photo for audit trail")}
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
              The document will be stored permanently for audit trail compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {!file ? (
        /* Upload Zone */
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12
            flex flex-col items-center justify-center
            transition-colors cursor-pointer
            ${isDragActive 
              ? "border-primary-500 bg-primary-500/10" 
              : "border-gray-700 hover:border-primary-500/50"
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
            {importType === "pdf" ? (
              <FileText className="w-8 h-8 text-gray-400" />
            ) : (
              <Camera className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <p className="text-lg font-medium text-white mb-2">
            {isDragActive ? "Drop file here" : `Upload ${importType === "pdf" ? "PDF Invoice" : "Invoice Photo (Required)"}`}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Drag and drop or click to select
          </p>
          <p className="text-xs text-gray-600">
            Maximum file size: 10MB
          </p>
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
