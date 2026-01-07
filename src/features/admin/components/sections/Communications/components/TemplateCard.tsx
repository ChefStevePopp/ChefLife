/**
 * TemplateCard - L5 Card Design for Email Templates
 * 
 * Phase 1.2: Card design with status pills, metadata, actions
 */

import React, { useState } from "react";
import {
  Mail,
  Clock,
  MoreVertical,
  Pencil,
  Eye,
  Copy,
  Archive,
  Trash2,
  Calendar,
  TrendingUp,
  Users,
  User,
  Zap,
  Send,
} from "lucide-react";
import type { EmailTemplate } from "@/lib/communications/types";
import { formatDateForDisplay } from "@/utils/dateUtils";

// =============================================================================
// TYPES
// =============================================================================

interface TemplateCardProps {
  template: EmailTemplate;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

// =============================================================================
// STATUS & CATEGORY STYLES
// =============================================================================

const statusConfig = {
  active: {
    label: 'Active',
    classes: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  draft: {
    label: 'Draft',
    classes: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    dot: 'bg-gray-400',
  },
  archived: {
    label: 'Archived',
    classes: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    dot: 'bg-rose-400',
  },
};

const categoryConfig: Record<string, { label: string; classes: string; icon: typeof TrendingUp }> = {
  performance: {
    label: 'Performance',
    classes: 'bg-amber-500/20 text-amber-400',
    icon: TrendingUp,
  },
  hr: {
    label: 'HR',
    classes: 'bg-purple-500/20 text-purple-400',
    icon: Users,
  },
  operations: {
    label: 'Operations',
    classes: 'bg-sky-500/20 text-sky-400',
    icon: Zap,
  },
  general: {
    label: 'General',
    classes: 'bg-gray-500/20 text-gray-400',
    icon: Mail,
  },
};

const recipientTypeLabels: Record<string, string> = {
  individual: 'Individual',
  managers: 'Managers',
  all_team: 'All Team',
  custom: 'Custom',
};

const sendModeLabels: Record<string, { label: string; icon: typeof Send }> = {
  manual: { label: 'Manual', icon: Send },
  scheduled: { label: 'Scheduled', icon: Clock },
  triggered: { label: 'Triggered', icon: Zap },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onPreview,
  onDuplicate,
  onArchive,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Determine status
  const getStatus = () => {
    if (template.is_archived) return 'archived';
    if (template.is_active) return 'active';
    return 'draft';
  };

  const status = getStatus();
  const statusStyle = statusConfig[status];
  const category = categoryConfig[template.category || 'general'];
  const CategoryIcon = category.icon;
  const sendMode = sendModeLabels[template.send_mode || 'manual'];
  const SendModeIcon = sendMode.icon;

  // Format dates
  const updatedDisplay = formatDateForDisplay(template.updated_at.split('T')[0]);

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:border-gray-600 transition-colors group">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Mail className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-white truncate">{template.name}</h3>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.classes}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                {statusStyle.label}
              </span>
            </div>
            {template.description && (
              <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{template.description}</p>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-8 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]">
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => { setShowMenu(false); onPreview(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => { setShowMenu(false); onDuplicate(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <hr className="my-1 border-gray-700" />
                {!template.is_archived && (
                  <button
                    onClick={() => { setShowMenu(false); onArchive(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-gray-700 transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                )}
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-gray-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metadata Row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        {/* Category Badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${category.classes}`}>
          <CategoryIcon className="w-3 h-3" />
          {category.label}
        </span>

        {/* Send Mode */}
        <span className="inline-flex items-center gap-1">
          <SendModeIcon className="w-3 h-3" />
          {sendMode.label}
        </span>

        {/* Recipient Type */}
        {template.recipient_type && (
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {recipientTypeLabels[template.recipient_type] || template.recipient_type}
          </span>
        )}

        {/* Updated */}
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Updated {updatedDisplay}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onPreview}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-600 transition-colors"
        >
          Preview
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30 transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default TemplateCard;
