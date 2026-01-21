/**
 * =============================================================================
 * LUCIDE ICON MAPPING UTILITY
 * =============================================================================
 * Maps string icon names (from database) to Lucide React components.
 * Used by Food Relationships and other areas where icons are stored as strings.
 * 
 * Usage:
 *   import { getLucideIcon, iconOptions } from '@/utils/iconMapping';
 *   const Icon = getLucideIcon('Utensils');
 *   return <Icon className="w-4 h-4" />;
 * =============================================================================
 */

import {
  Utensils,
  Wine,
  ChefHat,
  UtensilsCrossed,
  PackageOpen,
  Box,
  ShoppingBag,
  Leaf,
  Fish,
  Beef,
  Egg,
  Milk,
  Cookie,
  Coffee,
  Beer,
  GlassWater,
  Candy,
  IceCream,
  Apple,
  Carrot,
  Wheat,
  Salad,
  Sandwich,
  Pizza,
  Soup,
  Cake,
  Receipt,
  Tag,
  Folder,
  FolderTree,
  Package,
  Archive,
  Store,
  Truck,
  Warehouse,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

/**
 * Map of icon string names to Lucide components.
 * Add new icons here as needed.
 */
export const lucideIconMap: Record<string, LucideIcon> = {
  // Food & Cooking
  Utensils,
  Wine,
  ChefHat,
  UtensilsCrossed,
  PackageOpen,
  Box,
  ShoppingBag,
  Leaf,
  Fish,
  Beef,
  Egg,
  Milk,
  Cookie,
  Coffee,
  Beer,
  GlassWater,
  Candy,
  IceCream,
  Apple,
  Carrot,
  Wheat,
  Salad,
  Sandwich,
  Pizza,
  Soup,
  Cake,
  
  // Organization & Storage
  Receipt,
  Tag,
  Folder,
  FolderTree,
  Package,
  Archive,
  Store,
  Truck,
  Warehouse,
  ClipboardList,
};

/**
 * Get a Lucide icon component by name.
 * Returns FolderTree as default if name not found.
 */
export const getLucideIcon = (name?: string | null): LucideIcon => {
  if (!name) return FolderTree;
  return lucideIconMap[name] || FolderTree;
};

/**
 * Options for icon selection dropdown.
 * Grouped by category for better UX.
 */
export interface IconOption {
  value: string;
  label: string;
  group?: string;
}

export const iconOptions: IconOption[] = [
  // Food & Ingredients
  { value: "Utensils", label: "Utensils (Food)", group: "Food & Ingredients" },
  { value: "Beef", label: "Beef (Proteins)", group: "Food & Ingredients" },
  { value: "Fish", label: "Fish (Seafood)", group: "Food & Ingredients" },
  { value: "Egg", label: "Egg (Dairy/Eggs)", group: "Food & Ingredients" },
  { value: "Milk", label: "Milk (Dairy)", group: "Food & Ingredients" },
  { value: "Apple", label: "Apple (Produce)", group: "Food & Ingredients" },
  { value: "Carrot", label: "Carrot (Vegetables)", group: "Food & Ingredients" },
  { value: "Leaf", label: "Leaf (Herbs/Greens)", group: "Food & Ingredients" },
  { value: "Wheat", label: "Wheat (Grains)", group: "Food & Ingredients" },
  
  // Beverages
  { value: "Wine", label: "Wine (Alcohol)", group: "Beverages" },
  { value: "Beer", label: "Beer", group: "Beverages" },
  { value: "Coffee", label: "Coffee", group: "Beverages" },
  { value: "GlassWater", label: "Glass (Soft Drinks)", group: "Beverages" },
  
  // Prepared Foods
  { value: "ChefHat", label: "Chef Hat (Mis en Place)", group: "Prepared" },
  { value: "UtensilsCrossed", label: "Utensils Crossed (Final Goods)", group: "Prepared" },
  { value: "Salad", label: "Salad", group: "Prepared" },
  { value: "Sandwich", label: "Sandwich", group: "Prepared" },
  { value: "Pizza", label: "Pizza", group: "Prepared" },
  { value: "Soup", label: "Soup", group: "Prepared" },
  { value: "Cake", label: "Cake (Desserts)", group: "Prepared" },
  
  // Operations
  { value: "PackageOpen", label: "Package Open (Receiving)", group: "Operations" },
  { value: "Box", label: "Box (Consumables)", group: "Operations" },
  { value: "ShoppingBag", label: "Shopping Bag (Retail)", group: "Operations" },
  { value: "Package", label: "Package", group: "Operations" },
  { value: "Warehouse", label: "Warehouse (Storage)", group: "Operations" },
  { value: "Truck", label: "Truck (Delivery)", group: "Operations" },
  
  // Organization
  { value: "FolderTree", label: "Folder Tree (Category)", group: "Organization" },
  { value: "Folder", label: "Folder", group: "Organization" },
  { value: "Tag", label: "Tag", group: "Organization" },
  { value: "Receipt", label: "Receipt", group: "Organization" },
  { value: "ClipboardList", label: "Clipboard (Lists)", group: "Organization" },
];

/**
 * Suggested icons for common Major Groups.
 * Used for auto-suggesting icons during group creation.
 */
export const suggestedIcons: Record<string, string> = {
  // Ingredient groups
  "FOOD": "Utensils",
  "ALCOHOL": "Wine",
  "BEVERAGES": "Coffee",
  "CONSUMABLES": "Box",
  
  // Recipe type groups
  "MIS EN PLACE": "ChefHat",
  "MISE EN PLACE": "ChefHat",
  "FINAL GOODS": "UtensilsCrossed",
  "FINAL PLATES": "UtensilsCrossed",
  "RECEIVING": "PackageOpen",
  "RETAIL": "ShoppingBag",
  "CATERING": "Truck",
};

/**
 * Get suggested icon for a group name.
 */
export const getSuggestedIcon = (groupName: string): string => {
  const normalized = groupName.toUpperCase().trim();
  return suggestedIcons[normalized] || "FolderTree";
};

export default getLucideIcon;
