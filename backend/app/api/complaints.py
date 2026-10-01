"""
Complaints API — Handles cybercrime complaint data
Reads from PostgreSQL (primary) with CSV fallback.
"""

from fastapi import APIRouter, Query
import pandas as pd
import os
from app.db import is_db_available, query_df

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets')

# ── CSV fallback cache (used when PostgreSQL is unavailable) ──
_CSV_COMPLAINTS: pd.DataFrame = None
_CSV_ATMS: pd.DataFrame = None


def _get_csv_complaints() -> pd.DataFrame:
    global _CSV_COMPLAINTS
    if _CSV_COMPLAINTS is None:
        path = os.path.join(DATA_DIR, 'complaints.csv')
        if os.path.exists(path):
            _CSV_COMPLAINTS = pd.read_csv(path)
        else:
            _CSV_COMPLAINTS = pd.DataFrame()
    return _CSV_COMPLAINTS


def _get_csv_atms() -> pd.DataFrame:
    global _CSV_ATMS
    if _CSV_ATMS is None:
        path = os.path.join(DATA_DIR, 'atm_locations.csv')
        if os.path.exists(path):
            _CSV_ATMS = pd.read_csv(path)
        else:
            _CSV_ATMS = pd.DataFrame()
    return _CSV_ATMS


# ── Endpoints ─────────────────────────────────────────────────

@router.get("/complaints")
def get_complaints(
    limit: int = Query(50, le=500),
    offset: int = 0,
    fraud_type: str = None,
    city: str = None,
):
    """Get list of complaints with optional filters. Uses PostgreSQL."""
    if is_db_available():
        conditions = ["1=1"]
        params = {"limit": limit, "offset": offset}
        if fraud_type:
            conditions.append("fraud_type = :fraud_type")
            params["fraud_type"] = fraud_type
        if city:
            conditions.append("victim_city = :city")
            params["city"] = city

        where = " AND ".join(conditions)

        count_df = query_df(f"SELECT COUNT(*) AS total FROM complaints WHERE {where}", params)
        total = int(count_df.iloc[0]["total"]) if count_df is not None else 0

        df = query_df(
            f"""
            SELECT complaint_id, timestamp, fraud_type, amount,
                   victim_city, victim_state, reporting_delay_mins,
                   hour_of_day, day_of_week, is_weekend, status, priority
            FROM complaints
            WHERE {where}
            ORDER BY timestamp DESC
            LIMIT :limit OFFSET :offset
            """,
            params
        )
        data = df.to_dict(orient="records") if df is not None else []
        return {"total": total, "limit": limit, "offset": offset, "data": data, "source": "postgresql"}

    # ── CSV fallback ──
    df = _get_csv_complaints()
    if fraud_type:
        df = df[df["fraud_type"] == fraud_type]
    if city:
        df = df[df["victim_city"] == city]
    total = len(df)
    df = df.iloc[offset:offset + limit]
    return {"total": total, "limit": limit, "offset": offset, "data": df.to_dict(orient="records"), "source": "csv"}


@router.get("/complaints/{complaint_id}")
def get_complaint(complaint_id: str):
    """Get a single complaint by ID."""
    if is_db_available():
        df = query_df(
            "SELECT * FROM complaints WHERE complaint_id = :id",
            {"id": complaint_id}
        )
        if df is not None and len(df) > 0:
            return df.iloc[0].to_dict()
        return {"error": "Complaint not found"}

    df = _get_csv_complaints()
    row = df[df["complaint_id"] == complaint_id]
    if len(row) == 0:
        return {"error": "Complaint not found"}
    return row.iloc[0].to_dict()


@router.get("/complaints-recent")
def get_recent_complaints(limit: int = Query(10, le=50)):
    """Get the most recent complaints for the live threat feed."""
    if is_db_available():
        df = query_df(
            """
            SELECT complaint_id, timestamp, fraud_type, amount, victim_city, victim_state, status, priority
            FROM complaints
            ORDER BY timestamp DESC
            LIMIT :limit
            """,
            {"limit": limit}
        )
        if df is not None:
            return df.to_dict(orient="records")

    df = _get_csv_complaints()
    df = df.sort_values("timestamp", ascending=False).head(limit)
    return df[["complaint_id", "timestamp", "fraud_type", "amount", "victim_city", "victim_state"]].to_dict(orient="records")


@router.get("/atms")
def get_atms(city: str = None, limit: int = Query(1000, le=15000)):
    """Get ATM locations."""
    if is_db_available():
        params = {"limit": limit}
        city_clause = ""
        if city:
            city_clause = "WHERE city = :city"
            params["city"] = city
        df = query_df(
            f"""
            SELECT atm_id, bank, city, state,
                   ST_Y(location) AS lat, ST_X(location) AS lng,
                   area_type, near_highway, near_bus_station,
                   near_state_border, has_cctv, risk_score
            FROM atm_locations
            {city_clause}
            ORDER BY risk_score DESC
            LIMIT :limit
            """,
            params
        )
        if df is not None:
            return {"total": len(df), "data": df.to_dict(orient="records"), "source": "postgresql"}

    df = _get_csv_atms()
    if city:
        df = df[df["city"] == city]
    return {"total": len(df), "data": df.head(limit).to_dict(orient="records"), "source": "csv"}


@router.get("/cities")
def get_cities():
    """Get list of all cities in our data."""
    if is_db_available():
        df = query_df(
            """
            SELECT victim_city AS city, victim_state AS state, COUNT(*) AS complaint_count
            FROM complaints
            GROUP BY victim_city, victim_state
            ORDER BY complaint_count DESC
            """
        )
        if df is not None:
            return {"cities": df.to_dict(orient="records"), "source": "postgresql"}

    df = _get_csv_complaints()
    cities = df["victim_city"].value_counts().to_dict()
    return {"cities": cities, "source": "csv"}
