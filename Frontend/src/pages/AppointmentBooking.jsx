import React, { useState, useEffect } from 'react';
import {
  X, Stethoscope, Heart, Activity, Zap, User,
  Calendar, Clock, CheckCircle, Loader, MapPin,
  AlertTriangle, ChevronRight, Plus, Minus
} from 'lucide-react';

const BASE = 'http://localhost:5000';

// ── Exact specialty values from your registration form ────────────
// value="Cardiologist", value="Endocrinologist", etc.
const RISK_DOCTOR_MAP = {
  heart: {
    label:       'Cardiovascular Risk',
    color:       '#ef4444',
    bg:          '#fef2f2',
    border:      '#fca5a5',
    icon:        '❤️',
    // These EXACTLY match your <option value="..."> in registration
    specialties: ['Cardiologist', 'General Physician'],
    slotKey:     'heartDoctor',
  },
  diabetes: {
    label:       'Diabetes Risk',
    color:       '#3b82f6',
    bg:          '#eff6ff',
    border:      '#bfdbfe',
    icon:        '🩸',
    specialties: ['Endocrinologist', 'General Physician'],
    slotKey:     'diabetesDoctor',
  },
  obesity: {
    label:       'Obesity / Metabolic Risk',
    color:       '#f97316',
    bg:          '#fff7ed',
    border:      '#fed7aa',
    icon:        '⚖️',
    specialties: ['Dietitian/Nutritionist', 'General Physician'],
    slotKey:     'obesityDoctor',
  },
};

// All 7 specialties — exact values from your form
const ALL_SPECIALTIES = [
  'General Physician',
  'Cardiologist',
  'Endocrinologist',
  'Dietitian/Nutritionist',
  'Gynecologist',
  'Pediatrician',
  'Ayush/Homeopathy',
];

export default function AppointmentBooking({ patientData, risks, onClose, onBooked }) {
  const heartRisk    = parseFloat(risks?.heartRisk    || 0);
  const diabetesRisk = parseFloat(risks?.diabetesRisk || 0);
  const obesityRisk  = parseFloat(risks?.obesityRisk  || 0);
  const overallRisk  = parseFloat(
    risks?.overallScore ||
    ((heartRisk + diabetesRisk + obesityRisk) / 3).toFixed(1)
  );

  // Which risk buckets are active (>35%)
  const activeRisks = [
    heartRisk    > 35 && { key: 'heart',    score: heartRisk    },
    diabetesRisk > 35 && { key: 'diabetes', score: diabetesRisk },
    obesityRisk  > 35 && { key: 'obesity',  score: obesityRisk  },
  ].filter(Boolean).sort((a, b) => b.score - a.score);

  const showGeneral = activeRisks.length === 0;

  // ── State ────────────────────────────────────────────────────
  const [step,         setStep]         = useState(1);
  // doctorsByRisk: { heart: [...], diabetes: [...], obesity: [...], general: [...] }
  const [doctorsByRisk,setDoctorsByRisk]= useState({});
  const [loadingDocs,  setLoadingDocs]  = useState(true);
  // selectedDoctors: { heart: docObj|null, diabetes: docObj|null, obesity: docObj|null }
  const [selectedDocs, setSelectedDocs] = useState({});
  const [activeTab,    setActiveTab]    = useState(
    activeRisks[0]?.key || 'general'
  );

  // Shared date/time/notes for all selected doctors
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes,        setNotes]        = useState('');
  const [booking,      setBooking]      = useState(false);
  const [booked,       setBooked]       = useState(false);
  const [bookedResults,setBookedResults]= useState([]);
  const [error,        setError]        = useState('');

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const timeSlots = [
    '09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
    '02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM',
    '05:00 PM','05:30 PM','06:00 PM',
  ];

  // ── Fetch doctors for each active risk separately ─────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingDocs(true);
      const results = {};

      const riskKeys = showGeneral
        ? [{ key: 'general', specialties: ['General Physician'] }]
        : activeRisks.map(r => ({ key: r.key, specialties: RISK_DOCTOR_MAP[r.key].specialties }));

      await Promise.all(riskKeys.map(async ({ key, specialties }) => {
        try {
          const params = new URLSearchParams({
            specialties: specialties.join(','),
            taluka:      patientData?.taluka || '',
          });
          const res  = await fetch(`${BASE}/api/doctors/by-risk?${params}`);
          const data = await res.json();
          results[key] = Array.isArray(data) ? data : (data.doctors || []);
        } catch {
          results[key] = [];
        }
      }));

      setDoctorsByRisk(results);
      setLoadingDocs(false);
    };
    fetchAll();
  }, []);

  // Total selected doctor count
  const selectedCount = Object.values(selectedDocs).filter(Boolean).length;

  // ── Book appointment for each selected doctor ─────────────────
  const handleBook = async () => {
    if (selectedCount === 0) { setError('Please select at least one doctor'); return; }
    if (!selectedDate || !selectedTime) { setError('Please select date and time'); return; }
    setBooking(true);
    setError('');

    const toBook = Object.entries(selectedDocs).filter(([, doc]) => doc);
    const results = [];

    for (const [riskKey, doc] of toBook) {
      try {
        const res = await fetch(`${BASE}/api/appointments/book`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_name:     patientData?.name    || 'Patient',
            patient_aadhaar:  patientData?.aadhaar || '',
            patient_phone:    patientData?.phone   || '',
            patient_email:    patientData?.email   || '',
            taluka:           patientData?.taluka  || '',
            doctor_id:        doc._id || doc.id    || '',
            doctor_name:      doc.name,
            doctor_specialty: doc.specialty,
            date:             selectedDate,
            time:             selectedTime,
            notes,
            risk:             Math.round(overallRisk),
            heart_risk:       Math.round(heartRisk),
            diabetes_risk:    Math.round(diabetesRisk),
            obesity_risk:     Math.round(obesityRisk),
            risk_reason:      riskKey,  // which risk triggered this booking
            emergency:        overallRisk > 65,
            priority:         overallRisk > 65 ? 'emergency' : overallRisk > 35 ? 'high' : 'normal',
          }),
        });
        const data = await res.json();
        results.push({ riskKey, doc, success: res.ok, data });
      } catch {
        results.push({ riskKey, doc, success: false, data: null });
      }
    }

    setBookedResults(results);
    const allOk = results.every(r => r.success);
    const anyOk = results.some(r => r.success);

    if (anyOk) {
      setBooked(true);
      if (onBooked) onBooked(results);
    } else {
      setError('All bookings failed. Check server connection.');
    }
    setBooking(false);
  };

  // ── Risk badge ────────────────────────────────────────────────
  const RiskBadge = ({ score, label }) => {
    const c = score > 65 ? '#ef4444' : score > 35 ? '#f59e0b' : '#10b981';
    return (
      <span style={{ background: c+'22', color: c, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${c}44` }}>
        {label}: {score.toFixed(1)}%
      </span>
    );
  };

  // ── SUCCESS SCREEN ────────────────────────────────────────────
  if (booked) return (
    <ModalShell onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '3px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle size={32} color="#16a34a" />
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color: '#1e293b', marginBottom: 4 }}>
          {bookedResults.filter(r => r.success).length} Appointment{bookedResults.filter(r => r.success).length > 1 ? 's' : ''} Booked!
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
          Showing on doctor's dashboard
        </div>

        {/* One card per booked doctor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {bookedResults.map(({ riskKey, doc, success }, i) => (
            <div key={i} style={{ background: success ? '#f8fafc' : '#fef2f2', borderRadius: 14, padding: '14px 16px', border: `1px solid ${success ? '#e2e8f0' : '#fca5a5'}`, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Risk icon */}
                <div style={{ fontSize: 20, flexShrink: 0 }}>
                  {riskKey === 'heart' ? '❤️' : riskKey === 'diabetes' ? '🩸' : riskKey === 'obesity' ? '⚖️' : '🏥'}
                </div>
                {/* Doctor info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>Dr. {doc.name}</div>
                  <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>{doc.specialty}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {selectedDate} · {selectedTime}
                    {doc.taluka && ` · ${doc.taluka}`}
                  </div>
                </div>
                {success
                  ? <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0 }}/>
                  : <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>Failed</span>
                }
              </div>
              {/* Risk reason badge */}
              {riskKey !== 'general' && RISK_DOCTOR_MAP[riskKey] && (
                <div style={{ marginTop: 8, display: 'inline-block', background: RISK_DOCTOR_MAP[riskKey].bg, color: RISK_DOCTOR_MAP[riskKey].color, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 8, textTransform: 'uppercase' }}>
                  {RISK_DOCTOR_MAP[riskKey].icon} {RISK_DOCTOR_MAP[riskKey].label}
                </div>
              )}
            </div>
          ))}
        </div>

        {overallRisk > 65 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#dc2626', fontWeight: 600, marginBottom: 16, textAlign: 'left' }}>
            <AlertTriangle size={13}/> Marked as EMERGENCY — doctors notified
          </div>
        )}

        <button onClick={onClose} style={{ width: '100%', padding: 13, borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#312e81)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          Done
        </button>
      </div>
    </ModalShell>
  );

  // ── TABS: one per active risk ─────────────────────────────────
  const tabs = showGeneral
    ? [{ key: 'general', label: 'General', icon: '🏥', color: '#64748b' }]
    : activeRisks.map(r => ({
        key:   r.key,
        label: r.key === 'heart' ? 'Heart' : r.key === 'diabetes' ? 'Diabetes' : 'Obesity',
        icon:  RISK_DOCTOR_MAP[r.key].icon,
        color: RISK_DOCTOR_MAP[r.key].color,
        score: r.score,
      }));

  const currentDoctors = doctorsByRisk[activeTab] || [];
  const currentMap     = showGeneral ? null : RISK_DOCTOR_MAP[activeTab];

  return (
    <ModalShell onClose={onClose} title="Book Appointment">

      {/* Risk Summary */}
      <div style={{ background: overallRisk>65?'#fef2f2':overallRisk>35?'#fffbeb':'#f0fdf4', borderRadius:14, padding:'12px 16px', marginBottom:16, border:`1px solid ${overallRisk>65?'#fca5a5':overallRisk>35?'#fcd34d':'#86efac'}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' }}>Patient Risk</span>
          <span style={{ fontSize:16, fontWeight:900, color:overallRisk>65?'#ef4444':overallRisk>35?'#f59e0b':'#10b981' }}>{overallRisk.toFixed(1)}% Overall</span>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <RiskBadge score={heartRisk}    label="Heart"/>
          <RiskBadge score={diabetesRisk} label="Diabetes"/>
          <RiskBadge score={obesityRisk}  label="Obesity"/>
        </div>
        {overallRisk > 65 && (
          <div style={{ marginTop:6, fontSize:11, color:'#dc2626', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
            <AlertTriangle size={11}/> Emergency appointment recommended
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:18 }}>
        {[['1','Select Doctors'],['2','Pick Slot'],['3','Confirm']].map(([n,l],i)=>(
          <React.Fragment key={n}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:22,height:22,borderRadius:'50%',background:step>=i+1?'#2563eb':'#f1f5f9',color:step>=i+1?'#fff':'#94a3b8',fontWeight:800,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center' }}>{n}</div>
              <span style={{ fontSize:10, fontWeight:step===i+1?700:500, color:step===i+1?'#1e293b':'#94a3b8', whiteSpace:'nowrap' }}>{l}</span>
            </div>
            {i<2&&<div style={{ flex:1,height:2,background:step>i+1?'#2563eb':'#f1f5f9',borderRadius:2 }}/>}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div style={{ background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,padding:'9px 13px',color:'#dc2626',fontSize:12,fontWeight:600,marginBottom:12 }}>
          ⚠ {error}
        </div>
      )}

      {/* ══ STEP 1: Select Doctors (one per risk tab) ══ */}
      {step === 1 && (
        <div>
          {/* Info line */}
          <div style={{ fontSize:11, color:'#64748b', marginBottom:12, fontWeight:600 }}>
            {activeRisks.length > 1
              ? `${activeRisks.length} risk types detected — select a doctor for each tab`
              : 'Select a doctor for your risk'
            }
          </div>

          {/* Tabs — one per risk */}
          <div style={{ display:'flex', gap:6, marginBottom:16 }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;
              const docChosen = selectedDocs[tab.key];
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ flex:1, padding:'8px 6px', borderRadius:12, border:`2px solid ${isActive ? tab.color : (docChosen ? '#86efac' : '#e2e8f0')}`, background: isActive ? tab.color+'15' : (docChosen ? '#f0fdf4' : '#fff'), cursor:'pointer', transition:'all 0.15s' }}>
                  <div style={{ fontSize:16, marginBottom:2 }}>{tab.icon}</div>
                  <div style={{ fontSize:10, fontWeight:800, color: isActive ? tab.color : (docChosen ? '#16a34a' : '#64748b'), textTransform:'uppercase' }}>{tab.label}</div>
                  {tab.score && <div style={{ fontSize:9, color: isActive ? tab.color : '#94a3b8', fontWeight:600 }}>{tab.score.toFixed(0)}%</div>}
                  {docChosen && <div style={{ fontSize:9, color:'#16a34a', fontWeight:700, marginTop:2 }}>✓ Selected</div>}
                </button>
              );
            })}
          </div>

          {/* Doctor list for active tab */}
          {currentMap && (
            <div style={{ background:currentMap.bg, border:`1px solid ${currentMap.border}`, borderRadius:10, padding:'8px 12px', marginBottom:12, fontSize:11, fontWeight:700, color:currentMap.color }}>
              {currentMap.icon} {currentMap.label} — needs: {currentMap.specialties.join(' or ')}
            </div>
          )}

          <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
            {loadingDocs ? 'Loading...' : `${currentDoctors.length} doctor${currentDoctors.length!==1?'s':''} found`}
          </div>

          {loadingDocs ? (
            <div style={{ padding:30, textAlign:'center', color:'#94a3b8' }}>
              <Loader size={24} style={{ animation:'spin 1s linear infinite', margin:'0 auto 8px', display:'block' }}/>
              <div style={{ fontSize:12 }}>Searching near {patientData?.taluka || 'your area'}...</div>
            </div>
          ) : currentDoctors.length === 0 ? (
            <div style={{ padding:24, textAlign:'center', color:'#94a3b8', border:'1.5px dashed #e2e8f0', borderRadius:12 }}>
              <Stethoscope size={28} style={{ margin:'0 auto 8px', display:'block', opacity:0.3 }}/>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>No {currentMap?.specialties[0] || 'doctors'} found near {patientData?.taluka || 'your area'}</div>
              <div style={{ fontSize:11 }}>Try a different location</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:260, overflowY:'auto', paddingRight:2 }}>
              {currentDoctors.map((doc, i) => {
                const isSelected = selectedDocs[activeTab]?._id === doc._id || selectedDocs[activeTab]?.phone === doc.phone;
                // Check which risk(s) this doctor matches
                const matchedRisks = activeRisks.filter(r =>
                  RISK_DOCTOR_MAP[r.key].specialties.some(s =>
                    (doc.specialty||'').toLowerCase().includes(s.toLowerCase())
                  )
                );
                return (
                  <div key={i} onClick={() => setSelectedDocs(prev => ({
                      ...prev,
                      [activeTab]: isSelected ? null : doc,
                    }))}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 14px', borderRadius:13, cursor:'pointer', border:`2px solid ${isSelected?'#2563eb':'#e2e8f0'}`, background:isSelected?'#eff6ff':'#fff', transition:'all 0.15s' }}>
                    <div style={{ width:42,height:42,borderRadius:11,background:isSelected?'#2563eb':'linear-gradient(135deg,#f1f5f9,#e2e8f0)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:17,color:isSelected?'#fff':'#64748b',flexShrink:0 }}>
                      {(doc.name||'D').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:13, color:'#1e293b' }}>Dr. {doc.name}</div>
                      <div style={{ fontSize:11, color:'#2563eb', fontWeight:700 }}>{doc.specialty}</div>
                      <div style={{ fontSize:10, color:'#94a3b8', marginTop:2, display:'flex', gap:6, flexWrap:'wrap' }}>
                        {doc.taluka&&<span style={{ display:'flex', alignItems:'center', gap:2 }}><MapPin size={9}/>{doc.taluka}</span>}
                        {doc.experience_years&&<span>· {doc.experience_years} yrs</span>}
                        {doc.hospital_timing&&<span>· {doc.hospital_timing}</span>}
                      </div>
                    </div>
                    {/* Multi-risk match badges */}
                    <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0 }}>
                      {matchedRisks.map(r => (
                        <div key={r.key} style={{ background:RISK_DOCTOR_MAP[r.key].bg, color:RISK_DOCTOR_MAP[r.key].color, fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:7, textTransform:'uppercase' }}>
                          {RISK_DOCTOR_MAP[r.key].icon} Match
                        </div>
                      ))}
                    </div>
                    {isSelected
                      ? <CheckCircle size={17} color="#2563eb" style={{ flexShrink:0 }}/>
                      : <div style={{ width:17,height:17,borderRadius:'50%',border:'2px solid #e2e8f0',flexShrink:0 }}/>
                    }
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected summary bar */}
          {selectedCount > 0 && (
            <div style={{ marginTop:12, background:'#eff6ff', borderRadius:12, padding:'10px 14px', border:'1px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1d4ed8' }}>
                {selectedCount} doctor{selectedCount>1?'s':''} selected
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {Object.entries(selectedDocs).filter(([,d])=>d).map(([rk,d])=>(
                  <span key={rk} style={{ background:'#2563eb', color:'#fff', fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:8 }}>
                    {rk==='heart'?'❤️':rk==='diabetes'?'🩸':rk==='obesity'?'⚖️':'🏥'} Dr.{d.name.split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { if (selectedCount > 0) setStep(2); }}
            disabled={selectedCount === 0}
            style={{ width:'100%', marginTop:14, padding:13, borderRadius:12, border:'none', fontWeight:700, fontSize:13, cursor:selectedCount>0?'pointer':'not-allowed', background:selectedCount>0?'linear-gradient(135deg,#1d4ed8,#312e81)':'#e2e8f0', color:selectedCount>0?'#fff':'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            Continue with {selectedCount} doctor{selectedCount!==1?'s':''} <ChevronRight size={16}/>
          </button>
        </div>
      )}

      {/* ══ STEP 2: Date + Time ══ */}
      {step === 2 && (
        <div>
          {/* Selected doctors recap */}
          <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:16 }}>
            {Object.entries(selectedDocs).filter(([,d])=>d).map(([rk,doc])=>(
              <div key={rk} style={{ display:'flex', alignItems:'center', gap:10, background:'#f8fafc', borderRadius:11, padding:'10px 13px', border:'1px solid #e2e8f0' }}>
                <span style={{ fontSize:16 }}>{rk==='heart'?'❤️':rk==='diabetes'?'🩸':rk==='obesity'?'⚖️':'🏥'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:'#1e293b' }}>Dr. {doc.name}</div>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>{doc.specialty}</div>
                </div>
                <div style={{ fontSize:9, fontWeight:800, color:rk==='heart'?'#ef4444':rk==='diabetes'?'#3b82f6':rk==='obesity'?'#f97316':'#64748b', textTransform:'uppercase' }}>
                  {rk==='heart'?'Heart':rk==='diabetes'?'Diabetes':rk==='obesity'?'Obesity':'General'}
                </div>
              </div>
            ))}
            <div style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic', textAlign:'center' }}>
              Same date & time will apply to all selected doctors
            </div>
          </div>

          {/* Date */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:7 }}>Select Date</label>
            <input type="date" value={selectedDate} min={minDate} max={maxDate}
              onChange={e=>setSelectedDate(e.target.value)}
              style={{ width:'100%',padding:'11px 14px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:13,fontWeight:600,outline:'none',color:'#1e293b',cursor:'pointer',boxSizing:'border-box' }}/>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:7 }}>Select Time</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
                {timeSlots.map(t=>(
                  <button key={t} onClick={()=>setSelectedTime(t)}
                    style={{ padding:'7px 3px',borderRadius:9,border:`2px solid ${selectedTime===t?'#2563eb':'#e2e8f0'}`,background:selectedTime===t?'#eff6ff':'#fff',color:selectedTime===t?'#2563eb':'#64748b',fontWeight:selectedTime===t?700:500,fontSize:10,cursor:'pointer',transition:'all 0.12s' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:7 }}>Notes (optional)</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Symptoms, concerns, history..."
              style={{ width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:12,outline:'none',resize:'none',fontFamily:'inherit',color:'#1e293b',minHeight:68,boxSizing:'border-box' }}/>
          </div>

          <div style={{ display:'flex', gap:9 }}>
            <button onClick={()=>setStep(1)} style={{ flex:1,padding:11,borderRadius:11,border:'1.5px solid #e2e8f0',background:'#fff',color:'#64748b',fontWeight:700,fontSize:12,cursor:'pointer' }}>Back</button>
            <button onClick={()=>{ if(selectedDate&&selectedTime) setStep(3); }} disabled={!selectedDate||!selectedTime}
              style={{ flex:2,padding:11,borderRadius:11,border:'none',fontWeight:700,fontSize:12,cursor:selectedDate&&selectedTime?'pointer':'not-allowed',background:selectedDate&&selectedTime?'linear-gradient(135deg,#1d4ed8,#312e81)':'#e2e8f0',color:selectedDate&&selectedTime?'#fff':'#94a3b8',display:'flex',alignItems:'center',justifyContent:'center',gap:7 }}>
              Review <ChevronRight size={15}/>
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 3: Confirm ══ */}
      {step === 3 && (
        <div>
          <div style={{ background:'#f8fafc',borderRadius:16,padding:'16px 18px',border:'1px solid #e2e8f0',marginBottom:16 }}>
            <div style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12 }}>Booking Summary</div>

            {/* Patient + date/time */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {[
                { icon:<User size={12}/>,     label:'Patient', val:patientData?.name||'—' },
                { icon:<MapPin size={12}/>,    label:'Taluka',  val:patientData?.taluka||'—' },
                { icon:<Calendar size={12}/>,  label:'Date',    val:selectedDate },
                { icon:<Clock size={12}/>,     label:'Time',    val:selectedTime },
              ].map((d,i)=>(
                <div key={i} style={{ background:'#fff',borderRadius:9,padding:'9px 11px',border:'1px solid #e2e8f0' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:4,fontSize:9,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',marginBottom:3 }}>{d.icon}{d.label}</div>
                  <div style={{ fontWeight:700,fontSize:12,color:'#1e293b' }}>{d.val}</div>
                </div>
              ))}
            </div>

            {/* One card per selected doctor */}
            <div style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8 }}>Appointments to be booked</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {Object.entries(selectedDocs).filter(([,d])=>d).map(([rk,doc])=>{
                const map = rk !== 'general' ? RISK_DOCTOR_MAP[rk] : null;
                return (
                  <div key={rk} style={{ display:'flex', alignItems:'center', gap:10, background:'#fff', borderRadius:12, padding:'12px 14px', border:`1.5px solid ${map?map.border:'#e2e8f0'}` }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{rk==='heart'?'❤️':rk==='diabetes'?'🩸':rk==='obesity'?'⚖️':'🏥'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800,fontSize:13,color:'#1e293b' }}>Dr. {doc.name}</div>
                      <div style={{ fontSize:11,color:'#2563eb',fontWeight:600 }}>{doc.specialty}</div>
                      {doc.taluka&&<div style={{ fontSize:10,color:'#94a3b8',marginTop:2,display:'flex',alignItems:'center',gap:3 }}><MapPin size={9}/>{doc.taluka}</div>}
                    </div>
                    {map&&<div style={{ background:map.bg,color:map.color,fontSize:9,fontWeight:800,padding:'3px 8px',borderRadius:8,textTransform:'uppercase',flexShrink:0 }}>{map.icon} {map.label.split(' ')[0]}</div>}
                  </div>
                );
              })}
            </div>

            {/* Risk badges */}
            <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:12 }}>
              <RiskBadge score={heartRisk}    label="Heart"/>
              <RiskBadge score={diabetesRisk} label="Diabetes"/>
              <RiskBadge score={obesityRisk}  label="Obesity"/>
            </div>

            {overallRisk > 65 && (
              <div style={{ marginTop:10,background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:9,padding:'9px 12px',display:'flex',alignItems:'center',gap:7,fontSize:11,color:'#dc2626',fontWeight:700 }}>
                <AlertTriangle size={13}/> Will be marked EMERGENCY on doctor's dashboard
              </div>
            )}
            {notes&&<div style={{ marginTop:10,background:'#eff6ff',borderRadius:9,padding:'9px 12px',border:'1px solid #bfdbfe',fontSize:11,color:'#1e40af' }}><b>Notes:</b> {notes}</div>}
          </div>

          <div style={{ display:'flex', gap:9 }}>
            <button onClick={()=>setStep(2)} style={{ flex:1,padding:11,borderRadius:11,border:'1.5px solid #e2e8f0',background:'#fff',color:'#64748b',fontWeight:700,fontSize:12,cursor:'pointer' }}>Back</button>
            <button onClick={handleBook} disabled={booking}
              style={{ flex:2,padding:13,borderRadius:11,border:'none',fontWeight:800,fontSize:13,cursor:booking?'default':'pointer',background:'linear-gradient(135deg,#1d4ed8,#312e81)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:7,boxShadow:'0 4px 14px rgba(29,78,216,0.35)' }}>
              {booking
                ?<><Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> Booking {selectedCount}...</>
                :<><CheckCircle size={14}/> Confirm {selectedCount} Appointment{selectedCount>1?'s':''}</>
              }
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </ModalShell>
  );
}

function ModalShell({ children, onClose, title }) {
  return (
    <div onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}
      style={{ position:'fixed',inset:0,background:'rgba(15,23,42,0.7)',zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)',padding:16 }}>
      <div style={{ background:'#fff',borderRadius:24,padding:26,width:'100%',maxWidth:520,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 30px 80px rgba(0,0,0,0.3)',animation:'slideUp 0.25s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#1d4ed8,#312e81)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Stethoscope size={17} color="#fff"/>
            </div>
            <div>
              <div style={{ fontWeight:800,fontSize:15,color:'#1e293b' }}>{title||'Book Appointment'}</div>
              <div style={{ fontSize:10,color:'#94a3b8' }}>GraminSetu Health Network</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <X size={13} color="#64748b"/>
          </button>
        </div>
        {children}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}