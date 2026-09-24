import requests
import pandas as pd
import json
import random
import os

print("Fetching REAL ATM locations from India via OpenStreetMap Overpass API...")

# Overpass API Query for ATMs in major Indian cities (bounding boxes roughly covering India)
# We limit to a few thousand to not overload the API
query = """
[out:json][timeout:25];
(
  node["amenity"="atm"](19.0, 72.8, 19.3, 73.0); // Mumbai
  node["amenity"="atm"](28.5, 77.1, 28.7, 77.3); // Delhi
  node["amenity"="atm"](12.9, 77.5, 13.1, 77.7); // Bangalore
  node["amenity"="atm"](17.3, 78.4, 17.5, 78.6); // Hyderabad
  node["amenity"="atm"](26.8, 75.7, 27.0, 75.9); // Jaipur
  node["amenity"="atm"](23.9, 86.7, 24.1, 86.9); // Jamtara (Hotspot)
  node["amenity"="atm"](28.0, 76.9, 28.2, 77.1); // Nuh (Hotspot)
);
out body limit 3000;
"""

url = "http://overpass-api.de/api/interpreter"
response = requests.post(url, data={'data': query})

if response.status_code == 200:
    data = response.json()
    atms = []
    
    for idx, node in enumerate(data.get('elements', [])):
        lat = node.get('lat')
        lon = node.get('lon')
        tags = node.get('tags', {})
        
        bank_name = tags.get('operator', tags.get('name', 'Unknown Bank'))
        
        # Approximate city based on lat/lon
        city = "Delhi"
        state = "Delhi"
        if 19.0 <= lat <= 19.3:
            city, state = "Mumbai", "Maharashtra"
        elif 12.9 <= lat <= 13.1:
            city, state = "Bangalore", "Karnataka"
        elif 17.3 <= lat <= 17.5:
            city, state = "Hyderabad", "Telangana"
        elif 26.8 <= lat <= 27.0:
            city, state = "Jaipur", "Rajasthan"
        elif 23.9 <= lat <= 24.1:
            city, state = "Jamtara", "Jharkhand"
        elif 28.0 <= lat <= 28.2:
            city, state = "Nuh", "Haryana"
            
        atms.append({
            "atm_id": f"ATM_IND_{node['id']}",
            "lat": lat,
            "lng": lon,
            "bank": bank_name,
            "city": city,
            "state": state,
            "area_type": random.choice(["URBAN", "URBAN", "SUBURBAN", "RURAL"]),
            "near_highway": random.choice([True, False, False]),
            "near_state_border": random.choice([True, False, False, False]),
            "near_bus_station": random.choice([True, False])
        })
        
    df = pd.DataFrame(atms)
    
    os.makedirs(r"C:\Users\gotam\OneDrive\Desktop\SIH\Project-Z\backend\app\data\datasets", exist_ok=True)
    file_path = r"C:\Users\gotam\OneDrive\Desktop\SIH\Project-Z\backend\app\data\datasets\atm_locations.csv"
    df.to_csv(file_path, index=False)
    print(f"✅ Successfully downloaded {len(df)} REAL ATMs and saved to {file_path}")
else:
    print("❌ Failed to fetch from Overpass API")
