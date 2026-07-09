# 🌿 EcoSphere AI — ESG Management Platform

> **Team:** CrimsonSyndicate | **Event:** Odoo Hackathon '26 — Virtual Round

EcoSphere AI is a full-stack **ESG (Environmental, Social & Governance) Management Platform** that transforms sustainability data into a real-time decision engine. Built on React 18, TypeScript, Supabase, and powered by Groq AI.

---

## 👥 Team Members

| Name | GitHub | Role |
|------|--------|------|
| Shivam Mahesh Gawade (Lead) | [@ShivamGawade-XS](https://github.com/ShivamGawade-XS) | Team Leader |
| Sharan Andrade | [@24ec23-shade](https://github.com/24ec23-shade) | Developer |
| Rahul Rathod | [@24ec17-svg](https://github.com/24ec17-svg) | Developer |
| Ashwith Ashok Shetty | [@24co35-ops](https://github.com/24co35-ops) | Developer |

---

## 🎯 Problem Statement

Organizations cannot answer:
- Why did our ESG score decrease?
- Which department is causing the problem?
- What action provides the highest ESG improvement for the lowest cost?

**EcoSphere AI answers all of this** — tracking what's happening, explaining why, predicting what comes next, and recommending what to do.

---

## 🚀 Core Modules

### 🌍 Environmental
- Carbon transaction tracking (manual + auto-calculated from ERP sources)
- Emission factors library with CSV bulk import
- Sustainability goals with progress tracking and trajectory alerts
- Department emissions heatmap (department × month grid)

### 🤝 Social
- CSR activity management with participation approval workflow
- Evidence upload and requirement enforcement
- Diversity metrics entry and visualization
- Training completion tracker

### 🏛️ Governance
- ESG policy lifecycle (Draft → Active → Archived)
- Policy acknowledgement tracking with automated reminders
- Audit management with findings documentation
- Compliance issue tracking — severity-coded with mandatory ownership

### 🎮 Gamification
- Challenge system with full lifecycle enforcement
- XP and points economy
- Badge auto-award engine
- Reward catalog with atomic redemption
- Three leaderboard types

### 🤖 Mission Control (AI Layer)
- Executive Decision Cards
- What-if Impact Simulator
- AI ESG Copilot (Groq Llama 3.3-70B)
- ESG Forecast (linear regression)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend & DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| State Management | TanStack Query v5 |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| AI | Groq API (llama-3.3-70b-versatile) |
| PDF Export | jsPDF + html2canvas |
| Excel Export | SheetJS (xlsx) |
| Build | Vite |

---

## ⚙️ Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase project (free tier works)
- Groq API key (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/ShivamGawade-XS/EcoSphere_CrimsonSyndicate_Odoo.git
cd EcoSphere_CrimsonSyndicate_Odoo

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
VITE_GROQ_API_KEY=[your-groq-api-key]
```

### Database Setup

Run the migration files in order in your Supabase SQL Editor:

```
supabase/migrations/001_core_tables.sql
supabase/migrations/002_master_data.sql
supabase/migrations/003_transactional_tables.sql
supabase/migrations/004_rls_policies.sql
supabase/migrations/005_functions.sql
supabase/migrations/006_indexes.sql
```

---

## 📁 Project Structure

```
ecosphere-ai/
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── charts/             # Recharts wrappers
│   │   ├── layout/             # Sidebar, TopBar, Shell
│   │   └── shared/             # Reusable components
│   ├── features/
│   │   ├── environmental/      # Environmental module
│   │   ├── social/             # Social module
│   │   ├── governance/         # Governance module
│   │   ├── gamification/       # Challenges, XP, badges, rewards
│   │   ├── reports/            # Report components + builder
│   │   ├── mission-control/    # Mission Control dashboard
│   │   └── settings/           # All settings pages
│   ├── hooks/                  # Global custom hooks
│   ├── lib/                    # Utilities, Supabase client
│   └── types/                  # TypeScript type definitions
├── supabase/
│   ├── migrations/             # SQL schema files
│   ├── functions/              # Edge Functions (Deno)
│   └── seed/
│       └── demo_data.sql
└── public/
```

---

## 🎮 Demo Credentials

After loading demo data:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@greentech.demo | Demo@1234 |
| Executive | ceo@greentech.demo | Demo@1234 |
| ESG Manager | esg@greentech.demo | Demo@1234 |
| Dept Head | mfg-head@greentech.demo | Demo@1234 |
| Employee | employee1@greentech.demo | Demo@1234 |

---

## 📊 ESG Scoring Engine

```
Environmental Score = 100 - deductions based on goal trajectory
Social Score = (CSR Rate × 40) + (Training Rate × 30) + (Diversity × 30)
Governance Score = (Policy Rate × 40) + (Audit Rate × 30) + 30 - issue penalties

Department Score = (Env × env_weight%) + (Social × social_weight%) + (Gov × gov_weight%)
Org Score = weighted average of department scores by headcount
```

Default weights: **Environmental 40% / Social 30% / Governance 30%** (configurable per org)

---

## 📜 License

MIT — EcoSphere AI, CrimsonSyndicate Team, Odoo Hackathon '26
