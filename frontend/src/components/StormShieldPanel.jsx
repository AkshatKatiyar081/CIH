import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    ShieldAlert, Activity, Radio, Lock, Unlock, CloudRain, 
    AlertTriangle, Wifi, Zap, Send, CheckCircle
} from 'lucide-react';

export default function StormShieldPanel({ result, selectedVillage }) {
    const [weatherData, setWeatherData] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [droneSent, setDroneSent] = useState(false);
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Reset drone state when simulation stops
    useEffect(() => {
        if (!isSimulating) setDroneSent(false);
    }, [isSimulating]);

    // POLL LOGIC
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
            
            // FIX: Use Query Param instead of Path Param to handle slashes in tech name
            const techType = encodeURIComponent(result.terrain_breakdown.tech);
            const res = await axios.get(`http://127.0.0.1:8000/weather-resilience/${selectedVillage.id}?tech_type=${techType}&simulate=${simulate}`);
            const data = res.data;
            setWeatherData(data);

            const newLog = `[${data.timestamp}] SIGNAL: ${data.connectivity_score}% | ${data.condition.toUpperCase()}`;
            setLogs(prev => [newLog, ...prev].slice(0, 6)); 

        } catch(err) { console.error("Weather API Error", err); }
    };

    // --- RENDER ---
    
    if (!result) {
        return (
            <div className="glass-panel" style={{ borderRadius: '16px', padding: '24px', position: 'absolute', top: '100px', left: '24px', width: '380px', zIndex: 1000 }}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px', color:'#f59e0b', fontWeight:'700', fontSize:'16px', marginBottom:'10px'}}>
                    <ShieldAlert size={20}/> STORM SHIELD AI
                </div>
                <div style={{background:'rgba(239, 68, 68, 0.1)', color:'#fca5a5', padding:'12px', borderRadius:'8px', fontSize:'12px', textAlign:'center', border:'1px solid rgba(239, 68, 68, 0.2)'}}>
                    ⚠ Initialize Network in Phase 1 first.
                </div>
            </div>
        );
    }

    return (
        <div className="animate-slide-up" style={{ position: 'absolute', top: '100px', left: '24px', width: '380px', zIndex: 1000 }}>
           <div className="glass-panel" style={{ borderRadius: '16px', padding: '24px', background: weatherData?.is_sos_triggered ? 'rgba(69, 10, 10, 0.95)' : undefined, borderColor: weatherData?.is_sos_triggered ? '#ef4444' : undefined, transition: 'all 0.5s ease', boxShadow: weatherData?.is_sos_triggered ? '0 0 40px rgba(239, 68, 68, 0.4)' : undefined }}>
               
               {/* HEADER */}
               <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px'}}>
                   <div style={{display:'flex', alignItems:'center', gap:'10px', color: weatherData?.is_sos_triggered ? '#fca5a5' : '#f59e0b', fontWeight:'800', fontSize:'16px', letterSpacing:'0.5px'}}>
                      <ShieldAlert size={20}/> STORM SHIELD AI
                   </div>
                   
                   <button onClick={() => setIsSimulating(!isSimulating)} className="btn-hover" style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: isSimulating ? 'white' : 'rgba(255,255,255,0.1)', color: isSimulating ? 'black' : 'white', fontSize:'11px', fontWeight:'800', cursor: 'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                      <Activity size={12} className={isSimulating ? "animate-spin" : ""} />
                      {isSimulating ? "LIVE" : "TEST"}
                   </button>
               </div>

               {!weatherData ? (
                   <div style={{textAlign:'center', padding:'20px', color:'#a1a1aa', fontSize:'12px'}}>
                       <Activity className="animate-spin" style={{marginBottom:'10px'}}/>
                       <div>Connecting to Satellite Grid...</div>
                   </div>
               ) : (
                   <div className="animate-slide-up" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                       
                       {/* 1. STATUS GRID */}
                       <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
                           <div className="glass-panel" style={{padding:'12px', borderRadius:'12px', textAlign:'center', borderColor:'rgba(255,255,255,0.1)'}}>
                               <div style={{fontSize:'10px', opacity:0.6, fontWeight:'700', marginBottom:'4px'}}>CONDITION</div>
                               <div style={{fontSize:'13px', fontWeight:'700', color:'white', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}>
                                   <CloudRain size={14}/> {weatherData.condition}
                               </div>
                           </div>
                           <div className="glass-panel" style={{padding:'12px', borderRadius:'12px', textAlign:'center', borderColor:'rgba(255,255,255,0.1)'}}>
                               <div style={{fontSize:'10px', opacity:0.6, fontWeight:'700', marginBottom:'4px'}}>SEVERITY</div>
                               <div style={{fontSize:'18px', fontWeight:'800', color: weatherData.severity_score > 70 ? '#ef4444' : '#10b981'}}>
                                   {weatherData.severity_score}%
                               </div>
                           </div>
                       </div>

                       {/* 2. CONNECTIVITY / BANDWIDTH */}
                       <div className="glass-panel" style={{padding:'16px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.05)'}}>
                           <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                               <div style={{fontSize:'11px', fontWeight:'700', color:'#a1a1aa', textTransform:'uppercase', display:'flex', alignItems:'center', gap:'6px'}}>
                                   <Wifi size={14}/> Connectivity
                               </div>
                               <span style={{fontSize:'11px', color: weatherData.is_sos_triggered ? '#fca5a5' : '#10b981', fontWeight:'700'}}>
                                   {weatherData.connectivity_score}% STABLE
                               </span>
                           </div>
                           
                           {/* Progress Bar */}
                           <div style={{height:'6px', background:'rgba(255,255,255,0.1)', borderRadius:'3px', overflow:'hidden', marginBottom:'16px'}}>
                               <div style={{height:'100%', width:`${weatherData.connectivity_score}%`, background: weatherData.is_sos_triggered ? '#ef4444' : '#10b981', transition:'all 0.5s ease'}}></div>
                           </div>

                           {/* APPS LIST */}
                           <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                               <div>
                                   <div style={{fontSize:'10px', color:'#34d399', fontWeight:'800', marginBottom:'6px', display:'flex', alignItems:'center', gap:'4px'}}><Unlock size={10}/> PRIORITY</div>
                                   <div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>
                                       {weatherData.network_policy.allowed_apps.slice(0,3).map(app => (
                                           <span key={app} style={{fontSize:'9px', padding:'3px 6px', background:'rgba(16, 185, 129, 0.2)', color:'#6ee7b7', borderRadius:'4px'}}>{app}</span>
                                       ))}
                                   </div>
                               </div>
                               <div>
                                   <div style={{fontSize:'10px', color:'#f87171', fontWeight:'800', marginBottom:'6px', display:'flex', alignItems:'center', gap:'4px'}}><Lock size={10}/> THROTTLED</div>
                                   <div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>
                                       {weatherData.network_policy.blocked_apps.length > 0 ? 
                                           weatherData.network_policy.blocked_apps.slice(0,3).map(app => (
                                               <span key={app} style={{fontSize:'9px', padding:'3px 6px', background:'rgba(239, 68, 68, 0.2)', color:'#fca5a5', borderRadius:'4px', textDecoration:'line-through'}}>{app}</span>
                                           )) 
                                       : <span style={{fontSize:'9px', opacity:0.5}}>None</span>}
                                   </div>
                               </div>
                           </div>
                       </div>

                       {/* 3. TERMINAL LOGS */}
                       <div className="terminal-text" style={{background:'#09090b', padding:'12px', borderRadius:'12px', fontSize:'10px', color:'#10b981', height:'80px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)', lineHeight:'1.6', boxShadow:'inset 0 2px 10px rgba(0,0,0,0.5)'}}>
                           {logs.map((log, i) => <div key={i} style={{opacity: 1 - (i*0.15)}}>{`> ${log}`}</div>)}
                           <div ref={logsEndRef} />
                       </div>
                       
                       {/* 4. SOS ALERT & DRONE BUTTON */}
                       {weatherData.is_sos_triggered && (
                           <div className="animate-slide-up">
                               <div style={{padding:'12px', background:'linear-gradient(90deg, #b91c1c 0%, #ef4444 100%)', borderRadius:'8px', color:'white', textAlign:'center', fontWeight:'800', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:'0 4px 20px rgba(239, 68, 68, 0.5)', marginBottom:'10px', animation:'pulse-red 2s infinite'}}>
                                   <AlertTriangle size={16} fill="white"/> {weatherData.alert_message.toUpperCase()}
                               </div>
                               
                               <button 
                                   onClick={() => setDroneSent(true)} 
                                   disabled={droneSent}
                                   className="btn-hover"
                                   style={{
                                       width: '100%', padding: '12px', borderRadius: '8px', border: 'none', 
                                       background: droneSent ? '#059669' : '#3b82f6', 
                                       color: 'white', fontWeight: '800', fontSize:'12px', cursor: droneSent ? 'default' : 'pointer',
                                       display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                                   }}
                               >
                                   {droneSent ? <CheckCircle size={16}/> : <Send size={16}/>}
                                   {droneSent ? "DRONE DEPLOYED TO TOWER" : "DEPLOY MAINTENANCE DRONE"}
                               </button>
                           </div>
                       )}
                   </div>
               )}
           </div>
        </div>
    );
}