from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import math
import random
import weather 

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# --- DATA MODELS ---
class Point(BaseModel):
    lat: float
    lng: float

class PlanningRequest(BaseModel):
    polygons: List[List[Point]] 
    critical_nodes: List[Point]
    terrain_type: str = "valley" 

# --- CONFIG: TECH MATRIX WITH LEGACY COMPARISON ---
# --- CONFIG: TECH MATRIX (MARKET-ACCURATE TCO) ---
# Costs in INR (₹). Represents CAPEX + 1 Year Critical Maintenance/License.
TECH_MATRIX = {
    "valley": {
        "tech": "Optical Fiber (GPON)",   
        "range": 0.8,  
        "cost": 350000,       # ₹3.5L: Aerial Fiber Rollout (Pole-to-Pole) in rural flats.
        "legacy_tech": "Standard Macro Tower",
        "legacy_cost": 2500000 # ₹25L: Cost of 40m GBT Tower + Civil Work + Diesel GenSet.
    }, 
    "snow": {
        "tech": "L-Band Satellite Mesh",      
        "range": 2.0,  
        "cost": 1250000,      # ₹12.5L: VSAT Terminal + 5-Year High-Bandwidth Emergency Plan.
        "legacy_tech": "Deep-Earth Fiber Trenching",
        "legacy_cost": 8500000 # ₹85L: Specialized excavation in permafrost/avalanche zones.
    },
    "rocky": {
        "tech": "Microwave Backhaul",         
        "range": 1.5,  
        "cost": 650000,       # ₹6.5L: E-Band P2P Radios + Spectrum License Fees.
        "legacy_tech": "Bedrock Cabling",
        "legacy_cost": 4500000 # ₹45L: Diamond drilling through hard rock for cabling.
    }
}

# Fallback for undefined terrains
DEFAULT_TECH = {
    "tech": "Standard Tower", 
    "range": 5.0, 
    "cost": 2500000, 
    "legacy_cost": 3000000 
}
# Fallback for undefined terrains
DEFAULT_TECH = {"tech": "Standard Tower", "range": 5.0, "cost": 50000, "legacy_tech": "Legacy Grid", "legacy_cost": 80000}

# --- GEOMETRY HELPERS ---
def get_dist_km(lat1, lng1, lat2, lng2):
    R = 6371.0 
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_centroid(poly):
    if not poly or len(poly) < 3: return None
    lat = sum(p.lat for p in poly) / len(poly)
    lng = sum(p.lng for p in poly) / len(poly)
    return {"lat": lat, "lng": lng}

def is_inside(lat, lng, poly):
    if len(poly) < 3: return False
    n = len(poly)
    inside = False
    p1x, p1y = poly[0].lat, poly[0].lng
    for i in range(n + 1):
        p2x, p2y = poly[i % n].lat, poly[i % n].lng
        if lng > min(p1y, p2y):
            if lng <= max(p1y, p2y):
                if lat <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (lng - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or lat <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

# --- SIMULATION LOGIC ---
class SimNode:
    def __init__(self, lat, lng, is_critical=False, name="Area Point"):
        self.lat = lat
        self.lng = lng
        self.is_critical = is_critical
        self.name = name
        self.covered = False

def generate_grid(polygons, critical_nodes):
    nodes = []
    for i, c in enumerate(critical_nodes):
        nodes.append(SimNode(c.lat, c.lng, is_critical=True, name=f"Critical #{i+1}"))
    
    for poly in polygons:
        if len(poly) > 2:
            lats = [p.lat for p in poly]
            lngs = [p.lng for p in poly]
            step = 0.0008 
            curr_lat = min(lats)
            while curr_lat < max(lats):
                curr_lng = min(lngs)
                while curr_lng < max(lngs):
                    if is_inside(curr_lat, curr_lng, poly):
                        nodes.append(SimNode(curr_lat, curr_lng, is_critical=False))
                    curr_lng += step
                curr_lat += step
    return nodes

def optimize_network(nodes, polygons, terrain_type):
    towers = []
    logs = []
    specs = TECH_MATRIX.get(terrain_type, DEFAULT_TECH)
    radius = specs["range"]
    
    logs.append(f"INIT: Radius Limit: {radius}km | Tech: {specs['tech']}")

    criticals = [n for n in nodes if n.is_critical]
    tower_id = 1
    
    for crit in criticals:
        target_center = None
        min_dist = float('inf')
        
        if polygons:
            for poly in polygons:
                cent = get_centroid(poly)
                if cent:
                    d = get_dist_km(crit.lat, crit.lng, cent["lat"], cent["lng"])
                    if d < min_dist:
                        min_dist = d
                        target_center = cent
        
        final_lat, final_lng = crit.lat, crit.lng
        
        if target_center:
            if min_dist <= (radius * 0.95):
                final_lat = target_center["lat"]
                final_lng = target_center["lng"]
                logs.append(f"OPTIMAL: Anchor covered by Central Tower.")
            else:
                ratio = (radius * 0.95) / min_dist
                final_lat = crit.lat + (target_center["lat"] - crit.lat) * ratio
                final_lng = crit.lng + (target_center["lng"] - crit.lng) * ratio
                logs.append(f"STRETCH: Anchor far. Tower placed at edge ({radius}km).")

        is_duplicate = any(get_dist_km(t["lat"], t["lng"], final_lat, final_lng) < 0.05 for t in towers)
        
        if not is_duplicate:
            towers.append({
                "id": f"TWR-{tower_id:02d}",
                "lat": final_lat, "lng": final_lng,
                "type": "master_hub", 
                "range": radius,
                "cost": specs["cost"],
                "tech": specs["tech"]
            })
            tower_id += 1
        
        for n in nodes:
            if get_dist_km(final_lat, final_lng, n.lat, n.lng) <= radius:
                n.covered = True

    while True:
        uncovered = [n for n in nodes if not n.is_critical and not n.covered]
        total_area_nodes = len([n for n in nodes if not n.is_critical])
        
        if total_area_nodes > 0 and (len(uncovered) / total_area_nodes) < 0.05: break
        if not uncovered: break
        
        candidates = uncovered
        if len(candidates) > 50: candidates = random.sample(candidates, 50)
        
        best_cand = None
        max_gain = -1
        
        for cand in candidates:
            gain = 0
            for n in uncovered:
                if get_dist_km(cand.lat, cand.lng, n.lat, n.lng) <= radius:
                    gain += 1
            if gain > max_gain:
                max_gain = gain
                best_cand = cand
        
        if best_cand and max_gain > 0:
            towers.append({
                "id": f"TWR-{tower_id:02d}",
                "lat": best_cand.lat, "lng": best_cand.lng,
                "type": "standard_tower",
                "range": radius,
                "cost": specs["cost"],
                "tech": specs["tech"]
            })
            tower_id += 1
            logs.append(f"FILL: Added tower covering {max_gain} nodes.")
            
            for n in nodes:
                if get_dist_km(best_cand.lat, best_cand.lng, n.lat, n.lng) <= radius:
                    n.covered = True
        else:
            break

    return towers, logs, nodes

@app.post("/calculate-plan")
async def calculate_plan(data: PlanningRequest):
    nodes = generate_grid(data.polygons, data.critical_nodes)
    towers, logs, processed_nodes = optimize_network(nodes, data.polygons, data.terrain_type)
    
    links = []
    critical_analysis = []
    
    for n in processed_nodes:
        if n.is_critical:
            closest = None
            min_d = float('inf')
            for t in towers:
                d = get_dist_km(t["lat"], t["lng"], n.lat, n.lng)
                if d <= (t["range"] * 1.05):
                    if d < min_d:
                        min_d = d
                        closest = t
            
            if closest:
                links.append({"from": [n.lat, n.lng], "to": [closest["lat"], closest["lng"]]})
                critical_analysis.append({ "name": n.name, "status": "Connected", "dist": f"{min_d:.2f}km" })
            else:
                critical_analysis.append({ "name": n.name, "status": "Offline", "dist": "N/A" })

    # --- COST CALCULATION ---
    specs = TECH_MATRIX.get(data.terrain_type, DEFAULT_TECH)
    
    total_cost = sum(t["cost"] for t in towers)
    # Legacy cost is calculated for the same number of towers, but using the expensive legacy tech
    legacy_total_cost = len(towers) * specs["legacy_cost"]
    
    area = len([n for n in processed_nodes if not n.is_critical]) * 0.008 

    return {
        "kpis": { 
            "total_towers": len(towers), 
            "capex": total_cost, 
            "legacy_capex": legacy_total_cost, # NEW FIELD
            "area": round(area, 2) 
        },
        "metrics": { "cost": total_cost, "count": len(towers), "area": round(area, 2), "tech": towers[0]["tech"] if towers else "N/A" },
        "critical_analysis": critical_analysis,
        "terrain_breakdown": { "tech": towers[0]["tech"] if towers else "N/A", "radius": towers[0]["range"] if towers else 0 },
        "links": links,
        "logs": logs,
        "towers": towers
    }

@app.get("/weather-resilience/{village_id}")
async def get_weather_resilience(village_id: str, tech_type: str, simulate: bool = False):
    return weather.check_resilience(village_id, tech_type, simulate)

# --- PHASE 3: REROUTE LOGIC ---
class RerouteRequest(BaseModel):
    towers: List[dict]
    dead_node_id: str

@app.post("/reroute-network")
async def reroute_network(data: RerouteRequest):
    dead_node = next((t for t in data.towers if t["id"] == data.dead_node_id), None)
    if not dead_node: return {"error": "Node not found"}
    
    active_towers = [t for t in data.towers if t["id"] != data.dead_node_id]
    new_links = []
    
    if active_towers:
        nearest_neighbor = min(active_towers, key=lambda t: get_dist_km(t["lat"], t["lng"], dead_node["lat"], dead_node["lng"]))
        new_links.append({
            "from": [nearest_neighbor["lat"], nearest_neighbor["lng"]], 
            "to": [dead_node["lat"], dead_node["lng"]]
        })
        
    return {
        "status": "REROUTED",
        "new_links": new_links
    }