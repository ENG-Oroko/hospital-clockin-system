import React, { useState } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle, Info, XCircle, Bell, Trash2,
} from 'lucide-react';

const INITIAL = [
  { id:1,  icon:'AlertCircle', color:'red',   title:'Device Offline — Ward 3B',          desc:'SenseFace 2A (SN: 94A7B2) unreachable for 14 min.',          time:'14 min ago', read:false },
  { id:2,  icon:'AlertTriangle',color:'amber',title:'Overtime Threshold Exceeded',        desc:'ICU dept. exceeded 40 overtime hrs this week.',              time:'1 hr ago',   read:false },
  { id:3,  icon:'XCircle',     color:'red',   title:'Missing Clock-Out — 12 Staff',       desc:"MISSING_OUT records flagged from yesterday's night shift.",   time:'3 hrs ago',  read:false },
  { id:4,  icon:'Info',        color:'blue',  title:'Payroll Run Scheduled',              desc:'Monthly payroll compilation starts tonight at 23:00.',       time:'5 hrs ago',  read:false },
  { id:5,  icon:'CheckCircle', color:'green', title:'Reconciliation Complete',            desc:'All 986 logs from morning shift matched successfully.',       time:'6 hrs ago',  read:true  },
  { id:6,  icon:'Info',        color:'blue',  title:'New Leave Request',                  desc:'Sarah Njoku (Nursing) submitted an annual leave request.',    time:'8 hrs ago',  read:true  },
  { id:7,  icon:'AlertTriangle',color:'amber',title:'Device Firmware Outdated',          desc:'SN-C3D2F7 (Admin Block) is running v2.3.9 — update available.',time:'1 day ago',  read:true  },
  { id:8,  icon:'CheckCircle', color:'green', title:'Payroll Processed — April 2025',     desc:'April payroll ledger finalized. GH₵ 287,450 total disbursed.',time:'2 days ago', read:true  },
];

const ICON_MAP = { AlertCircle, AlertTriangle, XCircle, Info, CheckCircle };
const COLOR_STYLES = {
  red:   { bg:'var(--color-danger-bg)',  color:'var(--color-danger)'  },
  amber: { bg:'var(--color-warning-bg)', color:'var(--color-warning)' },
  blue:  { bg:'var(--color-info-bg)',    color:'var(--color-info)'    },
  green: { bg:'var(--color-success-bg)', color:'var(--color-success)' },
};

export default function NotificationsPage({ onToast }) {
  const [notifications, setNotifications] = useState(INITIAL);
  const [filter, setFilter] = useState('all');

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read:true })));
    onToast('All notifications marked as read', 'success');
  };
  const deleteNotif = id => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    onToast('Notification dismissed', 'info');
  };
  const markRead = id => {
    setNotifications(prev => prev.map(n => n.id===id ? {...n,read:true} : n));
  };

  const filtered = notifications.filter(n => {
    if (filter==='unread') return !n.read;
    if (filter==='read')   return  n.read;
    return true;
  });

  const unreadCount = notifications.filter(n=>!n.read).length;

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              All Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft:8,background:'var(--color-danger)',color:'#fff',fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:'var(--radius-pill)' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="card-subtitle">System alerts, approvals, and status updates</div>
          </div>
          <div style={{ display:'flex',gap:'var(--space-3)',alignItems:'center' }}>
            <div className="tabs" style={{ borderBottom:'none',marginBottom:0 }}>
              {['all','unread','read'].map(f=>(
                <button
                  key={f}
                  className={`tab-btn${filter===f?' active':''}`}
                  onClick={()=>setFilter(f)}
                  style={{ padding:'6px 12px',fontSize:12 }}
                >
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              ))}
            </div>
            {unreadCount>0 && (
              <button className="header-btn" onClick={markAllRead} style={{ fontSize:12,padding:'6px 12px' }}>
                <Bell size={13}/> Mark all read
              </button>
            )}
          </div>
        </div>

        {filtered.length===0 ? (
          <div style={{ textAlign:'center',padding:'var(--space-12)',color:'var(--color-text-tertiary)' }}>
            <Bell size={32} style={{ marginBottom:'var(--space-3)',opacity:0.3 }}/>
            <div style={{ fontSize:14,fontWeight:500 }}>No notifications here</div>
          </div>
        ) : (
          <ul style={{ listStyle:'none',padding:0 }}>
            {filtered.map(notif=>{
              const Icon   = ICON_MAP[notif.icon];
              const styles = COLOR_STYLES[notif.color];
              return (
                <li
                  key={notif.id}
                  style={{
                    display:'flex',alignItems:'flex-start',gap:'var(--space-3)',
                    padding:'var(--space-4)',margin:'0 calc(-1 * var(--space-6))',
                    paddingLeft:'var(--space-6)',paddingRight:'var(--space-6)',
                    borderBottom:'1px solid var(--color-border)',
                    background: notif.read ? 'transparent' : 'rgba(37,99,235,0.03)',
                    transition:'background 0.15s',cursor:'pointer',
                  }}
                  onClick={()=>markRead(notif.id)}
                >
                  <div style={{ width:36,height:36,borderRadius:'var(--radius-badge)',
                    background:styles.bg,color:styles.color,
                    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}
                    aria-hidden="true"
                  >
                    <Icon size={16}/>
                  </div>

                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'var(--space-2)' }}>
                      {!notif.read && (
                        <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--color-info)',flexShrink:0 }} aria-label="Unread"/>
                      )}
                      <div style={{ fontSize:14,fontWeight:600,color:'var(--color-text-primary)' }}>{notif.title}</div>
                    </div>
                    <div style={{ fontSize:13,color:'var(--color-text-secondary)',marginTop:2,lineHeight:1.4 }}>{notif.desc}</div>
                    <div style={{ fontSize:12,color:'var(--color-text-tertiary)',marginTop:4 }}>{notif.time}</div>
                  </div>

                  <button
                    onClick={e=>{e.stopPropagation();deleteNotif(notif.id);}}
                    aria-label="Dismiss notification"
                    style={{ background:'none',border:'none',cursor:'pointer',color:'var(--color-text-tertiary)',
                      padding:4,borderRadius:6,display:'flex',alignItems:'center',
                      transition:'color 0.15s',flexShrink:0 }}
                    onMouseEnter={e=>e.currentTarget.style.color='var(--color-danger)'}
                    onMouseLeave={e=>e.currentTarget.style.color='var(--color-text-tertiary)'}
                  >
                    <Trash2 size={15}/>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}