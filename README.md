# 🛡️ CrimeShield AI — Project-Z

> **Predictive Analytics to Forecast Cybercrime Cash Withdrawal Locations**
> SIH 2026 | Team CTRL Z | PS: SIH26184 | Ministry of Home Affairs

## What is this?

An AI-powered platform that predicts WHERE cybercriminals will withdraw stolen money from ATMs — and alerts police BEFORE they get there.

## Features

- 🗺️ **Live Risk Map** — ATMs across India color-coded by risk level
- 🧠 **Prediction Engine** — XGBoost ML model forecasts likely cash withdrawal zones
- 🕸️ **Criminal Network Graph** — Maps connections between suspects, mule accounts, and ATMs
- 📊 **Analytics Dashboard** — Real-time KPIs, fraud trends, and state-wise heatmaps
- 🔔 **Alert System** — Instant alerts when high-risk predictions are triggered

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Leaflet.js, vis.js, Recharts |
| Backend | Python FastAPI |
| ML | XGBoost, scikit-learn |
| Graph | NetworkX |
| Database | SQLite |

## Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m app.main
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Team CTRL Z

Built with ❤️ for Smart India Hackathon 2026
