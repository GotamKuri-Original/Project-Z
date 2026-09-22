# 🏛️ Slide Content: System Architecture & Integration (MHA Ecosystem)

> **Speaker Note for this slide**: "We recognize that our AI doesn't operate in a vacuum. To accurately predict withdrawal zones and act proactively, CrimeShield AI integrates directly with the existing MHA ecosystem."

---

## 🖼️ Visual Layout (How to design the slide)

Create a 3-Step Flow Diagram (Left to Right):

### [Box 1: The Trigger]
- **NCRP / 1930 Helpline**
- **Action:** Victim reports cyber fraud (UPI, OTP, etc.)

*(Arrow pointing to Box 2)* ➔ 

### [Box 2: Data Enrichment & AI Engine (Our Project)]
- **Top Half:** **CFCFRMS Integration**
  - *Action:* System traces mule account transaction chains instantly.
  - *Result:* Reveals the destination bank branches.
- **Bottom Half:** **CrimeShield AI Engine**
  - *Action:* Feeds CFCFRMS location data + historical NCRB trends into our **XGBoost Classifier**.
  - *Result:* Predicts Top 5 physical ATM withdrawal zones.

*(Arrow pointing to Box 3)* ➔

### [Box 3: Real-Time Action]
- **CCTNS (Crime and Criminal Tracking Network & Systems)**
- **Action:** Automated alert dispatched to nearest police stations.
- **Result:** Patrol teams deployed to intercept suspects at high-risk ATMs during the "Golden Hour".

---

## 🗣️ Key Talking Points (Memorize these for the pitch)

1. **Solving the Geographic Gap**: *"A victim in Delhi doesn't tell us where the criminal is. But by assuming integration with CFCFRMS, we instantly get the geographic signature of the mule accounts. That's the missing link that powers our prediction."*
2. **The Golden Hour**: *"Our system operates in the 2-24 hour window after a complaint is filed, while the cash is in transit through mule networks."*
3. **Actionability**: *"We don't just show dots on a map. By plugging into CCTNS, we turn a prediction into a dispatch alert instantly."*
