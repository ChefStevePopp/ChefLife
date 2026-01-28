import React, { useState } from "react";
import {
  AlertTriangle,
  Upload,
  ImagePlus,
  Trash2,
  Camera,
  ThermometerSun,
  Shield,
  Youtube,
  Link,
  Video,
  StickyNote,
  ChevronDown,
  Clock,
  Calendar,
  FilePen,
  Type,
} from "lucide-react";
import type { RecipeStep, RecipeStage } from "../../types/recipe";
import { mediaService } from "@/lib/media-service";
import toast from "react-hot-toast";
import { RichTextEditor } from "@/shared/components/RichTextEditor";

/**
 * =============================================================================
 * STEP EDITOR CARD - L5 Design
 * =============================================================================
 * 
 * DESIGN PHILOSOPHY:
 * - Step Title is PROMINENT - first field, always visible
 * - Instruction is the hero - large textarea
 * - Metadata inline (time, temp, stage, delay)
 * - Warnings and Media in expandable sections
 * - Amber color scheme (Method tab identity)
 * 
 * No drag-and-drop - carousel handles reordering via arrow buttons
 * =============================================================================
 */

interface SortableStepProps {
  step: RecipeStep;
  index: number;
  onUpdate: (index: number, updates: Partial<RecipeStep>) => void;
  onDelete: (index: number) => void;
  recipeId: string;
  stages?: RecipeStage[];
}

const SortableStep: React.FC<SortableStepProps> = ({
  step,
  index,
  onUpdate,
  onDelete,
  recipeId,
  stages = [],
}) => {
  // Expandable section states
  const [isWarningExpanded, setIsWarningExpanded] = useState(false);
  const [isMediaExpanded, setIsMediaExpanded] = useState(false);

  // ============================================================================
  // MEDIA HANDLERS
  // ============================================================================

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = await mediaService.uploadStepMedia(file, recipeId, step.id);
      onUpdate(index, {
        media: [
          ...(step.media || []),
          {
            id: `media-${Date.now()}`,
            type: file.type.startsWith("image/") ? "image" : "video",
            url,
            title: file.name,
            step_id: step.id,
            is_primary: false,
            sort_order: (step.media || []).length,
          },
        ],
      });
      toast.success("Media uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload media");
    }
  };

  const handleExternalVideoAdd = () => {
    const url = prompt("Enter YouTube or Vimeo URL:");
    if (!url) return;

    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    );
    const vimeoMatch = url.match(/vimeo\.com\/([0-9]+)/);

    if (youtubeMatch || vimeoMatch) {
      const provider = youtubeMatch ? "youtube" : "vimeo";
      const videoId = youtubeMatch ? youtubeMatch[1] : vimeoMatch![1];
      const embedUrl =
        provider === "youtube"
          ? `https://www.youtube.com/embed/${videoId}`
          : `https://player.vimeo.com/video/${videoId}`;

      onUpdate(index, {
        media: [
          ...(step.media || []),
          {
            id: `media-${Date.now()}`,
            type: "external-video",
            provider,
            url: embedUrl,
            title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Video`,
            step_id: step.id,
            sort_order: (step.media || []).length,
          },
        ],
      });
      toast.success(`${provider} video added successfully`);
    } else {
      toast.error("Invalid YouTube or Vimeo URL");
    }
  };

  const handleMediaDelete = async (mediaUrl: string, mediaIndex: number) => {
    try {
      if (!mediaUrl.includes("youtube.com") && !mediaUrl.includes("vimeo.com")) {
        await mediaService.deleteStepMedia(mediaUrl);
      }
      const updatedMedia = [...(step.media || [])];
      updatedMedia.splice(mediaIndex, 1);
      onUpdate(index, { media: updatedMedia });
      toast.success("Media removed successfully");
    } catch (error) {
      toast.error("Failed to delete media");
    }
  };

  // Count badges for warnings section
  const warningCount = [
    step.is_critical_control_point,
    step.is_quality_control_point,
    step.is_safety_warning,
  ].filter(Boolean).length;

  const mediaCount = step.media?.length || 0;

  return (
    <div className="space-y-4">
      {/* ================================================================
       * STATUS BADGES - Show at top if any are set
       * ================================================================ */}
      {(step.is_critical_control_point || step.is_quality_control_point || step.is_safety_warning) && (
        <div className="flex flex-wrap gap-2">
          {step.is_critical_control_point && (
            <div className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/30">
              Critical Control Point
            </div>
          )}
          {step.is_quality_control_point && (
            <div className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
              Quality Control Point
            </div>
          )}
          {step.is_safety_warning && (
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
              step.warning_level === "high"
                ? "bg-red-600/20 text-red-400 border-red-500/30"
                : step.warning_level === "medium"
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }`}>
              {step.warning_level === "high" ? "High" : step.warning_level === "medium" ? "Medium" : "Low"} Safety Warning
            </div>
          )}
        </div>
      )}

      {/* ================================================================
       * STEP TITLE - Prominent first field
       * ================================================================ */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">
          <div className="inline-flex items-center gap-2">
            <Type className="w-4 h-4 text-amber-400" />
            <span>Step Title</span>
            <span className="text-gray-600 font-normal">(optional)</span>
          </div>
        </label>
        <input
          type="text"
          value={step.custom_step_label || ""}
          onChange={(e) => onUpdate(index, { custom_step_label: e.target.value || null })}
          className="input w-full text-lg"
          placeholder={`Step ${index + 1}`}
        />
      </div>

      {/* ================================================================
       * INSTRUCTION - L6 Rich Text Editor
       * ================================================================ */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">
          <div className="inline-flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-amber-400" />
            <span>Instruction</span>
            <span className="text-rose-400">*</span>
          </div>
        </label>
        <RichTextEditor
          content={step.instruction}
          onChange={(html) => onUpdate(index, { instruction: html })}
          placeholder="Describe what to do in this step... Type / for formatting commands"
          minHeight="180px"
        />
      </div>

      {/* ================================================================
       * METADATA ROW - Time, Temp, Stage, Delay
       * ================================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Time */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            <div className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>Time (min)</span>
            </div>
          </label>
          <input
            type="number"
            value={step.time_in_minutes || ""}
            onChange={(e) => onUpdate(index, { time_in_minutes: parseInt(e.target.value) || null })}
            className="input w-full"
            placeholder="—"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            <div className="inline-flex items-center gap-1.5">
              <ThermometerSun className="w-3.5 h-3.5 text-gray-500" />
              <span>Temp</span>
            </div>
          </label>
          <div className="flex gap-1">
            <input
              type="number"
              value={step.temperature?.value || ""}
              onChange={(e) => onUpdate(index, {
                temperature: {
                  value: parseInt(e.target.value) || null,
                  unit: step.temperature?.unit || "F",
                },
              })}
              className="input flex-1 min-w-0"
              placeholder="—"
            />
            <select
              value={step.temperature?.unit || "F"}
              onChange={(e) => onUpdate(index, {
                temperature: {
                  value: step.temperature?.value || null,
                  unit: e.target.value as "F" | "C",
                },
              })}
              className="input w-16"
            >
              <option value="F">°F</option>
              <option value="C">°C</option>
            </select>
          </div>
        </div>

        {/* Stage Assignment */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            <div className="inline-flex items-center gap-1.5">
              <FilePen className="w-3.5 h-3.5 text-gray-500" />
              <span>Stage</span>
            </div>
          </label>
          <select
            value={step.stage_id || ""}
            onChange={(e) => onUpdate(index, { stage_id: e.target.value || undefined })}
            className="input w-full"
          >
            <option value="">No stage</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>

        {/* Delay */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span>Delay After</span>
            </div>
          </label>
          <div className="flex gap-1">
            <input
              type="number"
              value={step.delay?.value || ""}
              onChange={(e) => onUpdate(index, {
                delay: {
                  value: parseInt(e.target.value) || null,
                  unit: step.delay?.unit || "minutes",
                },
              })}
              className="input flex-1 min-w-0"
              placeholder="—"
            />
            <select
              value={step.delay?.unit || "minutes"}
              onChange={(e) => onUpdate(index, {
                delay: {
                  value: step.delay?.value || null,
                  unit: e.target.value as "minutes" | "hours" | "days",
                },
              })}
              className="input w-20"
            >
              <option value="minutes">min</option>
              <option value="hours">hr</option>
              <option value="days">day</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================================================================
       * PREP LIST TASK - Only for unstaged steps
       * ================================================================ */}
      {!step.stage_id && (
        <label className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
          <input
            type="checkbox"
            checked={step.is_prep_list_task}
            onChange={(e) => onUpdate(index, { is_prep_list_task: e.target.checked })}
            className="checkbox"
          />
          <span className="text-sm text-gray-300">Include in Prep List</span>
          <span className="text-xs text-gray-500 ml-auto">Can be scheduled separately</span>
        </label>
      )}

      {/* ================================================================
       * EXPANDABLE: Control Points & Warnings
       * ================================================================ */}
      <div className={`expandable-info-section ${isWarningExpanded ? 'expanded' : ''}`}>
        <button
          type="button"
          className="expandable-info-header"
          onClick={() => setIsWarningExpanded(!isWarningExpanded)}
        >
          <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-grow text-left">
            <h3 className="text-sm font-medium text-white">Control Points & Warnings</h3>
            <p className="text-xs text-gray-500">CCP, QCP, and safety warnings</p>
          </div>
          {warningCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-medium">
              {warningCount}
            </span>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isWarningExpanded ? "rotate-180" : ""}`} />
        </button>

        <div className="expandable-info-content p-4 space-y-4">
            {/* Control Point Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={step.is_quality_control_point}
                  onChange={(e) => onUpdate(index, { is_quality_control_point: e.target.checked })}
                  className="checkbox"
                />
                <span className="text-sm text-gray-300">Quality Control</span>
              </label>
              <label className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={step.is_critical_control_point}
                  onChange={(e) => onUpdate(index, { is_critical_control_point: e.target.checked })}
                  className="checkbox"
                />
                <span className="text-sm text-gray-300">Critical Control</span>
              </label>
              <label className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={step.is_safety_warning}
                  onChange={(e) => onUpdate(index, { is_safety_warning: e.target.checked })}
                  className="checkbox"
                />
                <span className="text-sm text-gray-300">Safety Warning</span>
              </label>
            </div>

            {/* Warning Level */}
            {step.is_safety_warning && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Warning Level</label>
                <select
                  value={step.warning_level || "low"}
                  onChange={(e) => onUpdate(index, { warning_level: e.target.value as "low" | "medium" | "high" })}
                  className="input w-full"
                >
                  <option value="low">Low - Informational</option>
                  <option value="medium">Medium - Caution Required</option>
                  <option value="high">High - Critical Safety</option>
                </select>
              </div>
            )}

            {/* Warning Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
              <textarea
                value={step.notes || ""}
                onChange={(e) => onUpdate(index, { notes: e.target.value })}
                className="input w-full h-20"
                placeholder="Additional notes about warnings or control points..."
              />
            </div>
        </div>
      </div>

      {/* ================================================================
       * EXPANDABLE: Media
       * ================================================================ */}
      <div className={`expandable-info-section ${isMediaExpanded ? 'expanded' : ''}`}>
        <button
          type="button"
          className="expandable-info-header"
          onClick={() => setIsMediaExpanded(!isMediaExpanded)}
        >
          <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <ImagePlus className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-grow text-left">
            <h3 className="text-sm font-medium text-white">Step Media</h3>
            <p className="text-xs text-gray-500">Photos, videos, or YouTube links</p>
          </div>
          {mediaCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs font-medium">
              {mediaCount}
            </span>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isMediaExpanded ? "rotate-180" : ""}`} />
        </button>

        <div className="expandable-info-content p-4 space-y-4">
            {/* Media Grid */}
            {mediaCount > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {(step.media || []).map((media, mediaIndex) => (
                  <div key={media.id} className="bg-gray-800/50 rounded-lg overflow-hidden">
                    <div className="p-2">
                      <input
                        type="text"
                        value={media.title || ""}
                        onChange={(e) => {
                          const updatedMedia = [...(step.media || [])];
                          updatedMedia[mediaIndex] = { ...media, title: e.target.value };
                          onUpdate(index, { media: updatedMedia });
                        }}
                        className="input w-full text-sm mb-2"
                        placeholder="Media title..."
                      />
                      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                        {media.type === "external-video" ? (
                          <iframe
                            src={media.url}
                            className="absolute inset-0 w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : media.type === "video" ? (
                          <video
                            src={media.url}
                            className="absolute inset-0 w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt={media.title || "Step image"}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700/50">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {media.type === "image" && <Camera className="w-3.5 h-3.5" />}
                        {media.type === "video" && <Video className="w-3.5 h-3.5" />}
                        {media.type === "external-video" && (
                          media.provider === "youtube" ? <Youtube className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />
                        )}
                        <span>{media.type === "image" ? "Image" : media.type === "video" ? "Video" : media.provider}</span>
                      </div>
                      <button
                        onClick={() => handleMediaDelete(media.url, mediaIndex)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-gray-700/50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-center gap-2 p-4 text-sm text-gray-400 hover:text-gray-300 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
              </label>
              <button
                onClick={handleExternalVideoAdd}
                className="flex items-center justify-center gap-2 p-4 text-sm text-gray-400 hover:text-gray-300 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-600 transition-colors"
              >
                <Youtube className="w-4 h-4" />
                <span>Add Video URL</span>
              </button>
            </div>
        </div>
      </div>

      {/* ================================================================
       * DELETE BUTTON
       * ================================================================ */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => onDelete(index)}
          className="btn-ghost-red flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Step
        </button>
      </div>
    </div>
  );
};

export default SortableStep;
