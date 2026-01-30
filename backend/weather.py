from pydantic import BaseModel
import random
from datetime import datetime

class NetworkPolicy(BaseModel):
    status: str
    bandwidth_cap: int
    allowed_apps: list
    blocked_apps: list
    priority_msg: str

class WeatherResponse(BaseModel):
    village_id: str
    condition: str
    temp: str
    severity_score: int
    is_sos_triggered: bool
    resilience_score: int
    alert_message: str
    network_policy: NetworkPolicy
    timestamp: str 

SCENARIOS = {
    "chitkul": {"real": {"cond": "Clear", "sev": 10}, "sim": {"cond": "Blizzard", "sev": 90}},
    "kalpa":   {"real": {"cond": "Cloudy", "sev": 30}, "sim": {"cond": "High Winds", "sev": 75}},
    "langza":  {"real": {"cond": "Sunny", "sev": 0},  "sim": {"cond": "Storm", "sev": 60}}
}

def get_qos_policy(severity: int) -> NetworkPolicy:
    if severity < 40:
        return NetworkPolicy(
            status="OPTIMAL",
            bandwidth_cap=100,
            allowed_apps=["Voice", "4K Video", "Social Media", "Gaming", "YouTube", "Netflix", "Streaming"],
            blocked_apps=[],
            priority_msg="✅ Standard Routing Active. All services available."
        )
    elif severity < 70:
        return NetworkPolicy(
            status="THROTTLED",
            bandwidth_cap=50,
            allowed_apps=["Voice", "WhatsApp", "Email", "Web Browsing", "Maps"],
            blocked_apps=["Netflix", "Gaming", "YouTube", "Video Streaming", "Downloads"],
            priority_msg="⚠️ High Latency detected. Entertainment services throttled. Essential services prioritized."
        )
    else:
        return NetworkPolicy(
            status="CRITICAL / SOS",
            bandwidth_cap=10,
            allowed_apps=["Emergency Calls", "SOS Calls", "Medical Data", "Hospital Updates", "Govt Alerts", "Ambulance GPS"],
            blocked_apps=["ALL ENTERTAINMENT", "Netflix", "YouTube", "Gaming", "Social Media", "Video Streaming", "Music Streaming"],
            priority_msg="🚨 LIFE-LINE PROTOCOL ACTIVE. Bandwidth locked for emergencies only. Entertainment services BLOCKED."
        )

def check_resilience(village_id: str, tech_type: str, simulate: bool = False) -> WeatherResponse:
    mode_key = "sim" if simulate else "real"
    base = SCENARIOS.get(village_id, SCENARIOS["chitkul"])[mode_key]
    
    # VOLATILITY FIX: Make it jump around more during simulation
    if simulate:
        # In test mode: create extreme weather conditions
        jitter = random.randint(-15, 35) # More upward bias for chaos
        severity = min(100, max(50, base["sev"] + jitter))  # Min 50% in test mode
        
        # Randomly flip condition text for drama
        if base["cond"] == "Blizzard":
            conditions = ["Heavy Snow", "Whiteout", "Blizzard", "Gale Winds", "Avalanche Alert"]
        elif base["cond"] == "High Winds":
            conditions = ["Severe Gales", "Storm Surge", "Tornado Warning", "High Winds"]
        else:
            conditions = ["Storm", "Severe Storm", "Lightning Storm", "Hailstorm"]
        curr_cond = random.choice(conditions)
    else:
        severity = base["sev"]
        curr_cond = base["cond"]

    # Tech Resilience Logic - More severe in test mode
    resilience = 100
    if "Satellite" in tech_type:
        resilience = 95 if severity > 80 else 100
    elif "Microwave" in tech_type:
        resilience = max(0, 100 - (severity * 1.5)) if simulate else max(0, 100 - (severity * 1.2))
    elif "Fiber" in tech_type:
        resilience = 100 if severity < 85 else (20 if simulate else 40)
    elif "Macro" in tech_type or "Small" in tech_type:
        resilience = max(10, 100 - (severity * 1.3)) if simulate else 100

    sos = severity > 75 or resilience < 50
    policy = get_qos_policy(severity)
    
    alert = "All Systems Nominal"
    if severity >= 60:
        alert = f"⚠️ WARNING: {curr_cond} approaching network limits."
    if sos:
        alert = f"🚨 CRITICAL: {curr_cond} exceeding safety limits. Emergency protocol activated."

    return WeatherResponse(
        village_id=village_id,
        condition=curr_cond,
        temp=f"{random.randint(-20, -10)}°C" if village_id=="chitkul" and simulate else (f"{random.randint(-15, -5)}°C" if village_id=="chitkul" else "12°C"),
        severity_score=severity,
        is_sos_triggered=sos,
        resilience_score=int(resilience),
        alert_message=alert,
        network_policy=policy,
        timestamp=datetime.now().strftime("%H:%M:%S")
    )