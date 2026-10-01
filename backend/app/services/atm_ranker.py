"""
ATM Ranker — Stage 2 of the CrimeShield two-stage withdrawal pipeline
=====================================================================

Stage 1 (XGBoost) -> P(city)
Stage 2 (this)    -> risk(ATM | city)

atm_risk = 0.30*highway + 0.25*border + 0.30*velocity + 0.15*cctv_gap
final_score = city_probability * atm_risk

Fully deterministic: identical inputs + identical CSVs -> identical ranking.
No random module, no wall-clock time, no Python hash() (which is salted per process).
"""

from __future__ import annotations

import hashlib
import os
from typing import Any, Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd

WEIGHTS: Dict[str, float] = {
    "highway": 0.30,
    "border": 0.25,
    "velocity": 0.30,
    "cctv_gap": 0.15,
}

# generator.py bakes in bus stations as a cash-out preference too, but they are a
# weaker escape route than highways, so they earn partial transit credit.
BUS_STATION_TRANSIT_CREDIT = 0.4

VELOCITY_WINDOW_DAYS = 90
# Share of the velocity signal taken from withdrawals matching the complaint's fraud type.
FRAUD_TYPE_VELOCITY_SHARE = 0.4

# Simulated CCTV gap = 60% stable per-ATM hash + 40% area-type prior.
CCTV_HASH_SHARE = 0.6
AREA_CCTV_GAP = {"urban": 0.2, "suburban": 0.5, "semi_urban": 0.5, "rural": 0.9}
DEFAULT_AREA_CCTV_GAP = 0.5

RISK_LEVEL_THRESHOLDS = ((0.60, "CRITICAL"), (0.40, "HIGH"))

EMPTY_RANKING: Dict[str, Any] = {
    "ranked_atms": [],
    "by_city": {},
    "candidates_evaluated": 0,
    "weights": dict(WEIGHTS),
}


def _to_bool(series: pd.Series) -> pd.Series:
    if series.dtype == bool:
        return series
    return series.astype(str).str.strip().str.lower().isin({"true", "1", "yes", "y", "t"})


def _stable_unit_interval(key: str) -> float:
    """Map a string to [0, 1) via SHA-256 — stable across runs and machines."""
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") / float(1 << 64)


def _log_normalize(values: pd.Series) -> pd.Series:
    """Scale to [0, 1] with log damping so one hot ATM doesn't flatten the rest. Zero stays zero."""
    peak = float(values.max()) if len(values) else 0.0
    if peak <= 0:
        return pd.Series(0.0, index=values.index)
    return np.log1p(values) / np.log1p(peak)


def _risk_level(atm_risk: float) -> str:
    for threshold, label in RISK_LEVEL_THRESHOLDS:
        if atm_risk >= threshold:
            return label
    return "MEDIUM"


class ATMRanker:
    def __init__(self, atms_df: pd.DataFrame, withdrawals_df: Optional[pd.DataFrame] = None):
        self._atms = self._prepare_atms(atms_df)
        self._fraud_velocity: Dict[str, pd.Series] = {}
        self._build_velocity(withdrawals_df)

    @property
    def size(self) -> int:
        return len(self._atms)

    @property
    def has_velocity(self) -> bool:
        return bool(self._atms["withdrawals_per_day"].gt(0).any())

    # ── Static (complaint-independent) components, computed once at startup ──

    @staticmethod
    def _prepare_atms(atms_df: pd.DataFrame) -> pd.DataFrame:
        df = atms_df.copy().reset_index(drop=True)
        df["atm_id"] = df["atm_id"].astype(str)
        df["city"] = df["city"].astype(str)

        for col in ("near_highway", "near_state_border", "near_bus_station"):
            df[col] = _to_bool(df[col]) if col in df.columns else False

        if "area_type" not in df.columns:
            df["area_type"] = ""
        df["area_type"] = df["area_type"].fillna("").astype(str).str.strip().str.lower()

        for col, default in (("bank", "Unknown Bank"), ("state", "Unknown")):
            if col not in df.columns:
                df[col] = default
            df[col] = df[col].fillna(default).astype(str)

        df["highway_score"] = np.where(
            df["near_highway"],
            1.0,
            np.where(df["near_bus_station"], BUS_STATION_TRANSIT_CREDIT, 0.0),
        )
        df["border_score"] = df["near_state_border"].astype(float)

        hash_component = df["atm_id"].map(lambda atm_id: _stable_unit_interval(f"cctv:{atm_id}"))
        area_component = df["area_type"].map(AREA_CCTV_GAP).fillna(DEFAULT_AREA_CCTV_GAP)
        df["cctv_gap_score"] = CCTV_HASH_SHARE * hash_component + (1 - CCTV_HASH_SHARE) * area_component

        df["static_risk"] = (
            WEIGHTS["highway"] * df["highway_score"]
            + WEIGHTS["border"] * df["border_score"]
            + WEIGHTS["cctv_gap"] * df["cctv_gap_score"]
        )
        return df

    # ── Historical transaction velocity ──

    def _build_velocity(self, withdrawals_df: Optional[pd.DataFrame]) -> None:
        self._atms["withdrawals_per_day"] = 0.0
        self._atms["velocity_overall"] = 0.0
        required = {"atm_id", "timestamp"}
        if withdrawals_df is None or withdrawals_df.empty or not required.issubset(withdrawals_df.columns):
            return

        wd = withdrawals_df.copy()
        wd["atm_id"] = wd["atm_id"].astype(str)
        wd["timestamp"] = pd.to_datetime(wd["timestamp"], errors="coerce")
        wd = wd.dropna(subset=["timestamp"])
        if wd.empty:
            return

        # Anchor to the newest record, not datetime.now(), so scores never drift between runs.
        anchor = wd["timestamp"].max()
        recent = wd[wd["timestamp"] > anchor - pd.Timedelta(days=VELOCITY_WINDOW_DAYS)]
        atm_ids = self._atms["atm_id"]
        per_day = atm_ids.map(recent.groupby("atm_id").size() / VELOCITY_WINDOW_DAYS).fillna(0.0)
        self._atms["withdrawals_per_day"] = per_day
        self._atms["velocity_overall"] = _log_normalize(per_day)

        if "fraud_type" in recent.columns:
            for fraud_type, group in recent.groupby("fraud_type"):
                counts = atm_ids.map(group.groupby("atm_id").size()).fillna(0.0)
                self._fraud_velocity[str(fraud_type)] = _log_normalize(counts)

    # ── Stage 2 ranking ──

    def rank(
        self,
        city_probabilities: Iterable[Tuple[str, float]],
        fraud_type: Optional[str] = None,
        top_n: int = 3,
        per_city_limit: int = 5,
    ) -> Dict[str, Any]:
        prob_by_city = {str(city): float(prob) for city, prob in city_probabilities}
        candidates = self._atms[self._atms["city"].isin(prob_by_city.keys())].copy()

        if candidates.empty:
            return {**EMPTY_RANKING, "weights": dict(WEIGHTS)}

        fraud_velocity = self._fraud_velocity.get(fraud_type or "")
        if fraud_velocity is None:
            candidates["velocity_score"] = candidates["velocity_overall"]
        else:
            candidates["velocity_score"] = (
                (1 - FRAUD_TYPE_VELOCITY_SHARE) * candidates["velocity_overall"]
                + FRAUD_TYPE_VELOCITY_SHARE * fraud_velocity.loc[candidates.index]
            )

        candidates["atm_risk"] = (
            candidates["static_risk"] + WEIGHTS["velocity"] * candidates["velocity_score"]
        ).round(6)
        candidates["city_probability"] = candidates["city"].map(prob_by_city)
        candidates["final_score"] = (candidates["city_probability"] * candidates["atm_risk"]).round(6)

        candidates = candidates.sort_values(
            by=["final_score", "atm_risk", "atm_id"],
            ascending=[False, False, True],
            kind="mergesort",
        )

        ranked_atms = self._serialize_frame(candidates.head(top_n))
        by_city = {
            city: self._serialize_frame(candidates[candidates["city"] == city].head(per_city_limit))
            for city in prob_by_city
        }

        return {
            "ranked_atms": ranked_atms,
            "by_city": by_city,
            "candidates_evaluated": int(len(candidates)),
            "weights": dict(WEIGHTS),
        }

    @classmethod
    def _serialize_frame(cls, frame: pd.DataFrame) -> List[Dict[str, Any]]:
        return [cls._serialize(row, rank=i + 1) for i, (_, row) in enumerate(frame.iterrows())]

    @staticmethod
    def _serialize(row: pd.Series, rank: int) -> Dict[str, Any]:
        atm_risk = float(row["atm_risk"])
        final_score = float(row["final_score"])
        return {
            "rank": rank,
            "atm_id": str(row["atm_id"]),
            "bank": str(row["bank"]),
            "city": str(row["city"]),
            "state": str(row["state"]),
            "lat": float(row["lat"]),
            "lng": float(row["lng"]),
            "area_type": str(row["area_type"]) or "unknown",
            "near_highway": bool(row["near_highway"]),
            "near_state_border": bool(row["near_state_border"]),
            "near_bus_station": bool(row["near_bus_station"]),
            "city_probability": round(float(row["city_probability"]), 4),
            "atm_risk": round(atm_risk, 4),
            "final_score": round(final_score, 4),
            "confidence": round(final_score * 100, 1),
            "risk_level": _risk_level(atm_risk),
            "risk_breakdown": {
                "highway": round(float(row["highway_score"]), 3),
                "border": round(float(row["border_score"]), 3),
                "velocity": round(float(row["velocity_score"]), 3),
                "cctv_gap": round(float(row["cctv_gap_score"]), 3),
            },
            "withdrawals_per_day": round(float(row["withdrawals_per_day"]), 3),
            "reasons": ATMRanker._reasons(row),
        }

    @staticmethod
    def _reasons(row: pd.Series) -> List[str]:
        reasons: List[str] = []
        if row["near_highway"]:
            reasons.append("Highway corridor — fast exit route")
        elif row["near_bus_station"]:
            reasons.append("Near bus station — transit exit route")
        if row["near_state_border"]:
            reasons.append("Near state border — cross-jurisdiction escape")
        if row["withdrawals_per_day"] > 0:
            reasons.append(
                f"{row['withdrawals_per_day']:.2f} fraud withdrawals/day (last {VELOCITY_WINDOW_DAYS}d)"
            )
        if row["cctv_gap_score"] >= 0.6:
            reasons.append(f"Weak CCTV coverage (est. gap {row['cctv_gap_score'] * 100:.0f}%)")
        return reasons


def build_ranker(atms_df: Optional[pd.DataFrame], data_dir: str) -> Optional[ATMRanker]:
    """Build the ranker from the loaded ATM frame + cash_withdrawals.csv (optional)."""
    if atms_df is None or atms_df.empty:
        print("[WARNING] ATM ranker disabled — no ATM data")
        return None

    withdrawals_df = None
    withdrawals_path = os.path.join(data_dir, "cash_withdrawals.csv")
    if os.path.exists(withdrawals_path):
        withdrawals_df = pd.read_csv(
            withdrawals_path,
            usecols=lambda col: col in {"atm_id", "timestamp", "fraud_type"},
        )
    else:
        print("[WARNING] cash_withdrawals.csv not found — velocity signal will be 0")

    ranker = ATMRanker(atms_df, withdrawals_df)
    print(f"[ML] ATM ranker ready — {ranker.size} ATMs, velocity={'on' if ranker.has_velocity else 'off'}")
    return ranker
