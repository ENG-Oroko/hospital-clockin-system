import React, { useState } from 'react';
import { Save, Clock, DollarSign, Bell, Shield } from 'lucide-react';

export default function SettingsPage({ onToast }) {
  const [grace,     setGrace]     = useState('15');
  const [otMulti,   setOtMulti]   = useState('1.5');
  const [workHours, setWorkHours] = useState('8');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts,   setSmsAlerts]   = useState(true);
  const [deviceAlerts,setDeviceAlerts]= useState(true);
  const [autoRecon,   setAutoRecon]   = useState(true);
  const [hospital, setHospital]   = useState('CityCare General Hospital');
  const [timezone, setTimezone]   = useState('Africa/Accra');

  const save = (section) => {
    onToast(`✓ ${section} settings saved`, 'success');
  };

  const Toggle = ({ value, onChange, label, id }) => (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'var(--space-3) 0',borderBottom:'1px solid var(--color-border)' }}>
      <label htmlFor={id} style={{ fontSize:14,color:'var(--color-text-primary)',cursor:'pointer' }}>{label}</label>
      <button
        id={id}
        role="switch"
        aria-checked={value}
        onClick={()=>onChange(!value)}
        style={{
          width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',
          background: value ? 'var(--color-info)' : 'var(--color-border)',
          position:'relative',transition:'background 0.2s',padding:0,
        }}
        aria-label={label}
      >
        <div style={{
          width:18,height:18,borderRadius:'50%',background:'#fff',
          position:'absolute',top:3,
          left: value ? 23 : 3,
          transition:'left 0.2s',
          boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
        }}/>
      </button>
    </div>
  );

  const Field = ({ label, value, onChange, type='text', min, max, step, suffix }) => (
    <div style={{ marginBottom:'var(--space-4)' }}>
      <label style={{ display:'block',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:6 }}>
        {label}
      </label>
      <div style={{ display:'flex',alignItems:'center',gap:'var(--space-2)' }}>
        <input
          type={type} value={value} onChange={e=>onChange(e.target.value)}
          min={min} max={max} step={step}
          style={{
            flex:1,padding:'9px 12px',border:'1px solid var(--color-border)',
            borderRadius:'var(--radius-badge)',fontSize:'var(--text-body)',
            fontFamily:'inherit',outline:'none',background:'#fff',
          }}
        />
        {suffix && <span style={{ fontSize:13,color:'var(--color-text-secondary)',whiteSpace:'nowrap' }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-6)' }}>

      {/* Hospital Profile */}
      <div className="card">
        <div style={{ display:'flex',alignItems:'center',gap:'var(--space-3)',marginBottom:'var(--space-6)' }}>
          <div style={{ width:36,height:36,borderRadius:10,background:'var(--color-info-bg)',color:'var(--color-info)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Shield size={18}/>
          </div>
          <div className="card-title">Hospital Profile</div>
        </div>
        <Field label="Hospital Name"  value={hospital}  onChange={setHospital} />
        <div style={{ marginBottom:'var(--space-4)' }}>
          <label style={{ display:'block',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:6 }}>Timezone</label>
          <select
            value={timezone} onChange={e=>setTimezone(e.target.value)}
            style={{ width:'100%',padding:'9px 12px',border:'1px solid var(--color-border)',borderRadius:'var(--radius-badge)',fontSize:'var(--text-body)',fontFamily:'inherit',outline:'none',background:'#fff',cursor:'pointer' }}
          >
            {['Africa/Accra','Africa/Lagos','Africa/Nairobi','Europe/London','America/New_York'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <button
          style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',background:'var(--color-info)',border:'none',borderRadius:'var(--radius-badge)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}
          onClick={()=>save('Hospital Profile')}
        >
          <Save size={14}/> Save Profile
        </button>
      </div>

      {/* Attendance Rules */}
      <div className="card">
        <div style={{ display:'flex',alignItems:'center',gap:'var(--space-3)',marginBottom:'var(--space-6)' }}>
          <div style={{ width:36,height:36,borderRadius:10,background:'var(--color-warning-bg)',color:'var(--color-warning)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Clock size={18}/>
          </div>
          <div className="card-title">Attendance Rules</div>
        </div>
        <Field label="Grace Period (Lateness Margin)"   value={grace}     onChange={setGrace}     type="number" min="0" max="60"  suffix="minutes" />
        <Field label="Standard Working Hours per Shift" value={workHours} onChange={setWorkHours} type="number" min="4" max="16"  suffix="hours"   />
        <button
          style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',background:'var(--color-warning)',border:'none',borderRadius:'var(--radius-badge)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}
          onClick={()=>save('Attendance Rules')}
        >
          <Save size={14}/> Save Rules
        </button>
      </div>

      {/* Payroll Policy */}
      <div className="card">
        <div style={{ display:'flex',alignItems:'center',gap:'var(--space-3)',marginBottom:'var(--space-6)' }}>
          <div style={{ width:36,height:36,borderRadius:10,background:'var(--color-success-bg)',color:'var(--color-success)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <DollarSign size={18}/>
          </div>
          <div className="card-title">Payroll Policy</div>
        </div>
        <Field label="Overtime Rate Multiplier" value={otMulti} onChange={setOtMulti} type="number" min="1" max="3" step="0.1" suffix="× base rate" />
        <div style={{ padding:'var(--space-3)',background:'var(--color-bg-page)',borderRadius:'var(--radius-badge)',marginBottom:'var(--space-4)' }}>
          <div style={{ fontSize:12,color:'var(--color-text-secondary)',lineHeight:1.6 }}>
            Example: an employee earning <strong>Ksh 2000/hr</strong> on overtime at <strong>{otMulti}×</strong> earns <strong>Ksh {(2000*parseFloat(otMulti||1)).toFixed(2)}/hr</strong> for extra hours.
          </div>
        </div>
        <button
          style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',background:'var(--color-success)',border:'none',borderRadius:'var(--radius-badge)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}
          onClick={()=>save('Payroll Policy')}
        >
          <Save size={14}/> Save Policy
        </button>
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <div style={{ display:'flex',alignItems:'center',gap:'var(--space-3)',marginBottom:'var(--space-6)' }}>
          <div style={{ width:36,height:36,borderRadius:10,background:'var(--color-danger-bg)',color:'var(--color-danger)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Bell size={18}/>
          </div>
          <div className="card-title">Notification Preferences</div>
        </div>
        <Toggle id="email-alerts"  label="Email Alerts for Absences"     value={emailAlerts}  onChange={setEmailAlerts}  />
        <Toggle id="sms-alerts"    label="SMS Alerts to Managers"         value={smsAlerts}    onChange={setSmsAlerts}    />
        <Toggle id="device-alerts" label="Device Offline Notifications"   value={deviceAlerts} onChange={setDeviceAlerts} />
        <Toggle id="auto-recon"    label="Automatic Nightly Reconciliation" value={autoRecon}  onChange={setAutoRecon}    />
        <button
          style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',background:'var(--color-danger)',border:'none',borderRadius:'var(--radius-badge)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:'var(--space-4)' }}
          onClick={()=>save('Notification Preferences')}
        >
          <Save size={14}/> Save Preferences
        </button>
      </div>

    </div>
  );
}