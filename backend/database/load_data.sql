-- ============================================================
-- CrimeShield AI — PostgreSQL + PostGIS BULK LOAD SCRIPT
-- ============================================================
-- Run AFTER generating CSVs with: python -m app.data.generator
-- Run AFTER applying schema:      psql -U postgres -d crimeshield -f schema.sql
--
-- STEP 1: Generate data
--   cd backend
--   python -m app.data.generator
--
-- STEP 2: Apply schema (ONCE)
--   psql -U postgres -d crimeshield -f app/data/datasets/schema.sql
--
-- STEP 3: Bulk load (this file)
--   psql -U postgres -d crimeshield -f app/data/datasets/load_data.sql
--
-- NOTE: Adjust file paths to absolute paths on your machine.
-- ============================================================

-- Disable indexes temporarily for fast bulk load
SET synchronous_commit = OFF;
ALTER TABLE complaints       DISABLE TRIGGER ALL;
ALTER TABLE atm_locations    DISABLE TRIGGER ALL;
ALTER TABLE mule_accounts    DISABLE TRIGGER ALL;
ALTER TABLE cash_withdrawals DISABLE TRIGGER ALL;
ALTER TABLE suspects         DISABLE TRIGGER ALL;

-- ── 1. Load ATMs ─────────────────────────────────────────────
\COPY atm_locations (atm_id, bank, lat, lng, city, state, area_type, near_highway, near_bus_station, near_state_border, has_cctv, daily_txn_volume, risk_score)
FROM '../app/data/datasets/atm_locations.csv'
WITH (FORMAT csv, HEADER true, NULL '');

-- Update PostGIS geometry column from lat/lng
UPDATE atm_locations
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE location IS NULL;

SELECT COUNT(*) AS atms_loaded FROM atm_locations;

-- ── 2. Load Complaints (10 LAKH) ─────────────────────────────
\COPY complaints (complaint_id, timestamp, fraud_type, amount, victim_city, victim_state, victim_lat, victim_lng, reporting_delay_mins, hour_of_day, day_of_week, is_weekend, status, priority)
FROM '../app/data/datasets/complaints.csv'
WITH (FORMAT csv, HEADER true, NULL '');

-- Update PostGIS geometry column
UPDATE complaints
SET victim_location = ST_SetSRID(ST_MakePoint(victim_lng, victim_lat), 4326)
WHERE victim_location IS NULL;

SELECT COUNT(*) AS complaints_loaded FROM complaints;

-- ── 3. Load Suspects ─────────────────────────────────────────
\COPY suspects (suspect_id, name, phone, role, gang_id, city, state, lat, lng, risk_score, num_linked_cases)
FROM '../app/data/datasets/suspects.csv'
WITH (FORMAT csv, HEADER true, NULL '');

UPDATE suspects
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE location IS NULL;

SELECT COUNT(*) AS suspects_loaded FROM suspects;

-- ── 4. Load Mule Accounts ────────────────────────────────────
\COPY mule_accounts (account_id, bank, holder_name, city, state, lat, lng, layer_number, controlled_by, is_active, is_frozen, account_age_days, total_inflow, total_outflow)
FROM '../app/data/datasets/mule_accounts.csv'
WITH (FORMAT csv, HEADER true, NULL '');

UPDATE mule_accounts
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE location IS NULL;

SELECT COUNT(*) AS mule_accounts_loaded FROM mule_accounts;

-- ── 5. Load Cash Withdrawals (6 LAKH) ────────────────────────
\COPY cash_withdrawals (withdrawal_id, complaint_id, atm_id, atm_city, atm_state, atm_lat, atm_lng, amount, timestamp, delay_hours, fraud_type, victim_city, last_mule_city, mule_chain_length, was_intercepted)
FROM '../app/data/datasets/cash_withdrawals.csv'
WITH (FORMAT csv, HEADER true, NULL '');

UPDATE cash_withdrawals
SET atm_location = ST_SetSRID(ST_MakePoint(atm_lng, atm_lat), 4326)
WHERE atm_location IS NULL;

SELECT COUNT(*) AS withdrawals_loaded FROM cash_withdrawals;

-- Re-enable triggers
ALTER TABLE complaints       ENABLE TRIGGER ALL;
ALTER TABLE atm_locations    ENABLE TRIGGER ALL;
ALTER TABLE mule_accounts    ENABLE TRIGGER ALL;
ALTER TABLE cash_withdrawals ENABLE TRIGGER ALL;
ALTER TABLE suspects         ENABLE TRIGGER ALL;

SET synchronous_commit = ON;

-- ── 6. Verify ────────────────────────────────────────────────
SELECT
    'complaints'        AS table_name, COUNT(*) AS record_count FROM complaints
UNION ALL SELECT
    'atm_locations',    COUNT(*) FROM atm_locations
UNION ALL SELECT
    'mule_accounts',    COUNT(*) FROM mule_accounts
UNION ALL SELECT
    'cash_withdrawals', COUNT(*) FROM cash_withdrawals
UNION ALL SELECT
    'suspects',         COUNT(*) FROM suspects;

-- ── 7. Quick sanity check: nearest ATMs to Delhi ─────────────
SELECT * FROM find_nearby_atms(28.704, 77.102, 10000) LIMIT 5;
