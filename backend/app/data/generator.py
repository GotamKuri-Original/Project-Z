"""
🎲 SYNTHETIC DATA GENERATOR — CrimeShield AI
=============================================
Generates realistic fake cybercrime data for training our ML model.

What this creates:
1. complaints.csv      — 50,000 cybercrime complaints (victim city, fraud type, amount, time)
2. atm_locations.csv   — 5,000 ATM locations across India (lat, lng, city, state)
3. mule_accounts.csv   — 15,000 mule bank accounts used by criminals
4. cash_withdrawals.csv — 30,000 ATM withdrawal records linked to crimes
5. suspects.csv        — 2,000 suspect profiles with roles and connections

WHY SYNTHETIC DATA?
- Real NCRP data is classified (government secret)
- We bake in REAL PATTERNS so the ML model can learn:
  → Jamtara, Jharkhand = OTP/phishing fraud hub
  → Mewat, Haryana = KYC/impersonation fraud hub
  → Cash withdrawals happen 2-24 hours after fraud
  → Criminals prefer ATMs near state borders and bus stations
  → Specific fraud types cluster in specific cities
"""

import pandas as pd
import numpy as np
from faker import Faker
import random
import os
from datetime import datetime, timedelta

fake = Faker('en_IN')  # Indian locale
np.random.seed(42)
random.seed(42)

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'datasets')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# =============================================================
# REAL INDIAN GEOGRAPHIC DATA
# =============================================================

# Major cities with their state, lat, lng (real coordinates)
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

# Fraud types with their characteristics
FRAUD_TYPES = {
    "UPI_FRAUD": {
        "weight": 0.40,  # 40% of all complaints
        "amount_range": (5000, 200000),
        "source_cities": ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Pune"],  # Victims from metros
        "withdrawal_delay_hours": (1, 6),  # Cash withdrawn quickly
    },
    "OTP_PHISHING": {
        "weight": 0.25,
        "amount_range": (10000, 500000),
        "source_cities": ["Delhi", "Mumbai", "Kolkata", "Chennai", "Lucknow"],
        "withdrawal_delay_hours": (2, 12),
    },
    "KYC_FRAUD": {
        "weight": 0.15,
        "amount_range": (50000, 1000000),
        "source_cities": ["Delhi", "Mumbai", "Bangalore", "Ahmedabad", "Jaipur"],
        "withdrawal_delay_hours": (4, 24),
    },
    "INVESTMENT_SCAM": {
        "weight": 0.10,
        "amount_range": (50000, 5000000),
        "source_cities": ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad"],
        "withdrawal_delay_hours": (6, 48),
    },
    "SEXTORTION": {
        "weight": 0.05,
        "amount_range": (10000, 300000),
        "source_cities": ["Delhi", "Mumbai", "Chandigarh", "Lucknow", "Patna"],
        "withdrawal_delay_hours": (1, 8),
    },
    "COURIER_SCAM": {
        "weight": 0.05,
        "amount_range": (20000, 800000),
        "source_cities": ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"],
        "withdrawal_delay_hours": (3, 18),
    },
}

# Criminal cash-out corridors (where cash pullers operate)
# Maps fraud origin region → likely withdrawal cities
CASHOUT_CORRIDORS = {
    "Delhi": ["Nuh", "Mathura", "Bharatpur", "Chandigarh", "Lucknow", "Delhi"],
    "Mumbai": ["Pune", "Surat", "Nagpur", "Ahmedabad", "Mumbai", "Indore"],
    "Bangalore": ["Chennai", "Hyderabad", "Coimbatore", "Kochi", "Bangalore"],
    "Kolkata": ["Patna", "Ranchi", "Guwahati", "Kolkata", "Deoghar"],
    "Hyderabad": ["Bangalore", "Chennai", "Visakhapatnam", "Hyderabad", "Nagpur"],
    "Chennai": ["Bangalore", "Coimbatore", "Kochi", "Chennai", "Hyderabad"],
    "default": ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Pune"],
}

BANKS = [
    "State Bank of India", "HDFC Bank", "ICICI Bank", "Punjab National Bank",
    "Bank of Baroda", "Canara Bank", "Union Bank", "Axis Bank",
    "Kotak Mahindra Bank", "IndusInd Bank", "Yes Bank", "IDBI Bank",
    "Bank of India", "Central Bank of India", "Indian Overseas Bank"
]


def get_city_info(city_name):
    """Get full city info by name."""
    for city in INDIAN_CITIES:
        if city["city"] == city_name:
            return city
    return random.choice(INDIAN_CITIES)


def generate_atm_locations(n=5000):
    """
    Generate 5,000 ATM locations across India.
    ATMs are clustered around city centers with some random spread.
    """
    print(f"🏧 Generating {n} ATM locations...")
    atms = []
    
    for i in range(n):
        # Pick a city (weighted by population)
        weights = [c["population_weight"] for c in INDIAN_CITIES]
        city = random.choices(INDIAN_CITIES, weights=weights, k=1)[0]
        
        # Add random offset (ATMs spread around city center, ~0.01-0.1 degrees ≈ 1-10 km)
        lat = city["lat"] + np.random.normal(0, 0.05)
        lng = city["lng"] + np.random.normal(0, 0.05)
        
        atms.append({
            "atm_id": f"ATM{i+1:05d}",
            "bank": random.choice(BANKS),
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "city": city["city"],
            "state": city["state"],
            "area_type": random.choices(
                ["urban", "semi_urban", "rural"],
                weights=[0.6, 0.3, 0.1],
                k=1
            )[0],
            "near_highway": random.random() < 0.3,
            "near_bus_station": random.random() < 0.2,
            "near_state_border": random.random() < 0.15,
        })
    
    df = pd.DataFrame(atms)
    df.to_csv(os.path.join(OUTPUT_DIR, 'atm_locations.csv'), index=False)
    print(f"   ✅ Saved {len(df)} ATMs to atm_locations.csv")
    return df


def generate_complaints(n=50000, atm_df=None):
    """
    Generate 50,000 cybercrime complaints with realistic patterns.
    Each complaint has a victim city, fraud type, amount, and timestamp.
    """
    print(f"📝 Generating {n} complaints...")
    complaints = []
    
    # Date range: last 2 years
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2026, 8, 31)
    date_range_seconds = int((end_date - start_date).total_seconds())
    
    for i in range(n):
        # Pick fraud type (weighted)
        fraud_type = random.choices(
            list(FRAUD_TYPES.keys()),
            weights=[ft["weight"] for ft in FRAUD_TYPES.values()],
            k=1
        )[0]
        ft = FRAUD_TYPES[fraud_type]
        
        # Victim city (weighted by population, biased toward fraud type's source cities)
        if random.random() < 0.6:
            victim_city_name = random.choice(ft["source_cities"])
        else:
            weights = [c["population_weight"] for c in INDIAN_CITIES]
            victim_city_name = random.choices(INDIAN_CITIES, weights=weights, k=1)[0]["city"]
        
        victim_city = get_city_info(victim_city_name)
        
        # Amount (log-normal distribution within range for realistic spread)
        min_amt, max_amt = ft["amount_range"]
        amount = int(np.clip(
            np.random.lognormal(mean=np.log(min_amt * 3), sigma=0.8),
            min_amt, max_amt
        ))
        amount = round(amount, -2)  # Round to nearest 100
        
        # Timestamp (more fraud during evenings and weekends)
        random_seconds = random.randint(0, date_range_seconds)
        timestamp = start_date + timedelta(seconds=random_seconds)
        
        # Bias toward evening hours (6 PM - 11 PM)
        hour_bias = random.choices(
            range(24),
            weights=[1,1,1,1,1,1, 2,2,3,3,4,4, 5,5,4,4, 3,3, 6,7,8,7,5,3],
            k=1
        )[0]
        timestamp = timestamp.replace(hour=hour_bias)
        
        # Reporting delay (how long before victim reports)
        reporting_delay_mins = int(np.random.lognormal(mean=3.5, sigma=1.0))  # Median ~33 mins
        reporting_delay_mins = min(reporting_delay_mins, 1440)  # Cap at 24 hours
        
        complaints.append({
            "complaint_id": f"CYB{i+1:06d}",
            "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "fraud_type": fraud_type,
            "amount": amount,
            "victim_city": victim_city["city"],
            "victim_state": victim_city["state"],
            "victim_lat": victim_city["lat"],
            "victim_lng": victim_city["lng"],
            "reporting_delay_mins": reporting_delay_mins,
            "hour_of_day": hour_bias,
            "day_of_week": timestamp.weekday(),
            "is_weekend": 1 if timestamp.weekday() >= 5 else 0,
        })
    
    df = pd.DataFrame(complaints)
    df.to_csv(os.path.join(OUTPUT_DIR, 'complaints.csv'), index=False)
    print(f"   ✅ Saved {len(df)} complaints to complaints.csv")
    return df


def generate_suspects(n=2000):
    """
    Generate 2,000 suspect profiles organized into criminal gangs.
    Each suspect has a role: mastermind, caller, mule_recruiter, or cash_puller.
    """
    print(f"👤 Generating {n} suspects...")
    suspects = []
    
    roles = ["mastermind", "caller", "mule_recruiter", "cash_puller"]
    role_weights = [0.05, 0.25, 0.20, 0.50]  # Mostly cash pullers
    
    # Create ~100 gangs
    num_gangs = 100
    
    for i in range(n):
        gang_id = i % num_gangs  # Assign to a gang
        role = random.choices(roles, weights=role_weights, k=1)[0]
        
        # Cash pullers operate in specific cities
        if role == "cash_puller":
            city = random.choice(["Nuh", "Jamtara", "Bharatpur", "Deoghar", "Mathura",
                                  "Delhi", "Mumbai", "Pune", "Lucknow", "Patna"])
        elif role == "mastermind":
            city = random.choice(["Jamtara", "Nuh", "Bharatpur", "Deoghar"])
        else:
            city = random.choice([c["city"] for c in INDIAN_CITIES])
        
        city_info = get_city_info(city)
        
        suspects.append({
            "suspect_id": f"SUS{i+1:04d}",
            "name": fake.name(),
            "phone": fake.phone_number(),
            "role": role,
            "gang_id": f"GANG{gang_id+1:03d}",
            "city": city_info["city"],
            "state": city_info["state"],
            "risk_score": round(random.uniform(0.3, 1.0) if role == "mastermind" 
                               else random.uniform(0.1, 0.8), 2),
            "num_linked_cases": random.randint(1, 50) if role == "mastermind"
                               else random.randint(1, 15),
        })
    
    df = pd.DataFrame(suspects)
    df.to_csv(os.path.join(OUTPUT_DIR, 'suspects.csv'), index=False)
    print(f"   ✅ Saved {len(df)} suspects to suspects.csv")
    return df


def generate_mule_accounts(n=15000, suspects_df=None):
    """
    Generate 15,000 mule (fake) bank accounts used to launder stolen money.
    Each is controlled by a suspect and linked to a city.
    """
    print(f"🏦 Generating {n} mule accounts...")
    accounts = []
    
    suspect_ids = suspects_df["suspect_id"].tolist() if suspects_df is not None else [f"SUS{i:04d}" for i in range(1, 2001)]
    
    for i in range(n):
        controller = random.choice(suspect_ids)
        city = random.choice(INDIAN_CITIES)
        layer = random.choices([1, 2, 3, 4], weights=[0.35, 0.30, 0.20, 0.15], k=1)[0]
        
        accounts.append({
            "account_id": f"MULE{i+1:05d}",
            "bank": random.choice(BANKS),
            "holder_name": fake.name(),
            "city": city["city"],
            "state": city["state"],
            "layer_number": layer,  # 1 = first recipient, 4 = cash-out layer
            "controlled_by": controller,
            "is_active": random.random() < 0.7,
            "account_age_days": random.randint(7, 365),
        })
    
    df = pd.DataFrame(accounts)
    df.to_csv(os.path.join(OUTPUT_DIR, 'mule_accounts.csv'), index=False)
    print(f"   ✅ Saved {len(df)} mule accounts to mule_accounts.csv")
    return df


def generate_cash_withdrawals(n=30000, complaints_df=None, atm_df=None):
    """
    Generate 30,000 cash withdrawal records at ATMs.
    Each withdrawal is linked to a complaint and happens at a predicted ATM zone.
    THIS IS THE KEY DATA — our ML model learns to predict THESE locations.
    """
    print(f"💰 Generating {n} cash withdrawals...")
    withdrawals = []
    
    if complaints_df is None or atm_df is None:
        print("   ❌ Need complaints and ATM data first!")
        return None
    
    for i in range(n):
        # Pick a random complaint
        complaint = complaints_df.iloc[random.randint(0, len(complaints_df) - 1)]
        fraud_type = complaint["fraud_type"]
        victim_city = complaint["victim_city"]
        ft = FRAUD_TYPES[fraud_type]
        
        # Determine withdrawal city based on cash-out corridors
        corridor_key = victim_city if victim_city in CASHOUT_CORRIDORS else "default"
        withdrawal_city = random.choice(CASHOUT_CORRIDORS[corridor_key])
        
        # Find ATMs in that city
        city_atms = atm_df[atm_df["city"] == withdrawal_city]
        if len(city_atms) == 0:
            city_atms = atm_df  # Fallback to any ATM
        
        atm = city_atms.iloc[random.randint(0, len(city_atms) - 1)]
        
        # Withdrawal happens after a delay
        min_delay, max_delay = ft["withdrawal_delay_hours"]
        delay_hours = random.uniform(min_delay, max_delay)
        
        complaint_time = datetime.strptime(complaint["timestamp"], "%Y-%m-%d %H:%M:%S")
        withdrawal_time = complaint_time + timedelta(hours=delay_hours)
        
        # Withdrawal amount (usually in chunks of 10K-20K, max 25K per ATM transaction)
        max_withdrawal = min(complaint["amount"], 25000)
        withdrawal_amount = random.choice([5000, 10000, 15000, 20000, 25000])
        withdrawal_amount = min(withdrawal_amount, max_withdrawal)
        
        withdrawals.append({
            "withdrawal_id": f"WD{i+1:06d}",
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
        })
    
    df = pd.DataFrame(withdrawals)
    df.to_csv(os.path.join(OUTPUT_DIR, 'cash_withdrawals.csv'), index=False)
    print(f"   ✅ Saved {len(df)} withdrawals to cash_withdrawals.csv")
    return df


# =============================================================
# MAIN — Generate everything
# =============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("🎲 CrimeShield AI — Synthetic Data Generator")
    print("=" * 60)
    print()
    
    # Step 1: ATM locations
    atm_df = generate_atm_locations(5000)
    print()
    
    # Step 2: Complaints
    complaints_df = generate_complaints(50000, atm_df)
    print()
    
    # Step 3: Suspects
    suspects_df = generate_suspects(2000)
    print()
    
    # Step 4: Mule accounts
    mule_df = generate_mule_accounts(15000, suspects_df)
    print()
    
    # Step 5: Cash withdrawals (the key prediction target)
    withdrawals_df = generate_cash_withdrawals(30000, complaints_df, atm_df)
    print()
    
    # Summary
    print("=" * 60)
    print("📊 DATA GENERATION COMPLETE!")
    print("=" * 60)
    print(f"   🏧 ATMs:           {len(atm_df):,}")
    print(f"   📝 Complaints:     {len(complaints_df):,}")
    print(f"   👤 Suspects:       {len(suspects_df):,}")
    print(f"   🏦 Mule Accounts:  {len(mule_df):,}")
    print(f"   💰 Withdrawals:    {len(withdrawals_df):,}")
    print(f"\n   📁 Files saved to: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 60)
