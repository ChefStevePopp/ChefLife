import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Upload,
  Image,
  Trash2,
  Check,
  AlertCircle,
  FileImage,
} from "lucide-react";

// =============================================================================
// IMAGE UPLOAD MODAL - Universal Component (L5 Design)
// =============================================================================
// ChefLife's universal image upload component. Use this for ALL image uploads:
// - Vendor logos
// - Team member avatars  
// - Recipe photos
// - Ingredient images
// - Organization logos
// - Any other image upload need
//
// L5 DESIGN COMPLIANCE:
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ HEADER                                                                  │
// │ ┌──────┐                                                                │
// │ │ icon │  Title                                              [X]       │
// │ │ box  │  Subtitle                                                     │
// │ └──────┘                                                                │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ BODY                                                                    │
// │                                                                         │
// │ ┌─────────────────────────────────────────────────────────────────────┐ │
// │ │                         DROP ZONE                                   │ │
// │ │                                                                     │ │
// │ │                    ┌──────────────┐                                │ │
// │ │                    │              │                                │ │
// │ │                    │   PREVIEW    │  ← Hero element               │ │
// │ │                    │              │                                │ │
// │ │                    └──────────────┘                                │ │
// │ │                                                                     │ │
// │ │              Drag & drop an image here                             │ │
// │ │                         or                                         │ │
// │ │                  [ Browse files ]                                  │ │
// │ │                                                                     │ │
// │ │            Max size: 2MB • PNG, JPG, GIF, WebP                     │ │
// │ │               Square images work best                              │ │
// │ │                                                                     │ │
// │ └─────────────────────────────────────────────────────────────────────┘ │
// │                                                                         │
// │ ┌─────────────────────────────────────────────────────────────────────┐ │
// │ │ ✓ New image selected                              [Clear]          │ │
// │ └─────────────────────────────────────────────────────────────────────┘ │
// │                                                                         │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ FOOTER                                                                  │
// │ [Remove image]                              [Cancel]  [Upload]         │
// └─────────────────────────────────────────────────────────────────────────┘
//
// TOUCH TARGETS: All interactive elements ≥44px
// VISUAL HIERARCHY: Preview (hero) → Instructions (secondary) → Hints (tertiary)
// STATE FEEDBACK: Drag over, uploading, error, success
// ACCESSIBILITY: Keyboard nav, focus rings, screen reader labels
// =============================================================================

export interface ImageUploadModalProps {
  /** Modal open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Upload handler - receives File, returns URL of uploaded image */
  onUpload: (file: File) => Promise<string>;
  /** Optional remove handler - if provided, shows "Remove image" button */
  onRemove?: () => Promise<void>;
  /** Current image URL (shows in preview) */
  currentImageUrl?: string;
  /** Modal title (default: "Upload Image") */
  title?: string;
  /** Modal subtitle (e.g., entity name) */
  subtitle?: string;
  /** Max file size in MB (default: 2) */
  maxSizeMB?: number;
  /** Aspect ratio hint shown to user (e.g., "Square works best") */
  aspectHint?: string;
  /** Text shown in empty placeholder */
  placeholderText?: string;
  /** Custom icon for empty placeholder */
  placeholderIcon?: React.ReactNode;
  /** Accepted file types (default: "image/*") */
  accept?: string;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  onRemove,
  currentImageUrl,
  title = "Upload Image",
  subtitle,
  maxSizeMB = 2,
  aspectHint,
  placeholderText = "No image",
  placeholderIcon,
  accept = "image/*",
}) => {
  // ===========================================================================
  // STATE
  // ===========================================================================
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset on open
      setPreviewUrl(null);
      setSelectedFile(null);
      setError(null);
      setIsDragOver(false);
      // Focus the browse button after animation
      setTimeout(() => initialFocusRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard handler (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  const handleClose = useCallback(() => {
    if (isUploading || isRemoving) return; // Don't close during operations
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setIsDragOver(false);
    onClose();
  }, [onClose, isUploading, isRemoving]);

  // Validate and preview file
  const processFile = useCallback((file: File) => {
    setError(null);

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, GIF, WebP)");
      return;
    }

    // Validate size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`Image must be less than ${maxSizeMB}MB (yours is ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setSelectedFile(file);
    };
    reader.onerror = () => {
      setError("Failed to read file. Please try again.");
    };
    reader.readAsDataURL(file);
  }, [maxSizeMB]);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  // Upload the selected file
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile);
      handleClose();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Remove existing image
  const handleRemove = async () => {
    if (!onRemove) return;

    setIsRemoving(true);
    setError(null);

    try {
      await onRemove();
      handleClose();
    } catch (err) {
      console.error("Remove error:", err);
      setError(err instanceof Error ? err.message : "Failed to remove image. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  // Clear selected file (go back to current/empty state)
  const clearSelection = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
  };

  // Click backdrop to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  if (!isOpen) return null;

  const displayUrl = previewUrl || currentImageUrl;
  const hasNewSelection = !!previewUrl;
  const canUpload = !!selectedFile && !isUploading;
  const canRemove = !!currentImageUrl && !!onRemove && !hasNewSelection;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-upload-title"
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================
         * HEADER - L5 Pattern with icon box
         * =================================================================== */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <FileImage className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 id="image-upload-title" className="text-lg font-semibold text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading || isRemoving}
            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ===================================================================
         * BODY
         * =================================================================== */}
        <div className="p-5 space-y-4">
          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 ${
              isDragOver
                ? "border-primary-500 bg-primary-500/10 scale-[1.02]"
                : error
                  ? "border-rose-500/50 bg-rose-500/5"
                  : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/30"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* ---------------------------------------------------------------
             * HERO: Preview Area
             * --------------------------------------------------------------- */}
            <div className="flex justify-center mb-5">
              <div className={`w-36 h-36 rounded-xl overflow-hidden ring-2 flex items-center justify-center transition-all duration-200 ${
                isDragOver 
                  ? "ring-primary-500 bg-primary-500/20" 
                  : hasNewSelection
                    ? "ring-primary-500/50 bg-gray-800"
                    : "ring-gray-700 bg-gray-800/50"
              }`}>
                {displayUrl ? (
                  <img
                    src={displayUrl}
                    alt="Preview"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-500">
                    {placeholderIcon || <Image className="w-12 h-12 mb-2 opacity-50" />}
                    <span className="text-sm">{placeholderText}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------------------
             * SECONDARY: Instructions
             * --------------------------------------------------------------- */}
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-300">
                {isDragOver ? (
                  <span className="text-primary-400 font-medium">Drop image here</span>
                ) : (
                  "Drag & drop an image here"
                )}
              </p>
              
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-gray-700" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">or</span>
                <div className="h-px w-12 bg-gray-700" />
              </div>
              
              <button
                ref={initialFocusRef}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="btn-ghost min-h-[44px] px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Browse files
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
                aria-label="Choose image file"
              />
            </div>

            {/* ---------------------------------------------------------------
             * TERTIARY: Hints
             * --------------------------------------------------------------- */}
            <div className="mt-5 pt-4 border-t border-gray-700/50 text-center">
              <p className="text-xs text-gray-500">
                Max size: {maxSizeMB}MB • PNG, JPG, GIF, WebP
              </p>
              {aspectHint && (
                <p className="text-xs text-gray-500 mt-1">{aspectHint}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Upload Error</p>
                <p className="text-rose-400/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* New Selection Indicator */}
          {hasNewSelection && !error && (
            <div className="flex items-center justify-between p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-primary-400">
                <Check className="w-5 h-5" />
                <div>
                  <p className="font-medium">New image selected</p>
                  <p className="text-xs text-primary-400/70 mt-0.5">
                    {selectedFile?.name} ({((selectedFile?.size || 0) / 1024).toFixed(0)} KB)
                  </p>
                </div>
              </div>
              <button
                onClick={clearSelection}
                className="min-h-[36px] px-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* ===================================================================
         * FOOTER - L5 Pattern with actions
         * =================================================================== */}
        <div className="flex items-center justify-between p-5 border-t border-gray-700 bg-gray-800/50">
          {/* Remove button (only if there's a current image and no new selection) */}
          <div>
            {canRemove && (
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="min-h-[44px] px-4 text-sm text-rose-400 hover:text-rose-300 flex items-center gap-2 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRemoving ? (
                  <div className="w-4 h-4 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove image
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isUploading || isRemoving}
              className="btn-ghost min-h-[44px] px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className="btn-primary min-h-[44px] px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;
