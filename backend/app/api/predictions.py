"""
Predictions API — Real XGBoost Model Serving
=============================================
Loads the trained XGBoost model and encoders to make REAL predictions.
No more if-else scoring — this is actual machine learning.
"""

from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd
import numpy as np
import pickle
import os
import json
import random

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets')
ML_DIR = os.path.join(os.path.dirname(__file__), '..', 'ml')


class ComplaintInput(BaseModel):
    """What the frontend sends us when someone files a complaint."""
    fraud_type: str = "UPI_FRAUD"
    amount: int = 50000
    victim_city: str = "Delhi"
    victim_state: str = "Delhi"
    last_mule_city: str = "Mathura"
    mule_chain_length: int = 3
    hour_of_day: int = 18
    day_of_week: int = 3
    reporting_delay_mins: int = 30


# ─── Load model and encoders at startup ───────────────────────────
_model = None
_encoders = None
_metadata = None
_atms_df = None


def _load_model():
    """Load the trained XGBoost model and encoders from disk."""
    global _model, _encoders, _metadata

    model_path = os.path.join(ML_DIR, 'xgboost_model.pkl')
    encoders_path = os.path.join(ML_DIR, 'encoders.pkl')
    metadata_path = os.path.join(ML_DIR, 'model_metadata.json')

    if not os.path.exists(model_path):
        print(f"[WARNING] Model not found at {model_path}")
        print(f"[WARNING] Run: python -m app.ml.train_model")
        return False

    with open(model_path, 'rb') as f:
        _model = pickle.load(f)
    with open(encoders_path, 'rb') as f:
        _encoders = pickle.load(f)
    with open(metadata_path, 'r') as f:
        _metadata = json.load(f)

    print(f"[ML] Model loaded — Accuracy: {_metadata['accuracy']*100:.1f}%, F1: {_metadata['f1_score']*100:.1f}%")
    return True


def _load_atms():
    """Load ATM data for zone-level results."""
    global _atms_df
    try:
        _atms_df = pd.read_csv(os.path.join(DATA_DIR, 'atm_locations.csv'))
        print(f"[ML] ATM data loaded — {len(_atms_df)} ATMs")
    except Exception as e:
        print(f"[WARNING] Could not load ATM data: {e}")


# Load on import
_model_ready = _load_model()
_load_atms()


def _encode_safe(encoder, value, fallback=0):
    """Safely encode a value, returning fallback if unseen."""
    try:
        return encoder.transform([value])[0]
    except ValueError:
        return fallback


def _build_features(complaint: ComplaintInput) -> np.ndarray:
    """
    Build the same feature vector used during training.
    Must match the exact feature engineering in train_model.py.
    """
    fraud_enc = _encode_safe(_encoders['fraud_encoder'], complaint.fraud_type)
    city_enc = _encode_safe(_encoders['city_encoder'], complaint.victim_city)
    mule_city_enc = _encode_safe(_encoders['mule_city_encoder'], complaint.last_mule_city)

    amount_log = np.log1p(complaint.amount)

    # Amount bucket: [0-10K, 10K-50K, 50K-200K, 200K-500K, 500K+]
    if complaint.amount <= 10000:
        amount_bucket = 0
    elif complaint.amount <= 50000:
        amount_bucket = 1
    elif complaint.amount <= 200000:
        amount_bucket = 2
    elif complaint.amount <= 500000:
        amount_bucket = 3
    else:
        amount_bucket = 4

    is_night = 1 if (complaint.hour_of_day >= 20 or complaint.hour_of_day <= 5) else 0
    is_weekend = 1 if complaint.day_of_week >= 5 else 0

    # Delay bucket: [0-15, 15-60, 60-180, 180-1440, 1440+]
    if complaint.reporting_delay_mins <= 15:
        delay_bucket = 0
    elif complaint.reporting_delay_mins <= 60:
        delay_bucket = 1
    elif complaint.reporting_delay_mins <= 180:
        delay_bucket = 2
    elif complaint.reporting_delay_mins <= 1440:
        delay_bucket = 3
    else:
        delay_bucket = 4

    # Feature vector — MUST match train_model.py order
    features = np.array([[
        fraud_enc,              # fraud_type_encoded
        city_enc,               # victim_city_encoded
        mule_city_enc,          # last_mule_city_encoded (CFCFRMS signal)
        complaint.mule_chain_length,  # mule_chain_length
        amount_log,             # amount_log
        amount_bucket,          # amount_bucket
        complaint.hour_of_day,  # hour_of_day
        complaint.day_of_week,  # day_of_week
        is_weekend,             # is_weekend
        complaint.reporting_delay_mins,  # reporting_delay_mins
        is_night,               # is_night
        delay_bucket,           # delay_bucket
    ]])

    return features


@router.post("/predict")
def predict_withdrawal_location(complaint: ComplaintInput):
    """
    THE CORE PREDICTION — Using real trained XGBoost model.

    Takes complaint details → runs through trained model →
    returns top 5 predicted withdrawal cities with probabilities.
    """
    if not _model_ready or _model is None:
        return {
            "error": "Model not trained yet. Run: python -m app.ml.train_model",
            "status": "model_not_found"
        }

    # Step 1: Build features
    features = _build_features(complaint)

    # Step 2: Get model predictions (probability for each city class)
    probabilities = _model.predict_proba(features)[0]  # shape: (n_classes,)
    target_encoder = _encoders['target_encoder']

    # Step 3: Get top 5 cities by probability
    top_indices = np.argsort(probabilities)[::-1][:5]
    top_cities = target_encoder.inverse_transform(top_indices)
    top_probs = probabilities[top_indices]

    # Step 4: Build zone-level predictions with ATM data
    zone_predictions = []
    for city, prob in zip(top_cities, top_probs):
        confidence = round(float(prob * 100), 1)

        # Find ATMs in this city
        city_atms = _atms_df[_atms_df["city"] == city] if _atms_df is not None else pd.DataFrame()
        high_risk_atms = city_atms[
            city_atms["near_highway"].astype(bool) | city_atms["near_state_border"].astype(bool)
        ] if len(city_atms) > 0 else pd.DataFrame()

        # Get state from ATM data
        state = city_atms.iloc[0]["state"] if len(city_atms) > 0 else "Unknown"

        zone_predictions.append({
            "city": city,
            "state": state,
            "confidence": confidence,
            "num_high_risk_atms": len(high_risk_atms),
            "risk_level": "CRITICAL" if confidence > 30 else "HIGH" if confidence > 15 else "MEDIUM",
            "top_atms": (
                city_atms.nlargest(5, "near_highway")[["atm_id", "bank", "lat", "lng"]]
                .assign(confidence=confidence)
                .to_dict(orient="records")
                if len(city_atms) > 0 else []
            ),
        })
    # Overall risk assessment
    top_confidence = zone_predictions[0]["confidence"] if zone_predictions else 0

    # Withdrawal window based on fraud type
    withdrawal_windows = {
        "UPI_FRAUD": "1-6 hours",
        "OTP_PHISHING": "2-8 hours",
        "KYC_FRAUD": "4-24 hours",
        "INVESTMENT_SCAM": "6-48 hours",
        "SEXTORTION": "12-72 hours",
        "COURIER_SCAM": "4-24 hours",
    }

    # ── Explainable AI: Feature Importance ──
    feature_names_readable = {
        "fraud_type_encoded": f"Fraud Type: {complaint.fraud_type.replace('_', ' ')}",
        "victim_city_encoded": f"Victim City: {complaint.victim_city}",
        "last_mule_city_encoded": f"Last Mule City: {complaint.last_mule_city}",
        "mule_chain_length": f"Mule Chain: {complaint.mule_chain_length} hops",
        "amount_log": f"Amount: ₹{complaint.amount:,}",
        "amount_bucket": f"Amount Range",
        "hour_of_day": f"Hour: {complaint.hour_of_day}:00",
        "day_of_week": f"Day of Week: {complaint.day_of_week}",
        "is_weekend": "Weekend" if complaint.day_of_week >= 5 else "Weekday",
        "reporting_delay_mins": f"Report Delay: {complaint.reporting_delay_mins}m",
        "is_night": "Night Hours" if (complaint.hour_of_day >= 20 or complaint.hour_of_day <= 5) else "Day Hours",
        "delay_bucket": "Delay Range",
    }

    feature_importance_data = []
    if _model is not None and _metadata is not None:
        importances = _model.feature_importances_
        feat_names = _metadata.get("feature_names", [])
        # Pair up and sort descending
        paired = sorted(zip(feat_names, importances), key=lambda x: x[1], reverse=True)
        for fname, imp in paired[:6]:  # Top 6 features
            feature_importance_data.append({
                "feature": fname,
                "label": feature_names_readable.get(fname, fname),
                "importance": round(float(imp * 100), 1),
            })

    # ── Money Flow: Mule Chain Visualization ──
    random.seed(hash(complaint.victim_city + complaint.last_mule_city + str(complaint.amount)))

    # Build the mule chain: Victim → Mule1 → Mule2 → ... → ATM Withdrawal
    mule_cities_pool = ["Mathura", "Bharatpur", "Nuh", "Jamtara", "Deoghar", "Ranchi", 
                        "Mewat", "Surat", "Indore", "Nagpur", "Patna"]
    # Remove victim and last mule to avoid duplicates
    available = [c for c in mule_cities_pool if c not in [complaint.victim_city, complaint.last_mule_city]]
    
    chain_len = min(complaint.mule_chain_length, len(available) + 2)
    withdrawal_city = zone_predictions[0]["city"] if zone_predictions else "Unknown"
    
    # Build the flow
    money_flow = []
    remaining = complaint.amount
    
    # Step 1: Victim sends money
    first_mule = complaint.last_mule_city if chain_len <= 2 else random.choice(available[:3])
    money_flow.append({
        "from": f"Victim ({complaint.victim_city})",
        "to": f"Mule 1 ({first_mule})",
        "amount": remaining,
        "method": complaint.fraud_type.replace("_", " "),
    })
    
    # Intermediate mules
    prev_city = first_mule
    for hop in range(2, chain_len):
        next_city = complaint.last_mule_city if hop == chain_len - 1 else random.choice(available)
        # Each hop skims 5-15%
        skim = int(remaining * random.uniform(0.05, 0.15))
        remaining -= skim
        money_flow.append({
            "from": f"Mule {hop-1} ({prev_city})",
            "to": f"Mule {hop} ({next_city})",
            "amount": remaining,
            "method": "UPI Transfer" if random.random() > 0.3 else "NEFT/IMPS",
        })
        prev_city = next_city
    
    # Final: Last mule withdraws at ATM
    money_flow.append({
        "from": f"Mule {max(chain_len-1, 1)} ({prev_city})",
        "to": f"ATM ({withdrawal_city})",
        "amount": remaining,
        "method": "Cash Withdrawal",
    })

    return {
        "complaint": complaint.model_dump(),
        "prediction": {
            "risk_level": "CRITICAL" if top_confidence > 30 else "HIGH" if top_confidence > 15 else "MEDIUM",
            "overall_confidence": round(top_confidence, 1),
            "estimated_withdrawal_window": withdrawal_windows.get(complaint.fraud_type, "2-24 hours"),
            "zones": zone_predictions,
            "model_info": {
                "algorithm": "XGBoost (Gradient Boosted Trees)",
                "accuracy": _metadata["accuracy"],
                "f1_score": _metadata["f1_score"],
                "features_used": _metadata["feature_names"],
            },
        },
        "explainability": feature_importance_data,
        "money_flow": money_flow,
        "recommended_action": (
            "DEPLOY TEAM IMMEDIATELY — XGBoost model predicts high-probability cash withdrawal in target zones"
            if top_confidence > 30
            else "MONITOR — Alert local police stations in predicted zones and increase ATM surveillance"
        ),
    }


@router.get("/model-info")
def get_model_info():
    """Returns model metadata — accuracy, features, importance."""
    if _metadata is None:
        return {"error": "Model not trained yet"}
    return _metadata
