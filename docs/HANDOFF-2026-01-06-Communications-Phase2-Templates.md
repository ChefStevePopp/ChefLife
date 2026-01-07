# Handoff: Communications Module - Phase 2: Template Management
**Date:** January 6, 2026  
**Status:** Ready to Build  
**Prerequisite:** Phase 1 Complete ✅

---

## Overview

Build the Template Management UI — the core feature that lets operators create, edit, preview, and manage email templates within ChefLife.

**Philosophy:** Templates are organization-owned. Operators paste their HTML (from BeeFree, Canva, etc.), map merge fields, and ChefLife handles the rest.

---

## Routes to Create

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/modules/communications/templates` | TemplateList | List all templates |
| `/admin/modules/communications/templates/new` | TemplateEditor | Create new template |
| `/admin/modules/communications/templates/:id` | TemplateEditor | Edit existing template |
| `/admin/modules/communications/templates/:id/preview` | TemplatePreview | Preview with sample data |
| `/admin/modules/communications/history` | SendHistory | View send logs (Phase 3) |

---

## Component Specifications

### 1. TemplateList (`/templates`)

**Layout:** L5 card-based list with filtering and search

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    Email Templates                    [+ New Template]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Search...]  [Category ▼]  [Status ▼]  [Sort: Recent ▼]       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📧 Weekly Performance Digest                      ●Active│   │
│  │ Sent every Sunday at 6pm to all team members            │   │
│  │ Category: Performance  •  Last sent: Jan 5  •  142 sent │   │
│  │                                        [Edit] [Preview] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📧 New Hire Welcome                              ●Active│   │
│  │ Triggered when team member is added                      │   │
│  │ Category: HR  •  Last sent: Dec 28  •  3 sent           │   │
│  │                                        [Edit] [Preview] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📧 Tier Change Notification                     ○Draft  │   │
│  │ Sent when team member tier changes                       │   │
│  │ Category: Performance  •  Never sent                     │   │
│  │                                        [Edit] [Preview] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Search by name/description
- Filter by category (Performance, HR, Operations, General)
- Filter by status (Active, Draft, Archived)
- Sort by name, last sent, created date
- Quick actions: Edit, Preview, Duplicate, Archive
- Stats: Total sent, last sent date

**Data Source:**
```typescript
const { data: templates } = await supabase
  .from('email_templates')
  .select(`
    *,
    send_count:email_send_log(count),
    last_sent:email_send_log(sent_at)
  `)
  .eq('organization_id', organizationId)
  .order('updated_at', { ascending: false });
```

---

### 2. TemplateEditor (`/templates/new` and `/templates/:id`)

**Layout:** Two-column editor with live preview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    New Template / Edit: Weekly Digest              [Save] [Preview] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐  ┌───────────────────────────────────────┐│
│  │ TEMPLATE DETAILS            │  │ LIVE PREVIEW                          ││
│  │                             │  │                                       ││
│  │ Name *                      │  │  ┌─────────────────────────────────┐  ││
│  │ [Weekly Performance Digest] │  │  │                                 │  ││
│  │                             │  │  │  [Rendered HTML Preview]        │  ││
│  │ Description                 │  │  │                                 │  ││
│  │ [Sent every Sunday...]     │  │  │  Hi Jane!                       │  ││
│  │                             │  │  │                                 │  ││
│  │ Category                    │  │  │  Your week at Memphis Fire:     │  ││
│  │ [Performance ▼]            │  │  │  Points: 0                      │  ││
│  │                             │  │  │  Tier: 1                        │  ││
│  │ Subject Line *              │  │  │  ...                            │  ││
│  │ [Your Week at «Org_Name»]  │  │  │                                 │  ││
│  │                             │  │  └─────────────────────────────────┘  ││
│  │ ─────────────────────────── │  │                                       ││
│  │                             │  │  Sample Data: [Jane Smith ▼]         ││
│  │ HTML Content *              │  │                                       ││
│  │ ┌───────────────────────┐  │  └───────────────────────────────────────┘│
│  │ │ <html>                │  │                                           │
│  │ │ <body>                │  │                                           │
│  │ │ Hi «First_Name»!      │  │                                           │
│  │ │ ...                   │  │                                           │
│  │ └───────────────────────┘  │                                           │
│  │                             │                                           │
│  │ [Detect Fields]            │                                           │
│  │                             │                                           │
│  │ DETECTED FIELDS (4)        │                                           │
│  │ ┌─────────────────────────┐│                                           │
│  │ │ «First_Name»     ✓ Auto ││                                           │
│  │ │ «Points»         ✓ Auto ││                                           │
│  │ │ «Current_Tier»   ✓ Auto ││                                           │
│  │ │ «Custom_Field»   ⚠ Map  ││                                           │
│  │ └─────────────────────────┘│                                           │
│  │                             │                                           │
│  └─────────────────────────────┘                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Sections:**

#### A. Template Details
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | text | Yes | Internal reference name |
| Description | textarea | No | What this template is for |
| Category | select | No | Performance, HR, Operations, General |
| Subject Line | text | Yes | Supports merge fields |
| Recipient Type | select | No | individual, managers, all_team, custom |
| Send Mode | select | No | manual, scheduled, triggered |

#### B. HTML Content
- Monaco Editor or CodeMirror with HTML syntax highlighting
- "Paste from BeeFree" button (strips unnecessary wrapper)
- Character/line count
- Syntax validation

#### C. Field Detection
- **"Detect Fields" button** — Scans HTML for `«Field»` or `{{field}}` patterns
- Shows list of detected fields
- Auto-mapped fields show ✓
- Unmapped fields show ⚠ with mapping UI

#### D. Field Mapping (for unmapped fields)
```
┌────────────────────────────────────────────────────────────┐
│ «Custom_Field»                                             │
│                                                            │
│ Data Source: [recipient ▼]                                │
│ Data Path:   [custom.field_name    ]                      │
│ Transform:   [None ▼]                                     │
│ Default:     [N/A                  ]                      │
│                                                            │
│                                      [Save Mapping]        │
└────────────────────────────────────────────────────────────┘
```

#### E. Live Preview
- Renders HTML with sample data
- Dropdown to select sample recipient (from team members)
- Auto-updates as HTML changes (debounced)
- Shows subject line preview too

---

### 3. TemplatePreview (`/templates/:id/preview`)

**Full-page preview with send test option**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Editor    Preview: Weekly Digest    [Send Test] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Subject: Your Week at Memphis Fire BBQ                    │
│  To: jane.smith@example.com                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [Full rendered email in iframe]                    │   │
│  │                                                     │   │
│  │                                                     │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Sample Recipient: [Jane Smith ▼]                          │
│                                                             │
│  Merge Context (JSON):                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {                                                   │   │
│  │   "recipient": { "first_name": "Jane", ... },      │   │
│  │   "performance": { "points": 0, "tier": 1 },       │   │
│  │   ...                                               │   │
│  │ }                                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Operations

### Create Template
```typescript
const { data, error } = await supabase
  .from('email_templates')
  .insert({
    organization_id: organizationId,
    name: formData.name,
    description: formData.description,
    category: formData.category,
    subject_template: formData.subject,
    html_template: formData.html,
    recipient_type: formData.recipientType,
    send_mode: formData.sendMode,
    is_active: true,
    created_by: userId,
  })
  .select()
  .single();
```

### Save Field Mappings
```typescript
// After detecting fields, save mappings
const fields = detectFields(html, syntax);

for (const field of fields) {
  await supabase
    .from('email_template_fields')
    .upsert({
      template_id: templateId,
      field_tag: field.tag,
      data_source: field.source,
      data_path: field.path,
      transform: field.transform,
      default_value: field.defaultValue,
    }, {
      onConflict: 'template_id,field_tag',
    });
}
```

---

## Merge Engine Integration

### Detect Fields
```typescript
import { detectFields } from '@/lib/communications';

const fields = detectFields(htmlContent, 'guillemets');
// Returns: [{ tag: '«First_Name»', suggested_path: 'recipient.first_name' }, ...]
```

### Preview Merge
```typescript
import { mergeTemplate, getSampleContext } from '@/lib/communications';

const sampleContext = getSampleContext(teamMemberId);
const previewHtml = mergeTemplate(htmlTemplate, sampleContext, {
  syntax: 'guillemets',
  missingFieldBehavior: 'placeholder', // Shows [MISSING: field_name]
});
```

---

## Sample Data for Preview

```typescript
// src/lib/communications/sampleData.ts

export function getSampleContext(teamMember?: TeamMember): MergeContext {
  return {
    recipient: {
      id: teamMember?.id || 'sample-id',
      first_name: teamMember?.first_name || 'Jane',
      last_name: teamMember?.last_name || 'Smith',
      email: teamMember?.email || 'jane@example.com',
      hire_date: teamMember?.hire_date || '2023-06-15',
    },
    organization: {
      name: 'Memphis Fire BBQ',
      timezone: 'America/Toronto',
    },
    performance: {
      current_points: 0,
      current_tier: 1,
      points_this_week: 0,
      reductions_this_week: 0,
      attendance_period_pct: 98.5,
    },
    time_off: {
      sick_days_used: 1,
      sick_days_remaining: 2,
      vacation_hours_used: 0,
      vacation_hours_available: 40,
    },
    period: {
      name: 'Q1 2026',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      week_of: 'January 6, 2026',
    },
  };
}
```

---

## File Structure

```
src/features/admin/components/sections/Communications/
├── index.ts                    # Exports
├── TemplateList.tsx           # List all templates
├── TemplateEditor.tsx         # Create/edit template
├── TemplatePreview.tsx        # Full preview page
├── components/
│   ├── TemplateCard.tsx       # Card in list view
│   ├── FieldDetector.tsx      # Detect & map fields
│   ├── FieldMapper.tsx        # Map single field
│   ├── HtmlEditor.tsx         # Code editor for HTML
│   ├── LivePreview.tsx        # Real-time preview
│   └── RecipientSelector.tsx  # Sample data selector
└── hooks/
    ├── useTemplate.ts         # Single template CRUD
    ├── useTemplates.ts        # List with filters
    └── useFieldMappings.ts    # Field detection/mapping
```

---

## Routes Update

```typescript
// src/features/admin/routes/AdminRoutes.tsx

// Add these routes
<Route path="modules/communications/templates" element={<TemplateList />} />
<Route path="modules/communications/templates/new" element={<TemplateEditor />} />
<Route path="modules/communications/templates/:id" element={<TemplateEditor />} />
<Route path="modules/communications/templates/:id/preview" element={<TemplatePreview />} />
```

---

## L5 Design Tokens

```typescript
// Consistent with existing L5 patterns

// Status pills
const statusClasses = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  archived: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

// Category badges
const categoryClasses = {
  performance: 'bg-amber-500/20 text-amber-400',
  hr: 'bg-purple-500/20 text-purple-400',
  operations: 'bg-sky-500/20 text-sky-400',
  general: 'bg-gray-500/20 text-gray-400',
};

// Action buttons (L5 pills)
const actionPillClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200';
```

---

## Testing Checklist

- [ ] Create new template
- [ ] Edit existing template
- [ ] Detect merge fields from HTML
- [ ] Map unmapped fields
- [ ] Preview with sample data
- [ ] Preview with real team member data
- [ ] Send test email from preview
- [ ] Duplicate template
- [ ] Archive template
- [ ] Filter/search templates
- [ ] Validation (required fields, valid HTML)

---

## Stretch Goals (Phase 2.5)

- [ ] Template versioning (keep history of changes)
- [ ] Import from URL (fetch HTML from BeeFree hosted link)
- [ ] Template categories with icons
- [ ] Bulk operations (archive multiple)
- [ ] Template sharing between organizations (system templates)

---

## Dependencies

- Phase 1 complete ✅
- `email_templates` table deployed ✅
- `email_template_fields` table deployed ✅
- Merge engine working ✅

---

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/communications/mergeEngine.ts` | Field detection & template rendering |
| `src/lib/communications/types.ts` | EmailTemplate, TemplateField types |
| `supabase/migrations/20260106000000_create_communications_module.sql` | Schema |
| `HANDOFF-2026-01-06-Communications-Module.md` | Phase 1 docs |
