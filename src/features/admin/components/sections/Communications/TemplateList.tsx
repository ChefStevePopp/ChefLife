/**
 * TemplateList - Email Template Management
 * 
 * L5 Design: Card-based list with search, filter, sort
 * Phase 1: Foundation + Phase 1.2: Card Design
 * 
 * Location: Admin → Modules → Communications → Templates
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Plus,
  Search,
  FileText,
  Send,
  Clock,
  Filter,
  X,
  MoreVertical,
  Copy,
  Archive,
  Trash2,
  Info,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";
import { TemplateCard } from "./components/TemplateCard";
import type { EmailTemplate } from "@/lib/communications/types";

// =============================================================================
// TYPES
// =============================================================================

type StatusFilter = 'all' | 'active' | 'draft' | 'archived';
type CategoryFilter = 'all' | 'performance' | 'hr' | 'operations' | 'general';
type SortOption = 'updated' | 'name' | 'created';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TemplateList: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, securityLevel, isLoading: authLoading } = useAuth();
  
  // Data state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');

  // ---------------------------------------------------------------------------
  // LOAD DATA
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadTemplates = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .eq('organization_id', organizationId)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error('Error loading templates:', error);
        toast.error('Failed to load templates');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadTemplates();
    }
  }, [organizationId, authLoading]);

  // ---------------------------------------------------------------------------
  // FILTERING & SORTING
  // ---------------------------------------------------------------------------
  const filteredTemplates = useMemo(() => {
    let result = [...templates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        result = result.filter(t => t.is_active && !t.is_archived);
      } else if (statusFilter === 'draft') {
        result = result.filter(t => !t.is_active && !t.is_archived);
      } else if (statusFilter === 'archived') {
        result = result.filter(t => t.is_archived);
      }
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return result;
  }, [templates, searchQuery, statusFilter, categoryFilter, sortBy]);

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------
  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          organization_id: organizationId,
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          subject_template: template.subject_template,
          html_template: template.html_template,
          recipient_type: template.recipient_type,
          send_mode: template.send_mode,
          is_active: false,
          created_by: template.created_by,
        })
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => [data, ...prev]);
      toast.success('Template duplicated');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleArchive = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', template.id);

      if (error) throw error;
      
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, is_archived: true } : t
      ));
      toast.success('Template archived');
    } catch (error) {
      console.error('Error archiving template:', error);
      toast.error('Failed to archive template');
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;
      
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || categoryFilter !== 'all';

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading templates..." />
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/Communications/TemplateList.tsx
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/modules/communications')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Email Templates</h1>
              <p className="text-gray-400 text-sm">
                {templates.length} template{templates.length !== 1 ? 's' : ''} • Create and manage email templates
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/admin/modules/communications/templates/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-primary-500 hover:bg-primary-600 text-white"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>

        {/* Expandable Info Section */}
        <div className="expandable-info-section mt-4">
          <button
            onClick={(e) => {
              const section = e.currentTarget.closest('.expandable-info-section');
              section?.classList.toggle('expanded');
            }}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About email templates</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <p className="text-sm text-gray-400">
                Email templates let you create reusable, personalized communications for your team. Use merge fields like <span className="text-amber-400 font-mono">«First_Name»</span> to automatically insert recipient data.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active</span>
                <span className="text-gray-500">Ready to send</span>
                <span className="px-2 py-1 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">Draft</span>
                <span className="text-gray-500">Work in progress</span>
                <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">Archived</span>
                <span className="text-gray-500">No longer in use</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
          >
            <option value="all">All Categories</option>
            <option value="performance">Performance</option>
            <option value="hr">HR</option>
            <option value="operations">Operations</option>
            <option value="general">General</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
          >
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="name">Name (A-Z)</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <p className="mt-3 text-sm text-gray-500">
            Showing {filteredTemplates.length} of {templates.length} templates
          </p>
        )}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-12 text-center">
          {templates.length === 0 ? (
            <>
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No templates yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Create your first email template to start sending personalized communications to your team.
              </p>
              <button
                onClick={() => navigate('/admin/modules/communications/templates/new')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Template
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No matching templates</h3>
              <p className="text-gray-400 mb-4">
                Try adjusting your search or filters
              </p>
              <button
                onClick={clearFilters}
                className="text-primary-400 hover:text-primary-300 transition-colors"
              >
                Clear all filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => navigate(`/admin/modules/communications/templates/${template.id}`)}
              onPreview={() => navigate(`/admin/modules/communications/templates/${template.id}/preview`)}
              onDuplicate={() => handleDuplicate(template)}
              onArchive={() => handleArchive(template)}
              onDelete={() => handleDelete(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateList;
