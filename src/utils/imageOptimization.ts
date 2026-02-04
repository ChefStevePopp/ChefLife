/**
 * =============================================================================
 * IMAGE OPTIMIZATION UTILITY
 * =============================================================================
 * Compresses and converts images to WebP before upload.
 * Use this for ALL image uploads in ChefLife — vendor logos, team photos,
 * recipe images, policy category covers, etc.
 *
 * Usage:
 *   import { optimizeImage } from '@/utils/imageOptimization';
 *   const optimized = await optimizeImage(rawFile, { maxSize: 256, quality: 0.8 });
 *   // optimized is a File object: ~15-30KB WebP, ready for Supabase upload
 * =============================================================================
 */

export interface OptimizeOptions {
  /** Max width OR height in px (aspect ratio preserved). Default: 512 */
  maxSize?: number;
  /** WebP quality 0–1. Default: 0.82 */
  quality?: number;
  /** Output filename (without extension). Default: original name */
  outputName?: string;
}

/**
 * Load a File or Blob into an HTMLImageElement.
 */
const loadImage = (file: File | Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });

/**
 * Convert a canvas to a WebP File.
 */
const canvasToFile = (
  canvas: HTMLCanvasElement,
  filename: string,
  quality: number
): Promise<File> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas conversion failed"));
          return;
        }
        resolve(new File([blob], filename, { type: "image/webp" }));
      },
      "image/webp",
      quality
    );
  });

/**
 * Compress and convert an image file to WebP.
 *
 * - Resizes to fit within maxSize (preserves aspect ratio)
 * - Converts to WebP at the given quality
 * - Returns a new File object ready for upload
 *
 * Typical output sizes:
 *   256px @ 0.82 quality → ~10-25KB (logos, icons, category covers)
 *   512px @ 0.82 quality → ~25-60KB (cards, thumbnails)
 *   1024px @ 0.80 quality → ~60-150KB (hero images)
 */
export const optimizeImage = async (
  file: File,
  options: OptimizeOptions = {}
): Promise<File> => {
  const { maxSize = 512, quality = 0.82, outputName } = options;

  // Load into an image element
  const img = await loadImage(file);

  // Calculate scaled dimensions (fit within maxSize box)
  let { width, height } = img;
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Draw to canvas at target size
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  // Convert to WebP File
  const baseName = outputName || file.name.replace(/\.[^.]+$/, "");
  return canvasToFile(canvas, `${baseName}.webp`, quality);
};

export default optimizeImage;
