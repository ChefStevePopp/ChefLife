# PROMISE: Nothing Is Ever Silently Erased

> *"Gray but never gone."*

---

## The Promise

**No record in ChefLife is ever silently erased. Not a version, not a declaration, not an invoice, not a policy acknowledgment. If it existed, it still exists — superseded, linked, and preserved.**

This isn't a technical constraint. It's a moral one.

---

## Why This Promise Exists

### Because Natasha Died

In 2016, Natasha Ednan-Laperouse died from an allergic reaction to sesame in a sandwich that wasn't labeled. If the allergen declaration had been versioned, if the ingredient change had been tracked, if someone could have asked "what changed and when?" — the chain might not have broken.

ChefLife's allergen declarations are versioned. Every ingredient change is tracked. Every declaration is signed with a UUID. The chain never breaks.

### Because Trust Is Built on Transparency

When a chef's bonus depends on food cost numbers, those numbers need a paper trail. When a team member is disciplined based on policy violations, the policy version they acknowledged needs to exist. When an inspector asks "what was your allergen declaration on this date?" — the answer can't be "we cleared that and started over."

Every correction, every update, every "oops" is a supersession — not an erasure. The old record links to the new one. The new one links back. Both directions. Always.

### Because People Forget

Six months from now, nobody remembers why the recipe changed. Nobody remembers that the old allergen declaration listed egg but the new one doesn't. Nobody remembers that the policy was rewritten in January.

But the system remembers. Because the system never erases.

---

## What This Means for Operators

### You Can Always Start Fresh
"Retire & Reissue" gives you a clean version history without destroying the old one. The new recipe starts at `v1.0.0`. The old recipe is archived with a forward link. Both exist forever.

### You Can Always Look Back
Every superseded record is visible in history views. Grayed out, clearly labeled "Superseded," but there. Click through to see what it was, when it was active, who created it.

### You Can Never Accidentally Destroy
There is no "Delete All Versions" button. There is no "Clear History" option. There is no "Start Over" that silently wipes the slate. These affordances do not exist because the promise forbids them.

### You Can Always Prove
"Show me the allergen declaration that was active on March 15th."
"Show me the invoice that established this price."
"Show me the policy version this employee acknowledged."

Every question has an answer. Every answer has a timestamp, a UUID, and a chain.

---

## The Supersession Chain

```
Record v1 (created Jan 1)
    │
    └── superseded_at: Feb 15
        superseded_by: Record v2
    
Record v2 (created Feb 15)
    │
    ├── supersedes_id: Record v1
    └── superseded_at: NULL (current)
```

Forward and backward. Always both. The chain is the promise.

---

## Where This Lives

| Domain | What's Preserved | Why It Matters |
|---|---|---|
| **Vendor Invoices** | Every import, every correction | Financial audit trail |
| **Recipe Versions** | Every MAJOR.MINOR.PATCH bump | Operational continuity |
| **Allergen Declarations** | Every signed declaration | Customer safety — Natasha's Promise |
| **Recipe Reissues** | Full history of retired recipe | Lineage and accountability |
| **Policies** | Every version, every acknowledgment | ESA compliance, dispute resolution |

---

## The Line We Draw

Other systems make deletion easy. "Clear all." "Start fresh." "Delete history." It feels clean. It feels simple.

It's a lie.

Clean data isn't data with the messy parts removed. Clean data is data where every mess is documented, linked, and preserved — so you can prove how you got from there to here.

**ChefLife doesn't delete your history. ChefLife *is* your history.**

---

## For the Team Building ChefLife

When you build a new feature that replaces or updates existing records:

1. Never add a "delete" button for historical data
2. Always implement the [Supersession Pattern](../patterns/PATTERN-Supersession.md)
3. Always link both directions — forward and backward
4. Always show superseded records in history views — gray but visible
5. Always ask: "If someone needs to prove what was here before, can they?"

If the answer to #5 is no, the feature isn't done.

---

## The Tagline

> **"We don't erase your history. We help you build on it."**

---

*Promise Documented: February 7, 2026*
*Category: 🛡️ Protection — Platform Foundation*
*Connected Pattern: [PATTERN-Supersession.md](../patterns/PATTERN-Supersession.md)*
*Connected Promises: [PROMISE-Audit-Trail.md](./PROMISE-Audit-Trail.md), [Natasha's Promise](../ALLERGEN-DECLARATION-ARCHITECTURE.md)*
*Connected Architecture: [L7-DATA-PROMISE.md](../L7-DATA-PROMISE.md)*
