# PROMISE: Weekly Invoice Entry Accountability

> *"ChefLife will tell you every week if data entry is happening—before small gaps become big problems."*

---

## The Problem

Invoice entry is the foundation of food cost control. But it's also:

- Easy to skip when busy
- Easy to "batch later" (and forget)
- Easy to miss a vendor
- Easy for no one to notice until month-end reconciliation

By then, you're reconstructing from memory, missing invoices, and your food cost % is fiction.

### The Real Cost of Missed Invoices

**Daily:** One missed invoice = one ingredient with stale pricing
**Weekly:** A few missed invoices = blind spots in cost data
**Monthly:** A week's worth missed = meaningless food cost reports
**Quarterly:** Pattern of gaps = you're flying blind

---

## Why It Falls Through the Cracks

### Nobody's Watching
- GM assumes someone entered them
- Chef assumes admin handled it
- Admin assumes chef did delivery check-in
- No one confirms until the accountant asks

### No Early Warning
- Problems only surface at month-end
- By then, invoices are lost or buried
- Reconstruction is guesswork

### "I'll Catch Up" Never Happens
- Monday's invoices get pushed to Tuesday
- Tuesday's pushed to Wednesday
- Friday's pushed to "next week"
- Next week has its own invoices

---

## The ChefLife Way

### Automatic Weekly Digest

Every Monday morning at 7 AM, ChefLife sends a report to designated admins:

**Subject:** `📊 ChefLife Weekly: Invoice Entry Summary (Jan 6-12)`

```
MEMPHIS FIRE BARBEQUE COMPANY
Week of January 6-12, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 INVOICES ENTERED: 14
💰 TOTAL VALUE: $4,832.47

BY VENDOR:
  Flanagan Foodservice    6 invoices   $2,847.12
  GFS                     4 invoices   $1,203.88
  Sysco                   3 invoices   $  681.47
  Lakeshore Produce       1 invoice    $  100.00

BY USER:
  steve@memphisfirebbq.com     8 invoices
  lori@memphisfirebbq.com      6 invoices

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 VS LAST WEEK:
  Invoices: 14 vs 16 (-12%)
  Value: $4,832 vs $5,120 (-6%)

⚠️ FLAGS:
  • 2 invoices missing invoice #
  • 3 items in Triage awaiting review
  • No invoices from: Casa Loma Meats

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View full details: [Dashboard Link]
```

### What Gets Flagged

| Flag | Meaning | Action |
|------|---------|--------|
| 🔴 **Zero invoices** | Nothing entered all week | Immediate attention |
| 🟠 **Missing vendor** | Regular vendor not seen | Check for missed deliveries |
| 🟠 **Invoice # gaps** | Invoices without numbers | Audit trail incomplete |
| 🟡 **Triage backlog** | Unmatched items piling up | Complete ingredient setup |
| 🟡 **Below average** | 30%+ drop from normal | Investigate |
| 🔵 **High discrepancies** | Many shorts/overs | Supplier conversation needed |

### The Contract

**ChefLife PROMISES:**

1. **Automatic delivery** - No one has to remember to run a report
2. **Early warning** - Problems visible within 7 days, not 30
3. **Accountability** - Clear visibility into who's doing what
4. **Trend tracking** - Week-over-week comparison catches drift
5. **Actionable flags** - Not just data, but guidance

---

## The Benefit

### For Owners
- Confidence that data entry is happening
- No month-end surprises
- Quick pulse check without logging in

### For Managers
- Clear expectations and visibility
- Proof of work when needed
- Early warning before problems compound

### For the Business
- Accurate food cost data
- Complete audit trail
- Reconciliation-ready books

---

## Implementation

### Supabase Edge Function (Cron)

```typescript
// supabase/functions/weekly-invoice-digest/index.ts

// Runs every Monday at 7:00 AM EST
// Cron: 0 12 * * 1 (12:00 UTC = 7:00 EST)

interface WeeklyDigest {
  organization_id: string;
  week_start: Date;
  week_end: Date;
  total_invoices: number;
  total_value: number;
  by_vendor: VendorSummary[];
  by_user: UserSummary[];
  vs_last_week: Comparison;
  flags: Flag[];
}
```

### Database Support

```sql
-- View for weekly summary
CREATE OR REPLACE VIEW vim_weekly_summary AS
SELECT 
  organization_id,
  date_trunc('week', invoice_date) as week_start,
  COUNT(*) as invoice_count,
  SUM(total_amount) as total_value,
  COUNT(DISTINCT vendor_id) as vendor_count,
  COUNT(DISTINCT created_by) as user_count,
  COUNT(*) FILTER (WHERE invoice_number IS NULL) as missing_numbers
FROM vendor_invoices
WHERE status = 'completed'
GROUP BY organization_id, date_trunc('week', invoice_date);
```

### Admin Configuration

```typescript
// Settings → Notifications
{
  weekly_invoice_digest: {
    enabled: true,
    recipients: ['steve@memphisfirebbq.com', 'lori@memphisfirebbq.com'],
    day: 'monday',
    time: '07:00',
    timezone: 'America/Toronto',
    include_flags: true,
    threshold_alerts: {
      zero_invoices: true,      // 🔴 Alert if 0 invoices
      missing_vendor_days: 7,   // 🟠 Alert if vendor missing 7+ days
      triage_backlog: 10,       // 🟡 Alert if 10+ items in triage
      value_drop_percent: 30    // 🟡 Alert if 30%+ drop
    }
  }
}
```

---

## Connected Features

| Feature | Contribution |
|---------|--------------|
| **VIM Audit Trail** | Source data for all metrics |
| **Triage Panel** | Backlog count for flags |
| **User Activity** | Who entered what |
| **Vendor Registry** | Expected vendors for gap detection |
| **NEXUS Logging** | Detailed activity timeline |

---

## The Tagline

> **"Every Monday morning, you'll know if last week's invoices made it in."**

---

## Future Enhancements

| Phase | Feature |
|-------|---------|
| **v1** | Email digest with summary + flags |
| **v2** | Dashboard widget (always-visible KPI) |
| **v3** | Slack/Teams integration |
| **v4** | Predictive alerts ("You usually have 3 Flanagan invoices by Thursday...") |
| **v5** | Bank/CC reconciliation integration |

---

## The Bottom Line

**This is proactive accountability.**

Don't wait for month-end to discover gaps. Don't rely on memory to know if invoices were entered. Don't hope someone is keeping up.

ChefLife watches. ChefLife reports. ChefLife keeps you honest.

**Because the best time to catch a missed invoice is 7 days later, not 30.**

---

*Promise Documented: January 14, 2026*
*Category: 📊 Accountability*
*Connected Roadmap: ROADMAP-Data.md, ROADMAP-VIM.md*
*Implementation: Planned (Post-VIM Core)*
