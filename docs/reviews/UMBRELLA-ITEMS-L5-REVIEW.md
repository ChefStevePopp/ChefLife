# Umbrella Items — L5 Review

**File:** `src/features/admin/components/sections/VendorInvoice/components/UmbrellaIngredientManager.tsx`  
**Date:** January 17, 2026  
**Status:** Functional, needs L5 polish

---

## Phase Audit

### Phase 1: Foundation ✅ Mostly Complete

| Requirement | Status | Notes |
|-------------|--------|-------|
| Route registered | ✅ | Tab in VIM |
| Folder structure | ✅ | Component exists |
| L5 subheader | ✅ | Rose icon, title, subtitle, stats |
| Loading skeleton | ⚠️ | **Uses spinner, not skeleton** |
| Empty state with CTA | ✅ | "Create First Umbrella Ingredient" |
| Basic data fetch | ✅ | Fetches umbrellas + ingredients |

**Fix needed:** Replace spinner with skeleton cards during load.

---

### Phase 1.2: Card Design ✅ Complete

| Requirement | Status | Notes |
|-------------|--------|-------|
| Card structure | ✅ | `bg-gray-800/50` cards |
| Status pills | ⚠️ | No status (Active/Draft/Archived) |
| Icon + title | ✅ | Umbrella icon + name |
| Metadata row | ✅ | Categories + linked ingredient pills |
| Action buttons | ✅ | Save, Link, Edit, Delete |
| Hover states | ✅ | Buttons have hover |

**Future:** Consider status pill for umbrellas without primary selected.

---

### Phase 2: Search & Filter ⚠️ Partial

| Requirement | Status | Notes |
|-------------|--------|-------|
| Search with debounce | ⚠️ | Has search, **no debounce** |
| Filter dropdowns | ❌ | **No category filter** |
| Sort dropdown | ❌ | **No sort** |
| Clear filters | ❌ | N/A (no filters) |
| Result count | ✅ | "Showing X of Y" |

**Fixes needed:**
1. Add 300ms debounce to search
2. Add filter by Major Group / Category
3. Add filter: "Needs Primary" vs "Complete"

---

### Phase 3: Pagination ⚠️ Needs Adjustment

| Requirement | Status | Notes |
|-------------|--------|-------|
| Items per page | ⚠️ | **5 per page (should be 10-12)** |
| Previous/Next | ✅ | Working |
| Page X of Y | ✅ | Working |
| Show all toggle | ❌ | Not implemented |
| Reset on filter | ⚠️ | Need to verify |

**Fix needed:** Increase `itemsPerPage` from 5 to 10.

---

### Phase 4: Sorting ❌ Missing

| Requirement | Status | Notes |
|-------------|--------|-------|
| Sort dropdown | ❌ | **Not implemented** |
| Asc/desc toggle | ❌ | N/A |
| Visual indicator | ❌ | N/A |
| Default sort | ⚠️ | DB order (created_at desc?) |

**Options to add:**
- Name A-Z
- Most Linked Items
- Recently Updated
- Needs Setup (no primary)

---

### Phase 5: Core Feature ✅ Complete

| Requirement | Status | Notes |
|-------------|--------|-------|
| Create umbrella | ✅ | Working |
| Edit umbrella | ✅ | Inline editing |
| Delete umbrella | ✅ | Working |
| Link ingredients | ✅ | Modal picker |
| Set primary | ✅ | Radio + Save button |
| Quick-create | ✅ | **NEW: Common name suggestions** |
| UMB- creation | ⚠️ | **Missing: Price not copied** |
| Save and Edit | ❌ | **Missing: Navigate to detail page** |

**Fixes needed:**
1. Copy `cost_per_recipe_unit` from primary to UMB-
2. Add "Save & Edit" button that navigates to `/admin/data/ingredients/{umbId}`

---

### Phase 6: Polish ⚠️ Partial

| Requirement | Status | Notes |
|-------------|--------|-------|
| Keyboard shortcuts | ❌ | None |
| Smooth animations | ⚠️ | Some transitions |
| Loading states | ⚠️ | Uses spinner |
| Toast notifications | ✅ | Working |
| Omega diagnostics | ✅ | `showDiagnostics` path |
| Accessibility | ⚠️ | Basic (needs audit) |
| Dropdown stability | ✅ | No issues observed |
| Form isolation | ⚠️ | Inline editing might cause re-renders |

**Fixes needed:**
1. Keyboard: Escape to collapse expanded, Enter to save
2. Replace spinner with skeleton pattern

---

### Phase 6.5: Beyond Expectations ⚠️ Partial

| Requirement | Status | Notes |
|-------------|--------|-------|
| Smart defaults | ✅ | **Common name quick-create** |
| Contextual insights | ✅ | Stats in header (Groups, Linked, Suggested) |
| Bulk operations | ❌ | No bulk link/unlink |
| Print/export | ❌ | No export |
| Intelligent suggestions | ✅ | Common name suggestions |
| Progressive enhancement | ⚠️ | Basic works, suggestions are bonus |
| Micro-celebrations | ❌ | No success animations |
| Zero-state guidance | ✅ | Empty state has explanation |

**Future enhancements:**
- Bulk link ingredients to umbrella
- Export umbrella groups as CSV
- "Umbrella audit" - find ingredients that could be grouped

---

## Priority Fixes

### High Priority (Functional)

1. **UMB- Price Copy** - ✅ FIXED
   - Location: `masterIngredientsStore.ts` → `setUmbrellaIngredientFromPrimary`
   - Now creates UMB- with all price data if doesn't exist
   - Updates existing UMB- with price data when re-saving primary

2. **Save & Edit Button** - After saving primary, option to edit UMB- ingredient
   - Add second button: "Save & Edit in Detail"
   - Navigate to `/admin/data/ingredients/{umbMasterIngredientId}`

### Medium Priority (L5 Polish)

3. **Loading Skeleton** - Replace spinner with skeleton cards
   ```tsx
   {isLoading ? (
     <div className="space-y-4">
       {[1,2,3].map(i => (
         <div key={i} className="card p-4 animate-pulse">
           <div className="h-6 bg-gray-700 rounded w-1/3 mb-2" />
           <div className="h-4 bg-gray-700 rounded w-1/2" />
         </div>
       ))}
     </div>
   ) : (...)}
   ```

4. **Search Debounce** - Add 300ms debounce
   ```tsx
   import { useDebounce } from "@/hooks/useDebounce";
   const [debouncedSearch] = useDebounce(searchTerm, 300);
   ```

5. **Pagination Size** - Change from 5 to 10
   ```tsx
   const [itemsPerPage] = useState(10);
   ```

### Low Priority (L5 Completeness)

6. **Filter by Category** - Add Major Group dropdown
7. **Sort Options** - Name, Linked Count, Recent
8. **Keyboard Shortcuts** - Escape, Enter, Arrow keys

---

## Current Flow Analysis

```
┌─────────────────────────────────────────────────────────────┐
│ UMBRELLA ITEMS (L5 Tab in VIM)                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Subheader: Icon + Title + Stats]                         │
│  Groups: 2  |  Linked: 4  |  ✨ 1 Suggested                │
│                                                             │
│  [Search] ________________  [+ Create Umbrella]            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🌂 Brisket                          [💾][🔗][✏️][🗑] │   │
│  │ FOOD > PROTEINS > BEEF                               │   │
│  │ ○ CARGIL BEEF BRISKET  ○ BEEF, BRISKET  [Show details]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Page 1 of 1                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ EXPANDED DETAILS                                            │
├─────────────────────────────────────────────────────────────┤
│ Linked Master Ingredients                    [+ Link New]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Product    | Code   | Vendor  | Price | Unit | $/Unit |○│ │
│ │ CARGIL...  | 222481 | FLANAG  | $X.XX | OZ   | $0.67  |●│ │
│ │ BEEF, BRI  | 1378676| GFS     | $X.XX | OZ   | $0.73  |○│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                   [Save Primary Ingredient] │
│                                                             │
│ MISSING: UMB- row should appear here after save!           │
│ MISSING: "Save & Edit" button to go to detail page         │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Flow

```
1. Create Umbrella (Quick-Create from Common Name)
   ├── INSERT umbrella_ingredients
   ├── For each ingredient with matching common_name:
   │   └── INSERT umbrella_ingredient_master_ingredients
   └── UI: Shows umbrella with linked ingredients

2. User Selects Primary (Radio Button)
   └── UI-only state change (not persisted yet)

3. User Clicks "Save Primary Ingredient"
   ├── UPDATE umbrella_ingredients.primary_master_ingredient_id
   ├── Copy allergens, categories from primary → umbrella
   ├── MISSING: Create UMB- master_ingredient if not exists
   ├── MISSING: Copy price data to UMB- ingredient
   └── MISSING: Link UMB- to umbrella

4. DESIRED: User Clicks "Save & Edit"
   ├── All of step 3
   └── Navigate to /admin/data/ingredients/{umbMasterIngredientId}
```

---

## Next Session Tasks

1. [ ] Fix price copy in `setUmbrellaIngredientFromPrimary`
2. [ ] Add UMB- creation on save primary (if not exists)
3. [ ] Add "Save & Edit" button with navigation
4. [ ] Replace spinner with skeleton
5. [ ] Add search debounce
6. [ ] Increase pagination to 10

---

*Review by: Claude + Steve*  
*Last updated: January 17, 2026*
