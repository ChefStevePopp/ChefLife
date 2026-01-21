import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface FoodCategoryGroup {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  sort_order: number;
  archived?: boolean;
  is_system?: boolean;
  is_recipe_type?: boolean;
}

interface FoodCategory {
  id: string;
  group_id: string;
  name: string;
  description: string;
  sort_order: number;
  archived?: boolean;
}

interface FoodSubCategory {
  id: string;
  category_id: string;
  name: string;
  description: string;
  sort_order: number;
  archived?: boolean;
}

interface FoodRelationshipsStore {
  majorGroups: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    archived?: boolean;
    is_system?: boolean;
    is_recipe_type?: boolean;
  }>;
  categories: Array<{
    id: string;
    name: string;
    group_id: string;
    description?: string;
    archived?: boolean;
  }>;
  subCategories: Array<{
    id: string;
    name: string;
    category_id: string;
    description?: string;
    archived?: boolean;
  }>;
  isLoading: boolean;
  error: string | null;
  fetchFoodRelationships: () => Promise<void>;
  updateSortOrder: (
    type: "group" | "category" | "sub",
    id: string,
    newOrder: number,
  ) => Promise<void>;
  updateItem: (
    type: "group" | "category" | "sub",
    id: string,
    updates: { description?: string; archived?: boolean },
  ) => Promise<void>;
  addItem: (
    type: "group" | "category" | "sub",
    data: Partial<FoodCategoryGroup | FoodCategory | FoodSubCategory>,
  ) => Promise<void>;
  toggleArchiveItem: (
    type: "group" | "category" | "sub",
    id: string,
    archived: boolean,
  ) => Promise<void>;
  
  // Computed getter for Recipe Manager integration
  getRecipeTypeGroups: () => Array<{
    id: string;
    name: string;
    icon?: string;
    color?: string;
    is_system?: boolean;
  }>;
}

export const useFoodRelationshipsStore = create<FoodRelationshipsStore>(
  (set, get) => ({
    majorGroups: [],
    categories: [],
    subCategories: [],
    isLoading: true,
    error: null,

    fetchFoodRelationships: async () => {
      try {
        set({ isLoading: true, error: null });

        // Fetch all data in parallel
        const [groupsResponse, categoriesResponse, subCategoriesResponse] =
          await Promise.all([
            supabase
              .from("food_category_groups")
              .select("*")
              .order("sort_order"),
            supabase.from("food_categories").select("*").order("sort_order"),
            supabase
              .from("food_sub_categories")
              .select("*")
              .order("sort_order"),
          ]);

        // Check for errors
        if (groupsResponse.error) throw groupsResponse.error;
        if (categoriesResponse.error) throw categoriesResponse.error;
        if (subCategoriesResponse.error) throw subCategoriesResponse.error;

        // Transform data for dropdowns
        const majorGroups =
          groupsResponse.data?.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            icon: g.icon,
            color: g.color,
            archived: g.archived || false,
            is_system: g.is_system || false,
            is_recipe_type: g.is_recipe_type || false,
          })) || [];

        const categories =
          categoriesResponse.data?.map((c) => ({
            id: c.id,
            name: c.name,
            group_id: c.group_id,
            description: c.description,
            archived: c.archived || false,
          })) || [];

        const subCategories =
          subCategoriesResponse.data?.map((s) => ({
            id: s.id,
            name: s.name,
            category_id: s.category_id,
            description: s.description,
            archived: s.archived || false,
          })) || [];

        set({
          majorGroups,
          categories,
          subCategories,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching food relationships:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load food relationships",
          isLoading: false,
          majorGroups: [],
          categories: [],
          subCategories: [],
        });
      }
    },

    updateSortOrder: async (type, id, newOrder) => {
      try {
        const table =
          type === "group"
            ? "food_category_groups"
            : type === "category"
              ? "food_categories"
              : "food_sub_categories";

        const { error } = await supabase
          .from(table)
          .update({ sort_order: newOrder })
          .eq("id", id);

        if (error) throw error;

        // Refresh data
        get().fetchFoodRelationships();
      } catch (error) {
        console.error("Error updating sort order:", error);
        throw error;
      }
    },

    updateItem: async (type, id, updates) => {
      try {
        const table =
          type === "group"
            ? "food_category_groups"
            : type === "category"
              ? "food_categories"
              : "food_sub_categories";

        const updateData = {
          updated_at: new Date().toISOString(),
          ...updates,
        };

        const { error } = await supabase
          .from(table)
          .update(updateData)
          .eq("id", id);

        if (error) throw error;

        // Refresh data
        await get().fetchFoodRelationships();
      } catch (error) {
        console.error("Error updating item:", error);
        throw error;
      }
    },

    addItem: async (type, data) => {
      try {
        const table =
          type === "group"
            ? "food_category_groups"
            : type === "category"
              ? "food_categories"
              : "food_sub_categories";

        // Clean data before insert
        const cleanData = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            value === "" ? null : value,
          ]),
        );

        const { error } = await supabase.from(table).insert([cleanData]);

        if (error) throw error;

        // Refresh data
        get().fetchFoodRelationships();
      } catch (error) {
        console.error("Error adding item:", error);
        throw error;
      }
    },

    toggleArchiveItem: async (type, id, archived) => {
      try {
        const table =
          type === "group"
            ? "food_category_groups"
            : type === "category"
              ? "food_categories"
              : "food_sub_categories";

        const { error } = await supabase
          .from(table)
          .update({
            archived: archived,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;

        // Refresh data
        get().fetchFoodRelationships();
      } catch (error) {
        console.error("Error archiving item:", error);
        throw error;
      }
    },

    /**
     * Get recipe type groups for Recipe Manager tabs.
     * Returns non-archived groups where is_recipe_type = true.
     * Used to dynamically generate Recipe Manager tabs.
     */
    getRecipeTypeGroups: () => {
      return get().majorGroups
        .filter((g) => g.is_recipe_type && !g.archived)
        .sort((a, b) => {
          // System groups first, then alphabetically
          if (a.is_system && !b.is_system) return -1;
          if (!a.is_system && b.is_system) return 1;
          return a.name.localeCompare(b.name);
        });
    },
  }),
);
