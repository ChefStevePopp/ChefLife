import React, { useState } from "react";
import { MoreVertical, Package } from "lucide-react";

/**
 * =============================================================================
 * VITALS CARD - Baseball Card Style
 * =============================================================================
 * Modular card with configurable zones:
 * - Hero Zone: Image/avatar
 * - Identity Zone: Name + badges
 * - Stats Zone: Configurable per use case (price, inventory, recipe, etc.)
 * - Footer Zone: Vendor badge + 3-dot animated menu
 * 
 * Inspired by TeamMemberCard's animated menu pattern.
 * =============================================================================
 */

export interface VitalsCardAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "success";
}

export interface VitalsCardProps {
  // Identity
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string | null;
  
  // Badges (optional)
  badges?: React.ReactNode;
  
  // Stats Zone - render prop for flexibility
  statsZone?: React.ReactNode;
  
  // Footer
  footerLeft?: React.ReactNode;  // e.g., vendor badge
  actions?: VitalsCardAction[];
  
  // Events
  onClick?: () => void;
  
  // Variants
  variant?: "default" | "success" | "warning" | "danger";
}

export const VitalsCard: React.FC<VitalsCardProps> = ({
  id,
  name,
  subtitle,
  imageUrl,
  badges,
  statsZone,
  footerLeft,
  actions = [],
  onClick,
  variant = "default",
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const variantClasses = {
    default: "border-gray-700/50 hover:border-gray-600/50",
    success: "border-emerald-500/30 bg-emerald-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    danger: "border-rose-500/30 bg-rose-500/5",
  };

  const handleCardClick = () => {
    if (onClick && !menuOpen) {
      onClick();
    }
  };

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border transition-all duration-200 group flex flex-col overflow-hidden ${
        variantClasses[variant]
      } ${onClick ? "cursor-pointer hover:scale-[1.02] hover:bg-gray-800/70" : ""}`}
    >
      {/* ================================================================
       * HERO ZONE - Image
       * ================================================================ */}
      <div className="relative aspect-square bg-gray-900/50 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-700" />
          </div>
        )}
      </div>

      {/* ================================================================
       * IDENTITY ZONE - Name + Badges
       * ================================================================ */}
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-sm font-semibold text-white truncate" title={name}>
          {name}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-500 truncate mt-0.5" title={subtitle}>
            {subtitle}
          </p>
        )}
        {badges && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {badges}
          </div>
        )}
      </div>

      {/* ================================================================
       * STATS ZONE - Configurable content
       * ================================================================ */}
      {statsZone && (
        <div className="px-3 pb-2 flex-1">
          {statsZone}
        </div>
      )}

      {/* ================================================================
       * FOOTER ZONE - Vendor + 3-dot menu
       * ================================================================ */}
      <div className="px-3 py-2 border-t border-gray-700/30 mt-auto">
        <div className="flex items-center justify-between">
          {/* Left side - vendor or custom content */}
          <div className="flex-1 min-w-0">
            {footerLeft}
          </div>

          {/* Right side - 3-dot animated menu */}
          {actions.length > 0 && (
            <div className="relative flex items-center">
              {/* Action buttons - slide in from right */}
              <div
                className={`flex items-center gap-1.5 mr-1.5 transition-all duration-200 ease-out ${
                  menuOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-4 pointer-events-none"
                }`}
              >
                {actions.map((action, idx) => {
                  const actionVariants = {
                    default: "text-gray-300 hover:bg-gray-700",
                    danger: "text-rose-400 hover:bg-rose-500/20",
                    success: "text-emerald-400 hover:bg-emerald-500/20",
                  };
                  return (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                        setMenuOpen(false);
                      }}
                      className={`px-2 py-1 text-xs font-medium rounded-md border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors bg-gray-800 ${
                        actionVariants[action.variant || "default"]
                      }`}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>

              {/* 3-dot button */}
              <button
                onClick={handleToggleMenu}
                className={`p-1 rounded-lg transition-colors ${
                  menuOpen
                    ? "text-primary-400 bg-gray-700/50"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
                }`}
                aria-label="Card actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VitalsCard;
