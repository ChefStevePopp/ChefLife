# Communications Module - Real Data Integration

**Date:** January 7, 2026  
**Status:** Ready for Testing

---

## Summary

Upgraded the Template Editor AND Template Preview from dummy/sample data to **full real data integration**. Operators can now preview email templates with actual team member information including:

- **Recipient** - Name, email, position, hire date
- **Performance** - Current points, tier, coaching stage, weekly stats
- **Time Off** - Sick days used/remaining, vacation hours
- **Periods** - Current period label, late count, absences
- **Rolling History** - Prev1, Prev2, Prev3 period labels

---

## What Was Built

### 1. Context Builder (`src/lib/communications/contextBuilder.ts`)

New module that builds `MergeContext` from real database data:

```typescript
import { buildMergeContext, buildQuickContext, getAvailableRecipients } from '@/lib/communications';

// Full async context builder (fetches from DB)
const context = await buildMergeContext(teamMemberId, organizationId);

// Quick sync builder (uses pre-loaded data)
const context = buildQuickContext(teamMember, performanceData, orgName);

// Get available team members for selector
const members = await getAvailableRecipients(organizationId);
```

**Data Sources:**
- `organization_team_members` → Recipient context
- `usePerformanceStore` → Points, tier, coaching stage
- `activity_logs` → Sick days used (via performance store)
- `organizations` → Org name, timezone

### 2. Recipient Selector (`src/features/admin/.../components/RecipientSelector.tsx`)

L5-styled dropdown for choosing preview subjects:

- Search/filter team members
- Shows position and tier badges
- Integrates with `usePerformanceStore` for live tier data
- "Sample Data" option for generic preview

### 3. Updated Template Editor

Enhanced with real data preview:

- **Recipient Selector** in preview header
- **Real-time context building** from performance store
- **Data source indicator** showing who's being previewed
- **Refresh button** to reload latest performance data
- **Tier/points badge** for real team members

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Template Editor                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐     ┌────────────────────────────────┐│
│  │ RecipientSelector   │────>│ Selected: Marcus Chen (T1)     ││
│  └─────────────────────┘     └────────────────────────────────┘│
│            │                              │                      │
│            ▼                              ▼                      │
│  ┌─────────────────────┐     ┌────────────────────────────────┐│
│  │ usePerformanceStore │────>│ buildQuickContext()            ││
│  │ (team_performance)  │     │ - recipient info               ││
│  │                     │     │ - current_points: 2            ││
│  │                     │     │ - tier: 1                      ││
│  │                     │     │ - sick_days_used: 1            ││
│  └─────────────────────┘     └────────────────────────────────┘│
│                                           │                      │
│                                           ▼                      │
│                              ┌────────────────────────────────┐│
│                              │ mergeTemplate()                ││
│                              │ "Hi «First_Name»!"            ││
│                              │         ↓                      ││
│                              │ "Hi Marcus!"                   ││
│                              └────────────────────────────────┘│
│                                           │                      │
│                                           ▼                      │
│                              ┌────────────────────────────────┐│
│                              │ Live Preview (iframe)          ││
│                              │ [Rendered HTML with real data] ││
│                              └────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

- [ ] Open Template Editor (new or existing template)
- [ ] Verify "Sample Data (Marcus Chen)" is default selection
- [ ] Click recipient selector dropdown
- [ ] Verify team members load with tier badges
- [ ] Select a real team member
- [ ] Verify preview updates with real data
- [ ] Check data indicator shows correct info (name, position, tier, points)
- [ ] Click refresh button - verify data reloads
- [ ] Switch back to Sample Data - verify sample context used
- [ ] Test with template containing merge fields:
  - `«First_Name»` → Shows real/sample name
  - `«Current_Points»` → Shows real/sample points
  - `«Tier_Label»` → Shows "Priority/Standard/Probation"
  - `«Sick_Remain»` → Shows calculated remaining days

---

### 4. **Updated Template Preview** (`TemplatePreview.tsx`)

Full-page preview with complete real data integration:

**Data Summary Cards** - L5-styled cards showing:
- Recipient (name, position, email)
- Performance (points, tier, weekly stats)
- Time Off (sick used/remaining, vacation)
- Period (current label, late count, absences)
- Green dot indicator for real vs sample data

**Enhanced UI:**
- Dropdown shows tier badges (T1, T2, T3) next to names
- "Live Data" badge when viewing real data
- Refresh button to reload performance data
- Optgroup separating sample from team members

---

## Files Modified

| File | Changes |
|------|---------|
| `src/features/.../TemplatePreview.tsx` | Full real data integration, DataSummary component |
| `src/lib/communications/contextBuilder.ts` | **NEW** - Context building functions |
| `src/lib/communications/index.ts` | Added contextBuilder exports |
| `src/features/.../RecipientSelector.tsx` | **NEW** - Team member dropdown |
| `src/features/.../components/index.ts` | Added RecipientSelector export |
| `src/features/.../TemplateEditor.tsx` | Integrated real data preview |

---

## Merge Fields Data Sources

| Field | Data Source | Notes |
|-------|-------------|-------|
| `«First_Name»` | organization_team_members | Direct |
| `«Email»` | organization_team_members | Direct |
| `«Current_Points»` | performance_point_events | Via store |
| `«Tier_Label»` | Calculated from points | Uses config |
| `«Sick_Used»` | activity_logs | NEXUS query |
| `«Sick_Remain»` | Calculated | Available - Used |
| `«Current_Period_Label»` | Calculated | Based on date |
| `«Prev1_Period_Late»` | performance_point_events | Historical query |

---

## Next Steps (Phase 3)

1. **Historical Period Stats** - Query past cycles for Prev1/Prev2/Prev3 data
2. **Schedule Integration** - Pull shift data for Day_1 through Day_7 fields
3. **Vacation Hours** - Integrate with time_off_usage table when built
4. **Attendance Percentages** - Calculate from shift/punch data

---

## Related Documentation

- `HANDOFF-2026-01-06-Communications-Module.md` - Phase 1
- `HANDOFF-2026-01-06-Communications-Phase2-Templates.md` - Phase 2
- `UTILS.md` - Date utility reference
