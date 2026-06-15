import React, { useState } from 'react';
import { Monitor, Wifi, WifiOff, RefreshCw, Plus, Key } from 'lucide-react';

const DEVICES = [
  { id:'SN-94A7B2', name:'Ward 3B Terminal',    location:'Ward 3B',         status:'offline', lastSeen:'14 min ago', firmware:'v2.4.1', ip:'192.168.1.41' },
  { id:'SN-2F9C31', name:'ICU Entrance',         location:'ICU Wing',        status:'online',  lastSeen:'Just now',   firmware:'v2.4.1', ip:'192.168.1.42' },
  { id:'SN-A1B3C2', name:'Emergency Gate',        location:'Emergency Dept',  status:'online',  lastSeen:'2 min ago',  firmware:'v2.4.1', ip:'192.168.1.43' },
  { id:'SN-77D4E5', name:'Surgery Suite Entry',   location:'Surgery Block',   status:'online',  lastSeen:'1 min ago',  firmware:'v2.4.0', ip:'192.168.1.44' },
  { id:'SN-B8F1A9', name:'Radiology Lab',         location:'Radiology Wing',  status:'online',  lastSeen:'3 min ago',  firmware:'v2.4.1', ip:'192.168.1.45' },
  { id:'SN-C3D2F7', name:'Admin Block',           location:'Admin Office',    status:'online',  lastSeen:'5 min ago',  firmware:'v2.3.9', ip:'192.168.1.46' },
  { id:'SN-E5A8B1', name:'Nursing Station',       location:'General Ward',    status:'online',  lastSeen:'1 min ago',  firmware:'v2.4.1', ip:'192.168.1.47' },
  { id:'SN-F2C9D6', name:'Pharmacy Entrance',     location:'Pharmacy',        status:'offline', lastSeen:'2 hrs ago',  firmware:'v2.4.0', ip:'192.168.1.48' },
];

export default function DevicesPage({ onToast }) {
  const [devices, setDevices] = useState(DEVICES);
  const [showReg, setShowReg] = useState(false);
  const [regCode]             = useState('821943');

  const ping = (id) => {
    onToast(`Pinging device ${id}…`, 'info');
    setTimeout(()=>{
      setDevices(prev=>prev.map(d=>d.id===id?{...d,status:'online',lastSeen:'Just now'}:d));
      onToast(`✓ Device ${id} responded`, 'success');
    },1500);
  };

  const online  = devices.filter(d=>d.status==='online').length;
  const offline = devices.filter(d=>d.status==='offline').length;

  return (
    <>
      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'var(--space-6)' }}>
        {[
          { label:'Total Devices',   value:devices.length, bg:'var(--color-info-bg)',    color:'var(--color-info)'    },
          { label:'Online',          value:online,          bg:'var(--color-success-bg)', color:'var(--color-success)' },
          { label:'Offline / Alert', value:offline,         bg:'var(--color-danger-bg)',  color:'var(--color-danger)'  },
        ].map(s=>(
          <div className="card" key={s.label} style={{ display:'flex',alignItems:'center',gap:'var(--space-4)' }}>
            <div style={{ width:44,height:44,borderRadius:10,background:s.bg,color:s.color,
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <Monitor size={20}/>
            </div>
            <div>
              <div style={{ fontSize:'var(--text-label)',color:'var(--color-text-secondary)' }}>{s.label}</div>
              <div style={{ fontSize:24,fontWeight:700,color:'var(--color-text-primary)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Device list */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Registered Terminals</div>
            <div className="card-subtitle">ZKTeco SenseFace 2A devices</div>
          </div>
          <button
            style={{
              display:'flex',alignItems:'center',gap:6,
              padding:'8px 14px',background:'var(--color-info)',
              border:'none',borderRadius:'var(--radius-badge)',
              color:'#fff',fontSize:13,fontWeight:600,
              cursor:'pointer',fontFamily:'inherit',
            }}
            onClick={()=>setShowReg(true)}
          >
            <Plus size={14}/> Register Device
          </button>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'var(--space-4)' }}>
          {devices.map(device=>(
            <div
              key={device.id}
              style={{
                border:`1px solid ${device.status==='online'?'var(--color-border)':'#FECACA'}`,
                borderRadius:'var(--radius-card)',
                padding:'var(--space-4)',
                background: device.status==='offline' ? '#FFF5F5' : 'var(--color-bg-surface)',
              }}
            >
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'var(--space-3)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:'var(--space-3)' }}>
                  <div style={{
                    width:36,height:36,borderRadius:8,
                    background: device.status==='online'?'var(--color-success-bg)':'var(--color-danger-bg)',
                    color: device.status==='online'?'var(--color-success)':'var(--color-danger)',
                    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                  }}>
                    {device.status==='online' ? <Wifi size={18}/> : <WifiOff size={18}/>}
                  </div>
                  <div>
                    <div style={{ fontWeight:600,fontSize:14,color:'var(--color-text-primary)' }}>{device.name}</div>
                    <div style={{ fontSize:12,color:'var(--color-text-secondary)' }}>{device.location}</div>
                  </div>
                </div>
                <span style={{
                  padding:'3px 8px',borderRadius:'var(--radius-pill)',
                  fontSize:11,fontWeight:600,
                  background: device.status==='online'?'var(--color-success-bg)':'var(--color-danger-bg)',
                  color:      device.status==='online'?'var(--color-success)':'var(--color-danger)',
                }}>
                  {device.status==='online' ? 'Online' : 'Offline'}
                </span>
              </div>

              <div style={{ marginTop:'var(--space-3)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-2)' }}>
                {[
                  { label:'Serial',   value:device.id          },
                  { label:'IP',       value:device.ip          },
                  { label:'Firmware', value:device.firmware    },
                  { label:'Last Seen',value:device.lastSeen    },
                ].map(f=>(
                  <div key={f.label}>
                    <div style={{ fontSize:10,color:'var(--color-text-tertiary)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.05em' }}>{f.label}</div>
                    <div style={{ fontSize:12,color:'var(--color-text-primary)',fontWeight:500 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {device.status==='offline' && (
                <button
                  style={{
                    display:'flex',alignItems:'center',gap:6,marginTop:'var(--space-3)',
                    width:'100%',padding:'7px',border:'1px solid var(--color-danger)',
                    borderRadius:'var(--radius-badge)',background:'var(--color-danger-bg)',
                    color:'var(--color-danger)',fontSize:12,fontWeight:500,
                    cursor:'pointer',fontFamily:'inherit',justifyContent:'center',
                  }}
                  onClick={()=>ping(device.id)}
                  aria-label={`Ping device ${device.name}`}
                >
                  <RefreshCw size={12}/> Attempt Reconnect
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Registration modal */}
      {showReg && (
        <div
          role="dialog" aria-modal="true" aria-label="Register new device"
          style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}
          onClick={e=>e.target===e.currentTarget&&setShowReg(false)}
        >
          <div className="card" style={{ width:'100%',maxWidth:420,padding:'var(--space-8)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:'var(--space-3)',marginBottom:'var(--space-6)' }}>
              <Key size={20} color="var(--color-info)"/>
              <div style={{ fontSize:'var(--text-heading)',fontWeight:600 }}>Register New Terminal</div>
            </div>
            <div style={{ textAlign:'center',padding:'var(--space-6)',background:'var(--color-info-bg)',borderRadius:'var(--radius-card)',marginBottom:'var(--space-4)' }}>
              <div style={{ fontSize:11,color:'var(--color-text-secondary)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.08em' }}>One-Time Activation Code</div>
              <div style={{ fontSize:48,fontWeight:700,color:'var(--color-info)',letterSpacing:12,fontFamily:'monospace' }}>{regCode}</div>
              <div style={{ fontSize:12,color:'var(--color-text-tertiary)',marginTop:8 }}>Valid for 10 minutes</div>
            </div>
            <div style={{ fontSize:13,color:'var(--color-text-secondary)',lineHeight:1.6,marginBottom:'var(--space-6)' }}>
              Enter this code on the SenseFace 2A terminal menu under <strong>Network → Cloud Registration</strong>. The device will automatically pair.
            </div>
            <button
              style={{ width:'100%',padding:10,background:'var(--color-info)',border:'none',borderRadius:'var(--radius-badge)',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}
              onClick={()=>{ setShowReg(false); onToast('✓ Device registration code generated','success'); }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}