"""
🗄️ PostgreSQL + PostGIS Database Connection — CrimeShield AI
==============================================================
Single connection pool shared by all API modules.
Uses SQLAlchemy for ORM + raw psycopg2 for PostGIS queries.

Configuration via environment variables (or .env):
    DATABASE_URL=postgresql://postgres:password@localhost:5432/crimeshield

Falls back gracefully to CSV mode if PostgreSQL is not available
so development works even without a running DB instance.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Try to connect to PostgreSQL ──────────────────────────────
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/crimeshield"
)

_engine = None
_db_available = False


def get_engine():
    """Get or create the SQLAlchemy engine (connection pool)."""
    global _engine, _db_available
    if _engine is not None:
        return _engine

    try:
        from sqlalchemy import create_engine, text
        _engine = create_engine(
            DATABASE_URL,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,          # test connection before use
            pool_recycle=3600,           # recycle connections every hour
            echo=False,
        )
        # Test connection
        with _engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        _db_available = True
        logger.info(f"[DB] ✅ Connected to PostgreSQL: {DATABASE_URL}")
    except Exception as e:
        logger.warning(f"[DB] ⚠️  PostgreSQL unavailable ({e}). Falling back to CSV mode.")
        _db_available = False
        _engine = None

    return _engine


def is_db_available() -> bool:
    """Check if PostgreSQL is available."""
    if _engine is None:
        get_engine()
    return _db_available


def query_df(sql: str, params: dict = None):
    """
    Execute a SQL query and return results as a pandas DataFrame.
    Falls back to None if DB is unavailable.
    """
    engine = get_engine()
    if engine is None or not _db_available:
        return None
    try:
        import pandas as pd
        from sqlalchemy import text
        with engine.connect() as conn:
            return pd.read_sql(text(sql), conn, params=params or {})
    except Exception as e:
        logger.error(f"[DB] Query failed: {e}")
        return None


def execute(sql: str, params: dict = None):
    """
    Execute a non-SELECT SQL statement (INSERT, UPDATE, etc.).
    """
    engine = get_engine()
    if engine is None or not _db_available:
        return False
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text(sql), params or {})
        return True
    except Exception as e:
        logger.error(f"[DB] Execute failed: {e}")
        return False


# ── Geospatial helpers ────────────────────────────────────────

def find_nearby_atms(lat: float, lng: float, radius_meters: int = 5000):
    """
    Use PostGIS ST_DWithin to find ATMs within a radius.
    Returns list of dicts, or empty list if DB unavailable.
    """
    df = query_df(
        """
        SELECT atm_id, bank, city, state,
               ST_Y(location) AS lat, ST_X(location) AS lng,
               ST_Distance(location::geography,
                   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
               ) AS distance_meters,
               near_highway, near_state_border, risk_score
        FROM atm_locations
        WHERE ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radius
        )
        ORDER BY distance_meters ASC
        LIMIT 20
        """,
        {"lat": lat, "lng": lng, "radius": radius_meters}
    )
    if df is None:
        return []
    return df.to_dict(orient="records")


def get_fraud_heatmap():
    """
    City-level fraud heatmap using the PostGIS view.
    """
    df = query_df("SELECT * FROM v_fraud_heatmap LIMIT 200")
    if df is None:
        return []
    return df.to_dict(orient="records")


# Initialize connection at import time
get_engine()
