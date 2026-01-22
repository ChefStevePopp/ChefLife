/**
 * =============================================================================
 * IMAGE UTILITIES
 * =============================================================================
 * Client-side image compression and WebP conversion.
 * Reduces storage costs and bandwidth while maintaining quality.
 * 
 * WebP delivers 25-35% smaller files than JPEG at equivalent visual quality.
 * =============================================================================
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg';
}

export interface CompressionResult {
  blob: Blob;
  filename: string;
  originalSize: number;
  compressedSize: number;
  savings: number; // percentage
  dimensions: { width: number; height: number };
}

const DEFAULT_OPTIONS: Required<ImageCompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.82,
  format: 'webp',
};

/**
 * Compress and convert image to WebP (or JPEG fallback)
 * Returns blob ready for Supabase upload with compression stats
 */
export const compressImage = async (
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressionResult> => {
  const { maxWidth, maxHeight, quality, format } = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(img.src); // Clean up
      
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // Maintain aspect ratio within bounds
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // White background for recipe photos (no transparency needed)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
      const extension = format === 'webp' ? '.webp' : '.jpg';
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          // Generate filename: sanitized original name + new extension
          const baseName = file.name
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[^a-zA-Z0-9-_]/g, '_') // Sanitize
            .substring(0, 50); // Limit length
          const filename = `${baseName}${extension}`;
          
          const originalSize = file.size;
          const compressedSize = blob.size;
          const savings = Math.round((1 - compressedSize / originalSize) * 100);
          
          resolve({
            blob,
            filename,
            originalSize,
            compressedSize,
            savings,
            dimensions: { width, height },
          });
        },
        mimeType,
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compress image captured from camera/canvas
 */
export const compressCanvasCapture = async (
  canvas: HTMLCanvasElement,
  options: ImageCompressionOptions = {}
): Promise<CompressionResult> => {
  const { quality, format } = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
    const extension = format === 'webp' ? '.webp' : '.jpg';
    
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }
        
        const timestamp = Date.now();
        const filename = `capture_${timestamp}${extension}`;
        
        resolve({
          blob,
          filename,
          originalSize: blob.size, // No original for canvas capture
          compressedSize: blob.size,
          savings: 0,
          dimensions: { width: canvas.width, height: canvas.height },
        });
      },
      mimeType,
      quality
    );
  });
};

/**
 * Preset configurations for different use cases
 */
export const IMAGE_PRESETS = {
  // Recipe photos - hero shots, need to look good
  recipePrimary: { 
    maxWidth: 1920, 
    maxHeight: 1280, 
    quality: 0.85, 
    format: 'webp' as const 
  },
  // Recipe gallery - slightly smaller
  recipeGallery: { 
    maxWidth: 1280, 
    maxHeight: 960, 
    quality: 0.80, 
    format: 'webp' as const 
  },
  // Ingredient reference photos - utilitarian
  ingredientPhoto: { 
    maxWidth: 800, 
    maxHeight: 800, 
    quality: 0.78, 
    format: 'webp' as const 
  },
  // Storage location photos
  storagePhoto: { 
    maxWidth: 1024, 
    maxHeight: 768, 
    quality: 0.78, 
    format: 'webp' as const 
  },
  // Invoice scans - need legibility
  invoiceScan: { 
    maxWidth: 2048, 
    maxHeight: 2048, 
    quality: 0.88, 
    format: 'webp' as const 
  },
} as const;

/**
 * Get human-readable file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Get compression summary for logging/toast
 */
export const getCompressionSummary = (result: CompressionResult): string => {
  const { originalSize, compressedSize, savings, dimensions } = result;
  return `${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${savings}% saved, ${dimensions.width}×${dimensions.height})`;
};

/**
 * Validate file is an acceptable image type
 */
export const isImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
  return validTypes.includes(file.type) || file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/) !== null;
};

/**
 * Get image dimensions without fully loading
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Media limits per entity type
 */
export const MEDIA_LIMITS = {
  recipe: {
    maxImages: 8,      // Primary + 7 gallery
    maxVideos: 2,      // YouTube embeds only (no storage)
    maxFileSizeMB: 20, // Before compression
  },
  ingredient: {
    maxImages: 1,
    maxVideos: 0,
    maxFileSizeMB: 10,
  },
  storage: {
    maxImages: 2, // Primary + secondary location
    maxVideos: 0,
    maxFileSizeMB: 10,
  },
} as const;
