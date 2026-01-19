import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  TrendingUp,
  TrendingDown,
  Package,
  CircleDollarSign,
  AlertTriangle,
  Eye,
  BarChart3,
  RefreshCw,
  History,
  Umbrella,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { CardCarousel, CarouselCard } from "@/shared/components/CardCarousel";
import { PriceHistoryModalById } from "@/features/admin/components/sections/VendorInvoice/components/PriceHistory/PriceHistoryModalById";
import {
  VitalsCard,
  VitalsCardGrid,
  PriceStatsZone,
  VendorZone,
} from "@/shared/components/VitalsCard";

/**
 * =============================================================================
 * NEXUS DASHBOARD - BOH Vitals Tab
 * =============================================================================
 * Back-of-House data imports and cost monitoring:
 * - Price Watch: Baseball card style tracked ingredients
 * - Cost Trends: Food cost %, margin (placeholder)
 * - Inventory Health: Stock levels (placeholder)
 * - Vendor Intelligence: Vendor comparisons (placeholder)
 * 
 * Data flows IN from: Vendor Invoice Management (VIM)
 * =============================================================================
 */

interface WatchedIngredient {
  id: string;
  product: string;
  common_name: string | null;
  vendor: string;
  current_price: number;
  unit_of_measure: string;
  change_percent: number;
  image_url?: string | null;
  umbrella_name?: string | null;
}

export const AdminDash_BOHVitalsTab: React.FC = () => {
  const { organization } = useAuth();
  const { showDiagnostics } = useDiagnostics();
  
  // Price Watch state
  const [watchedIngredients, setWatchedIngredients] = useState<WatchedIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal state
  const [priceHistoryModal, setPriceHistoryModal] = useState<{
    open: boolean;
    ingredientId: string | null;
    ingredientName: string;
  }>({ open: false, ingredientId: null, ingredientName: '' });

  // Fetch watched ingredients
  const fetchWatchedIngredients = async () => {
    if (!organization?.id) return;
    
    try {
      // First get ingredients marked for BOH Vitals dashboard (critical or elevated tier)
      const { data: ingredients, error } = await supabase
        .from("master_ingredients")
        .select("id, product, common_name, vendor, current_price, unit_of_measure, vitals_tier, image_url")
        .eq("organization_id", organization.id)
        .in("vitals_tier", ["critical", "elevated"])
        .eq("archived", false)
        .order("product");

      if (error) throw error;
      if (!ingredients || ingredients.length === 0) {
        setWatchedIngredients([]);
        return;
      }

      // Get the latest price changes for these ingredients from price history
      const ingredientIds = ingredients.map(i => i.id);
      const { data: priceHistory } = await supabase
        .from("vendor_price_history")
        .select("master_ingredient_id, price, previous_price")
        .in("master_ingredient_id", ingredientIds)
        .order("created_at", { ascending: false });

      // Build a map of ingredient_id -> most recent change percent
      const changeMap = new Map<string, number>();
      if (priceHistory) {
        // Group by ingredient and take the first (most recent) for each
        const seen = new Set<string>();
        for (const ph of priceHistory) {
          if (!seen.has(ph.master_ingredient_id)) {
            seen.add(ph.master_ingredient_id);
            const oldPrice = ph.previous_price || ph.price || 0;
            const newPrice = ph.price || 0;
            const changePercent = oldPrice > 0 && oldPrice !== newPrice
              ? ((newPrice - oldPrice) / oldPrice) * 100
              : 0;
            changeMap.set(ph.master_ingredient_id, changePercent);
          }
        }
      }

      // Fetch umbrella memberships for these ingredients
      const { data: umbrellaMemberships } = await supabase
        .from("umbrella_ingredient_master_ingredients")
        .select(`
          master_ingredient_id,
          umbrella_ingredients!inner(name)
        `)
        .in("master_ingredient_id", ingredientIds);

      // Build umbrella map
      const umbrellaMap = new Map<string, string>();
      if (umbrellaMemberships) {
        for (const membership of umbrellaMemberships) {
          const umbrellaName = (membership.umbrella_ingredients as any)?.name;
          if (umbrellaName) {
            umbrellaMap.set(membership.master_ingredient_id, umbrellaName);
          }
        }
      }

      // Merge with ingredients
      const withChanges: WatchedIngredient[] = ingredients.map((ing) => ({
        id: ing.id,
        product: ing.product,
        common_name: ing.common_name,
        vendor: ing.vendor,
        current_price: ing.current_price || 0,
        unit_of_measure: ing.unit_of_measure || "",
        change_percent: changeMap.get(ing.id) || 0,
        image_url: ing.image_url,
        umbrella_name: umbrellaMap.get(ing.id) || null,
      }));

      setWatchedIngredients(withChanges);
    } catch (err) {
      console.error("Failed to fetch watched ingredients:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWatchedIngredients();
  }, [organization?.id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWatchedIngredients();
  };

  const handleOpenPriceHistory = (ingredient: WatchedIngredient) => {
    setPriceHistoryModal({
      open: true,
      ingredientId: ingredient.id,
      ingredientName: ingredient.common_name || ingredient.product,
    });
  };

  // Stats for watched items
  const stats = useMemo(() => {
    if (watchedIngredients.length === 0) return null;
    
    const increases = watchedIngredients.filter(i => i.change_percent > 0);
    const decreases = watchedIngredients.filter(i => i.change_percent < 0);
    const stable = watchedIngredients.filter(i => i.change_percent === 0);
    
    return {
      total: watchedIngredients.length,
      increases: increases.length,
      decreases: decreases.length,
      stable: stable.length,
    };
  }, [watchedIngredients]);

  // Determine card variant based on price change
  const getCardVariant = (changePercent: number) => {
    if (changePercent > 5) return "danger";
    if (changePercent > 0) return "warning";
    if (changePercent < 0) return "success";
    return "default";
  };

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard/tabs/AdminDash_BOHVitalsTab.tsx
        </div>
      )}

      {/* Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box amber">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">BOH Vitals</h3>
              <p className="subheader-subtitle">Vendor imports, pricing & inventory health</p>
            </div>
          </div>
          <div className="subheader-right">
            {/* Quick stats from watched items */}
            {stats && (
              <>
                <div className="subheader-toggle rose">
                  <div className="subheader-toggle-icon">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="subheader-toggle-label">{stats.increases} Up</span>
                </div>
                <div className="subheader-toggle green">
                  <div className="subheader-toggle-icon">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <span className="subheader-toggle-label">{stats.decreases} Down</span>
                </div>
                <div className="subheader-toggle">
                  <div className="subheader-toggle-icon">
                    <Eye className="w-4 h-4" />
                  </div>
                  <span className="subheader-toggle-label">{stats.total} Tracked</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
       * PRICE WATCH - Baseball Card Grid
       * ================================================================ */}
      <div className="card p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Price Watch</h3>
              <p className="text-xs text-gray-500">Critical & elevated ingredients</p>
            </div>
          </div>
          <button 
            onClick={handleRefresh} 
            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : watchedIngredients.length === 0 ? (
          <div className="text-center py-12">
            <Eye className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No tracked ingredients</p>
            <p className="text-xs text-gray-500 mt-1">
              Set Vitals Tier to "Critical" or "Elevated" in MIL to track items here
            </p>
          </div>
        ) : (
          <VitalsCardGrid columns={4} scrollable={watchedIngredients.length > 8}>
            {watchedIngredients.map((ingredient) => (
              <VitalsCard
                key={ingredient.id}
                id={ingredient.id}
                name={ingredient.common_name || ingredient.product}
                subtitle={ingredient.common_name ? ingredient.product : undefined}
                imageUrl={ingredient.image_url}
                variant={getCardVariant(ingredient.change_percent)}
                badges={
                  ingredient.umbrella_name ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-700/50 text-gray-400 border border-gray-600/30">
                      <Umbrella className="w-3 h-3" />
                      {ingredient.umbrella_name}
                    </span>
                  ) : null
                }
                statsZone={
                  <PriceStatsZone
                    price={ingredient.current_price}
                    unit={ingredient.unit_of_measure}
                    changePercent={ingredient.change_percent}
                  />
                }
                footerLeft={
                  <VendorZone vendorName={ingredient.vendor || "Unknown"} />
                }
                actions={[
                  {
                    label: "History",
                    onClick: () => handleOpenPriceHistory(ingredient),
                  },
                ]}
                onClick={() => handleOpenPriceHistory(ingredient)}
              />
            ))}
          </VitalsCardGrid>
        )}
      </div>

      {/* ================================================================
       * PLACEHOLDER CARDS - Card Carousel for future features
       * ================================================================ */}
      <CardCarousel showDots showArrows>
        {/* Cost Trends - Placeholder */}
        <CarouselCard 
          title="Cost Trends" 
          icon={<CircleDollarSign className="w-4 h-4" />}
        >
          <div className="p-4">
            <div className="text-center py-8">
              <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Coming Soon</p>
              <p className="text-xs text-gray-500 mt-1">
                Food cost %, margin trends, and cost breakdown analysis
              </p>
            </div>
          </div>
        </CarouselCard>

        {/* Inventory Health - Placeholder */}
        <CarouselCard 
          title="Inventory Health" 
          icon={<Package className="w-4 h-4" />}
        >
          <div className="p-4">
            <div className="text-center py-8">
              <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Coming Soon</p>
              <p className="text-xs text-gray-500 mt-1">
                Stock levels, reorder alerts, and inventory turnover
              </p>
            </div>
          </div>
        </CarouselCard>

        {/* Vendor Intelligence - Placeholder */}
        <CarouselCard 
          title="Vendor Intelligence" 
          icon={<Truck className="w-4 h-4" />}
        >
          <div className="p-4">
            <div className="text-center py-8">
              <Truck className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Coming Soon</p>
              <p className="text-xs text-gray-500 mt-1">
                Vendor price comparisons, reliability scores, and creep alerts
              </p>
            </div>
          </div>
        </CarouselCard>
      </CardCarousel>

      {/* Vendor Analytics Summary - Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-amber">
              <TrendingUp />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Vendor Creep Alerts</h4>
              <p className="text-xs text-gray-500">Vendors with trending price increases</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm text-center py-4">
            Run Analysis in VIM → Analytics to generate insights
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-primary">
              <Package />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Inventory Status</h4>
              <p className="text-xs text-gray-500">Low stock and reorder alerts</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm text-center py-4">
            Inventory module polish coming soon
          </p>
        </div>
      </div>

      {/* Price History Modal */}
      <PriceHistoryModalById
        isOpen={priceHistoryModal.open}
        onClose={() => setPriceHistoryModal({ open: false, ingredientId: null, ingredientName: '' })}
        ingredientId={priceHistoryModal.ingredientId}
        ingredientName={priceHistoryModal.ingredientName}
      />
    </div>
  );
};

export default AdminDash_BOHVitalsTab;
