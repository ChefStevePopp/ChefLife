import React from "react";
import {
  Award,
  GraduationCap,
  FileText,
  CheckCircle,
  Youtube,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * =============================================================================
 * NEXUS DASHBOARD - Craft Perfected Tab
 * =============================================================================
 * Education and certification platform:
 * 
 * Phase 1 - Internal:
 *   - Memphis Fire policies, SOPs, standards
 *   - Proficiency checklists, station certifications
 * 
 * Phase 2 - Education:
 *   - Basic cooking theory, food safety
 *   - Culinary techniques and best practices
 * 
 * Future - Full Certification:
 *   - Complete culinary certification via YouTube + self-study
 *   - Built on 8.5 years of collegiate culinary arts teaching experience
 * =============================================================================
 */

// Craft Perfected logo - platform asset (128px for clarity on large screens)
const CRAFT_PERFECTED_LOGO = "https://vcfigkwtsqvrvahfprya.supabase.co/storage/v1/object/public/platform-assets/craft_perfected_128.webp";

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
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gray-800">
              <img 
                src={CRAFT_PERFECTED_LOGO} 
                alt="Craft Perfected" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="subheader-title">Craft Perfected</h3>
              <p className="subheader-subtitle">Training, certifications & culinary education</p>
            </div>
          </div>
          <div className="subheader-right">
            {/* Content type toggles */}
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <FileText className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Policies</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Proficiency</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Education</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon State */}
      <div className="card p-12 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 overflow-hidden bg-gray-800/50 ring-2 ring-red-500/30">
          <img 
            src={CRAFT_PERFECTED_LOGO} 
            alt="Craft Perfected" 
            className="w-16 h-16 object-contain"
          />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Coming Soon
        </h3>
        <p className="text-gray-400 max-w-lg mx-auto mb-6">
          Craft Perfected will be your complete training and certification platform — 
          from internal policies and proficiency checklists to full culinary education 
          via YouTube and self-study.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <span className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
            Internal Policies
          </span>
          <span className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
            Station Certifications
          </span>
          <span className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
            Culinary Education
          </span>
        </div>
      </div>

      {/* Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-l-2 border-l-red-500/50">
          <div className="icon-badge-rose mb-4">
            <FileText />
          </div>
          <h4 className="text-sm font-medium text-white mb-1">Internal Standards</h4>
          <p className="text-xs text-gray-500 mb-3">
            Your restaurant's policies, SOPs, and house standards
          </p>
          <span className="text-2xs text-amber-400 font-medium uppercase tracking-wide">
            Phase 1
          </span>
        </div>

        <div className="card p-6 opacity-70">
          <div className="icon-badge-rose mb-4">
            <Award />
          </div>
          <h4 className="text-sm font-medium text-white mb-1">Proficiency Certifications</h4>
          <p className="text-xs text-gray-500 mb-3">
            Skills checklists and station certifications for your team
          </p>
          <span className="text-2xs text-gray-500 font-medium uppercase tracking-wide">
            Phase 2
          </span>
        </div>

        <div className="card p-6 opacity-50">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-badge-rose">
              <GraduationCap />
            </div>
            <Youtube className="w-5 h-5 text-red-500/50" />
          </div>
          <h4 className="text-sm font-medium text-white mb-1">Full Certification</h4>
          <p className="text-xs text-gray-500 mb-3">
            Complete culinary certification via YouTube & self-study
          </p>
          <span className="text-2xs text-gray-600 font-medium uppercase tracking-wide">
            Future
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminDash_CraftPerfectedTab;
