"""
Complaints API — Handles cybercrime complaint data
"""

from fastapi import APIRouter, Query
import pandas as pd
import os

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets')


def load_complaints():
    return pd.read_csv(os.path.join(DATA_DIR, 'complaints.csv'))


def load_atms():
    return pd.read_csv(os.path.join(DATA_DIR, 'atm_locations.csv'))


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
