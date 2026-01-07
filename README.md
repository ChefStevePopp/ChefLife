# ChefLife - Restaurant Management System

**Built by chefs, for chefs.** A comprehensive web-based platform for managing inventory, recipes, prep, production, and team operations in independent restaurants.

**Battle-tested at Memphis Fire Barbeque Company** for 8+ years, saving $96,000 in one year through data-driven cost control.

---

## 🎯 What is ChefLife?

ChefLife is a complete restaurant operations platform consisting of four integrated modules:

### 1. **Purchases & Inventory**
- Multi-vendor price tracking and comparison
- Automated invoice import (CSV, PDF, photo)
- Umbrella ingredients (aggregate pricing across vendors)
- Item code tracking (seasonal changes, same product)
- Allergen spectrum analysis
- Vendor analytics and price change notifications

### 2. **Prep & Plating**
- Recipe costing (ingredient → prep item → menu item)
- Multi-level recipe builds
- Yield calculations and waste factors
- True cost of production (labor + ingredients)
- Complete allergen tracking through every step
- Digital recipe book with version control

### 3. **POS & Revenue**
- Sales integration and category analysis
- Menu engineering (Stars, Dogs, Workhorses, Puzzles)
- Daily/weekly/monthly reports
- Profit margin tracking by item
- Cost vs revenue analysis

### 4. **Labor & Attendance**
- Schedule import from 7shifts/other systems
- Team management and roles
- Production task scheduling
- HACCP temperature monitoring
- Team chat and collaboration

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ChefStevePopp/ChefLife.git
cd ChefLife
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up the database**
- Go to your Supabase project dashboard
- Navigate to SQL Editor
- Run the migration files in `supabase/migrations/` in order

5. **Run the development server**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
```

---

## 📦 Deployment

### Netlify (Recommended)

1. **Connect your GitHub repository** to Netlify
2. **Configure build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `20`

3. **Set environment variables** in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Deploy!** Netlify will automatically deploy on every push to main.

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** TailwindCSS + Framer Motion
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **State:** Zustand
- **UI Components:** Radix UI, Lucide Icons
- **Data Processing:** Papa Parse (CSV), XLSX (Excel), PDF.js
- **Charts:** Recharts
- **Drag & Drop:** DND Kit

---

## 🔑 Key Features

### Vendor Invoice Processing
- Import invoices from GFS, Flanagan, US Foods, etc.
- Automatic price change detection
- Item code change tracking
- Approval workflow for price updates

### Master Ingredients
- Complete ingredient database
- Allergen tracking (14 major allergens + custom)
- Vendor pricing comparison
- Umbrella ingredients for multi-source items

### Recipe Management
- Digital recipe book with photos
- Ingredient scaling and yield calculations
- Allergen declarations (contains/may contain/cross-contact)
- Cost calculations including labor
- Quality standards and plating guides

### Production Planning
- Kanban-style task board
- Assignment to team members
- Prep system organization (hot/cold/garde/pastry/etc.)
- Scheduled task automation

### Team & Permissions
- Role-based access control
- Team member profiles
- Activity logging
- Real-time team chat

---

## 📚 Developer Documentation

### Handoff Documents
Session-specific documentation for feature implementations:

| Document | Description |
|----------|-------------|
| `docs/HANDOFF-2026-01-06-Communications-Module.md` | Communications module, Resend integration, merge engine |
| `docs/HANDOFF-2026-01-06-TeamLedger-L5Pills-Timezone.md` | Team Ledger view, L5 action pills, timezone fixes |
| `docs/HANDOFF-2026-01-05-TimeOff.md` | Time-off tracking (sick days, vacation) |
| `docs/HANDOFF-2026-01-05-Points-Ledger.md` | Points ledger implementation |
| `docs/HANDOFF-2026-01-05-Pagination.md` | Pagination patterns |

### Utility Reference
| Document | Description |
|----------|-------------|
| `docs/UTILS.md` | Date utilities, string helpers, validation functions |

### Key Patterns

**Date Handling (CRITICAL):**
```typescript
// ❌ WRONG - Timezone shift issues
new Date('2026-01-06').toLocaleDateString()

// ✅ CORRECT - Use dateUtils
import { formatDateForDisplay } from '@/utils/dateUtils';
formatDateForDisplay('2026-01-06')
```

**L5 Design System:**
- Use Lucide icons (no emojis)
- Pill buttons: `rounded-full` with border and hover states
- Color coding: Gray (default) → Amber (warning) → Rose (critical)
- Consistent spacing and transitions

---

## 📄 License

Copyright © 2024 Chef Steve Popp / Memphis Fire Barbeque Company

**This software is proprietary.** All rights reserved.

---

## 🏆 About

**Created by Chef Steve Popp**  
35+ years of culinary expertise  
Co-owner, Memphis Fire Barbeque Company  
Hamilton, Ontario, Canada

**Memphis Fire BBQ:**
- 15 years of operation
- 4.6 stars (3000+ reviews)
- 120+ local awards
- Ontario Cultural Landmark
- Featured on Food Network's "You Gotta Eat Here"

ChefLife was built from real restaurant operations experience, not theoretical software development. Every feature exists because it solved an actual problem at Memphis Fire.

---

*"People over profit, smiles over savings, compassion over commerce."*  
— Memphis Fire Barbeque Company
