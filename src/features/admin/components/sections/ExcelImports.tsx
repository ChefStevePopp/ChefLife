import React, { useEffect } from "react";
import { MasterIngredientList } from "./recipe/MasterIngredientList";
import { VendorInvoiceManager } from "./VendorInvoice/VendorInvoiceManager";
import { InventoryManagement } from "./InventoryManagement";
import { useLocation, useNavigate } from "react-router-dom";

// =============================================================================
// EXCEL IMPORTS - Route Container
// =============================================================================
// This component renders the appropriate content based on URL hash.
// Navigation is handled by the sidebar menu - NO duplicate tabs here.
// =============================================================================

type ContentType = "ingredients" | "prepared" | "inventory";

export const ExcelImports: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine which content to show based on URL hash
  const hash = location.hash.replace("#", "") as ContentType;
  const validHashes: ContentType[] = ["ingredients", "prepared", "inventory"];
  const activeContent: ContentType = validHashes.includes(hash) ? hash : "ingredients";

  // Set default hash if none exists
  useEffect(() => {
    if (!location.hash) {
      navigate(`${location.pathname}#ingredients`, { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  // Render content based on route
  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      <div className="text-xs text-gray-500 font-mono">
        src/features/admin/components/sections/ExcelImports.tsx → #{activeContent}
      </div>

      {/* Content - No duplicate tabs, sidebar handles navigation */}
      {activeContent === "ingredients" && <MasterIngredientList />}
      {activeContent === "prepared" && <VendorInvoiceManager />}
      {activeContent === "inventory" && <InventoryManagement />}
    </div>
  );
};
