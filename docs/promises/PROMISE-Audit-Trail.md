# PROMISE: Every Dollar Traceable to a Source Document

> *"Over-engineer your accounting—you're an accounting package hiding as a restaurant system."*

---

## The Problem

Restaurant food cost data is often a mess:

- Prices updated "from memory"
- Invoice files lost or never saved
- No record of who changed what, when
- "Where did this number come from?" has no answer

When it matters—audits, disputes, bonus calculations, due diligence—there's no paper trail.

### When It Really Matters

**Chef Bonuses:** If a chef's bonus is tied to hitting 28% food cost, and prices can be adjusted without documentation... that's a hole you can drive a truck through.

**Tax Audits:** "Show me your cost documentation for Q3." Silence.

**Insurance Claims:** Spoilage event, theft investigation. "What was that inventory worth?" Guesswork.

**Acquisition Due Diligence:** Buyer wants to verify margins. "Trust us" isn't an answer.

---

## Why Existing Solutions Fail

### Spreadsheets
- Anyone can change anything
- No version history
- Files get lost
- "Who updated this?" Unknown

### Basic Restaurant Software
- Prices entered directly, no source
- No document retention
- History limited or non-existent
- Import ≠ Verified

### Manual Filing
- Paper invoices in boxes
- Disconnected from system data
- Finding a specific invoice: 30 minutes
- Proving a price came from that invoice: Impossible

### The Dangerous Default
Most systems make it **easy to have bad data**. Quick adjustments, no documentation required, "fix it later" mentality.

---

## The ChefLife Way

### Accounting-Grade Audit Trail

Every price change in ChefLife is traceable to a source document through a complete chain:

```
vendor_price_history
    │
    └── invoice_item_id (FK)
            │
            └── vendor_invoice_items
                    │
                    └── invoice_id (FK)
                            │
                            └── vendor_invoices
                                    │
                                    ├── document_file_path (the actual file)
                                    ├── document_hash (SHA256 integrity)
                                    ├── created_by (who imported)
                                    └── verified_by (who approved)
```

### The Rules

1. **No price change without documentation**
   - Every price links to an invoice line item
   - Invoice line items link to invoice headers
   - Invoice headers link to retained source files

2. **Source documents are immutable**
   - Files stored in secure bucket
   - SHA256 hash proves file wasn't altered
   - Original retained forever

3. **Every action tracked**
   - Who imported the invoice
   - Who verified the prices
   - When each action occurred

4. **Credit memos are negative invoices**
   - Same documentation requirements
   - Same audit trail

---

## The Benefit

### For Daily Operations
- Confidence in your cost data
- Quick dispute resolution: "Here's the invoice"
- No more "where did this price come from?"

### For Compliance
- Tax audit ready: Complete documentation
- Insurance claims: Verifiable inventory values
- Health inspections: Supplier traceability

### For Team Accountability
- Bonus calculations are auditable
- No phantom adjustments
- Trust in the numbers

### For Business Value
- Due diligence ready: "Here's 3 years of documented costs"
- Investor confidence: Professional-grade records
- M&A smooth: Clean books

---

## The Proof

### The Query

When someone asks "Why did food cost jump 2% in March?":

```sql
SELECT 
  ingredient_name,
  previous_price,
  new_price,
  price_change_percent,
  invoice_number,
  invoice_date,
  document_file_path,
  created_by_email,
  verified_by_email,
  audit_status
FROM vendor_price_audit_trail 
WHERE organization_id = $1
AND effective_date BETWEEN '2026-03-01' AND '2026-03-31'
ORDER BY price_change_percent DESC;
```

**Every row answers:** What changed, when, why, where's the paper, who did it.

### Demo Scenario
1. Import an invoice
2. Show file retained in storage
3. Show audit trail view
4. Click through: price → line item → invoice → document
5. "Can your current system do this?"

### For Your Accountant

> "Price history prior to [DATE] was imported from vendor CSVs but source files were not retained. These records are marked as 'legacy_import' in the system. All imports after [DATE] have full documentation with retained source files, invoice records, and line-item tracking."

That's honest and defensible.

---

## Connected Features

| Feature | Contribution |
|---------|--------------|
| **Audit Trail Schema** | vendor_invoices → vendor_invoice_items → vendor_price_history |
| **File Retention** | Source files stored with SHA256 hash |
| **Import Service** | `processInvoiceWithAuditTrail()` enforces chain |
| **Audit View** | `vendor_price_audit_trail` for reporting |
| **Legacy Marking** | `source_type = 'legacy_import'` for pre-system data |

---

## The Tagline

> **"Every dollar in, every dollar out, has a piece of paper behind it."**

---

## Technical Implementation

### Source Types
| Type | Meaning | Audit Status |
|------|---------|--------------|
| `legacy_import` | Pre-audit-trail imports | ⚠️ Best effort |
| `csv_import` | CSV with file retained | ✅ Full |
| `pdf_import` | PDF with file retained | ✅ Full |
| `photo_import` | Photo with file retained | ✅ Full |
| `manual_entry` | Manual with invoice # | ✅ Full |
| `credit_memo` | Credit with documentation | ✅ Full |

### What's Blocked
- Quick price adjustments without documentation
- "I'll add the invoice later" workflow
- Undocumented system adjustments

### The Constraint

```sql
-- Future enforcement (after pipeline proven)
ALTER TABLE vendor_price_history 
ALTER COLUMN invoice_item_id SET NOT NULL;
```

**If you can't document it, you can't change it.**

---

## The Bottom Line

**This is trust.**

When a chef's bonus depends on the numbers, when a buyer is evaluating your business, when an auditor asks for documentation—you need to prove your data is real.

ChefLife isn't just restaurant software. It's **accounting infrastructure** with a restaurant interface.

Build it once. Build it right. Build it to last forever.

---

*Promise Documented: January 10, 2026*
*Category: 🛡️ Protection*
*Connected Roadmap: ROADMAP-Data.md*
*Implementation: Complete (Day 2 Audit Trail)*
