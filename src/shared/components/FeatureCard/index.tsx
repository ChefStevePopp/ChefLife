import React, { useState } from "react";
import { Check, Settings, AlertTriangle, MoreVertical } from "lucide-react";

export interface FeatureCardProps {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  
  // Selection/Toggle state
  isEnabled?: boolean;
  onToggle?: (id: string) => void;
  canToggle?: boolean;
  
  // Status
  comingSoon?: boolean;
  
  // Actions
  onConfigure?: () => void;
  configureLabel?: string;
  
  // Compliance (for add-ons that need it)
  complianceWarning?: string;
  complianceAcknowledged?: boolean;
  onComplianceChange?: (acknowledged: boolean) => void;
  
  // Variant controls what's toggleable
  variant?: 'core' | 'addon';
  
  // Loading state
  isUpdating?: boolean;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  id,
  label,
  description,
  icon: Icon,
  isEnabled = false,
  onToggle,
  canToggle = true,
  comingSoon = false,
  onConfigure,
  configureLabel = "Configure",
  complianceWarning,
  complianceAcknowledged = false,
  onComplianceChange,
  variant = 'addon',
  isUpdating = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const needsCompliance = !!complianceWarning && !complianceAcknowledged;
  const isCore = variant === 'core';
  const isSelectable = !isCore && !comingSoon && canToggle && !needsCompliance;
  
  // For core features, "enabled" is always true conceptually
  const displayEnabled = isCore ? true : isEnabled;
  
  const handleCardClick = () => {
    if (isSelectable && onToggle && !isUpdating) {
      onToggle(id);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleConfigureClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onConfigure?.();
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => setMenuOpen(false)}
      className={`bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 group flex flex-col relative ${
        displayEnabled && !isCore
          ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30 scale-[1.02]' 
          : 'border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 hover:scale-[1.01]'
      } ${isSelectable ? 'cursor-pointer' : ''} ${isUpdating ? 'opacity-70 pointer-events-none' : ''}`}
    >
      {/* Checkbox - commented out for modules, kept for potential future use
      {variant === 'addon' && !comingSoon && (
        <div 
          className={`absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
            isEnabled 
              ? 'bg-primary-500 border-primary-500 scale-110' 
              : needsCompliance
                ? 'border-amber-500/50 bg-gray-800/50'
                : 'border-gray-600 bg-gray-800/50 group-hover:border-gray-500'
          }`}
        >
          <Check className={`w-3 h-3 text-white transition-all duration-200 ${
            isEnabled ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`} />
        </div>
      )}
      */}

      {/* Main Content - Vertical Stack */}
      <div className="flex flex-col items-center text-center gap-3 flex-1">
        {/* Icon with ring */}
        <div className="relative">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ring-2 transition-all ${
            displayEnabled && !isCore
              ? 'bg-primary-500/20 ring-primary-500/50' 
              : 'bg-gray-700/50 ring-gray-700/50 group-hover:ring-primary-500/30'
          }`}>
            <Icon className={`w-8 h-8 transition-colors ${
              displayEnabled && !isCore ? 'text-primary-400' : 'text-gray-400'
            }`} />
          </div>
          {/* Active indicator dot */}
          {displayEnabled && !isCore && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
          )}
        </div>

        {/* Label */}
        <div className="text-white font-medium text-base leading-tight">
          {label}
        </div>

        {/* Status Badge */}
        <div className="h-7 flex items-center gap-2">
          {comingSoon ? (
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide bg-gray-700/50 text-gray-400 border border-gray-600/30">
              Coming Soon
            </span>
          ) : isCore ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide bg-green-500/20 text-green-400 border border-green-500/30">
              <Check className="w-3 h-3" />
              Core
            </span>
          ) : displayEnabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide bg-green-500/20 text-green-400 border border-green-500/30">
              <Check className="w-3 h-3" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide bg-gray-700/50 text-gray-500 border border-gray-600/30">
              Disabled
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 line-clamp-2 px-2 mb-2">
          {description}
        </p>
      </div>

      {/* Compliance Warning */}
      {complianceWarning && !complianceAcknowledged && (
        <div className="mx-2 mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-amber-300 line-clamp-3">
                {complianceWarning}
              </p>
              <label className="flex items-center gap-2 mt-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={complianceAcknowledged}
                  onChange={(e) => onComplianceChange?.(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500/50"
                />
                <span className="text-xs text-gray-300">
                  I acknowledge compliance responsibility
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Footer section with 3-dot menu */}
      <div className="mt-auto pt-3 border-t border-gray-700/30">
        <div className="relative flex justify-end min-h-[32px]">
          {/* Animated Action Buttons - slides in horizontally from right */}
          {onConfigure && (
            <div 
              className={`flex items-center gap-2 mr-2 transition-all duration-200 ease-out ${
                menuOpen 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 translate-x-4 pointer-events-none'
              }`}
            >
              <button
                onClick={handleConfigureClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                {configureLabel}
              </button>
            </div>
          )}

          {/* 3-dot menu trigger */}
          {onConfigure && (
            <button
              onClick={handleMenuToggle}
              className={`p-1.5 rounded-lg transition-colors ${
                menuOpen 
                  ? 'text-primary-400 bg-gray-700/50' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
              aria-label="Feature actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}

          {/* Helper text when no menu */}
          {!onConfigure && !isCore && !comingSoon && canToggle && !needsCompliance && !displayEnabled && (
            <p className="text-xs text-gray-600 py-1.5 w-full text-center">
              Click to enable
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
