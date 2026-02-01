export type AllergenType = 
  | 'peanut' | 'crustacean' | 'treenut' | 'shellfish' | 'sesame'
  | 'soy' | 'fish' | 'wheat' | 'milk' | 'sulphite' | 'egg'
  | 'gluten' | 'mustard' | 'celery' | 'garlic' | 'onion'
  | 'nitrite' | 'mushroom' | 'hot_pepper' | 'citrus' | 'pork';

// List of all allergen types for iteration
export const ALLERGEN_LIST: AllergenType[] = [
  'peanut', 'crustacean', 'treenut', 'shellfish', 'sesame',
  'soy', 'fish', 'wheat', 'milk', 'sulphite', 'egg',
  'gluten', 'mustard', 'celery', 'garlic', 'onion',
  'nitrite', 'mushroom', 'hot_pepper', 'citrus', 'pork'
];

export interface CustomAllergen {
  name: string;
  active: boolean;
}

export interface AllergenData {
  allergens: AllergenType[];
  customAllergens: {
    custom1?: CustomAllergen;
    custom2?: CustomAllergen;
    custom3?: CustomAllergen;
  };
  notes?: string;
}

export interface Allergen {
  type: AllergenType;
  label: string;
  description?: string;
  severity?: 'high' | 'medium' | 'low';
}