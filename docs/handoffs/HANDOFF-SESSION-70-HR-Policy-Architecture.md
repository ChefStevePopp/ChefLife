# HANDOFF — Sessions 68-70: HR Policy & Compliance Module
## Architecture + CategoryManager + PolicyCard Visual Refinement + btn-soft

**Sessions:** 68-70  
**Dates:** February 3-4, 2026  
**Focus:** HR & Policies module — from Claude Code review to commercial architecture  
**Status:** Roadmap complete, UI shipped, Phase 1 ready to begin

---

## What Happened (3-Session Arc)

### Session 68 (Feb 3 afternoon) — HR Module Review + CategoryManager Build

**Windows-MCP server installed** — Claude now has direct filesystem access via Chrome extension.

**HR Module Code Review** — Claude Code had built the HR Settings module. Technically competent but missing "ChefLife soul":
- Copy was flat/corporate ("Manage policies, job descriptions...")  
- No L5 header pattern, no expandable info, no diagnostics
- PolicyCard was a text list — no visual entity presence
- Category system was disconnected from policies

**CategoryManager Built** — Full L5/L6 CRUD component:
- Baseball card grid layout with cover images
- Round badge buttons (edit/delete) over hero
- Image upload with `optimizeImage()` utility (WebP, 512px max)
- Drag-to-reorder with color/icon selection
- Category resolution for PolicyCard display

**Image Optimization Utility** — `src/shared/utils/imageOptimization.ts`
- Native Canvas API, no dependencies
- WebP output at configurable quality (default 0.82)
- Max dimension constraint (512px for categories)
- Documented in UTILS.md

### Session 69 (Feb 3 evening) — Schema Collision Fix + Storage

**Critical Bug Fix** — Policy data was being corrupted:
- Root cause: `policyList` array and `policies` settings object sharing the same `policies` key in JSONB
- Fix: Separated to `policyList` (array) and `policies` (settings) keys
- SQL migration to rescue orphaned policy data
- Merge protection in Settings save handler

**Storage Bucket** — `category-covers` bucket configured in Supabase:
- RLS policies for org-scoped read/write
- Path pattern: `{org_id}/{filename}`

### Session 70 (Feb 4) — Roadmap Architecture + PolicyCard Visual Refinement + btn-soft

**ROADMAP-Policy.md** — Comprehensive commercial architecture document:
- Full lifecycle: draft → publish → acknowledge → test → certify → audit → retire
- CategoryManager audit (7 issues found including image remove bug, missing aria-labels)
- JSONB→relational migration decision with volume projections (1,000 orgs)
- Three new tables: `policies`, `policy_acknowledgments`, `certifications`
- Template library as product differentiator (20+ Ontario starter templates)
- 9 implementation phases mapped
- 9 architecture decision records
- Product and technical KPIs defined

**PolicyCard → Visual Entity Card:**
- Hero area with aspect-[16/10] matching CategoryManager baseball cards
- Category cover image with dual gradient overlays (dark top for badges, dark bottom for title)
- Category badge, version pill, Active status overlaid on hero
- Image quality bumped from 256px → 512px (was pixelating at card render width)

**L5 Color Hierarchy Corrections:**
- Active badge: raw `green-500` → `emerald` (L5 positive state)
- Acknowledgment "Required": `green-400` → `emerald-400`
- View PDF button: hardcoded `indigo-600` → `primary`
- Role pills: `blue-500` → `primary`

**Competency Language (not paperwork jargon):**
- "Ack required" → "Requires completion" (amber, ClipboardCheck icon)
- "180 Days" → "Renews every 180 days"
- "ACKNOWLEDGMENT" header → "COMPLETION"
- "RECERTIFICATION" header → "RENEWAL"
- `getRecertificationLabel()` refactored to return null when not required

**CTA Visual Weight Reduction:**
- View PDF: solid primary → `btn-soft-primary` (present but quiet)
- Edit: hand-rolled → `btn-ghost` (system class)
- Delete: neutral at rest, rose reveal on hover
- Applicability pills: colored → "go-away grey" (unified `bg-gray-700/50`)

**`btn-soft` Design System Addition** — New button tier in `index.css`:
- Fills the gap between `btn-primary` (solid CTA) and `btn-ghost` (transparent)
- Tinted fill + colored border at rest, deeper tint on hover
- Seven variants: base gray, primary, emerald, amber, rose, purple, cyan
- All inherit `btn` base (gap, padding, rounded-xl, font-medium, transitions, focus rings)
- Fully documented with hierarchy comment block

---

## Files Modified

### Components
| File | Changes |
|------|---------|
| `src/features/admin/components/sections/HRSettings/components/PolicyCard.tsx` | Hero area, dual gradients, L5 colors, competency language, btn-soft-primary, go-away grey pills |
| `src/features/admin/components/sections/HRSettings/components/CategoryManager.tsx` | Baseball card grid, image upload, 512px optimization, reorder, color/icon selection |
| `src/features/admin/components/sections/HRSettings/index.tsx` | Grid layout `sm:grid-cols-2 lg:grid-cols-3 gap-4` |

### Design System
| File | Changes |
|------|---------|
| `src/index.css` | Added `btn-soft` family (7 variants) between ghost and primary tiers |

### Utilities
| File | Changes |
|------|---------|
| `src/shared/utils/imageOptimization.ts` | New utility — Canvas API WebP compression |

### Documentation
| File | Changes |
|------|---------|
| `docs/roadmaps/ROADMAP-Policy.md` | New — 9-phase commercial architecture |
| `docs/UTILS.md` | Updated — optimizeImage() documented |

### Database
| File | Changes |
|------|---------|
| Supabase migration (run manually) | policyList/policies key separation, orphan rescue |
| Supabase Storage | `category-covers` bucket with RLS |

---

## Button Hierarchy (New System)

| Tier | Class | At Rest | Hover | Use For |
|------|-------|---------|-------|---------|
| **Solid** | `btn-primary` | Filled, white text | Deeper fill | Page-level CTAs |
| **Soft** | `btn-soft-{color}` | Tinted fill + colored border | Deeper tint | Card actions, secondary CTAs |
| **Ghost** | `btn-ghost-{color}` | Transparent, gray border | Color reveals | Tertiary, toolbar actions |

Colors available: primary, emerald, amber, rose, purple, cyan (+ base gray for each tier)

---

## L5 Color Hierarchy (HR Module)

| Color | Semantic | Examples |
|-------|----------|----------|
| **Emerald** | Positive state | Active badge, completion met, verified |
| **Amber** | Attention needed | Requires completion, pending, overdue |
| **Primary** | Interactive actions | View PDF, hover states, role pills |
| **Cyan** | Informational | Renewal schedule, metadata |
| **Rose** | Destructive | Delete (reveals on hover) |
| **Gray** | Metadata/quiet | Applicability pills, inactive elements |

---

## PolicyCard Visual Hierarchy (Final)

1. **Hero image dominates** — B&W editorial photography, aspect-[16/10]
2. **Title anchors** — overlaid on hero bottom via gradient
3. **Body strip informs** — effective date, completion status, renewal interval
4. **Expandable details fade** — description, completion/renewal, applicability, authorship
5. **Actions reveal on interaction** — btn-soft-primary (View PDF), btn-ghost (Edit), neutral→rose (Delete)

---

## Architecture Decisions (from ROADMAP-Policy.md)

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-001 | Relational tables for policies | JSONB can't index, can't FK, can't audit at scale |
| ADR-002 | Categories stay JSONB | Low volume, read-heavy, org-specific config |
| ADR-003 | Template library as product | Differentiator: no competitor offers Ontario-compliant templates |
| ADR-004 | Acknowledgment = first-class entity | Not JSONB, not a flag — full table with timestamps |
| ADR-005 | PDF storage in Supabase | Already working, org-scoped paths |
| ADR-006 | Version = new row | Don't mutate — create new version, archive old |
| ADR-007 | Competency language | "Completion" not "acknowledgment", "renewal" not "recertification" |
| ADR-008 | Team-facing is separate UI | Not admin screens — dedicated read/sign experience |
| ADR-009 | Template bundles > individual | "Ontario Restaurant Starter" pack, not 20 separate templates |

---

## 9-Phase Implementation Roadmap (Summary)

| Phase | Focus | Key Deliverable |
|-------|-------|----------------|
| 1 | Relational Foundation | `policies` table, migration from JSONB, RLS |
| 2 | Publishing Workflow | Draft → Published → Archived states |
| 3 | Acknowledgment Tracking | `policy_acknowledgments` table, sign experience |
| 4 | Compliance Dashboard | Real data: completion rates, overdue, expiring |
| 5 | Versioning | New version creates new row, re-acknowledgment triggers |
| 6 | Assessments | Quiz/test after policy read, pass/fail tracking |
| 7 | Certifications | External credential tracking (Food Handler, WHMIS) |
| 8 | Template Library | Ontario starter templates, industry bundles |
| 9 | Automation | Auto-reminders, scheduled publishing, escalation |

**Full details in:** `docs/roadmaps/ROADMAP-Policy.md`

---

## Known Issues / Technical Debt

1. **Existing category images are 256px** — need re-upload to get 512px quality
2. **CategoryManager image remove** — calls `removeImage()` but doesn't clear from Supabase Storage
3. **Missing aria-labels** — CategoryManager edit/delete buttons need accessible labels
4. **No keyboard navigation** — CategoryManager cards not keyboard-accessible
5. **Delete button** — custom styled (neutral→rose hover), not yet a system class like `btn-ghost-rose-reveal`
6. **Midjourney prompts created** — for B&W editorial category photos (not yet generated)

---

## Next Session: Phase 1 — Relational Foundation

**Goal:** Migrate policies from JSONB to relational table

**Tasks:**
1. Create `policies` table (see ROADMAP-Policy.md §5 for schema)
2. Write idempotent migration to move existing JSONB policies → rows
3. Add RLS policies (standard org-scoped pattern)
4. Update PolicyCard to read from new table
5. Update PolicyUploadForm to write to new table
6. Verify CategoryManager still works (categories stay JSONB)
7. Create `policy_acknowledgments` table (empty, ready for Phase 3)

**Or:** Continue with other ChefLife priorities — Recipe Editor remaining tabs, IngredientsInput Production/Method, mobile responsive pass.

---

*Created: February 4, 2026*
*Sessions: 68 (HR Review + CategoryManager) → 69 (Schema Fix) → 70 (Roadmap + PolicyCard + btn-soft)*
