"""
Complaints API — Handles cybercrime complaint data
"""

from fastapi import APIRouter, Query
import pandas as pd
import os

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets')


# Cache DataFrames in memory at startup
_COMPLAINTS_DF = pd.read_csv(os.path.join(DATA_DIR, 'complaints.csv'))
_ATMS_DF = pd.read_csv(os.path.join(DATA_DIR, 'atm_locations.csv'))

def load_complaints():
    return _COMPLAINTS_DF

def load_atms():
    return _ATMS_DF


@router.get("/complaints")
def get_complaints(
    limit: int = Query(50, le=500),
    offset: int = 0,
    fraud_type: str = None,
    city: str = None,
):
    """Get list of complaints with optional filters."""
    df = load_complaints()
    
    if fraud_type:
        df = df[df["fraud_type"] == fraud_type]
    if city:
        df = df[df["victim_city"] == city]
    
    total = len(df)
    df = df.iloc[offset:offset + limit]
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": df.to_dict(orient="records"),
    }


@router.get("/complaints/{complaint_id}")
def get_complaint(complaint_id: str):
    """Get a single complaint by ID."""
    df = load_complaints()
    row = df[df["complaint_id"] == complaint_id]
    if len(row) == 0:
        return {"error": "Complaint not found"}
    return row.iloc[0].to_dict()


@router.get("/complaints-recent")
def get_recent_complaints(limit: int = Query(10, le=50)):
    """Get the most recent complaints for the live threat feed."""
    df = load_complaints()
    df = df.sort_values("timestamp", ascending=False).head(limit)
    return df[["complaint_id", "timestamp", "fraud_type", "amount", "victim_city", "victim_state"]].to_dict(orient="records")


@router.get("/atms")
def get_atms(city: str = None, limit: int = Query(500, le=5000)):
    """Get ATM locations."""
    df = load_atms()
    if city:
        df = df[df["city"] == city]
    return {"total": len(df), "data": df.head(limit).to_dict(orient="records")}


@router.get("/cities")
def get_cities():
    """Get list of all cities in our data."""
    df = load_complaints()
    cities = df["victim_city"].value_counts().to_dict()
    return {"cities": cities}
