/**
 * TemplateEditor - Create/Edit Email Templates
 * 
 * L5 Design: Tabbed editor following Team Performance gold standard pattern
 * - Header card with icon, title, actions
 * - Expandable info section
 * - Separate tabs + content card below
 * 
 * Tabs:
 * - Details (primary): Name, Category, Status, Subject, Description
 * - Content (green): HTML Editor + Merge Fields + Live Preview
 * 
 * Location: Admin → Modules → Communications → Templates → New/Edit
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Eye,
  Mail,
  FileText,
  CheckCircle,
  Loader2,
  Info,
  ChevronUp,
  RotateCcw,
  Type,
  Code,
  Clipboard,
  ExternalLink,
  AlertCircle,
  Monitor,
  Smartphone,
  Keyboard,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";
import { 
  detectFields, 
  mergeTemplate, 
  getSampleContext,
} from "@/lib/communications";
import { MergeFieldsReference } from "./components";
import type { MergeContext } from "@/lib/communications/types";

// =============================================================================
// TYPES
// =============================================================================

interface FormData {
  name: string;
  description: string;
  category: string;
  subject_template: string;
  html_template: string;
  recipient_type: string;
  send_mode: string;
  is_active: boolean;
}

const DEFAULT_FORM: FormData = {
  name: '',
  description: '',
  category: 'general',
  subject_template: '',
  html_template: '',
  recipient_type: 'individual',
  send_mode: 'manual',
  is_active: false,
};

type TabId = 'details' | 'content';

// =============================================================================
// HIGHLIGHTED CODE EDITOR COMPONENT
// =============================================================================

interface HighlightedEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const HighlightedEditor: React.FC<HighlightedEditorProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  
  const handleScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    
    if (textarea && highlight) {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    }
  }, []);
  
  const highlightedContent = useMemo(() => {
    if (!value) return '';
    
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    return escaped.replace(
      /«([^»]+)»/g,
      '<span class="merge-field">«$1»</span>'
    );
  }, [value]);
  
  return (
    <div className="highlighted-editor">
      <pre
        ref={highlightRef}
        className="highlighted-editor-backdrop"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlightedContent + '\n' }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className="highlighted-editor-textarea"
        spellCheck={false}
      />
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TemplateEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  
  const { organizationId, securityLevel, user, isLoading: authLoading } = useAuth();
  
  // State
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [originalForm, setOriginalForm] = useState<FormData>(DEFAULT_FORM);
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [orgModules, setOrgModules] = useState<Record<string, any> | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('details');
  
  const mergeContext = useMemo<MergeContext>(() => getSampleContext(), []);
  
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');

  const hasChanges = JSON.stringify(form) !== JSON.stringify(originalForm);

  // ---------------------------------------------------------------------------
  // FETCH ORG MODULES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchOrgModules = async () => {
      if (!organizationId) return;
      
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('modules')
          .eq('id', organizationId)
          .single();
        
        if (!error && data) {
          setOrgModules(data.modules);
        }
      } catch (err) {
        console.error('Error fetching org modules:', err);
      }
    };
    
    fetchOrgModules();
  }, [organizationId]);

  // ---------------------------------------------------------------------------
  // LOAD EXISTING TEMPLATE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadTemplate = async () => {
      if (isNew || !id) return;

      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) {
          toast.error('Template not found');
          navigate('/admin/modules/communications/templates');
          return;
        }

        const loadedForm: FormData = {
          name: data.name || '',
          description: data.description || '',
          category: data.category || 'general',
          subject_template: data.subject_template || '',
          html_template: data.html_template || '',
          recipient_type: data.recipient_type || 'individual',
          send_mode: data.send_mode || 'manual',
          is_active: data.is_active ?? false,
        };

        setForm(loadedForm);
        setOriginalForm(loadedForm);
        
        const fields = detectFields(data.html_template || '', 'guillemets');
        const subjectFields = detectFields(data.subject_template || '', 'guillemets');
        setDetectedFields([...new Set([...fields, ...subjectFields])]);
      } catch (error) {
        console.error('Error loading template:', error);
        toast.error('Failed to load template');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadTemplate();
    }
  }, [id, isNew, authLoading, navigate]);

  // ---------------------------------------------------------------------------
  // FIELD DETECTION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fields = detectFields(form.html_template, 'guillemets');
    const subjectFields = detectFields(form.subject_template, 'guillemets');
    setDetectedFields([...new Set([...fields, ...subjectFields])]);
  }, [form.html_template, form.subject_template]);

  // ---------------------------------------------------------------------------
  // LIVE PREVIEW
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (form.html_template) {
          const merged = mergeTemplate(form.html_template, mergeContext, {
            syntax: 'guillemets',
            missingFieldBehavior: 'preserve',
          });
          setPreviewHtml(merged);
        } else {
          setPreviewHtml('');
        }

        if (form.subject_template) {
          const mergedSubject = mergeTemplate(form.subject_template, mergeContext, {
            syntax: 'guillemets',
            missingFieldBehavior: 'preserve',
          });
          setPreviewSubject(mergedSubject);
        } else {
          setPreviewSubject('');
        }
      } catch (error) {
        console.error('Preview error:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form.html_template, form.subject_template, mergeContext]);

  // ---------------------------------------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------------------------------------
  const updateForm = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleUndo = () => {
    setForm(originalForm);
    toast('Changes reverted', { icon: '↩️' });
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        updateForm('html_template', text);
        toast.success('Pasted from clipboard');
      }
    } catch (err) {
      toast.error('Unable to read clipboard');
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!organizationId || !user) return;

    if (!form.name.trim()) {
      toast.error('Template name is required');
      setActiveTab('details');
      return;
    }
    if (!form.subject_template.trim()) {
      toast.error('Subject line is required');
      setActiveTab('details');
      return;
    }
    if (!form.html_template.trim()) {
      toast.error('HTML content is required');
      setActiveTab('content');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('email_templates')
          .insert({
            organization_id: organizationId,
            name: form.name.trim(),
            description: form.description.trim() || null,
            category: form.category,
            subject_template: form.subject_template,
            html_template: form.html_template,
            recipient_type: form.recipient_type,
            send_mode: form.send_mode,
            is_active: form.is_active,
            is_system: false,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'template_created',
          details: {
            template_id: data.id,
            template_name: form.name,
            category: form.category,
          },
        });

        toast.success('Template created');
        navigate(`/admin/modules/communications/templates/${data.id}`);
      } else {
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            category: form.category,
            subject_template: form.subject_template,
            html_template: form.html_template,
            recipient_type: form.recipient_type,
            send_mode: form.send_mode,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;

        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'template_updated',
          details: {
            template_id: id,
            template_name: form.name,
            category: form.category,
            fields_used: detectedFields,
          },
        });

        setOriginalForm(form);
        toast.success('Template saved');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS - Use refs to avoid stale closures
  // ---------------------------------------------------------------------------
  const saveRef = useRef<() => Promise<void>>(handleSave);
  const hasChangesRef = useRef<boolean>(hasChanges);
  const isSavingRef = useRef<boolean>(isSaving);
  
  useEffect(() => {
    saveRef.current = handleSave;
    hasChangesRef.current = hasChanges;
    isSavingRef.current = isSaving;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChangesRef.current && !isSavingRef.current) {
          saveRef.current();
        }
      }
      
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement;
        const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
        
        if (isInInput) {
          target.blur();
        }
      }
      
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      if (!isInInput) {
        if (e.key === '1') setActiveTab('details');
        if (e.key === '2') setActiveTab('content');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading template..." />
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/Communications/TemplateEditor.tsx
        </div>
      )}

      {/* ========================================================================
       * HEADER CARD - Following Team Performance gold standard
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Icon + Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/modules/communications/templates')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to templates (Esc)"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {isNew ? 'New Template' : form.name || 'Template'}
                </h1>
                <p className="text-gray-400 text-sm">
                  {isNew ? 'Create a new email template' : 'Edit template settings and content'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isNew && (
                <button
                  onClick={() => navigate(`/admin/modules/communications/templates/${id}/preview`)}
                  className="btn-ghost-amber"
                >
                  <Eye className="w-4 h-4" />
                  Preview & Send
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`btn ${
                  hasChanges
                    ? 'btn-primary'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                title="Ctrl+S"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isNew ? 'Create' : 'Save'}
              </button>
            </div>
          </div>

          {/* Template Status Badge */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${
              form.is_active
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              {form.is_active ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Active
                </>
              ) : (
                'Draft'
              )}
            </span>
            <span className="text-sm text-gray-500">
              {form.category.charAt(0).toUpperCase() + form.category.slice(1)}
            </span>
            {detectedFields.length > 0 && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-sm text-gray-500">
                  {detectedFields.length} merge field{detectedFields.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
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
              <span className="text-sm font-medium text-gray-300">How to create an email template</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-gray-300 font-medium">Details</span>
                  </div>
                  <p className="text-gray-500 text-xs">Name, category, subject line</p>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-gray-300 font-medium">Design</span>
                  </div>
                  <p className="text-gray-500 text-xs">Use BeeFree or Canva</p>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-gray-300 font-medium">Paste & Merge</span>
                  </div>
                  <p className="text-gray-500 text-xs">Add «merge fields»</p>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">4</span>
                    <span className="text-gray-300 font-medium">Preview</span>
                  </div>
                  <p className="text-gray-500 text-xs">Check rendering</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-2 border-t border-gray-700/50">
                <div className="flex items-center gap-3">
                  <a 
                    href="https://beefree.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    BeeFree (Free)
                  </a>
                  <a 
                    href="https://www.canva.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Canva
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500">
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">1</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 ml-1">2</kbd> Tabs
                    <span className="mx-2">•</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">Ctrl+S</kbd> Save
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
       * TABS + CONTENT CARD - Following Team Performance pattern
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-700">
          <div className="flex items-center gap-2 p-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`tab primary ${activeTab === 'details' ? 'active' : ''}`}
            >
              <Settings className="w-4 h-4" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`tab green ${activeTab === 'content' ? 'active' : ''}`}
            >
              <Code className="w-4 h-4" />
              Content
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* ================================================================
           * TAB: DETAILS
           * ================================================================ */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Template Basics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Template Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="Weekly Performance Digest"
                    className="input w-full"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => updateForm('category', e.target.value)}
                    className="w-full"
                  >
                    <option value="performance">Performance</option>
                    <option value="hr">HR</option>
                    <option value="operations">Operations</option>
                    <option value="general">General</option>
                  </select>
                </div>

                {/* Active Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <button
                    onClick={() => updateForm('is_active', !form.is_active)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.is_active
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {form.is_active ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </>
                    ) : (
                      'Draft'
                    )}
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="Sent every Sunday at 6pm to all team members"
                  className="input w-full"
                />
              </div>

              {/* Subject Line */}
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Type className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-white">Subject Line</h3>
                  <span className="text-rose-400 text-sm">*</span>
                </div>
                <input
                  type="text"
                  value={form.subject_template}
                  onChange={(e) => updateForm('subject_template', e.target.value)}
                  placeholder="Your Week at «Org_Name» - «First_Name»"
                  className="input w-full font-mono"
                />
                {previewSubject && (
                  <p className="mt-3 text-sm text-gray-500">
                    Preview: <span className="text-gray-300">{previewSubject}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
           * TAB: CONTENT
           * ================================================================ */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Editor Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{form.html_template.length.toLocaleString()} characters</span>
                  {detectedFields.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        {detectedFields.length} merge field{detectedFields.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                  {detectedFields.length === 0 && form.html_template.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <AlertCircle className="w-3 h-3" />
                        No merge fields
                      </span>
                    </>
                  )}
                </div>
                
                <button
                  onClick={handlePasteFromClipboard}
                  className="btn-ghost text-xs"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Paste HTML
                </button>
              </div>

              {/* Main Editor Area */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* HTML Editor */}
                <div className="xl:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-gray-500" />
                      <h3 className="text-sm font-semibold text-white">HTML Content</h3>
                      <span className="text-rose-400 text-xs">*</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded bg-amber-400/20 border border-amber-400/30"></span>
                      <span>Merge fields highlighted</span>
                    </div>
                  </div>
                  
                  <HighlightedEditor
                    value={form.html_template}
                    onChange={(value) => updateForm('html_template', value)}
                    placeholder={`Paste your HTML here...

Design your email in BeeFree or Canva, export as HTML, and paste here.
Then add merge fields like «First_Name» where you want personalized data.`}
                  />
                  
                  {/* Detected Fields */}
                  {detectedFields.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {detectedFields.map(field => (
                        <span
                          key={field}
                          className="inline-flex items-center px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-xs font-mono text-amber-400"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Merge Fields Reference */}
                <div>
                  <MergeFieldsReference orgModules={orgModules} />
                </div>
              </div>

              {/* Live Preview */}
              <div className="pt-6 border-t border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-white">Live Preview</h3>
                    <span className="text-xs text-gray-500">• Sample: Marcus Chen</span>
                  </div>
                  
                  {/* Desktop/Mobile Toggle */}
                  <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        previewMode === 'desktop'
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      Desktop
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        previewMode === 'mobile'
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Mobile
                    </button>
                  </div>
                </div>
                
                {previewHtml ? (
                  <div className={`bg-white rounded-lg overflow-hidden mx-auto transition-all duration-300 ${
                    previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'
                  }`}>
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full border-0"
                      style={{ height: previewMode === 'mobile' ? '667px' : '600px' }}
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="text-center">
                      <Mail className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">
                        Paste HTML content above to see preview
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <span className="text-sm text-gray-300">Unsaved changes</span>
              <button
                onClick={handleUndo}
                disabled={isSaving}
                className="btn-ghost"
              >
                <RotateCcw className="w-4 h-4" />
                Undo
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isNew ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateEditor;
