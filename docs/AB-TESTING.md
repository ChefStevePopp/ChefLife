# A/B Testing System

> **Proliferation and evolution without destruction.**
> Build multiple versions, compare them in real-world context, pick the winner. Zero risk to production users.

---

## Overview

ChefLife's A/B testing system allows developers to create and compare component variants without affecting production users. The system is gated behind the **Dev Management → Show Diagnostics** toggle.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         A/B TESTING FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   useDiagnostics()                                                      │
│        │                                                                │
│        ▼                                                                │
│   showDiagnostics = true?                                               │
│        │                                                                │
│   ┌────┴────┐                                                           │
│   │   YES   │────► useVariantTesting() ────► Show VariantToggle        │
│   └────┬────┘              │                        │                   │
│        │                   ▼                        ▼                   │
│   ┌────┴────┐      Read localStorage        User picks variant         │
│   │   NO    │              │                        │                   │
│   └────┬────┘              ▼                        ▼                   │
│        │           Return activeVariant      Save to localStorage       │
│        ▼                   │                        │                   │
│   Default variant          └────────────────────────┘                   │
│   (production)                                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Files

| File | Purpose |
|------|---------|
| `src/hooks/useVariantTesting.ts` | Core hook for variant state management |
| `src/hooks/useDiagnostics.ts` | Dev mode toggle (gates A/B visibility) |
| `src/components/ui/VariantToggle.tsx` | UI component for variant selection |

---

## Usage

### 1. Import the hook and component

```tsx
import { useVariantTesting } from "@/hooks/useVariantTesting";
import { VariantToggle } from "@/components/ui/VariantToggle";
```

### 2. Initialize in your component

```tsx
const {
  activeVariant,    // Current selected variant (string)
  setVariant,       // Function to change variant
  showToggle,       // Boolean - true only when diagnostics ON
  variants,         // Array of variant options
} = useVariantTesting(
  "ComponentName",           // Unique identifier (used for localStorage key)
  ["original", "compact"],   // Variant options (as const for type safety)
  "original"                 // Default for production users
);
```

### 3. Render the toggle (dev users only)

```tsx
{showToggle && (
  <VariantToggle
    componentName="ComponentName"
    variants={[...variants]}
    activeVariant={activeVariant}
    onVariantChange={setVariant}
    labels={{ original: "Original", compact: "Compact" }}
  />
)}
```

### 4. Conditionally render variants

```tsx
{activeVariant === "compact" ? (
  <CompactVersion {...props} />
) : (
  <OriginalVersion {...props} />
)}
```

---

## Complete Example

```tsx
import React from "react";
import { useVariantTesting } from "@/hooks/useVariantTesting";
import { VariantToggle } from "@/components/ui/VariantToggle";
import { VendorSelectorOriginal } from "./VendorSelectorOriginal";
import { VendorSelectorCompact } from "./VendorSelectorCompact";

export const VendorSelector: React.FC<Props> = (props) => {
  // A/B Testing setup
  const {
    activeVariant,
    setVariant,
    showToggle,
    variants,
  } = useVariantTesting(
    "VendorSelector",
    ["original", "compact"] as const,
    "original"
  );

  return (
    <div>
      {/* Toggle - only visible to dev users */}
      {showToggle && (
        <VariantToggle
          componentName="VendorSelector"
          variants={[...variants]}
          activeVariant={activeVariant}
          onVariantChange={setVariant}
          labels={{ original: "Original", compact: "Compact" }}
        />
      )}

      {/* Render active variant */}
      {activeVariant === "compact" ? (
        <VendorSelectorCompact {...props} />
      ) : (
        <VendorSelectorOriginal {...props} />
      )}
    </div>
  );
};
```

---

## API Reference

### `useVariantTesting<T>(componentName, variants, defaultVariant)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `componentName` | `string` | Unique identifier for localStorage key |
| `variants` | `T[]` | Array of variant identifiers |
| `defaultVariant` | `T` | Default variant for production users |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `activeVariant` | `T` | Currently active variant |
| `setVariant` | `(variant: T) => void` | Function to change variant |
| `showToggle` | `boolean` | Whether to show the toggle UI |
| `variants` | `T[]` | Original variants array |
| `componentName` | `string` | Original component name |

### `VariantToggle<T>` Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `componentName` | `string` | Yes | Display name for the toggle |
| `variants` | `T[]` | Yes | Array of variant options |
| `activeVariant` | `T` | Yes | Currently selected variant |
| `onVariantChange` | `(variant: T) => void` | Yes | Callback when variant changes |
| `labels` | `Record<T, string>` | No | Friendly labels for variants |

---

## Best Practices

### Naming Conventions

```tsx
// Component name should match the file/component being tested
useVariantTesting("VendorSelector", ...)      // ✅ Good
useVariantTesting("vendor-selector", ...)     // ❌ Avoid kebab-case
useVariantTesting("HeaderVariant", ...)       // ❌ Don't add "Variant" suffix
```

### Variant Naming

```tsx
// Use descriptive, lowercase names
["original", "compact", "minimal"]            // ✅ Good
["v1", "v2", "v3"]                            // ❌ Not descriptive
["Original", "Compact"]                       // ❌ Avoid capitals
```

### When to Use A/B Testing

| Use Case | Use A/B Testing? |
|----------|------------------|
| Major layout changes | ✅ Yes |
| New component design | ✅ Yes |
| Experimental features | ✅ Yes |
| Bug fixes | ❌ No |
| Minor styling tweaks | ❌ No |
| Performance optimizations | ❌ No |

### Lifecycle

1. **Create** new variant alongside original
2. **Test** both variants in real-world context
3. **Decide** which performs better
4. **Promote** winner to default (or only) variant
5. **Remove** losing variant and A/B code

---

## Storage

Variant choices are persisted to `localStorage` with the key pattern:

```
cheflife-variant-{ComponentName}
```

Example:
```
cheflife-variant-VendorSelector = "compact"
```

---

## Visual Indicator

The `VariantToggle` component displays:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🧪 VendorSelector:  [Original] [Compact]                              │
└─────────────────────────────────────────────────────────────────────────┘
```

- Purple flask icon (🧪) = experimental/testing
- Purple background = dev-only feature
- Active variant = solid purple button
- Inactive variants = gray buttons

---

## Current A/B Tests

| Component | Variants | Default | Status |
|-----------|----------|---------|--------|
| `VendorSelector` | original, compact | original | 🔄 Active |

---

## Adding a New A/B Test

1. Create the new variant component
2. Add `useVariantTesting` hook to parent
3. Add `VariantToggle` UI (gated by `showToggle`)
4. Add conditional render for variants
5. Document in this file under "Current A/B Tests"
6. Test with diagnostics enabled
7. Gather feedback, make decision
8. Clean up losing variant

---

## Related Documentation

- `docs/L5-BUILD-STRATEGY.md` - Design system reference
- `src/hooks/useDiagnostics.ts` - Dev mode toggle
- `docs/ROADMAP.md` - Feature roadmap

---

*Created: January 15, 2026*
*Pattern: Proliferation and evolution without destruction.*
