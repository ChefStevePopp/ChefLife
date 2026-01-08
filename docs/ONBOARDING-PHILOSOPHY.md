# ChefLife Onboarding Philosophy

> "People over profit, smiles over savings, compassion over commerce"

This document guides all "first run" UX decisions in ChefLife.

---

## Core Principle

**Respect the operator's time.** They've got a lunch rush. They've got a new hire who didn't show. They don't have time for 47 setup screens.

ChefLife should work on Day 1 with minimal setup, then grow with them when THEY'RE ready.

---

## The Two Buckets

### What You Need (Required)
Absolute minimum to start:
- Organization name
- Timezone
- At least one admin user

That's it. Everything else has sensible defaults.

### When You're Ready (Optional)
Available immediately, no pressure:
- Customize operational variables
- Enable Team Performance
- Set up Communications
- Configure Print Manager
- Connect Integrations
- Dive into Reports

**No gates. No guilt. No "you must complete setup to continue."**

---

## Sensible Defaults

Every operational variable ships with industry-standard values:

| Category | Default Examples |
|----------|------------------|
| Weight Measures | g, kg, oz, lb |
| Volume Measures | ml, L, tsp, tbsp, cup, fl oz |
| Storage Areas | Walk-in Cooler, Dry Storage, Line |
| Kitchen Stations | Grill, Prep, Pantry, Dish |
| Shelf Life Options | 1 Day, 3 Days, 5 Days, 7 Days |

Users can:
- Use defaults as-is ✓
- Add their own custom items ✓
- Deactivate defaults they don't use ✓
- Never delete system defaults (data integrity) ✗

---

## Progressive Disclosure

### Empty States
Every empty state should:
1. Explain what this feature does
2. Show the benefit of using it
3. Offer a clear CTA to get started
4. Never make the user feel behind

**Good:**
```
No templates yet

Create email templates to send personalized 
communications to your team.

[Create First Template]
```

**Bad:**
```
⚠️ Setup Incomplete

You must create templates before continuing.

[Create Template] (required)
```

### Info Sections
Expandable by default, not in-your-face:
```
ℹ️ About Operations (click to expand)
```

For new users, consider auto-expanding on first visit:
```
if (!hasVisitedOperations) {
  setIsInfoExpanded(true);
  markAsVisited('operations');
}
```

---

## The Admin Lifecycle

Setup flows naturally through the Organization section:

```
1. Company Settings    "Who you are"
   └─ Name, industry, location, timezone
   └─ 5 minutes, one time

2. Operations          "Your language"  
   └─ Measurements, storage, vendors, categories
   └─ Defaults work, customize when ready

3. Modules             "What you need"
   └─ Enable features that fit your operation
   └─ Start with one, add more later

4. Integrations        "Who you connect with"
   └─ 7shifts, Square, etc.
   └─ Skip entirely if not needed

5. Activity Log        "What's happening"
   └─ Always there, always watching
   └─ Peace of mind, not setup
```

**This is a journey, not a checklist.**

---

## Module Activation Philosophy

### Core Modules (Always On)
- Recipe Manager — The kitchen brain
- Print Manager — Output configuration

These are foundational. You can't run a kitchen without recipes or the ability to print a prep list.

### Optional Modules (Enable When Ready)
- Team Performance — When you're ready to track and coach
- Communications — When you need team messaging
- HACCP — When food safety tracking matters
- Reports & Insights — When you want to see trends

**Each module works independently.** Enabling Team Performance doesn't require Communications. They complement each other but never block each other.

---

## First Run Indicators

Show progress without pressure:

```tsx
// Good: Informative, not demanding
<div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg">
  <AlertCircle className="w-4 h-4 text-amber-400" />
  <span className="text-sm text-amber-400">
    3/5 areas configured
  </span>
</div>

// Bad: Creates anxiety
<div className="bg-red-500/20 p-4 rounded-lg">
  ⚠️ SETUP INCOMPLETE - Some features won't work
</div>
```

---

## Copy & Tone

### Welcome Messages
- Warm, not corporate
- Helpful, not pushy
- Brief, not overwhelming

**Good:**
> "Let's get your kitchen set up. This takes about 5 minutes."

**Bad:**
> "Welcome to ChefLife Enterprise Restaurant Management Platform. Please complete the following mandatory configuration steps to unlock full functionality."

### Empty States
- Explain the benefit
- Offer one clear action
- Never blame the user

**Good:**
> "No team members yet. Add your first team member to start building your roster."

**Bad:**
> "Error: No team members found. Please add team members to use this feature."

### Completion Messages
- Celebrate small wins
- Point to next steps gently
- Never say "finally" or imply they were slow

**Good:**
> "Operations configured! Your kitchen vocabulary is ready. You can always adjust these in Settings."

---

## Implementation Checklist

When building any new feature, ask:

- [ ] What's the absolute minimum needed to start?
- [ ] What sensible defaults can we provide?
- [ ] Is the empty state helpful and inviting?
- [ ] Does the info section explain without overwhelming?
- [ ] Can they skip this and come back later?
- [ ] Does the UI show progress without pressure?
- [ ] Is the copy warm and respectful of their time?

---

## Anti-Patterns to Avoid

1. **Wizard fatigue** — Don't make them click through 12 screens
2. **Required fields everywhere** — Only require what's truly required
3. **Modal hell** — One modal max, prefer inline editing
4. **Guilt copy** — Never imply they're doing it wrong
5. **Feature gates** — Don't lock features behind setup completion
6. **Timestamp pressure** — "Created 47 days ago, still not complete"
7. **Red badges** — Save red for actual errors, not incomplete setup

---

## The Memphis Fire Test

Before shipping any onboarding flow, ask:

> "If I was slammed on a Friday night and had 10 minutes 
> to set this up before service, would this respect my time?"

If yes, ship it.
If no, simplify.

---

*Last updated: January 8, 2026*
