import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Info,
  ChevronUp,
  ChevronDown,
  Truck,
  Layers,
  ShieldAlert,
  Lightbulb,
  GraduationCap,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Package,
  Zap,
} from "lucide-react";
import { useVendorCodesStore } from "@/stores/vendorCodesStore";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useAuth } from "@/hooks/useAuth";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";

// =============================================================================
// ANALYTICS THRESHOLDS
// =============================================================================
const THRESHOLDS = {
  VENDOR_CREEP_WARNING: 5,    // % - fire warning
  VENDOR_CREEP_CRITICAL: 10,  // % - fire critical alert
  PRICE_SPIKE: 15,            // % - single item jump
  CATEGORY_VOLATILITY: 10,    // % - monthly swing
};

// =============================================================================
// GUIDED MODE CONTEXT
// =============================================================================
const GuidedModeContext = React.createContext<{
  isGuided: boolean;
  setIsGuided: (v: boolean) => void;
}>({ isGuided: false, setIsGuided: () => {} });

const useGuidedMode = () => React.useContext(GuidedModeContext);

// =============================================================================
// GUIDED MODE TOGGLE - Pill style button
// =============================================================================
const GuidedModeToggle: React.FC = () => {
  const { isGuided, setIsGuided } = useGuidedMode();
  
  return (
    <button
      onClick={() => setIsGuided(!isGuided)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        isGuided 
          ? "bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-lg shadow-primary-500/10" 
          : "bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:text-gray-400 hover:border-gray-600"
      }`}
      title={isGuided ? "Guided mode: ON - Click to hide tips" : "Guided mode: OFF - Click for helpful tips"}
    >
      <GraduationCap className="w-3.5 h-3.5" />
      <span>{isGuided ? "Guided" : "Guide"}</span>
    </button>
  );
};

// =============================================================================
// GUIDANCE TIP COMPONENT - Shows contextual help when guided mode is on
// =============================================================================
interface GuidanceTipProps {
  children: React.ReactNode;
  color?: "green" | "amber" | "rose" | "blue" | "primary";
}

const GuidanceTip: React.FC<GuidanceTipProps> = ({ children, color = "blue" }) => {
  const { isGuided } = useGuidedMode();
  if (!isGuided) return null;

  const colors = {
    green: "bg-green-500/10 border-green-500/20",
    amber: "bg-amber-500/10 border-amber-500/20",
    rose: "bg-rose-500/10 border-rose-500/20",
    blue: "bg-blue-500/10 border-blue-500/20",
    primary: "bg-primary-500/10 border-primary-500/20",
  };
  
  const iconColors = {
    green: "text-green-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    blue: "text-blue-400",
    primary: "text-primary-400",
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[color]} mt-4`}>
      <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors[color]}`} />
      <p className="text-sm text-gray-300">{children}</p>
    </div>
  );
};

// =============================================================================
// SECTION DEFINITIONS - The Analytics Story Flow
// =============================================================================
// 1. Vendor Performance  → "How are my vendors behaving?"
// 2. Category Trends     → "Is this market or vendor?" (Umbrella Items unlock)
// 3. Risk Exposure       → "Where am I vulnerable?"
// 4. Action Items        → "What do I do about it?"
// =============================================================================
const SECTIONS = [
  { 
    id: "vendor-performance", 
    icon: Truck, 
    color: "green", 
    label: "Vendor Performance",
    subtitle: "How are your vendors behaving?",
    guidance: "See how each vendor's prices have changed over time. Vendors with consistent increases may need a conversation. Stable vendors deserve your loyalty."
  },
  { 
    id: "category-trends", 
    icon: Layers, 
    color: "amber", 
    label: "Category Trends",
    subtitle: "Market movement by food category",
    guidance: "Is that price increase a MARKET move or a VENDOR move? When Umbrella Items are configured, you'll see your actual multi-vendor prices compared — your own private market index."
  },
  { 
    id: "risk-exposure", 
    icon: ShieldAlert, 
    color: "rose", 
    label: "Risk Exposure",
    subtitle: "Where are you vulnerable?",
    guidance: "We know your recipes and their costs. This shows which menu items are most exposed to price swings, single-source dependencies, and margin erosion."
  },
  { 
    id: "action-items", 
    icon: Lightbulb, 
    color: "primary", 
    label: "Action Items",
    subtitle: "What to do this week",
    guidance: "Specific, prioritized actions based on your data. Not charts — decisions. Call this vendor, reprice this item, consider this substitute."
  },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const VendorAnalytics: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  const { organization, user } = useAuth();
  const {
    fetchPriceTrends,
    priceTrends,
    isLoading,
    error,
  } = useVendorCodesStore();
  const { ingredients, fetchIngredients } = useMasterIngredientsStore();
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Guided mode state - persisted to localStorage
  const [isGuided, setIsGuided] = useState(() => {
    const stored = localStorage.getItem("cheflife-guided-mode");
    return stored === "true";
  });
  
  useEffect(() => {
    localStorage.setItem("cheflife-guided-mode", isGuided.toString());
  }, [isGuided]);

  // UI State
  const [showInfo, setShowInfo] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("6mo");
  
  // Track which sections are expanded (default: none)
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set());

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  });

  // Quick date presets
  const datePresets = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "6mo", days: 180 },
    { label: "1yr", days: 365 },
  ];

  const applyPreset = (preset: { label: string; days: number }) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - preset.days);
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
    setActivePreset(preset.label);
  };

  const handleDateChange = (field: "start" | "end", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
    setActivePreset("");
  };

  const handleApplyDateRange = () => {
    fetchPriceTrends();
  };

  // Toggle section expanded state
  const toggleSection = (id: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
      return next;
    });
  };

  // Navigate to section (from icon click) - always expand + scroll
  const navigateToSection = (id: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const [vendors, setVendors] = useState<string[]>([]);
  const [vendorStats, setVendorStats] = useState<
    Record<string, {
      totalItems: number;
      avgIncrease: number;
      avgDecrease: number;
      totalChanges: number;
      overallChange: number;
    }>
  >({});

  // Load data on mount
  useEffect(() => {
    fetchIngredients();
    fetchPriceTrends();

    const getVendors = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("operations_settings")
          .select("vendors")
          .single();

        if (error) throw error;
        if (data?.vendors) {
          setVendors(data.vendors);
        }
      } catch (err) {
        console.error("Error fetching vendors:", err);
        setVendors(["Sysco", "US Foods", "Gordon Food Service", "Other"]);
      }
    };

    getVendors();
  }, [fetchIngredients, fetchPriceTrends]);

  // Calculate vendor statistics
  useEffect(() => {
    if (priceTrends.length === 0) return;

    const trendsByVendor = priceTrends.reduce((acc, trend) => {
      if (!acc[trend.vendor_id]) {
        acc[trend.vendor_id] = [];
      }
      acc[trend.vendor_id].push(trend);
      return acc;
    }, {} as Record<string, typeof priceTrends>);

    const stats: Record<string, any> = {};

    Object.entries(trendsByVendor).forEach(([vendor, trends]) => {
      const uniqueIngredients = new Set(trends.map((t) => t.master_ingredient_id));
      const increases = trends.filter((t) => t.price_change_percent > 0);
      const decreases = trends.filter((t) => t.price_change_percent < 0);

      const ingredientChanges = Array.from(uniqueIngredients).map((ingredientId) => {
        const ingredientTrends = trends
          .filter((t) => t.master_ingredient_id === ingredientId)
          .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());

        if (ingredientTrends.length < 2) return 0;
        const firstPrice = ingredientTrends[0].price;
        const lastPrice = ingredientTrends[ingredientTrends.length - 1].price;
        return ((lastPrice - firstPrice) / firstPrice) * 100;
      });

      const overallChange = ingredientChanges.length > 0
        ? ingredientChanges.reduce((sum, change) => sum + change, 0) / ingredientChanges.length
        : 0;

      stats[vendor] = {
        totalItems: uniqueIngredients.size,
        avgIncrease: increases.length > 0
          ? increases.reduce((sum, t) => sum + t.price_change_percent, 0) / increases.length
          : 0,
        avgDecrease: decreases.length > 0
          ? Math.abs(decreases.reduce((sum, t) => sum + t.price_change_percent, 0) / decreases.length)
          : 0,
        totalChanges: increases.length + decreases.length,
        overallChange,
      };
    });

    setVendorStats(stats);
  }, [priceTrends]);

  // =============================================================================
  // ANALYTICS ENGINE - Detect issues and fire NEXUS events
  // =============================================================================
  const runAnalysis = useCallback(async () => {
    if (!organization?.id || !user?.id || Object.keys(vendorStats).length === 0) {
      toast.error("No data to analyze. Import invoices first.");
      return;
    }

    setIsAnalyzing(true);
    let alertsGenerated = 0;

    try {
      // Calculate period in days from date range
      const periodDays = Math.ceil(
        (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check each vendor for creep
      for (const [vendorName, stats] of Object.entries(vendorStats)) {
        // Critical creep: > 10%
        if (stats.overallChange >= THRESHOLDS.VENDOR_CREEP_CRITICAL) {
          await nexus({
            organization_id: organization.id,
            user_id: user.id,
            activity_type: "vendor_creep_critical",
            details: {
              vendor_name: vendorName,
              overall_change: stats.overallChange,
              period_days: periodDays,
              item_count: stats.totalItems,
              total_changes: stats.totalChanges,
            },
          });
          alertsGenerated++;
        }
        // Warning creep: 5-10%
        else if (stats.overallChange >= THRESHOLDS.VENDOR_CREEP_WARNING) {
          await nexus({
            organization_id: organization.id,
            user_id: user.id,
            activity_type: "vendor_creep_detected",
            details: {
              vendor_name: vendorName,
              overall_change: stats.overallChange,
              period_days: periodDays,
              item_count: stats.totalItems,
              total_changes: stats.totalChanges,
            },
          });
          alertsGenerated++;
        }
      }

      // Check for price spikes (individual item jumps)
      const spikes = priceTrends.filter(t => Math.abs(t.price_change_percent) >= THRESHOLDS.PRICE_SPIKE);
      for (const spike of spikes.slice(0, 5)) { // Limit to top 5 spikes
        const ingredient = ingredients.find(i => i.id === spike.master_ingredient_id);
        await nexus({
          organization_id: organization.id,
          user_id: user.id,
          activity_type: "price_spike_alert",
          details: {
            ingredient_name: ingredient?.product || "Unknown item",
            ingredient_id: spike.master_ingredient_id,
            vendor_name: spike.vendor_id,
            change_percent: spike.price_change_percent,
            old_price: spike.price / (1 + spike.price_change_percent / 100),
            new_price: spike.price,
            effective_date: spike.effective_date,
          },
        });
        alertsGenerated++;
      }

      setLastAnalysis(new Date());
      
      if (alertsGenerated > 0) {
        toast.success(`Analysis complete: ${alertsGenerated} alert${alertsGenerated > 1 ? "s" : ""} generated`);
      } else {
        toast.success("Analysis complete: All clear! No issues detected.");
      }

    } catch (err) {
      console.error("Error running analysis:", err);
      toast.error("Error running analysis");
    } finally {
      setIsAnalyzing(false);
    }
  }, [organization?.id, user?.id, vendorStats, priceTrends, ingredients, dateRange]);

  if (error) {
    return (
      <div className="p-4 bg-rose-500/10 text-rose-400 rounded-lg flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" />
        <div>
          <h3 className="font-medium">Error Loading Vendor Analytics</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Color classes for section icons/headers
  const colorClasses: Record<string, { bg: string; text: string; ring: string }> = {
    green: { bg: "bg-green-500/20", text: "text-green-400", ring: "ring-green-500/50" },
    amber: { bg: "bg-amber-500/20", text: "text-amber-400", ring: "ring-amber-500/50" },
    rose: { bg: "bg-rose-500/20", text: "text-rose-400", ring: "ring-rose-500/50" },
    primary: { bg: "bg-primary-500/20", text: "text-primary-400", ring: "ring-primary-500/50" },
  };

  return (
    <GuidedModeContext.Provider value={{ isGuided, setIsGuided }}>
      <div className="space-y-4">
        {/* L5 Diagnostic Path */}
        {showDiagnostics && (
          <div className="text-xs text-gray-500 font-mono">
            src/features/admin/components/sections/VendorInvoice/components/VendorAnalytics.tsx
          </div>
        )}

        {/* L5 Sub-Header */}
        <div className="subheader">
          <div className="subheader-row">
            <div className="subheader-left">
              <div className="subheader-icon-box green">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <h3 className="subheader-title">Vendor Analytics</h3>
                <p className="subheader-subtitle">Data → Context → Impact → Action</p>
              </div>
            </div>
            <div className="subheader-right">
              <GuidedModeToggle />
              <button 
                onClick={runAnalysis} 
                disabled={isAnalyzing || Object.keys(vendorStats).length === 0}
                className="btn-ghost-primary"
                title={lastAnalysis ? `Last run: ${lastAnalysis.toLocaleTimeString()}` : "Run analytics to detect issues"}
              >
                <Zap className={`w-4 h-4 mr-2 ${isAnalyzing ? "animate-pulse" : ""}`} />
                {isAnalyzing ? "Analyzing..." : "Run Analysis"}
              </button>
              <button onClick={() => fetchPriceTrends()} className="btn-ghost">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Expandable Info */}
          <div className={`subheader-info expandable-info-section ${showInfo ? "expanded" : ""}`}>
            <button
              className="expandable-info-header w-full justify-between"
              onClick={() => setShowInfo(!showInfo)}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-white">About Vendor Analytics</span>
              </div>
              {showInfo ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                      <div key={section.id} className="subheader-feature-card">
                        <Icon className="w-4 h-4 text-green-400/80" />
                        <div>
                          <span className="subheader-feature-title text-gray-300">{section.label}</span>
                          <p className="subheader-feature-desc">{section.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Date Range Controls with Section Nav Icons */}
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Section Navigation Icons (left) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isExpanded = expandedSections.has(section.id);
                    return (
                      <button
                        key={section.id}
                        onClick={() => navigateToSection(section.id)}
                        className={`subheader-toggle ${isExpanded ? `active ${section.color}` : ""}`}
                        title={section.label}
                      >
                        <div className="subheader-toggle-icon">
                          <Icon />
                        </div>
                      </button>
                    );
                  })}
                </div>
                {isGuided && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary-400" />
                    Click an icon to jump to that section
                  </p>
                )}
              </div>

              {/* Run Analysis Guided Tip */}
              {isGuided && (
                <div className="flex items-start gap-2 p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg text-xs">
                  <Zap className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-primary-300 font-medium">Run Analysis</span>
                    <span className="text-gray-400"> scans your data and pushes alerts to your Activity Feed — so you'll see important issues even when you're not on this page.</span>
                  </div>
                </div>
              )}

              {/* Date Controls (right) */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateChange("start", e.target.value)}
                    className="input py-1.5 px-3 text-sm bg-gray-900/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateChange("end", e.target.value)}
                    className="input py-1.5 px-3 text-sm bg-gray-900/50"
                  />
                </div>
                <div className="w-px h-6 bg-gray-700" />
                <div className="flex items-center gap-1">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        activePreset === preset.label
                          ? "bg-primary-500/30 text-primary-400 ring-1 ring-primary-500/50"
                          : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="w-px h-6 bg-gray-700" />
                <button
                  onClick={handleApplyDateRange}
                  className="btn-ghost-primary py-1.5 px-4 text-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========== SECTION 1: Vendor Performance ========== */}
        <div
          id="vendor-performance"
          className={`card overflow-hidden transition-all duration-300 ${
            expandedSections.has("vendor-performance") ? "bg-gray-800/50" : "bg-gray-800/30"
          }`}
        >
          <button
            onClick={() => toggleSection("vendor-performance")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colorClasses.green.bg} flex items-center justify-center`}>
                <Truck className={`w-4 h-4 ${colorClasses.green.text}`} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-white">Vendor Performance</h3>
                <p className="text-xs text-gray-500">How are your vendors behaving?</p>
              </div>
            </div>
            {expandedSections.has("vendor-performance") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.has("vendor-performance") && (
            <div className="px-4 pb-4 border-t border-gray-700/50">
              <GuidanceTip color="green">
                {SECTIONS.find(s => s.id === "vendor-performance")?.guidance}
              </GuidanceTip>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-32 mt-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : Object.keys(vendorStats).length === 0 ? (
                <div className="text-center py-8 bg-gray-900/30 rounded-lg mt-4">
                  <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white mb-2">No Vendor Data</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Import invoices to see vendor performance analytics.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Vendor</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-400">Items</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-400">Changes</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-400">Avg ↑</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-400">Avg ↓</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-400">Net Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {Object.entries(vendorStats)
                        .sort((a, b) => b[1].totalItems - a[1].totalItems)
                        .map(([vendor, stats]) => (
                          <tr key={vendor} className="hover:bg-gray-700/30">
                            <td className="px-4 py-3 text-sm font-medium text-white">{vendor}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-300">{stats.totalItems}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-300">{stats.totalChanges}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className="text-rose-400">+{stats.avgIncrease.toFixed(1)}%</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className="text-green-400">-{stats.avgDecrease.toFixed(1)}%</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <div className="flex items-center justify-center gap-2">
                                {stats.overallChange > 0 ? (
                                  <TrendingUp className="w-4 h-4 text-rose-400" />
                                ) : stats.overallChange < 0 ? (
                                  <TrendingDown className="w-4 h-4 text-green-400" />
                                ) : (
                                  <span className="w-4 h-4 inline-block text-gray-500">—</span>
                                )}
                                <span className={`font-medium ${
                                  stats.overallChange > 0 ? "text-rose-400" :
                                  stats.overallChange < 0 ? "text-green-400" : "text-gray-400"
                                }`}>
                                  {stats.overallChange > 0 ? "+" : ""}{stats.overallChange.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========== SECTION 2: Category Trends ========== */}
        <div
          id="category-trends"
          className={`card overflow-hidden transition-all duration-300 ${
            expandedSections.has("category-trends") ? "bg-gray-800/50" : "bg-gray-800/30"
          }`}
        >
          <button
            onClick={() => toggleSection("category-trends")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colorClasses.amber.bg} flex items-center justify-center`}>
                <Layers className={`w-4 h-4 ${colorClasses.amber.text}`} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-white">Category Trends</h3>
                <p className="text-xs text-gray-500">Market movement by food category</p>
              </div>
            </div>
            {expandedSections.has("category-trends") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.has("category-trends") && (
            <div className="px-4 pb-4 border-t border-gray-700/50">
              <GuidanceTip color="amber">
                {SECTIONS.find(s => s.id === "category-trends")?.guidance}
              </GuidanceTip>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-32 mt-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Placeholder for category breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Major Group Summary Cards - will be data-driven */}
                    {["Proteins", "Produce", "Dairy"].map((category) => (
                      <div key={category} className="bg-gray-900/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-white">{category}</span>
                          <span className="text-xs text-amber-400">+4.2%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500/50 rounded-full" style={{ width: "42%" }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">12 items tracked</p>
                      </div>
                    ))}
                  </div>

                  {/* Umbrella Items Unlock Notice */}
                  <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <Package className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-400 mb-1">Umbrella Items Coming Soon</h4>
                      <p className="text-xs text-gray-400">
                        When configured, you'll see true market comparison across vendors — 
                        your private price index built from YOUR actual invoices, not industry averages.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========== SECTION 3: Risk Exposure ========== */}
        <div
          id="risk-exposure"
          className={`card overflow-hidden transition-all duration-300 ${
            expandedSections.has("risk-exposure") ? "bg-gray-800/50" : "bg-gray-800/30"
          }`}
        >
          <button
            onClick={() => toggleSection("risk-exposure")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colorClasses.rose.bg} flex items-center justify-center`}>
                <ShieldAlert className={`w-4 h-4 ${colorClasses.rose.text}`} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-white">Risk Exposure</h3>
                <p className="text-xs text-gray-500">Where are you vulnerable?</p>
              </div>
            </div>
            {expandedSections.has("risk-exposure") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.has("risk-exposure") && (
            <div className="px-4 pb-4 border-t border-gray-700/50">
              <GuidanceTip color="rose">
                {SECTIONS.find(s => s.id === "risk-exposure")?.guidance}
              </GuidanceTip>
              
              <div className="mt-4 space-y-4">
                {/* Single-Source Risk */}
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <h4 className="text-sm font-medium text-rose-400">Single-Source Dependencies</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    These ingredients only come from one vendor — no fallback if prices spike or supply issues arise.
                  </p>
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Analysis requires recipe data connection
                  </div>
                </div>

                {/* Margin Erosion Risk */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-medium text-amber-400">Margin Erosion Watch</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Menu items where ingredient costs are climbing faster than pricing can absorb.
                  </p>
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Connect recipes to see projected food cost impact
                  </div>
                </div>

                {/* Volatility Exposure */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-medium text-blue-400">High Volatility Exposure</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Ingredients with unpredictable price swings that make costing difficult.
                  </p>
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Requires 90+ days of price history
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========== SECTION 4: Action Items ========== */}
        <div
          id="action-items"
          className={`card overflow-hidden transition-all duration-300 ${
            expandedSections.has("action-items") ? "bg-gray-800/50" : "bg-gray-800/30"
          }`}
        >
          <button
            onClick={() => toggleSection("action-items")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colorClasses.primary.bg} flex items-center justify-center`}>
                <Lightbulb className={`w-4 h-4 ${colorClasses.primary.text}`} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-white">Action Items</h3>
                <p className="text-xs text-gray-500">What to do this week</p>
              </div>
            </div>
            {expandedSections.has("action-items") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.has("action-items") && (
            <div className="px-4 pb-4 border-t border-gray-700/50">
              <GuidanceTip color="primary">
                {SECTIONS.find(s => s.id === "action-items")?.guidance}
              </GuidanceTip>
              
              <div className="mt-4 space-y-3">
                {/* Action Item Cards - will be data-driven */}
                {Object.keys(vendorStats).length > 0 ? (
                  <>
                    {/* Example action items based on vendor data */}
                    {Object.entries(vendorStats)
                      .filter(([_, stats]) => stats.overallChange > 5)
                      .slice(0, 3)
                      .map(([vendor, stats]) => (
                        <div 
                          key={vendor}
                          className="flex items-center gap-4 p-4 bg-gray-900/30 rounded-lg border border-gray-700/30 hover:border-primary-500/30 transition-colors cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-rose-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white">Review pricing with {vendor}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Average increase of {stats.overallChange.toFixed(1)}% across {stats.totalItems} items
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        </div>
                      ))}

                    {/* If no high-priority actions */}
                    {Object.entries(vendorStats).filter(([_, stats]) => stats.overallChange > 5).length === 0 && (
                      <div className="text-center py-8 bg-gray-900/30 rounded-lg">
                        <Lightbulb className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-white mb-2">Looking Good!</h3>
                        <p className="text-gray-400 max-w-md mx-auto text-sm">
                          No urgent actions needed. Your vendor pricing is stable.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 bg-gray-900/30 rounded-lg">
                    <Lightbulb className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-white mb-2">No Actions Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto text-sm">
                      Import invoices to generate actionable insights.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </GuidedModeContext.Provider>
  );
};
