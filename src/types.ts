// Update the Recipe interface in your types.ts file
import type { RecipeIngredient as RecipeIngredientType } from './types/recipe';

export type RecipeIngredient = RecipeIngredientType;

export interface Recipe {
  id: string;
  type: 'prepared' | 'final';
  name: string;
  category: string;
  subCategory: string;
  station: string;
  storageArea: string;
  container: string;
  containerType: string;
  shelfLife: string;
  description: string;
  prepTime: number;
  cookTime: number;
  recipeUnitRatio: string;
  unitType: string;
  costPerRatioUnit: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  notes: string;
  costPerServing: number;
  lastUpdated: string;
  image?: string;
  videoUrl?: string;
}