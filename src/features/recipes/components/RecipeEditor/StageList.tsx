import React, { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  PenLine,
  ChevronDown,
  ChevronRight,
  Layers,
  Clock,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Recipe, RecipeStage } from "../../types/recipe";
import { supabase } from "@/config/supabase";

/**
 * =============================================================================
 * STAGE LIST - L5 Design
 * =============================================================================
 * 
 * PRODUCTION PLANNING:
 * - Stages = production phases (Day 1 Brine, Day 2 Smoke, etc.)
 * - Stages marked as "Prep List Task" can be scheduled in prep lists
 * - When building prep lists, entire stages drag as units
 * - Total time auto-calculated from all steps in that stage
 * 
 * Amber color scheme (Method tab identity)
 * =============================================================================
 */

interface StageListProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

// ============================================================================
// SORTABLE STAGE ITEM
// ============================================================================

const SortableStage: React.FC<{
  stage: RecipeStage;
  index: number;
  onUpdate: (index: number, updates: Partial<RecipeStage>) => void;
  onDelete: (index: number) => void;
}> = ({ stage, index, onUpdate, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const [isEditing, setIsEditing] = useState(false);
  const [stageName, setStageName] = useState(stage.name);

  const handleSaveName = () => {
    if (stageName.trim()) {
      onUpdate(index, { name: stageName.trim() });
    } else {
      setStageName(stage.name); // Reset if empty
    }
    setIsEditing(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-800/50 rounded-lg p-3 flex items-center gap-3 border transition-colors ${
        isDragging ? 'border-amber-500/50' : 'border-gray-700/50 hover:border-gray-600'
      }`}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-700/50 transition-colors"
      >
        <GripVertical className="w-4 h-4 text-gray-500" />
      </div>

      {/* Stage Number Badge */}
      <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-amber-400">{index + 1}</span>
      </div>

      {/* Stage Name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              className="input py-1.5 px-2 text-sm flex-1"
              placeholder="Stage name..."
              autoFocus
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setStageName(stage.name);
                  setIsEditing(false);
                }
              }}
            />
            <button
              onClick={handleSaveName}
              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{stage.name}</span>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Total Time Badge */}
      {stage.total_time > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-700/50 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{stage.total_time} min</span>
        </div>
      )}

      {/* Prep List Toggle */}
      <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={stage.is_prep_list_task}
          onChange={(e) => onUpdate(index, { is_prep_list_task: e.target.checked })}
          className="checkbox"
        />
        <span className="text-xs text-gray-300 whitespace-nowrap">Prep List</span>
      </label>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(index)}
        className="p-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// STAGE LIST COMPONENT
// ============================================================================

export const StageList: React.FC<StageListProps> = ({ recipe, onChange }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [isExpanded, setIsExpanded] = useState(false);

  // ============================================================================
  // STAGE CRUD
  // ============================================================================

  const handleStageChange = async (index: number, updates: Partial<RecipeStage>) => {
    const updatedStages = [...(recipe.stages || [])];
    updatedStages[index] = { ...updatedStages[index], ...updates };
    onChange({ stages: updatedStages });

    // Persist to database
    const stage = updatedStages[index];
    if (stage.id && recipe.id) {
      try {
        const updateData: Record<string, any> = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.is_prep_list_task !== undefined) updateData.is_prep_list_task = updates.is_prep_list_task;
        if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
        if (updates.total_time !== undefined) updateData.total_time = updates.total_time;

        await supabase
          .from("recipe_stages")
          .update(updateData)
          .eq("id", stage.id);
      } catch (error) {
        console.error("Failed to update stage:", error);
      }
    }
  };

  const addStage = async () => {
    const newStage: RecipeStage = {
      id: `stage-${Date.now()}`,
      name: `Stage ${(recipe.stages || []).length + 1}`,
      is_prep_list_task: false,
      sort_order: (recipe.stages || []).length,
      total_time: 0,
    };

    onChange({ stages: [...(recipe.stages || []), newStage] });
    setIsExpanded(true);

    // Persist to database
    if (recipe.id) {
      try {
        await supabase.from("recipe_stages").insert({
          id: newStage.id,
          name: newStage.name,
          is_prep_list_task: newStage.is_prep_list_task,
          sort_order: newStage.sort_order,
          total_time: 0,
          recipe_id: recipe.id,
        });
      } catch (error) {
        console.error("Failed to add stage:", error);
      }
    }
  };

  const removeStage = async (index: number) => {
    const stageId = recipe.stages?.[index]?.id;
    
    // Unassign any steps from this stage
    const updatedSteps = (recipe.steps || []).map((step) => {
      if (step.stage_id === stageId) {
        return { ...step, stage_id: undefined };
      }
      return step;
    });

    const updatedStages = (recipe.stages || []).filter((_, i) => i !== index);
    onChange({ stages: updatedStages, steps: updatedSteps });

    // Persist to database
    if (recipe.id && stageId) {
      try {
        await supabase
          .from("recipe_steps")
          .update({ stage_id: null })
          .eq("stage_id", stageId);

        await supabase
          .from("recipe_stages")
          .delete()
          .eq("id", stageId);
      } catch (error) {
        console.error("Failed to remove stage:", error);
      }
    }
  };

  // ============================================================================
  // DRAG AND DROP
  // ============================================================================

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = recipe.stages?.findIndex((stage) => stage.id === active.id);
    const newIndex = recipe.stages?.findIndex((stage) => stage.id === over.id);
    
    if (oldIndex === undefined || newIndex === undefined || oldIndex === -1 || newIndex === -1) return;

    const newStages = arrayMove(recipe.stages || [], oldIndex, newIndex).map((stage, i) => ({
      ...stage,
      sort_order: i,
    }));

    onChange({ stages: newStages });

    // Persist to database
    if (recipe.id) {
      try {
        await Promise.all(
          newStages.map((stage) =>
            supabase
              .from("recipe_stages")
              .update({ sort_order: stage.sort_order })
              .eq("id", stage.id)
          )
        );
      } catch (error) {
        console.error("Failed to reorder stages:", error);
      }
    }
  };

  const stageCount = recipe.stages?.length || 0;
  const prepListCount = recipe.stages?.filter((s) => s.is_prep_list_task).length || 0;

  return (
    <div className={`expandable-info-section ${isExpanded ? 'expanded' : ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="expandable-info-header w-full"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-medium text-white">Recipe Stages</h2>
              <p className="text-sm text-gray-400">
                Group steps into production phases
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stageCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg bg-gray-700/50 text-xs text-gray-300">
                  {stageCount} stage{stageCount !== 1 ? 's' : ''}
                </span>
                {prepListCount > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-xs text-emerald-400">
                    {prepListCount} prep
                  </span>
                )}
              </div>
            )}
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </div>
      </button>

      <div className="expandable-info-content p-4 space-y-3">
          {/* Info Text */}
          <p className="text-xs text-gray-500 mb-4">
            Stages help organize multi-day recipes (Day 1: Brine, Day 2: Smoke). 
            Mark stages as "Prep List" to schedule them when building prep lists.
          </p>

          {/* Add Stage Button */}
          <div className="flex justify-end mb-3">
            <button onClick={addStage} className="btn-primary text-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Stage
            </button>
          </div>

          {/* Stage List */}
          {stageCount > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={(recipe.stages || []).map((stage) => stage.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {(recipe.stages || []).map((stage, index) => (
                    <SortableStage
                      key={stage.id}
                      stage={stage}
                      index={index}
                      onUpdate={handleStageChange}
                      onDelete={removeStage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
              <Layers className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No stages yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Add stages to organize multi-step production
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default StageList;
