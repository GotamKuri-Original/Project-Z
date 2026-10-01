# DATABASE SETUP GUIDE
## PostgreSQL + PostGIS for CrimeShield AI

### Step 1: Install PostgreSQL with PostGIS

**Windows:**
Download from https://www.postgresql.org/download/windows/
During setup, also install the "Stack Builder" and add **PostGIS** extension.

**Or use Docker (easiest):**
```bash
docker run --name crimeshield-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=crimeshield \
  -p 5432:5432 \
  -d postgis/postgis:15-3.4
```

---

### Step 2: Create the Database

```bash
psql -U postgres
CREATE DATABASE crimeshield;
\c crimeshield
CREATE EXTENSION postgis;
\q
```

---

### Step 3: Apply the Schema

```bash
cd backend
python -c "from app.data.database import write_schema_file; write_schema_file()"
psql -U postgres -d crimeshield -f app/data/datasets/schema.sql
```

---

### Step 4: Generate the Data (10 Lakh Records)

```bash
# This takes ~90 seconds
python -m app.data.generator
```

---

### Step 5: Bulk Load into PostgreSQL

```bash
# Change directory to where CSVs are saved
cd app/data/datasets
psql -U postgres -d crimeshield -f load_data.sql
```

Expected output:
```
 atms_loaded
────────────
       12000

 complaints_loaded
───────────────────
         1000000   ← 10 LAKH ✅

 suspects_loaded
─────────────────
            5000

 mule_accounts_loaded
──────────────────────
           50000

 withdrawals_loaded
────────────────────
           600000  ← 6 LAKH ✅
```

---

### Step 6: Configure the Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set DATABASE_URL if needed
```

---

### Step 7: Run the Backend

```bash
python -m uvicorn app.main:app --reload
```

The API will now say `"source": "postgresql"` on all responses — meaning it's reading live from the DB.

---

### PostGIS Features Available

| Feature | SQL |
|---|---|
| Find ATMs near a point | `SELECT * FROM find_nearby_atms(28.704, 77.102, 5000)` |
| Fraud heatmap by city | `SELECT * FROM v_fraud_heatmap` |
| High-risk ATMs | `SELECT * FROM v_high_risk_atms` |
| Withdrawals in geofence | `SELECT * FROM withdrawals_in_geofence(ST_GeomFromText('POLYGON((...))'))` |
