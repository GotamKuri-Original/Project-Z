"""
Analytics API — Dashboard KPIs and statistics
Reads from PostgreSQL (primary) with CSV fallback.
"""

from fastapi import APIRouter
import pandas as pd
import os
from app.db import is_db_available, query_df, get_fraud_heatmap

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets')

# ── CSV fallback caches ───────────────────────────────────────
_CSV_COMPLAINTS: pd.DataFrame = None
_CSV_WITHDRAWALS: pd.DataFrame = None
_CSV_SUSPECTS: pd.DataFrame = None


def _csv(name: str) -> pd.DataFrame:
    path = os.path.join(DATA_DIR, f'{name}.csv')
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame()


def _get_csv_complaints():
    global _CSV_COMPLAINTS
    if _CSV_COMPLAINTS is None:
        _CSV_COMPLAINTS = _csv('complaints')
    return _CSV_COMPLAINTS


def _get_csv_withdrawals():
    global _CSV_WITHDRAWALS
    if _CSV_WITHDRAWALS is None:
        _CSV_WITHDRAWALS = _csv('cash_withdrawals')
    return _CSV_WITHDRAWALS


def _get_csv_suspects():
    global _CSV_SUSPECTS
    if _CSV_SUSPECTS is None:
        _CSV_SUSPECTS = _csv('suspects')
    return _CSV_SUSPECTS


@router.get("/analytics/dashboard")
def get_dashboard():
    """Get all KPI data for the main dashboard. Uses PostgreSQL aggregation."""
    if is_db_available():
        # Single efficient query for all KPIs
        kpi_df = query_df("""
            SELECT
                COUNT(*)                            AS total_complaints,
                SUM(amount)                         AS total_amount_at_risk,
                AVG(amount)::BIGINT                 AS avg_amount,
                AVG(reporting_delay_mins)::INTEGER  AS avg_reporting_delay_mins
            FROM complaints
        """)

        wd_df = query_df("SELECT COUNT(*) AS total_withdrawals FROM cash_withdrawals")
        sus_df = query_df("SELECT COUNT(*) AS total_suspects, COUNT(DISTINCT gang_id) AS active_gangs FROM suspects")

        fraud_df = query_df("""
            SELECT fraud_type, COUNT(*) AS count
            FROM complaints GROUP BY fraud_type ORDER BY count DESC
        """)
        victim_df = query_df("""
            SELECT victim_city, COUNT(*) AS count
            FROM complaints GROUP BY victim_city ORDER BY count DESC LIMIT 10
        """)
        withdrawal_df = query_df("""
            SELECT atm_city, COUNT(*) AS count
            FROM cash_withdrawals GROUP BY atm_city ORDER BY count DESC LIMIT 10
        """)
        hour_df = query_df("""
            SELECT hour_of_day, COUNT(*) AS count
            FROM complaints GROUP BY hour_of_day ORDER BY hour_of_day
        """)
        day_df = query_df("""
            SELECT day_of_week, COUNT(*) AS count
            FROM complaints GROUP BY day_of_week ORDER BY day_of_week
        """)

        kpi = kpi_df.iloc[0] if kpi_df is not None else {}
        wd  = wd_df.iloc[0]  if wd_df  is not None else {}
        sus = sus_df.iloc[0] if sus_df  is not None else {}

        return {
            "source": "postgresql",
            "kpis": {
                "total_complaints":          int(kpi.get("total_complaints", 0)),
                "total_amount_at_risk":      int(kpi.get("total_amount_at_risk", 0)),
                "avg_amount":                int(kpi.get("avg_amount", 0)),
                "total_withdrawals":         int(wd.get("total_withdrawals", 0)),
                "total_suspects":            int(sus.get("total_suspects", 0)),
                "active_gangs":              int(sus.get("active_gangs", 0)),
                "avg_reporting_delay_mins":  int(kpi.get("avg_reporting_delay_mins", 0)),
            },
            "fraud_type_breakdown":  fraud_df.set_index("fraud_type")["count"].to_dict()      if fraud_df      is not None else {},
            "top_victim_cities":     victim_df.set_index("victim_city")["count"].to_dict()    if victim_df     is not None else {},
            "top_withdrawal_cities": withdrawal_df.set_index("atm_city")["count"].to_dict()   if withdrawal_df is not None else {},
            "complaints_by_hour":    hour_df.set_index("hour_of_day")["count"].to_dict()      if hour_df       is not None else {},
            "complaints_by_day":     day_df.set_index("day_of_week")["count"].to_dict()       if day_df        is not None else {},
        }

    # ── CSV fallback ──────────────────────────────────────────
    complaints  = _get_csv_complaints()
    withdrawals = _get_csv_withdrawals()
    suspects    = _get_csv_suspects()

    return {
        "source": "csv",
        "kpis": {
            "total_complaints":         len(complaints),
            "total_amount_at_risk":     int(complaints["amount"].sum()) if len(complaints) else 0,
            "avg_amount":               int(complaints["amount"].mean()) if len(complaints) else 0,
            "total_withdrawals":        len(withdrawals),
            "total_suspects":           len(suspects),
            "active_gangs":             suspects["gang_id"].nunique() if len(suspects) else 0,
            "avg_reporting_delay_mins": int(complaints["reporting_delay_mins"].mean()) if len(complaints) else 0,
        },
        "fraud_type_breakdown":  complaints["fraud_type"].value_counts().to_dict()  if len(complaints)  else {},
        "top_victim_cities":     complaints["victim_city"].value_counts().head(10).to_dict() if len(complaints) else {},
        "top_withdrawal_cities": withdrawals["atm_city"].value_counts().head(10).to_dict()   if len(withdrawals) else {},
        "complaints_by_hour":    complaints["hour_of_day"].value_counts().sort_index().to_dict() if len(complaints) else {},
        "complaints_by_day":     complaints["day_of_week"].value_counts().sort_index().to_dict() if len(complaints) else {},
    }


@router.get("/analytics/heatmap")
def get_heatmap():
    """State-wise complaint data for map heatmap. Uses PostGIS view."""
    if is_db_available():
        # Use the PostGIS view defined in database.py schema
        df = query_df("""
            SELECT victim_state,
                   COUNT(*) AS count,
                   SUM(amount) AS total_amount,
                   AVG(amount)::INTEGER AS avg_amount
            FROM complaints
            GROUP BY victim_state
            ORDER BY count DESC
        """)
        if df is not None:
            return {"states": df.to_dict(orient="records"), "source": "postgresql"}

    complaints = _get_csv_complaints()
    if len(complaints) == 0:
        return {"states": [], "source": "csv"}

    state_data = complaints.groupby("victim_state").agg(
        count=("complaint_id", "count"),
        total_amount=("amount", "sum"),
        avg_amount=("amount", "mean"),
    ).reset_index()
    return {"states": state_data.to_dict(orient="records"), "source": "csv"}
