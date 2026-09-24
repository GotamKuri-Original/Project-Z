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

### 1. Automated Backend Setup (Recommended)
Run the automated setup script. This will create a secure Python 3.12 environment, install dependencies, generate the synthetic crime database, and train the XGBoost model.
Double-click `setup.bat` or run:
```bash
.\setup.bat
```

### 2. Start the Backend
```bash
cd backend
venv\Scripts\activate
python -m app.main
```
*(Runs on http://localhost:8000)*

### 3. Start the Frontend
Open a **new** terminal window:
```bash
cd frontend
npm install
npm run dev
```
*(Runs on http://localhost:3000)*

## Team CTRL Z

Built with ❤️ for Smart India Hackathon 2026
