import React from "react";
import { Image, Upload, Camera, Trash2, Link } from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

// =============================================================================
// IMAGE SECTION - Product Image Management
// =============================================================================

interface ImageSectionProps {
  formData: MasterIngredient;
  onChange: (updates: Partial<MasterIngredient>) => void;
}

export const ImageSection: React.FC<ImageSectionProps> = ({
  formData,
  onChange,
}) => {
  const { organization } = useAuth();
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileUpload = async (file: File) => {
    if (!organization?.id) {
      toast.error("Organization not available");
      return;
    }

    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${organization.id}/ingredients/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("ingredient-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("ingredient-photos").getPublicUrl(filePath);

      onChange({ image_url: publicUrl });
      toast.success("Image uploaded");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = async () => {
    if (!organization?.id) {
      toast.error("Organization not available");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9)
      );
      
      stream.getTracks().forEach((track) => track.stop());

      const timestamp = Date.now();
      const filePath = `${organization.id}/ingredients/${timestamp}_photo.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("ingredient-photos")
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("ingredient-photos").getPublicUrl(filePath);

      onChange({ image_url: publicUrl });
      toast.success("Photo captured");
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast.error("Failed to capture photo");
    }
  };

  const handleRemoveImage = () => {
    onChange({ image_url: null });
  };

  return (
    <div className="space-y-4">
      {/* Image Preview */}
      <div className="relative aspect-video bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
        {formData.image_url ? (
          <>
            <img
              src={formData.image_url}
              alt={formData.product}
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-3 right-3 p-2 bg-gray-900/80 hover:bg-rose-900/80 text-gray-400 hover:text-rose-400 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <Image className="w-12 h-12 mb-2 opacity-50" />
            <p className="font-medium">No image available</p>
            <p className="text-sm text-gray-600">Upload, take a photo, or paste a URL</p>
          </div>
        )}
      </div>

      {/* Image Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upload Button */}
        <label
          className={`flex items-center justify-center gap-2 text-sm bg-gray-800/50 rounded-lg p-4 border-2 border-dashed border-gray-700 hover:border-blue-400/50 transition-colors cursor-pointer ${
            isUploading ? "opacity-50 cursor-wait" : ""
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            disabled={isUploading}
            className="hidden"
          />
          <Upload className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400">
            {isUploading ? "Uploading..." : "Upload Image"}
          </span>
        </label>

        {/* Camera Button */}
        <button
          type="button"
          onClick={handleCameraCapture}
          className="flex items-center justify-center gap-2 text-sm bg-gray-800/50 rounded-lg p-4 border-2 border-dashed border-gray-700 hover:border-purple-400/50 transition-colors"
        >
          <Camera className="w-4 h-4 text-purple-400" />
          <span className="text-purple-400">Take Photo</span>
        </button>
      </div>

      {/* URL Input */}
      <div className="relative">
        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="url"
          placeholder="Or paste an image URL from supplier website..."
          value={formData.image_url || ""}
          onChange={(e) => {
            if (e.target.value.trim() === "") {
              onChange({ image_url: null });
            } else {
              onChange({ image_url: e.target.value });
            }
          }}
          className="input w-full pl-10"
        />
      </div>

      <p className="text-xs text-gray-500 text-center">
        Supported formats: JPG, PNG, WebP (max 5MB) or direct image URL
      </p>
    </div>
  );
};
