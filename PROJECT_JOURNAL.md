# 📓 Team CTRL Z — Project Journal

> **This is our living project log. Updated at every step.**
> Share this with your friends to show them the full journey.

---

## 🏷️ Project Info

| Field | Detail |
|---|---|
| **Team Name** | CTRL Z |
| **Problem Statement** | SIH26184 |
| **Project Name** | CrimeShield AI |
| **Ministry** | Ministry of Home Affairs (MHA) |
| **Theme** | Blockchain & Cybersecurity |
| **Hackathon** | Smart India Hackathon 2026 |
| **Internal Hackathon** | Sept 20-21, 2026 |
| **GitHub Repo** | `github.com/GotamKuri-Original/Project-Z` |

### Problem Statement (Official)
> *"Development of a Predictive Analytics Framework for Cybercrime Complaints to Forecast Likely Cash Withdrawal Locations in Advance, Enabling Generation of Actionable Intelligence for Timely and Proactive Cybercrime Intervention."*

### What We're Building (Simple Version)
> An AI-powered platform that predicts WHERE cybercriminals will withdraw stolen money from ATMs — and alerts police BEFORE they get there. Also maps entire criminal networks using graph AI to identify kingpins.

---

## 📅 Timeline

| Phase | Date | Status |
|---|---|---|
| Research & Problem Selection | Aug 26-27 | ✅ Done |
| Registration (Internal Hackathon) | Aug 27 | ✅ Done |
| Implementation Planning | Sept 15 | ✅ Done |
| **Day 1: Foundation (Data & Backend)** | Sept 15 | ✅ Done |
| **Day 2: Basic ML & Map** | Sept 16 | ✅ Done |
| **Day 3: Network Graph & Tables** | Sept 17 | ✅ Done |
| **Day 4: Dashboard & Core Flow** | Sept 18 | ✅ Done |
| **Day 5: Premium Overhaul & Real ML** | Sept 19-21 | ✅ Done |
| 🏆 Internal Hackathon | Sept 25-26 | ⏳ UPCOMING |

---

## 🗂️ Decision Log

### Decision 1: Problem Statement Selection
- **Final Pick**: **SIH26184 — Predictive Cybercrime Analytics**
- **Why**: High impact, extremely relevant to current Indian cybercrime landscape (Jamtara, Mewat), and incredible demo potential with maps and graphs.

### Decision 2: Tech Stack
- **Frontend**: Next.js 14 + Tailwind CSS + Leaflet.js (maps) + vis.js (graphs)
- **Backend**: Python FastAPI (Fast, modern, integrates easily with ML)
- **ML**: XGBoost (Best for tabular crime data, handles non-linear relationships well)
- **Database**: SQLite (Zero config for hackathon prototype)

### Decision 3: The "Premium" Overhaul (Sept 21)
- **Context**: Original UI felt basic. User wanted a "wow" factor for the hackathon.
- **Action**: Completely rewrote the CSS to a "Dark Command Center" aesthetic (glassmorphism, neon accents, Inter/JetBrains fonts, dynamic hover states).
- **Result**: A highly professional, government-grade dashboard look.

### Decision 4: Fixing the ML "Circular Logic" Hole (Sept 21)
- **Context**: A mock judge critique revealed that our initial predictions were just "if-else" statements based on hardcoded assumptions, which judges would instantly penalize.
- **Action**: Trained an actual **XGBoost Classifier** on our synthetic data to predict the withdrawal city (19.6% accurate across 23 cities, successfully learning victim-city correlations). Replaced the mock endpoint with a real `.pkl` model inference engine.
- **Action 2**: Added the **CFCFRMS Integration Architecture** to our presentation to explain *how* we know where criminals are going (tracing mule accounts, not just relying on victim location).

---

## 🔨 Build Log

### Day 1 — Foundation (Sept 15)
```
✅ Created project folder structure (FastAPI backend + Next.js frontend)
✅ Installed Node.js & Python dependencies
✅ Wrote synthetic data generator (50k+ records of complaints, ATMs, withdrawals)
✅ Created database models and SQLite connection
```

### Day 2 — Basic Map & APIs (Sept 16)
```
✅ Built prediction API skeleton
✅ Integrated Leaflet map in Next.js (Dynamic client-side rendering)
✅ Plotted color-coded high-risk ATMs on the map
```

### Day 3 — Network Graph & Case Files (Sept 17)
```
✅ Implemented NetworkX PageRank algorithm in backend
✅ Built interactive graph visualization with vis.js
✅ Created the "Case Files" paginated data table UI
```

### Day 4 — Dashboard & Core Flow (Sept 18)
```
✅ Built main dashboard with KPI cards and Recharts (Donut & Area charts)
✅ Built the Threat Prediction form (Complaint intake)
✅ Connected all pages with a sidebar layout
```

### Day 5 — Polish, Premium UI, and Real ML (Sept 19-21) 🚀
```
✅ CRITICAL: Replaced basic UI with "Premium Command Center" design system
✅ Added custom globals.css (glassmorphism, glowing borders, animations)
✅ CRITICAL: Trained a real XGBoost multi-class classification model (train_model.py)
✅ Upgraded /predict API to load real .pkl model and execute feature engineering
✅ Added "Dispatch Alert" button for realistic CCTNS integration
✅ Created architecture_slide.md for PPT to defend logical gaps
✅ Conducted full mock Judge Critique to find and patch weaknesses
```

---

## 🏗️ Architecture (MHA Ecosystem Integration)

```
┌─────────────────────────────────────────────────────┐
│                    CRIMESHIELD AI                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  [1930 Helpline] ➔ [CFCFRMS Tracing] ➔ [XGBoost ML]   │
│                                           │           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │           │
│  │ Dashboard │  │ Risk Map │  │ Network  │ │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘ │           │
│       │              │              │     │           │
│       └──────────────┼──────────────┘     │           │
│                      │                    │           │
│              ┌───────▼───────┐            │           │
│              │  FastAPI      │ ◄──────────┘           │
│              └───────┬───────┘                        │
│                      │                                │
│         ┌────────────┼────────────┐                   │
│  ┌──────▼──┐  ┌──────▼──┐  ┌─────▼───┐              │
│  │ XGBoost │  │ NetworkX│  │ SQLite  │              │
│  │ Model   │  │ Graph   │  │ Database│              │
│  └─────────┘  └─────────┘  └─────────┘              │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 🎤 Demo Script (3 Minutes)

### Act 1: The Hook (30 sec)
> *"8,000 cybercrime complaints every day. By the time police act, the money is gone. Our solution, CrimeShield AI, integrates with the CFCFRMS to trace mule accounts instantly, allowing our XGBoost model to predict WHERE criminals will withdraw cash... BEFORE they get there."*

### Act 2: The Prediction (60 sec)
> Fill complaint form → Click "Analyze Threat" → Shows XGBoost confidence and Critical Risk Zone → Click "Dispatch Alert" to simulate CCTNS police deployment.

### Act 3: The Map & Network (45 sec)
> Show the Risk Map (physical layout of ATMs) → Switch to Network Intel graph → Show connected suspects → *"This graph uses PageRank to identify the kingpin controlling 7 mule accounts across 3 states."*

### Act 4: The Impact (45 sec)
> Dashboard shows the stats. *"We give police the golden hour back. We Ctrl+Z the crime before it happens."* 🎤⬇️

---

## 💡 Key Defenses (From Judge Critique)

1. **How do you know WHERE criminals will withdraw?**
   *"We integrate with CFCFRMS to trace money flow through mule accounts instantly. The destination bank branches give us the geographic signal. Our model combines this with historical ATM withdrawal patterns."*
2. **What if the criminal uses a different ATM?**
   *"We predict ZONES, not specific ATMs. Top 5 zones give police a 15-20 km radius, which is actionable for patrol deployment."*
3. **What happens after prediction?**
   *"Prediction → Alert to nearest police station via CCTNS → Officers deployed to zone → ATM surveillance → Suspect interception."*

---

> **Last Updated**: September 22, 2026
> **Next Update**: Hackathon Presentation Prep!
