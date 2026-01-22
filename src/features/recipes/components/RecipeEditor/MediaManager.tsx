import React, { useState, useRef } from "react";
import {
  Image,
  Video,
  Upload,
  X,
  Camera,
  Play,
  Plus,
  Trash2,
  Info,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import {
  compressImage,
  IMAGE_PRESETS,
  formatFileSize,
  getCompressionSummary,
  isImageFile,
} from "@/lib/image-utils";
import type { Recipe, RecipeMedia } from "../../types/recipe";
import toast from "react-hot-toast";

/**
 * =============================================================================
 * MEDIA MANAGER - Recipe Photos & Videos (L5)
 * =============================================================================
 * Manages recipe media with:
 * - Primary image designation (hero shot)
 * - Gallery for additional images
 * - YouTube video embeds
 * - Client-side WebP compression before upload
 * - Storage limits to control costs
 * =============================================================================
 */

// Storage limits
const MAX_RECIPE_IMAGES = 8; // Primary + 7 gallery
const MAX_RECIPE_VIDEOS = 2; // YouTube embeds only (no storage cost)

interface MediaManagerProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const MediaManager: React.FC<MediaManagerProps> = ({
  recipe,
  onChange,
}) => {
  const { showDiagnostics } = useDiagnostics();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<RecipeMedia | null>(null);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Media counts and limits
  const imageCount = recipe.media.filter((m) => m.type === "image").length;
  const videoCount = recipe.media.filter((m) => m.type === "video").length;
  const canAddImage = imageCount < MAX_RECIPE_IMAGES;
  const canAddVideo = videoCount < MAX_RECIPE_VIDEOS;

  const primaryMedia = recipe.media.find((m) => m.is_primary);
  const secondaryMedia = recipe.media.filter((m) => !m.is_primary);

  // -------------------------------------------------------------------------
  // FILE UPLOAD - With WebP Compression
  // -------------------------------------------------------------------------
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isImageFile(file)) {
      toast.error("Please select an image file");
      return;
    }

    // Check limits
    if (!canAddImage) {
      toast.error(`Maximum ${MAX_RECIPE_IMAGES} images allowed`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Compress and convert to WebP
      const isPrimary = recipe.media.length === 0;
      const preset = isPrimary
        ? IMAGE_PRESETS.recipePrimary
        : IMAGE_PRESETS.recipeGallery;

      setUploadProgress(30);
      const result = await compressImage(file, preset);

      // Log compression stats
      console.log(`[Media] ${getCompressionSummary(result)}`);

      setUploadProgress(50);

      // Upload to Supabase
      const timestamp = Date.now();
      const filePath = `${recipe.organization_id}/recipes/${recipe.id || "new"}/${timestamp}_${result.filename}`;

      const { error } = await supabase.storage
        .from("recipe-media")
        .upload(filePath, result.blob, {
          contentType: "image/webp",
        });

      if (error) throw error;

      setUploadProgress(80);

      const {
        data: { publicUrl },
      } = supabase.storage.from("recipe-media").getPublicUrl(filePath);

      const newMedia: RecipeMedia = {
        id: `media-${timestamp}`,
        type: "image",
        url: publicUrl,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        is_primary: isPrimary,
      };

      onChange({
        media: [...recipe.media, newMedia],
      });

      setUploadProgress(100);

      // Show success with compression savings
      if (result.savings > 0) {
        toast.success(
          `Photo added! Compressed ${result.savings}% (${formatFileSize(result.compressedSize)})`
        );
      } else {
        toast.success("Photo added!");
      }
    } catch (error) {
      console.error("Error uploading media:", error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // -------------------------------------------------------------------------
  // CAMERA CAPTURE - With WebP Compression
  // -------------------------------------------------------------------------
  const startCapture = async () => {
    if (!canAddImage) {
      toast.error(`Maximum ${MAX_RECIPE_IMAGES} images allowed`);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera");
    }
  };

  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;

    setIsUploading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      ctx.drawImage(videoRef.current, 0, 0);

      // Get blob from canvas
      const originalBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("No blob"))),
          "image/jpeg",
          0.95
        );
      });

      // Create a File from the blob for compression
      const file = new File([originalBlob], "camera_capture.jpg", {
        type: "image/jpeg",
      });

      // Compress to WebP
      const isPrimary = recipe.media.length === 0;
      const preset = isPrimary
        ? IMAGE_PRESETS.recipePrimary
        : IMAGE_PRESETS.recipeGallery;
      const result = await compressImage(file, preset);

      console.log(`[Media] Camera: ${getCompressionSummary(result)}`);

      // Upload
      const timestamp = Date.now();
      const filePath = `${recipe.organization_id}/recipes/${recipe.id || "new"}/${timestamp}_photo.webp`;

      const { error } = await supabase.storage
        .from("recipe-media")
        .upload(filePath, result.blob, {
          contentType: "image/webp",
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("recipe-media").getPublicUrl(filePath);

      const newMedia: RecipeMedia = {
        id: `media-${timestamp}`,
        type: "image",
        url: publicUrl,
        title: "Recipe Photo",
        is_primary: isPrimary,
      };

      onChange({
        media: [...recipe.media, newMedia],
      });

      stopCapture();
      toast.success(`Photo captured! (${formatFileSize(result.compressedSize)})`);
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast.error("Failed to capture photo");
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------------------------------------------------
  // VIDEO LINKS (YouTube only - no storage cost)
  // -------------------------------------------------------------------------
  const addVideoLink = () => {
    if (!canAddVideo) {
      toast.error(`Maximum ${MAX_RECIPE_VIDEOS} videos allowed`);
      return;
    }

    const url = prompt("Enter YouTube video URL:");
    if (!url) return;

    const videoId = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    )?.[1];

    if (!videoId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    const timestamp = Date.now();
    const newMedia: RecipeMedia = {
      id: `media-${timestamp}`,
      type: "video",
      url: `https://www.youtube.com/embed/${videoId}`,
      title: "Recipe Video",
      is_primary: recipe.media.length === 0,
    };

    onChange({
      media: [...recipe.media, newMedia],
    });

    toast.success("Video link added");
  };

  // -------------------------------------------------------------------------
  // MEDIA MANAGEMENT
  // -------------------------------------------------------------------------
  const deleteMedia = async (mediaId: string) => {
    try {
      const media = recipe.media.find((m) => m.id === mediaId);
      if (!media) return;

      // Delete from storage if it's our file
      if (media.url.includes("recipe-media") && media.type === "image") {
        // Extract path from URL
        const urlParts = media.url.split("/recipe-media/");
        if (urlParts[1]) {
          const filePath = decodeURIComponent(urlParts[1]);
          const { error } = await supabase.storage
            .from("recipe-media")
            .remove([filePath]);

          if (error) {
            console.error("Error deleting from storage:", error);
            // Continue anyway - remove from recipe
          }
        }
      }

      // If deleting primary, promote first secondary
      const updatedMedia = recipe.media.filter((m) => m.id !== mediaId);
      if (media.is_primary && updatedMedia.length > 0) {
        updatedMedia[0].is_primary = true;
      }

      onChange({ media: updatedMedia });
      toast.success("Media deleted");
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error("Failed to delete media");
    }
  };

  const setPrimaryMedia = (mediaId: string) => {
    onChange({
      media: recipe.media.map((m) => ({
        ...m,
        is_primary: m.id === mediaId,
      })),
    });
    toast.success("Primary image updated");
  };

  const updateMediaDetails = (
    mediaId: string,
    updates: Partial<RecipeMedia>
  ) => {
    onChange({
      media: recipe.media.map((m) =>
        m.id === mediaId ? { ...m, ...updates } : m
      ),
    });
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeEditor/MediaManager.tsx
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Image className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Recipe Media</h2>
          <p className="text-sm text-gray-400">
            Photos and videos for your recipe library
          </p>
        </div>
      </div>

      {/* Expandable Info Section */}
      <div
        className={`expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}
      >
        <button
          onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-sm font-medium text-white">
              About Recipe Media
            </span>
          </div>
          <ChevronUp
            className={`w-4 h-4 text-gray-500 transition-transform ${isInfoExpanded ? "" : "rotate-180"}`}
          />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2 space-y-3">
            <p className="text-sm text-gray-400">
              Add photos of your finished dish, plating examples, or technique
              demonstrations. The <span className="font-semibold">primary image</span> appears
              in recipe lists and cards.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <Image className="w-4 h-4 text-cyan-400/80 mb-2" />
                <span className="text-sm font-medium text-gray-300">Photos</span>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-compressed to WebP
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <Camera className="w-4 h-4 text-cyan-400/80 mb-2" />
                <span className="text-sm font-medium text-gray-300">Camera</span>
                <p className="text-xs text-gray-500 mt-1">
                  Capture directly from device
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <Video className="w-4 h-4 text-cyan-400/80 mb-2" />
                <span className="text-sm font-medium text-gray-300">Videos</span>
                <p className="text-xs text-gray-500 mt-1">
                  YouTube links only
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Limit: {MAX_RECIPE_IMAGES} images, {MAX_RECIPE_VIDEOS} videos per recipe
            </p>
          </div>
        </div>
      </div>

      {/* Primary Image Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-medium text-white">Primary Image</h3>
            <p className="text-xs text-gray-500">
              {imageCount}/{MAX_RECIPE_IMAGES} images used
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary text-sm py-2 px-3"
              disabled={isUploading || !canAddImage}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Upload
            </button>
            <button
              onClick={startCapture}
              className="btn-ghost text-sm py-2 px-3"
              disabled={isUploading || !canAddImage}
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Camera
            </button>
            <button
              onClick={addVideoLink}
              className="btn-ghost text-sm py-2 px-3"
              disabled={isUploading || !canAddVideo}
            >
              <Video className="w-4 h-4 mr-1.5" />
              Video
            </button>
          </div>
        </div>

        {/* Limit Warning */}
        {!canAddImage && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">
              Maximum {MAX_RECIPE_IMAGES} images reached. Delete one to add more.
            </p>
          </div>
        )}

        {/* Primary Image Display */}
        <div className="relative rounded-lg overflow-hidden bg-gray-800/50 border border-gray-700/50">
          {primaryMedia ? (
            <div className="relative group">
              {primaryMedia.type === "image" ? (
                <img
                  src={primaryMedia.url}
                  alt={primaryMedia.title || "Primary recipe image"}
                  className="w-full h-80 object-cover"
                />
              ) : (
                <div className="relative w-full h-80 bg-gray-900">
                  <iframe
                    src={primaryMedia.url}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Hover Controls */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={() => setSelectedMedia(primaryMedia)}
                  className="btn-ghost text-sm py-2 px-4"
                >
                  Edit Details
                </button>
                <button
                  onClick={() => deleteMedia(primaryMedia.id)}
                  className="btn-ghost text-sm py-2 px-4 text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-80 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                <Image className="w-8 h-8 text-cyan-400/50" />
              </div>
              <p className="text-gray-400 mb-4">No primary image set</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary text-sm"
                disabled={!canAddImage}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Primary Image
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="card p-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Processing & uploading...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Camera Capture */}
      {isCapturing && (
        <div className="card p-4">
          <div className="relative rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <button
                onClick={takePhoto}
                className="btn-primary"
                disabled={isUploading}
              >
                <Camera className="w-4 h-4 mr-1.5" />
                Capture
              </button>
              <button onClick={stopCapture} className="btn-ghost">
                <X className="w-4 h-4 mr-1.5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      {secondaryMedia.length > 0 && (
        <div className="card p-6">
          <h3 className="text-base font-medium text-white mb-4">
            Gallery ({secondaryMedia.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {secondaryMedia.map((media) => (
              <div
                key={media.id}
                className="group relative aspect-square rounded-lg overflow-hidden bg-gray-800/50 border border-gray-700/50"
              >
                {media.type === "image" ? (
                  <img
                    src={media.url}
                    alt={media.title || "Recipe media"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white/50" />
                  </div>
                )}

                {/* Hover Controls */}
                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <button
                    onClick={() => setPrimaryMedia(media.id)}
                    className="btn-primary text-xs py-1.5 px-3 w-full"
                  >
                    Set as Primary
                  </button>
                  <button
                    onClick={() => setSelectedMedia(media)}
                    className="btn-ghost text-xs py-1.5 px-3 w-full"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMedia(media.id)}
                    className="btn-ghost text-xs py-1.5 px-3 w-full text-rose-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Detail Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-800">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Media Details</h3>
              <button
                onClick={() => setSelectedMedia(null)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {/* Preview */}
              <div className="mb-4">
                {selectedMedia.type === "image" ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.title || "Recipe media"}
                    className="max-w-full max-h-64 object-contain mx-auto rounded-lg"
                  />
                ) : (
                  <div className="relative pt-[56.25%] rounded-lg overflow-hidden">
                    <iframe
                      src={selectedMedia.url}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={selectedMedia.title || ""}
                    onChange={(e) =>
                      updateMediaDetails(selectedMedia.id, {
                        title: e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="e.g., Finished plating"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={selectedMedia.description || ""}
                    onChange={(e) =>
                      updateMediaDetails(selectedMedia.id, {
                        description: e.target.value,
                      })
                    }
                    className="input w-full h-20 resize-none"
                    placeholder="Optional description..."
                  />
                </div>

                {selectedMedia.type === "video" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
                      Start Time (seconds)
                    </label>
                    <input
                      type="number"
                      value={selectedMedia.timestamp || 0}
                      onChange={(e) =>
                        updateMediaDetails(selectedMedia.id, {
                          timestamp: parseInt(e.target.value) || 0,
                        })
                      }
                      className="input w-full"
                      min="0"
                      step="1"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Link to Step
                  </label>
                  <select
                    value={selectedMedia.step_id || ""}
                    onChange={(e) =>
                      updateMediaDetails(selectedMedia.id, {
                        step_id: e.target.value || undefined,
                      })
                    }
                    className="input w-full"
                  >
                    <option value="">Not linked to a step</option>
                    {recipe.steps?.map((step, index) => (
                      <option key={step.id} value={step.id}>
                        Step {index + 1}:{" "}
                        {step.instruction?.substring(0, 40)}
                        {(step.instruction?.length || 0) > 40 ? "..." : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={selectedMedia.tags?.join(", ") || ""}
                    onChange={(e) =>
                      updateMediaDetails(selectedMedia.id, {
                        tags: e.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                    className="input w-full"
                    placeholder="e.g., plating, technique, final"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedMedia(null)}
                className="btn-primary text-sm px-4 py-2"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
