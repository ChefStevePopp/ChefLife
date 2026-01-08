/**
 * Operations - Operational Variables Configuration
 * 
 * L5 Design: Following Team Performance / Communications gold standard pattern
 * - Header card with icon, title, stats
 * - Expandable info section (onboarding-aware)
 * - Tabbed content (Variables, Food Relationships)
 * 
 * Part of the Admin Lifecycle:
 * 1. Company Settings → "Who you are"
 * 2. Operations → "Your language" (THIS)
 * 3. Modules → "What you need"
 * 4. Integrations → "Who you connect with"
 * 5. Activity Log → "What's happening"
 * 
 * Location: Admin → Organization → Operations
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Settings,
  Ruler,
  FolderTree,
  Info,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";

// Tab Components
import { VariablesTab } from "./components/VariablesTab";
import { RelationshipsTab } from "./components/RelationshipsTab";

// =============================================================================
// TYPES
// =============================================================================

type TabId = 'variables' | 'relationships';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const Operations: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { securityLevel, isLoading: authLoading } = useAuth();
  
  // Tab from URL or default to 'variables'
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam || 'variables');
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'variables') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Tab configuration
  const tabs: TabConfig[] = [
    { 
      id: 'variables', 
      label: 'Variables', 
      icon: Ruler, 
      color: 'primary',
      description: 'Measurements, storage areas, vendors, and categories',
    },
    { 
      id: 'relationships', 
      label: 'Food Relationships', 
      icon: FolderTree, 
      color: 'green',
      description: 'Hierarchical food categorization for reporting',
    },
  ];

  // Calculate setup progress (for onboarding awareness) - simplified for now
  // TODO: Re-enable when we refactor OperationsManager to share state
  const isFullyConfigured = true; // Placeholder

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading operations..." />
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/Operations/Operations.tsx
        </div>
      )}

      {/* ========================================================================
       * HEADER CARD - Following L5 gold standard
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Operations
                </h1>
                <p className="text-gray-400 text-sm">
                  Define how your kitchen measures, stores, and categorizes
                </p>
              </div>
            </div>
          </div>

          {/* Expandable Info Section - Onboarding aware */}
          <div className={`expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">
                  {isFullyConfigured 
                    ? 'About Operations' 
                    : 'Getting Started with Operations'
                  }
                </span>
              </div>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-4">
                <p className="text-sm text-gray-400">
                  Operations defines the vocabulary your business uses — how you measure ingredients, 
                  where you store items, who you buy from, and how food is categorized. 
                  These values appear as dropdown options throughout ChefLife.
                </p>
                
                {/* Tab explanations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <div 
                        key={tab.id}
                        className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 text-${tab.color === 'primary' ? 'primary' : tab.color}-400`} />
                          <span className="text-sm font-medium text-gray-300">{tab.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{tab.description}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Onboarding hint for new users */}
                {!isFullyConfigured && (
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p className="text-sm text-amber-300">
                      <strong>Tip:</strong> We've set up common defaults for you. 
                      Review each category and add items specific to your operation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
       * TABS + CONTENT CARD
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-700">
          <div className="flex items-center gap-2 p-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`tab ${tab.color} ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'variables' && (
            <VariablesTab />
          )}
          {activeTab === 'relationships' && (
            <RelationshipsTab />
          )}
        </div>
      </div>
    </div>
  );
};

export default Operations;
