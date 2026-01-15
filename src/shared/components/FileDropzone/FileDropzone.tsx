import React, { useRef, useState, useCallback } from "react";
import { Upload, FileText, FileSpreadsheet, File, X } from "lucide-react";

// =============================================================================
// FILE DROPZONE - L6 Design
// =============================================================================
// Reusable drag-and-drop file upload component with visual feedback
// Supports: PDF, CSV, images, and generic files
// =============================================================================

export interface FileDropzoneProps {
  /** Accepted file types (e.g., ".pdf", ".csv,.xlsx", "image/*") */
  accept: string;
  /** Callback when file is selected/dropped */
  onFile: (file: File) => void;
  /** Whether upload is in progress */
  isLoading?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Primary label (when no file selected) */
  label?: string;
  /** Secondary helper text */
  hint?: string;
  /** Label when a file has already been processed */
  reuploadLabel?: string;
  /** Whether a file has been processed (compact mode) */
  hasResult?: boolean;
  /** Color theme */
  variant?: "primary" | "green" | "amber";
  /** Allow multiple files */
  multiple?: boolean;
  /** Callback for multiple files */
  onFiles?: (files: File[]) => void;
  /** Unique ID for the input (for label association) */
  id?: string;
  /** Disabled state */
  disabled?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept,
  onFile,
  isLoading = false,
  loadingMessage = "Processing...",
  label,
  hint,
  reuploadLabel,
  hasResult = false,
  variant = "primary",
  multiple = false,
  onFiles,
  id,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id || `dropzone-${Math.random().toString(36).slice(2, 9)}`;

  // Determine file type icon based on accept prop
  const getIcon = () => {
    if (accept.includes("pdf")) return FileText;
    if (accept.includes("csv") || accept.includes("xlsx") || accept.includes("spreadsheet")) return FileSpreadsheet;
    return Upload;
  };
  const Icon = getIcon();

  // Color variants - using L5 button classes from index.css
  const colors = {
    primary: {
      border: "border-primary-500",
      bg: "bg-primary-500/10",
      text: "text-primary-400",
      icon: "text-primary-400",
      spinner: "border-primary-400/30 border-t-primary-400",
      button: "btn-ghost-primary",  // L5 ghost button
    },
    green: {
      border: "border-green-500",
      bg: "bg-green-500/10",
      text: "text-green-400",
      icon: "text-green-400",
      spinner: "border-green-400/30 border-t-green-400",
      button: "btn-ghost-green",  // L5 ghost button
    },
    amber: {
      border: "border-amber-500",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      icon: "text-amber-400",
      spinner: "border-amber-400/30 border-t-amber-400",
      button: "btn-ghost-amber",  // L5 ghost button
    },
  };
  const c = colors[variant];

  // Handle file selection
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (multiple && onFiles) {
      onFiles(Array.from(files));
    } else {
      onFile(files[0]);
    }
  }, [multiple, onFile, onFiles]);

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragOver(true);
    }
  }, [disabled, isLoading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the actual dropzone (not entering a child)
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled || isLoading) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [disabled, isLoading, handleFiles]);

  // Click to open file dialog
  const handleClick = useCallback(() => {
    if (!disabled && !isLoading) {
      inputRef.current?.click();
    }
  }, [disabled, isLoading]);

  // Input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    e.target.value = "";
  }, [handleFiles]);

  // Keyboard accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  // Compact mode (after result)
  if (hasResult && !isLoading) {
    return (
      <div
        className={`
          border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200
          ${isDragOver ? `${c.border} ${c.bg}` : "border-gray-700/50"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-600"}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={reuploadLabel || "Upload new file"}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          id={inputId}
          disabled={disabled}
        />
        <div className="flex items-center justify-center gap-2">
          <Upload className={`w-4 h-4 ${isDragOver ? c.icon : "text-gray-500"}`} />
          <span className={`text-sm ${isDragOver ? c.text : "text-gray-500"}`}>
            {isDragOver ? "Drop file here" : reuploadLabel || "Upload new file"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
        ${isDragOver ? `${c.border} ${c.bg} scale-[1.01]` : "border-gray-700"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-600"}
        ${isLoading ? "pointer-events-none" : ""}
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled || isLoading ? -1 : 0}
      role="button"
      aria-label={label || "Upload file"}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        id={inputId}
        disabled={disabled || isLoading}
      />

      {isLoading ? (
        <div className="py-4">
          <div className={`w-10 h-10 border-3 ${c.spinner} rounded-full animate-spin mx-auto mb-3`} />
          <p className="text-gray-400">{loadingMessage}</p>
        </div>
      ) : (
        <>
          {/* Icon with drag feedback */}
          <div className={`
            w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center transition-all duration-200
            ${isDragOver ? c.bg : "bg-gray-800/50"}
          `}>
            <Icon className={`w-7 h-7 transition-colors ${isDragOver ? c.icon : "text-gray-500"}`} />
          </div>
          
          {/* Primary label */}
          <p className={`mb-1 font-medium transition-colors ${isDragOver ? c.text : "text-gray-300"}`}>
            {isDragOver ? "Drop file here" : label || "Drop file here or click to browse"}
          </p>
          
          {/* Hint text */}
          {hint && !isDragOver && (
            <p className="text-sm text-gray-500 mb-4">{hint}</p>
          )}
          
          {/* Visual button (not actually clickable - whole zone is) */}
          {!isDragOver && (
            <div className={`inline-flex items-center gap-2 px-5 min-h-[44px] rounded-xl font-medium text-sm ${c.button}`}>
              <Upload className="w-4 h-4" />
              Select File
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FileDropzone;
