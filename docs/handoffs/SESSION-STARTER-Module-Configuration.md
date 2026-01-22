# Session Starter: Module Configuration Architecture

**Session:** 63  
**Focus:** Build the Module Configurator pattern, then apply to Recipe Manager  
**Handoff:** `HANDOFF-Recipe-Manager-Module-Configuration.md`

---

## Context

We hit a pivotal architecture decision point. Recipe Manager's L5 polish is done (dynamic tabs, Food Relationships integration, header stats pills), but we paused before adding Import/Settings because:

> "Configuration should inform workflow, not the other way around."

We've been building user-facing features without establishing what's configurable. Now we need to:
1. Define the configuration model
2. Build the configuration UI  
3. Let that inform the user workflow

---

## What's Already Done

**Recipe Manager L5:**
- ✅ Dynamic tabs from Food Relationships (`is_recipe_type` flag)
- ✅ Tab colors follow L5 Design System
- ✅ Recipe card badges pull icon/name from Food Relationships
- ✅ Header stats pills (colored, horizontal, scales to 8)
- ✅ Expandable info with feature cards

**Open:**
- 🔲 Where does "Import" live? (Header button vs. config panel vs. both)
- 🔲 What settings does Recipe Manager need?
- 🔲 Module Configurator UI pattern

---

## Starting Point

**File to review first:**
```
src/features/admin/components/FeatureModules.tsx
```

This is the Feature Modules screen showing Core Features (Recipe Manager, Task Manager) and Add-ons. The kebab menu (⋮) on each module card should open configuration.

**Questions to answer:**
1. What happens when you click the kebab menu currently?
2. What configuration pattern should we use? (Modal? Slide-out? Dedicated page?)
3. What settings make sense for Recipe Manager?

---

## Suggested Session Flow

### Phase 1: Module Configurator Foundation (30 min)
1. Review Feature Modules screen current state
2. Design the configuration panel pattern
3. Implement Recipe Manager configuration panel shell

### Phase 2: Recipe Manager Settings (45 min)
1. Define settings model:
   - Import configuration (templates, default status, duplicate handling)
   - Default values (stations, storage areas, yield units)
   - Workflow rules (approval required, versioning)
2. Build settings UI
3. Wire to database

### Phase 3: Import Decision (15 min)
1. Based on settings model, decide Import button location
2. Implement connection (header shortcut → config panel if needed)

---

## Settings to Consider

**Import Settings:**
- Import source templates
- Default status for imported recipes (draft/approved)
- Duplicate detection rules

**Default Values:**
- Default stations
- Default storage areas  
- Default yield units
- Cost calculation method

**Workflow Rules:**
- Require approval before recipes go live?
- Version control settings
- Who can edit approved recipes?

---

## Reference Files

**Pattern references:**
- `src/features/admin/components/sections/VendorInvoice/components/VendorSettings.tsx` — Settings panel pattern
- `src/features/admin/components/sections/FoodRelationshipsManager/index.tsx` — L5 header + info pattern

**Recipe Manager files:**
- `src/features/recipes/components/RecipeManager/RecipeManager.tsx` — Main component (L5 done)
- `src/features/recipes/components/RecipeImportModal/` — Current import (may need rework)

---

## Success Criteria

By end of session:
1. ✅ Module Configurator pattern defined and documented
2. ✅ Recipe Manager settings panel implemented (at least shell)
3. ✅ Import location decided with rationale
4. ✅ Clear path to complete Recipe Manager in future session

---

## Steve's Input Needed

Before diving in:
1. **Import frequency:** How often do you import recipes at Memphis Fire? Daily? Monthly? One-time migration?
2. **Import sources:** What formats? Excel? Other software? Copy/paste?
3. **Settings priority:** What defaults would be most valuable to configure?

---

*This session establishes configuration-first architecture. Recipe Manager will be the first module to follow this pattern, then we apply it to others.*
