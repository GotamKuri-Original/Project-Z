# 🎤 Team CTRL Z — Final Presentation Script
*Matched to actual exported Gamma PDF slides*

---

## Team & Slide Assignments

| Person | Role | Presents | Time |
|---|---|---|---|
| **Harsh** | Project Manager | Slide 1 (Title + Intro) → Slide 5 (Feasibility left side) | ~2 min |
| **Gotam** | Backend & ML | Slide 2 (Problem & Solution) → Slide 4 (Technical Flow) | ~4.5 min ⭐ |
| **Ashmita** | Graphics/UI-UX | Slide 3 (What Makes Us Different) → Slide 5 (Impact right side) | ~3 min ⭐ |
| **Mohit** | Frontend + Python | Slide 3 (Tech Stack cards only) | ~1 min |
| **Vansh** | Researcher | Slide 6 (References) | ~1 min |
| **Nitin** | Frontend | Live demo support + backs up Q&A | ~30 sec |

---

## SLIDE 1 — Title Page
**Speaker: HARSH**

*What's on screen: Shield + ATM image on left. "SMART INDIA HACKATHON · SIH26184" badge. Title. Theme, PS Category, Team Name.*

> "Good morning/afternoon judges. We are Team CTRL Z, presenting Problem Statement SIH26184 — Predictive Cybercrime Analytics and ATM Fraud Hotspot Detection, under Smart Automation and Security & Surveillance.
>
> Quick introductions — I'm Harsh, Project Manager. With me are Gotam our Backend & ML Engineer, Ashmita our UI/UX Designer, Mohit and Nitin our Frontend Developers, and Vansh our Researcher.
>
> Gotam will walk you through the problem we're solving."

**Handoff → Gotam**

---

## SLIDE 2 — The Problem & Our Solution — CrimeShield AI
**Speaker: GOTAM**

*What's on screen: Blue box on left = "🔴 The Problem" with 4 bullets. White area on right = "🟢 Our Solution: CrimeShield AI" with 3 numbered steps + Result line.*

#### Point to the BLUE BOX (left side):
> "Look at the left side — this is what's happening in India right now. A victim gets scammed. The stolen money doesn't stay in one account — it gets laundered through 4 to 8 mule accounts in minutes. Then a cash runner walks into a random ATM and withdraws the physical cash.
>
> That's the moment the digital trail is permanently broken. The money is gone forever.
>
> And look at this gap — manual tracing takes 2 to 24 hours. An ATM withdrawal takes 15 minutes. The system is always too late."

#### Point to the RIGHT SIDE:
> "This is our solution — CrimeShield AI. Instead of chasing money digitally, we predict which exact ATM the criminal will go to — before they get there.
>
> Three steps:
> - Step 1, Auto-Trace: complaint comes in, our system auto-detects the mule chain length via banking APIs.
> - Step 2, AI Prediction: our XGBoost model predicts the destination city.
> - Step 3, Pinpoint ATMs: our spatial engine ranks local ATMs and outputs the Top 3 high-risk ATMs with GPS coordinates.
>
> Result — police intercept the cash runner. Money recovered. Criminal caught.
>
> Ashmita will show you what makes this fundamentally different from anything that exists."

**Handoff → Ashmita**

---

## SLIDE 3 — What Makes Us Different
**Speaker: ASHMITA** (comparison table) → **MOHIT** (tech stack)

*What's on screen: "💡 Innovation & Uniqueness" heading. 4-row comparison table (Traditional vs CrimeShield AI). Below: "🛠️ Tech Stack" with 5 cards (ML, Backend, Frontend, Maps, Runs on).*

#### Ashmita — Point to the COMPARISON TABLE:
> "This table tells the whole story.
>
> *(point to row 1)* Traditional systems give broad city-level heatmaps. With 9,000 ATMs in a city like Delhi, that's useless. We give exact ATM-level targeting with street coordinates.
>
> *(point to row 2)* Manual bank statement analysis? Officers spending hours on Excel sheets. We automate mule chain discovery in seconds.
>
> *(point to row 3)* Most AI is a black box. Ours uses Explainable AI — it tells the officer exactly why an ATM was flagged. This is also critical for court evidence.
>
> *(point to row 4)* And the big one — traditional policing is reactive. We are proactive. We predict before the cash is withdrawn.
>
> Mohit will cover our tech stack."

#### Mohit — Point to the 5 TECH STACK CARDS:
> "Our ML runs on Python with XGBoost and Scikit-Learn. Backend is FastAPI — a high-performance async API. Frontend is Next.js, React 19, TypeScript. For maps, we use Leaflet with clustering for over 30,000 ATMs. And this all runs on standard CPU servers — no expensive GPUs.
>
> Gotam will explain how the full pipeline works."

**Handoff → Gotam**

---

## SLIDE 4 — How It Works — Technical Flow
**Speaker: GOTAM**

*What's on screen: "⚡ 4-Step Pipeline" — a 2x2 grid showing Steps 1-4. Below: "🔗 Integration Points" — 3 cards (Input, Output, Infrastructure).*

#### Point to the 4-STEP GRID:
> "Here's the exact pipeline.
>
> *(point to box 1)* Step 1, Ingest — victim reports to 1930 or CFCFRMS. Our API auto-fetches how many mule hops the money went through and the last known node.
>
> *(point to box 2)* Step 2, Predict City — this data goes into our XGBoost classifier which evaluates hour, latency, amount, and chain length. It outputs the destination corridor — for example, Mathura, UP.
>
> *(point to box 3)* Step 3, Predict ATM — now we know the city. Our spatial engine filters every local ATM by highway proximity, CCTV blind spots, and historical cash-out velocity. Output: the exact Top 3 ATMs.
>
> *(point to box 4)* Step 4, Dispatch — an automated alert goes to the nearest patrol van with GPS route, CCTV feed, and a geofence lock."

#### Point to the INTEGRATION POINTS cards:
> "And critically — look at these three cards. Input comes from NCRP and CFCFRMS — systems that already exist. Output goes to CCTNS terminals — already in every police station. Infrastructure runs on NIC Cloud with zero additional hardware cost. This is not a standalone tool — it plugs directly into existing government systems.
>
> Harsh will cover feasibility and Ashmita will cover the real-world impact."

**Handoff → Harsh then Ashmita**

---

## SLIDE 5 — Feasibility, Challenges & Impact
**Speaker: HARSH** (left side) → **ASHMITA** (right blue box)

*What's on screen: Left = "✅ Why This Is Feasible" (3 bullets) + "⚠️ Key Challenges & Our Solutions" (3 bullets). Right = blue card "🎯 Real-World Impact" (4 bullets with emojis).*

#### Harsh — Point to the LEFT SIDE:
> "Three reasons this is immediately deployable.
>
> First — it plugs directly into existing MHA infrastructure. NCRP for input, CCTNS for output. No new systems needed.
>
> Second — built entirely on open-source. Zero licensing costs.
>
> Third — XGBoost inference runs in under 50 milliseconds on standard CPU.
>
> We've also anticipated the risks:
> - Reporting delay? Our model explicitly weighs this — short delay targets local ATMs, long delay shifts to transit hubs.
> - Data privacy? Everything is SHA-256 hashed. No personal data stored.
> - Criminals change routes? We built continuous retraining from CCTNS arrest logs.
>
> Ashmita will cover the impact."

#### Ashmita — Point to the BLUE BOX (right side):
> "The real-world impact is powerful.
>
> *(point to each bullet)* 
> - Direct fund recovery — catch the cash runner at the ATM and you recover 100% of the stolen money.
> - Bust the syndicate — a physical arrest at an ATM yields cloned cards, burner phones, and contact logs leading to kingpins.
> - Save hundreds of hours — automated cross-jurisdictional mule account correlation.
> - And deterrence — when arrest risk at ATMs goes up, recruitment into cyber gangs goes down.
>
> Vansh will close with our research references."

**Handoff → Vansh**

---

## SLIDE 6 — Research & References
**Speaker: VANSH**

*What's on screen: Numbered list 1-6 with research sources.*

> "Our solution is grounded in:
> - NCRB's Crime in India reports for cybercrime distribution patterns
> - I4C operational guidelines for CFCFRMS
> - RBI and NPCI data on ATM withdrawal caps and mule layering
> - The XGBoost paper by Chen and Guestrin from ACM SIGKDD 2016
> - Spatial crime analytics research on predictive policing
> - And a fully working live prototype on our GitHub.

#### Closing — HARSH:
> "Thank you judges. We have a fully functional live prototype ready for demo. We're happy to take your questions."

---

## 🔴 Q&A — Who Answers What

| Question | Who |
|---|---|
| "How does the ML model work? Features? Accuracy?" | **Gotam** |
| "Show us the app / demo" | **Nitin** opens laptop, **Mohit** narrates |
| "Why this comparison table? How are you better?" | **Ashmita** |
| "What research? Why XGBoost over other models?" | **Vansh** (Gotam backs up) |
| "Is this feasible? Cost? Timeline? Scalability?" | **Harsh** |
| "How does it integrate with police systems?" | **Gotam** |
| "UI/UX design decisions?" | **Ashmita** |
| "What about privacy/legal?" | **Gotam + Harsh** |
| "What if criminal uses POS not ATM?" | **Vansh**: "Our focus is ATM cash-outs — the most common endpoint. Architecture is extensible to POS." |
| "Model accuracy numbers?" | **Gotam**: "Trained on synthetic data from NCRB patterns. Real deployment retrains on CFCFRMS data." |
| "How different from I4C?" | **Gotam**: "I4C freezes bank accounts (digital side). We predict physical cash-out locations. Complementary, not competing." |
| "Scale to all India?" | **Harsh**: "Already indexed 30,000+ ATMs across 25+ cities. Inference under 50ms. Scaling is a data problem, not compute." |

---

## ⚡ Practice Tips

1. **Gotam & Ashmita** — you two carry 70% of the talk. Practice your parts 3-4 times each.
2. **Point at the screen** — reference the exact visuals (blue box, table rows, pipeline grid, cards). Don't just talk into the air.
3. **Smooth handoffs** — always say the next person's name: "Ashmita will show you..."
4. **Nitin** — keep the laptop ready with CrimeShield AI running at localhost:3000/predict. If judges say "show us", you open it instantly.
5. **Don't read the slides** — they can read. You ADD the story behind it.
6. **10-minute timer** — practice with one. Going overtime loses marks.
7. **Confidence > Perfection** — if you forget something, keep moving. Judges value communication.
