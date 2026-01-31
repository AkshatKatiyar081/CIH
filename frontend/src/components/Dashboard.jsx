import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, Polygon, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { 
  Wifi, PenTool, Globe, Anchor, 
  ShieldAlert, Activity, Radio, 
  TrendingUp, FileText, Plane, Mountain, Signal, 
  MapPin, RefreshCw, Cpu, Zap, AlertTriangle, CheckCircle, Info
} from 'lucide-react';

import StormShieldPanel from './StormShieldPanel';
import SelfHealingPanel from './SelfHealingPanel';

// --- ANIMATION STYLES (INJECTED) ---
const styles = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-green {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
  @keyframes pulse-red {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }
  .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .glass-panel {
    background: rgba(13, 13, 15, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
  .glass-panel:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }
  .btn-hover { transition: all 0.2s ease; }
  .btn-hover:hover { transform: translateY(-1px); filter: brightness(1.1); }
  .btn-hover:active { transform: translateY(1px); filter: brightness(0.95); }
  .terminal-text { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
  
  .status-dot {
    width: 8px; height: 8px; background: #10b981; border-radius: 50%;
    animation: pulse-green 2s infinite;
  }
  
  select { background-color: #09090b !important; color: white !important; }
  option { background-color: #09090b !important; color: white !important; }
`;

const VILLAGES = [
  { id: 'chitkul', name: 'Chitkul (Snow/Remote)', lat: 31.3526, lng: 78.4379, terrain: 'snow' },
  { id: 'kalpa', name: 'Kalpa (Rocky/Mountain)', lat: 31.5372, lng: 78.2562, terrain: 'rocky' },
  { id: 'langza', name: 'Langza (Valley/Flat)', lat: 32.2656, lng: 78.0643, terrain: 'valley' }
];

const getTerrainDesc = (type) => {
    switch(type) {
        case 'snow': return "Signal attenuation due to heavy snow requires L-Band Satellite Mesh (Non-LoS).";
        case 'rocky': return "High-altitude bedrock prevents trenching. Microwave Backhaul is optimal.";
        case 'valley': return "Flat variance allows efficient Optical Fiber (GPON) trenching.";
        default: return "Standard terrain configuration.";
    }
};

function MapController({ village }) {
  const map = useMap();
  useEffect(() => { map.flyTo([village.lat, village.lng], 15, { duration: 2.5, easeLinearity: 0.25 }); }, [village.id]);
  return null;
}

function DrawHandler({ mode, onMapClick }) {
  useMapEvents({ click(e) { if (mode !== 'view') onMapClick(e.latlng); } });
  return null;
}

export default function Dashboard() {
  const [activePhase, setActivePhase] = useState(1);
  const [selectedVillage, setSelectedVillage] = useState(VILLAGES[2]); 
  const [mode, setMode] = useState('view');
  
  const [polygons, setPolygons] = useState([]); 
  const [currentPoly, setCurrentPoly] = useState([]); 
  const [hospitals, setHospitals] = useState([]);
  const [result, setResult] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [deadNodeId, setDeadNodeId] = useState(null); 
  const [reroutedLinks, setReroutedLinks] = useState([]); 

  const handleMapClick = (latlng) => {
    if (mode === 'hospital') {
      setHospitals([...hospitals, { lat: latlng.lat, lng: latlng.lng }]);
      setMode('view');
    } 
    else if (mode === 'draw') {
      if (currentPoly.length > 2) {
        const start = currentPoly[0];
        const dist = Math.sqrt(Math.pow(latlng.lat - start.lat, 2) + Math.pow(latlng.lng - start.lng, 2));
        if (dist < 0.001) { 
            setPolygons([...polygons, currentPoly]);
            setCurrentPoly([]); 
            return; 
        }
      }
      setCurrentPoly([...currentPoly, { lat: latlng.lat, lng: latlng.lng }]);
    }
  };

  const calculatePlan = async () => {
    if (polygons.length === 0 && currentPoly.length === 0) return;
    setLoading(true);
    setDeadNodeId(null); 
    setReroutedLinks([]); 
    const finalPolygons = [...polygons];
    if (currentPoly.length > 2) finalPolygons.push(currentPoly);

    try {
      const res = await axios.post('http://127.0.0.1:8000/calculate-plan', { 
        polygons: finalPolygons, 
        critical_nodes: hospitals, 
        terrain_type: selectedVillage.terrain 
      });
      setTimeout(() => {
          setResult(res.data);
          setLoading(false);
      }, 800);
    } catch (err) { alert("Backend Offline!"); setLoading(false); }
  };

  const clearAll = () => {
    setPolygons([]); setCurrentPoly([]); setResult(null); setMode('view'); setHospitals([]); setDeadNodeId(null); setReroutedLinks([]);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#09090b', color: 'white', overflow: 'hidden', fontFamily: '"Inter", sans-serif' }}>
      <style>{styles}</style>
      
      {/* NAVBAR */}
      <nav style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '1000px', height: '60px', zIndex: 1000, borderRadius: '16px' }} className="glass-panel">
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 24px' }}>
             <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <img src="/logo.png" alt="VyomSetu" style={{ height: '50px', width: 'auto', objectFit: 'contain' }} />
                <div style={{fontSize:'16px', fontWeight:'700', letterSpacing:'-0.5px', lineHeight:'1'}}>VyomSetu <br/> <span style={{opacity:0.5, fontWeight:'400', fontSize:'11px'}}>GridOS</span></div>
             </div>
             <div style={{display:'flex', background:'rgba(255,255,255,0.05)', padding:'4px', borderRadius:'10px', gap:'4px'}}>
                {[ {id: 1, label: "Phase 1", icon: PenTool}, {id: 2, label: "Phase 2", icon: ShieldAlert}, {id: 3, label: "Phase 3", icon: TrendingUp} ].map(tab => {
                    const isActive = activePhase === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActivePhase(tab.id)} style={{ background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', border:'none', color: isActive ? 'white' : '#a1a1aa', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:'600', fontSize:'12px', transition: 'all 0.2s', display:'flex', alignItems:'center', gap:'6px' }}>
                            <tab.icon size={14} color={isActive ? (tab.id===2?'#f59e0b':tab.id===3?'#10b981':'#3b82f6') : '#71717a'}/> {tab.label}
                        </button>
                    )
                })}
             </div>
         </div>
      </nav>

      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <MapContainer center={[selectedVillage.lat, selectedVillage.lng]} zoom={15} style={{ width: '100%', height: '100%', background:'#050505' }} zoomControl={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='&copy; Esri' opacity={0.75} />
          <MapController village={selectedVillage} />
          <DrawHandler mode={mode} onMapClick={handleMapClick} />
          {polygons.map((poly, i) => <Polygon key={i} positions={poly} pathOptions={{ color: '#10b981', weight: 2, fillOpacity: 0.2, dashArray: '5,5' }} />)}
          {currentPoly.length > 0 && <Polyline positions={currentPoly} pathOptions={{ color: '#fbbf24', weight: 2, dashArray: '4, 4' }} />}
          {hospitals.map((h, i) => ( <CircleMarker key={`h-${i}`} center={[h.lat, h.lng]} radius={8} pathOptions={{ color: 'white', weight:2, fillColor: '#ef4444', fillOpacity: 1 }}> <Popup><strong>Anchor Node</strong></Popup> </CircleMarker> ))}
          
          {/* STANDARD LINKS (Faint) */}
          {result && result.links && result.links.map((link, i) => ( <Polyline key={`link-${i}`} positions={[link.from, link.to]} pathOptions={{ color: '#fbbf24', weight: 1, opacity: 0.2 }} /> ))}
          
          {/* REROUTE LINKS (Bold Orange) */}
          {reroutedLinks.map((link, i) => (
             <Polyline key={`reroute-${i}`} positions={[link.from, link.to]} pathOptions={{ color: '#f59e0b', weight: 4, dashArray: '8, 8', opacity: 1 }}>
                <Popup><strong>Emergency Backup Link</strong><br/>Rerouted Traffic</Popup>
             </Polyline>
          ))}

          {/* TOWERS WITH TOOLTIPS */}
          {result && result.towers.map((t, i) => {
             const isDead = t.id === deadNodeId;
             return (
                 <React.Fragment key={`t-${i}`}>
                    <CircleMarker center={[t.lat, t.lng]} radius={t.type==='master_hub' ? 60 : 30} pathOptions={{ color: isDead ? '#ef4444' : (t.type==='master_hub' ? '#3b82f6' : '#10b981'), weight: 1, fillOpacity: 0.1, dashArray: '4,4' }} />
                    <CircleMarker center={[t.lat, t.lng]} radius={5} pathOptions={{ color: 'white', weight:1, fillColor: isDead ? '#ef4444' : (t.type==='master_hub'?'#3b82f6':'#10b981'), fillOpacity: 1 }}>
                       <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={isDead}>
                           <span style={{fontWeight:'bold', fontSize:'11px'}}>{t.id}</span>
                       </Tooltip>
                       <Popup>
                           <div style={{fontSize:'12px'}}>
                               <strong>{t.id}</strong><br/>
                               Status: {isDead ? "OFFLINE" : "ACTIVE"}<br/>
                               Type: {t.type.toUpperCase()}
                           </div>
                       </Popup>
                    </CircleMarker>
                 </React.Fragment>
             )
          })}
        </MapContainer>

        {/* PHASE 1 */}
        {activePhase === 1 && (
            <div style={{ position: 'absolute', top: '100px', left: '24px', width: '360px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-slide-up">
              <div className="glass-panel" style={{ borderRadius: '16px', padding: '24px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#a1a1aa', letterSpacing:'1px', textTransform:'uppercase' }}>Target Sector</div>
                      <div style={{display:'flex', alignItems:'center', gap:'6px', background:'rgba(16, 185, 129, 0.1)', padding:'4px 8px', borderRadius:'12px', border:'1px solid rgba(16, 185, 129, 0.2)'}}><div className="status-dot"></div><span style={{fontSize:'10px', color:'#34d399', fontWeight:'700'}}>ONLINE</span></div>
                  </div>
                  <div style={{position:'relative', marginBottom:'20px'}}>
                      <MapPin size={16} color="#3b82f6" style={{position:'absolute', left:'14px', top:'14px', zIndex:10}}/>
                      <select onChange={(e) => { setSelectedVillage(VILLAGES.find(vil => vil.id === e.target.value)); clearAll(); }} style={{ width: '100%', padding: '14px 14px 14px 40px', background: '#09090b', color: 'white', border: '1px solid #27272a', borderRadius: '10px', fontSize:'13px', fontWeight:'500', outline:'none', cursor:'pointer', appearance:'none' }} value={selectedVillage.id}>
                          {VILLAGES.map(v => <option key={v.id} value={v.id} style={{background:'#09090b', color:'white'}}>{v.name}</option>)}
                      </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom:'24px' }}>
                    <button onClick={() => { setMode('draw'); setCurrentPoly([]); }} className="btn-hover" style={{ padding: '16px', borderRadius: '12px', border: mode === 'draw' ? '1px solid #3b82f6' : '1px solid #27272a', background: mode === 'draw' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)', color: mode === 'draw' ? '#60a5fa' : '#a1a1aa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap:'8px', cursor:'pointer' }}><PenTool size={20} /> <span style={{fontSize:'12px', fontWeight:'600'}}>Draw Zone</span></button>
                    <button onClick={() => setMode('hospital')} className="btn-hover" style={{ padding: '16px', borderRadius: '12px', border: mode === 'hospital' ? '1px solid #ef4444' : '1px solid #27272a', background: mode === 'hospital' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', color: mode === 'hospital' ? '#f87171' : '#a1a1aa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap:'8px', cursor:'pointer' }}><Anchor size={20} /> <span style={{fontSize:'12px', fontWeight:'600'}}>Set Anchor</span></button>
                  </div>
                  <button onClick={calculatePlan} disabled={loading} className="btn-hover" style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: loading ? '#27272a' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: loading ? '#71717a' : 'white', fontWeight: '700', fontSize:'13px', cursor: loading ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', letterSpacing:'0.5px' }}>{loading ? <Activity size={16} className="animate-spin"/> : <Cpu size={16}/>}{loading ? "CALCULATING..." : "INITIATE OPTIMIZATION"}</button>
              </div>
              {result && (
                  <div className="animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                          {[ { val: result.terrain_breakdown.radius, label: "RANGE (KM)", color: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" }, { val: result.kpis.area.toFixed(2), label: "AREA (KM²)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" }, { val: result.kpis.total_towers, label: "NODES", color: "#ffffff", border: "rgba(255, 255, 255, 0.1)" } ].map((stat, i) => ( <div key={i} className="glass-panel" style={{ padding:'12px', borderRadius:'12px', textAlign:'center', borderColor: stat.border }}><div style={{fontSize:'18px', fontWeight:'800', color: stat.color}}>{stat.val}</div><div style={{fontSize:'9px', color:'#a1a1aa', fontWeight:'700', marginTop:'4px'}}>{stat.label}</div></div> ))}
                      </div>
                      <div className="glass-panel" style={{ padding:'16px', borderRadius:'12px' }}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', paddingBottom:'12px', borderBottom:'1px solid rgba(255,255,255,0.05)'}}><div style={{display:'flex', alignItems:'center', gap:'8px'}}><Mountain size={14} color="#60a5fa"/> <span style={{fontSize:'13px', fontWeight:'600', textTransform:'capitalize'}}>{selectedVillage.terrain} Terrain Analysis</span></div></div>
                          <div style={{fontSize:'11px', color:'#94a3b8', lineHeight:'1.5', marginBottom:'12px', fontStyle:'italic'}}>"{getTerrainDesc(selectedVillage.terrain)}"</div>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><div style={{display:'flex', alignItems:'center', gap:'8px'}}><Signal size={14} color="#10b981"/> <span style={{fontSize:'13px', fontWeight:'600', color:'#10b981'}}>{result.terrain_breakdown.tech}</span></div><div style={{fontSize:'10px', padding:'2px 6px', borderRadius:'4px', background:'rgba(16, 185, 129, 0.1)', color:'#10b981', fontWeight:'700'}}>AUTO-SELECTED</div></div>
                      </div>
                      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.6) 0%, rgba(6, 95, 70, 0.4) 100%)', padding:'20px', borderRadius:'12px', borderColor:'rgba(16, 185, 129, 0.3)' }}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}><div><div style={{fontSize:'11px', color:'#6ee7b7', fontWeight:'700', letterSpacing:'0.5px'}}>TOTAL PROJECT BUDGET</div><div style={{fontSize:'10px', color:'#a7f3d0', opacity:0.7, marginTop:'2px'}}>Hardware + Deployment</div></div><div style={{fontSize:'22px', fontWeight:'800', color:'white'}}>₹{(result.kpis.capex / 100000).toFixed(2)} L</div></div>
                          <div style={{fontSize:'9px', color:'#6ee7b7', opacity:0.6, borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'8px', display:'flex', alignItems:'center', gap:'4px'}}><Info size={10}/><span>Formula: ({result.kpis.total_towers} Nodes × Unit Cost) + Base Infra</span></div>
                      </div>
                  </div>
              )}
            </div>
        )}

        {/* PHASE 2: STORMSHIELD */}
        {activePhase === 2 && (
            <StormShieldPanel result={result} selectedVillage={selectedVillage} />
        )}

        {/* PHASE 3: IMPACT */}
        {activePhase === 3 && (
            <div style={{ position: 'absolute', top: '100px', left: '24px', width: '380px', zIndex: 1000 }} className="animate-slide-up">
                <div className="glass-panel" style={{ borderRadius: '16px', padding: '24px' }}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', color:'#10b981', fontWeight:'700', fontSize:'16px', marginBottom:'20px'}}>
                        <TrendingUp size={20}/> IMPACT ANALYSIS
                    </div>
                    
                    {!result ? (
                        <div style={{color:'#fca5a5', fontSize:'12px', background:'rgba(239, 68, 68, 0.1)', padding:'12px', borderRadius:'8px', textAlign:'center'}}>⚠ Initialize Network in Phase 1 first.</div>
                    ) : (() => {
                        const vyomCost = result.kpis.capex || 0;
                        const standardCost = result.kpis.legacy_capex || (vyomCost * 1.65);
                        const savings = standardCost - vyomCost;
                        const ratio = standardCost > 0 ? (vyomCost / standardCost) * 100 : 0;

                        return (
                            <div className="animate-slide-up" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                                <div style={{background:'rgba(255,255,255,0.03)', padding:'20px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.05)'}}>
                                    <div style={{fontSize:'10px', color:'#a1a1aa', fontWeight:'700', marginBottom:'12px'}}>CAPEX COMPARISON</div>
                                    <div style={{display:'flex', alignItems:'flex-end', gap:'16px', marginBottom:'16px', height:'100px'}}>
                                        <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
                                            <div style={{height:'100%', background:'#3f3f46', borderRadius:'6px 6px 0 0', width:'100%', opacity:0.3}}></div>
                                            <div style={{fontSize:'10px', marginTop:'8px', textAlign:'center'}}>Standard</div>
                                            <div style={{fontSize:'11px', fontWeight:'700', textAlign:'center', marginTop:'2px'}}>₹{(standardCost/100000).toFixed(1)}L</div>
                                        </div>
                                        <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
                                            <div style={{height: `${ratio}%`, background:'#10b981', borderRadius:'6px 6px 0 0', width:'100%', boxShadow:'0 0 15px rgba(16, 185, 129, 0.3)', transition: 'height 1s ease'}}></div>
                                            <div style={{fontSize:'10px', marginTop:'8px', textAlign:'center', color:'#10b981', fontWeight:'700'}}>VyomSetu</div>
                                            <div style={{fontSize:'11px', fontWeight:'700', textAlign:'center', marginTop:'2px', color:'#10b981'}}>₹{(vyomCost/100000).toFixed(1)}L</div>
                                        </div>
                                    </div>
                                    <div style={{padding:'10px', background:'rgba(16, 185, 129, 0.1)', borderRadius:'8px', color:'#34d399', fontSize:'12px', textAlign:'center', fontWeight:'700'}}>
                                        TOTAL SAVINGS: ₹{(savings/100000).toFixed(1)} Lakhs ({((savings/standardCost)*100).toFixed(0)}%)
                                    </div>
                                </div>

                                {/* SELF HEALING PANEL */}
                                <SelfHealingPanel 
                                    result={result} 
                                    onKillNode={(id) => setDeadNodeId(id)} 
                                    onReroute={(links) => setReroutedLinks(links)} 
                                />

                                <div style={{background:'rgba(255,255,255,0.03)', padding:'16px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.05)'}}>
                                    <div style={{fontSize:'11px', fontWeight:'700', color:'#a1a1aa', marginBottom:'12px', textTransform:'uppercase', display:'flex', alignItems:'center', gap:'6px'}}><Plane size={14}/> Drone Logistics</div>
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'8px', opacity:0.8}}><span>Avg. Road Delivery</span><span style={{color:'#f87171', fontWeight:'700'}}>4 Hours</span></div>
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px', fontWeight:'700'}}><span>VyomSetu Drone Path</span><span style={{color:'#34d399'}}>14 Mins</span></div>
                                </div>

                                <button onClick={() => alert("Proposal Generated!")} className="btn-hover" style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#059669', color: 'white', fontWeight: '700', fontSize:'13px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow: '0 4px 15px rgba(5, 150, 105, 0.4)' }}>
                                    <FileText size={16}/> EXPORT GOVERNMENT DPR
                                </button>
                            </div>
                        );
                    })()}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

// 4. src/StormShieldPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    ShieldAlert, Activity, Radio, Lock, Unlock, CloudRain, 
    AlertTriangle, Wifi, Zap, Send 
} from 'lucide-react';

export default function StormShieldPanel({ result, selectedVillage }) {
    const [weatherData, setWeatherData] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    useEffect(() => {
        let interval;
        if (result) {
            checkStormShield(isSimulating);
            interval = setInterval(() => {
                checkStormShield(isSimulating);
            }, isSimulating ? 2000 : 5000);
        }
        return () => clearInterval(interval);
    }, [isSimulating, result, selectedVillage]);

    const checkStormShield = async (simulate) => {
        try {
            if (!result || !result.terrain_breakdown) return;
            const techType = encodeURIComponent(result.terrain_breakdown.tech);
            // FIXED QUERY PARAMETER CALL
            const res = await axios.get(`http://127.0.0.1:8000/weather-resilience/${selectedVillage.id}?tech_type=${techType}&simulate=${simulate}`);
            
            const data = res.data;
            setWeatherData(data);
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });
            const newLog = `[${time}] SIGNAL: ${data.connectivity_score}% | ${data.condition.toUpperCase()}`;
            setLogs(prev => [newLog, ...prev].slice(0, 6)); 
        } catch(err) { console.error("Weather API Error", err); }
    };

    if (!result) return null; // Logic handled in parent

    return (
        <div className="animate-slide-up" style={{ position: 'absolute', top: '100px', left: '24px', width: '380px', zIndex: 1000 }}>
           <div className="glass-panel" style={{ borderRadius: '16px', padding: '24px', background: weatherData?.is_sos_triggered ? 'rgba(69, 10, 10, 0.95)' : undefined, borderColor: weatherData?.is_sos_triggered ? '#ef4444' : undefined, transition: 'all 0.5s ease', boxShadow: weatherData?.is_sos_triggered ? '0 0 40px rgba(239, 68, 68, 0.4)' : undefined }}>
               <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px'}}>
                   <div style={{display:'flex', alignItems:'center', gap:'10px', color: weatherData?.is_sos_triggered ? '#fca5a5' : '#f59e0b', fontWeight:'800', fontSize:'16px', letterSpacing:'0.5px'}}>
                      <ShieldAlert size={20}/> STORM SHIELD AI
                   </div>
                   <button onClick={() => setIsSimulating(!isSimulating)} className="btn-hover" style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: isSimulating ? 'white' : 'rgba(255,255,255,0.1)', color: isSimulating ? 'black' : 'white', fontSize:'11px', fontWeight:'800', cursor: 'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                      <Activity size={12} className={isSimulating ? "animate-spin" : ""} /> {isSimulating ? "LIVE" : "TEST"}
                   </button>
               </div>
               {!weatherData ? (
                   <div style={{textAlign:'center', padding:'20px', color:'#a1a1aa', fontSize:'12px'}}><Activity className="animate-spin" style={{marginBottom:'10px'}}/><div>Connecting...</div></div>
               ) : (
                   <div className="animate-slide-up" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                       <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
                           <div className="glass-panel" style={{padding:'12px', borderRadius:'12px', textAlign:'center', borderColor:'rgba(255,255,255,0.1)'}}><div style={{fontSize:'10px', opacity:0.6, fontWeight:'700', marginBottom:'4px'}}>CONDITION</div><div style={{fontSize:'13px', fontWeight:'700', color:'white', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}><CloudRain size={14}/> {weatherData.condition}</div></div>
                           <div className="glass-panel" style={{padding:'12px', borderRadius:'12px', textAlign:'center', borderColor:'rgba(255,255,255,0.1)'}}><div style={{fontSize:'10px', opacity:0.6, fontWeight:'700', marginBottom:'4px'}}>SEVERITY</div><div style={{fontSize:'18px', fontWeight:'800', color: weatherData.severity_score > 70 ? '#ef4444' : '#10b981'}}>{weatherData.severity_score}%</div></div>
                       </div>
                       <div className="glass-panel" style={{padding:'16px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.05)'}}>
                           <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}><div style={{fontSize:'11px', fontWeight:'700', color:'#a1a1aa', textTransform:'uppercase', display:'flex', alignItems:'center', gap:'6px'}}><Wifi size={14}/> Connectivity</div><span style={{fontSize:'11px', color: weatherData.is_sos_triggered ? '#fca5a5' : '#10b981', fontWeight:'700'}}>{weatherData.connectivity_score}% STABLE</span></div>
                           <div style={{height:'6px', background:'rgba(255,255,255,0.1)', borderRadius:'3px', overflow:'hidden', marginBottom:'16px'}}><div style={{height:'100%', width:`${weatherData.connectivity_score}%`, background: weatherData.is_sos_triggered ? '#ef4444' : '#10b981', transition:'all 0.5s ease'}}></div></div>
                           <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                               <div><div style={{fontSize:'10px', color:'#34d399', fontWeight:'800', marginBottom:'6px', display:'flex', alignItems:'center', gap:'4px'}}><Unlock size={10}/> PRIORITY</div><div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>{weatherData.network_policy.allowed_apps.slice(0,3).map(app => <span key={app} style={{fontSize:'9px', padding:'3px 6px', background:'rgba(16, 185, 129, 0.2)', color:'#6ee7b7', borderRadius:'4px'}}>{app}</span>)}</div></div>
                               <div><div style={{fontSize:'10px', color:'#f87171', fontWeight:'800', marginBottom:'6px', display:'flex', alignItems:'center', gap:'4px'}}><Lock size={10}/> THROTTLED</div><div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>{weatherData.network_policy.blocked_apps.length > 0 ? weatherData.network_policy.blocked_apps.slice(0,3).map(app => <span key={app} style={{fontSize:'9px', padding:'3px 6px', background:'rgba(239, 68, 68, 0.2)', color:'#fca5a5', borderRadius:'4px', textDecoration:'line-through'}}>{app}</span>) : <span style={{fontSize:'9px', opacity:0.5}}>None</span>}</div></div>
                           </div>
                       </div>
                       <div className="terminal-text" style={{background:'#09090b', padding:'12px', borderRadius:'12px', fontSize:'10px', color:'#10b981', height:'80px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)', lineHeight:'1.6', boxShadow:'inset 0 2px 10px rgba(0,0,0,0.5)'}}>{logs.map((log, i) => <div key={i} style={{opacity: 1 - (i*0.15)}}>{`> ${log}`}</div>)}<div ref={logsEndRef} /></div>
                       {weatherData.is_sos_triggered && (
                           <div className="animate-slide-up">
                               <div style={{padding:'12px', background:'linear-gradient(90deg, #b91c1c 0%, #ef4444 100%)', borderRadius:'8px', color:'white', textAlign:'center', fontWeight:'800', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:'0 4px 20px rgba(239, 68, 68, 0.5)', marginBottom:'10px', animation:'pulse-red 2s infinite'}}><AlertTriangle size={16} fill="white"/> {weatherData.alert_message.toUpperCase()}</div>
                           </div>
                       )}
                   </div>
               )}
           </div>
        </div>
    );
}

// 5. src/SelfHealingPanel.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { TrendingUp, Activity, AlertOctagon, ShieldCheck } from 'lucide-react';

export default function SelfHealingPanel({ result, onKillNode, onReroute }) {
    const [selectedNode, setSelectedNode] = useState("");
    const [healingStatus, setHealingStatus] = useState("IDLE");
    const [logs, setLogs] = useState([]);

    const handleKill = async () => {
        if (!selectedNode) return;
        setHealingStatus("HEALING");
        onKillNode(selectedNode); 
        try {
            const res = await axios.post('http://127.0.0.1:8000/reroute-network', {
                towers: result.towers,
                dead_node_id: selectedNode
            });
            setTimeout(() => {
                setHealingStatus("HEALED");
                setLogs(prev => [`NODE ${selectedNode} FAILED`, `REROUTING MESH...`, `PATH RESTORED VIA NEIGHBORS`, ...prev]);
                if (res.data.new_links && onReroute) onReroute(res.data.new_links);
            }, 1500);
        } catch (err) { console.error(err); setHealingStatus("ERROR"); }
    };

    return (
        <div style={{background:'rgba(255,255,255,0.03)', padding:'20px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.05)', marginBottom:'16px'}}>
            <div style={{fontSize:'10px', color:'#a1a1aa', fontWeight:'700', marginBottom:'16px', display:'flex', alignItems:'center', gap:'6px'}}><ShieldCheck size={14}/> SELF HEALING GRID</div>
            <div style={{background:'rgba(239, 68, 68, 0.1)', padding:'16px', borderRadius:'12px', border:'1px solid rgba(239, 68, 68, 0.2)', marginBottom:'12px'}}>
                <div style={{fontSize:'11px', fontWeight:'700', color:'#fca5a5', marginBottom:'12px', textTransform:'uppercase', display:'flex', alignItems:'center', gap:'6px'}}><AlertOctagon size={14}/> SIMULATE FAILURE</div>
                <div style={{display:'flex', gap:'8px'}}>
                    <select onChange={(e) => { setSelectedNode(e.target.value); setHealingStatus("IDLE"); }} style={{flex:1, padding:'10px', background:'#09090b', border:'1px solid #27272a', borderRadius:'8px', color:'white', fontSize:'12px'}}>
                        <option value="">Select Node...</option>
                        {result.towers.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
                    </select>
                    <button onClick={handleKill} disabled={!selectedNode || healingStatus === "HEALING"} style={{padding:'10px 16px', background:'#ef4444', border:'none', borderRadius:'8px', color:'white', fontWeight:'700', fontSize:'11px', cursor:'pointer'}}>
                        {healingStatus === "HEALING" ? "..." : "KILL"}
                    </button>
                </div>
            </div>
            {healingStatus !== "IDLE" && (
                <div className="terminal-text" style={{background:'#050505', padding:'12px', borderRadius:'8px', fontSize:'10px', color: healingStatus==="HEALED"?'#34d399':'#fca5a5', border:'1px solid rgba(255,255,255,0.1)'}}>
                    {healingStatus === "HEALING" ? <div style={{display:'flex', alignItems:'center', gap:'8px'}}><Activity size={12} className="animate-spin"/> DETECTING FAILURE...</div> : logs.map((l, i) => <div key={i}>{`> ${l}`}</div>)}
                </div>
            )}
        </div>
    );
}