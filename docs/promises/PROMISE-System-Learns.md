# PROMISE: The System Learns, So You Do Less

> *"Teach it once, never again."*

---

## The Problem

Restaurant operators enter the same information over and over:

- Same categories for similar products
- Same common names for vendor variations
- Same skip decisions for non-food items
- Same patterns, repeated infinitely

Traditional software treats every entry as brand new. Your 500th "Chicken Thighs" categorization is exactly as much work as your first.

**Your expertise goes in, but nothing comes back out.**

---

## Why Existing Solutions Fail

### Static Systems
- No memory between sessions
- No learning from patterns
- Every entry starts from zero
- "Dumb" software that never improves

### Template Approaches
- Pre-built templates don't match YOUR operation
- Customization requires technical skills
- Templates become outdated
- One-size-fits-none

### The Wasted Knowledge
Every operator builds mental models:
- "GFS pork products go in Proteins > Pork"
- "Anything with 'sauce' is Dry Goods"
- "Code starting with 99 is equipment, skip it"

**This knowledge lives in their head, not the system.**

---

## The ChefLife Way

### Every Decision Trains the Model

```
You categorize:
  "GFS Pork Back Ribs 32-38oz" → Proteins > Pork, Common Name: "Back Ribs"

System learns:
  - "Pork" in description → likely Proteins > Pork
  - "Ribs" → likely Common Name contains "Ribs"
  - GFS item patterns
  
Next time:
  "GFS Baby Back Ribs Fresh 15ct" → 
  💡 Suggested: Proteins > Pork, Common Name: "Back Ribs" (92% confidence)
```

### Confidence Builds Over Time

| Repetitions | System Behavior |
|-------------|-----------------|
| 1-5 | No suggestions, learning |
| 5-20 | Suggestions offered |
| 20-50 | High-confidence suggestions |
| 50+ | Auto-classify with review |

### Your Corrections Improve It

When suggestions are wrong:
- You correct it
- System learns from the correction
- That pattern improves
- Fewer wrong suggestions next time

---

## The Benefit

### For Daily Operations
- Import that took 30 minutes → 5 minutes
- New items: two keystrokes instead of fifteen fields
- Review queue instead of blocking workflow

### For Onboarding
- New staff benefit from your accumulated knowledge
- "The system already knows how we categorize things"
- Training time reduced dramatically

### For the Industry
- Your patterns help the next ChefLife customer
- GFS naming conventions learned across all users
- Rising tide lifts all boats

---

## The Proof

### Memphis Fire Backfill
- 5 years of GFS invoices
- ~1,000+ categorization decisions
- Training data created as byproduct of real work
- Model ready to suggest by invoice #50

### Metrics to Track
- Suggestions accepted vs. corrected
- Time per new item (should decrease)
- Auto-classification accuracy
- User satisfaction with suggestions

---

## Implementation Phases

### Phase 1: Capture (Building Now)
- Log every categorization decision
- Store vendor description → Common Name mappings
- Record category selections with context
- Build the training dataset

### Phase 2: Suggest
- Pattern matching on vendor descriptions
- Common Name autocomplete from existing
- Category suggestions based on keywords
- "Similar items were categorized as..."

### Phase 3: Auto-Classify
- High-confidence items auto-categorized
- User reviews and approves batch
- Corrections feed back into model
- Continuous improvement

### Phase 4: Cross-Tenant Learning
- Anonymized patterns shared across customers
- New user benefits from community knowledge
- Vendor-specific models (GFS, Sysco, etc.)
- Industry-wide intelligence

---

## Connected Features

| Feature | Contribution |
|---------|--------------|
| **Common Name Field** | The linking language for ML |
| **Import Quick-Add** | Capture point for training data |
| **Pending Items Queue** | Batch processing with suggestions |
| **Category Autocomplete** | Surface learned patterns |
| **Code Groups** | Pattern recognition for vendor codes |

---

## The Tagline

> **"Every decision you make teaches ChefLife. So you can go home."**

---

## Technical Components

### Training Data Capture
```typescript
ml_training_mappings
├── vendor_id
├── vendor_description
├── common_name
├── major_group
├── category  
├── sub_category
├── confidence (1.0 for human-verified)
├── created_by
└── created_at
```

### Suggestion Engine
```typescript
interface Suggestion {
  common_name: string;
  category_path: string[];
  confidence: number;
  similar_items_count: number;
  reasoning: string; // "47 similar GFS items mapped this way"
}
```

### Feedback Loop
```typescript
ml_training_feedback
├── suggestion_id
├── accepted: boolean
├── correction: json (if not accepted)
├── created_by
└── created_at
```

---

## The Bottom Line

**Your expertise shouldn't disappear when you close the laptop.**

ChefLife captures what you know, learns from how you work, and gives that knowledge back—to you, to your team, to every operator who comes after.

The more you use it, the less you do.

---

*Promise Documented: January 10, 2026*
*Category: ⏱️ Time*
*Status: Building (Phase 1: Capture)*
*Connected Roadmap: ROADMAP-Data.md*
