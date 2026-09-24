# SIH 2026 Presentation Draft: CrimeShield AI (Team CTRL Z)

*(Note: Convert these points into infographics/diagrams where possible on your slides!)*

## Slide 1: TITLE PAGE
* **Problem Statement ID:** SIH26184
* **Problem Statement Title:** Predictive Cybercrime Analytics and ATM Fraud Hotspot Detection
* **Theme:** Smart Automation / Security & Surveillance
* **PS Category:** Software
* **Team ID:** [Leave Blank]
* **Team Name:** CTRL Z

---

## Slide 2: IDEA TITLE - CrimeShield AI
### Proposed Solution
* **What it is:** A full-stack, predictive analytics platform that generates real-time cybercrime hotspot maps.
* **How it works:** Ingests raw cybercrime FIRs, ATM transaction logs, and mule account data into a custom XGBoost Machine Learning model.
* **Addressing the problem:** Shifts law enforcement from a *reactive* investigation model to a *proactive* deployment model by calculating live risk scores for ATMs.
* **Innovation & Uniqueness:** 
  * Replaces static mapping with **Network Graph Theory** (connecting Victims → Mules → ATMs).
  * We have a **live working Next.js/FastAPI prototype**, not just a concept.

---

## Slide 3: TECHNICAL APPROACH
* **Frontend:** Next.js (React), Tailwind CSS, React-Leaflet (Interactive Heatmaps)
* **Backend:** FastAPI (Python), REST API Architecture
* **Machine Learning:** XGBoost (Classification & Risk Scoring), Pandas
* **Methodology (Flow):**
  1. **Data Ingestion:** Process 30,000+ transaction nodes.
  2. **Feature Engineering:** Extract key indicators (e.g., `mule_chain_length`, `reporting_delay_mins`).
  3. **ML Inference:** XGBoost predicts fraud probability across 23 city zones.
  4. **Visualization:** Next.js renders the live threat map for police command centers.
*(Pro-tip: Paste a screenshot of your working map dashboard here!)*

---

## Slide 4: FEASIBILITY AND VIABILITY
* **Feasibility Analysis:** 
  * Highly feasible: Runs on standard cloud infrastructure (AWS/GCP).
  * Uses highly optimized, open-source AI frameworks (no expensive GPUs required).
  * API-first design allows easy integration with existing NCRB databases.
* **Potential Challenges & Risks:**
  * **Data Privacy:** Cybercrime data contains highly sensitive Personally Identifiable Information (PII).
  * **Reporting Latency:** Bank frauds are often reported with a 24 to 48-hour delay.
* **Overcoming Strategies:**
  * **Anonymization Engine:** Backend masks data; analysts only see risk scores and hashes.
  * **Temporal ML Features:** Model mathematically compensates for delayed reporting using the `reporting_delay_mins` feature.

---

## Slide 5: IMPACT AND BENEFITS
* **Target Audience:** Indian Police Service (IPS), Cyber Cells, and the Indian Cyber Crime Coordination Centre (I4C).
* **Social Impact:** Protects vulnerable citizens (elderly, rural populations) from devastating financial ruin.
* **Economic Benefit:** Prevents millions of rupees from being permanently siphoned into organized crime syndicates.
* **Operational Efficiency:** Automates the manual clustering of related FIRs, saving thousands of hours for cybercrime investigators.

---

## Slide 6: RESEARCH AND REFERENCES
* **National Crime Records Bureau (NCRB) Reports:** Analyzed state-wise cybercrime trends to mathematically model our synthetic data distributions.
* **I4C Guidelines:** Researched the Indian Cyber Crime Coordination Centre's operating procedures for handling financial fraud.
* **XGBoost Documentation:** Utilized advanced gradient boosting techniques for high-accuracy tabular data predictions. (https://xgboost.readthedocs.io/)
* **Network Graph Theory in Fraud Detection:** Applied research on mapping mule account routing (e.g., the Jamtara/Nuh syndicated fraud models).
