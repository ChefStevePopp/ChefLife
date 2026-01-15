// =============================================================================
// VENDOR PDF PARSERS - Index
// =============================================================================
// Extensible parser system for vendor invoices
// Add new vendors by creating a parser file and registering here
// =============================================================================

import { parseFlanaganInvoice, isFlanaganInvoice, FlanaganInvoice, FlanaganLineItem } from './flanagan';

export type { FlanaganInvoice, FlanaganLineItem };

// Generic parsed invoice structure (vendor-agnostic)
export interface ParsedInvoice {
  vendor: string;
  invoiceDate: Date | null;
  invoiceNumber?: string;
  customerNumber?: string;
  customerName?: string;
  totalItems: number;
  estimatedTotal: number;
  lineItems: ParsedLineItem[];
  parseConfidence: number;
  parseWarnings: string[];
  rawText?: string;
}

export interface ParsedLineItem {
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

// Vendor parser registry
type VendorParser = (text: string) => ParsedInvoice;
type VendorDetector = (text: string) => boolean;

interface VendorConfig {
  name: string;
  detect: VendorDetector;
  parse: VendorParser;
}

const vendorParsers: VendorConfig[] = [
  {
    name: 'Flanagan Foodservice',
    detect: isFlanaganInvoice,
    parse: (text: string): ParsedInvoice => {
      const result = parseFlanaganInvoice(text);
      return {
        vendor: result.vendorName,
        invoiceDate: result.invoiceDate,
        customerNumber: result.customerNumber,
        customerName: result.customerName,
        totalItems: result.totalItems,
        estimatedTotal: result.estimatedTotal,
        lineItems: result.lineItems.map(item => ({
          quantity: item.quantity,
          itemCode: item.itemCode,
          unit: item.unit,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          productName: item.productName,
          brand: item.brand,
          packSize: item.packSize,
          rawDescription: item.rawDescription,

        })),
        parseConfidence: result.parseConfidence,
        parseWarnings: result.parseWarnings
      };
    }
  }
  // Add more vendors here:
  // { name: 'GFS', detect: isGFSInvoice, parse: parseGFSInvoice },
  // { name: 'Sysco', detect: isSyscoInvoice, parse: parseSyscoInvoice },
];

/**
 * Detect vendor from PDF text
 */
export function detectVendor(pdfText: string): string | null {
  for (const vendor of vendorParsers) {
    if (vendor.detect(pdfText)) {
      return vendor.name;
    }
  }
  return null;
}

/**
 * Parse PDF text using the appropriate vendor parser
 * Falls back to generic parsing if vendor not detected
 */
export function parseInvoice(pdfText: string, vendorHint?: string): ParsedInvoice {
  // Try to find matching vendor parser
  let parser: VendorConfig | undefined;
  
  if (vendorHint) {
    parser = vendorParsers.find(v => 
      v.name.toLowerCase().includes(vendorHint.toLowerCase())
    );
  }
  
  if (!parser) {
    parser = vendorParsers.find(v => v.detect(pdfText));
  }
  
  if (parser) {
    return parser.parse(pdfText);
  }
  
  // No matching parser - return generic structure with warning
  return {
    vendor: 'Unknown',
    invoiceDate: null,
    totalItems: 0,
    estimatedTotal: 0,
    lineItems: [],
    parseConfidence: 0,
    parseWarnings: ['No matching vendor parser found. Please use manual entry or CSV import.'],
    rawText: pdfText
  };
}

/**
 * Get list of supported vendors
 */
export function getSupportedVendors(): string[] {
  return vendorParsers.map(v => v.name);
}
