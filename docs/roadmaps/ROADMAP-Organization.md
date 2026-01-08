# Organization Section Roadmap

> Company Settings, Operations, Modules, Integrations, Activity Log

---

## Current State (January 2026)

### Company Settings ✅
- [x] 5-tab L5 interface (Organization, Industry, Location, Localization, Compliance)
- [x] Business identity (operating name, legal name, tax ID)
- [x] Dual address support (Corporate + Primary Location)
- [x] Contact information with accounting email
- [x] Industry classification (14 business types, cuisines, revenue centers)
- [x] Seating capacity with patio season
- [x] Operating hours (Business + Team hours)
- [x] Localization (16 timezones, 6 currencies, date/time formats)
- [x] Health Compliance (L5):
  - [x] Certificate upload/capture with camera
  - [x] Certificate metadata (number, jurisdiction, issue/expiry dates)
  - [x] Expiry warnings (30-day alert, expired alert)
  - [x] Inspection CRUD with database integration
  - [x] Inspector details tracking
  - [x] Action items with completion tracking
  - [x] Score and grade recording
  - [x] Next inspection due tracking
  - [x] Expandable inspection cards
  - [x] Delete confirmation

### Operations ✅
- [x] Variables management (measurements, storage, categories)
- [x] Food Relationships taxonomy
- [x] Tabbed L5 interface

### Modules ✅
- [x] Module enable/disable toggles
- [x] Per-module configuration

### Integrations 🔄
- [x] 7shifts connection
- [ ] Square POS
- [ ] QuickBooks

---

## Phase 1: Canada/US Focus (Current)

### Business Identity — Regional Compliance

| Field | Canada | USA |
|-------|--------|-----|
| **Tax ID Label** | Business Number | EIN |
| **Tax ID Format** | 123456789 RT0001 | XX-XXXXXXX |
| **Tax ID Example** | 123456789 RT0001 | 12-3456789 |
| **State/Province** | Province | State |
| **Postal Format** | A1A 1A1 | 12345 or 12345-6789 |

#### Current Implementation
- Label: "Tax ID / Business Number" (inclusive)
- Placeholder: "e.g., 123456789 RT0001" (Canada-first)
- Province / State label
- Postal / ZIP Code label

#### Planned Enhancements
- [ ] Smart placeholder based on timezone/country selection
  - Canada timezone → "123456789 RT0001"
  - US timezone → "12-3456789"
- [ ] Format validation based on country
  - Canada BN: 9 digits + space + RT + 4 digits
  - US EIN: 2 digits + hyphen + 7 digits
- [ ] Helper text that explains the format
- [ ] Optional State Tax ID field (US states with sales tax)

### US-Specific Compliance Considerations

| Requirement | Notes |
|-------------|-------|
| **EIN** | Required for payroll, required for businesses with employees |
| **State Tax ID** | Varies by state - some states have none |
| **Sales Tax Nexus** | Complex - varies by state presence |
| **Food Service License** | State/county level |
| **Health Permits** | Local health department |
| **Liquor License** | State ABC + local |

#### Future US Fields (When Needed)
- [ ] State Tax ID (separate from federal EIN)
- [ ] Sales Tax Certificate Number
- [ ] State-specific license fields
- [ ] Multi-state support for chains

---

## Phase 2: UK/EU Expansion (Future)

### International Address Support

When UK/EU expansion becomes relevant:

- [ ] Add Country selector to address forms
- [ ] Dynamic address fields based on country selection:
  - UK: No State/Province field, "Postcode" label
  - Germany/France: PLZ/Code Postal + City on same line
  - Japan: Reversed field order (postal first)
- [ ] Smart placeholder text based on selected country
- [ ] Address validation per country format
- [ ] Google Places API integration for address autocomplete
- [ ] Consider separate `addresses` table for multi-address support

| Country | Fields | Format Notes |
|---------|--------|--------------|
| 🇨🇦 Canada | Street, City, Province, Postal | A1A 1A1 |
| 🇺🇸 USA | Street, City, State, ZIP | 12345 or 12345-6789 |
| 🇬🇧 UK | Street, City, Postcode | SW1A 1AA (no state) |
| 🇩🇪 Germany | Street, PLZ + City | PLZ and city same line |
| 🇫🇷 France | Street, Code Postal + City | Code postal first |
| 🇯🇵 Japan | Postal, Prefecture, City, Block | Reversed order |

### International Tax IDs

| Country | Name | Format |
|---------|------|--------|
| 🇨🇦 Canada | Business Number | 123456789 RT0001 |
| 🇺🇸 USA | EIN | 12-3456789 |
| 🇬🇧 UK | VAT Number | GB123456789 |
| 🇩🇪 Germany | Steuernummer | 12/345/67890 |
| 🇫🇷 France | SIRET | 123 456 789 00012 |
| 🇦🇺 Australia | ABN | 12 345 678 901 |

*Priority: Low until international demand materializes.*

---

## Phase 3: Multi-Location Support

When `multi_unit` is enabled:

- [ ] Location management UI (Admin → Locations)
- [ ] Per-location addresses
- [ ] Per-location operating hours
- [ ] Per-location health certificates
- [ ] Per-location staff assignments
- [ ] Location-level reporting
- [ ] Corporate vs location address distinction
- [ ] Franchise/brand consistency settings

---

## Integrations Roadmap

### Current
- [x] 7shifts (scheduling, team sync)

### Q2 2026
- [ ] Square POS (sales data, menu sync)
- [ ] QuickBooks Online (accounting export)
- [ ] Xero (accounting export)

### Q3 2026
- [ ] Toast POS
- [ ] Lightspeed
- [ ] Supplier ordering (Sysco, US Foods, GFS)

### Future
- [ ] Google Business Profile sync
- [ ] Yelp integration
- [ ] DoorDash/UberEats menu sync
- [ ] Payroll systems (ADP, Gusto)

---

## Technical Debt & Polish

- [ ] L5 polish audit on all Organization components
- [ ] Unsaved changes warning (browser beforeunload)
- [ ] Form validation with inline errors
- [ ] Auto-save draft functionality
- [ ] Keyboard navigation (Tab, Enter to save)
- [ ] Mobile responsive audit

---

## References

- `src/features/admin/components/settings/OrganizationSettings/`
- `src/types/organization.ts`
- `src/stores/organizationStore.ts`

---

*Created: January 8, 2026*
*Section: Organization (Admin Lifecycle Steps 1-5)*
