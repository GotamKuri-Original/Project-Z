"""
Analytics API — Dashboard KPIs and statistics
"""

from fastapi import APIRouter
import pandas as pd
import os

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets')


@router.get("/analytics/dashboard")
def get_dashboard():
    """Get all KPI data for the main dashboard."""
    complaints = pd.read_csv(os.path.join(DATA_DIR, 'complaints.csv'))
    withdrawals = pd.read_csv(os.path.join(DATA_DIR, 'cash_withdrawals.csv'))
    suspects = pd.read_csv(os.path.join(DATA_DIR, 'suspects.csv'))
    
    return {
        "kpis": {
            "total_complaints": len(complaints),
            "total_amount_at_risk": int(complaints["amount"].sum()),
            "avg_amount": int(complaints["amount"].mean()),
            "total_withdrawals": len(withdrawals),
            "total_suspects": len(suspects),
            "active_gangs": suspects["gang_id"].nunique(),
            "avg_reporting_delay_mins": int(complaints["reporting_delay_mins"].mean()),
        },
        "fraud_type_breakdown": complaints["fraud_type"].value_counts().to_dict(),
        "top_victim_cities": complaints["victim_city"].value_counts().head(10).to_dict(),
        "top_withdrawal_cities": withdrawals["atm_city"].value_counts().head(10).to_dict(),
        "complaints_by_hour": complaints["hour_of_day"].value_counts().sort_index().to_dict(),
        "complaints_by_day": complaints["day_of_week"].value_counts().sort_index().to_dict(),
    }


@router.get("/analytics/heatmap")
def get_heatmap():
    """Get state-wise complaint data for map heatmap."""
    complaints = pd.read_csv(os.path.join(DATA_DIR, 'complaints.csv'))
    
    state_data = complaints.groupby("victim_state").agg(
        count=("complaint_id", "count"),
        total_amount=("amount", "sum"),
        avg_amount=("amount", "mean"),
    ).reset_index()
    
    return {"states": state_data.to_dict(orient="records")}
