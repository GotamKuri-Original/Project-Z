"""
Audit Trail API — Officer Verification + Case History
======================================================
Human-in-the-loop: AI recommends, officer decides.
Every prediction and officer action is logged for accountability.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import random
import string

router = APIRouter()

# ──────────────────────────────────────────────────────────────────────────────
# IN-MEMORY AUDIT STORE (in production: PostgreSQL)
# ──────────────────────────────────────────────────────────────────────────────
_audit_log: list[dict] = []


class OfficerDecision(BaseModel):
    case_id: str
    decision: str  # "APPROVE" | "REJECT" | "ESCALATE"
    officer_id: str = "INSP-CYBER-042"
    officer_name: str = "Inspector Sharma"
    remarks: str = ""


class AuditEntry(BaseModel):
    case_id: str
    complaint_id: str = ""
    fraud_type: str = ""
    amount: float = 0
    victim_city: str = ""
    predicted_city: str = ""
    risk_level: str = ""
    confidence: float = 0
    estimated_window: str = ""
    phase: str = "PHASE_1"
    top_atms: list[str] = []
    shap_top_features: list[str] = []


# ──────────────────────────────────────────────────────────────────────────────
# LOG A NEW PREDICTION (called after each prediction)
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/audit/log")
def log_prediction(entry: AuditEntry):
    record = {
        "case_id": entry.case_id,
        "complaint_id": entry.complaint_id,
        "fraud_type": entry.fraud_type,
        "amount": entry.amount,
        "victim_city": entry.victim_city,
        "predicted_city": entry.predicted_city,
        "risk_level": entry.risk_level,
        "confidence": entry.confidence,
        "estimated_window": entry.estimated_window,
        "phase": entry.phase,
        "top_atms": entry.top_atms,
        "shap_top_features": entry.shap_top_features,
        "prediction_timestamp": datetime.now().isoformat(),
        "officer_decision": None,
        "officer_id": None,
        "officer_name": None,
        "decision_timestamp": None,
        "remarks": None,
        "status": "PENDING_REVIEW",
    }
    _audit_log.insert(0, record)  # newest first
    return {"status": "LOGGED", "case_id": entry.case_id, "total_records": len(_audit_log)}


# ──────────────────────────────────────────────────────────────────────────────
# OFFICER DECISION: APPROVE / REJECT / ESCALATE
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/audit/decide")
def officer_decision(decision: OfficerDecision):
    for record in _audit_log:
        if record["case_id"] == decision.case_id:
            record["officer_decision"] = decision.decision
            record["officer_id"] = decision.officer_id
            record["officer_name"] = decision.officer_name
            record["decision_timestamp"] = datetime.now().isoformat()
            record["remarks"] = decision.remarks
            record["status"] = (
                "APPROVED" if decision.decision == "APPROVE"
                else "REJECTED" if decision.decision == "REJECT"
                else "ESCALATED"
            )
            return {
                "status": "DECISION_RECORDED",
                "case_id": decision.case_id,
                "decision": decision.decision,
                "officer": decision.officer_name,
                "timestamp": record["decision_timestamp"],
            }
    raise HTTPException(status_code=404, detail=f"Case {decision.case_id} not found in audit log")


# ──────────────────────────────────────────────────────────────────────────────
# GET FULL AUDIT TRAIL
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/audit/trail")
def get_audit_trail(limit: int = 50):
    return {
        "total": len(_audit_log),
        "records": _audit_log[:limit],
    }


# ──────────────────────────────────────────────────────────────────────────────
# GET SINGLE CASE AUDIT
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/audit/{case_id}")
def get_case_audit(case_id: str):
    for record in _audit_log:
        if record["case_id"] == case_id:
            return record
    raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
