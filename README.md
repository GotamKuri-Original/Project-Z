# 🛡️ CrimeShield AI: National Cyber Crime Prediction Portal

*Automated Forecasting of Cybercrime Cash Withdrawal Locations, Deterministic Trace & Rapid ATM Interception*  
*Engineered for the Ministry of Home Affairs (MHA), I4C, and State Cyber Cells*  
*Developed for Problem Statement SIH26184 | Smart India Hackathon (SIH) 2026*

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
<br>
![XGBoost](https://img.shields.io/badge/XGBoost-199900?style=for-the-badge)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)

---

## 📑 Table of Contents

- [Executive Summary](#-executive-summary)
- [Problem Statement & Operational Context](#-problem-statement--operational-context)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Complete Feature Breakdown (A to Z)](#-complete-feature-breakdown-a-to-z)
  - [A. Deterministic NPCI Auto-Trace](#a-deterministic-npci-auto-trace)
  - [B. Stage-1 Macro Prediction (XGBoost)](#b-stage-1-macro-prediction-xgboost)
  - [C. Stage-2 Micro Targeting (PostGIS)](#c-stage-2-micro-targeting-postgis)
  - [D. Explainable AI (TreeSHAP)](#d-explainable-ai-treeshap)
  - [E. Human-in-the-Loop & Confidence Gating](#e-human-in-the-loop--confidence-gating)
  - [F. Multi-Channel Alert Cascade](#f-multi-channel-alert-cascade)
- [Technology Stack & Frameworks](#-technology-stack--frameworks)
- [Security, Privacy & Compliance](#-security-privacy--compliance)
- [Project Directory Structure](#-project-directory-structure)
- [Build & Installation Guide](#-build--installation-guide)
- [Field Deployment Scenarios](#-field-deployment-scenarios)
- [Licenses & Team Attribution](#-licenses--team-attribution)

---

## 🌐 Executive Summary

Currently, when a cyber fraud complaint is reported via the **1930 National Helpline**, recovering the funds is a heavily manual, high-latency process. Syndicates layer stolen money through 4–8 mule accounts and dispatch a cash runner to an ATM within minutes. By the time law enforcement issues cross-bank freezing requests (which takes 2 to 24 hours), the cash has already been physically withdrawn and laundered into the cash economy.

**CrimeShield AI** completely reverses this operational paradigm. 

Instead of chasing money that is already gone, CrimeShield utilizes a **Two-Stage Machine Learning and Spatial Intelligence pipeline** to predict the exact ATM the cash runner is driving toward, dispatching a Police Control Room (PCR) van to intercept them *before* the withdrawal occurs. Our system integrates directly with the existing CFCFRMS ecosystem, requiring zero workflow changes for on-ground officers while generating court-admissible audit trails.

---

## ⚖️ Problem Statement & Operational Context

| Operational Bottleneck | Conventional Reality (Today) | The CrimeShield AI Solution |
| :--- | :--- | :--- |
| **Tracing Latency** | Police send emails bank-to-bank, waiting hours for transaction logs. | **Automated NPCI Trace:** Instantly maps the 4-8 hop mule chain to the final destination node in seconds. |
| **Action Timeline** | 2 to 24 hours to secure a freeze. | **Intervention Window:** Dispatches police to the physical ATM in < 20 minutes. |
| **Output Type** | Bureaucratic paperwork (circulars, account freeze requests). | **Tactical Deployment:** Exact Top-3 ATM GPS coordinates, risk scores, and live routing. |
| **Targeting Precision** | Vague, city-wide "heatmaps" requiring blanket patrols. | **Micro-Targeting:** PostGIS GiST indexing narrows 2.5 lakh+ ATMs down to a 3-ATM patrol shortlist. |
| **Verification & Evidence** | Disconnected emails and fragmented FIRs. | **SHAP Audit Trail:** Timestamped reason codes explaining exactly *why* the AI flagged a specific ATM. |

---

## ⚙️ System Architecture & Data Flow

```text
+-----------------------------------------------------------------------------------+
|                           INGESTION & AUTO-TRACE                                  |
|                                                                                   |
|  [ 1930 Complaint Intake ] ──> [ SHA-256 PII Hashing ] ──> [ NPCI Trace API ]     |
|  (Victim City, Amount, Delay)                              (Extracts Last Node)   |
+-----------------------------------------------------------------------------------+
                                        │
                                        ▼
+-----------------------------------------------------------------------------------+
|                        STAGE 1: MACRO-PREDICTION (AI)                             |
|                                                                                   |
|  [ Feature Engineering ] ──> [ XGBoost Classifier ] ──> [ Confidence Gating ]     |
|  (Velocity, MO, Hops)        (Predicts Top-3 Cities)    (Drops low-confidence)    |
+-----------------------------------------------------------------------------------+
                                        │
                                        ▼
+-----------------------------------------------------------------------------------+
|                        STAGE 2: MICRO-TARGETING (GEO)                             |
|                                                                                   |
|  [ PostGIS GiST Index ] ──> [ Spatial Risk Engine ] ──> [ ATM Ranker ]            |
|  (ST_DWithin Queries)       (Highway, CCTV, Border)     (Outputs Top 3 GPS)       |
+-----------------------------------------------------------------------------------+
                                        │
                                        ▼
+-----------------------------------------------------------------------------------+
|                        DISPATCH & COMMAND CENTRE                                  |
|                                                                                   |
|  [ Explainability ] ──> [ Officer Approval ] ──> [ Alert Cascade Trigger ]        |
|  (TreeSHAP Reasons)     (Human-in-the-loop)      (Push + Email + Webhook)         |
+-----------------------------------------------------------------------------------+
```

---

## 🔬 Complete Feature Breakdown (A to Z)

### A. Deterministic NPCI Auto-Trace
The system does not guess where the money went. It uses a deterministic hash lookup simulating an NPCI transaction trace, instantly unrolling the 4–8 hop mule network to locate the final drop account prior to cash-out.

### B. Stage-1 Macro Prediction (XGBoost)
A robust `XGBoost` multi-class classifier trained on 50,000+ synthetic cases mirroring NCRB and RBI datasets. It evaluates non-linear features (reporting delay, transaction amount buckets, fraud type) to predict the destination city with >83% test-set accuracy.

### C. Stage-2 Micro Targeting (PostGIS)
Once the city is predicted, the system uses a `PostgreSQL + PostGIS` database with a `GiST` spatial index to scan thousands of local ATMs in milliseconds. It scores them based on a weighted risk formula:
`Risk = w1*(Highway Proximity) + w2*(State Border) + w3*(CCTV Blindspot) + w4*(Network Velocity)`

### D. Explainable AI (TreeSHAP)
Law enforcement cannot arrest individuals based on a "black box" algorithm. CrimeShield integrates `TreeSHAP` to generate exact reason codes (e.g., *"Flagged: 420m from NH-19, historical scam hub"*), providing court-admissible logic for every deployment.

### E. Human-in-the-Loop & Confidence Gating
- **Confidence Gating:** If the XGBoost prediction confidence falls below a strict threshold, the system withholds the dispatch recommendation to prevent false positives and wasted fuel.
- **Officer Approval:** The AI does not auto-dispatch. An investigating officer must manually click `APPROVE` or `REJECT` on the dashboard, satisfying legal prerequisites.

### F. Multi-Channel Alert Cascade
Upon officer approval, a concurrent alert cascade fires instantly:
1. **Push Notifications:** Delivered to beat officers' phones via `ntfy.sh`.
2. **Email SMTP:** Official dispatch brief sent to the State Cyber Cell.
3. **API Webhooks:** Automated JSON payloads sent to bank APIs / I4C tracking endpoints.

---

## 🖥️ Technology Stack & Frameworks

| Domain | Technologies Utilized | Role in Architecture |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 14, React 18, TypeScript | Command Centre Dashboard (App Router) |
| **Visualizations** | Leaflet.js, vis-network, Framer Motion | Live GPS Mapping, Mule Network Graphs |
| **Backend API** | Python, FastAPI, Uvicorn, Pydantic | High-concurrency async REST API |
| **Machine Learning** | XGBoost, scikit-learn, Pandas, NumPy | Predictive modeling and feature scaling |
| **Explainability** | SHAP (TreeSHAP) | Model interpretability and audit generation |
| **Database & Geo** | PostgreSQL, PostGIS, SQLAlchemy | Spatial database and object-relational mapping |
| **Integrations** | ntfy.sh, Gmail SMTP, Webhooks | Real-time field dispatch and notification cascade |

---

## 🔒 Security, Privacy & Compliance

- **DPDP Act 2023 Compliant:** Operates on a strict Privacy-by-Design architecture.
- **SHA-256 Hashing:** All Personally Identifiable Information (PII) — including victim names, phone numbers, and bank account numbers — is cryptographically hashed at the ingestion layer.
- **Role-Based Access (RBAC):** On-ground patrol officers receive strictly the ATM GPS coordinates and threat level, preventing unauthorized access to financial data.
- **Immutable Audit Logging:** Every AI prediction, SHAP explanation, and Officer Approval/Rejection is timestamped and recorded for judiciary review under Section 65B of the IT Act.

---

## 📂 Project Directory Structure

```text
CrimeShield_AI/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routes (predict, actions, trace)
│   │   ├── core/            # Config, security, logging
│   │   ├── data/            # Datasets, synthetic generators, PostGIS scripts
│   │   ├── ml/              # XGBoost model training, .pkl files, SHAP logic
│   │   ├── schemas/         # Pydantic validation models
│   │   └── services/        # Business logic (Notification cascade, ATM ranking)
│   ├── main.py              # Uvicorn ASGI entry point
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router (Dashboard, Map, Network)
│   │   ├── components/      # Reusable React components (Charts, Modals)
│   │   └── lib/             # API client, types, utilities
│   ├── public/              # Static assets (Emblems, Logos)
│   └── package.json         # Node.js dependencies
└── README.md                # Technical Documentation
```

---

## 🚀 Build & Installation Guide

### 1. Prerequisites
- **Node.js:** v18.0+
- **Python:** v3.10+
- **PostgreSQL:** v14+ (with PostGIS extension installed)

### 2. Database Setup (PostGIS)
```bash
# Connect to PostgreSQL and create the database
CREATE DATABASE crimeshield_db;
\c crimeshield_db
CREATE EXTENSION postgis;
```

### 3. Backend Setup (FastAPI + XGBoost)
```bash
cd backend
# Create and activate virtual environment
python -m venv cs_venv
source cs_venv/bin/activate  # (On Windows: cs_venv\Scripts\activate)

# Install dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup (Next.js)
```bash
cd frontend
# Install dependencies
npm install

# Run the development server
npm run dev
# The Command Centre will be available at http://localhost:3000
```

---

## 🛰️ Field Deployment Scenarios

**Scenario 1: The Zero-Hour Strike (Jamtara to Urban Metro)**
A victim in Delhi reports a ₹5 Lakh UPI fraud via 1930. The money hops through 5 mule accounts, ending up in a dormant account in Gurugram. CrimeShield ingests the delay and hop-velocity, ranks the top 3 ATMs near the Gurugram border highway, and dispatches a PCR van exactly 12 minutes before the runner arrives at the ATM.

**Scenario 2: The Decoy Network (Digital Arrest Scam)**
Scammers trigger dozens of ₹50 micro-transactions across states to confuse manual investigators. CrimeShield's XGBoost model automatically filters out the low-value noise (using amount-weighting features) and isolates the primary high-value cash-out node in Kolkata, ignoring the decoys entirely.

---

## 🔮 Future Roadmap

1. **CCTV Integration (CMS Hook):** Automated API trigger to bank CMS software (e.g., Milestone/Avigilon) to activate STQC-compliant recording at the predicted ATM for court evidence.
2. **Geofence ATM Lock:** Integration with ATM switch networks to temporarily disable cash-dispensing capabilities for specific flagged terminals if a PCR van is delayed.
3. **Kingpin Network Extraction:** Implementing `PageRank` algorithms on seized mobile devices to map the syndicate hierarchy beyond the ground-level cash runners.

---

## 👥 Licenses & Team Attribution

- **XGBoost:** Apache 2.0 License
- **SHAP:** MIT License
- **PostGIS:** GNU General Public License v2.0
- **Data:** Synthetic data generated for demonstration; inspired by official NCRB 2022 statistics.

*Developed with determination for the Ministry of Home Affairs (MHA) | Problem Statement SIH26184*  
**Engineered by Team byte_slayers.**
