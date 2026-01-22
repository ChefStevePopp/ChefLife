# Diagnostics Pattern

> **Hook:** `src/hooks/useDiagnostics.ts`  
> **Toggle:** localStorage `showDiagnostics`  
> **Updated:** 2026-01-21

---

## Purpose

Show file paths during development to help developers quickly identify which component they're looking at. Controlled by a localStorage toggle so it persists across sessions but doesn't affect production.

---

## Usage

### 1. Import the hook

```tsx
import { useDiagnostics } from "@/hooks/useDiagnostics";
```

### 2. Use in component

```tsx
export const MyComponent: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  
  return (
    <div>
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/MyFeature/MyComponent.tsx
        </div>
      )}
      
      {/* Rest of component */}
    </div>
  );
};
```

### 3. Placement

Always place the diagnostic path:
- **First** inside the main container `<div>`
- **Before** any other content
- Using the exact styling: `text-xs text-gray-500 font-mono`

---

## Toggle Control

### Enable diagnostics

In browser console:
```js
localStorage.setItem('showDiagnostics', 'true');
location.reload();
```

### Disable diagnostics

```js
localStorage.setItem('showDiagnostics', 'false');
location.reload();
```

### Check current state

```js
localStorage.getItem('showDiagnostics')
```

---

## Hook Implementation

```ts
// src/hooks/useDiagnostics.ts
import { useState, useEffect } from 'react';

export function useDiagnostics() {
  const [showDiagnostics, setShowDiagnostics] = useState(() => {
    const savedPreference = localStorage.getItem('showDiagnostics');
    return savedPreference === 'true';
  });

  useEffect(() => {
    localStorage.setItem('showDiagnostics', showDiagnostics.toString());
    if (showDiagnostics) {
      document.body.classList.add('show-diagnostics');
    } else {
      document.body.classList.remove('show-diagnostics');
    }
  }, [showDiagnostics]);

  return {
    showDiagnostics,
    setShowDiagnostics
  };
}
```

---

## Body Class

The hook also adds `show-diagnostics` class to `document.body` when enabled. This can be used for CSS-based diagnostics:

```css
/* Show all component boundaries when diagnostics enabled */
.show-diagnostics .card {
  outline: 1px dashed rgba(0, 255, 255, 0.3);
}
```

---

## Components Using This Pattern

| Component | Path |
|-----------|------|
| VendorInvoiceManager | `src/features/admin/components/sections/VendorInvoice/VendorInvoiceManager.tsx` |
| VendorSelector | `src/features/admin/components/sections/VendorInvoice/components/VendorSelector.tsx` |
| CSVUploader | `src/features/admin/components/sections/VendorInvoice/components/CSVUploader.tsx` |
| ImportWorkspace | `src/features/admin/components/sections/VendorInvoice/components/ImportWorkspace.tsx` |
| UmbrellaIngredientManager | `src/features/admin/components/sections/VendorInvoice/components/UmbrellaIngredientManager.tsx` |
| ItemCodeGroupManager | `src/features/admin/components/sections/VendorInvoice/components/ItemCodeGroupManager.tsx` |
| **PriceHistory Module** | |
| PriceHistoryDetailModal | `.../PriceHistory/PriceHistoryDetailModal.tsx` |
| StatsGrid | `.../PriceHistory/components/StatsGrid.tsx` |
| PeriodSelector | `.../PriceHistory/components/PeriodSelector.tsx` |
| CompareToggles | `.../PriceHistory/components/CompareToggles.tsx` |
| ChartLegend | `.../PriceHistory/components/ChartLegend.tsx` |
| PriceHistoryChart | `.../PriceHistory/components/PriceHistoryChart.tsx` |
| InsightsPanel | `.../PriceHistory/components/InsightsPanel.tsx` |
| PriceRecordList | `.../PriceHistory/components/PriceRecordList.tsx` |
| **Recipe Module** | |
| RecipeManager | `src/features/recipes/components/RecipeManager/index.tsx` |
| RecipeDetailPage | `src/features/recipes/components/RecipeDetailPage/index.tsx` |
| PageHeader | `src/features/recipes/components/RecipeDetailPage/PageHeader.tsx` |
| RecipeTabs | `src/features/recipes/components/RecipeDetailPage/RecipeTabs.tsx` |
| **Recipe Editor Tabs** | |
| BasicInformation | `src/features/recipes/components/RecipeEditor/BasicInformation/index.tsx` |
| PrimaryInfo | `src/features/recipes/components/RecipeEditor/BasicInformation/PrimaryInfo.tsx` |
| InstructionEditor | `src/features/recipes/components/RecipeEditor/InstructionEditor.tsx` |
| ProductionSpecs | `src/features/recipes/components/RecipeEditor/ProductionSpecs.tsx` |
| LabelRequirements | `src/features/recipes/components/RecipeEditor/LabelRequirements.tsx` |
| StorageProtocols | `src/features/recipes/components/RecipeEditor/StorageProtocols.tsx` |
| StationEquipment | `src/features/recipes/components/RecipeEditor/StationEquipment.tsx` |
| QualityStandards | `src/features/recipes/components/RecipeEditor/QualityStandards.tsx` |
| AllergenControl | `src/features/recipes/components/RecipeEditor/AllergenControl.tsx` |
| MediaManager | `src/features/recipes/components/RecipeEditor/MediaManager.tsx` |
| TrainingModule | `src/features/recipes/components/RecipeEditor/TrainingModule.tsx` |
| VersionHistory | `src/features/recipes/components/RecipeEditor/VersionHistory.tsx` |

---

## When to Add

Add diagnostic paths to:
- ✅ Major feature components
- ✅ Tab content components
- ✅ Complex sub-components that might be hard to locate
- ❌ Small utility components
- ❌ Shared/generic components

---

*Created: Session 63 (2026-01-17)*
