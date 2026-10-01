"""
Actions API — Operational Response Priority Cascade
====================================================
After CrimeShield AI fires a prediction, police have 3 response actions.
These are ordered by priority — the goal is ARREST + EVIDENCE, not just protecting money.

PRIORITY CASCADE:
  1. DISPATCH  → Silent deployment of beat officer to predicted ATM  ← PRIMARY
  2. CMS ALERT → Activate ATM camera, start evidence-grade recording ← SECONDARY  
  3. FREEZE    → Block mule account (LAST RESORT only)              ← FALLBACK

⚠️  WHY FREEZE IS LAST RESORT:
    If you freeze the account first, the mule's card gets declined at the ATM.
    The mule walks away free. Mastermind is never caught. Criminal network survives.
    The correct sequence: catch them IN THE ACT, freeze AFTER arrest (or if no time).
"""

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
import random
import string

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# REQUEST MODELS
# ──────────────────────────────────────────────────────────────────────────────

class DispatchRequest(BaseModel):
    """Alert sent to nearest police beat officer for silent deployment."""
    city: str = "Mathura"
    atm_ids: list[str] = ["ATM-001"]
    risk_level: str = "CRITICAL"
    complaint_id: str = "CMP-2024-001"
    amount_at_risk: int = 50000
    fraud_type: str = "UPI_FRAUD"
    withdrawal_window: str = "1-6 hours"
    officer_id: str = "OFF-001"
    prediction_phase: str = "PHASE_2"   # PHASE_1 or PHASE_2


class CMSAlertRequest(BaseModel):
    """Activates bank ATM cameras via Milestone XProtect or Avigilon ACC API."""
    atm_ids: list[str] = ["ATM-001", "ATM-002"]
    city: str = "Mathura"
    confidence: float = 72.5
    risk_level: str = "CRITICAL"
    complaint_id: str = "CMP-2024-001"
    estimated_window_minutes: int = 90
    officer_id: str = "OFF-001"


class FreezeRequest(BaseModel):
    """LAST RESORT: Freeze mule account via CFCFRMS (only if dispatch failed)."""
    complaint_id: str = "CMP-2024-001"
    mule_city: str = "Mathura"
    predicted_withdrawal_city: str = "Agra"
    amount_at_risk: int = 50000
    fraud_type: str = "UPI_FRAUD"
    bank_name: str = "SBI"
    officer_id: str = "OFF-001"
    reason: str = "DISPATCH_NOT_POSSIBLE"   # Why freeze was chosen over dispatch


class NPCIWebhookPayload(BaseModel):
    """
    Payload sent by NPCI when a flagged UPI account transacts.

    NPCI operates UPI + NFS (ATM network) so they see every hop in real-time.
    After MHA-NPCI MoU: NPCI fires this webhook whenever a flagged account 
    moves money — gives us last_mule_city instantly (not 90min CFCFRMS wait).
    This is what upgrades Phase 1 → Phase 2 prediction automatically.
    """
    transaction_id: str
    sender_city: str = ""
    receiver_city: str = ""          # → becomes new last_mule_city
    amount: float = 0.0
    transaction_type: str = "UPI"    # UPI | IMPS | NFS_ATM (cash withdrawal)
    flagged_complaint_id: str = ""


# ──────────────────────────────────────────────────────────────────────────────
# HELPER
# ──────────────────────────────────────────────────────────────────────────────

def _ref(prefix: str) -> str:
    return f"{prefix}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=8))}"


POLICE_STATIONS = {
    "Delhi": "Cyber Crime Cell, IGI Airport Road, New Delhi",
    "Mumbai": "Cybercrime Investigation Cell, BKC, Mumbai",
    "Mathura": "Mathura Kotwali PS + UP Cyber Cell",
    "Bharatpur": "Bharatpur Sadar PS + Rajasthan Cyber Cell",
    "Nuh": "Nuh Sadar PS + Haryana Cyber Cell",
    "Jamtara": "Jamtara PS + Jharkhand Cyber Cell",
    "Deoghar": "Deoghar Sadar PS + Jharkhand Cyber Cell",
    "Ranchi": "Ranchi Sadar PS + Jharkhand Cyber Cell",
    "Patna": "Patna City PS + Bihar Cyber Cell",
}


# ──────────────────────────────────────────────────────────────────────────────
# PRIORITY 1: DISPATCH (Primary Action — Catch them in the act)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/actions/dispatch")
def dispatch_police(req: DispatchRequest):
    """
    PRIMARY ACTION: Silently deploy beat officer to predicted ATM.

    Goal: Catch the mule IN THE ACT at the ATM.
    - Officer is deployed WITHOUT alerting the mule network
    - Money is NOT frozen yet (so mule still comes to ATM)
    - When mule arrives → arrest with ATM camera as evidence
    - Freeze account AFTER arrest
    
    In production: Integrates with State Police CAD (Computer-Aided Dispatch).
    Compatible with UP Police CCTNS, Delhi Police iCAMS.
    """
    nearest_station = POLICE_STATIONS.get(req.city, f"{req.city} District Cyber Cell")

    return {
        "status": "SUCCESS",
        "action": "POLICE_DISPATCH_ISSUED",
        "priority": 1,
        "reference_id": _ref("DISPATCH"),
        "timestamp": datetime.now().isoformat(),
        "warning": "DO NOT freeze account yet — mule must still believe withdrawal is possible",
        "alert": {
            "complaint_id": req.complaint_id,
            "urgency": "IMMEDIATE" if req.risk_level == "CRITICAL" else "HIGH",
            "target_city": req.city,
            "nearest_station": nearest_station,
            "atms_to_surveil": req.atm_ids,
            "amount_at_risk": f"₹{req.amount_at_risk:,}",
            "fraud_type": req.fraud_type,
            "withdrawal_window": req.withdrawal_window,
            "prediction_confidence": f"Phase: {req.prediction_phase}",
            "instructions": [
                "Deploy plainclothes officer to each predicted ATM",
                "Do NOT display police presence visibly — mule will abort",
                "Coordinate with bank CMS control room for live camera feed",
                "Arrest mule on withdrawal attempt — cash + camera = court evidence",
                "Freeze account ONLY after arrest or if officer cannot reach in time",
            ],
        },
        "legal_basis": "Section 41 CrPC (arrest without warrant) + CyberCrime cell FIR",
        "simulation_note": "LIVE: Integrates with State Police CAD via secure REST webhook.",
    }


# ──────────────────────────────────────────────────────────────────────────────
# PRIORITY 2: CMS CAMERA ALERT (Evidence Recording)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/actions/cms-alert")
def trigger_cms_alert(req: CMSAlertRequest):
    """
    SECONDARY ACTION: Activate ATM cameras — start evidence-grade recording.

    Banks use Milestone XProtect or Avigilon Control Center as ATM CMS.
    Both expose REST APIs to activate cameras and flag for priority monitoring.
    Recording is STQC-compliant and court-admissible under IT Act Section 65B.

    This runs ALONGSIDE dispatch — evidence recording + police deployment together.
    Camera footage + arrest = ironclad conviction.
    """
    camera_activations = [
        {
            "atm_id": atm_id,
            "cameras": [f"CAM-{atm_id}-EXTERIOR", f"CAM-{atm_id}-INTERIOR-SCREEN"],
            "recording_mode": "EVIDENCE_GRADE_1080P_30FPS",
            "alert_priority": "P1_CRITICAL" if req.risk_level == "CRITICAL" else "P2_HIGH",
        }
        for atm_id in req.atm_ids[:5]
    ]

    return {
        "status": "SUCCESS",
        "action": "CMS_CAMERAS_ACTIVATED",
        "priority": 2,
        "reference_id": _ref("CMS"),
        "timestamp": datetime.now().isoformat(),
        "cms_integration": {
            "platform": "Milestone XProtect / Avigilon Control Center",
            "api_standard": "REST + OAuth2 Bearer Token (bank-issued)",
            "cameras_activated": camera_activations,
            "total_atms_watched": len(req.atm_ids),
            "control_room_notified": True,
            "evidence_retention_days": 90,
            "admissibility": "IT Act Section 65B — court-admissible digital evidence",
            "stqc_compliant": True,
        },
        "ai_analytics_running": [
            "Face detection + recognition",
            "Suspicious loitering / repeated visits",
            "Card skimmer / physical tampering detection",
            "Auto-alert on withdrawal attempt",
        ],
        "simulation_note": "LIVE: Requires bank-issued Milestone XProtect OAuth2 token.",
    }


# ──────────────────────────────────────────────────────────────────────────────
# PRIORITY 3: FREEZE ACCOUNT (Last Resort Only)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/actions/freeze-account")
def freeze_account(req: FreezeRequest):
    """
    LAST RESORT: Request mule account freeze via CFCFRMS.

    ⚠️  USE ONLY WHEN:
        - Police dispatch is not possible (no officers available)
        - Withdrawal window is too short for officer deployment
        - As a follow-up AFTER arrest to prevent further transactions

    ⚠️  DO NOT use as primary action:
        - Card declined at ATM = mule walks away free
        - Criminal network is alerted that tracking is active
        - Mastermind never caught, only one mule account blocked

    Banks are RBI-mandated to respond to CFCFRMS freeze within 60 min.
    Legal basis: Section 102 CrPC + RBI Circular RBI/2022-23/185.
    """
    return {
        "status": "SUCCESS",
        "action": "CFCFRMS_FREEZE_REQUESTED",
        "priority": 3,
        "priority_warning": "LAST RESORT — Mule will NOT come to ATM if account is frozen. Deploy police FIRST.",
        "reference_id": _ref("CFCFRMS"),
        "timestamp": datetime.now().isoformat(),
        "freeze_details": {
            "complaint_id": req.complaint_id,
            "target_bank": req.bank_name,
            "mule_city": req.mule_city,
            "predicted_withdrawal_city": req.predicted_withdrawal_city,
            "amount_protected": f"₹{req.amount_at_risk:,}",
            "initiated_by": req.officer_id,
            "reason_for_freeze_over_dispatch": req.reason,
        },
        "cfcfrms": {
            "request_sent_to": f"{req.bank_name} Nodal Officer Portal (CFCFRMS v2.1)",
            "expected_response_sla": "60 minutes (RBI mandate)",
            "freeze_scope": "All linked accounts + all UPI VPAs + associated cards",
            "legal_basis": "Section 102 CrPC + RBI/2022-23/185",
        },
        "consequence": "Mule's card will be declined at ATM. Money protected but criminal walks free unless police are also deployed.",
        "simulation_note": "LIVE: Requires MHA-authorized CFCFRMS API credentials (I4C CFCFRMS v2.1).",
    }


# ──────────────────────────────────────────────────────────────────────────────
# NPCI WEBHOOK: Real-time Phase 1 → Phase 2 upgrade
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/actions/npci-webhook")
def npci_transaction_webhook(payload: NPCIWebhookPayload):
    """
    NPCI fires this webhook when a flagged account transacts.

    NPCI operates UPI + NFS (National Financial Switch for ATMs).
    They see EVERY transaction hop in < 2 seconds.

    After MHA-NPCI MoU:
    - We add complaint's first-hop account to NPCI watchlist
    - NPCI fires this webhook on every subsequent transaction by that account
    - receiver_city = new last_mule_city → re-run XGBoost prediction
    - This upgrades Phase 1 → Phase 2 automatically, no CFCFRMS wait needed

    transaction_type = "NFS_ATM" means FINAL CASH WITHDRAWAL IS HAPPENING NOW.
    """
    is_withdrawal = payload.transaction_type == "NFS_ATM"

    return {
        "status": "ENRICHMENT_RECEIVED",
        "timestamp": datetime.now().isoformat(),
        "transaction": {
            "id": payload.transaction_id,
            "type": payload.transaction_type,
            "amount": f"₹{payload.amount:,.2f}",
            "money_moved_to": payload.receiver_city,
        },
        "enrichment": {
            "updated_last_mule_city": payload.receiver_city,
            "prediction_phase_upgrade": "PHASE_1 → PHASE_2",
            "action_required": (
                "🚨 WITHDRAWAL IN PROGRESS — DISPATCH NOW" if is_withdrawal
                else "Re-run XGBoost with updated last_mule_city"
            ),
            "urgency": "CRITICAL" if is_withdrawal else "HIGH",
        },
        "npci_advantage": {
            "vs_cfcfrms": "NPCI data arrives in < 2 seconds. CFCFRMS takes 30-90 minutes.",
            "data_source": "NPCI Real-Time Transaction Monitoring (post MHA-NPCI MoU)",
            "coverage": "100% of UPI + IMPS + NFS ATM transactions in India",
        },
    }
