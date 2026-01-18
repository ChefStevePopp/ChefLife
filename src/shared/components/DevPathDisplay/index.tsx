import React, { useState } from "react";
import { Code, ChevronDown, ChevronUp, FileCode, Link2, Bug } from "lucide-react";

interface DevPathDisplayProps {
  currentFile: string;
  relatedFiles?: string[];
  componentState?: Record<string, unknown>;
  notes?: string;
}

/**
 * DevPathDisplay - Development diagnostic component
 * Shows current file path, related files, and component state for debugging.
 * Only visible in development mode.
 */
export const DevPathDisplay: React.FC<DevPathDisplayProps> = ({
  currentFile,
  relatedFiles = [],
  componentState,
  notes,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-dashed border-cyan-500/30 bg-cyan-950/20 text-xs font-mono">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-cyan-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-400 font-semibold">DEV</span>
          <span className="text-cyan-300/70">{currentFile.split("/").pop()}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-cyan-500/20">
          {/* Current file */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
              <FileCode className="w-3 h-3" />
              <span className="font-semibold">Current File</span>
            </div>
            <code className="text-cyan-200/80 break-all">{currentFile}</code>
          </div>

          {/* Related files */}
          {relatedFiles.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
                <Link2 className="w-3 h-3" />
                <span className="font-semibold">Related Files</span>
              </div>
              <ul className="space-y-0.5">
                {relatedFiles.map((file, idx) => (
                  <li key={idx} className="text-cyan-200/60">
                    • {file}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Component state */}
          {componentState && Object.keys(componentState).length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
                <Code className="w-3 h-3" />
                <span className="font-semibold">State</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                {Object.entries(componentState).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className="text-cyan-300/50">{key}:</span>
                    <span className="text-emerald-400">
                      {typeof value === "boolean"
                        ? value
                          ? "✓"
                          : "✗"
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div className="pt-2 border-t border-cyan-500/20">
              <p className="text-cyan-200/50 italic">{notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DevPathDisplay;
