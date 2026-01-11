// =============================================================================
// FRIENDLY ID - Base62 UUID Encoding
// =============================================================================
// Converts UUIDs to short, URL-safe, readable codes
// Like Bitly but deterministic - same UUID always = same code
//
// UUID:     7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c (36 chars)
// Friendly: Xk9mR2pQ (8 chars)
//
// Usage:
//   const code = toFriendlyId(recipe.id);     // "Xk9mR2pQ"
//   const uuid = fromFriendlyId(code);        // "7f3a2b1c-4d5e-..."
// =============================================================================

// Base62 alphabet - URL safe, no confusing chars (0/O, l/1/I removed from visual similarity)
const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = BigInt(ALPHABET.length); // 58 (using Base58 for better readability)

/**
 * Convert a UUID to a friendly short code
 * @param uuid - Full UUID string (with or without dashes)
 * @returns 8-11 character friendly code
 */
export function toFriendlyId(uuid: string): string {
  // Remove dashes and convert to BigInt
  const hex = uuid.replace(/-/g, '');
  let num = BigInt('0x' + hex);
  
  // Convert to base58
  let result = '';
  while (num > 0) {
    const remainder = Number(num % BASE);
    result = ALPHABET[remainder] + result;
    num = num / BASE;
  }
  
  // Pad to minimum 8 chars for consistency
  return result.padStart(8, '0');
}

/**
 * Convert a friendly code back to a UUID
 * @param code - Friendly code string
 * @returns Full UUID with dashes
 */
export function fromFriendlyId(code: string): string {
  // Convert from base58 to BigInt
  let num = BigInt(0);
  for (const char of code) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid character in friendly ID: ${char}`);
    }
    num = num * BASE + BigInt(index);
  }
  
  // Convert to hex and pad to 32 chars
  let hex = num.toString(16).padStart(32, '0');
  
  // Insert dashes for UUID format
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Validate a friendly ID format
 * @param code - String to validate
 * @returns true if valid friendly ID format
 */
export function isValidFriendlyId(code: string): boolean {
  if (!code || code.length < 8 || code.length > 22) return false;
  return [...code].every(char => ALPHABET.includes(char));
}

/**
 * Generate a new friendly ID (creates new UUID and encodes it)
 * @returns Object with both uuid and friendlyId
 */
export function generateFriendlyId(): { uuid: string; friendlyId: string } {
  const uuid = crypto.randomUUID();
  return {
    uuid,
    friendlyId: toFriendlyId(uuid),
  };
}

// =============================================================================
// PREP ITEM CODE GENERATION
// =============================================================================
// For prep ingredients, we use the recipe's friendly ID as the item code
// This creates a direct link: item_code → recipe

/**
 * Generate item code for a prep ingredient from its source recipe
 * @param recipeId - UUID of the source recipe
 * @returns Item code string (friendly ID)
 */
export function generatePrepItemCode(recipeId: string): string {
  return toFriendlyId(recipeId);
}

/**
 * Check if an item code is a prep item code (friendly ID format)
 * vs a vendor code (typically numeric or vendor-specific format)
 * @param itemCode - Item code to check
 * @returns true if this looks like a prep item code
 */
export function isPrepItemCode(itemCode: string): boolean {
  // Prep codes are Base58 friendly IDs (8+ chars, alphanumeric)
  // Vendor codes are typically numeric or have specific patterns
  if (!itemCode) return false;
  
  // If it's all digits, it's likely a vendor code
  if (/^\d+$/.test(itemCode)) return false;
  
  // If it contains dashes or special chars, likely vendor
  if (/[-_.]/.test(itemCode)) return false;
  
  // Check if it's valid Base58
  return isValidFriendlyId(itemCode);
}

// =============================================================================
// INGREDIENT TYPE DETERMINATION
// =============================================================================
// Logic to determine if an ingredient is "purchased" or "prep" based on
// available signals. Used for backfilling and display.
//
// Decision tree:
// 1. source_recipe_id is set → PREP (100% certain, linked to recipe)
// 2. item_code is Base58 (friendly ID) → PREP (we generated it)
// 3. item_code is numeric → PURCHASED (vendor code from VIM)
// 4. item_code is null/empty/"-" → PREP (no vendor source)
// 5. Default → PURCHASED
// =============================================================================

export type IngredientType = 'purchased' | 'prep';

interface IngredientTypeSignals {
  item_code?: string | null;
  source_recipe_id?: string | null;
  // Could add more signals in future: vendor, import_source, etc.
}

/**
 * Determine the ingredient type based on available signals
 * @param signals - Object with item_code and/or source_recipe_id
 * @returns 'purchased' or 'prep'
 */
export function determineIngredientType(signals: IngredientTypeSignals): IngredientType {
  const { item_code, source_recipe_id } = signals;
  
  // 1. Explicitly linked to a recipe → definitely prep
  if (source_recipe_id) {
    return 'prep';
  }
  
  // 2. No item code or placeholder → likely prep (kitchen-made)
  if (!item_code || item_code === '' || item_code === '-') {
    return 'prep';
  }
  
  // 3. Item code is a friendly ID (Base58) → prep (we generated it)
  if (isPrepItemCode(item_code)) {
    return 'prep';
  }
  
  // 4. Item code is numeric → vendor code from VIM import
  if (/^\d+$/.test(item_code)) {
    return 'purchased';
  }
  
  // 5. Default: assume purchased (has some vendor-like code)
  return 'purchased';
}

/**
 * Check if an ingredient appears to be a prep item
 * Convenience wrapper around determineIngredientType
 */
export function isPrepIngredient(signals: IngredientTypeSignals): boolean {
  return determineIngredientType(signals) === 'prep';
}

/**
 * Check if an ingredient appears to be purchased
 * Convenience wrapper around determineIngredientType
 */
export function isPurchasedIngredient(signals: IngredientTypeSignals): boolean {
  return determineIngredientType(signals) === 'purchased';
}
