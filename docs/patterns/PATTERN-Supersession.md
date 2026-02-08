# Platform Pattern: Supersession

> **Nothing is ever silently erased. Everything is superseded, linked, and preserved.**

---

## The Pattern

When a record is replaced by a newer version, the original is **superseded** — not deleted, not overwritten, not archived into oblivion. The old record and the new record are linked in both directions, creating an unbreakable chain of custody.

This is ChefLife's foundational data integrity pattern. It appears everywhere a record can be "replaced" or "started over."

---

## The Shape

Every supersedable record carries these fields:

```
superseded_at     TIMESTAMPTZ     -- NULL = current/active
superseded_by     UUID/FK         -- Points forward to the replacement
supersedes_id     UUID/FK         -- Points backward to what was replaced
```

### The Rules

1. **`superseded_at IS NULL`** = this is the active record
2. **`superseded_at IS NOT NULL`** = this record was replaced — grayed out, never deleted
3. **`superseded_by`** = forward link — "I was replaced by this record"
4. **`supersedes_id`** = backward link — "I replaced this record"
5. Both directions are always set. No orphaned links. No one-way references.

### The Constraint

```sql
-- Only one active record per entity at any time
CONSTRAINT one_active UNIQUE (entity_id) WHERE (superseded_at IS NULL)
```

---

## Implementations

### 1. Vendor Invoices (ImportWorkspace)
The original implementation. When an invoice is re-imported or corrected:

| Field | Value |
|---|---|
| Old invoice | `superseded_at = now()`, `superseded_by = new_invoice_id` |
| New invoice | `supersedes_id = old_invoice_id` |
| UI | Old invoice grayed out with "Superseded" badge, link to replacement |
| Deletion | Never. "Superseded imports are grayed out but never deleted." |

### 2. Allergen Declarations (Recipe Versioning)
When a recipe version bump invalidates the current declaration:

| Field | Value |
|---|---|
| Old declaration | `superseded_at = now()`, `superseded_by = new_declaration_id` |
| New declaration | `supersedes_id = old_declaration_id`, pinned to new `recipe_version` |
| UI | Old declaration in version history with "Superseded" badge |
| Public portal | Only shows `superseded_at IS NULL` — the current declaration |

### 3. Recipe Reissue (Version History)
When a recipe is fundamentally rebuilt and needs a fresh version history:

| Field | Value |
|---|---|
| Old recipe | `status = 'archived'`, `superseded_by = new_recipe_id` |
| New recipe | `supersedes_id = old_recipe_id`, starts at `v1.0.0` |
| UI | Lineage note: "Reissued from [Recipe Name] v3.2.1" |
| Old recipe | Forward reference: "Superseded by [New Recipe Name]" |
| Version history | Old recipe's full history preserved. New recipe starts clean. |

### 4. Policies (Compliance Shield) — Future
When a workplace policy is fundamentally rewritten:

| Field | Value |
|---|---|
| Old policy | `superseded_at = now()`, `superseded_by = new_policy_id` |
| New policy | `supersedes_id = old_policy_id`, fresh version `v1.0.0` |
| UI | Old policy archived with full acknowledgment history intact |
| Team | New policy triggers fresh acknowledgment cycle |

---

## UI Treatment

The superseded state is **always visible, always quiet**:

- **Active record**: Normal rendering
- **Superseded record**: Grayed out (`text-gray-500`, `opacity-60`), "Superseded" badge
- **Forward link**: "Superseded by [Name]" — clickable, navigates to replacement
- **Backward link**: "Reissued from [Name] vX.Y.Z" — clickable, navigates to original
- **Never hidden**: Superseded records appear in history views, audit trails, exports
- **Never deletable**: No UI affordance exists to permanently remove a superseded record

---

## The Query Pattern

### Get current active record
```sql
SELECT * FROM [table]
WHERE entity_id = $1
AND superseded_at IS NULL;
```

### Get full chain for an entity
```sql
WITH RECURSIVE chain AS (
  SELECT * FROM [table] WHERE id = $1
  UNION ALL
  SELECT t.* FROM [table] t
  JOIN chain c ON t.id = c.supersedes_id
)
SELECT * FROM chain ORDER BY created_at ASC;
```

### Audit: show all records including superseded
```sql
SELECT * FROM [table]
WHERE entity_id = $1
ORDER BY created_at DESC;
-- superseded_at IS NOT NULL = historical
-- superseded_at IS NULL = current
```

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---|---|
| Delete old records | Supersede them |
| Overwrite in place | Create new record, link both directions |
| Archive without forward link | Always set `superseded_by` on the old record |
| Allow "clear history" | Offer "Retire & Reissue" with full lineage |
| Show only active records | Show full chain with superseded records grayed |
| Let users permanently erase | No affordance for permanent deletion exists |

---

## Why This Matters

1. **Audit readiness**: Regulators, lawyers, and accountants can trace any record to its origin
2. **Incident response**: "What was the allergen declaration on March 15th?" has an answer
3. **Team trust**: Nobody can silently erase a mistake — corrections are transparent
4. **Data integrity**: The chain never breaks, even across recipe reissues and policy rewrites
5. **Legal protection**: The operator can prove what was declared, when, by whom

---

## Connected Documents

- [PROMISE-Nothing-Erased.md](../promises/PROMISE-Nothing-Erased.md) — The commitment behind this pattern
- [PROMISE-Audit-Trail.md](../promises/PROMISE-Audit-Trail.md) — Financial traceability
- [L7-DATA-PROMISE.md](../L7-DATA-PROMISE.md) — Data integrity philosophy
- [ALLERGEN-DECLARATION-ARCHITECTURE.md](../ALLERGEN-DECLARATION-ARCHITECTURE.md) — Declaration supersession
- [ARCHITECTURE-NEXUS.md](../ARCHITECTURE-NEXUS.md) — Event logging for supersession actions

---

*Pattern Documented: February 7, 2026*
*Status: Active — implemented in ImportWorkspace, architected for Recipes, Declarations, Policies*
*Category: 🏗️ Core Platform Architecture*
