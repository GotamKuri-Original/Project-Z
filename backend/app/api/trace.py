"""
Trace API — deterministic, dataset-backed mule trace for a complaint
"""
from fastapi import APIRouter, HTTPException, Path
from app.services.trace_service import get_trace_service
router = APIRouter()
# Warm the cache at import, matching how the other routers load their CSVs.
get_trace_service()
@router.get("/trace/{complaint_id}")
def get_trace(
    complaint_id: str = Path(..., min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_-]+$"),
):
    service = get_trace_service()
    if service is None:
        raise HTTPException(status_code=503, detail="Trace datasets not loaded — run app/data/generator.py")
    trace = service.trace(complaint_id)
    if trace is None:
        raise HTTPException(status_code=404, detail=f"Complaint {complaint_id.upper()} not found")
    return trace

@router.get("/trace/demo/random")
def get_random_demo_case():
    import pandas as pd
    import random
    import os
    try:
        csv_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets', 'live_demo_cases.csv')
        demo_df = pd.read_csv(csv_path)
        if demo_df.empty:
            raise HTTPException(status_code=404, detail="Demo cases empty")
        random_id = random.choice(demo_df["complaint_id"].values)
        return {"complaint_id": random_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
