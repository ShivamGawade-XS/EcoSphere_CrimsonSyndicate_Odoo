# 🌿 EcoSphere — ESG Management Platform

> **Team:** CrimsonSyndicate · **Hackathon:** Odoo Hackathon 2025
>
> An all-in-one Environmental, Social and Governance (ESG) management platform that integrates operational data, employee participation, and intelligent reporting into a single dashboard.

---

## 🚀 Features

### 🌱 Environmental Module
- **Carbon Transaction Ledger** — Log and auto-calculate CO₂ emissions by department using configurable emission factors
- **Emission Factor Registry** — Custom CRUD + CSV bulk upload for factors across purchase, fleet, manufacturing, and expense categories
- **Sustainability Goals Tracker** — Visual progress bars with deadline-aware off-track alerts (>20% behind linear trajectory)
- **Stacked Area Charts** — Recharts-powered monthly carbon trend visualizations per department

### 🤝 Social Module
- **CSR Activity Board** — Join CSR events with seat-limit enforcement and manager approval workflows
- **Workforce Diversity Dashboard** — Gender breakdown by department using Recharts stacked bar charts
- **Training Completion Logs** — Employee training records with bulk CSV import support

### ⚖️ Governance Module
- **Policy Register** — Draft → Active → Archived policy lifecycle with employee sign-off tracking
- **Audit Tracker** — Schedule and manage compliance audits with findings documentation
- **Compliance Issues Board** — Severity-tagged issues with owner assignment and overdue detection

### 🎮 Gamification Engine
- **Green Wallet** — Employee XP balance, badge gallery, and point transaction audit trail
- **Challenges Board** — Join, progress, and submit evidence for ESG challenges
- **Reward Catalog** — Atomic redemption with stock management and point deduction
- **Leaderboards** — Individual XP rank, challenges completed, and department ESG rank

### 🧠 Mission Control (AI Dashboard)
- **What-If Scenario Sliders** — Model impact of fleet EV %, solar capacity, CSR participation, compliance resolution
- **3-Month ESG Forecasting** — Linear regression projections with confidence bands
- **AI Decision Copilot** — Groq Llama 3.3 integration for context-aware strategic recommendations
- **Executive Decision Cards** — Risk summaries and recommended actions

### 📊 Reports & Analytics
- **Custom Report Builder** — Filter by department, module, and date range
- **AI Executive Summary** — One-click LLM-generated narrative from filtered data
- **Multi-format Export** — PDF (jsPDF + html2canvas), Excel multi-sheet (SheetJS), CSV

### ⚙️ Settings & Administration
- **ESG Weight Sliders** — Dynamic E/S/G weighting that auto-balances to 100%
- **Department Hierarchy** — Create and manage org-wide department tree
- **User Role Management** — Assign roles and department memberships
- **Reward Fulfilment Log** — Track pending and fulfilled reward claims

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Charts | Recharts |
| Styling | Tailwind CSS |
| UI Components | Radix UI primitives |
| Icons | Lucide React |
| PDF Export | jsPDF + html2canvas |
| Excel Export | SheetJS (xlsx) |
| AI Integration | Groq Cloud API (Llama 3.3 70B) |
| State/DB | localStorage abstraction (dbService) |

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/ShivamGawade-XS/EcoSphere_CrimsonSyndicate_Odoo.git
cd EcoSphere_CrimsonSyndicate_Odoo
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Optional: Groq API key for AI features (falls back to simulated insights if not set)
VITE_GROQ_API_KEY=your_groq_api_key_here
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

### Running Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🏗️ Project Structure

```
src/
├── features/
│   ├── environmental/     # Carbon tracking, emission factors, goals
│   ├── social/            # CSR activities, diversity, training
│   ├── governance/        # Policies, audits, compliance issues
│   ├── gamification/      # Wallet, challenges, rewards, leaderboard
│   ├── mission-control/   # AI dashboard, forecasting, scenarios
│   ├── reports/           # Custom reports and multi-format export
│   └── settings/          # Org config, departments, users
├── lib/
│   ├── dbService.ts       # localStorage persistence layer + ESG score engine
│   ├── mockData.ts        # Default seed data for demo
│   └── esgUtils.ts        # Shared utility helpers (formatters, score calcs)
├── types/
│   └── index.ts           # All TypeScript domain types
└── main.tsx               # App entry — initializes DB and renders root
```

---

## 👥 Team — CrimsonSyndicate

| Member | GitHub | Email | Role | Contribution |
|---|---|---|---|---|
| **Shivam Mahesh Gawade** | [@ShivamGawade-XS](https://github.com/ShivamGawade-XS) | 24ec25@aitdgoa.edu.in | Team Lead & Full-Stack | Core architecture, all ESG feature modules, AI integration |
| **Ashwith Ashok Shetty** | [@24co35-ops](https://github.com/24co35-ops) | 24co35@aitdgoa.edu.in | Frontend & Types | TypeScript type system, domain modelling, runtime type guards |
| **Rahul Rathod** | [@24ec17-svg](https://github.com/24ec17-svg) | 24ec17@aitdgoa.edu.in | Documentation & QA | README, project docs, testing, build verification |
| **Sharan Andrade** | [@24ec23-shade](https://github.com/24ec23-shade) | 24ec23@aitdgoa.edu.in | DevOps & Utilities | Build config, Vite chunk optimization, shared ESG utility library |

---

## 📄 License

This project was built for the **Odoo Hackathon 2025** by Team CrimsonSyndicate. All rights reserved.
