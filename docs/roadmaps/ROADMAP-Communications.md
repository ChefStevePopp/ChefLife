# Communications Module Roadmap

**Module:** Communications  
**Status:** Phase 2 Complete (Templates + Broadcast)  
**Last Updated:** January 8, 2026

---

## Completed ✅

### Phase 1: Foundation
- [x] Database schema (email_templates, email_send_log, email_template_fields)
- [x] Merge engine with guillemets syntax
- [x] Field registry architecture
- [x] Edge function for email sending (Resend integration)

### Phase 2: Template Management
- [x] TemplateList with search/filter/sort
- [x] TemplateEditor with syntax highlighting
- [x] TemplatePreview with real data integration
- [x] MergeFieldsReference with module-aware field grouping
- [x] Batch send to all team members
- [x] Historical period data (Prev1, Prev2, Prev3 cycles)
- [x] **First broadcast sent!** (Weekly Team Review - Jan 7, 2026)

---

## In Progress 🔄

### L5 Design Polish
- [ ] Move HighlightedEditor inline styles to index.css
- [ ] CommunicationsConfig L5 upgrade
- [ ] Consistent component patterns across module

### Merge Field Expansion
- [ ] Schedule module fields (Day_1 through Day_7 shift info)
- [ ] Enhanced time off fields (vacation requests, upcoming time off)
- [ ] Year-to-date statistics

---

## Planned 📋

### Phase 3: Trigger Events
Automatic emails sent when specific events occur in ChefLife.

#### Trigger 1: Tier Change Notification
- **Event:** Team member's tier changes (1→2, 2→3, or improvement 3→2, 2→1)
- **Template:** Tier-specific messaging (celebration for improvement, coaching for decline)
- **Technical:** DB trigger or edge function watching `performance_point_events`
- **Refactor opportunity:** Extract BatchSendModal, consolidate RecipientDropdown

#### Trigger 2: New Hire Welcome
- **Event:** Team member added to organization_team_members
- **Template:** Welcome email with onboarding info, first day details
- **Technical:** DB trigger on INSERT to organization_team_members

#### Trigger 3: Coaching Stage Escalation
- **Event:** Team member reaches coaching_stage 2, 3, 4, or 5
- **Template:** Stage-appropriate documentation, next steps, support resources
- **Technical:** Watch for coaching_stage changes in performance data

### Phase 4: Scheduled Sends
- [ ] Cron-based scheduled delivery
- [ ] Recurring templates (weekly digest every Sunday at 6pm)
- [ ] Schedule management UI

### Phase 5: Send History & Analytics
- [ ] SendHistory page with filtering
- [ ] Open/click tracking (if supported by Resend)
- [ ] Delivery status dashboard

---

## Technical Debt 🔧

### TemplatePreview.tsx Refactor
**Current state:** 1,400+ lines handling multiple concerns  
**Trigger:** When building Phase 3 trigger events  
**Actions:**
- Extract `RecipientDropdown` → consolidate with `RecipientSelector.tsx`
- Extract `DataSummary` → own component file
- Extract `BatchSendModal` → own component file  
- Move helper functions to utils (getWeekBounds, formatDateByOption, etc.)

---

## Related Documentation

- `HANDOFF-2026-01-06-Communications-Module.md` - Phase 1 specs
- `HANDOFF-2026-01-06-Communications-Phase2-Templates.md` - Phase 2 specs
- `HANDOFF-2026-01-07-Communications-RealData.md` - Real data integration
- `HANDOFF-2026-01-07-FieldRegistry.md` - Merge field architecture
- `L5-BUILD-STRATEGY.md` - Design patterns reference

---

*This roadmap is a living document. Update as features are completed or priorities shift.*
