import { useState, useEffect, useRef } from 'react';
import {
  Search, Pill, CheckCircle, Circle, ClipboardList,
  Package, RefreshCcw, AlertTriangle, ChevronDown,
  ChevronUp, Clock, Bell, BellOff, ShieldCheck,
  CalendarDays, Lock, Stethoscope, FileText, X
} from 'lucide-react';

const BASE = 'http://localhost:5000';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  }) : '—';

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════════ */
export default function MedicalDashboard() {
  const [aadhaar,     setAadhaar]     = useState('');
  const [patient,     setPatient]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [allPatients, setAllPatients] = useState([]);
  const [view,        setView]        = useState('search');   // 'search' | 'all'
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [expanding,   setExpanding]   = useState(null);
  const [medInfo,     setMedInfo]     = useState({ name:'', pharmacy_name:'' });
  const [notifs,      setNotifs]      = useState([]);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const notifRef = useRef(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Init ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('medical_user_data') || localStorage.getItem('user_data');
      if (raw) {
        const u = JSON.parse(raw);
        setMedInfo({ name: u.name||'', pharmacy_name: u.pharmacy_name||u.pharmacyName||'' });
      }
    } catch {}
    loadAllPatients();
  }, []);

  // Close notif on outside click
  useEffect(() => {
    const h = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifs(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Fetch all patients that have prescriptions ───────────────────
  const loadAllPatients = async () => {
    try {
      const res  = await fetch(`${BASE}/api/doctor/patients`);
      const data = await res.json();
      const pts  = (Array.isArray(data) ? data : data.patients || [])
        .filter(p => p.prescriptions?.length > 0);
      setAllPatients(pts);
      // notifications = patients with at least one pending medicine
      setNotifs(pts.filter(p => p.prescriptions.some(m => !m.issued)));
    } catch {}
  };

  // ── Search patient by Aadhaar ────────────────────────────────────
  const fetchPatient = async () => {
    const q = aadhaar.replace(/\D/g, '');
    if (q.length !== 12) { setError('Enter a valid 12-digit Aadhaar'); return; }
    setLoading(true); setError(''); setPatient(null);
    try {
      const res  = await fetch(`${BASE}/api/patient/${q}`);
      const data = await res.json();
      if (res.ok) setPatient(data);
      else        setError('No prescription found for this Aadhaar');
    } catch { setError('Server error — is Flask running?'); }
    finally  { setLoading(false); }
  };

  // ── Issue ONE medicine (locked after first issue) ────────────────
  const issueOne = async (pt, idx) => {
    if (pt.prescriptions[idx].issued) return;  // ← hard lock, never re-issue
    const now     = new Date().toISOString();
    const updated = pt.prescriptions.map((m, i) =>
      i === idx ? { ...m, issued: true, issued_at: now } : m
    );
    await persist(pt, updated, `"${updated[idx].name}"`);
  };

  // ── Issue ALL pending medicines at once ──────────────────────────
  const issueAll = async (pt) => {
    const now     = new Date().toISOString();
    const updated = pt.prescriptions.map(m =>
      m.issued ? m : { ...m, issued: true, issued_at: now }
    );
    await persist(pt, updated, 'All medicines');
  };

  // ── Persist to DB + update local state ──────────────────────────
  const persist = async (pt, prescriptions, label) => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/medical/mark-issued`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ aadhaar: pt.aadhaar, prescriptions }),
      });
      if (res.ok) {
        showToast('success', `${label} issued to ${pt.name}`);
        const update = p => p.aadhaar === pt.aadhaar ? { ...p, prescriptions } : p;
        if (patient?.aadhaar === pt.aadhaar) setPatient(p => ({ ...p, prescriptions }));
        setAllPatients(prev => prev.map(update));
        setNotifs(prev =>
          prev.map(update).filter(p => p.prescriptions.some(m => !m.issued))
        );
      } else showToast('error', 'Failed to save');
    } catch { showToast('error', 'Server error'); }
    finally { setSaving(false); }
  };

  // ── Stats ────────────────────────────────────────────────────────
  const totalRx     = allPatients.reduce((a,p) => a + (p.prescriptions?.length||0), 0);
  const totalIssued = allPatients.reduce((a,p) => a + (p.prescriptions?.filter(m=>m.issued).length||0), 0);
  const pendingRx   = totalRx - totalIssued;

  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight:'100vh', background:'#f0fdf4',
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

      {/* ── STICKY HEADER (Navbar removed) ──────────────────────── */}
      <header style={{
        position:'sticky', top:0, zIndex:200,
        background:'#fff', borderBottom:'1.5px solid #d1fae5',
        padding:'0 28px', height:64,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        boxShadow:'0 2px 16px rgba(5,150,105,0.07)',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:'linear-gradient(135deg,#059669,#10b981)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Pill size={20} color="#fff"/>
          </div>
          <div>
            <div style={{ fontWeight:900, fontSize:16, color:'#0f172a', letterSpacing:'-0.3px' }}>GraminSetu</div>
            <div style={{ fontSize:10, color:'#10b981', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>Medical Portal</div>
          </div>
        </div>

        {/* Pharmacy name badge */}
        <div style={{ display:'flex', alignItems:'center', gap:7, background:'#f0fdf4', border:'1px solid #d1fae5', borderRadius:20, padding:'6px 14px' }}>
          <ShieldCheck size={14} color="#059669"/>
          <span style={{ fontSize:13, fontWeight:700, color:'#065f46' }}>
            {medInfo.pharmacy_name || medInfo.name || 'Medical Store'}
          </span>
        </div>

        {/* Bell */}
        <div ref={notifRef} style={{ position:'relative' }}>
          <button onClick={() => setShowNotifs(v => !v)} style={{
            width:42, height:42, borderRadius:12,
            border:'1.5px solid #d1fae5', background:'#f0fdf4',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', position:'relative',
          }}>
            <Bell size={19} color="#059669"/>
            {notifs.length > 0 && (
              <span style={{
                position:'absolute', top:5, right:5,
                width:17, height:17, borderRadius:'50%',
                background:'#ef4444', border:'2px solid #fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:9, fontWeight:900, color:'#fff',
              }}>
                {notifs.length > 9 ? '9+' : notifs.length}
              </span>
            )}
          </button>

          {/* ── Notification Dropdown ─────────────────────────── */}
          {showNotifs && (
            <div style={{
              position:'absolute', top:52, right:0, width:340,
              background:'#fff', borderRadius:18,
              border:'1.5px solid #d1fae5',
              boxShadow:'0 16px 48px rgba(0,0,0,0.13)', zIndex:999,
              overflow:'hidden',
            }}>
              {/* Dropdown header */}
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f0fdf4', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:14, color:'#0f172a' }}>Pending Medicines</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>Patients waiting for medicine</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:20, background:'#fef2f2', color:'#ef4444', border:'1px solid #fca5a5' }}>
                    {notifs.length} pending
                  </span>
                  <button onClick={() => setShowNotifs(false)} style={{ width:24, height:24, borderRadius:6, border:'none', background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    <X size={13} color="#64748b"/>
                  </button>
                </div>
              </div>

              <div style={{ maxHeight:360, overflowY:'auto' }}>
                {notifs.length === 0 ? (
                  <div style={{ padding:'28px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>
                    <BellOff size={28} color="#d1d5db" style={{ margin:'0 auto 10px', display:'block' }}/>
                    All medicines issued
                  </div>
                ) : notifs.map((pt, i) => {
                  const pending = pt.prescriptions.filter(m => !m.issued);
                  return (
                    <div key={i}
                      onClick={() => {
                        setAadhaar(pt.aadhaar);
                        setPatient(pt);
                        setView('search');
                        setShowNotifs(false);
                      }}
                      style={{ padding:'13px 18px', borderBottom:'1px solid #f8fafc', cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>

                      {/* Patient row */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <div style={{ width:34, height:34, borderRadius:9, background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color:'#ef4444', flexShrink:0 }}>
                          {(pt.name||'?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>{pt.name}</div>
                          <div style={{ fontSize:10, color:'#94a3b8', fontFamily:'monospace' }}>{pt.aadhaar}</div>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#fef2f2', color:'#ef4444' }}>
                          {pending.length} pending
                        </span>
                      </div>

                      {/* Pending medicine pills */}
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {pending.map((m, j) => (
                          <span key={j} style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:8, background:'#fffbeb', color:'#d97706', border:'1px solid #fde68a' }}>
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* "View all" footer */}
              {notifs.length > 0 && (
                <div style={{ padding:'10px 18px', borderTop:'1px solid #f0fdf4', background:'#fafffe' }}>
                  <button onClick={() => { setView('all'); setShowNotifs(false); }} style={{ width:'100%', padding:'8px', borderRadius:9, border:'none', background:'#f0fdf4', color:'#059669', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                    View All Prescriptions
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth:980, margin:'0 auto', padding:'24px 20px' }}>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:'Total Prescribed', value:totalRx,     color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', Icon:ClipboardList },
            { label:'Medicines Issued', value:totalIssued, color:'#059669', bg:'#f0fdf4', border:'#86efac', Icon:CheckCircle   },
            { label:'Pending Issue',    value:pendingRx,   color:'#d97706', bg:'#fffbeb', border:'#fde68a', Icon:Clock         },
          ].map((s,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:16, padding:'16px 20px', border:`1.5px solid ${s.border}`, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <s.Icon size={20} color={s.color}/>
              </div>
              <div>
                <div style={{ fontSize:30, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:700, marginTop:3, textTransform:'uppercase', letterSpacing:'0.5px' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab toggle */}
        <div style={{ display:'flex', background:'#fff', border:'1.5px solid #d1fae5', borderRadius:14, padding:4, marginBottom:22, width:'fit-content' }}>
          {[
            { key:'search', label:'Search Patient',                            icon:<Search size={14}/>        },
            { key:'all',    label:`All Prescriptions (${allPatients.length})`, icon:<ClipboardList size={14}/> },
          ].map(t => (
            <button key={t.key} onClick={() => setView(t.key)} style={{
              display:'flex', alignItems:'center', gap:7, padding:'8px 22px',
              borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
              background: view===t.key ? '#059669' : 'transparent',
              color:      view===t.key ? '#fff'    : '#64748b',
              transition:'all 0.15s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════
            SEARCH TAB
        ══════════════════════════════════════════════════════════ */}
        {view === 'search' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Search bar */}
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'#fff', border:'2px solid #d1fae5', borderRadius:16, padding:'10px 14px', boxShadow:'0 2px 12px rgba(5,150,105,0.05)' }}>
              <Search size={17} color="#10b981"/>
              <input
                value={aadhaar}
                onChange={e => { setAadhaar(e.target.value.replace(/\D/g,'').slice(0,12)); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && fetchPatient()}
                placeholder="Enter 12-digit Aadhaar number..."
                style={{ border:'none', outline:'none', flex:1, fontSize:15, fontWeight:600, color:'#0f172a', background:'transparent' }}
              />
              {aadhaar && (
                <button onClick={() => { setAadhaar(''); setPatient(null); setError(''); }} style={{ width:26, height:26, borderRadius:7, border:'none', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <X size={13} color="#94a3b8"/>
                </button>
              )}
              <button onClick={fetchPatient} disabled={loading} style={{
                background: loading ? '#d1fae5' : '#059669',
                color: loading ? '#6ee7b7' : '#fff',
                border:'none', borderRadius:11, padding:'10px 24px',
                fontSize:13, fontWeight:800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:7,
                boxShadow:'0 4px 12px rgba(5,150,105,0.2)', transition:'all 0.15s',
              }}>
                {loading
                  ? <RefreshCcw size={15} style={{ animation:'spin 1s linear infinite' }}/>
                  : <Search size={15}/>}
                {loading ? 'Loading...' : 'Get Prescription'}
              </button>
            </div>

            {error && (
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:12, padding:'12px 16px', color:'#dc2626', fontSize:13, fontWeight:600 }}>
                <AlertTriangle size={15}/> {error}
              </div>
            )}

            {patient && (
              <PrescriptionCard
                patient={patient}
                issueOne={issueOne}
                issueAll={issueAll}
                saving={saving}
              />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            ALL PRESCRIPTIONS TAB
        ══════════════════════════════════════════════════════════ */}
        {view === 'all' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {allPatients.length === 0 ? (
              <EmptyState/>
            ) : allPatients.map((pt, idx) => {
              const meds    = pt.prescriptions || [];
              const issCnt  = meds.filter(m => m.issued).length;
              const allDone = issCnt === meds.length && meds.length > 0;
              const isOpen  = expanding === idx;

              return (
                <div key={idx} style={{ background:'#fff', borderRadius:16, border:`2px solid ${allDone ? '#86efac' : '#e8ecf4'}`, overflow:'hidden', transition:'border-color 0.2s' }}>

                  {/* Row click = expand */}
                  <div
                    onClick={() => setExpanding(isOpen ? null : idx)}
                    style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', background: allDone ? '#f0fdf4' : '#fff' }}>

                    <div style={{ width:46, height:46, borderRadius:12, background: allDone ? 'linear-gradient(135deg,#059669,#10b981)' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:18, color: allDone ? '#fff' : '#64748b', flexShrink:0 }}>
                      {(pt.name||'?').charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:14, color:'#0f172a' }}>{pt.name}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace', marginTop:2 }}>{pt.aadhaar}</div>
                    </div>

                    {/* Mini progress bar */}
                    <div style={{ width:80, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <span style={{ fontSize:12, fontWeight:900, color: allDone ? '#059669' : '#d97706' }}>
                        {issCnt}/{meds.length}
                      </span>
                      <div style={{ width:'100%', height:5, background:'#f1f5f9', borderRadius:3 }}>
                        <div style={{ height:'100%', width:`${meds.length?Math.round(issCnt/meds.length*100):0}%`, background: allDone ? '#059669' : '#f59e0b', borderRadius:3, transition:'width 0.4s' }}/>
                      </div>
                    </div>

                    {allDone
                      ? <CheckCircle size={20} color="#059669"/>
                      : isOpen
                        ? <ChevronUp   size={18} color="#94a3b8"/>
                        : <ChevronDown size={18} color="#94a3b8"/>
                    }
                  </div>

                  {/* Expanded section */}
                  {isOpen && (
                    <div style={{ borderTop:'1px solid #f1f5f9' }}>

                      {/* Doctor's prescription header */}
                      <div style={{ padding:'10px 20px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:7 }}>
                        <Stethoscope size={13} color="#2563eb"/>
                        <span style={{ fontSize:11, fontWeight:800, color:'#2563eb', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                          Prescribed by Doctor
                        </span>
                      </div>

                      {meds.map((med, i) => (
                        <MedRow key={i} med={med} index={i} pt={pt} issueOne={issueOne}/>
                      ))}

                      {/* Doctor notes */}
                      {pt.doctor_notes && (
                        <div style={{ padding:'12px 20px', background:'#eff6ff', borderTop:'1px solid #e0f0ff', display:'flex', gap:9 }}>
                          <FileText size={14} color="#2563eb" style={{ flexShrink:0, marginTop:2 }}/>
                          <div>
                            <div style={{ fontSize:10, fontWeight:800, color:'#2563eb', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>
                              Doctor Instructions
                            </div>
                            <div style={{ fontSize:12, color:'#1e40af', lineHeight:1.6 }}>{pt.doctor_notes}</div>
                          </div>
                        </div>
                      )}

                      {/* Issue all (only if pending) */}
                      {!allDone && (
                        <div style={{ padding:'12px 20px', background:'#fafffe', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end' }}>
                          <button onClick={() => issueAll(pt)} disabled={saving} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', background:'#059669', color:'#fff', fontWeight:700, fontSize:13, cursor: saving ? 'not-allowed' : 'pointer', boxShadow:'0 4px 12px rgba(5,150,105,0.2)', opacity: saving ? 0.7 : 1 }}>
                            <Package size={14}/> Mark All Issued
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:9999,
          background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
          borderRadius:14, padding:'13px 20px',
          fontSize:13, fontWeight:700,
          color: toast.type === 'success' ? '#059669' : '#dc2626',
          boxShadow:'0 8px 32px rgba(0,0,0,0.12)',
          animation:'slideUp 0.3s ease',
          display:'flex', alignItems:'center', gap:9,
        }}>
          {toast.type === 'success'
            ? <CheckCircle size={16} color="#059669"/>
            : <AlertTriangle size={16} color="#dc2626"/>}
          {toast.msg}
        </div>
      )}
      <style>{`
        @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MEDICINE ROW — locked permanently after first issue
═══════════════════════════════════════════════════════════════ */
function MedRow({ med, index, pt, issueOne }) {
  const locked = !!med.issued;

  return (
    <div
      onClick={() => !locked && issueOne(pt, index)}
      style={{
        display:'flex', alignItems:'center', gap:14,
        padding:'14px 20px', borderBottom:'1px solid #f8fafc',
        background: locked ? '#f0fdf4' : '#fff',
        cursor: locked ? 'default' : 'pointer',
        transition:'background 0.15s',
      }}
      onMouseEnter={e => { if (!locked) e.currentTarget.style.background = '#f9fffe'; }}
      onMouseLeave={e => { if (!locked) e.currentTarget.style.background = locked ? '#f0fdf4' : '#fff'; }}>

      {/* Tick icon */}
      <div style={{ flexShrink:0 }}>
        {locked
          ? <CheckCircle size={26} color="#059669" strokeWidth={2.5}/>
          : <Circle      size={26} color="#d1d5db" strokeWidth={2}/>}
      </div>

      {/* Details from doctor prescription */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontWeight:800, fontSize:14, color: locked ? '#059669' : '#0f172a', textDecoration: locked ? 'line-through' : 'none', transition:'color 0.2s' }}>
            {med.name || '—'}
          </span>
          {locked && (
            <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:8, background:'#dcfce7', color:'#059669', border:'1px solid #86efac' }}>
              <Lock size={8}/> Issued
            </span>
          )}
        </div>

        {/* Dosage */}
        <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginTop:3 }}>
          {med.dosage || '—'}
        </div>

        {/* Instruction from doctor */}
        {med.instruction && (
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:3, fontStyle:'italic' }}>
            {med.instruction}
          </div>
        )}

        {/* Issue timestamp — shown only after issued */}
        {locked && med.issued_at && (
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#6ee7b7', fontWeight:700, marginTop:4 }}>
            <CalendarDays size={10}/>
            Issued on {fmtDate(med.issued_at)}
          </div>
        )}
      </div>

      {/* Status pill */}
      <div style={{ flexShrink:0 }}>
        {locked ? (
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:800, padding:'5px 13px', borderRadius:20, background:'#dcfce7', color:'#059669', border:'1px solid #86efac' }}>
            <Lock size={10}/> Issued
          </span>
        ) : (
          <span style={{ fontSize:11, fontWeight:700, padding:'5px 13px', borderRadius:20, background:'#fffbeb', color:'#d97706', border:'1px solid #fde68a' }}>
            Pending
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRESCRIPTION CARD — Search tab
═══════════════════════════════════════════════════════════════ */
function PrescriptionCard({ patient, issueOne, issueAll, saving }) {
  const meds    = patient.prescriptions || [];
  const issCnt  = meds.filter(m => m.issued).length;
  const allDone = meds.length > 0 && issCnt === meds.length;
  const pct     = meds.length > 0 ? Math.round((issCnt / meds.length) * 100) : 0;

  return (
    <div style={{ background:'#fff', borderRadius:24, border:'2px solid #d1fae5', overflow:'hidden', boxShadow:'0 8px 32px rgba(5,150,105,0.07)' }}>

      {/* Patient info header */}
      <div style={{ padding:'22px 24px', background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderBottom:'1px solid #d1fae5' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:54, height:54, borderRadius:15, background:'linear-gradient(135deg,#059669,#10b981)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:22, color:'#fff', flexShrink:0 }}>
              {(patient.name||'?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:20, color:'#0f172a' }}>{patient.name}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:2, fontFamily:'monospace' }}>Aadhaar: {patient.aadhaar}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:1 }}>
                DOB: {patient.dob || '—'} · {patient.gender == 1 ? 'Female' : 'Male'}
              </div>
            </div>
          </div>

          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:32, fontWeight:900, color: allDone ? '#059669' : '#d97706', lineHeight:1 }}>
              {issCnt}/{meds.length}
            </div>
            <div style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:3 }}>
              Medicines Issued
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              Issue Progress
            </span>
            <span style={{ fontSize:11, fontWeight:800, color: allDone ? '#059669' : '#d97706' }}>{pct}%</span>
          </div>
          <div style={{ height:9, background:'#d1fae5', borderRadius:5, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#059669,#10b981)', borderRadius:5, transition:'width 0.5s ease' }}/>
          </div>
        </div>
      </div>

      {/* Doctor prescription section header */}
      <div style={{ padding:'14px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8, background:'#fafffe' }}>
        <Stethoscope size={15} color="#2563eb"/>
        <span style={{ fontSize:12, fontWeight:800, color:'#2563eb', textTransform:'uppercase', letterSpacing:'0.5px' }}>
          Prescribed by Doctor
        </span>
      </div>

      {/* Medicines */}
      <div>
        {meds.length === 0 ? (
          <div style={{ padding:'32px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>
            No medicines prescribed yet
          </div>
        ) : meds.map((med, i) => (
          <MedRow key={i} med={med} index={i} pt={patient} issueOne={issueOne}/>
        ))}
      </div>

      {/* Doctor notes */}
      {patient.doctor_notes && (
        <div style={{ padding:'14px 24px', background:'#eff6ff', borderTop:'1px solid #e0f0ff', display:'flex', gap:10 }}>
          <FileText size={15} color="#2563eb" style={{ flexShrink:0, marginTop:2 }}/>
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:'#2563eb', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>
              Doctor Instructions
            </div>
            <div style={{ fontSize:13, color:'#1e40af', lineHeight:1.7 }}>{patient.doctor_notes}</div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!allDone && meds.length > 0 && (
        <div style={{ padding:'16px 24px', borderTop:'1px solid #f0fdf4', background:'#fafffe' }}>
          <button onClick={() => issueAll(patient)} disabled={saving} style={{
            width:'100%', padding:'14px', borderRadius:13, border:'none',
            background: saving ? '#d1fae5' : 'linear-gradient(135deg,#059669,#10b981)',
            color: saving ? '#6ee7b7' : '#fff',
            fontWeight:800, fontSize:14,
            cursor: saving ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow: saving ? 'none' : '0 4px 16px rgba(5,150,105,0.25)',
            transition:'all 0.15s',
          }}>
            {saving
              ? <RefreshCcw size={16} style={{ animation:'spin 1s linear infinite' }}/>
              : <Package size={16}/>}
            {saving ? 'Saving...' : 'Mark All Medicines as Issued'}
          </button>
        </div>
      )}

      {allDone && (
        <div style={{ padding:'16px 24px', borderTop:'1px solid #d1fae5', background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', gap:9, color:'#059669', fontWeight:800, fontSize:14 }}>
          <CheckCircle size={18}/> All medicines have been issued to this patient
        </div>
      )}
    </div>
  );
}

/* Empty state */
function EmptyState() {
  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #d1fae5', padding:'56px 24px', textAlign:'center' }}>
      <Pill size={40} color="#d1d5db" style={{ margin:'0 auto 14px', display:'block' }}/>
      <div style={{ fontWeight:700, color:'#94a3b8', fontSize:15 }}>No prescriptions in the system yet</div>
      <div style={{ fontSize:13, color:'#cbd5e1', marginTop:6 }}>Prescriptions added by doctors will appear here</div>
    </div>
  );
}