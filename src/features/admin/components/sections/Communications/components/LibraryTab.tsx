/**
 * LibraryTab - Template Library for Communications Module
 * 
 * L5 Design: Card-based list with search, filter, sort, pagination
 * Extracted from TemplateList for tabbed Communications interface
 * 
 * Features:
 * - Search with keyboard shortcut (/)
 * - Category and status filters
 * - Pagination (12 per page)
 * - NEXUS logging for all actions
 * - Keyboard navigation (arrow keys for pages)
 * 
 * Location: Admin → Modules → Communications → Library Tab
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Keyboard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { TemplateCard } from "./TemplateCard";
import type { EmailTemplate } from "@/lib/communications/types";

// =============================================================================
// CONSTANTS
// =============================================================================

const ITEMS_PER_PAGE = 12;

// =============================================================================
// TYPES
// =============================================================================

type StatusFilter = 'all' | 'active' | 'draft' | 'archived';
type CategoryFilter = 'all' | 'performance' | 'hr' | 'operations' | 'general';
type SortOption = 'updated' | 'name' | 'created';

interface LibraryTabProps {
  onTemplateChange?: () => void;
  platformConfigured?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LibraryTab: React.FC<LibraryTabProps> = ({ 
  onTemplateChange,
  platformConfigured = false,
}) => {
  const navigate = useNavigate();
  const { organizationId, user } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Data state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

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

    loadTemplates();
  }, [organizationId]);

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
  // PAGINATION
  // ---------------------------------------------------------------------------
  const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTemplates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTemplates, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, sortBy]);

  // ---------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'ArrowLeft':
          if (currentPage > 1) {
            setCurrentPage(p => p - 1);
          }
          break;
        case 'ArrowRight':
          if (currentPage < totalPages) {
            setCurrentPage(p => p + 1);
          }
          break;
        case 'n':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            navigate('/admin/modules/communications/templates/new');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, navigate]);

  // ---------------------------------------------------------------------------
  // ACTIONS (with NEXUS logging)
  // ---------------------------------------------------------------------------
  const handleDuplicate = async (template: EmailTemplate) => {
    if (!organizationId || !user) return;

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
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => [data, ...prev]);
      onTemplateChange?.();
      
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'template_duplicated',
        details: {
          source_template_id: template.id,
          source_template_name: template.name,
          new_template_id: data.id,
          new_template_name: data.name,
        },
      });
      
      toast.success('Template duplicated');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleArchive = async (template: EmailTemplate) => {
    if (!organizationId || !user) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', template.id);

      if (error) throw error;
      
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, is_archived: true } : t
      ));
      onTemplateChange?.();
      
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'template_archived',
        details: {
          template_id: template.id,
          template_name: template.name,
        },
      });
      
      toast.success('Template archived');
    } catch (error) {
      console.error('Error archiving template:', error);
      toast.error('Failed to archive template');
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!organizationId || !user) return;
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;
      
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      onTemplateChange?.();
      
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'template_deleted',
        details: {
          template_id: template.id,
          template_name: template.name,
          template_category: template.category,
        },
      });
      
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
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search templates... ( / )"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
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
        >
          <option value="updated">Recently Updated</option>
          <option value="created">Recently Created</option>
          <option value="name">Name (A-Z)</option>
        </select>

        {/* New Template Button */}
        <button
          onClick={() => navigate('/admin/modules/communications/templates/new')}
          className="btn-primary"
          title="Ctrl+N"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn-ghost text-gray-400"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Results count & keyboard hints */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {hasActiveFilters 
            ? `Showing ${filteredTemplates.length} of ${templates.length} templates`
            : `${templates.length} template${templates.length !== 1 ? 's' : ''}`
          }
        </span>
        <div className="flex items-center gap-1">
          <Keyboard className="w-3 h-3" />
          <span>
            <kbd className="px-1 py-0.5 rounded bg-gray-700 text-gray-300 text-[10px]">/</kbd> Search
            <span className="mx-1">•</span>
            <kbd className="px-1 py-0.5 rounded bg-gray-700 text-gray-300 text-[10px]">←</kbd>
            <kbd className="px-1 py-0.5 rounded bg-gray-700 text-gray-300 text-[10px] ml-0.5">→</kbd> Pages
          </span>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="py-12 text-center">
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
                className="btn-primary"
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
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedTemplates.map(template => (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <span className="text-xs text-gray-500">
                  ({filteredTemplates.length} total)
                </span>
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LibraryTab;
