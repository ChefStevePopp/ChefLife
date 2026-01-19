import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * =============================================================================
 * USE UMBRELLA MEMBERSHIP HOOK
 * =============================================================================
 * Fetches umbrella membership for a given ingredient.
 * Returns the umbrella details and sibling count if the ingredient belongs to one.
 * =============================================================================
 */

export interface UmbrellaMembership {
  umbrellaId: string;
  umbrellaName: string;
  siblingCount: number;        // Total members including this one
  isPrimary: boolean;          // Is this the primary ingredient?
  primaryIngredientId: string | null;
}

export function useUmbrellaMembership(ingredientId: string | null) {
  const [membership, setMembership] = useState<UmbrellaMembership | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMembership = useCallback(async () => {
    if (!ingredientId) {
      setMembership(null);
      return;
    }

    setIsLoading(true);
    try {
      // Find umbrella this ingredient belongs to via junction table
      const { data: junctionData, error: junctionError } = await supabase
        .from("umbrella_ingredient_master_ingredients")
        .select(`
          umbrella_ingredient_id,
          umbrella_ingredients (
            id,
            name,
            primary_master_ingredient_id
          )
        `)
        .eq("master_ingredient_id", ingredientId)
        .single();

      if (junctionError) {
        if (junctionError.code === "PGRST116") {
          // No rows returned - ingredient not in any umbrella
          setMembership(null);
          return;
        }
        throw junctionError;
      }

      if (!junctionData?.umbrella_ingredients) {
        setMembership(null);
        return;
      }

      const umbrella = junctionData.umbrella_ingredients as any;

      // Count siblings in this umbrella
      const { count, error: countError } = await supabase
        .from("umbrella_ingredient_master_ingredients")
        .select("*", { count: "exact", head: true })
        .eq("umbrella_ingredient_id", umbrella.id);

      if (countError) throw countError;

      setMembership({
        umbrellaId: umbrella.id,
        umbrellaName: umbrella.name,
        siblingCount: count || 1,
        isPrimary: umbrella.primary_master_ingredient_id === ingredientId,
        primaryIngredientId: umbrella.primary_master_ingredient_id,
      });
    } catch (err) {
      console.error("Error fetching umbrella membership:", err);
      setMembership(null);
    } finally {
      setIsLoading(false);
    }
  }, [ingredientId]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  return {
    membership,
    isLoading,
    refetch: fetchMembership,
  };
}

export default useUmbrellaMembership;
