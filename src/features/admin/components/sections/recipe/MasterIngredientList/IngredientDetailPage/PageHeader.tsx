import React, { useState } from "react";
import { 
  Package, 
  Circle, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  ChevronDown,
  Camera,
  Upload,
  Link,
  Trash2,
  X,
  HelpCircle,
} from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";
import { differenceInWeeks, differenceInDays } from "date-fns";
import { BasicInformation } from "../EditIngredientModal/BasicInformation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

// =============================================================================
// PAGE HEADER - Ingredient Detail (L5)
// =============================================================================
// Mission-critical component for Alpha/Bravo users.
// Features:
// - Clickable avatar → image modal (simple, focused)
// - Expandable basic info (name, vendor, categories - rarely changes)
// - Progress indicator + freshness bubbles
// =============================================================================

interface PageHeaderProps {
  ingredient: MasterIngredient;
  isNew: boolean;
  hasUnsavedChanges: boolean;
  onBack: () => void;
  onChange: (updates: Partial<MasterIngredient>) => void;
  guidedModeToggle?: React.ReactNode;
  backLabel?: string;
}

// ---------------------------------------------------------------------------
// COMPLETION STATUS
// ---------------------------------------------------------------------------
const REQUIRED_FIELDS = [
  { key: "product", label: "Product name" },
  { key: "major_group", label: "Major group" },
  { key: "category", label: "Category" },
  { key: "recipe_unit_type", label: "Recipe unit" },
  { key: "recipe_unit_per_purchase_unit", label: "Units conversion" },
  { key: "current_price", label: "Current price" },
  { key: "unit_of_measure", label: "Unit of measure" },
] as const;

const getCompletionStatus = (data: MasterIngredient) => {
  const filledFields = REQUIRED_FIELDS.filter(({ key }) => {
    const value = data[key as keyof MasterIngredient];
    return value !== null && value !== undefined && value !== "" && value !== 0;
  });

  const percentage = Math.round((filledFields.length / REQUIRED_FIELDS.length) * 100);
  const missingFields = REQUIRED_FIELDS.filter(({ key }) => {
    const value = data[key as keyof MasterIngredient];
    return value === null || value === undefined || value === "" || value === 0;
  });

  if (percentage === 100) {
    return { 
      label: "Complete", 
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      percentage,
      missingFields: [],
    };
  } else if (percentage >= 50) {
    return { 
      label: "In Progress", 
      color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      percentage,
      missingFields,
    };
  } else {
    return { 
      label: "Draft", 
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      percentage,
      missingFields,
    };
  }
};

// ---------------------------------------------------------------------------
// REVIEW STATUS (Freshness Indicator)
// ---------------------------------------------------------------------------
const getReviewStatus = (lastUpdated: string) => {
  const weeksElapsed = differenceInWeeks(new Date(), new Date(lastUpdated));
  const daysElapsed = differenceInDays(new Date(), new Date(lastUpdated));
  
  const filledBubbles = Math.min(Math.floor(weeksElapsed / 2), 4);
  
  let status: "fresh" | "ok" | "stale" | "overdue";
  let color: string;
  let label: string;
  
  if (weeksElapsed < 2) {
    status = "fresh";
    color = "text-emerald-400";
    label = daysElapsed === 0 ? "Today" : `${daysElapsed}d`;
  } else if (weeksElapsed < 4) {
    status = "ok";
    color = "text-emerald-400";
    label = `${weeksElapsed}w`;
  } else if (weeksElapsed < 6) {
    status = "stale";
    color = "text-amber-400";
    label = `${weeksElapsed}w`;
  } else {
    status = "overdue";
    color = "text-rose-400";
    label = `${weeksElapsed}w`;
  }
  
  return { filledBubbles, status, color, label, weeksElapsed };
};

// ---------------------------------------------------------------------------
// IMAGE MODAL
// ---------------------------------------------------------------------------
interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  productName: string;
  onChange: (url: string | null) => void;
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  productName,
  onChange,
}) => {
  const { organization } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(imageUrl || "");

  if (!isOpen) return null;

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

      const { data: { publicUrl } } = supabase.storage
        .from("ingredient-photos")
        .getPublicUrl(filePath);

      onChange(publicUrl);
      setUrlInput(publicUrl);
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

      const { data: { publicUrl } } = supabase.storage
        .from("ingredient-photos")
        .getPublicUrl(filePath);

      onChange(publicUrl);
      setUrlInput(publicUrl);
      toast.success("Photo captured");
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast.error("Failed to capture photo");
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    } else {
      onChange(null);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setUrlInput("");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-md shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Product Image</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="relative aspect-square bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={productName}
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-2 right-2 p-2 bg-gray-900/80 hover:bg-rose-900/80 text-gray-400 hover:text-rose-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <Package className="w-16 h-16 mb-2 opacity-30" />
                <p className="text-sm">No image</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center justify-center gap-2 text-sm bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-blue-500/50 hover:bg-blue-500/10 transition-colors cursor-pointer ${
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
                {isUploading ? "Uploading..." : "Upload"}
              </span>
            </label>

            <button
              type="button"
              onClick={handleCameraCapture}
              className="flex items-center justify-center gap-2 text-sm bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-purple-500/50 hover:bg-purple-500/10 transition-colors"
            >
              <Camera className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400">Camera</span>
            </button>
          </div>

          {/* URL Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="url"
                placeholder="Paste image URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onBlur={handleUrlSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                className="input w-full pl-10 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-end">
          <button onClick={onClose} className="btn-primary text-sm px-4 py-2">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export const PageHeader: React.FC<PageHeaderProps> = ({
  ingredient,
  isNew,
  hasUnsavedChanges,
  onBack,
  onChange,
  guidedModeToggle,
  backLabel = "Back to Ingredients",
}) => {
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(isNew);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const completionStatus = getCompletionStatus(ingredient);
  const reviewStatus = !isNew ? getReviewStatus(ingredient.updated_at) : null;

  return (
    <>
      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={ingredient.image_url}
        productName={ingredient.product}
        onChange={(url) => onChange({ image_url: url })}
      />

      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Main Header */}
        <div className="p-4">
          {/* Top Row: Guided Toggle (back button moved to nav bar) */}
          <div className="flex items-center justify-end mb-4">
            {guidedModeToggle}
          </div>

          {/* Header Row */}
          <div className="flex items-start gap-4">
            {/* Clickable Avatar */}
            <button
              onClick={() => setIsImageModalOpen(true)}
              className="w-16 h-16 rounded-xl bg-gray-800 border-2 border-gray-700 hover:border-primary-500/50 flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors group relative"
            >
              {ingredient.image_url ? (
                <img
                  src={ingredient.image_url}
                  alt={ingredient.product}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-8 h-8 text-gray-600 group-hover:text-gray-500 transition-colors" />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </button>

            {/* Title & Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white truncate">
                  {isNew ? "New Ingredient" : ingredient.product || "Untitled"}
                </h1>
                
                {/* Status Badges - Compact row */}
                <div className="flex items-center gap-2">
                  {/* Completion */}
                  <div className="group relative">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${completionStatus.color}`}>
                      {completionStatus.percentage === 100 ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <span>{completionStatus.percentage}%</span>
                      )}
                    </div>
                    
                    {/* Tooltip */}
                    {completionStatus.missingFields.length > 0 && (
                      <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 min-w-[180px] border border-gray-700">
                        <div className="text-xs font-medium text-gray-400 mb-2">Missing:</div>
                        <ul className="space-y-1">
                          {completionStatus.missingFields.map(({ label }) => (
                            <li key={label} className="text-xs text-gray-300 flex items-center gap-2">
                              <Circle className="w-1.5 h-1.5 text-amber-400" />
                              {label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Freshness */}
                  {reviewStatus && (
                    <div className="group relative flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-800/50 border border-gray-700">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <div className="flex items-center gap-0.5">
                        {[...Array(4)].map((_, index) => {
                          let bubbleColor = "text-gray-700";
                          if (index < reviewStatus.filledBubbles) {
                            if (reviewStatus.filledBubbles <= 1) bubbleColor = "text-emerald-400";
                            else if (reviewStatus.filledBubbles === 2) bubbleColor = "text-amber-400";
                            else bubbleColor = "text-rose-400";
                          }
                          return (
                            <Circle
                              key={index}
                              className={`w-2 h-2 ${bubbleColor} ${index < reviewStatus.filledBubbles ? "fill-current" : ""}`}
                            />
                          );
                        })}
                      </div>
                      <span className={`text-xs ${reviewStatus.color}`}>{reviewStatus.label}</span>
                      {reviewStatus.status === "overdue" && (
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                      )}
                      
                      {/* Tooltip */}
                      <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap border border-gray-700">
                        <div className="text-xs text-gray-300">
                          {reviewStatus.status === "fresh" && "Recently updated"}
                          {reviewStatus.status === "ok" && "Updated within the last month"}
                          {reviewStatus.status === "stale" && "Consider reviewing this ingredient"}
                          {reviewStatus.status === "overdue" && "Needs price/info review"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Unsaved */}
                  {hasUnsavedChanges && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                      <Circle className="w-1.5 h-1.5 fill-current" />
                      Unsaved
                    </span>
                  )}

                  {/* Archived */}
                  {ingredient.archived && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-400 rounded-full border border-gray-600">
                      Archived
                    </span>
                  )}
                </div>
              </div>

              {/* Subtitle: Vendor + Item Code */}
              {!isNew && (
                <div className="mt-1 text-sm text-gray-500">
                  <span>{ingredient.vendor || "No vendor"}</span>
                  {ingredient.item_code && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-mono text-gray-600">{ingredient.item_code}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Basic Information - matches other sections */}
        <div className="border-t border-gray-700/50">
          <button
            onClick={() => setIsBasicInfoExpanded(!isBasicInfoExpanded)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-gray-300">Basic Information</h2>
                <span className="text-xs text-gray-500">Name, vendor, categories</span>
              </div>
            </div>
            <div className="group relative" onClick={(e) => e.stopPropagation()}>
              <HelpCircle className="w-4 h-4 text-gray-600 hover:text-gray-400 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 border border-gray-700">
                <p className="text-xs text-gray-300 leading-relaxed">Core identity fields for this ingredient. These rarely change once set up.</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isBasicInfoExpanded ? "rotate-180" : ""}`} />
          </button>
          
          {isBasicInfoExpanded && (
            <div className="border-t border-gray-700/50">
              <div className="px-4 py-4 bg-primary-800/10 rounded-b-lg">
                <BasicInformation formData={ingredient} onChange={onChange} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
