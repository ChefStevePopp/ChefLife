// =============================================================================
// FLANAGAN PDF PARSER - Physical Invoice Format (2026)
// =============================================================================
// Parses Flanagan Foodservice ACTUAL COMPANY INVOICES (not portal exports)
// 
// Invoice Structure:
// - Header with customer info, dates, order numbers
// - Tabular line items with columns:
//   REF.NO | PRODUCT NO | ORDER QTY | UNIT | PACK/SIZE | DESCRIPTION | TAX | QTY SHIPPED | CODE | QTY BO | UNIT PRICE | EXTENSION
// - Multi-line descriptions (WEIGHT: appears on continuation line)
// - Footer with totals
//
// Philosophy: Parse the SOURCE OF TRUTH - physical invoices don't change
// =============================================================================

export interface FlanaganLineItem {
  quantity: number;        // QTY SHIPPED (what we actually received)
  quantityOrdered: number; // ORDER QTY
  itemCode: string;        // PRODUCT NO (asterisk stripped for MIL matching)
  unit: string;            // UNIT (CA, etc.)
  packSize: string;        // PACK/SIZE (1/19KG, 12/1LT, etc.)
  unitPrice: number;       // UNIT PRICE
  lineTotal: number;       // EXTENSION
  productName: string;     // DESCRIPTION
  weight?: number;         // Extracted from "WEIGHT: X.XX" line
  rawDescription?: string;
}

export interface FlanaganInvoice {
  invoiceDate: Date | null;
  invoiceNumber: string;
  orderNumber: string;
  customerNumber: string;
  customerName: string;
  vendorName: string;
  totalItems: number;
  estimatedTotal: number;
  lineItems: FlanaganLineItem[];
  parseConfidence: number;
  parseWarnings: string[];
}

/**
 * Parse Flanagan physical invoice PDF text
 */
export function parseFlanaganInvoice(pdfText: string): FlanaganInvoice {
  const warnings: string[] = [];
  
  // Normalize text - pdf.js can give us weird spacing
  const rawLines = pdfText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  console.log('[Flanagan Parser] Raw lines count:', rawLines.length);
  console.log('[Flanagan Parser] First 30 lines:', rawLines.slice(0, 30));
  
  // ---------------------------------------------------------------------------
  // STEP 1: Extract header metadata
  // ---------------------------------------------------------------------------
  let invoiceDate: Date | null = null;
  let invoiceNumber = '';
  let orderNumber = '';
  let customerNumber = '';
  let customerName = '';
  
  // Look for date pattern: "07-JAN-26" or "14-JAN-26"
  const datePattern = /(\d{1,2})-([A-Z]{3})-(\d{2})/i;
  for (const line of rawLines.slice(0, 50)) {
    const dateMatch = line.match(datePattern);
    if (dateMatch && !invoiceDate) {
      const day = parseInt(dateMatch[1]);
      const monthStr = dateMatch[2].toUpperCase();
      const year = 2000 + parseInt(dateMatch[3]);
      
      const months: Record<string, number> = {
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
        'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
      };
      
      if (months[monthStr] !== undefined) {
        invoiceDate = new Date(year, months[monthStr], day);
      }
    }
    
    // Look for order number (usually 5 digits like 44058)
    if (line.match(/^\d{5}$/) && !orderNumber) {
      orderNumber = line;
    }
    
    // Customer number and name: "31607 MEMPHIS FIRE BARBEQUE COMPANY IN"
    const customerMatch = line.match(/^(\d{5})\s+([A-Z\s]+(?:COMPANY|INC|LTD|LLC|CORP)?.*)/i);
    if (customerMatch && !customerNumber) {
      customerNumber = customerMatch[1];
      customerName = customerMatch[2].trim();
    }
  }
  
  if (!invoiceDate) {
    warnings.push('Could not parse invoice date');
  }
  
  // ---------------------------------------------------------------------------
  // STEP 2: Find and parse line items
  // ---------------------------------------------------------------------------
  // Strategy: Look for lines that start with a product code (6 digits, possibly with *)
  // Product codes: 167621, 209240*, 222847*, 222850*, 234259, etc.
  
  const lineItems: FlanaganLineItem[] = [];
  const productCodePattern = /^(\d{6}\*?)$/;
  
  // First pass: identify product code positions
  const productCodeIndices: number[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    if (productCodePattern.test(rawLines[i])) {
      productCodeIndices.push(i);
    }
  }
  
  // Also try to extract date from header area if not found yet
  // Look for patterns like "14-JAN-26" or "07-JAN-26"
  if (!invoiceDate) {
    for (const line of rawLines) {
      const altDateMatch = line.match(/(\d{1,2})-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-(\d{2})/i);
      if (altDateMatch) {
        const day = parseInt(altDateMatch[1]);
        const monthStr = altDateMatch[2].toUpperCase();
        const year = 2000 + parseInt(altDateMatch[3]);
        
        const months: Record<string, number> = {
          'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
          'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
        };
        
        if (months[monthStr] !== undefined) {
          invoiceDate = new Date(year, months[monthStr], day);
          console.log('[Flanagan Parser] Found date in line:', line, '->', invoiceDate);
          break;
        }
      }
    }
  }
  
  console.log('[Flanagan Parser] Found product codes at indices:', productCodeIndices);
  console.log('[Flanagan Parser] Product codes:', productCodeIndices.map(i => rawLines[i]));
  
  // Second pass: extract data around each product code
  // The pattern in tabular PDFs is often:
  // - Cells are extracted in reading order (left to right, top to bottom)
  // - Each row's cells appear as consecutive lines
  
  for (let idx = 0; idx < productCodeIndices.length; idx++) {
    const codeIndex = productCodeIndices[idx];
    const nextCodeIndex = productCodeIndices[idx + 1] || rawLines.length;
    
    // Strip asterisk from item code (Flanagan's "must verify at delivery" marker)
    // Not relevant for invoice processing, just need clean code for MIL matching
    const itemCode = rawLines[codeIndex].replace('*', '');
    
    // Look backwards and forwards for related data
    // Typical extraction order: ORDER QTY | PRODUCT NO | UNIT | PACK/SIZE | DESCRIPTION...
    
    // Search window: 5 lines before, up to next product code
    const windowStart = Math.max(0, codeIndex - 5);
    const windowEnd = Math.min(rawLines.length, nextCodeIndex);
    const window = rawLines.slice(windowStart, windowEnd);
    
    console.log(`[Flanagan Parser] Item ${itemCode} window:`, window);
    
    // Extract quantity (usually "1" right before or after code)
    let quantityOrdered = 1;
    let quantityShipped = 1;
    
    // Look for numbers that look like quantities (1, 2, etc. or 1.00, 2.00)
    for (let i = codeIndex - 3; i < codeIndex && i >= 0; i++) {
      const qtyMatch = rawLines[i].match(/^(\d+)$/);
      if (qtyMatch) {
        quantityOrdered = parseInt(qtyMatch[1]);
        break;
      }
    }
    
    // Extract unit (CA, EA, etc.) - usually right after product code
    let unit = 'CA';
    for (let i = codeIndex + 1; i < codeIndex + 3 && i < rawLines.length; i++) {
      if (/^(CA|EA|BX|CS|PK|BG|LB|KG)$/i.test(rawLines[i])) {
        unit = rawLines[i].toUpperCase();
        break;
      }
    }
    
    // Extract pack size (pattern: number/number+unit like 1/19KG, 12/1LT, 6/10LB)
    let packSize = '';
    for (let i = codeIndex + 1; i < codeIndex + 5 && i < rawLines.length; i++) {
      if (/^\d+\/\d+[A-Z]+$/i.test(rawLines[i])) {
        packSize = rawLines[i];
        break;
      }
    }
    
    // Extract description - look for text in parens or ALL CAPS product names
    let productName = '';
    let weight: number | undefined;
    
    for (let i = codeIndex + 1; i < windowEnd; i++) {
      const line = rawLines[i];
      
      // Skip if it's another product code
      if (productCodePattern.test(line)) break;
      
      // Weight line: "WEIGHT: 19.29"
      const weightMatch = line.match(/WEIGHT:\s*([\d.]+)/i);
      if (weightMatch) {
        weight = parseFloat(weightMatch[1]);
        continue;
      }
      
      // Description: starts with ( or is ALL CAPS words
      if (line.startsWith('(') || /^[A-Z][A-Z\s%\d"'\/]+$/.test(line)) {
        if (productName) {
          productName += ' ' + line;
        } else {
          productName = line;
        }
      }
    }
    
    // Extract prices - look for decimal numbers in the window
    // Unit price and extension are usually near the end
    let unitPrice = 0;
    let lineTotal = 0;
    
    const pricePattern = /^(\d+\.\d{2})$/;
    const prices: number[] = [];
    
    for (let i = codeIndex + 1; i < windowEnd; i++) {
      const match = rawLines[i].match(pricePattern);
      if (match) {
        prices.push(parseFloat(match[1]));
      }
    }
    
    // Also look for QTY SHIPPED (format: 1.00)
    for (let i = codeIndex + 1; i < windowEnd; i++) {
      const qtyShipMatch = rawLines[i].match(/^(\d+\.\d{2})$/);
      if (qtyShipMatch) {
        const val = parseFloat(qtyShipMatch[1]);
        // If it's a small number (< 100), it might be qty shipped
        if (val < 100 && val === Math.floor(val)) {
          quantityShipped = val;
        }
      }
    }
    
    console.log(`[Flanagan Parser] Item ${itemCode} prices found:`, prices);
    
    // Typically: smaller price is unit price, larger is extension (line total)
    if (prices.length >= 2) {
      // Sort to find unit price (smaller) vs extension (larger)
      const sortedPrices = [...prices].sort((a, b) => a - b);
      
      // The largest is usually the extension
      lineTotal = sortedPrices[sortedPrices.length - 1];
      
      // Look for a price that when multiplied by qty gives us the extension
      for (const p of sortedPrices) {
        // Check if this could be the unit price
        // For catch weight items, total = weight * unit price
        if (weight && Math.abs(weight * p - lineTotal) < 0.1) {
          unitPrice = p;
          break;
        }
        // For fixed qty items, total = qty * unit price
        if (Math.abs(quantityOrdered * p - lineTotal) < 0.1) {
          unitPrice = p;
          break;
        }
      }
      
      // Fallback: second-to-last price is often unit price
      if (!unitPrice && sortedPrices.length >= 2) {
        unitPrice = sortedPrices[sortedPrices.length - 2];
      }
    } else if (prices.length === 1) {
      lineTotal = prices[0];
    }
    
    // If we have weight, this is a catch-weight item
    // The quantity is actually the weight for pricing
    if (weight) {
      quantityShipped = weight;
    }
    
    lineItems.push({
      quantity: quantityShipped,
      quantityOrdered,
      itemCode,  // Already stripped of * above
      unit,
      packSize,
      unitPrice,
      lineTotal,
      productName: productName || `Product ${itemCode}`,
      weight,
      rawDescription: productName,
    });
  }
  
  // ---------------------------------------------------------------------------
  // STEP 3: Calculate totals and confidence
  // ---------------------------------------------------------------------------
  const totalItems = lineItems.length;
  const estimatedTotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  
  let confidence = 100;
  
  if (lineItems.length === 0) {
    confidence = 0;
    warnings.push('No line items could be parsed');
  } else {
    // Check for items missing key data
    const missingPrices = lineItems.filter(i => !i.unitPrice).length;
    const missingNames = lineItems.filter(i => i.productName.startsWith('Product ')).length;
    
    if (missingPrices > 0) {
      confidence -= missingPrices * 10;
      warnings.push(`${missingPrices} items missing unit price`);
    }
    
    if (missingNames > 0) {
      confidence -= missingNames * 5;
      warnings.push(`${missingNames} items missing product name`);
    }
  }
  
  if (!invoiceDate) {
    confidence -= 10;
  }
  
  console.log('[Flanagan Parser] Final result:', {
    lineItems: lineItems.length,
    total: estimatedTotal,
    confidence,
    warnings,
  });
  
  return {
    invoiceDate,
    invoiceNumber,
    orderNumber,
    customerNumber,
    customerName,
    vendorName: 'Flanagan Foodservice',
    totalItems,
    estimatedTotal,
    lineItems,
    parseConfidence: Math.max(0, confidence),
    parseWarnings: warnings,
  };
}

// =============================================================================
// VENDOR DETECTION
// =============================================================================

/**
 * Detect if PDF text is from Flanagan Foodservice
 */
export function isFlanaganInvoice(pdfText: string): boolean {
  const indicators = [
    'Flanagan',
    'FOODSERVICE',
    'flanagan.ca',
    '145 Otonabee Dr',
    'Kitchener, Ontario',
    'KIT:FLANAGAN',
  ];
  
  const upperText = pdfText.toUpperCase();
  return indicators.some(indicator => upperText.includes(indicator.toUpperCase()));
}
