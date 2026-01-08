# Communications Module - Field Registry Architecture

**Date:** January 7, 2026  
**Status:** L5 Architecture Complete  
**Philosophy:** Build once, sell forever

---

## Summary

Refactored the Communications Module from scattered hardcoded field definitions to a **single source of truth** architecture. Adding a new merge field is now **one line of code**.

---

## The Problem We Solved

Before this refactor, field definitions were scattered across:

| File | What It Had |
|------|-------------|
| `mergeEngine.ts` | 80+ line `FIELD_MAP` object |
| `MergeFieldsReference.tsx` | Hardcoded arrays of fields with samples |
| `TemplatePreview.tsx` | Duplicate `buildRealContext()` function |
| `contextBuilder.ts` | Another field structure definition |

**Result:** Adding one field meant editing 4 files. Maintenance nightmare.

---

## The Solution: Field Registry

```
┌─────────────────────────────────────────────────────────────────┐
│                    fieldRegistry.ts                              │
│                 (Single Source of Truth)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FIELD_REGISTRY: FieldDefinition[] = [                         │
│    {                                                            │
│      tag: "First_Name",                                         │
│      category: "recipient",                                     │
│      dataPath: "recipient.first_name",                         │
│      type: "string",                                           │
│      description: "First name",                                │
│      sampleValue: "Marcus",                                    │
│    },                                                           │
│    // ... 50+ more fields                                       │
│  ]                                                              │
│                                                                 │
│  Consumers:                                                     │
│  ├── MergeFieldsReference.tsx (reads categories & fields)      │
│  ├── mergeEngine.ts (resolves tags → data paths)               │
│  ├── contextBuilder.ts (uses same paths)                       │
│  └── Future: validation, custom fields UI                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Adding a New Field (The Whole Process)

```typescript
// fieldRegistry.ts - ADD ONE OBJECT:
{
  tag: 'Schedule_Link',
  category: 'period',
  dataPath: 'schedule.link',
  type: 'string',
  description: 'Link to weekly schedule',
  sampleValue: 'https://7shifts.com/schedule/...',
},
```

**That's it.** The field now:
- ✅ Appears in MergeFieldsReference UI
- ✅ Works in merge engine
- ✅ Has correct sample value in previews
- ✅ Shows in correct category with correct icon

---

## Field Registry API

### Data Exports

```typescript
import { 
  FIELD_REGISTRY,      // Array of all field definitions
  FIELD_CATEGORIES,    // Category metadata (id, label, icon, color)
} from '@/lib/communications';
```

### Helper Functions

```typescript
import {
  getFieldsByCategory,     // Get all fields in a category
  getFieldByTag,          // Get field definition by tag
  getDataPath,            // Get data path for a tag
  getCategory,            // Get category metadata
  buildFieldMap,          // Build tag→path map (for merge engine)
  getAllTags,             // Get all registered tags
  isRegisteredTag,        // Check if tag is registered
  getSampleValue,         // Get sample value for a tag
  getDefaultValue,        // Get default value for a tag
  detectUnregisteredFields, // Find unregistered fields in template
} from '@/lib/communications';
```

### Types

```typescript
import type {
  FieldDefinition,    // Full field definition
  FieldCategory,      // Category ID type
  CategoryDefinition, // Category metadata type
  FieldType,          // string | number | date | percentage | currency | email
  FieldTransform,     // none | uppercase | lowercase | capitalize | date_short | ...
} from '@/lib/communications';
```

---

## Current Field Categories

| Category | Icon | Color | Field Count |
|----------|------|-------|-------------|
| recipient | User | sky-400 | 5 |
| performance | TrendingUp | amber-400 | 7 |
| history | History | violet-400 | 14 |
| time_off | Thermometer | rose-400 | 7 |
| period | Calendar | purple-400 | 18 |
| organization | Building2 | emerald-400 | 2 |

**Total: 53 fields** registered and working.

---

## UI Polish Applied

### Custom Recipient Dropdown (L5 - No Emojis)
- Lucide-based tier indicators using filled `Circle` icons
- Emerald (T1), Amber (T2), Rose (T3) colors
- Search/filter functionality
- Position shown below name
- Check mark for selected item

### Historical Period Selector
For review-type emails that reference past weeks:

| Option | Value | Use Case |
|--------|-------|----------|
| This Week | 0 | Current week data |
| Last Week | -1 | **Default** - Review emails |
| 2 Weeks Ago | -2 | Delayed reviews |
| 3 Weeks Ago | -3 | Monthly summaries |
| 4 Weeks Ago | -4 | Extended lookback |

### Date Format Selector
Users can choose how dates render in templates:

| Format | Example |
|--------|----------|
| ISO | 2026-01-05 |
| Short | Jan 5, 2026 |
| Long | January 5, 2026 |
| With Day | Mon, Jan 5 |
| Friendly | Monday, January 5 |

### Performance Card
- Shows `1 (Priority)` format (number + label)
- Week label adapts to selected period ("This Week" vs "Last Week")

### Day_X_Info - Now Live!
Pulls from the Point Audit Ledger (performance events):

| Day Event | Display |
|-----------|----------|
| No events | "Good" |
| tardiness_minor | "Late (5-15 min) (+1)" |
| tardiness_major | "Late (15+ min) (+2)" |
| no_call_no_show | "No Call/No Show (+6)" |
| stay_late | "Stayed Late (-1)" |
| cover_shift_urgent | "Covered Shift (Urgent) (-2)" |

Event types are mapped to human-friendly labels with point values shown.

### Schedule Data Notice
- Changed from amber warning to sky-blue info
- Explains that Day_X_Info shows Point Audit events, not schedule data
- "Good" = no attendance events that day

### Template Editor - Complete Rewrite

**Merge Field Highlighting:**
- Custom `HighlightedEditor` component with transparent textarea over styled `<pre>`
- Merge fields (`«Field_Name»`) highlighted in amber with background
- Real-time highlighting as you type
- Maintains edit functionality while showing syntax colors

**Layout Toggle:**
- Side-by-side (default): Code left, Preview + Merge Fields right
- Stacked: Full-width code, then merge fields, then preview
- Toggle button in editor controls

**Simplified Preview:**
- Removed RecipientSelector - always uses sample data (Marcus Chen)
- Real data preview available in Full Preview page
- Scroll sync between code and preview (percentage-based)

**New Merge Fields:**
- `«Points_Gained_This_Week»` - Events that added points
- `«Points_Lost_This_Week»` - Reductions that removed points  
- `«Attend_Points_This_Week»` - Net change (gained - lost)

---

## Files Modified

| File | Changes |
|------|---------|
| `fieldRegistry.ts` | **NEW** - Single source of truth, added Points_Gained/Lost fields |
| `TemplatePreview.tsx` | Full real data integration, historical periods, date formats |
| `TemplateEditor.tsx` | **REWRITTEN** - Merge field highlighting, layout toggle, simplified preview |
| `mergeEngine.ts` | Uses registry for path resolution, updated sample context |
| `MergeFieldsReference.tsx` | Reads from registry, no more hardcoded arrays |
| `types.ts` | Added points_gained/lost_this_week to PerformanceContext |
| `index.ts` | Exports registry functions and types |

---

## Merge Resolution Priority

The merge engine resolves fields in this order:

1. **Explicit Mappings** - Per-template overrides from `email_template_fields` table
2. **Field Registry** - Standard fields defined in `fieldRegistry.ts`
3. **Fallback Heuristics** - Auto-guess based on field name patterns
4. **Missing Behavior** - blank | preserve | error (configurable)

---

## Future Enhancements (Ready For)

### Custom Fields UI
```typescript
// Detect unregistered fields in a template
const unregistered = detectUnregisteredFields(template.html_template);
// Returns: ['Custom_Field_1', 'My_Special_Value']

// Show UI to map them → save to email_template_fields table
```

### Schedule Integration
```typescript
// Add to registry when 7shifts integration is complete:
{
  tag: 'Day_1_Shift',
  category: 'period',
  dataPath: 'schedule.days.0.shift',
  type: 'string',
  description: 'Monday shift details',
  sampleValue: '4pm-10pm (Grill)',
},
```

### Per-Organization Custom Fields
```typescript
// Future: Load org-specific fields from database
const orgFields = await getOrganizationFields(orgId);
const allFields = [...FIELD_REGISTRY, ...orgFields];
```

---

## Testing Checklist

### Field Registry
- [ ] Open Template Editor → Merge Fields panel shows all 6 categories
- [ ] Click a field → Copies with `«tag»` format
- [ ] Create template with `«First_Name»` → Preview shows "Marcus" (sample) or real name
- [ ] Add new field to registry → Appears everywhere automatically

### Template Preview - Recipient Dropdown
- [ ] Click dropdown → Opens with search box
- [ ] Type to filter team members
- [ ] Each member shows Lucide Circle dot (emerald/amber/rose)
- [ ] Position shown below name
- [ ] Sample option shows User icon (no tier dot)
- [ ] Selected item shows checkmark

### Template Preview - Period Selector
- [ ] Default is "Last Week" (for review emails)
- [ ] Change to "This Week" → Dates update (Reporting_Start, Week_Label, etc.)
- [ ] Change to "2 Weeks Ago" → Shows dates from 2 weeks prior
- [ ] Data Summary card updates period label

### Template Preview - Date Format
- [ ] Select "ISO" → Dates show as 2026-01-05
- [ ] Select "Short" → Dates show as Jan 5, 2026
- [ ] Select "Long" → Dates show as January 5, 2026
- [ ] Select "With Day" → Dates show as Mon, Jan 5
- [ ] Verify Reporting_Start in preview reflects selected format

### Data Flow
- [ ] Select real team member → All data populates correctly
- [ ] "Live Data" badge appears
- [ ] Refresh button reloads performance data
- [ ] Info banner (sky-blue) explains Day_X_Info source

### Day_X_Info Fields
- [ ] Days with no events show "Good"
- [ ] Days with tardiness show "Late (5-15 min) (+1)" format
- [ ] Days with reductions show "Stayed Late (-1)" format
- [ ] Multiple events on same day combine with commas
- [ ] Sample data shows realistic event examples

### Template Editor - Highlighting
- [ ] Paste HTML with merge fields → Fields highlight in amber
- [ ] Type `«First_Name»` → Highlights as you close the guillemet
- [ ] Edit existing field → Highlighting updates
- [ ] Large HTML (10k+ chars) → Still responsive

### Template Editor - Layout
- [ ] Default layout is side-by-side on wide screens
- [ ] Click Stack button → Changes to vertical layout
- [ ] Click Side by Side → Returns to horizontal
- [ ] Merge fields panel visible in both layouts

### Template Editor - Preview
- [ ] Preview shows "Sample: Marcus Chen"
- [ ] No RecipientSelector dropdown visible
- [ ] Preview updates as you edit HTML
- [ ] Full Preview button navigates to full preview page

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          TEMPLATE EDITOR                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────┐        ┌─────────────────────────────────────┐  │
│  │ MergeFieldsReference│        │ Live Preview                        │  │
│  │ (reads registry)    │        │                                     │  │
│  │                     │        │  ┌─────────────────────────────┐   │  │
│  │ 📁 Recipient (5)    │        │  │ mergeTemplate()             │   │  │
│  │   «First_Name»      │───────>│  │ (uses registry for paths)  │   │  │
│  │   «Email»           │        │  │                             │   │  │
│  │                     │        │  │ "Hi «First_Name»!"          │   │  │
│  │ 📁 Performance (7)  │        │  │         ↓                   │   │  │
│  │   «Current_Points»  │        │  │ "Hi Marcus!"                │   │  │
│  │   «Tier_Label»      │        │  └─────────────────────────────┘   │  │
│  │                     │        │                                     │  │
│  │ 📁 Time Off (7)     │        │  ┌─────────────────────────────┐   │  │
│  │   «Sick_Remain»     │        │  │ RecipientSelector           │   │  │
│  │                     │        │  │ 🟢 Marcus Chen              │   │  │
│  └────────────────────┘        │  │ 🟡 Jane Smith               │   │  │
│                                 │  │ 🔴 Bob Wilson               │   │  │
│                                 │  └─────────────────────────────┘   │  │
│                                 └─────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │    fieldRegistry.ts     │
                        │  (Single Source of Truth)│
                        │                         │
                        │  53 fields defined      │
                        │  6 categories           │
                        │  Helper functions       │
                        └─────────────────────────┘
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/communications/fieldRegistry.ts` | Field definitions & helpers |
| `src/lib/communications/mergeEngine.ts` | Template rendering |
| `src/lib/communications/contextBuilder.ts` | Real data context building |
| `src/lib/communications/index.ts` | Public API exports |
| `src/features/.../MergeFieldsReference.tsx` | UI field picker |
| `src/features/.../TemplatePreview.tsx` | Full preview page |
| `src/features/.../TemplateEditor.tsx` | Editor with live preview |
