"""
🗄️ PostgreSQL + PostGIS Database Layer — CrimeShield AI
=========================================================
Production-grade database schema using PostgreSQL with PostGIS extension
for geospatial queries (nearest ATM, radius search, geo-fencing).

Tables:
  1. complaints        — 10,00,000 (10 lakh) cybercrime FIRs
  2. atm_locations      — 12,000 ATMs with PostGIS POINT geometry
  3. mule_accounts      — 50,000 mule bank accounts
  4. cash_withdrawals   — 6,00,000 ATM withdrawal events
  5. suspects           — 5,000 suspect profiles across 250 gangs

Requires:
  - PostgreSQL 15+ with PostGIS extension enabled
  - psycopg2 or asyncpg for Python connectivity
"""

import os

# ── SQL Schema ──────────────────────────────────────────────────

SCHEMA_SQL = """
-- ============================================================
-- CrimeShield AI — PostgreSQL + PostGIS Schema
-- ============================================================
-- Run this ONCE to initialize the database.
-- Requires: CREATE EXTENSION postgis;

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for fast text search


-- ──────────────────────────────────────────────────────────────
-- 1. COMPLAINTS (10 lakh records)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id        VARCHAR(12)   PRIMARY KEY,
    timestamp           TIMESTAMP     NOT NULL,
    fraud_type          VARCHAR(30)   NOT NULL,
    amount              INTEGER       NOT NULL,
    victim_city         VARCHAR(50)   NOT NULL,
    victim_state        VARCHAR(50)   NOT NULL,
    victim_location     GEOMETRY(POINT, 4326),          -- PostGIS point
    reporting_delay_mins INTEGER      NOT NULL DEFAULT 30,
    hour_of_day         SMALLINT      NOT NULL,
    day_of_week         SMALLINT      NOT NULL,
    is_weekend          BOOLEAN       NOT NULL DEFAULT FALSE,
    status              VARCHAR(20)   NOT NULL DEFAULT 'OPEN',
    priority            VARCHAR(10)   DEFAULT 'MEDIUM',
    assigned_officer    VARCHAR(50),
    created_at          TIMESTAMP     DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_complaints_fraud_type ON complaints(fraud_type);
CREATE INDEX IF NOT EXISTS idx_complaints_city       ON complaints(victim_city);
CREATE INDEX IF NOT EXISTS idx_complaints_timestamp  ON complaints(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_status     ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_amount     ON complaints(amount);
-- PostGIS spatial index
CREATE INDEX IF NOT EXISTS idx_complaints_geo ON complaints USING GIST(victim_location);


-- ──────────────────────────────────────────────────────────────
-- 2. ATM LOCATIONS (12,000 ATMs with geospatial data)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS atm_locations (
    atm_id              VARCHAR(10)   PRIMARY KEY,
    bank                VARCHAR(60)   NOT NULL,
    city                VARCHAR(50)   NOT NULL,
    state               VARCHAR(50)   NOT NULL,
    location            GEOMETRY(POINT, 4326),          -- PostGIS point (lat/lng)
    area_type           VARCHAR(15)   DEFAULT 'urban',  -- urban/semi_urban/rural
    near_highway        BOOLEAN       DEFAULT FALSE,
    near_bus_station    BOOLEAN       DEFAULT FALSE,
    near_state_border   BOOLEAN       DEFAULT FALSE,
    has_cctv            BOOLEAN       DEFAULT TRUE,
    daily_txn_volume    INTEGER       DEFAULT 0,
    risk_score          REAL          DEFAULT 0.0
);

-- Spatial index for nearest-ATM queries
CREATE INDEX IF NOT EXISTS idx_atm_geo ON atm_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_atm_city ON atm_locations(city);
CREATE INDEX IF NOT EXISTS idx_atm_risk ON atm_locations(risk_score DESC);


-- ──────────────────────────────────────────────────────────────
-- 3. MULE ACCOUNTS (50,000 fraudulent bank accounts)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mule_accounts (
    account_id          VARCHAR(12)   PRIMARY KEY,
    bank                VARCHAR(60)   NOT NULL,
    holder_name         VARCHAR(100)  NOT NULL,
    city                VARCHAR(50)   NOT NULL,
    state               VARCHAR(50)   NOT NULL,
    location            GEOMETRY(POINT, 4326),
    layer_number        SMALLINT      NOT NULL,       -- 1=first hop, 4=cash-out layer
    controlled_by       VARCHAR(10),                  -- suspect_id FK
    is_active           BOOLEAN       DEFAULT TRUE,
    is_frozen           BOOLEAN       DEFAULT FALSE,
    account_age_days    INTEGER       DEFAULT 30,
    total_inflow        BIGINT        DEFAULT 0,
    total_outflow       BIGINT        DEFAULT 0,
    flagged_at          TIMESTAMP,
    created_at          TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mule_city    ON mule_accounts(city);
CREATE INDEX IF NOT EXISTS idx_mule_active  ON mule_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_mule_frozen  ON mule_accounts(is_frozen);
CREATE INDEX IF NOT EXISTS idx_mule_layer   ON mule_accounts(layer_number);
CREATE INDEX IF NOT EXISTS idx_mule_geo     ON mule_accounts USING GIST(location);


-- ──────────────────────────────────────────────────────────────
-- 4. CASH WITHDRAWALS (6 lakh linked withdrawal events)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_withdrawals (
    withdrawal_id       VARCHAR(12)   PRIMARY KEY,
    complaint_id        VARCHAR(12)   REFERENCES complaints(complaint_id),
    atm_id              VARCHAR(10)   REFERENCES atm_locations(atm_id),
    atm_city            VARCHAR(50)   NOT NULL,
    atm_state           VARCHAR(50)   NOT NULL,
    atm_location        GEOMETRY(POINT, 4326),
    amount              INTEGER       NOT NULL,
    timestamp           TIMESTAMP     NOT NULL,
    delay_hours         REAL          NOT NULL,        -- hours after complaint
    fraud_type          VARCHAR(30)   NOT NULL,
    victim_city         VARCHAR(50)   NOT NULL,
    last_mule_city      VARCHAR(50)   NOT NULL,
    mule_chain_length   SMALLINT      NOT NULL,
    was_intercepted     BOOLEAN       DEFAULT FALSE,
    intercepted_by      VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_wd_complaint  ON cash_withdrawals(complaint_id);
CREATE INDEX IF NOT EXISTS idx_wd_atm        ON cash_withdrawals(atm_id);
CREATE INDEX IF NOT EXISTS idx_wd_city       ON cash_withdrawals(atm_city);
CREATE INDEX IF NOT EXISTS idx_wd_fraud      ON cash_withdrawals(fraud_type);
CREATE INDEX IF NOT EXISTS idx_wd_timestamp  ON cash_withdrawals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wd_mule_city  ON cash_withdrawals(last_mule_city);
CREATE INDEX IF NOT EXISTS idx_wd_geo        ON cash_withdrawals USING GIST(atm_location);


-- ──────────────────────────────────────────────────────────────
-- 5. SUSPECTS (5,000 profiles across 250 gangs)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suspects (
    suspect_id          VARCHAR(10)   PRIMARY KEY,
    name                VARCHAR(100)  NOT NULL,
    phone               VARCHAR(20),
    role                VARCHAR(20)   NOT NULL,        -- mastermind/caller/mule_recruiter/cash_puller
    gang_id             VARCHAR(10)   NOT NULL,
    city                VARCHAR(50)   NOT NULL,
    state               VARCHAR(50)   NOT NULL,
    location            GEOMETRY(POINT, 4326),
    risk_score          REAL          DEFAULT 0.5,
    num_linked_cases    INTEGER       DEFAULT 0,
    is_arrested         BOOLEAN       DEFAULT FALSE,
    arrested_at         TIMESTAMP,
    created_at          TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspect_gang  ON suspects(gang_id);
CREATE INDEX IF NOT EXISTS idx_suspect_role  ON suspects(role);
CREATE INDEX IF NOT EXISTS idx_suspect_risk  ON suspects(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_suspect_geo   ON suspects USING GIST(location);


-- ──────────────────────────────────────────────────────────────
-- 6. USEFUL PostGIS VIEWS
-- ──────────────────────────────────────────────────────────────

-- View: High-risk ATMs (near highway + near border + high withdrawal volume)
CREATE OR REPLACE VIEW v_high_risk_atms AS
SELECT
    a.atm_id, a.bank, a.city, a.state,
    ST_Y(a.location) AS lat,
    ST_X(a.location) AS lng,
    a.near_highway, a.near_state_border, a.risk_score,
    COUNT(w.withdrawal_id) AS total_withdrawals,
    SUM(w.amount) AS total_amount_withdrawn
FROM atm_locations a
LEFT JOIN cash_withdrawals w ON w.atm_id = a.atm_id
WHERE a.near_highway = TRUE OR a.near_state_border = TRUE
GROUP BY a.atm_id
ORDER BY total_withdrawals DESC;


-- View: City-level fraud heatmap
CREATE OR REPLACE VIEW v_fraud_heatmap AS
SELECT
    victim_city,
    victim_state,
    ST_Y(victim_location) AS lat,
    ST_X(victim_location) AS lng,
    COUNT(*) AS total_complaints,
    SUM(amount) AS total_amount_lost,
    AVG(amount)::INTEGER AS avg_amount,
    fraud_type,
    COUNT(*) FILTER (WHERE status = 'OPEN') AS open_cases
FROM complaints
GROUP BY victim_city, victim_state, victim_location, fraud_type
ORDER BY total_complaints DESC;


-- Function: Find nearest ATMs within radius (in meters)
CREATE OR REPLACE FUNCTION find_nearby_atms(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
    atm_id VARCHAR,
    bank VARCHAR,
    city VARCHAR,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    near_highway BOOLEAN,
    near_state_border BOOLEAN,
    risk_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.atm_id, a.bank, a.city,
        ST_Y(a.location), ST_X(a.location),
        ST_Distance(a.location::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_meters,
        a.near_highway, a.near_state_border, a.risk_score
    FROM atm_locations a
    WHERE ST_DWithin(
        a.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_meters
    )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;


-- Function: Geofence alert — find all withdrawals inside a polygon
CREATE OR REPLACE FUNCTION withdrawals_in_geofence(
    p_polygon GEOMETRY
)
RETURNS TABLE (
    withdrawal_id VARCHAR,
    atm_id VARCHAR,
    amount INTEGER,
    timestamp TIMESTAMP,
    fraud_type VARCHAR,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.withdrawal_id, w.atm_id, w.amount, w.timestamp, w.fraud_type,
        ST_Y(w.atm_location), ST_X(w.atm_location)
    FROM cash_withdrawals w
    WHERE ST_Within(w.atm_location, p_polygon);
END;
$$ LANGUAGE plpgsql;
"""


def get_schema_sql() -> str:
    """Return the full SQL schema as a string."""
    return SCHEMA_SQL


def write_schema_file(output_dir: str = None):
    """Write the schema SQL to a .sql file for manual execution."""
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), 'datasets')
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, 'schema.sql')
    with open(path, 'w') as f:
        f.write(SCHEMA_SQL)
    print(f"[DB] Schema written to {path}")
    return path


if __name__ == "__main__":
    write_schema_file()
    print("[DB] Run this SQL against your PostgreSQL database:")
    print("     psql -U postgres -d crimeshield -f schema.sql")
