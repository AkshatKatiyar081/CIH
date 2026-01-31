import random
from datetime import datetime, timedelta

def check_resilience(village_id, tech_type, simulate=False):
    # Base Conditions
    base_conditions = ["Clear Sky", "Light Breeze", "Partly Cloudy", "Sunny", "Mist"]
    
    if simulate:
        # DISASTER MODE
        condition = random.choice(["Severe Blizzard", "Flash Flood Warning", "Landslide Risk", "Heavy Hailstorm"])
        severity = random.randint(75, 98) 
        connectivity = random.randint(15, 40) 
        is_sos = True
        
        future_time = datetime.now() + timedelta(hours=random.randint(1, 3), minutes=random.randint(0, 59))
        impact_time = future_time.strftime("%H:%M")
        
        alert_msg = f"CRITICAL: {condition} approaching. Est. Impact: {impact_time}."
        
        policy = {
            "status": "SOS PROTOCOL: THROTTLED",
            "bandwidth_cap": 25,
            "allowed_apps": ["WhatsApp (Text)", "UPI Payments", "Emergency Calls", "Govt Alert Radio"],
            "blocked_apps": ["Netflix (4K)", "Instagram Reels", "YouTube", "Cloud Gaming"]
        }
    else:
        # NORMAL MODE
        condition = random.choice(base_conditions)
        severity = random.randint(5, 20) 
        connectivity = random.randint(88, 99) 
        is_sos = False
        alert_msg = "System Normal. Satellite link stable."
        
        policy = {
            "status": "STANDARD ACCESS",
            "bandwidth_cap": 100,
            "allowed_apps": ["All Services Active"],
            "blocked_apps": []
        }

    return {
        "is_sos_triggered": is_sos,
        "condition": condition,
        "severity_score": severity,
        "connectivity_score": connectivity,
        "network_policy": policy,
        "alert_message": alert_msg,
        "timestamp": datetime.now().strftime("%H:%M:%S")
    }