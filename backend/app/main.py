"""
FastAPI Backend — CrimeShield AI
================================
This is the main server file. It creates a web API that our frontend calls.

What is an API?
- Think of it like a waiter in a restaurant.
- Frontend (customer) asks for data → API (waiter) gets it from the database → returns it.
- Example: Frontend asks "GET /api/complaints" → Backend returns list of complaints.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import complaints, predictions, network, analytics

app = FastAPI(
    title="CrimeShield AI",
    description="Predictive Cybercrime Analytics Platform — Team CTRL Z",
    version="1.0.0",
)

# Allow frontend (running on different port) to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(complaints.router, prefix="/api", tags=["Complaints"])
app.include_router(predictions.router, prefix="/api", tags=["Predictions"])
app.include_router(network.router, prefix="/api", tags=["Network"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])


@app.get("/")
def root():
    return {
        "project": "CrimeShield AI",
        "team": "CTRL Z",
        "ps_id": "SIH26184",
        "status": "running"
    }
