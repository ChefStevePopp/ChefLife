/**
 * TemplatePreview - Full-Page Preview with Send Test
 * 
 * L5 Design: Full preview with send test option
 * 
 * Location: Admin → Modules → Communications → Templates → Preview
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Mail,
  FileText,
  Loader2,
  User,
  Code,
  ChevronUp,
  CheckCircle,
  Users,
  Info,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTeamStore } from "@/stores/teamStore";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";
import { 
  mergeTemplate, 
  getSampleContext,
  sendEmail,
} from "@/lib/communications";
import type { EmailTemplate, MergeContext } from "@/lib/communications/types";
import type { TeamMember } from "@/features/team/types";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TemplatePreview: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { organizationId, securityLevel, user, isLoading: authLoading } = useAuth();
  const { members, fetchTeamMembers } = useTeamStore();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('sample');
  const [showContext, setShowContext] = useState(false);

  // Load team members
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Active team members
  const activeMembers = useMemo(() => 
    members.filter(m => m.is_active !== false),
    [members]
  );

  // Build context based on selection
  const context = useMemo((): MergeContext => {
    if (selectedMemberId === 'sample') {
      return getSampleContext();
    }
    
    const member = activeMembers.find(m => m.id === selectedMemberId);
    if (!member) return getSampleContext();

    return {
      ...getSampleContext(),
      recipient: {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email || 'no-email@example.com',
        hire_date: member.hire_date,
        position: member.kitchen_role || undefined,
        department: member.departments?.[0] || undefined,
      },
    };
  }, [selectedMemberId, activeMembers]);

  // Rendered preview
  const previewHtml = useMemo(() => {
    if (!template?.html_template) return '';
    try {
      return mergeTemplate(template.html_template, context, {
        syntax: 'guillemets',
        missingFieldBehavior: 'preserve',
      });
    } catch {
      return template.html_template;
    }
  }, [template?.html_template, context]);

  const previewSubject = useMemo(() => {
    if (!template?.subject_template) return '';
    try {
      return mergeTemplate(template.subject_template, context, {
        syntax: 'guillemets',
        missingFieldBehavior: 'preserve',
      });
    } catch {
      return template.subject_template;
    }
  }, [template?.subject_template, context]);

  // ---------------------------------------------------------------------------
  // LOAD TEMPLATE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadTemplate = async () => {
      if (!id) return;

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

        setTemplate(data);
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
  }, [id, authLoading, navigate]);

  // ---------------------------------------------------------------------------
  // SEND TEST
  // ---------------------------------------------------------------------------
  const handleSendTest = async () => {
    if (!template || !user?.email || !organizationId) {
      toast.error('Unable to send test email');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendEmail({
        organizationId,
        templateId: template.id,
        recipientEmail: user.email,
        recipientName: user.user_metadata?.full_name || 'Test User',
        context,
        triggeredBy: 'manual_test',
      });

      if (result.success) {
        toast.success(`Test email sent to ${user.email}`);
      } else {
        toast.error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Send test error:', error);
      toast.error('Failed to send test email');
    } finally {
      setIsSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading preview..." />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Template not found</p>
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/Communications/TemplatePreview.tsx
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/modules/communications/templates/${id}`)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Preview: {template.name}</h1>
              <p className="text-gray-400 text-sm">
                See how your email will appear to recipients
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSendTest}
            disabled={isSending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-primary-500 hover:bg-primary-600 text-white"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Test to Me
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
              <span className="text-sm font-medium text-gray-300">About preview mode</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-3">
              <p className="text-sm text-gray-400">
                This preview shows how your email will render with sample data. Select a real team member from the dropdown to see their specific data merged into the template.
              </p>
              <p className="text-sm text-gray-400">
                Use <span className="text-primary-400">"Send Test to Me"</span> to receive a copy at your email address before sending to recipients.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-400">Preview as:</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            >
              <option value="sample">Jane Smith (Sample)</option>
              {activeMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowContext(!showContext)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Code className="w-4 h-4" />
            {showContext ? 'Hide' : 'Show'} Merge Data
          </button>
        </div>

        {/* Merge Context JSON */}
        {showContext && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-auto max-h-[300px]">
            <pre className="text-xs text-gray-300 font-mono">
              {JSON.stringify(context, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Email Preview */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        {/* Email Headers */}
        <div className="mb-4 space-y-2 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16">Subject:</span>
            <span className="text-white font-medium">{previewSubject}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16">To:</span>
            <span className="text-gray-300">{context.recipient.email}</span>
          </div>
        </div>

        {/* Email Body */}
        <div className="bg-white rounded-lg overflow-hidden">
          <iframe
            srcDoc={previewHtml}
            className="w-full border-0"
            style={{ minHeight: '600px' }}
            title="Email Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
