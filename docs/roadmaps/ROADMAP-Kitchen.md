# Kitchen Section Roadmap

> Recipe Manager, Task Manager, HACCP, Checks & Specs

---

## Current State (January 2026)

### Recipe Manager ✅
- [x] Recipe CRUD with ingredients
- [x] Recipe costing calculations
- [x] Scaling/portioning
- [x] Print layouts
- [x] Recipe categories & search
- [x] Recipe Viewer shell (10-tab structure)
- [x] L5 tab color progression
- [x] HeroHeader with major group badges
- [x] Configurable sourcing instructions

### Recipe Viewer - L5/L6 Overhaul 🔄
- [x] Tab system using `.tab` CSS class
- [x] Overview tab - dashboard card grid
- [x] Ingredients tab - mise en place UX
  - [x] Tap-to-check verification
  - [x] Batch scaling (½×, 1×, 2×, 3×, 4×)
  - [x] Common measure display (not R/U)
  - [x] Allergen badges per ingredient
  - [x] Progress tracking
- [ ] Method tab - step-by-step with timers
- [ ] Production tab - batch workflows
- [ ] Storage tab - location and shelf life
- [ ] Quality tab - standards and photos
- [ ] Allergens tab - safety display
- [ ] Equipment tab - required tools
- [ ] Training tab - skill requirements
- [ ] Media tab - photos and videos

### HACCP Manager 🔄
- [x] Temperature logging
- [x] Board of Health (shared with Company Settings)
- [ ] Digital food safety logs
- [ ] Corrective action workflows

### Task Manager 📋
- [ ] Daily prep lists
- [ ] Station checklists
- [ ] Completion tracking

### Checks & Specs 📋
- [ ] Opening/closing checklists
- [ ] Station specs
- [ ] Equipment checks

---

## Q1 2026

### Recipe Viewer Completion (Priority)
- [ ] Method tab with timer integration
- [ ] Production tab for batch cooking
- [ ] Storage tab with location callouts
- [ ] Quality tab with photo standards
- [ ] Allergens tab with safety protocols
- [ ] Equipment tab with required tools
- [ ] Training tab with skill levels
- [ ] Media tab gallery

### Ingredients Tab Enhancements
- [ ] Storage location per ingredient
- [ ] Prep state indicators (room temp, thawed)
- [ ] Lead time alerts (pull butter 1hr before)
- [ ] Substitution notes (when 86'd)
- [ ] Quality indicators (ripe avocado)
- [ ] CCP/safety flags (raw protein handling)

### Recipe Manager Enhancements
- [ ] Recipe versioning (track changes over time)
- [ ] Batch cooking workflows
- [ ] Ingredient substitutions with cost impact
- [ ] Recipe scaling calculator improvements
- [ ] Video/image attachments
- [ ] Nutrition calculation integration

### HACCP Completion
- [ ] Complete temperature log interface
- [ ] Cooling logs with time tracking
- [ ] Receiving logs
- [ ] Corrective action forms
- [ ] HACCP plan builder
- [ ] Audit-ready report generation

---

## Q2 2026

### Task Manager Build
- [ ] Daily task templates
- [ ] Station-based assignment
- [ ] Completion tracking with timestamps
- [ ] Manager oversight dashboard
- [ ] Integration with Team Performance (points for completion)

### Checks & Specs Build
- [ ] Checklist builder
- [ ] Photo verification
- [ ] Deviation alerts
- [ ] Historical compliance reports

---

## Q3 2026

### Kitchen Display System (KDS)
- [ ] Real-time order display
- [ ] Prep prioritization
- [ ] Station routing
- [ ] Timing/pacing tools
- [ ] Integration with POS systems

### Production Planning
- [ ] Par level management
- [ ] Waste tracking
- [ ] Yield analysis
- [ ] Prep scheduling based on forecast

---

## Technical Debt & Polish

- [x] L5 design audit on Recipe Viewer tabs
- [x] Configurable org-level messaging (sourcing instructions)
- [ ] Mobile-responsive recipe viewer (iPad portrait primary)
- [ ] Offline capability for temperature logs
- [ ] Batch printing improvements
- [ ] Print stylesheets for Recipe Viewer

---

## Key Files

### Recipe Viewer
- `src/features/recipes/components/RecipeViewer/FullPageViewer.tsx` - Main shell
- `src/features/recipes/components/RecipeViewer/components/` - Tab components
- `src/features/recipes/hooks/useRecipeConfig.ts` - Module configuration

### Recipe Settings
- `src/features/admin/components/sections/RecipeSettings/index.tsx` - Config UI

### Design System
- `src/index.css` - L5 CSS classes (`.tab`, `.card`, `.subheader-*`)
- `docs/L5-BUILD-STRATEGY.md` - Design philosophy

---

## Recent Sessions

| Date | Focus | Handoff |
|------|-------|---------|
| 2026-01-24 | Recipe Viewer L5, Ingredients tab | `HANDOFF-2026-01-24-RecipeViewer-L5-Ingredients.md` |

---

*Last Updated: January 24, 2026*
*Section: Kitchen*
