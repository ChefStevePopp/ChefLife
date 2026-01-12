/**
 * Vendor Invoice Audit Service
 * 
 * Enforces accounting-grade audit trail for all price changes.
 * Every dollar traceable to a source document.
 * 
 * Flow:
 * 1. Upload file → Store in Supabase bucket → Get path + hash
 * 2. Create vendor_invoices record (header)
 * 3. Create vendor_invoice_items (each line)
 * 4. Create vendor_price_history with invoice_item_id link
 * 5. Update master_ingredients current_price
 */

import { supabase } from '@/lib/supabase';
import { nexus } from '@/lib/nexus';

// Types
export interface InvoiceLineItem {
  item_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_of_measure?: string;
  original_description?: string;
  match_confidence?: number;
}

export interface CreateInvoiceParams {
  organizationId: string;
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  lineItems: InvoiceLineItem[];
  sourceFile?: File;
  importType: 'csv_import' | 'pdf_import' | 'mobile_import' | 'manual_entry';
  createdBy: string;
  // Supersede tracking
  isSupersede?: boolean;
  supersededFilename?: string;
  versionNumber?: number;
}

export interface AuditedPriceChange {
  ingredientId: string;
  itemCode: string;
  previousPrice: number;
  newPrice: number;
  invoiceItemId: string;
}

/**
 * Generate SHA256 hash of a file for integrity verification
 */
async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Upload source file to Supabase storage
 */
async function uploadSourceFile(
  file: File,
  organizationId: string,
  vendorId: string,
  invoiceDate: Date
): Promise<{ path: string; hash: string }> {
  const hash = await generateFileHash(file);
  const dateStr = invoiceDate.toISOString().split('T')[0];
  const fileName = `${dateStr}_${file.name}`;
  const path = `${organizationId}/${vendorId}/${dateStr}/${fileName}`;

  const { error } = await supabase.storage
    .from('vendor-invoices')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false // Never overwrite - each invoice is unique
    });

  if (error) {
    // If file already exists, that's okay - use the existing path
    if (!error.message.includes('already exists')) {
      throw new Error(`Failed to upload source file: ${error.message}`);
    }
  }

  return { path, hash };
}

/**
 * Create invoice header record (or return existing one)
 */
async function createInvoiceHeader(params: {
  organizationId: string;
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  documentFilePath?: string;
  documentHash?: string;
  importId?: string;
  createdBy: string;
}): Promise<{ id: string; isExisting: boolean }> {
  // First, check if this invoice already exists
  const dateStr = params.invoiceDate.toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('vendor_invoices')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('vendor_id', params.vendorId)
    .eq('invoice_date', dateStr)
    .single();

  // If exists, return the existing ID for appending line items
  if (existing) {
    console.log(`Invoice already exists for ${params.vendorId} on ${dateStr}, appending items to existing invoice`);
    return { id: existing.id, isExisting: true };
  }

  // Create new invoice header
  const { data, error } = await supabase
    .from('vendor_invoices')
    .insert({
      organization_id: params.organizationId,
      vendor_id: params.vendorId,
      invoice_number: params.invoiceNumber,
      invoice_date: dateStr,
      total_amount: params.totalAmount,
      status: 'pending',
      document_file_path: params.documentFilePath,
      document_hash: params.documentHash,
      import_id: params.importId,
      created_by: params.createdBy,
    })
    .select('id')
    .single();

  if (error) {
    // Handle race condition - invoice was created between check and insert
    if (error.code === '23505') {
      const { data: raceExisting } = await supabase
        .from('vendor_invoices')
        .select('id')
        .eq('organization_id', params.organizationId)
        .eq('vendor_id', params.vendorId)
        .eq('invoice_date', dateStr)
        .single();
      
      if (raceExisting) {
        return { id: raceExisting.id, isExisting: true };
      }
    }
    throw new Error(`Failed to create invoice: ${error.message}`);
  }

  return { id: data.id, isExisting: false };
}

/**
 * Create invoice line items and link to master ingredients
 */
async function createInvoiceLineItems(
  invoiceId: string,
  lineItems: InvoiceLineItem[],
  masterIngredients: Map<string, { id: string; currentPrice: number }>
): Promise<Map<string, string>> {
  // Map of item_code → invoice_item_id for audit linking
  const itemIdMap = new Map<string, string>();

  const lineItemRecords = lineItems.map((item) => {
    const ingredient = masterIngredients.get(item.item_code);
    
    return {
      invoice_id: invoiceId,
      master_ingredient_id: ingredient?.id || null,
      vendor_code: item.item_code,
      quantity: item.quantity || 1,
      unit_price: item.unit_price,
      total_price: (item.quantity || 1) * item.unit_price,
      previous_unit_price: ingredient?.currentPrice || null,
      price_change_percentage: ingredient?.currentPrice 
        ? ((item.unit_price - ingredient.currentPrice) / ingredient.currentPrice) * 100
        : null,
      match_status: ingredient ? 'matched' : 'unmatched',
      match_confidence: item.match_confidence,
      original_description: item.original_description || item.product_name,
    };
  });

  const { data, error } = await supabase
    .from('vendor_invoice_items')
    .insert(lineItemRecords)
    .select('id, vendor_code');

  if (error) {
    throw new Error(`Failed to create invoice line items: ${error.message}`);
  }

  // Build the item_code → invoice_item_id map
  data.forEach(item => {
    itemIdMap.set(item.vendor_code, item.id);
  });

  return itemIdMap;
}

/**
 * Create price history records with full audit trail
 */
async function createPriceHistory(
  organizationId: string,
  vendorId: string,
  changes: AuditedPriceChange[],
  sourceType: string,
  effectiveDate: Date,
  createdBy: string,
  vendorImportId: string // Add vendor_import_id for joining to vendor_imports
): Promise<void> {
  const historyRecords = changes.map(change => ({
    organization_id: organizationId,
    master_ingredient_id: change.ingredientId,
    vendor_id: vendorId,
    price: change.newPrice,
    previous_price: change.previousPrice,
    effective_date: effectiveDate.toISOString(),
    invoice_item_id: change.invoiceItemId, // THE AUDIT LINK to line item
    vendor_import_id: vendorImportId, // THE LINK to vendor_imports for invoice_date
    source_type: sourceType,
    created_by: createdBy,
  }));

  const { error } = await supabase
    .from('vendor_price_history')
    .insert(historyRecords);

  if (error) {
    throw new Error(`Failed to create price history: ${error.message}`);
  }
}

/**
 * Update master ingredient prices
 */
async function updateIngredientPrices(
  changes: { ingredientId: string; newPrice: number }[]
): Promise<void> {
  // Update each ingredient's current_price
  for (const change of changes) {
    const { error } = await supabase
      .from('master_ingredients')
      .update({ 
        current_price: change.newPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', change.ingredientId);

    if (error) {
      console.error(`Failed to update price for ingredient ${change.ingredientId}:`, error);
    }
  }
}

/**
 * Record the import batch
 */
async function recordImportBatch(params: {
  organizationId: string;
  vendorId: string;
  importType: string;
  fileName: string;
  fileUrl?: string;
  itemsCount: number;
  priceChanges: number;
  newItems: number;
  invoiceDate?: Date;
  createdBy: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('vendor_imports')
    .insert({
      organization_id: params.organizationId,
      vendor_id: params.vendorId,
      import_type: params.importType,
      file_name: params.fileName,
      file_url: params.fileUrl,
      items_count: params.itemsCount,
      price_changes: params.priceChanges,
      new_items: params.newItems,
      invoice_date: params.invoiceDate ? params.invoiceDate.toISOString().split('T')[0] : null,
      status: 'completed',
      created_by: params.createdBy,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to record import: ${error.message}`);
  }

  return data.id;
}

/**
 * Mark invoice as verified
 */
export async function verifyInvoice(
  invoiceId: string,
  verifiedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('vendor_invoices')
    .update({
      status: 'processed',
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to verify invoice: ${error.message}`);
  }
}

/**
 * MAIN FUNCTION: Process invoice with full audit trail
 * 
 * This is the single entry point for all invoice processing.
 * It ensures every price change is traceable to a source document.
 */
export async function processInvoiceWithAuditTrail(
  params: CreateInvoiceParams,
  approvedChanges: { itemCode: string; newPrice: number }[]
): Promise<{
  invoiceId: string;
  importId: string;
  priceChangesCount: number;
}> {
  const {
    organizationId,
    vendorId,
    invoiceNumber,
    invoiceDate,
    lineItems,
    sourceFile,
    importType,
    createdBy,
  } = params;

  try {
    // Step 1: Upload source file (if provided)
    let documentPath: string | undefined;
    let documentHash: string | undefined;
    
    if (sourceFile) {
      const uploadResult = await uploadSourceFile(
        sourceFile,
        organizationId,
        vendorId,
        invoiceDate
      );
      documentPath = uploadResult.path;
      documentHash = uploadResult.hash;
    }

    // Step 2: Record import batch
    const importId = await recordImportBatch({
      organizationId,
      vendorId,
      importType,
      fileName: sourceFile?.name || `${vendorId}_${invoiceNumber}_${invoiceDate.toISOString().split('T')[0]}`,
      fileUrl: documentPath,
      itemsCount: lineItems.length,
      priceChanges: approvedChanges.length,
      newItems: 0, // TODO: Calculate from unmatched items
      invoiceDate,
      createdBy,
    });

    // Step 3: Get current prices for matching ingredients
    const itemCodes = lineItems.map(item => item.item_code);
    const { data: ingredients } = await supabase
      .from('master_ingredients')
      .select('id, item_code, current_price')
      .in('item_code', itemCodes);

    const ingredientMap = new Map<string, { id: string; currentPrice: number }>();
    ingredients?.forEach(ing => {
      ingredientMap.set(ing.item_code, { 
        id: ing.id, 
        currentPrice: ing.current_price 
      });
    });

    // Step 4: Calculate total and create invoice header
    const totalAmount = lineItems.reduce(
      (sum, item) => sum + (item.quantity || 1) * item.unit_price,
      0
    );

    const invoiceResult = await createInvoiceHeader({
      organizationId,
      vendorId,
      invoiceNumber,
      invoiceDate,
      totalAmount,
      documentFilePath: documentPath,
      documentHash: documentHash,
      importId,
      createdBy,
    });
    
    const invoiceId = invoiceResult.id;

    // Step 5: Create invoice line items
    const itemIdMap = await createInvoiceLineItems(
      invoiceId,
      lineItems,
      ingredientMap
    );

    // Step 6: Create price history with audit links (only for approved changes)
    const auditedChanges: AuditedPriceChange[] = approvedChanges
      .filter(change => ingredientMap.has(change.itemCode))
      .map(change => {
        const ingredient = ingredientMap.get(change.itemCode)!;
        const invoiceItemId = itemIdMap.get(change.itemCode);
        
        if (!invoiceItemId) {
          throw new Error(`No invoice item found for ${change.itemCode}`);
        }

        return {
          ingredientId: ingredient.id,
          itemCode: change.itemCode,
          previousPrice: ingredient.currentPrice,
          newPrice: change.newPrice,
          invoiceItemId,
        };
      });

    if (auditedChanges.length > 0) {
      await createPriceHistory(
        organizationId,
        vendorId,
        auditedChanges,
        importType,
        invoiceDate,
        createdBy,
        importId // Pass the import ID for linking
      );

      // Step 7: Update master ingredient prices
      await updateIngredientPrices(
        auditedChanges.map(c => ({
          ingredientId: c.ingredientId,
          newPrice: c.newPrice,
        }))
      );
    }

    // Step 8: Mark invoice as processed
    await verifyInvoice(invoiceId, createdBy);

    // Step 9: Log to NEXUS for audit trail
    // Get vendor name for the notification
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('name')
      .eq('id', vendorId)
      .single();
    const vendorName = vendorData?.name || vendorId;

    if (params.isSupersede) {
      // Log supersede event (critical audit event)
      await nexus({
        organization_id: organizationId,
        user_id: createdBy,
        activity_type: 'invoice_superseded',
        details: {
          vendor: vendorName,
          vendor_id: vendorId,
          filename: sourceFile?.name || invoiceNumber,
          superseded_filename: params.supersededFilename,
          version: params.versionNumber || 2,
          invoice_date: invoiceDate.toISOString().split('T')[0],
          item_count: lineItems.length,
          price_changes: auditedChanges.length,
          import_id: importId,
        },
      });
    } else {
      // Log standard import event
      await nexus({
        organization_id: organizationId,
        user_id: createdBy,
        activity_type: 'invoice_imported',
        details: {
          vendor: vendorName,
          vendor_id: vendorId,
          filename: sourceFile?.name || invoiceNumber,
          invoice_date: invoiceDate.toISOString().split('T')[0],
          item_count: lineItems.length,
          price_changes: auditedChanges.length,
          import_id: importId,
        },
      });
    }

    return {
      invoiceId,
      importId,
      priceChangesCount: auditedChanges.length,
    };

  } catch (error) {
    console.error('Error processing invoice with audit trail:', error);
    throw error;
  }
}

/**
 * Get audit trail for a specific price change
 */
export async function getPriceAuditTrail(priceHistoryId: string) {
  const { data, error } = await supabase
    .from('vendor_price_audit_trail')
    .select('*')
    .eq('price_history_id', priceHistoryId)
    .single();

  if (error) {
    throw new Error(`Failed to get audit trail: ${error.message}`);
  }

  return data;
}

/**
 * Get audit summary for organization
 */
export async function getOrganizationAuditSummary(organizationId: string) {
  const { data, error } = await supabase
    .rpc('get_price_audit_summary', { org_id: organizationId });

  if (error) {
    throw new Error(`Failed to get audit summary: ${error.message}`);
  }

  return data;
}
