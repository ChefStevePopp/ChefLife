/**
 * =============================================================================
 * TABLE VIEW - Desktop Ingredient List
 * =============================================================================
 * L5 Design - Responsive rows, drag-to-reorder, inline editing
 * Sandbox-aware styling
 * =============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  Package,
  ChefHat,
  Search,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IngredientSearch } from "./IngredientSearch";
import { SandboxFields } from "./SandboxFields";
import { createNewIngredient } from "./types";
import type { RecipeIngredient } from "../../../types/recipe";
import type { MasterIngredientOption, PreparedItemOption } from "./types";

// ---------------------------------------------------------------------------
// SORTABLE ROW COMPONENT
// ---------------------------------------------------------------------------
interface SortableRowProps {
  ingredient: RecipeIngredient;
  index: number;
  onUpdate: (index: number, field: string, value: any, type?: 'raw' | 'prepared') => void;
  onRemove: (index: number) => void;
  onAddAfter: (index: number) => void;
  onToggleSandbox: (index: number) => void;
  rawIngredients: MasterIngredientOption[];
  preparedItems: PreparedItemOption[];
  vendors: string[];
}

const SortableRow: React.FC<SortableRowProps> = ({
  ingredient,
  index,
  onUpdate,
  onRemove,
  onAddAfter,
  onToggleSandbox,
  rawIngredients,
  preparedItems,
  vendors,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: ingredient.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSandbox = ingredient.is_sandbox || false;

  // Check if ingredient is linked to real MIL/prepared item
  const isLinkedToMIL = !!(ingredient.name || ingredient.master_ingredient_id || ingredient.prepared_recipe_id);
  const canToggleSandbox = !isLinkedToMIL; // Only allow toggle if NOT linked

  // Get ingredient info for display
  const ingredientInfo = useMemo(() => {
    if (isSandbox) {
      return {
        name: ingredient.sandbox_description || "",
        common_name: ingredient.sandbox_vendor 
          ? `${ingredient.sandbox_vendor} #${ingredient.sandbox_vendor_code || '—'}`
          : undefined,
        unit: ingredient.unit || "—",
        cost: ingredient.sandbox_estimated_cost || 0,
      };
    }
    const raw = rawIngredients.find(r => r.id === ingredient.name);
    if (raw) {
      return {
        name: raw.product,
        common_name: raw.common_name,
        unit: raw.recipe_unit_type || ingredient.unit || "",
        cost: raw.cost_per_recipe_unit || ingredient.cost || 0,
      };
    }
    const prep = preparedItems.find(p => p.id === ingredient.name);
    if (prep) {
      return {
        name: prep.name,
        common_name: "Prepared Item",
        unit: prep.unit_type || ingredient.unit || "",
        cost: prep.cost_per_unit || ingredient.cost || 0,
        isPrepared: true,
      };
    }
    return { name: "", common_name: undefined, unit: "", cost: 0 };
  }, [ingredient, rawIngredients, preparedItems, isSandbox]);

  const quantity = parseFloat(String(ingredient.quantity)) || 0;
  const totalCost = quantity * ingredientInfo.cost;

  const handleSelectIngredient = (id: string, type: 'raw' | 'prepared') => {
    onUpdate(index, 'name', id, type);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border transition-all
        ${isSandbox 
          ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50" 
          : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600"}`}
    >
      {/* Desktop Row Layout - responsive */}
      <div className="hidden lg:flex lg:items-center gap-2 px-3 py-2">
        {/* Drag Handle - tight to ingredient */}
        <div className="w-5 flex-shrink-0 flex items-center justify-center">
          <div {...attributes} {...listeners} className="cursor-grab p-0.5 hover:bg-gray-700/50 rounded">
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* Ingredient (search or sandbox) - flex grow */}
        <div className="flex-[3] min-w-0">
          {isSandbox ? (
            <SandboxFields
              vendor={ingredient.sandbox_vendor || ""}
              vendorCode={ingredient.sandbox_vendor_code || ""}
              description={ingredient.sandbox_description || ""}
              estimatedCost={ingredient.sandbox_estimated_cost || 0}
              unit={ingredient.unit || ""}
              onChange={(field, value) => onUpdate(index, field, value)}
              vendors={vendors}
              compact
            />
          ) : (
            <IngredientSearch
              value={ingredient.name || ""}
              onChange={handleSelectIngredient}
              onSandboxCreate={() => onToggleSandbox(index)}
              rawIngredients={rawIngredients}
              preparedItems={preparedItems}
              placeholder="Search..."
            />
          )}
        </div>

        {/* Common Name (auto from MIL) - flex grow */}
        <div className="flex-[1.5] min-w-0 text-center">
          <span className="text-sm text-gray-500 truncate block" title={ingredientInfo.common_name}>
            {ingredientInfo.common_name || "—"}
          </span>
        </div>

        {/* Common Measure - flex grow */}
        <div className="flex-[1.5] min-w-0">
          <input
            type="text"
            value={ingredient.commonMeasure || ingredient.common_measure || ""}
            onChange={(e) => onUpdate(index, "commonMeasure", e.target.value)}
            placeholder="2 cups"
            className="input w-full bg-gray-900/50 text-sm py-1.5 text-center"
          />
        </div>

        {/* R/U Type (locked) - fixed */}
        <div className="w-24 flex-shrink-0 text-center">
          <span className="text-sm text-gray-400 block">
            {ingredientInfo.unit || "—"}
          </span>
        </div>

        {/* Quantity - fixed */}
        <div className="w-20 flex-shrink-0">
          <input
            type="number"
            value={ingredient.quantity || ""}
            onChange={(e) => onUpdate(index, "quantity", e.target.value)}
            placeholder="0"
            min="0"
            step="0.25"
            className="input w-full bg-gray-900/50 text-sm py-1.5 text-center font-mono"
          />
        </div>

        {/* R/U Cost (locked) - fixed */}
        <div className="w-20 flex-shrink-0 text-center">
          <span className={`text-sm font-mono
            ${isSandbox ? "text-amber-400" : "text-gray-400"}`}>
            ${ingredientInfo.cost.toFixed(2)}
            {isSandbox && <span className="text-[10px] ml-0.5">~</span>}
          </span>
        </div>

        {/* Total Cost - fixed */}
        <div className="w-20 flex-shrink-0 text-center">
          <span className={`text-sm font-medium font-mono
            ${isSandbox ? "text-amber-400" : "text-emerald-400"}`}>
            ${totalCost.toFixed(2)}
          </span>
        </div>

        {/* Actions - with left border divider and breathing room */}
        <div className="w-32 flex-shrink-0 flex items-center justify-end gap-2 pl-4 border-l border-gray-700/50">
          {/* Verified Badge (when linked to MIL) OR Sandbox Toggle (when not linked) */}
          {isLinkedToMIL ? (
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-medium">
              <CheckCircle className="w-3 h-3" />
            </div>
          ) : (
            <button
              onClick={() => onToggleSandbox(index)}
              className={`p-1.5 rounded-full transition-colors
                ${isSandbox 
                  ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" 
                  : "bg-gray-700/50 text-gray-500 hover:text-amber-400 hover:bg-gray-700"}`}
              title={isSandbox ? "Turn off sandbox" : "Make sandbox"}
            >
              {isSandbox ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => onAddAfter(index)}
            className="p-1.5 rounded-full bg-gray-700/50 text-gray-500 hover:text-emerald-400 hover:bg-gray-700 transition-colors"
            title="Add after"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="p-1.5 rounded-full bg-gray-700/50 text-gray-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Card Layout */}
      <div className="lg:hidden p-3 space-y-3">
        <div className="flex items-start gap-2">
          <div {...attributes} {...listeners} className="cursor-grab p-1 mt-1">
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1">
            {isSandbox ? (
              <SandboxFields
                vendor={ingredient.sandbox_vendor || ""}
                vendorCode={ingredient.sandbox_vendor_code || ""}
                description={ingredient.sandbox_description || ""}
                estimatedCost={ingredient.sandbox_estimated_cost || 0}
                unit={ingredient.unit || ""}
                onChange={(field, value) => onUpdate(index, field, value)}
                vendors={vendors}
                compact
              />
            ) : (
              <IngredientSearch
                value={ingredient.name || ""}
                onChange={handleSelectIngredient}
                onSandboxCreate={() => onToggleSandbox(index)}
                rawIngredients={rawIngredients}
                preparedItems={preparedItems}
              />
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 pl-7">
          <div>
            <label className="text-xs text-gray-500">Qty ({ingredientInfo.unit})</label>
            <input
              type="number"
              value={ingredient.quantity || ""}
              onChange={(e) => onUpdate(index, "quantity", e.target.value)}
              className="input w-full bg-gray-900/50 text-sm py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Common</label>
            <input
              type="text"
              value={ingredient.commonMeasure || ingredient.common_measure || ""}
              onChange={(e) => onUpdate(index, "commonMeasure", e.target.value)}
              placeholder="2 cups"
              className="input w-full bg-gray-900/50 text-sm py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Total</label>
            <div className={`input w-full bg-gray-900/30 text-sm py-1.5 text-right font-mono
              ${isSandbox ? "text-amber-400" : "text-emerald-400"}`}>
              ${totalCost.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center justify-end gap-2 pl-7 pt-2 border-t border-gray-700/30">
          {/* Verified Badge OR Sandbox Toggle */}
          {isLinkedToMIL ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Verified</span>
            </div>
          ) : (
            <button
              onClick={() => onToggleSandbox(index)}
              className={`px-2 py-1 rounded-full text-xs flex items-center gap-1
                ${isSandbox 
                  ? "bg-amber-500/20 text-amber-400" 
                  : "bg-gray-700/50 text-gray-400"}`}
            >
              {isSandbox ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
              Sandbox
            </button>
          )}
          <button
            onClick={() => onAddAfter(index)}
            className="p-2 rounded-full bg-gray-700/50 text-gray-500 hover:text-emerald-400"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="p-2 rounded-full bg-gray-700/50 text-gray-500 hover:text-rose-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TABLE VIEW MAIN COMPONENT
// ---------------------------------------------------------------------------
interface TableViewProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
  rawIngredients: MasterIngredientOption[];
  preparedItems: PreparedItemOption[];
  vendors: string[];
}

export const TableView: React.FC<TableViewProps> = ({
  ingredients,
  onChange,
  rawIngredients,
  preparedItems,
  vendors,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = ingredients.findIndex((ing) => ing.id === active.id);
      const newIndex = ingredients.findIndex((ing) => ing.id === over.id);
      onChange(arrayMove(ingredients, oldIndex, newIndex));
    }
  };

  const handleUpdate = useCallback((index: number, field: string, value: any, type?: 'raw' | 'prepared') => {
    const updated = [...ingredients];
    
    if (field === 'name' && type) {
      // Selecting an ingredient
      const raw = rawIngredients.find(r => r.id === value);
      const prep = preparedItems.find(p => p.id === value);
      
      updated[index] = {
        ...updated[index],
        name: value,
        type: type,
        ingredient_type: type,
        // Set the proper relational ID field
        master_ingredient_id: type === 'raw' ? value : undefined,
        prepared_recipe_id: type === 'prepared' ? value : undefined,
        // Denormalized display fields
        ingredient_name: type === 'raw' ? raw?.product : prep?.name,
        common_name: type === 'raw' ? raw?.common_name : undefined,
        unit: type === 'raw' ? (raw?.recipe_unit_type || '') : (prep?.unit_type || ''),
        cost: type === 'raw' ? (raw?.cost_per_recipe_unit || 0) : (prep?.cost_per_unit || 0),
        cost_per_unit: type === 'raw' ? (raw?.cost_per_recipe_unit || 0) : (prep?.cost_per_unit || 0),
        is_sandbox: false,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    onChange(updated);
  }, [ingredients, onChange, rawIngredients, preparedItems]);

  const handleRemove = useCallback((index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  }, [ingredients, onChange]);

  const handleAddAfter = useCallback((index: number) => {
    const newIng = createNewIngredient() as RecipeIngredient;
    const updated = [...ingredients];
    updated.splice(index + 1, 0, newIng);
    onChange(updated);
  }, [ingredients, onChange]);

  const handleToggleSandbox = useCallback((index: number) => {
    const updated = [...ingredients];
    const current = updated[index];
    const newIsSandbox = !current.is_sandbox;
    
    updated[index] = {
      ...current,
      is_sandbox: newIsSandbox,
      ...(newIsSandbox ? { name: '', cost: 0, cost_per_unit: 0 } : {}),
    };
    onChange(updated);
  }, [ingredients, onChange]);

  const addIngredient = () => {
    onChange([...ingredients, createNewIngredient() as RecipeIngredient]);
  };

  // Stats
  const totalCost = ingredients.reduce((sum, ing) => {
    const qty = parseFloat(String(ing.quantity)) || 0;
    const cost = ing.is_sandbox 
      ? (ing.sandbox_estimated_cost || 0)
      : (ing.cost || ing.cost_per_unit || 0);
    return sum + (qty * cost);
  }, 0);
  const sandboxCount = ingredients.filter(i => i.is_sandbox).length;

  return (
    <div className="space-y-3">
      {/* Column Headers - Desktop - responsive layout */}
      <div className="hidden lg:flex lg:items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase">
        <div className="w-5 flex-shrink-0"></div>
        <div className="flex-[3] min-w-0">Ingredient</div>
        <div className="flex-[1.5] min-w-0 text-center">Common Name</div>
        <div className="flex-[1.5] min-w-0 text-center">Common Measure</div>
        <div className="w-24 flex-shrink-0 text-center">R/U Type</div>
        <div className="w-20 flex-shrink-0 text-center"># R/U</div>
        <div className="w-20 flex-shrink-0 text-center">R/U Cost</div>
        <div className="w-20 flex-shrink-0 text-center">Total</div>
        <div className="w-32 flex-shrink-0 text-center pl-4 border-l border-gray-700/50">Actions</div>
      </div>

      {/* Ingredient Rows */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ingredients.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <SortableRow
                key={ingredient.id}
                ingredient={ingredient}
                index={index}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onAddAfter={handleAddAfter}
                onToggleSandbox={handleToggleSandbox}
                rawIngredients={rawIngredients}
                preparedItems={preparedItems}
                vendors={vendors}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {ingredients.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p>No ingredients yet</p>
          <button onClick={addIngredient} className="btn-ghost-blue mt-3">
            <Plus className="w-4 h-4 mr-2" />
            Add First Ingredient
          </button>
        </div>
      )}

      {/* Add Button */}
      {ingredients.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <button onClick={addIngredient} className="btn-ghost text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Ingredient
          </button>

          {sandboxCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              {sandboxCount} sandbox
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TableView;
