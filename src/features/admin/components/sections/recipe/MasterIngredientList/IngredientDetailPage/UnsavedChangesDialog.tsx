import React from "react";
import { AlertTriangle, Save, Trash2, X } from "lucide-react";

// =============================================================================
// UNSAVED CHANGES DIALOG
// =============================================================================
// Shown when user tries to navigate away with unsaved changes.
// Options: Discard, Cancel, Save & Continue
// =============================================================================

interface UnsavedChangesDialogProps {
  onDiscard: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  onDiscard,
  onCancel,
  onSave,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Unsaved Changes</h2>
              <p className="text-sm text-gray-400">
                You have unsaved changes that will be lost.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300">
            Do you want to save your changes before leaving this page?
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDiscard}
            className="flex-1 btn-ghost text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Discard Changes
          </button>
          <button onClick={onCancel} className="flex-1 btn-ghost">
            <X className="w-4 h-4 mr-2" />
            Stay on Page
          </button>
          <button onClick={onSave} className="flex-1 btn-primary">
            <Save className="w-4 h-4 mr-2" />
            Save & Leave
          </button>
        </div>
      </div>
    </div>
  );
};
