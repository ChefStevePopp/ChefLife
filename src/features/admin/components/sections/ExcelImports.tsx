import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Database,
  CircleDollarSign,
  Package,
} from "lucide-react";
import { MasterIngredientList } from "./recipe/MasterIngredientList";
import { VendorInvoiceManager } from "./VendorInvoice/VendorInvoiceManager";
import { InventoryManagement } from "./InventoryManagement";
import { useLocation, useNavigate } from "react-router-dom";

export const ExcelImports: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "ingredients" | "prepared" | "inventory"
  >("ingredients");

  // Sync tab state with URL hash
  useEffect(() => {
    const hash = location.hash.replace("#", "") as
      | "ingredients"
      | "prepared"
      | "inventory";
    if (
      hash &&
      [
        "ingredients",
        "prepared",
        "inventory",
      ].includes(hash)
    ) {
      setActiveTab(hash);
    } else {
      // Set default hash if none exists
      navigate(`${location.pathname}#ingredients`, { replace: true });
    }
  }, [location.hash, navigate]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    navigate(`${location.pathname}#${tab}`, { replace: true });
  };

  const tabs = [
    {
      id: "ingredients" as const,
      label: "Master Ingredients",
      icon: Database,
      color: "primary",
    },
    {
      id: "prepared" as const,
      label: "Vendor Invoices",
      icon: CircleDollarSign,
      color: "green",
    },
    {
      id: "inventory" as const,
      label: "Food Inventory",
      icon: Package,
      color: "amber",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Diagnostic Text */}
      <div className="text-xs text-gray-500 font-mono">
        src/features/admin/components/sections/ExcelImports.tsx
      </div>
      <header className="flex items-center gap-4">
        <FileSpreadsheet className="w-8 h-8 text-primary-400" />
        <h1 className="text-3xl font-bold text-white">Data Management</h1>
      </header>
      {/* Standardized Tab Navigation */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`tab ${tab.color} ${
              activeTab === tab.id ? "active" : ""
            }`}
          >
            <tab.icon
              className={`w-5 h-5 ${
                activeTab === tab.id ? `text-${tab.color}-400` : "text-current"
              }`}
            />
            {tab.label}
          </button>
        ))}
      </div>
      {/* Tab Content */}
      <div className="bg-gray-800 rounded-lg p-6 mt-3">
        {activeTab === "ingredients" && <MasterIngredientList />}
        {activeTab === "prepared" && <VendorInvoiceManager />}
        {activeTab === "inventory" && <InventoryManagement />}
      </div>
    </div>
  );
};
