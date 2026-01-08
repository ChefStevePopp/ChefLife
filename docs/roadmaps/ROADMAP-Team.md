# Team Section Roadmap

> Team Performance, Communications/Nexus, App Access, Roster, Schedule, Policies

---

## Current State (January 2026)

### The Roster ✅
- [x] Team member list with search/filter
- [x] Profile cards with contact info
- [x] Role/position display
- [x] Status badges (active, inactive, etc.)

### The Schedule 🔄
- [x] 7shifts integration
- [x] Schedule display
- [ ] Native scheduling (post-7shifts)

### Team Performance ✅
- [x] 7-tab L5 interface (gold standard)
- [x] Points system with NEXUS logging
- [x] Tier management (1-3)
- [x] Coaching stages (1-5)
- [x] Attendance tracking
- [x] Vacation/sick day tracking
- [x] Time-off requests

### Communications/Nexus ✅
- [x] Email template library
- [x] Merge field system with guillemets
- [x] Batch send to team
- [x] Template preview with real data
- [x] Send history logging
- See: `ROADMAP-Communications.md` for details

### App Access 🔄
- [x] Security level system (Ω, α, β, δ, ε)
- [x] Per-user level assignment
- [ ] Feature-level permissions
- [ ] Role-based presets

### Policies 📋
- [ ] Policy document storage
- [ ] Employee handbook builder
- [ ] Acknowledgment tracking

### Job Descriptions 📋
- [ ] Position templates
- [ ] Responsibilities & duties
- [ ] Compensation ranges

---

## Q1 2026

### Team Performance Completion
- [ ] Weekly performance report emails (automated)
- [ ] Performance trend graphs
- [ ] Peer recognition points
- [ ] Anniversary/milestone tracking
- [ ] Goal setting & progress

### Communications Phase 3
- [ ] Trigger events (tier change, new hire, coaching escalation)
- [ ] Scheduled sends
- [ ] Send history analytics
- See: `ROADMAP-Communications.md`

---

## Q2 2026

### Native Scheduling
- [ ] Shift builder interface
- [ ] Availability management
- [ ] Shift swaps/coverage
- [ ] Schedule templates
- [ ] Labor cost forecasting
- [ ] Overtime alerts

### Policies Module Build
- [ ] Policy CRUD with versioning
- [ ] Required acknowledgment workflows
- [ ] Expiration/renewal tracking
- [ ] Audit trail

### Job Descriptions Build
- [ ] Template library
- [ ] Link to Team Performance expectations
- [ ] Onboarding checklists per role

---

## Q3 2026

### App Access Enhancement
- [ ] Feature-level permissions UI
- [ ] Role presets (Manager, Supervisor, Team Lead, Staff)
- [ ] Location-based access (multi-site)
- [ ] Time-based access (off-clock restrictions)

### Employee Self-Service
- [ ] Mobile-first interface
- [ ] Personal schedule view
- [ ] Time-off requests (enhanced)
- [ ] Pay stub access (integration)
- [ ] Document signing

---

## Technical Debt & Polish

- [ ] Team Performance mobile optimization
- [ ] Points ledger export to CSV
- [ ] Bulk team member import/update
- [ ] Photo upload for profiles

---

## Ontario ESA Compliance Notes

Team Performance features are designed with Ontario Employment Standards Act in mind:

| Feature | ESA Consideration |
|---------|-------------------|
| Vacation tracking | 2 weeks minimum after 12 months |
| Sick days | 3 unpaid job-protected days/year |
| Time-off requests | Document retention requirements |
| Termination | Proper notice periods |
| Overtime | 44+ hours threshold |

---

## References

- `src/features/team/` - Team feature modules
- `src/features/admin/components/sections/TeamPerformance/`
- `src/features/admin/components/sections/Communications/`
- `ROADMAP-Communications.md` - Communications details

---

*Created: January 8, 2026*
*Section: Team*
