// =============================================================================
// PDF PARSER SERVICE
// =============================================================================
// Text-based PDF parsing for digital-native vendor invoices
// Uses pdf.js for text extraction, vendor-specific patterns for parsing
// 
// NOTE: pdf.js extracts text in visual/positional order, which can scramble
// tabular data. We use pattern matching that doesn't depend on line order.
// =============================================================================

import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// =============================================================================
// TYPES
// =============================================================================

export interface ParsedInvoiceItem {
  itemCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  extendedPrice: number;
  brand?: string;
  packSize?: string;
  isSubstitution?: boolean;
  weight?: number;
}

export interface ParsedInvoice {
  vendor: string;
  invoiceDate: string | null;
  invoiceNumber?: string;
  customerNumber?: string;
  customerName?: string;
  fulfillmentType?: string;
  paymentTerms?: string;
  paymentDueDate?: string;
  items: ParsedInvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  totalItems: number;
  rawText: string;
  parseConfidence: number;
  parseWarnings: string[];
}

export interface VendorParserConfig {
  vendorId: string;
  parserType: "flanagan" | "flanagan-portal" | "gfs" | "sysco" | "generic";
}

// =============================================================================
// PDF TEXT EXTRACTION
// =============================================================================

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join("\n");
      fullText += pageText + "\n";
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

// =============================================================================
// FLANAGAN OFFICIAL INVOICE PARSER
// =============================================================================
// Parses the standard Flanagan delivery invoice
// Uses pattern matching that's resilient to text extraction order
// =============================================================================

function parseFlanaganOfficialInvoice(text: string): ParsedInvoice {
  const warnings: string[] = [];
  const items: ParsedInvoiceItem[] = [];
  
  // Normalize text - combine lines and clean up
  const normalizedText = text.replace(/\n+/g, " ").replace(/\s+/g, " ");
  
  // Extract invoice metadata
  let invoiceNumber: string | undefined;
  const invMatch = normalizedText.match(/(?:INVOICE\s*(?:NO)?\.?\s*)?(\d{7})/i);
  if (invMatch) {
    invoiceNumber = invMatch[1];
  }

  let invoiceDate: string | null = null;
  const dateMatch = text.match(/(\d{2})-([A-Z]{3})-(\d{2})/i);
  if (dateMatch) {
    const [_, day, monthStr, year] = dateMatch;
    const monthMap: Record<string, string> = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04",
      MAY: "05", JUN: "06", JUL: "07", AUG: "08",
      SEP: "09", OCT: "10", NOV: "11", DEC: "12"
    };
    const month = monthMap[monthStr.toUpperCase()] || "01";
    invoiceDate = `20${year}-${month}-${day}`;
  }

  let customerNumber: string | undefined;
  let customerName: string | undefined;
  const custMatch = normalizedText.match(/(\d{5})\s+(MEMPHIS FIRE[^0-9]+)/i) ||
                    normalizedText.match(/(\d{5})\s+([A-Z][A-Z\s]+(COMPANY|INC|LLC|LTD))/i);
  if (custMatch) {
    customerNumber = custMatch[1];
    customerName = custMatch[2].trim();
  }

  let paymentTerms: string | undefined;
  const termsMatch = normalizedText.match(/NET\s+(\d+)\s+DAYS/i);
  if (termsMatch) {
    paymentTerms = `NET ${termsMatch[1]} DAYS`;
  }

  // =========================================================================
  // PARSE LINE ITEMS - Use regex to match complete product lines
  // =========================================================================
  // Format: CODE [*] QTY CA PACKSIZE DESCRIPTION [G] QTY_SHIPPED UNIT_PRICE EXTENSION
  // Example: 167621 1 CA 1/19KG (ONTLOCAL) CONEST PORK BACK RIB TAIL 1.00 4.52 87.19
  //
  // IMPORTANT: Skip WEIGHT values - they appear after "WEIGHT:" and are not prices
  // =========================================================================

  // First, remove WEIGHT values from the text to avoid confusion
  // WEIGHT values appear as "WEIGHT: 27.84" or "WEIGHT: 19.29"
  const textWithoutWeights = text.replace(/WEIGHT:\s*[\d.]+/gi, "WEIGHT_REMOVED");
  
  // Also mark END lines (continuation lines)
  const cleanText = textWithoutWeights.replace(/\bEND\b/gi, "CONTINUATION");

  // Find product lines using a more specific pattern
  // Look for: 6-digit code, then eventually 3 numbers at end (qty, price, extension)
  const productLineRegex = /(\d{6})(\*)?\s+\d+\s+CA\s+([\d\/A-Z.]+)\s+(.+?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g;
  
  let match;
  while ((match = productLineRegex.exec(cleanText)) !== null) {
    const [fullMatch, code, isSub, packSize, description, qtyShipped, unitPrice, extension] = match;
    
    // Skip if this looks like FUEL CHARGE or other non-product
    if (description.includes("FUEL") || description.includes("CHARGE")) continue;
    
    // Clean up description - remove (ONTLOCAL) prefix and trailing G (tax indicator)
    let cleanDesc = description
      .replace(/^\([^)]+\)\s*/, "")  // Remove (ONTLOCAL) etc
      .replace(/\s+G\s*$/, "")        // Remove trailing G
      .replace(/\s+$/, "")            // Trim
      .trim();
    
    // Extract brand from description (first word if all caps)
    let brand: string | undefined;
    const brandMatch = cleanDesc.match(/^([A-Z]{2,})\s+/);
    if (brandMatch) {
      brand = brandMatch[1];
    }

    const qty = parseFloat(qtyShipped) || 1;
    const price = parseFloat(unitPrice) || 0;
    const ext = parseFloat(extension) || 0;

    // Validate - extension should roughly equal qty * price (within 10%)
    const calculatedExt = qty * price;
    const isValid = ext > 0 && (Math.abs(calculatedExt - ext) / ext < 0.1 || calculatedExt === 0);
    
    if (isValid || ext > 0) {
      items.push({
        itemCode: code,
        productName: cleanDesc || `Product ${code}`,
        quantity: qty,
        unit: "CA",
        unitPrice: price,
        extendedPrice: ext,
        packSize,
        brand,
        isSubstitution: isSub === "*",
      });
    }
  }

  // If regex didn't find items, try a more lenient approach
  if (items.length === 0) {
    console.log("[PDF Parser] Regex found no items, trying lenient approach");
    
    // Find all 6-digit codes
    const codeMatches = cleanText.matchAll(/(\d{6})(\*)?/g);
    
    for (const codeMatch of codeMatches) {
      const code = codeMatch[1];
      const position = codeMatch.index || 0;
      
      // Skip known non-product codes (phone numbers, etc)
      if (["748687", "930767", "102608"].includes(code)) continue;
      
      // Get text after this code (next 200 chars)
      const afterCode = cleanText.substring(position, position + 250);
      
      // Skip if FUEL CHARGE
      if (afterCode.includes("FUEL CHARGE")) continue;
      
      // Find pack size
      const packMatch = afterCode.match(/CA\s+([\d\/]+[A-Z]+)/i);
      const packSize = packMatch ? packMatch[1] : undefined;
      
      // Find the three numbers at the end of this line segment
      // Look for pattern: decimal decimal decimal
      const numbersMatch = afterCode.match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s|$)/);
      
      if (numbersMatch) {
        const qty = parseFloat(numbersMatch[1]) || 1;
        const price = parseFloat(numbersMatch[2]) || 0;
        const ext = parseFloat(numbersMatch[3]) || 0;
        
        // Get description between pack size and numbers
        let description = "";
        if (packMatch && numbersMatch) {
          const descStart = afterCode.indexOf(packMatch[0]) + packMatch[0].length;
          const descEnd = afterCode.indexOf(numbersMatch[0]);
          description = afterCode.substring(descStart, descEnd).trim();
          description = description.replace(/\s+G\s*$/, "").trim();
        }
        
        if (ext > 0) {
          items.push({
            itemCode: code,
            productName: description || `Product ${code}`,
            quantity: qty,
            unit: "CA",
            unitPrice: price,
            extendedPrice: ext,
            packSize,
            isSubstitution: codeMatch[2] === "*",
          });
        }
      }
    }
  }

  // Remove duplicates
  const uniqueItems = items.filter((item, index, self) =>
    index === self.findIndex(t => t.itemCode === item.itemCode)
  );

  // Sort by item code for consistency
  uniqueItems.sort((a, b) => a.itemCode.localeCompare(b.itemCode));

  // Calculate totals
  const calculatedSubtotal = uniqueItems.reduce((sum, item) => sum + item.extendedPrice, 0);

  let subtotal = calculatedSubtotal;
  let tax = 0;
  let total = 0;

  const subtotalMatch = normalizedText.match(/INVOICE SUBTOTAL[^\d]*\$?([\d,]+\.\d{2})/i);
  if (subtotalMatch) {
    subtotal = parseFloat(subtotalMatch[1].replace(/,/g, "")) || calculatedSubtotal;
  }

  const taxMatch = normalizedText.match(/GST\/HST[^\d]*(\d+\.\d{2})/i);
  if (taxMatch) {
    tax = parseFloat(taxMatch[1]) || 0;
  }

  const totalMatch = normalizedText.match(/PLEASE PAY THIS AMOUNT[^\d]*\$?([\d,]+\.\d{2})/i);
  if (totalMatch) {
    total = parseFloat(totalMatch[1].replace(/,/g, "")) || (subtotal + tax);
  } else {
    total = subtotal + tax;
  }

  // Calculate confidence
  let confidence = 100;
  if (!invoiceNumber) {
    confidence -= 10;
    warnings.push("Could not find invoice number");
  }
  if (!invoiceDate) {
    confidence -= 10;
    warnings.push("Could not find invoice date");
  }
  if (uniqueItems.length === 0) {
    confidence -= 50;
    warnings.push("No items parsed");
  } else if (uniqueItems.length < 5) {
    confidence -= 10;
    warnings.push(`Only ${uniqueItems.length} items parsed - may be incomplete`);
  }
  
  // Check if subtotals roughly match
  if (subtotal > 0 && Math.abs(calculatedSubtotal - subtotal) > 50) {
    confidence -= 15;
    warnings.push(`Subtotal mismatch: calculated ${calculatedSubtotal.toFixed(2)} vs stated ${subtotal.toFixed(2)}`);
  }

  return {
    vendor: "Flanagan",
    invoiceDate,
    invoiceNumber,
    customerNumber,
    customerName,
    paymentTerms,
    fulfillmentType: "Delivery",
    items: uniqueItems,
    subtotal,
    tax,
    total,
    totalItems: uniqueItems.length,
    rawText: text,
    parseConfidence: Math.max(0, confidence),
    parseWarnings: warnings,
  };
}

// =============================================================================
// FLANAGAN PORTAL PARSER (simpler customer portal format)
// =============================================================================

function parseFlanaganPortalInvoice(text: string): ParsedInvoice {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const warnings: string[] = [];
  
  const headerEndIndex = lines.findIndex(l => l === "Line total") + 1;
  const totalItemsIndex = lines.findIndex(l => l === "Total Items");
  const deliveryIndex = lines.findIndex(l => l === "Delivery" || l === "Pickup");
  
  if (headerEndIndex <= 0) {
    warnings.push("Could not find header end marker");
  }
  
  const gridLines = lines.slice(
    headerEndIndex, 
    totalItemsIndex > 0 ? totalItemsIndex : undefined
  );
  
  const gridItems: Array<{
    qty: number;
    code: string;
    unit: string;
    price: number;
    total: number;
  }> = [];
  
  let i = 0;
  while (i < gridLines.length) {
    const qty = parseInt(gridLines[i]);
    if (isNaN(qty)) break;
    
    const itemCode = gridLines[i + 1] || "";
    const unit = gridLines[i + 2] || "Case";
    const price = parseFloat((gridLines[i + 3] || "").replace(/[$,]/g, "")) || 0;
    const total = parseFloat((gridLines[i + 4] || "").replace(/[$,]/g, "")) || 0;
    
    gridItems.push({ qty, code: itemCode, unit, price, total });
    i += 5;
  }
  
  let subtotal = 0;
  let totalItemCount = 0;
  if (totalItemsIndex > 0) {
    totalItemCount = parseInt(lines[totalItemsIndex + 1]) || gridItems.length;
    const totalStr = lines[totalItemsIndex + 2] || "";
    subtotal = parseFloat(totalStr.replace(/[$,]/g, "")) || 0;
  }
  
  let invoiceDate: string | null = null;
  if (deliveryIndex > 0) {
    const dateStr = lines[deliveryIndex - 1];
    const dateMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      const monthMap: Record<string, string> = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04",
        May: "05", Jun: "06", Jul: "07", Aug: "08",
        Sep: "09", Oct: "10", Nov: "11", Dec: "12"
      };
      const monthNum = monthMap[month] || "01";
      invoiceDate = `${year}-${monthNum}-${day.padStart(2, "0")}`;
    }
  }
  
  const customerIndex = lines.findIndex(l => l === "Customer:");
  let customerNumber: string | undefined;
  let customerName: string | undefined;
  if (customerIndex > 0) {
    const customerLine = lines[customerIndex + 1] || "";
    const match = customerLine.match(/^(\d+)\s+(.+)/);
    if (match) {
      customerNumber = match[1];
      customerName = match[2];
    } else {
      customerName = customerLine;
    }
  }
  
  const fulfillmentType = deliveryIndex > 0 ? lines[deliveryIndex] : undefined;
  
  const descriptions: Array<{
    name: string;
    brand?: string;
    packSize?: string;
  }> = [];
  
  if (deliveryIndex > 0) {
    let descIndex = deliveryIndex + 1;
    while (descIndex < lines.length) {
      const line = lines[descIndex];
      
      if (!line.startsWith("Brand:") && !line.includes("| Pack Size:")) {
        const productName = line;
        let brand: string | undefined;
        let packSize: string | undefined;
        
        const nextLine = lines[descIndex + 1] || "";
        if (nextLine.startsWith("Brand:")) {
          const brandMatch = nextLine.match(/Brand:\s*([^|]+)/);
          const packMatch = nextLine.match(/Pack Size:\s*([^|]+)/);
          brand = brandMatch?.[1]?.trim();
          packSize = packMatch?.[1]?.trim();
          descIndex++;
        }
        
        descriptions.push({ name: productName, brand, packSize });
      }
      descIndex++;
    }
  }
  
  const items: ParsedInvoiceItem[] = gridItems.map((grid, idx) => ({
    itemCode: grid.code,
    productName: descriptions[idx]?.name || `Item ${grid.code}`,
    quantity: grid.qty,
    unit: grid.unit,
    unitPrice: grid.price,
    extendedPrice: grid.total,
    brand: descriptions[idx]?.brand,
    packSize: descriptions[idx]?.packSize,
  }));
  
  let confidence = 100;
  if (headerEndIndex <= 0) confidence -= 20;
  if (totalItemsIndex <= 0) confidence -= 10;
  if (items.length !== totalItemCount) {
    confidence -= 15;
    warnings.push(`Item count mismatch: parsed ${items.length}, expected ${totalItemCount}`);
  }
  
  return {
    vendor: "Flanagan",
    invoiceDate,
    customerNumber,
    customerName,
    fulfillmentType,
    items,
    subtotal,
    tax: 0,
    total: subtotal,
    totalItems: totalItemCount,
    rawText: text,
    parseConfidence: Math.max(0, confidence),
    parseWarnings: warnings,
  };
}

// =============================================================================
// GENERIC PARSER
// =============================================================================

function parseGenericInvoice(text: string): ParsedInvoice {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  let invoiceDate: string | null = null;
  for (const line of lines) {
    const dateMatch = line.match(/(\d{4}[-/]\d{2}[-/]\d{2})|(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
    if (dateMatch) {
      invoiceDate = dateMatch[0];
      break;
    }
  }
  
  let subtotal = 0;
  for (const line of lines) {
    const totalMatch = line.match(/total[:\s]*\$?([\d,]+\.?\d*)/i);
    if (totalMatch) {
      subtotal = parseFloat(totalMatch[1].replace(/,/g, "")) || 0;
      break;
    }
  }
  
  return {
    vendor: "Unknown",
    invoiceDate,
    items: [],
    subtotal,
    tax: 0,
    total: subtotal,
    totalItems: 0,
    rawText: text,
    parseConfidence: 20,
    parseWarnings: ["Using generic parser - manual entry recommended"],
  };
}

// =============================================================================
// VENDOR DETECTION
// =============================================================================

function detectVendorAndFormat(text: string): VendorParserConfig["parserType"] {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("flanagan")) {
    if (text.includes("PLEASE REMIT TO") || text.includes("INVOICE NO")) {
      return "flanagan";
    }
    if (text.includes("Line total") || text.includes("Est. Total")) {
      return "flanagan-portal";
    }
    return "flanagan";
  }
  
  if (lowerText.includes("gordon food service") || lowerText.includes("gfs")) return "gfs";
  if (lowerText.includes("sysco")) return "sysco";
  
  return "generic";
}

// =============================================================================
// MAIN PARSER FUNCTION
// =============================================================================

export async function parsePDFInvoice(
  file: File,
  config?: VendorParserConfig
): Promise<ParsedInvoice> {
  const text = await extractTextFromPDF(file);
  const parserType = config?.parserType || detectVendorAndFormat(text);
  
  console.log(`[PDF Parser] Using parser: ${parserType}`);
  console.log(`[PDF Parser] Text length: ${text.length}`);
  
  switch (parserType) {
    case "flanagan":
      return parseFlanaganOfficialInvoice(text);
    case "flanagan-portal":
      return parseFlanaganPortalInvoice(text);
    default:
      return parseGenericInvoice(text);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const SUPPORTED_VENDORS = [
  { id: "auto", name: "Auto-Detect", description: "Automatically detect vendor format" },
  { id: "flanagan", name: "Flanagan (Official Invoice)", description: "Standard Flanagan delivery invoice", status: "ready" as const },
  { id: "flanagan-portal", name: "Flanagan (Portal Export)", description: "Customer portal PDF export", status: "ready" as const },
  { id: "gfs", name: "Gordon Food Service", description: "GFS invoice format", status: "coming_soon" as const },
  { id: "sysco", name: "Sysco", description: "Sysco invoice format", status: "coming_soon" as const },
  { id: "generic", name: "Generic", description: "Basic text extraction", status: "ready" as const },
];

export function isVendorSupported(vendorName: string): boolean {
  return vendorName.toLowerCase().includes("flanagan");
}
