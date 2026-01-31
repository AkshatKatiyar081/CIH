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
                if (res.data.new_links && onReroute) {
                    onReroute(res.data.new_links);
                }
            }, 1500);
            
        } catch (err) { 
            console.error(err);
            setHealingStatus("ERROR"); 
        }
    };

    // --- REALISTIC COST LOGIC ---
    const vyomCost = result.kpis.capex;
    // Use the backend's TCO calculation (legacy_capex) which compares Fiber vs Towers
    // Fallback to 1.65x only if legacy_capex is missing (legacy support)
    const standardCost = result.kpis.legacy_capex || (vyomCost * 1.65);
    const savings = standardCost - vyomCost;

    return (
        <div className="animate-slide-up" style={{ position: 'absolute', top: '100px', left: '24px', width: '380px', zIndex: 1000 }}>
            <div className="glass-panel" style={{ borderRadius: '16px', padding: '24px' }}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', color:'#10b981', fontWeight:'700', fontSize:'16px', marginBottom:'20px'}}>
                    <ShieldCheck size={20}/> SELF-HEALING MESH
                </div>

                {!result ? (
                    <div style={{color:'#fca5a5', fontSize:'12px', background:'rgba(239, 68, 68, 0.1)', padding:'12px', borderRadius:'8px', textAlign:'center'}}>⚠ Initialize Network in Phase 1 first.</div>
                ) : (
                    <div className="animate-slide-up" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                        
                        {/* KILL NODE */}
                        <div style={{background:'rgba(239, 68, 68, 0.1)', padding:'16px', borderRadius:'12px', border:'1px solid rgba(239, 68, 68, 0.2)'}}>
                            <div style={{fontSize:'11px', fontWeight:'700', color:'#fca5a5', marginBottom:'12px', textTransform:'uppercase', display:'flex', alignItems:'center', gap:'6px'}}>
                                <AlertOctagon size={14}/> SIMULATE FAILURE
                            </div>
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

                        {/* LOGS */}
                        {healingStatus !== "IDLE" && (
                            <div className="terminal-text" style={{background:'#050505', padding:'12px', borderRadius:'8px', fontSize:'10px', color: healingStatus==="HEALED"?'#34d399':'#fca5a5', border:'1px solid rgba(255,255,255,0.1)'}}>
                                {healingStatus === "HEALING" ? <div style={{display:'flex', alignItems:'center', gap:'8px'}}><Activity size={12} className="animate-spin"/> DETECTING FAILURE...</div> : logs.map((l, i) => <div key={i}>{`> ${l}`}</div>)}
                            </div>
                        )}

                        {/* COST IMPACT */}
                        <div style={{background:'rgba(255,255,255,0.03)', padding:'20px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.05)'}}>
                            <div style={{fontSize:'10px', color:'#a1a1aa', fontWeight:'700', marginBottom:'16px', display:'flex', alignItems:'center', gap:'6px'}}><TrendingUp size={14}/> ECONOMIC IMPACT</div>
                            <div style={{marginBottom:'16px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', marginBottom:'4px', color:'#a1a1aa'}}><span>Standard Infra (Legacy)</span><span>₹{(standardCost/100000).toFixed(1)}L</span></div>
                                <div style={{height:'6px', background:'rgba(255,255,255,0.1)', borderRadius:'3px', marginBottom:'12px'}}><div style={{width:'100%', height:'100%', background:'#71717a', borderRadius:'3px'}}></div></div>
                                <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', marginBottom:'4px', color:'#10b981', fontWeight:'700'}}><span>VyomSetu Optimized</span><span>₹{(vyomCost/100000).toFixed(1)}L</span></div>
                                {/* Dynamic Width Bar */}
                                <div style={{height:'6px', background:'rgba(16, 185, 129, 0.2)', borderRadius:'3px'}}>
                                    <div style={{width:`${Math.min((vyomCost/standardCost)*100, 100)}%`, height:'100%', background:'#10b981', borderRadius:'3px', transition: 'width 1s'}}></div>
                                </div>
                            </div>
                            <div style={{padding:'12px', background:'rgba(16, 185, 129, 0.15)', borderRadius:'8px', color:'#34d399', fontSize:'12px', textAlign:'center', fontWeight:'700', border:'1px solid rgba(16, 185, 129, 0.2)'}}>
                                TOTAL SAVINGS: ₹{(savings/100000).toFixed(1)} Lakhs
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}