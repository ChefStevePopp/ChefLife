import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { menuItems, type MenuItem } from "./menuItems";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminSidebarProps {
  onToggleCollapse?: (collapsed: boolean) => void;
}

// Tooltip component for menu items - displays below the item
const MenuItemTooltip: React.FC<{ text: string; comingSoon?: boolean }> = ({
  text,
  comingSoon,
}) => (
  <div 
    className="absolute left-0 right-0 top-full mt-1 px-3 py-2 rounded text-xs text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 border border-gray-600"
    style={{ backgroundColor: 'rgba(55, 65, 81, 0.95)' }}
  >
    <div className="leading-relaxed">
      {text}
      {comingSoon && (
        <span className="block text-amber-400 mt-1">Coming Soon</span>
      )}
    </div>
  </div>
);

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  onToggleCollapse,
}) => {
  const location = useLocation();
  const { isDev } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const items = menuItems(isDev);

  const toggleSidebar = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onToggleCollapse) {
      onToggleCollapse(newCollapsedState);
    }
  };

  const renderMenuItem = (item: MenuItem) => {
    const isActive = location.pathname === item.path;
    const isDisabled = item.disabled || item.comingSoon;

    // Base classes for the menu item
    const baseClasses = `relative group flex items-center ${
      isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-2"
    } rounded-lg transition-colors`;

    // State-specific classes
    const stateClasses = isDisabled
      ? "text-gray-600 cursor-not-allowed hover:bg-gray-800"
      : isActive
        ? "bg-gray-800 text-white"
        : "text-gray-400 hover:text-white hover:bg-gray-800";

    // If disabled/coming soon, render as div instead of Link
    if (isDisabled) {
      return (
        <div
          className={`${baseClasses} ${stateClasses}`}
          title={isCollapsed ? item.label : ""}
        >
          <item.icon
            size={isCollapsed ? 24 : 20}
            className={`flex-shrink-0 ${
              item.comingSoon ? "text-gray-600" : "text-primary-400/30"
            }`}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && (
                <span className="text-[10px] text-amber-500/60 font-medium uppercase tracking-wide">
                  Soon
                </span>
              )}
            </>
          )}
          {/* Tooltip on hover */}
          {item.tooltip && !isCollapsed && (
            <MenuItemTooltip text={item.tooltip} comingSoon={item.comingSoon} />
          )}
        </div>
      );
    }

    // Active/regular menu item as Link
    return (
      <Link
        to={item.path}
        className={`${baseClasses} ${stateClasses}`}
        title={isCollapsed ? item.label : ""}
      >
        <item.icon
          size={isCollapsed ? 24 : 20}
          className={`flex-shrink-0 ${
            isCollapsed ? "text-primary-400/30" : ""
          }`}
        />
        {!isCollapsed && <span>{item.label}</span>}
        {/* Tooltip on hover */}
        {item.tooltip && !isCollapsed && (
          <MenuItemTooltip text={item.tooltip} />
        )}
      </Link>
    );
  };

  return (
    <div
      className={`h-screen bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 relative z-50 ${
        isCollapsed ? "w-20" : ""
      }`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div
          className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}
        >
          <img
            src="https://www.restaurantconsultants.ca/wp-content/uploads/2023/03/cropped-AI-CHEF-BOT.png"
            alt="KITCHEN AI"
            className={`rounded-lg object-contain ${isCollapsed ? "w-10 h-10" : "w-12 h-10"}`}
          />
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-semibold text-white">KITCHEN AI</h1>
              <h2 className="text-xs font-status text-primary-400">ADMIN</h2>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-20 -right-3 bg-gray-800 rounded-full p-1 border border-gray-700 text-gray-400 hover:text-white z-50 shadow-md"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-6"
        style={{ maxHeight: "calc(100vh - 120px)" }}
      >
        <div className={`space-y-8 ${isCollapsed ? "px-2" : "px-6"}`}>
          {items.map((section) => (
            <div key={section.id}>
              {section.label && !isCollapsed && (
                <h3 className="text-xs font-status font-medium text-primary-400/80 uppercase tracking-wider mb-3">
                  {section.label}
                </h3>
              )}
              <ul className="space-y-1 relative">
                {section.items.map((item) => (
                  <li key={item.path} className="relative z-0 hover:z-10">{renderMenuItem(item)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};
