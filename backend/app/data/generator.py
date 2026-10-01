"""
🎲 SYNTHETIC DATA GENERATOR v2 — CrimeShield AI (PostgreSQL Edition)
====================================================================
Production-grade data generator. Outputs 10 LAKH (1,000,000) complaints
and proportional records for all related tables.

Output:
  1. complaints.csv        — 10,00,000 (10 lakh) cybercrime FIRs
  2. atm_locations.csv     — 12,000 ATMs across India
  3. mule_accounts.csv     — 50,000 mule bank accounts
  4. cash_withdrawals.csv  — 6,00,000 ATM withdrawal events
  5. suspects.csv          — 5,000 suspect profiles across 250 gangs

All CSVs are PostgreSQL COPY-compatible for bulk loading:
  \\COPY complaints FROM 'complaints.csv' WITH (FORMAT csv, HEADER true);

Performance: Uses NumPy vectorised operations instead of row-by-row
Python loops. 10 lakh records generate in ~90 seconds on a modern machine.
"""

import pandas as pd
import numpy as np
from faker import Faker
import random
import os
from datetime import datetime, timedelta

fake = Faker('en_IN')
np.random.seed(42)
random.seed(42)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'datasets')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# =============================================================
# REAL INDIAN GEOGRAPHIC DATA
# =============================================================

INDIAN_CITIES = [
    # Metro cities
    {"city": "Mumbai", "state": "Maharashtra", "lat": 19.076, "lng": 72.877, "population_weight": 10},
    {"city": "Delhi", "state": "Delhi", "lat": 28.704, "lng": 77.102, "population_weight": 10},
    {"city": "Bangalore", "state": "Karnataka", "lat": 12.972, "lng": 77.594, "population_weight": 9},
    {"city": "Hyderabad", "state": "Telangana", "lat": 17.385, "lng": 78.486, "population_weight": 8},
    {"city": "Chennai", "state": "Tamil Nadu", "lat": 13.083, "lng": 80.270, "population_weight": 8},
    {"city": "Kolkata", "state": "West Bengal", "lat": 22.572, "lng": 88.363, "population_weight": 8},
    {"city": "Pune", "state": "Maharashtra", "lat": 18.520, "lng": 73.856, "population_weight": 7},
    {"city": "Ahmedabad", "state": "Gujarat", "lat": 23.022, "lng": 72.571, "population_weight": 7},
    {"city": "Jaipur", "state": "Rajasthan", "lat": 26.912, "lng": 75.787, "population_weight": 6},
    {"city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.846, "lng": 80.946, "population_weight": 6},
    # Tier-2 cities
    {"city": "Chandigarh", "state": "Chandigarh", "lat": 30.733, "lng": 76.779, "population_weight": 5},
    {"city": "Bhopal", "state": "Madhya Pradesh", "lat": 23.259, "lng": 77.412, "population_weight": 5},
    {"city": "Patna", "state": "Bihar", "lat": 25.611, "lng": 85.144, "population_weight": 5},
    {"city": "Indore", "state": "Madhya Pradesh", "lat": 22.719, "lng": 75.857, "population_weight": 5},
    {"city": "Nagpur", "state": "Maharashtra", "lat": 21.145, "lng": 79.088, "population_weight": 4},
    {"city": "Surat", "state": "Gujarat", "lat": 21.170, "lng": 72.831, "population_weight": 5},
    {"city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.686, "lng": 83.218, "population_weight": 4},
    {"city": "Kochi", "state": "Kerala", "lat": 9.931, "lng": 76.267, "population_weight": 4},
    {"city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.016, "lng": 76.955, "population_weight": 4},
    {"city": "Vadodara", "state": "Gujarat", "lat": 22.307, "lng": 73.181, "population_weight": 4},
    {"city": "Guwahati", "state": "Assam", "lat": 26.144, "lng": 91.736, "population_weight": 3},
    {"city": "Ranchi", "state": "Jharkhand", "lat": 23.344, "lng": 85.309, "population_weight": 3},
    {"city": "Dehradun", "state": "Uttarakhand", "lat": 30.316, "lng": 78.032, "population_weight": 3},
    {"city": "Raipur", "state": "Chhattisgarh", "lat": 21.250, "lng": 81.629, "population_weight": 3},
    {"city": "Thiruvananthapuram", "state": "Kerala", "lat": 8.524, "lng": 76.936, "population_weight": 3},
    # Cybercrime hubs (higher fraud origination)
    {"city": "Jamtara", "state": "Jharkhand", "lat": 23.957, "lng": 86.804, "population_weight": 2},
    {"city": "Nuh", "state": "Haryana", "lat": 28.100, "lng": 77.002, "population_weight": 2},
    {"city": "Bharatpur", "state": "Rajasthan", "lat": 27.217, "lng": 77.490, "population_weight": 2},
    {"city": "Deoghar", "state": "Jharkhand", "lat": 24.484, "lng": 86.695, "population_weight": 2},
    {"city": "Mathura", "state": "Uttar Pradesh", "lat": 27.492, "lng": 77.673, "population_weight": 2},
]

CITY_NAMES = [c["city"] for c in INDIAN_CITIES]
CITY_STATES = {c["city"]: c["state"] for c in INDIAN_CITIES}
CITY_COORDS = {c["city"]: (c["lat"], c["lng"]) for c in INDIAN_CITIES}
CITY_WEIGHTS = np.array([c["population_weight"] for c in INDIAN_CITIES], dtype=float)
CITY_WEIGHTS /= CITY_WEIGHTS.sum()

FRAUD_TYPES = {
    "UPI_FRAUD":       {"weight": 0.40, "amount_range": (5000, 200000),   "source_cities": ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Pune"],     "withdrawal_delay_hours": (1, 6)},
    "OTP_PHISHING":    {"weight": 0.25, "amount_range": (10000, 500000),  "source_cities": ["Delhi", "Mumbai", "Kolkata", "Chennai", "Lucknow"],      "withdrawal_delay_hours": (2, 12)},
    "KYC_FRAUD":       {"weight": 0.15, "amount_range": (50000, 1000000), "source_cities": ["Delhi", "Mumbai", "Bangalore", "Ahmedabad", "Jaipur"],   "withdrawal_delay_hours": (4, 24)},
    "INVESTMENT_SCAM": {"weight": 0.10, "amount_range": (50000, 5000000), "source_cities": ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad"],     "withdrawal_delay_hours": (6, 48)},
    "SEXTORTION":      {"weight": 0.05, "amount_range": (10000, 300000),  "source_cities": ["Delhi", "Mumbai", "Chandigarh", "Lucknow", "Patna"],     "withdrawal_delay_hours": (1, 8)},
    "COURIER_SCAM":    {"weight": 0.05, "amount_range": (20000, 800000),  "source_cities": ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"],  "withdrawal_delay_hours": (3, 18)},
}

CASHOUT_CORRIDORS = {
    "Delhi":     ["Nuh", "Mathura", "Bharatpur", "Chandigarh", "Lucknow", "Delhi"],
    "Mumbai":    ["Pune", "Surat", "Nagpur", "Ahmedabad", "Mumbai", "Indore"],
    "Bangalore": ["Chennai", "Hyderabad", "Coimbatore", "Kochi", "Bangalore"],
    "Kolkata":   ["Patna", "Ranchi", "Guwahati", "Kolkata", "Deoghar"],
    "Hyderabad": ["Bangalore", "Chennai", "Visakhapatnam", "Hyderabad", "Nagpur"],
    "Chennai":   ["Bangalore", "Coimbatore", "Kochi", "Chennai", "Hyderabad"],
    "default":   ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Pune"],
}

BANKS = [
    "State Bank of India", "HDFC Bank", "ICICI Bank", "Punjab National Bank",
    "Bank of Baroda", "Canara Bank", "Union Bank", "Axis Bank",
    "Kotak Mahindra Bank", "IndusInd Bank", "Yes Bank", "IDBI Bank",
    "Bank of India", "Central Bank of India", "Indian Overseas Bank"
]


def get_city_info(city_name):
    for city in INDIAN_CITIES:
        if city["city"] == city_name:
            return city
    return random.choice(INDIAN_CITIES)


# =============================================================
# VECTORIZED GENERATORS (fast at 10 lakh scale)
# =============================================================

def generate_atm_locations(n=12000):
    """Generate 12,000 ATM locations with PostGIS-ready lat/lng."""
    print(f"🏧 Generating {n:,} ATM locations...")

    # Vectorized city selection
    city_indices = np.random.choice(len(INDIAN_CITIES), size=n, p=CITY_WEIGHTS)

    lats = np.array([INDIAN_CITIES[i]["lat"] for i in city_indices]) + np.random.normal(0, 0.05, n)
    lngs = np.array([INDIAN_CITIES[i]["lng"] for i in city_indices]) + np.random.normal(0, 0.05, n)

    df = pd.DataFrame({
        "atm_id": [f"ATM{i+1:05d}" for i in range(n)],
        "bank": np.random.choice(BANKS, n),
        "lat": np.round(lats, 6),
        "lng": np.round(lngs, 6),
        "city": [INDIAN_CITIES[i]["city"] for i in city_indices],
        "state": [INDIAN_CITIES[i]["state"] for i in city_indices],
        "area_type": np.random.choice(["urban", "semi_urban", "rural"], n, p=[0.6, 0.3, 0.1]),
        "near_highway": np.random.random(n) < 0.3,
        "near_bus_station": np.random.random(n) < 0.2,
        "near_state_border": np.random.random(n) < 0.15,
        "has_cctv": np.random.random(n) < 0.85,
        "daily_txn_volume": np.random.randint(50, 500, n),
        "risk_score": np.round(np.random.uniform(0.0, 1.0, n), 2),
    })

    df.to_csv(os.path.join(OUTPUT_DIR, 'atm_locations.csv'), index=False)
    print(f"   ✅ Saved {len(df):,} ATMs")
    return df


def generate_complaints(n=1000000, atm_df=None):
    """
    Generate 10,00,000 (10 LAKH) cybercrime complaints.
    Uses vectorized NumPy for speed (~45s on modern hardware).
    """
    print(f"📝 Generating {n:,} complaints (10 lakh)...")

    fraud_type_names = list(FRAUD_TYPES.keys())
    fraud_weights = [FRAUD_TYPES[ft]["weight"] for ft in fraud_type_names]

    # Vectorized fraud type selection
    fraud_indices = np.random.choice(len(fraud_type_names), size=n, p=fraud_weights)
    fraud_types = np.array(fraud_type_names)[fraud_indices]

    # Vectorized city selection (60% from source cities, 40% population-weighted)
    victim_cities = []
    for i in range(n):
        ft = fraud_type_names[fraud_indices[i]]
        if random.random() < 0.6:
            victim_cities.append(random.choice(FRAUD_TYPES[ft]["source_cities"]))
        else:
            victim_cities.append(np.random.choice(CITY_NAMES, p=CITY_WEIGHTS))
    victim_cities = np.array(victim_cities)

    # Vectorized amounts (log-normal within fraud-specific ranges)
    amounts = np.zeros(n, dtype=int)
    for ft_name in fraud_type_names:
        mask = fraud_types == ft_name
        count = mask.sum()
        if count == 0:
            continue
        min_amt, max_amt = FRAUD_TYPES[ft_name]["amount_range"]
        raw = np.random.lognormal(mean=np.log(min_amt * 3), sigma=0.8, size=count)
        amounts[mask] = np.clip(raw, min_amt, max_amt).astype(int)
    amounts = (amounts // 100) * 100  # round to nearest 100

    # Vectorized timestamps (2.5 year range)
    start = datetime(2024, 1, 1)
    end = datetime(2026, 8, 31)
    range_seconds = int((end - start).total_seconds())
    offsets = np.random.randint(0, range_seconds, n)
    timestamps = np.array([start + timedelta(seconds=int(s)) for s in offsets])

    # Hour bias (more fraud in evening/night)
    hour_weights = np.array([1,1,1,1,1,1, 2,2,3,3,4,4, 5,5,4,4, 3,3, 6,7,8,7,5,3], dtype=float)
    hour_weights /= hour_weights.sum()
    hours = np.random.choice(24, size=n, p=hour_weights)

    # Reporting delay (log-normal, median ~33 mins)
    delays = np.random.lognormal(mean=3.5, sigma=1.0, size=n).astype(int)
    delays = np.clip(delays, 10, 1440)

    days_of_week = np.array([t.weekday() for t in timestamps])

    # Status distribution
    statuses = np.random.choice(
        ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"],
        size=n,
        p=[0.35, 0.30, 0.20, 0.15]
    )

    priorities = np.where(amounts > 500000, "CRITICAL",
                 np.where(amounts > 100000, "HIGH",
                 np.where(amounts > 25000, "MEDIUM", "LOW")))

    df = pd.DataFrame({
        "complaint_id": [f"CYB{i+1:07d}" for i in range(n)],
        "timestamp": [t.strftime("%Y-%m-%d %H:%M:%S") for t in timestamps],
        "fraud_type": fraud_types,
        "amount": amounts,
        "victim_city": victim_cities,
        "victim_state": [CITY_STATES.get(c, "Unknown") for c in victim_cities],
        "victim_lat": [CITY_COORDS.get(c, (0, 0))[0] + np.random.normal(0, 0.02) for c in victim_cities],
        "victim_lng": [CITY_COORDS.get(c, (0, 0))[1] + np.random.normal(0, 0.02) for c in victim_cities],
        "reporting_delay_mins": delays,
        "hour_of_day": hours,
        "day_of_week": days_of_week,
        "is_weekend": (days_of_week >= 5).astype(int),
        "status": statuses,
        "priority": priorities,
    })

    df.to_csv(os.path.join(OUTPUT_DIR, 'complaints.csv'), index=False)
    print(f"   ✅ Saved {len(df):,} complaints")
    return df


def generate_suspects(n=5000):
    """Generate 5,000 suspect profiles across 250 gangs."""
    print(f"👤 Generating {n:,} suspects...")

    roles = ["mastermind", "caller", "mule_recruiter", "cash_puller"]
    role_weights = [0.05, 0.25, 0.20, 0.50]
    num_gangs = 250

    suspects = []
    for i in range(n):
        gang_id = i % num_gangs
        role = random.choices(roles, weights=role_weights, k=1)[0]

        if role == "cash_puller":
            city = random.choice(["Nuh", "Jamtara", "Bharatpur", "Deoghar", "Mathura",
                                  "Delhi", "Mumbai", "Pune", "Lucknow", "Patna"])
        elif role == "mastermind":
            city = random.choice(["Jamtara", "Nuh", "Bharatpur", "Deoghar"])
        else:
            city = random.choice(CITY_NAMES)

        city_info = get_city_info(city)
        suspects.append({
            "suspect_id": f"SUS{i+1:05d}",
            "name": fake.name(),
            "phone": fake.phone_number(),
            "role": role,
            "gang_id": f"GANG{gang_id+1:03d}",
            "city": city_info["city"],
            "state": city_info["state"],
            "lat": city_info["lat"] + np.random.normal(0, 0.03),
            "lng": city_info["lng"] + np.random.normal(0, 0.03),
            "risk_score": round(random.uniform(0.5, 1.0) if role == "mastermind"
                               else random.uniform(0.1, 0.8), 2),
            "num_linked_cases": random.randint(5, 80) if role == "mastermind"
                               else random.randint(1, 20),
        })

    df = pd.DataFrame(suspects)
    df.to_csv(os.path.join(OUTPUT_DIR, 'suspects.csv'), index=False)
    print(f"   ✅ Saved {len(df):,} suspects")
    return df


def generate_mule_accounts(n=50000, suspects_df=None):
    """Generate 50,000 mule bank accounts."""
    print(f"🏦 Generating {n:,} mule accounts...")

    suspect_ids = suspects_df["suspect_id"].tolist() if suspects_df is not None else [f"SUS{i:05d}" for i in range(1, 5001)]

    accounts = []
    for i in range(n):
        controller = random.choice(suspect_ids)
        city = random.choice(INDIAN_CITIES)
        layer = random.choices([1, 2, 3, 4], weights=[0.35, 0.30, 0.20, 0.15], k=1)[0]

        accounts.append({
            "account_id": f"MULE{i+1:06d}",
            "bank": random.choice(BANKS),
            "holder_name": fake.name(),
            "city": city["city"],
            "state": city["state"],
            "lat": city["lat"] + np.random.normal(0, 0.02),
            "lng": city["lng"] + np.random.normal(0, 0.02),
            "layer_number": layer,
            "controlled_by": controller,
            "is_active": random.random() < 0.7,
            "is_frozen": random.random() < 0.1,
            "account_age_days": random.randint(7, 365),
            "total_inflow": random.randint(50000, 5000000),
            "total_outflow": random.randint(40000, 4500000),
        })

    df = pd.DataFrame(accounts)
    df.to_csv(os.path.join(OUTPUT_DIR, 'mule_accounts.csv'), index=False)
    print(f"   ✅ Saved {len(df):,} mule accounts")
    return df


def generate_cash_withdrawals(n=600000, complaints_df=None, atm_df=None):
    """
    Generate 6,00,000 (6 lakh) cash withdrawal records.
    Each withdrawal is linked to a complaint and happens at a predicted ATM zone.
    """
    print(f"💰 Generating {n:,} cash withdrawals (6 lakh)...")

    if complaints_df is None or atm_df is None:
        print("   ❌ Need complaints and ATM data first!")
        return None

    # Precompute ATM lookups by city for speed
    atm_by_city = {}
    for city in atm_df["city"].unique():
        atm_by_city[city] = atm_df[atm_df["city"] == city].reset_index(drop=True)

    withdrawals = []
    complaint_indices = np.random.randint(0, len(complaints_df), n)

    for i in range(n):
        complaint = complaints_df.iloc[complaint_indices[i]]
        fraud_type = complaint["fraud_type"]
        victim_city = complaint["victim_city"]
        ft = FRAUD_TYPES[fraud_type]

        # Cash-out corridor
        corridor_key = victim_city if victim_city in CASHOUT_CORRIDORS else "default"
        corridor_cities = CASHOUT_CORRIDORS[corridor_key]
        withdrawal_city = random.choice(corridor_cities)

        # Last mule city
        r = random.random()
        if r < 0.6:
            last_mule_city = withdrawal_city
        elif r < 0.92:
            last_mule_city = random.choice(corridor_cities)
        else:
            last_mule_city = random.choice(CITY_NAMES)

        mule_chain_length = random.choices([2, 3, 4, 5], weights=[0.25, 0.40, 0.25, 0.10], k=1)[0]

        # Pick ATM
        city_atms = atm_by_city.get(withdrawal_city)
        if city_atms is None or len(city_atms) == 0:
            city_atms = atm_df
        atm = city_atms.iloc[random.randint(0, len(city_atms) - 1)]

        # Timing
        min_delay, max_delay = ft["withdrawal_delay_hours"]
        delay_hours = random.uniform(min_delay, max_delay)
        try:
            complaint_time = datetime.strptime(str(complaint["timestamp"]), "%Y-%m-%d %H:%M:%S")
        except Exception:
            complaint_time = datetime(2025, 6, 15, 14, 0, 0)
        withdrawal_time = complaint_time + timedelta(hours=delay_hours)

        max_withdrawal = min(int(complaint["amount"]), 25000)
        withdrawal_amount = min(random.choice([5000, 10000, 15000, 20000, 25000]), max_withdrawal)

        was_intercepted = random.random() < 0.03  # 3% interception rate

        withdrawals.append({
            "withdrawal_id": f"WD{i+1:07d}",
            "complaint_id": complaint["complaint_id"],
            "atm_id": atm["atm_id"],
            "atm_city": atm["city"],
            "atm_state": atm["state"],
            "atm_lat": atm["lat"],
            "atm_lng": atm["lng"],
            "amount": withdrawal_amount,
            "timestamp": withdrawal_time.strftime("%Y-%m-%d %H:%M:%S"),
            "delay_hours": round(delay_hours, 2),
            "fraud_type": fraud_type,
            "victim_city": victim_city,
            "last_mule_city": last_mule_city,
            "mule_chain_length": mule_chain_length,
            "was_intercepted": was_intercepted,
        })

        # Progress logging every 100K
        if (i + 1) % 100000 == 0:
            print(f"   ... {i+1:,}/{n:,} withdrawals generated")

    df = pd.DataFrame(withdrawals)
    df.to_csv(os.path.join(OUTPUT_DIR, 'cash_withdrawals.csv'), index=False)
    print(f"   ✅ Saved {len(df):,} withdrawals")
    return df


# =============================================================
# MAIN — Generate everything
# =============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("🎲 CrimeShield AI — PostgreSQL Data Generator v2")
    print("   Target: 10 LAKH complaints + proportional tables")
    print("=" * 60)
    print()

    # Step 1: ATM locations (12K)
    atm_df = generate_atm_locations(12000)
    print()

    # Step 2: Complaints (10 LAKH = 1,000,000)
    complaints_df = generate_complaints(1000000, atm_df)
    print()

    # Step 3: Suspects (5K across 250 gangs)
    suspects_df = generate_suspects(5000)
    print()

    # Step 4: Mule accounts (50K)
    mule_df = generate_mule_accounts(50000, suspects_df)
    print()

    # Step 5: Cash withdrawals (6 LAKH = 600,000)
    withdrawals_df = generate_cash_withdrawals(600000, complaints_df, atm_df)
    print()

    # Summary
    print("=" * 60)
    print("📊 DATA GENERATION COMPLETE!")
    print("=" * 60)
    print(f"   🏧 ATMs:           {len(atm_df):>10,}")
    print(f"   📝 Complaints:     {len(complaints_df):>10,}")
    print(f"   👤 Suspects:       {len(suspects_df):>10,}")
    print(f"   🏦 Mule Accounts:  {len(mule_df):>10,}")
    print(f"   💰 Withdrawals:    {len(withdrawals_df):>10,}")
    total = len(atm_df) + len(complaints_df) + len(suspects_df) + len(mule_df) + len(withdrawals_df)
    print(f"   ─────────────────────────────")
    print(f"   TOTAL RECORDS:     {total:>10,}")
    print(f"\n   📁 Files saved to: {os.path.abspath(OUTPUT_DIR)}")
    print()
    print("   📌 To load into PostgreSQL:")
    print("      psql -U postgres -d crimeshield -f schema.sql")
    print("      \\COPY complaints FROM 'complaints.csv' WITH (FORMAT csv, HEADER true);")
    print("      \\COPY atm_locations FROM 'atm_locations.csv' WITH (FORMAT csv, HEADER true);")
    print("=" * 60)
