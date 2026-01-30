import React from "react";
import { Package, Upload, Trash2 } from "lucide-react";
import { ExpandableSection, GuidanceTip } from "@/shared/components/L5";
import { useOperationsStore } from "@/stores/operationsStore";
import { mediaService } from "@/lib/media-service";
import type { Recipe } from "../../../../types/recipe";
import toast from "react-hot-toast";

/**
 * =============================================================================
 * STORAGE LOCATION SECTION
 * =============================================================================
 * Container, storage areas, and location photos.
 * Photos help staff find where items live.
 * =============================================================================
 */

interface StorageLocationSectionProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const StorageLocationSection: React.FC<StorageLocationSectionProps> = ({
  recipe,
  onChange,
}) => {
  const { settings } = useOperationsStore();
  const storageAreas = settings?.storage_areas || [];
  const storageContainers = settings?.storage_containers || [];
  const containerTypes = settings?.container_types || [];

  const handleImageUpload = async (type: "primary" | "secondary", file: File) => {
    try {
      const url = await mediaService.uploadStorageImage(file);
      onChange({
        storage: {
          ...recipe.storage,
          [`${type}_image_url`]: url,
        },
      });
      toast.success(`${type === "primary" ? "Primary" : "Secondary"} storage image uploaded`);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    }
  };

  const handleImageDelete = async (type: "primary" | "secondary") => {
    try {
      const imageUrl = type === "primary" 
        ? recipe.storage?.primary_image_url 
        : recipe.storage?.secondary_image_url;
      if (imageUrl) {
        await mediaService.deleteStorageImage(imageUrl);
        onChange({
          storage: {
            ...recipe.storage,
            [`${type}_image_url`]: null,
          },
        });
        toast.success(`${type === "primary" ? "Primary" : "Secondary"} storage image removed`);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  return (
    <ExpandableSection
      icon={Package}
      iconColor="text-primary-400"
      iconBg="bg-primary-500/20"
      title="Storage Location"
      subtitle="Where this item lives"
      helpText="Define containers, storage areas, and add photos to help staff find items quickly."
      defaultExpanded={true}
    >
      <GuidanceTip>
        <strong>Photos save time.</strong> Upload images showing exactly where this item 
        is stored. Staff can reference these in the user-side viewer to quickly locate 
        items. Both primary and secondary locations can have photos.
      </GuidanceTip>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Selectors */}
        <div className="space-y-4">
          {/* Container Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
                Storage Container
              </label>
              <select
                value={recipe.storage?.container || ""}
                onChange={(e) =>
                  onChange({
                    storage: { ...recipe.storage, container: e.target.value },
                  })
                }
                className="input w-full"
              >
                <option value="">Select container...</option>
                {storageContainers.map((container) => (
                  <option key={container} value={container}>
                    {container}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
                Container Type
              </label>
              <select
                value={recipe.storage?.container_type || ""}
                onChange={(e) =>
                  onChange({
                    storage: { ...recipe.storage, container_type: e.target.value },
                  })
                }
                className="input w-full"
              >
                <option value="">Select type...</option>
                {containerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Storage Areas */}
          <div>
            <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
              Primary Storage Area
            </label>
            <select
              value={recipe.storage?.primary_area || ""}
              onChange={(e) =>
                onChange({
                  storage: { ...recipe.storage, primary_area: e.target.value },
                })
              }
              className="input w-full"
            >
              <option value="">Select area...</option>
              {storageAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
              Secondary Storage Area
              <span className="text-gray-600 ml-1">(optional)</span>
            </label>
            <select
              value={recipe.storage?.secondary_area || ""}
              onChange={(e) =>
                onChange({
                  storage: { ...recipe.storage, secondary_area: e.target.value },
                })
              }
              className="input w-full"
            >
              <option value="">Select area...</option>
              {storageAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Storage Notes */}
          <div>
            <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
              Storage Notes
            </label>
            <textarea
              value={recipe.storage?.notes || ""}
              onChange={(e) =>
                onChange({
                  storage: { ...recipe.storage, notes: e.target.value },
                })
              }
              className="input w-full"
              rows={3}
              placeholder="Additional storage instructions or notes..."
            />
          </div>
        </div>

        {/* Right Column - Images */}
        <div className="space-y-4">
          {/* Primary Image */}
          <div>
            <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
              Primary Location Photo
            </label>
            {recipe.storage?.primary_image_url ? (
              <div className="relative">
                <img
                  src={recipe.storage.primary_image_url}
                  alt="Primary storage location"
                  className="w-full aspect-video object-cover rounded-lg border border-gray-700/50"
                />
                <button
                  onClick={() => handleImageDelete("primary")}
                  className="absolute top-2 right-2 p-1.5 bg-gray-900/80 text-gray-400 hover:text-rose-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-lg hover:border-primary-500/50 transition-colors cursor-pointer">
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-fluid-sm text-gray-400">Upload primary location photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload("primary", file);
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Secondary Image */}
          <div>
            <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
              Secondary Location Photo
              <span className="text-gray-600 ml-1">(optional)</span>
            </label>
            {recipe.storage?.secondary_image_url ? (
              <div className="relative">
                <img
                  src={recipe.storage.secondary_image_url}
                  alt="Secondary storage location"
                  className="w-full aspect-video object-cover rounded-lg border border-gray-700/50"
                />
                <button
                  onClick={() => handleImageDelete("secondary")}
                  className="absolute top-2 right-2 p-1.5 bg-gray-900/80 text-gray-400 hover:text-rose-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-lg hover:border-primary-500/50 transition-colors cursor-pointer">
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-fluid-sm text-gray-400">Upload secondary location photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload("secondary", file);
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default StorageLocationSection;
