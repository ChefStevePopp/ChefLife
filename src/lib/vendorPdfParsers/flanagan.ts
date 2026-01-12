// =============================================================================
// FLANAGAN PDF PARSER
// =============================================================================
// Parses Flanagan Foodservice invoices (2026+ format)
// Structure: Grid data → Totals → Header info → Descriptions
// =============================================================================

export interface FlanaganLineItem {
  quantity: number;
  itemCode: string;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  productName: string;
  brand?: string;
  packSize?: string;
  rawDescription?: string;
}

export interface FlanaganInvoice {
  invoiceDate: Date | null;
  fulfillmentType: string;
  customerNumber: string;
  customerName: string;
  vendorName: string;
  totalItems: number;
  estimatedTotal: number;
  lineItems: FlanaganLineItem[];
  parseConfidence: number; // 0-100
  parseWarnings: string[];
}

/**
 * Parse Flanagan PDF text into structured invoice data
 */
export function parseFlanaganInvoice(pdfText: string): FlanaganInvoice {
  const lines = pdfText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const warnings: string[] = [];
  
  // ---------------------------------------------------------------------------
  // STEP 1: Find section boundaries
  // ---------------------------------------------------------------------------
  const headerEndIndex = lines.findIndex(l => l === 'Line total') + 1;
  const totalItemsIndex = lines.findIndex(l => l === 'Total Items');
  const deliveryIndex = lines.findIndex(l => l === 'Delivery' || l === 'Pickup');
  
  if (totalItemsIndex === -1) {
    warnings.push('Could not find "Total Items" marker');
  }
  if (deliveryIndex === -1) {
    warnings.push('Could not find fulfillment type marker');
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Extract grid data (between header and "Total Items")
  // ---------------------------------------------------------------------------
  const gridLines = lines.slice(headerEndIndex, totalItemsIndex > 0 ? totalItemsIndex : undefined);
  const gridItems: Array<{qty: number; code: string; unit: string; price: number; total: number}> = [];
  
  let i = 0;
  while (i < gridLines.length) {
    const qty = parseInt(gridLines[i]);
    
    // If we hit a non-number, we've reached the end of grid data
    if (isNaN(qty)) break;
    
    // Parse 5-value group: qty, code, unit, price, total
    const itemCode = gridLines[i + 1] || '';
    const unit = gridLines[i + 2] || 'Case';
    const price = parsePrice(gridLines[i + 3]);
    const total = parsePrice(gridLines[i + 4]);
    
    gridItems.push({ qty, code: itemCode, unit, price, total });
    i += 5;
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Extract totals
  // ---------------------------------------------------------------------------
  let totalItems = gridItems.length;
  let estimatedTotal = 0;
  
  if (totalItemsIndex > 0) {
    // Line after "Total Items" should be the count
    const countLine = lines[totalItemsIndex + 1];
    const parsedCount = parseInt(countLine);
    if (!isNaN(parsedCount)) {
      totalItems = parsedCount;
    }
    
    // Next line should be the total amount
    const totalLine = lines[totalItemsIndex + 2];
    estimatedTotal = parsePrice(totalLine);
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Extract invoice metadata
  // ---------------------------------------------------------------------------
  let invoiceDate: Date | null = null;
  let fulfillmentType = 'Delivery';
  let customerNumber = '';
  let customerName = '';
  
  // Find fulfillment date (line before "Delivery" or "Pickup")
  if (deliveryIndex > 0) {
    const dateStr = lines[deliveryIndex - 1];
    invoiceDate = parseFlanaganDate(dateStr);
    fulfillmentType = lines[deliveryIndex];
  }
  
  // Find customer info
  const customerIndex = lines.findIndex(l => l.startsWith('Customer:'));
  if (customerIndex > 0) {
    const customerLine = lines[customerIndex + 1] || '';
    // Format: "31607 MEMPHIS FIRE BARBEQUE COMPANY INC"
    const match = customerLine.match(/^(\d+)\s+(.+)$/);
    if (match) {
      customerNumber = match[1];
      customerName = match[2];
    } else {
      customerName = customerLine;
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 5: Extract product descriptions (after fulfillment type)
  // ---------------------------------------------------------------------------
  const descriptionLines = deliveryIndex > 0 ? lines.slice(deliveryIndex + 1) : [];
  const descriptions: Array<{name: string; brand?: string; packSize?: string; raw: string}> = [];
  
  let currentDesc: string[] = [];
  
  for (const line of descriptionLines) {
    // Product names are ALL CAPS, brand lines start with "Brand:" or "JIT |"
    if (line.startsWith('Brand:') || line.startsWith('JIT |')) {
      // This is metadata for the previous product
      if (currentDesc.length > 0) {
        const productName = currentDesc.join(' ').trim();
        const parsed = parseDescriptionLine(line);
        descriptions.push({
          name: productName,
          brand: parsed.brand,
          packSize: parsed.packSize,
          raw: `${productName}\n${line}`
        });
        currentDesc = [];
      }
    } else if (line.match(/^[A-Z0-9\s\/%"'&-]+$/) && line.length > 3) {
      // Likely a product name (ALL CAPS)
      if (currentDesc.length > 0) {
        // Previous product had no brand line, save it
        const productName = currentDesc.join(' ').trim();
        descriptions.push({ name: productName, raw: productName });
      }
      currentDesc = [line];
    } else if (currentDesc.length > 0 && !line.startsWith('|')) {
      // Continuation of product name or metadata
      currentDesc.push(line);
    }
  }
  
  // Don't forget the last product
  if (currentDesc.length > 0) {
    const productName = currentDesc.join(' ').trim();
    descriptions.push({ name: productName, raw: productName });
  }

  // ---------------------------------------------------------------------------
  // STEP 6: Merge grid data with descriptions
  // ---------------------------------------------------------------------------
  const lineItems: FlanaganLineItem[] = gridItems.map((item, index) => {
    const desc = descriptions[index];
    return {
      quantity: item.qty,
      itemCode: item.code,
      unit: item.unit,
      unitPrice: item.price,
      lineTotal: item.total,
      productName: desc?.name || `Unknown Product (${item.code})`,
      brand: desc?.brand,
      packSize: desc?.packSize,
      rawDescription: desc?.raw
    };
  });

  // ---------------------------------------------------------------------------
  // STEP 7: Calculate confidence score
  // ---------------------------------------------------------------------------
  let confidence = 100;
  
  // Deduct for mismatched counts
  if (gridItems.length !== descriptions.length) {
    confidence -= 20;
    warnings.push(`Grid items (${gridItems.length}) don't match descriptions (${descriptions.length})`);
  }
  
  // Deduct for missing metadata
  if (!invoiceDate) {
    confidence -= 10;
    warnings.push('Could not parse invoice date');
  }
  
  // Deduct for each item with missing product name
  const missingNames = lineItems.filter(i => i.productName.startsWith('Unknown')).length;
  if (missingNames > 0) {
    confidence -= missingNames * 5;
    warnings.push(`${missingNames} items missing product names`);
  }
  
  // Deduct if totals don't match
  const calculatedTotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  if (Math.abs(calculatedTotal - estimatedTotal) > 0.1) {
    confidence -= 10;
    warnings.push(`Calculated total ($${calculatedTotal.toFixed(2)}) differs from stated total ($${estimatedTotal.toFixed(2)})`);
  }

  return {
    invoiceDate,
    fulfillmentType,
    customerNumber,
    customerName,
    vendorName: 'Flanagan Foodservice',
    totalItems,
    estimatedTotal,
    lineItems,
    parseConfidence: Math.max(0, confidence),
    parseWarnings: warnings
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function parsePrice(str: string): number {
  if (!str) return 0;
  // Remove $ and commas, parse as float
  const cleaned = str.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function parseFlanaganDate(str: string): Date | null {
  if (!str) return null;
  
  // Format: "7 Jan 2026"
  const match = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const monthStr = match[2];
    const year = parseInt(match[3]);
    
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = months[monthStr];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }
  
  // Try standard date parsing as fallback
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseDescriptionLine(line: string): { brand?: string; packSize?: string } {
  const result: { brand?: string; packSize?: string } = {};
  
  // Extract brand
  const brandMatch = line.match(/Brand:\s*([^|]+)/);
  if (brandMatch) {
    result.brand = brandMatch[1].trim();
  }
  
  // Extract pack size
  const packMatch = line.match(/Pack Size:\s*([^|]+)/);
  if (packMatch) {
    result.packSize = packMatch[1].trim();
  }
  
  return result;
}

// =============================================================================
// VENDOR DETECTION
// =============================================================================

/**
 * Detect if PDF text is from Flanagan Foodservice
 */
export function isFlanaganInvoice(pdfText: string): boolean {
  const indicators = [
    'Flanagan Foodservice',
    'flanagan.ca',
    '145 Otonabee Dr',
    'Kitchener, Ontario N2C'
  ];
  
  const lowerText = pdfText.toLowerCase();
  return indicators.some(indicator => lowerText.includes(indicator.toLowerCase()));
}
