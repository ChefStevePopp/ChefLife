/**
 * TemplateEditor - Create/Edit Email Templates
 * 
 * L5 Design: Workflow-focused editor with merge field reference
 * 
 * Workflow: Design elsewhere → Paste HTML → Add merge fields → Preview → Save
 * 
 * Location: Admin → Modules → Communications → Templates → New/Edit
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Wand2,
  RotateCcw,
  Type,
  Code,
  Clipboard,
  ExternalLink,
  AlertCircle,
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
  
  // Sample context for preview
  const sampleContext = useMemo(() => getSampleContext(), []);
  
  // Preview state
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');

  // Derive hasChanges
  const hasChanges = JSON.stringify(form) !== JSON.stringify(originalForm);

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
        
        // Detect fields on load
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
  // FIELD DETECTION (on content change)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fields = detectFields(form.html_template, 'guillemets');
    const subjectFields = detectFields(form.subject_template, 'guillemets');
    setDetectedFields([...new Set([...fields, ...subjectFields])]);
  }, [form.html_template, form.subject_template]);

  // ---------------------------------------------------------------------------
  // LIVE PREVIEW (debounced)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (form.html_template) {
          const merged = mergeTemplate(form.html_template, sampleContext, {
            syntax: 'guillemets',
            missingFieldBehavior: 'preserve',
          });
          setPreviewHtml(merged);
        } else {
          setPreviewHtml('');
        }

        if (form.subject_template) {
          const mergedSubject = mergeTemplate(form.subject_template, sampleContext, {
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
  }, [form.html_template, form.subject_template, sampleContext]);

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

    // Validation
    if (!form.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!form.subject_template.trim()) {
      toast.error('Subject line is required');
      return;
    }
    if (!form.html_template.trim()) {
      toast.error('HTML content is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        // Create new template
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

        // Log activity
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'template_created',
          details: {
            template_id: data.id,
            template_name: form.name,
          },
        });

        toast.success('Template created');
        navigate(`/admin/modules/communications/templates/${data.id}`);
      } else {
        // Update existing template
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

        // Log activity
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'template_updated',
          details: {
            template_id: id,
            template_name: form.name,
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

      {/* Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/modules/communications/templates')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {isNew ? 'New Template' : `Edit: ${form.name || 'Template'}`}
              </h1>
              <p className="text-gray-400 text-sm">
                {isNew ? 'Create a new email template' : 'Modify template settings and content'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                onClick={() => navigate(`/admin/modules/communications/templates/${id}/preview`)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-700 text-white hover:bg-gray-600"
              >
                <Eye className="w-4 h-4" />
                Full Preview
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                hasChanges
                  ? 'bg-primary-500 hover:bg-primary-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
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
              <span className="text-sm font-medium text-gray-300">How to create a template</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-gray-300 font-medium">Design</span>
                  </div>
                  <p className="text-gray-500 text-xs">Use BeeFree, Canva, or any HTML editor to design your email</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-gray-300 font-medium">Paste HTML</span>
                  </div>
                  <p className="text-gray-500 text-xs">Export HTML from your editor and paste it below</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-gray-300 font-medium">Add Fields</span>
                  </div>
                  <p className="text-gray-500 text-xs">Click fields from the reference panel to copy merge tags</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">4</span>
                    <span className="text-gray-300 font-medium">Preview</span>
                  </div>
                  <p className="text-gray-500 text-xs">See how it looks with real data before sending</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
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
                <span className="text-gray-500">— Recommended free email design tools</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Basics - Compact Row */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Template Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="Weekly Performance Digest"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => updateForm('category', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors text-sm"
            >
              <option value="performance">Performance</option>
              <option value="hr">HR</option>
              <option value="operations">Operations</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Active Toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
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

        {/* Description - Optional */}
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Description <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            placeholder="Sent every Sunday at 6pm to all team members"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors text-sm"
          />
        </div>
      </div>

      {/* Subject Line */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Type className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-white">Subject Line</h2>
          <span className="text-rose-400 text-xs">*</span>
        </div>
        <input
          type="text"
          value={form.subject_template}
          onChange={(e) => updateForm('subject_template', e.target.value)}
          placeholder="Your Week at «Org_Name» - «First_Name»"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors font-mono text-sm"
        />
        {previewSubject && (
          <p className="mt-2 text-xs text-gray-500">
            Preview: <span className="text-gray-300">{previewSubject}</span>
          </p>
        )}
      </div>

      {/* Main Content Area - Two Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left: HTML Content (2 cols) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-white">HTML Content</h2>
                <span className="text-rose-400 text-xs">*</span>
              </div>
              <button
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5" />
                Paste from Clipboard
              </button>
            </div>
            
            <textarea
              value={form.html_template}
              onChange={(e) => updateForm('html_template', e.target.value)}
              placeholder="Paste your HTML here...

Design your email in BeeFree or Canva, export as HTML, and paste here.
Then add merge fields like «First_Name» where you want personalized data."
              rows={20}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors font-mono text-xs resize-none"
            />
            
            {/* Footer Stats */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-gray-500">
                <span>{form.html_template.length.toLocaleString()} characters</span>
                {detectedFields.length > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-3 h-3" />
                    {detectedFields.length} merge field{detectedFields.length !== 1 ? 's' : ''} detected
                  </span>
                )}
              </div>
              {detectedFields.length === 0 && form.html_template.length > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertCircle className="w-3 h-3" />
                  No merge fields found — add some from the reference panel
                </span>
              )}
            </div>

            {/* Detected Fields Preview */}
            {detectedFields.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detectedFields.map(field => (
                  <span
                    key={field}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-gray-800 text-xs font-mono text-amber-400"
                  >
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Merge Fields Reference (1 col) */}
        <div className="space-y-4">
          <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-white">Merge Fields</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Click a field to copy it, then paste into your HTML.
            </p>
            <MergeFieldsReference />
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-white">Live Preview</h2>
          </div>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
            Sample: {sampleContext.recipient.first_name} {sampleContext.recipient.last_name}
          </span>
        </div>

        {previewHtml ? (
          <div className="bg-white rounded-lg overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[500px] border-0"
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

      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <span className="text-sm text-gray-300">Unsaved changes</span>
              <button
                onClick={handleUndo}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
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
