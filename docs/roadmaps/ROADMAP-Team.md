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
- [x] **Data Flow Audit (Session 81)** — end-to-end pipeline verified
  - CSV Import → Delta Engine → Staging → Approval → Store → UI → NEXUS
  - 8 database tables, 3-table deduplication, 30-day reduction cap
  - Security exemptions, auto-coaching triggers, cycle auto-creation
  - Zero issues found — architecture sound

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

### 7shifts Integration Expansion — The Team Module

> **Architecture Reference:** `docs/ARCHITECTURE-7SHIFTS-FULL-INTEGRATION.md`
> **Previous Handoff:** `docs/handoffs/HANDOFF-2026-02-11-TeamSettings-7shifts-Expansion.md`
> **Session 129 Handoff:** `docs/handoffs/HANDOFF-2026-02-18-Session129-AllergenGate-CustomRegistry-7shifts.md`

#### Priority 1: Verify & Align TeamSettings (30 min)
- [ ] Test toggle pipeline end-to-end: toggle off → save → confirm pill disappears
- [ ] Align ModulesManager card label: "The Schedule" → "The Team"
- [ ] Fix configPath: card shows `/admin/schedule/settings`, actual is `/admin/modules/team`
- [ ] Confirm tier toggle gating (disabled when Team Performance module off)

#### Priority 2: The Roster — 7shifts User Enrichment (1-2 sessions)
- [ ] `get_users` endpoint enrichment → team_members (email, phone, hire_date, status, photo)
- [ ] `get_assignments` endpoint → role/department/location per team member
- [ ] Build Roster tab content in TeamSettings (display prefs, sort)
- [ ] Build/enhance Roster view with richer employee cards

#### Priority 3: The Schedule — Sync Configuration (1-2 sessions)
- [ ] Sync frequency dropdown — 6-tier model:
  Real-time (15min) / Frequent (30min) / Standard (hourly) / Light (4hr) / Daily / Manual
- [ ] Stream tiering: Hot (time punches) / Warm (shifts, time off) / Cold (users, wages)
- [ ] Configuration UI in TeamSettings → Integration tab
- [ ] Manual sync button with last-sync timestamp
- [ ] `pg_cron` + `pg_net` CRON jobs:
  - High-frequency dispatcher (every 15 min, respects operating hours)
  - Nightly batch (2 AM, cool-tier streams)
- [ ] Sync status indicator (last successful, next scheduled, error state)
- [ ] NEXUS logging for automated_sync events

#### Priority 4: Schedule Refinements
- [ ] Draft vs. published shift awareness
- [ ] Schedule events (closures, special events from 7shifts events endpoint)

### Employment Records — Historical Hours & Proof of Employment

> **Origin:** Staff request (Feb 18, 2026) — employee needs Proof of Employment
> **Data Source:** 7shifts Hours & Wages Report API (`/v2/reports/hours_and_wages`)
> **Key Insight:** Report endpoint returns aggregated data with weekly breakdowns,
> role breakdowns, regular/overtime/tips per employee — more efficient than raw
> time punches for annual summaries.

#### Step 1: Historical Hours Import (1 session)
- [ ] New Edge Function action: `get_hours_wages_report`
  - Pulls from 7shifts `/v2/reports/hours_and_wages?punches=true`
  - Monthly chunks to avoid 30-second HTTP timeout on large ranges
  - Parameters: `from`, `to`, `location_id`, `user_id` (optional)
- [ ] New table: `team_member_hours_summary`
  ```
  organization_id, team_member_id, external_user_id,
  period_start (date), period_end (date), period_type ('monthly'),
  role_name, department_name,
  regular_hours, overtime_hours, holiday_hours, total_hours,
  regular_pay, overtime_pay, total_pay, total_tips,
  break_minutes, shifts_count,
  source ('7shifts'), synced_at
  ```
- [ ] One-time 12-month backfill action (callable from UI)
- [ ] Ongoing monthly accumulation via nightly CRON (cool-tier stream)
- [ ] RLS scoped to organization_id

#### Step 2: TeamSettings "Employment" Tab (1 session)
- [ ] Fourth tab in TeamSettings: Employment (icon: Briefcase, color: cyan)
- [ ] Per-employee annual summary view:
  - 12-month hour grid (monthly totals)
  - Role breakdown with hours per role
  - Regular vs overtime vs holiday split
  - Employment tenure (hire_date → today)
  - YTD totals with comparison to previous year
- [ ] "Import Historical Hours" button (triggers backfill)
- [ ] Last import timestamp display
- [ ] Print/export annual summary per employee

#### Step 3: Proof of Employment Template (1 session)
- [ ] Communications template: "Proof of Employment"
- [ ] Merge fields:
  - `{{employee_name}}`, `{{employee_first_name}}`, `{{employee_last_name}}`
  - `{{hire_date}}`, `{{employment_status}}`, `{{roles}}`
  - `{{total_hours_12mo}}`, `{{avg_weekly_hours}}`
  - `{{regular_hours_12mo}}`, `{{overtime_hours_12mo}}`
  - `{{organization_name}}`, `{{organization_address}}`
  - `{{generated_date}}`, `{{employer_signature_line}}`
- [ ] Generate action in Employment tab: select employee → populate → PDF output
- [ ] Letter includes:
  - Organization letterhead (from org settings)
  - Employee identification and role(s)
  - Employment dates and current status
  - 12-month hours summary (monthly breakdown table)
  - Average weekly hours calculation
  - Employer signature line with title
  - "This letter was generated from verified payroll records" disclaimer
- [ ] Ontario ESA compliance language
- [ ] Printable / downloadable PDF via docx skill

#### Step 4: Employment Records in My Profile (future)
- [ ] Employee self-service: view own hours summary
- [ ] Request Proof of Employment (generates for manager approval)
- [ ] YTD hours tracker with visual progress

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

Team Performance and Employment Records features are designed with Ontario Employment Standards Act in mind:

| Feature | ESA Consideration |
|---------|-------------------|
| Vacation tracking | 2 weeks minimum after 12 months |
| Sick days | 3 unpaid job-protected days/year |
| Time-off requests | Document retention requirements |
| Termination | Proper notice periods |
| Overtime | 44+ hours threshold |
| **Proof of Employment** | Must accurately reflect hours worked and employment dates |
| **Record retention** | Employer must retain pay/hours records for 3 years after last entry |
| **Hours summary** | Weekly hours must be tracked for overtime calculation (44+ hrs) |

---

## References

- `src/features/team/` - Team feature modules
- `src/features/admin/components/sections/TeamPerformance/`
- `src/features/admin/components/sections/Communications/`
- `src/features/admin/components/sections/TeamSettings/` - The Team config (3 tabs + Employment planned)
- `docs/ARCHITECTURE-7SHIFTS-FULL-INTEGRATION.md` - Full 7shifts integration architecture
- `docs/handoffs/HANDOFF-2026-02-18-Session129-AllergenGate-CustomRegistry-7shifts.md` - Latest handoff
- `ROADMAP-Communications.md` - Communications details

---

*Created: January 8, 2026*  
*Updated: February 18, 2026 (Session 129 — 7shifts expansion + Employment Records added)*  
*Section: Team*
