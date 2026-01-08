/**
 * InspectionModal - Add/Edit Health Inspection
 * 
 * L5 Design:
 * - Clean form layout with sections
 * - Inline action item management
 * - Proper validation feedback
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import type { 
  HealthInspection, 
  InspectionFormData,
  InspectionResult,
  ActionItemPriority 
} from '@/types/healthInspection';
import { INSPECTION_RESULTS, ACTION_ITEM_PRIORITIES } from '@/types/healthInspection';

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InspectionFormData) => Promise<boolean>;
  inspection?: HealthInspection | null;
  isSaving?: boolean;
}

interface ActionItemDraft {
  id: string;
  description: string;
  priority: ActionItemPriority;
  due_date?: string;
  completed: boolean;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  inspection,
  isSaving = false,
}) => {
  const isEditing = !!inspection;
  
  // Form state
  const [formData, setFormData] = useState<Partial<InspectionFormData>>({
    visit_date: new Date().toISOString().split('T')[0],
    result: 'passed',
  });
  const [actionItems, setActionItems] = useState<ActionItemDraft[]>([]);
  const [newActionItem, setNewActionItem] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when modal opens or inspection changes
  useEffect(() => {
    if (isOpen) {
      if (inspection) {
        setFormData({
          visit_date: inspection.visit_date,
          start_time: inspection.start_time,
          end_time: inspection.end_time,
          inspector_name: inspection.inspector_name,
          inspector_title: inspection.inspector_title,
          inspector_organization: inspection.inspector_organization,
          inspector_phone: inspection.inspector_phone,
          inspector_email: inspection.inspector_email,
          result: inspection.result,
          score: inspection.score,
          grade: inspection.grade,
          notes: inspection.notes,
          next_inspection_due: inspection.next_inspection_due,
        });
        setActionItems(
          (inspection.action_items || []).map(item => ({
            id: item.id,
            description: item.description,
            priority: item.priority,
            due_date: item.due_date,
            completed: item.completed,
          }))
        );
      } else {
        setFormData({
          visit_date: new Date().toISOString().split('T')[0],
          result: 'passed',
        });
        setActionItems([]);
      }
      setNewActionItem('');
      setErrors({});
    }
  }, [isOpen, inspection]);

  const updateField = (field: keyof InspectionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addActionItem = () => {
    if (!newActionItem.trim()) return;
    
    setActionItems(prev => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        description: newActionItem.trim(),
        priority: 'medium',
        completed: false,
      }
    ]);
    setNewActionItem('');
  };

  const removeActionItem = (id: string) => {
    setActionItems(prev => prev.filter(item => item.id !== id));
  };

  const updateActionItem = (id: string, field: keyof ActionItemDraft, value: any) => {
    setActionItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.visit_date) {
      newErrors.visit_date = 'Inspection date is required';
    }
    if (!formData.result) {
      newErrors.result = 'Result is required';
    }
    if (formData.score !== undefined && (formData.score < 0 || formData.score > 100)) {
      newErrors.score = 'Score must be between 0 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const data: InspectionFormData = {
      visit_date: formData.visit_date!,
      start_time: formData.start_time,
      end_time: formData.end_time,
      inspector_name: formData.inspector_name,
      inspector_title: formData.inspector_title,
      inspector_organization: formData.inspector_organization,
      inspector_phone: formData.inspector_phone,
      inspector_email: formData.inspector_email,
      result: formData.result as InspectionResult,
      score: formData.score,
      grade: formData.grade,
      notes: formData.notes,
      next_inspection_due: formData.next_inspection_due,
      action_items: actionItems.map(item => ({
        description: item.description,
        priority: item.priority,
        due_date: item.due_date,
        completed: item.completed,
        sort_order: 0,
        resolution_notes: undefined,
      })),
    };
    
    const success = await onSave(data);
    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1a1f2b] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Inspection' : 'Add Inspection'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date & Time */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Date & Time</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Inspection Date *
                </label>
                <input
                  type="date"
                  value={formData.visit_date || ''}
                  onChange={(e) => updateField('visit_date', e.target.value)}
                  className={`input w-full ${errors.visit_date ? 'border-red-500' : ''}`}
                />
                {errors.visit_date && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.visit_date}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.start_time || ''}
                  onChange={(e) => updateField('start_time', e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time || ''}
                  onChange={(e) => updateField('end_time', e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Inspector Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Inspector Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Inspector Name
                </label>
                <input
                  type="text"
                  value={formData.inspector_name || ''}
                  onChange={(e) => updateField('inspector_name', e.target.value)}
                  className="input w-full"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Title / Position
                </label>
                <input
                  type="text"
                  value={formData.inspector_title || ''}
                  onChange={(e) => updateField('inspector_title', e.target.value)}
                  className="input w-full"
                  placeholder="Public Health Inspector"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Organization / Department
                </label>
                <input
                  type="text"
                  value={formData.inspector_organization || ''}
                  onChange={(e) => updateField('inspector_organization', e.target.value)}
                  className="input w-full"
                  placeholder="Region of Niagara Public Health"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Results</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Result *
                </label>
                <select
                  value={formData.result || 'passed'}
                  onChange={(e) => updateField('result', e.target.value)}
                  className={`input w-full ${errors.result ? 'border-red-500' : ''}`}
                >
                  {INSPECTION_RESULTS.map(result => (
                    <option key={result.value} value={result.value}>
                      {result.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Score (%)
                </label>
                <input
                  type="number"
                  value={formData.score ?? ''}
                  onChange={(e) => updateField('score', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`input w-full ${errors.score ? 'border-red-500' : ''}`}
                  placeholder="96"
                  min="0"
                  max="100"
                />
                {errors.score && (
                  <p className="text-xs text-red-400 mt-1">{errors.score}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Grade
                </label>
                <input
                  type="text"
                  value={formData.grade || ''}
                  onChange={(e) => updateField('grade', e.target.value)}
                  className="input w-full"
                  placeholder="A"
                />
              </div>
            </div>
          </div>

          {/* Action Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Action Items</span>
                {actionItems.length > 0 && (
                  <span className="text-xs text-gray-500">({actionItems.length})</span>
                )}
              </div>
            </div>
            
            {/* Existing action items */}
            {actionItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {actionItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => updateActionItem(item.id, 'completed', e.target.checked)}
                      className="form-checkbox mt-1 rounded bg-gray-700 border-gray-600 text-lime-500"
                    />
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateActionItem(item.id, 'description', e.target.value)}
                        className={`w-full bg-transparent border-none text-sm p-0 focus:ring-0 ${
                          item.completed ? 'text-gray-500 line-through' : 'text-gray-300'
                        }`}
                      />
                      <div className="flex items-center gap-3 mt-2">
                        <select
                          value={item.priority}
                          onChange={(e) => updateActionItem(item.id, 'priority', e.target.value)}
                          className="text-xs bg-gray-700 border-gray-600 rounded px-2 py-1"
                        >
                          {ACTION_ITEM_PRIORITIES.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={item.due_date || ''}
                          onChange={(e) => updateActionItem(item.id, 'due_date', e.target.value)}
                          className="text-xs bg-gray-700 border-gray-600 rounded px-2 py-1"
                          placeholder="Due date"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeActionItem(item.id)}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new action item */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newActionItem}
                onChange={(e) => setNewActionItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addActionItem())}
                className="input flex-1"
                placeholder="Add an action item..."
              />
              <button
                type="button"
                onClick={addActionItem}
                disabled={!newActionItem.trim()}
                className="btn-ghost px-3"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              className="input w-full h-24 resize-none"
              placeholder="Any additional notes or observations..."
            />
          </div>

          {/* Next Inspection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Next Inspection Due
            </label>
            <input
              type="date"
              value={formData.next_inspection_due || ''}
              onChange={(e) => updateField('next_inspection_due', e.target.value)}
              className="input w-full max-w-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              When is your next scheduled inspection?
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/30">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Inspection'}
          </button>
        </div>
      </div>
    </div>
  );
};
