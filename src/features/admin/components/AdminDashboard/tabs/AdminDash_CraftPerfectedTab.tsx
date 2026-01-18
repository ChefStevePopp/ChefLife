import React from "react";
import {
  BookOpen,
  Award,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * =============================================================================
 * NEXUS DASHBOARD - Craft Perfected Tab
 * =============================================================================
 * Future home of culinary education content:
 * - Standards and Practices of the Professional Kitchen e-book
 * - Culinary techniques and best practices
 * - Professional development content
 * 
 * This tab is future-proofed for when the education platform is built.
 * =============================================================================
 */

export const AdminDash_CraftPerfectedTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard/tabs/AdminDash_CraftPerfectedTab.tsx
        </div>
      )}

      {/* Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box purple">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">Craft Perfected</h3>
              <p className="subheader-subtitle">Standards & Practices of the Professional Kitchen</p>
            </div>
          </div>
          <div className="subheader-right">
            {/* Future: content type toggles */}
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Chapters</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <Award className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Standards</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Training</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon State */}
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Coming Soon
        </h3>
        <p className="text-gray-400 max-w-md mx-auto mb-6">
          Craft Perfected will be your gateway to culinary excellence — 
          professional standards, techniques, and best practices from 
          35 years of kitchen experience.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <span className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
            Professional Standards
          </span>
          <span className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
            Kitchen Best Practices
          </span>
          <span className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
            Culinary Techniques
          </span>
        </div>
      </div>

      {/* Teaser Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 opacity-60">
          <div className="icon-badge-purple mb-4">
            <BookOpen />
          </div>
          <h4 className="text-sm font-medium text-white mb-1">The E-Book</h4>
          <p className="text-xs text-gray-500">
            Standards and Practices of the Professional Kitchen — your comprehensive guide
          </p>
        </div>

        <div className="card p-6 opacity-60">
          <div className="icon-badge-purple mb-4">
            <Award />
          </div>
          <h4 className="text-sm font-medium text-white mb-1">Quality Standards</h4>
          <p className="text-xs text-gray-500">
            What separates good from great — the details that matter
          </p>
        </div>

        <div className="card p-6 opacity-60">
          <div className="icon-badge-purple mb-4">
            <GraduationCap />
          </div>
          <h4 className="text-sm font-medium text-white mb-1">Team Training</h4>
          <p className="text-xs text-gray-500">
            Develop your team with professional development content
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDash_CraftPerfectedTab;
