import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  Search, Bell, ChevronLeft, ChevronRight,
  Plus, Trash2, Save, Check, X, Activity, User,
  Calendar, Pill, Stethoscope, Mail, Send, Loader,
  CheckCircle, AlertTriangle, Clock, CalendarDays,
  ShieldAlert, LogOut, Heart, Droplets, Zap,
  RefreshCw, Menu, Filter, TrendingUp, TrendingDown,
  Eye, BarChart2, Radio
} from 'lucide-react';

const today    = new Date();
const todayISO = today.toISOString().split('T')[0];
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const BASE     = 'http://localhost:5000';

function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m)   { return new Date(y,m,1).getDay(); }
function ymd(offset=0){ const d=new Date(today); d.setDate(d.getDate()+offset); return d.toISOString().split('T')[0]; }

const riskColor = r => r>65?'#ef4444':r>33?'#f59e0b':'#10b981';
const riskLabel = r => r>65?'High':r>33?'Moderate':'Low';
const statusColor = { Done:'#10b981',Ongoing:'#3b82f6',Pending:'#94a3b8',Accepted:'#10b981',Rejected:'#ef4444',Emergency:'#ef4444' };

function computeOverallRisk(entry) {
  if (!entry?.results) return 0;
  const r  = entry.results;
  const ha = parseFloat(r.heart_attack?.percentage) || 0;
  const ob = parseFloat(r.obesity?.percentage)      || 0;
  const di = parseFloat(r.diabetes?.percentage)     || 0;
  return parseFloat(((ha+ob+di)/3).toFixed(1));
}
function getLatest(patient) {
  if (!patient?.history?.length) return null;
  return [...patient.history].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))[0];
}

// ─── Custom Tooltip ───────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:'#1e293b',borderRadius:10,padding:'8px 12px',border:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.3)'}}>
      <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{fontSize:12,fontWeight:700,color:p.color||'#fff'}}>
          {p.name}: {p.value}{unit||''}
        </div>
      ))}
    </div>
  );
};

export default function DoctorDashboard() {
  const { aadhaar: urlAadhaar } = useParams();
  const navigate = useNavigate();

  const [activeNav,    setActiveNav]    = useState('dashboard');
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [calYear,      setCalYear]      = useState(today.getFullYear());
  const [calMonth,     setCalMonth]     = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [toast,        setToast]        = useState(null);

  // Chart filters
  const [chartType,    setChartType]    = useState('area');   // area | line | bar
  const [riskFilter,   setRiskFilter]   = useState('all');    // all | heart | diabetes | obesity | overall
  const [vitalFilter,  setVitalFilter]  = useState('all');    // all | bp | sugar | cholesterol | bmi

  const showToast = useCallback((type,msg)=>{ setToast({type,msg}); setTimeout(()=>setToast(null),3500); },[]);

  const [doctorInfo, setDoctorInfo] = useState({ name:'',specialty:'Physician',taluka:'' });
  const [doctorNameOverride, setDoctorNameOverride] = useState('');  // manual fallback
  useEffect(()=>{
    // Try every possible key your app.py login might store under
    const raw = localStorage.getItem('doctor_user_data')
      || localStorage.getItem('asha_user_data')
      || localStorage.getItem('user_data')
      || localStorage.getItem('userData')
      || localStorage.getItem('currentUser');

    if(raw){
      try{
        const u = JSON.parse(raw);
        // u might be { user: {...} } or flat { name, role, ... }
        const d = u.user || u.doctor || u;
        const name = d.name || d.doctor_name || d.fullName || d.username || '';
        const specialty = d.specialty || d.speciality || d.role || d.designation || 'Physician';
        const taluka = d.taluka || d.village || d.location || '';
        setDoctorInfo({ name, specialty, taluka });
      }catch{}
    }

    // ALSO: scan ALL localStorage keys for any object that has a name + role=doctor
    if(!localStorage.getItem('doctor_user_data')){
      for(let i=0;i<localStorage.length;i++){
        const key = localStorage.key(i);
        try{
          const val = JSON.parse(localStorage.getItem(key)||'');
          const d = val?.user || val?.doctor || val;
          if(d?.name && (d?.role==='doctor'||d?.specialty||d?.speciality)){
            setDoctorInfo({
              name: d.name||'',
              specialty: d.specialty||d.speciality||d.role||'Physician',
              taluka: d.taluka||d.village||'',
            });
            break;
          }
        }catch{}
      }
    }
  },[]);

  const [appointments,  setAppointments]  = useState([]);
  const [aptsLoading,   setAptsLoading]   = useState(true);
  const [selectedApt,   setSelectedApt]   = useState(null);

  const [patient,       setPatient]       = useState(null);
  const [medicines,     setMedicines]     = useState([]);
  const [notes,         setNotes]         = useState('');
  const [searchQuery,   setSearchQuery]   = useState(urlAadhaar||'');
  const [ptLoading,     setPtLoading]     = useState(false);
  const [searchError,   setSearchError]   = useState('');

  const [showFollowup,  setShowFollowup]  = useState(false);
  const [followupData,  setFollowupData]  = useState({ notes:'',nextVisit:'',tests:'',lang:'en' });
  const [emailLoading,  setEmailLoading]  = useState(false);
  const [emailSentIds,  setEmailSentIds]  = useState(new Set());

  const [allPatients,   setAllPatients]   = useState([]);
  const [allPtLoading,  setAllPtLoading]  = useState(false);

  useEffect(()=>{ fetchAppointments(); fetchAllPatients(); },[]);
  useEffect(()=>{ if(urlAadhaar) fetchPatient(urlAadhaar); },[urlAadhaar]);

  const fetchAppointments = async ()=>{
    setAptsLoading(true);
    try{
      const res  = await fetch(`${BASE}/api/doctor/appointments`);
      const data = await res.json();
      if(res.ok){ const list=Array.isArray(data)?data:(data.appointments||[]); setAppointments(list.map(a=>({...a,id:a._id||a.id||'',date:(a.date||'').toString().split('T')[0]}))); }
    }catch{ showToast('error','Could not load appointments'); }
    finally{ setAptsLoading(false); }
  };

  const fetchAllPatients = async ()=>{
    setAllPtLoading(true);
    try{
      const res  = await fetch(`${BASE}/api/doctor/patients`);
      const data = await res.json();
      if(res.ok) setAllPatients(Array.isArray(data)?data:(data.patients||[]));
    }catch{}
    finally{ setAllPtLoading(false); }
  };

  const fetchPatient = async (aadhaar)=>{
    setPtLoading(true); setSearchError(''); setPatient(null);
    try{
      const res  = await fetch(`${BASE}/api/patient/${aadhaar}`);
      const data = await res.json();
      if(res.ok){
        const enriched = {
          ...data,
          genderLabel: (data.gender==='2'||data.gender===2)?'Male':'Female',
          history: [...(data.history||[])].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).map(h=>({...h,overallRisk:computeOverallRisk(h)})),
        };
        setPatient(enriched);
        const latest = enriched.history[0];
        setMedicines(latest?.prescriptions?.[latest.prescriptions.length-1]?.medicines || data.prescriptions || []);
        setNotes(latest?.prescriptions?.[latest.prescriptions.length-1]?.notes || data.doctor_notes || '');
      } else { setSearchError(data.message||'Patient not found'); }
    }catch{ setSearchError('Server error — is Flask running on port 5000?'); }
    finally{ setPtLoading(false); }
  };

  const handleSearch = e=>{
    e.preventDefault();
    const q=searchQuery.replace(/\D/g,'').slice(0,12);
    if(q.length===12){ navigate(`/doctor/dashboard/${q}`); fetchPatient(q); }
    else setSearchError('Enter a valid 12-digit Aadhaar number');
  };

  const updateAptStatus = async (id,status)=>{
    try{
      await fetch(`${BASE}/api/doctor/appointment/${id}/status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    }catch{}
    setAppointments(prev=>prev.map(a=>(a.id===id||a._id===id)?{...a,status}:a));
    if(selectedApt?.id===id||selectedApt?._id===id) setSelectedApt(p=>({...p,status}));
    showToast('success', status==='Accepted'?'Appointment accepted':'Appointment rejected');
  };

  const savePrescription = async ()=>{
    if(!patient){ showToast('error','No patient loaded'); return; }
    if(medicines.length===0){ showToast('error','Add at least one medicine'); return; }
    try{
      const res = await fetch(`${BASE}/api/doctor/update-medicine`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ aadhaar:searchQuery.replace(/\D/g,''), medicines, notes, doctor_name: doctorNameOverride || doctorInfo.name || 'Doctor' }),
      });
      const data = await res.json();
      if(res.ok){ showToast('success','✅ Prescription saved!'); fetchPatient(searchQuery.replace(/\D/g,'')); }
      else showToast('error', data.message||data.error||'Save failed — check Flask console');
    }catch(e){ showToast('error','Connection failed: '+e.message); }
  };

  const sendFollowupEmail = async ()=>{
    const email=patient?.email?.trim();
    if(!email){ showToast('error','No email on record'); return; }
    setEmailLoading(true);
    const latest=getLatest(patient), vitals=latest?.vitals||{}, results=latest?.results||{}, calc=latest?._calculated||{};
    try{
      const res = await fetch(`${BASE}/api/send-report-email`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          email, lang:followupData.lang||'en', overallScore:latest?.overallRisk||0,
          patientData:{ name:patient.name, aadhaar:patient.aadhaar, village:patient.village||'', taluka:patient.taluka||'',
            ap_hi:vitals.ap_hi||0, ap_lo:vitals.ap_lo||0, glucose_mg:vitals.glucose_mg||0,
            cholesterol_mg:vitals.cholesterol_mg||0, weight:vitals.weight||0, height:vitals.height||0,
            results:{ heartRisk:results.heart_attack?.probability||0, diabetesRisk:results.diabetes?.probability||0, obesityRisk:results.obesity?.probability||0 },
          },
          doctor_notes:followupData.notes, next_visit:followupData.nextVisit,
          tests_ordered:followupData.tests?followupData.tests.split(',').map(t=>t.trim()).filter(Boolean):[],
          medicines,
        }),
      });
      const data=await res.json();
      if(data.status==='success'){
        const aptId=selectedApt?.id||selectedApt?._id;
        if(aptId){ setEmailSentIds(prev=>new Set([...prev,aptId])); updateAptStatus(aptId,'Done'); }
        setShowFollowup(false); setFollowupData({notes:'',nextVisit:'',tests:'',lang:'en'});
        showToast('success',`Report sent to ${email}`);
      } else showToast('error',data.message||'Email failed');
    }catch{ showToast('error','Connection failed'); }
    finally{ setEmailLoading(false); }
  };

  // ─── Derived ─────────────────────────────────────────────────────
  const daysInMonth   = getDaysInMonth(calYear,calMonth);
  const firstDay      = getFirstDay(calYear,calMonth);
  const aptDates      = new Set(appointments.map(a=>a.date?.split('T')[0]));
  const filteredApts  = appointments.filter(a=>a.date?.split('T')[0]===selectedDate);
  const yesterdayApts = appointments.filter(a=>a.date?.split('T')[0]===ymd(-1));
  const tomorrowApts  = appointments.filter(a=>a.date?.split('T')[0]===ymd(1));
  const emergencyApts = appointments.filter(a=>a.emergency===true||a.priority==='emergency');

  const latestEntry   = patient?getLatest(patient):null;
  const latestVitals  = latestEntry?.vitals||{};
  const latestCalc    = latestEntry?._calculated||{};
  const latestResults = latestEntry?.results||{};
  const overallRisk   = latestEntry?.overallRisk||0;

  // BMI: comes from _calculated.bmi (fixed!)
  const bmi      = latestCalc?.bmi;
  const bmiLabel = latestCalc?.bmiInfo?.label||'';
  const bmiColor = latestCalc?.bmiInfo?.color||'#10b981';

  // ─── Multi-visit chart data ───────────────────────────────────────
  const allVisitsData = useMemo(()=>{
    if(!patient?.history) return [];
    return [...patient.history]
      .sort((a,b)=>new Date(a.date||0)-new Date(b.date||0))
      .map((h,i)=>({
        visit:`V${i+1}`,
        date: h.date?.split('T')[0]||'',
        // Vitals
        glucose:     parseFloat(h.vitals?.glucose_mg)    ||0,
        ap_hi:       parseFloat(h.vitals?.ap_hi)         ||0,
        ap_lo:       parseFloat(h.vitals?.ap_lo)         ||0,
        cholesterol: parseFloat(h.vitals?.cholesterol_mg)||0,
        // BMI from _calculated
        bmi:         parseFloat(h._calculated?.bmi)      ||0,
        weight:      parseFloat(h.vitals?.weight)        ||0,
        // Risk scores from DB (stored percentages)
        heartRisk:   parseFloat(h.results?.heart_attack?.percentage)||0,
        diabetesRisk:parseFloat(h.results?.diabetes?.percentage)    ||0,
        obesityRisk: parseFloat(h.results?.obesity?.percentage)     ||0,
        overallRisk: h.overallRisk||0,
      }));
  },[patient]);

  // Filtered risk data
  const riskChartData = useMemo(()=>{
    if(riskFilter==='all') return allVisitsData;
    return allVisitsData; // filter applies per-series in render
  },[allVisitsData, riskFilter]);

  // Radar data for latest visit
  const radarData = useMemo(()=>[
    { subject:'Heart Risk',    A:latestResults.heart_attack?.percentage||0 },
    { subject:'Diabetes',      A:latestResults.diabetes?.percentage||0 },
    { subject:'Obesity',       A:latestResults.obesity?.percentage||0 },
    { subject:'BP',            A:Math.min(100,((parseFloat(latestVitals.ap_hi)||0)/200)*100) },
    { subject:'Sugar',         A:Math.min(100,((parseFloat(latestVitals.glucose_mg)||0)/300)*100) },
    { subject:'BMI Risk',      A:Math.min(100,((parseFloat(bmi)||0)/40)*100) },
  ],[latestResults,latestVitals,bmi]);

  const navItems=[
    {id:'dashboard',icon:<Activity size={16}/>,   label:'Dashboard'},
    {id:'analytics',icon:<BarChart2 size={16}/>,  label:'Analytics'},
    {id:'patients', icon:<User size={16}/>,        label:'Patients'},
    {id:'calendar', icon:<Calendar size={16}/>,    label:'Calendar'},
    {id:'medicine', icon:<Pill size={16}/>,        label:'Medicine'},
    {id:'diagnosis',icon:<Stethoscope size={16}/>, label:'Diagnosis'},
  ];

  const ChartWrapper = ({children, h=130}) => (
    <div style={{height:h}}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
  );

  const renderRiskChart = (dataKey, color, title, unit='%') => {
    const commonProps = { data:allVisitsData, type:"monotone", dataKey, stroke:color, strokeWidth:2.5 };
    if(chartType==='bar') return (
      <ChartWrapper>
        <BarChart data={allVisitsData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
          <XAxis dataKey="visit" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
          <YAxis hide domain={[0,100]}/>
          <Tooltip content={<CustomTooltip unit={unit}/>}/>
          <Bar dataKey={dataKey} fill={color} radius={[4,4,0,0]} name={title}/>
        </BarChart>
      </ChartWrapper>
    );
    if(chartType==='line') return (
      <ChartWrapper>
        <LineChart data={allVisitsData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
          <XAxis dataKey="visit" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
          <YAxis hide domain={[0,100]}/>
          <Tooltip content={<CustomTooltip unit={unit}/>}/>
          <Line {...commonProps} dot={{r:4,fill:color,strokeWidth:0}} activeDot={{r:6}} name={title}/>
        </LineChart>
      </ChartWrapper>
    );
    return (
      <ChartWrapper>
        <AreaChart data={allVisitsData}>
          <defs><linearGradient id={`g_${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.2}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
          <XAxis dataKey="visit" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
          <YAxis hide domain={[0,100]}/>
          <Tooltip content={<CustomTooltip unit={unit}/>}/>
          <Area {...commonProps} fill={`url(#g_${dataKey})`} dot={{r:3,fill:color,strokeWidth:0}} activeDot={{r:5}} name={title}/>
        </AreaChart>
      </ChartWrapper>
    );
  };

  const renderVitalChart = (dataKey, color, limit, unit) => {
    const commonProps = { data:allVisitsData, type:"monotone", dataKey, stroke:color, strokeWidth:2.5 };
    if(chartType==='bar') return (
      <ChartWrapper>
        <BarChart data={allVisitsData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
          <XAxis dataKey="visit" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
          <YAxis hide/><Tooltip content={<CustomTooltip unit={unit}/>}/>
          <ReferenceLine y={limit} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}/>
          <Bar dataKey={dataKey} fill={color} radius={[4,4,0,0]}/>
        </BarChart>
      </ChartWrapper>
    );
    if(chartType==='line') return (
      <ChartWrapper>
        <LineChart data={allVisitsData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
          <XAxis dataKey="visit" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
          <YAxis hide/><Tooltip content={<CustomTooltip unit={unit}/>}/>
          <ReferenceLine y={limit} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}/>
          <Line {...commonProps} dot={{r:3,fill:color,strokeWidth:0}} activeDot={{r:5}}/>
        </LineChart>
      </ChartWrapper>
    );
    return (
      <ChartWrapper>
        <AreaChart data={allVisitsData}>
          <defs><linearGradient id={`gv_${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.15}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
          <XAxis dataKey="visit" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
          <YAxis hide/><Tooltip content={<CustomTooltip unit={unit}/>}/>
          <ReferenceLine y={limit} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}/>
          <Area {...commonProps} fill={`url(#gv_${dataKey})`} dot={{r:3,fill:color,strokeWidth:0}} activeDot={{r:5}}/>
        </AreaChart>
      </ChartWrapper>
    );
  };

  // Combined risk chart (all 3 risks on one graph)
  const renderCombinedRiskChart = () => (
    <ChartWrapper h={160}>
      <AreaChart data={allVisitsData}>
        <defs>
          {[['heart','#ef4444'],['diabetes','#3b82f6'],['obesity','#f97316']].map(([k,c])=>(
            <linearGradient key={k} id={`gc_${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={c} stopOpacity={0.15}/><stop offset="95%" stopColor={c} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
        <XAxis dataKey="visit" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
        <YAxis hide domain={[0,100]}/>
        <Tooltip content={<CustomTooltip unit="%"/>}/>
        <Legend wrapperStyle={{fontSize:10,color:'#64748b'}}/>
        {(riskFilter==='all'||riskFilter==='heart')     && <Area type="monotone" dataKey="heartRisk"    stroke="#ef4444" strokeWidth={2} fill="url(#gc_heart)"    dot={false} name="Heart"    activeDot={{r:4}}/>}
        {(riskFilter==='all'||riskFilter==='diabetes')  && <Area type="monotone" dataKey="diabetesRisk" stroke="#3b82f6" strokeWidth={2} fill="url(#gc_diabetes)" dot={false} name="Diabetes" activeDot={{r:4}}/>}
        {(riskFilter==='all'||riskFilter==='obesity')   && <Area type="monotone" dataKey="obesityRisk"  stroke="#f97316" strokeWidth={2} fill="url(#gc_obesity)"  dot={false} name="Obesity"  activeDot={{r:4}}/>}
        {(riskFilter==='all'||riskFilter==='overall')   && <Line type="monotone" dataKey="overallRisk"  stroke="#8b5cf6" strokeWidth={2.5} dot={{r:3,fill:'#8b5cf6',strokeWidth:0}} name="Overall" activeDot={{r:5}}/>}
      </AreaChart>
    </ChartWrapper>
  );

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f0f4ff',fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>

      {/* SIDEBAR */}
      <aside style={{width:sidebarOpen?224:60,background:'#0f172a',display:'flex',flexDirection:'column',transition:'width 0.2s ease',overflow:'hidden',flexShrink:0}}>
        <div style={{padding:'20px 14px',borderBottom:'1px solid #1e293b',display:'flex',alignItems:'center',gap:10,height:64}}>
          <div style={{width:34,height:34,background:'linear-gradient(135deg,#3b82f6,#6366f1)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Activity size={16} color="#fff"/></div>
          {sidebarOpen&&<div style={{overflow:'hidden'}}><div style={{fontWeight:800,fontSize:13,color:'#f8fafc',whiteSpace:'nowrap'}}>GraminSetu</div><div style={{fontSize:9,color:'#475569',letterSpacing:'1px',textTransform:'uppercase'}}>Doctor Portal</div></div>}
        </div>
        <nav style={{flex:1,padding:'12px 8px'}}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>setActiveNav(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 12px',justifyContent:sidebarOpen?'flex-start':'center',borderRadius:10,border:'none',cursor:'pointer',background:activeNav===n.id?'#1d4ed8':'transparent',color:activeNav===n.id?'#fff':'#64748b',fontWeight:activeNav===n.id?700:500,fontSize:13,marginBottom:2,transition:'all 0.15s',whiteSpace:'nowrap'}}>
              {n.icon}{sidebarOpen&&<span>{n.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:'12px 14px',borderTop:'1px solid #1e293b'}}>
          {sidebarOpen?(
            <>
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div style={{width:34,height:34,borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:13}}>{(doctorInfo.name||'D').charAt(0).toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#f8fafc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Dr. {doctorInfo.name||'Doctor'}</div>
                  <div style={{fontSize:10,color:'#475569',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doctorInfo.specialty}{doctorInfo.taluka?` · ${doctorInfo.taluka}`:''}</div>
                </div>
              </div>
              <button onClick={()=>{localStorage.clear();navigate('/login');}} style={{width:'100%',marginTop:10,padding:'7px',borderRadius:8,border:'none',background:'#1e293b',color:'#f87171',fontWeight:700,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><LogOut size={12}/> Logout</button>
            </>
          ):(
            <div style={{display:'flex',justifyContent:'center'}}><div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:12}}>{(doctorInfo.name||'D').charAt(0).toUpperCase()}</div></div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
        <header style={{background:'#fff',borderBottom:'1px solid #e8ecf4',padding:'10px 20px',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:9}}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{width:34,height:34,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Menu size={14} color="#64748b"/></button>
          <form onSubmit={handleSearch} style={{flex:1,display:'flex',alignItems:'center',gap:8,background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:12,padding:'7px 13px'}}>
            <Search size={14} color="#94a3b8"/>
            <input value={searchQuery} onChange={e=>{setSearchQuery(e.target.value.replace(/\D/g,'').slice(0,12));setSearchError('');}} placeholder="Search patient by 12-digit Aadhaar..." style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:13,fontWeight:500,color:'#1e293b'}}/>
            {ptLoading?<Loader size={14} color="#94a3b8" style={{animation:'spin 1s linear infinite'}}/>:<button type="submit" style={{background:'#1d4ed8',color:'#fff',border:'none',borderRadius:7,padding:'4px 12px',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>Search</button>}
          </form>
          <button onClick={()=>{fetchAppointments();fetchAllPatients();}} title="Refresh" style={{width:34,height:34,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><RefreshCw size={14} color="#64748b"/></button>
          <button style={{width:34,height:34,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Bell size={14} color="#64748b"/>
            {appointments.filter(a=>!a.status||a.status==='Pending').length>0&&<span style={{position:'absolute',top:7,right:7,width:7,height:7,background:'#ef4444',borderRadius:'50%',border:'1.5px solid #fff'}}/>}
          </button>
        </header>

        {searchError&&<div style={{margin:'10px 20px 0',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,padding:'9px 14px',color:'#dc2626',fontSize:12,fontWeight:600}}>⚠ {searchError}</div>}

        <div style={{flex:1,overflowY:'auto',padding:'18px 20px'}}>

          {/* ══ DASHBOARD ══ */}
          {activeNav==='dashboard'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 286px',gap:18}}>
              <div style={{display:'flex',flexDirection:'column',gap:18}}>

                {/* Stats */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
                  {[
                    {label:"Today's Apts",value:filteredApts.length,       sub:'scheduled',    color:'#2563eb',bg:'#eff6ff',icon:<Calendar size={18} color="#2563eb"/>},
                    {label:'High Risk',   value:appointments.filter(a=>(a.risk||0)>65).length,sub:'patients',color:'#ef4444',bg:'#fef2f2',icon:<ShieldAlert size={18} color="#ef4444"/>},
                    {label:'Completed',   value:appointments.filter(a=>a.status==='Done').length,sub:'done',color:'#10b981',bg:'#f0fdf4',icon:<CheckCircle size={18} color="#10b981"/>},
                  ].map((s,i)=>(
                    <div key={i} style={{background:'#fff',borderRadius:16,padding:'16px 18px',border:'1px solid #e8ecf4',display:'flex',alignItems:'center',gap:14}}>
                      <div style={{width:44,height:44,borderRadius:12,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{s.icon}</div>
                      <div>
                        <div style={{fontSize:28,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
                        <div style={{fontSize:11,color:'#1e293b',fontWeight:700,marginTop:2}}>{s.label}</div>
                        <div style={{fontSize:10,color:'#94a3b8'}}>{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {patient&&(
                  <>
                    {/* Patient banner */}
                    <div style={{background:'linear-gradient(135deg,#1d4ed8,#312e81)',borderRadius:20,padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',color:'#fff'}}>
                      <div style={{display:'flex',alignItems:'center',gap:16}}>
                        <div style={{width:54,height:54,borderRadius:15,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900}}>{(patient.name||'?').charAt(0).toUpperCase()}</div>
                        <div>
                          <div style={{fontWeight:800,fontSize:18}}>{patient.name}</div>
                          <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginTop:3}}>{patient.genderLabel} · DOB: {patient.dob} · Age: {latestCalc?.age||'—'}</div>
                          {patient.email&&<div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:2}}>{patient.email}</div>}
                        </div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:42,fontWeight:900,lineHeight:1,color:overallRisk>65?'#fca5a5':overallRisk>33?'#fcd34d':'#6ee7b7'}}>{overallRisk}%</div>
                        <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'0.8px'}}>AI Risk Score</div>
                        <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.7)',marginTop:2}}>{riskLabel(overallRisk)} · {patient.history?.length||0} visits</div>
                      </div>
                    </div>

                    {/* Risk bars */}
                    <div style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1px solid #e8ecf4',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20}}>
                      {[
                        {label:'Cardiovascular',pct:latestResults.heart_attack?.percentage||0,color:'#ef4444',dbLabel:latestResults.heart_attack?.label||''},
                        {label:'Diabetes',      pct:latestResults.diabetes?.percentage||0,     color:'#3b82f6',dbLabel:latestResults.diabetes?.label||''},
                        {label:'Obesity',       pct:latestResults.obesity?.percentage||0,      color:'#f97316',dbLabel:latestResults.obesity?.label||''},
                      ].map((r,i)=>(
                        <div key={i}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><span style={{fontSize:11,fontWeight:700,color:r.color}}>{r.label}</span><span style={{fontSize:17,fontWeight:900,color:r.color}}>{r.pct}%</span></div>
                          <div style={{height:8,background:'#f1f5f9',borderRadius:10,overflow:'hidden'}}><div style={{height:'100%',width:`${r.pct}%`,background:r.color,borderRadius:10,transition:'width 0.8s ease'}}/></div>
                          <div style={{fontSize:10,color:'#94a3b8',marginTop:3}}>{r.dbLabel}</div>
                        </div>
                      ))}
                    </div>

                    {/* Vitals — BMI from _calculated */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
                      {[
                        {label:'BMI',         val:bmi,                        unit:'kg/m²', limit:25, info:bmiLabel, infoColor:bmiColor},
                        {label:'Systolic BP', val:latestVitals.ap_hi,         unit:'mmHg',  limit:130},
                        {label:'Diastolic BP',val:latestVitals.ap_lo,         unit:'mmHg',  limit:90},
                        {label:'Blood Sugar', val:latestVitals.glucose_mg,    unit:'mg/dL', limit:140},
                        {label:'Cholesterol', val:latestVitals.cholesterol_mg,unit:'mg/dL', limit:200},
                      ].map((v,i)=>{
                        const isHigh=(parseFloat(v.val)||0)>v.limit;
                        return(
                          <div key={i} style={{background:isHigh?'#fef2f2':'#fff',borderRadius:14,padding:'12px 14px',border:`1px solid ${isHigh?'#fca5a5':'#e2e8f0'}`}}>
                            <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>{v.label}</div>
                            <div style={{fontSize:20,fontWeight:900,color:isHigh?'#dc2626':'#1e293b'}}>{v.val??'—'}</div>
                            <div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{v.unit}</div>
                            {v.info&&<div style={{fontSize:9,fontWeight:700,color:v.infoColor||'#10b981',marginTop:3,textTransform:'uppercase'}}>{v.info}</div>}
                            {isHigh&&<div style={{fontSize:9,fontWeight:700,color:'#ef4444',marginTop:2}}>↑ HIGH</div>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Extra calculated fields */}
                    {(latestCalc.pulse_pressure||latestCalc.map_val)&&(
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                        {[
                          {label:'Pulse Pressure',val:latestCalc.pulse_pressure,unit:'mmHg'},
                          {label:'MAP',           val:latestCalc.map_val,        unit:'mmHg'},
                          {label:'Hypertension',  val:latestCalc.hypertension?'Yes':'No', unit:'', warn:latestCalc.hypertension},
                        ].map((v,i)=>(
                          <div key={i} style={{background:v.warn?'#fef2f2':'#fff',borderRadius:12,padding:'10px 14px',border:`1px solid ${v.warn?'#fca5a5':'#e2e8f0'}`}}>
                            <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>{v.label}</div>
                            <div style={{fontSize:18,fontWeight:900,color:v.warn?'#dc2626':'#1e293b'}}>{v.val??'—'}</div>
                            {v.unit&&<div style={{fontSize:9,color:'#94a3b8'}}>{v.unit}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Prescription */}
                    <div style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1px solid #e8ecf4'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                        <div style={{fontWeight:800,fontSize:13,color:'#1e293b',display:'flex',alignItems:'center',gap:7}}><Pill size={15} color="#2563eb"/> Prescription</div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {/* Doctor name — shows auto-detected or allows manual entry */}
                          <div style={{display:'flex',alignItems:'center',gap:6,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'4px 10px'}}>
                            <User size={11} color="#94a3b8"/>
                            <input
                              value={doctorNameOverride || doctorInfo.name}
                              onChange={e=>setDoctorNameOverride(e.target.value)}
                              placeholder="Doctor name"
                              style={{border:'none',background:'transparent',fontSize:11,fontWeight:600,outline:'none',color:'#1e293b',width:120}}
                            />
                          </div>
                          <button onClick={()=>setMedicines(m=>[...m,{name:'',dosage:''}])} style={{background:'#eff6ff',color:'#2563eb',border:'none',padding:'5px 12px',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><Plus size={13}/> Add Med</button>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:18}}>
                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                          {medicines.length===0&&<div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12,border:'1.5px dashed #e2e8f0',borderRadius:10}}>No medicines yet — click "+ Add Med"</div>}
                          {medicines.map((m,i)=>(
                            <div key={i} style={{display:'flex',gap:10,background:'#f8fafc',padding:'10px 14px',borderRadius:12,alignItems:'center',border:'1px solid #e2e8f0'}}>
                              <Pill size={13} color="#94a3b8"/>
                              <input value={m.name} onChange={e=>{const n=[...medicines];n[i].name=e.target.value;setMedicines(n);}} placeholder="Medicine name" style={{flex:2,border:'none',background:'transparent',fontSize:13,fontWeight:600,outline:'none',color:'#1e293b'}}/>
                              <input value={m.dosage} onChange={e=>{const n=[...medicines];n[i].dosage=e.target.value;setMedicines(n);}} placeholder="Dosage" style={{flex:1,border:'none',background:'transparent',fontSize:12,outline:'none',color:'#64748b'}}/>
                              <Trash2 size={14} color="#fca5a5" style={{cursor:'pointer',flexShrink:0}} onClick={()=>setMedicines(medicines.filter((_,idx)=>idx!==i))}/>
                            </div>
                          ))}
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:10}}>
                          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Clinical notes..." style={{flex:1,padding:12,borderRadius:12,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:12,outline:'none',resize:'none',fontFamily:'inherit',minHeight:90,color:'#1e293b'}}/>
                          <button onClick={savePrescription} style={{padding:'11px',borderRadius:11,background:'linear-gradient(135deg,#1d4ed8,#312e81)',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}><Save size={13}/> Save & Finalise Prescription</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <AppointmentsTable title={selectedDate===todayISO?"Today's Appointments":`Appointments — ${selectedDate}`} apts={filteredApts} loading={aptsLoading}
                  onSelect={apt=>{setSelectedApt(apt);if(apt.aadhaar)fetchPatient(apt.aadhaar);}}
                  selectedApt={selectedApt} onUpdate={updateAptStatus} riskColor={riskColor} riskLabel={riskLabel} statusColor={statusColor}/>
              </div>

              {/* RIGHT */}
              <div style={{display:'flex',flexDirection:'column',gap:18}}>
                <MiniCalendar calYear={calYear} calMonth={calMonth} setCalYear={setCalYear} setCalMonth={setCalMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} aptDates={aptDates} daysInMonth={daysInMonth} firstDay={firstDay}/>
                {selectedApt&&(
                  <div style={{background:'#fff',borderRadius:20,border:'1px solid #e8ecf4',padding:18,flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                      <div style={{width:40,height:40,borderRadius:11,flexShrink:0,background:`${riskColor(selectedApt.risk||0)}22`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:17,color:riskColor(selectedApt.risk||0)}}>{(selectedApt.name||'?').charAt(0).toUpperCase()}</div>
                      <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14,color:'#1e293b'}}>{selectedApt.name}</div><div style={{fontSize:11,color:'#94a3b8'}}>{selectedApt.time} · {selectedApt.aadhaar}</div></div>
                      <span style={{fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:20,background:(statusColor[selectedApt.status]||'#94a3b8')+'22',color:statusColor[selectedApt.status]||'#94a3b8'}}>{selectedApt.status||'Pending'}</span>
                    </div>
                    <div style={{marginBottom:14}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>Risk Score</span><span style={{fontSize:11,fontWeight:800,color:riskColor(selectedApt.risk||0)}}>{selectedApt.risk||0}% · {riskLabel(selectedApt.risk||0)}</span></div>
                      <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',width:`${selectedApt.risk||0}%`,background:riskColor(selectedApt.risk||0),borderRadius:4,transition:'width 0.6s ease'}}/></div>
                    </div>
                    {(!selectedApt.status||selectedApt.status==='Pending')&&(
                      <div style={{display:'flex',gap:8,marginBottom:14}}>
                        <button onClick={()=>updateAptStatus(selectedApt.id||selectedApt._id,'Accepted')} style={{flex:1,padding:9,borderRadius:9,border:'none',background:'#f0fdf4',color:'#16a34a',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><Check size={13}/> Accept</button>
                        <button onClick={()=>updateAptStatus(selectedApt.id||selectedApt._id,'Rejected')} style={{flex:1,padding:9,borderRadius:9,border:'none',background:'#fef2f2',color:'#dc2626',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><X size={13}/> Reject</button>
                      </div>
                    )}
                    {patient&&patient.aadhaar===selectedApt.aadhaar&&(
                      <div style={{borderTop:'1px solid #f1f5f9',paddingTop:12}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Latest Vitals</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                          {[
                            {label:'BMI',    val:bmi,                        unit:'kg/m²',limit:25},
                            {label:'Sys.BP', val:latestVitals.ap_hi,         unit:'mmHg', limit:130},
                            {label:'Sugar',  val:latestVitals.glucose_mg,    unit:'mg/dL',limit:140},
                            {label:'Chol.',  val:latestVitals.cholesterol_mg,unit:'mg/dL',limit:200},
                          ].map(v=>{
                            const isHigh=(parseFloat(v.val)||0)>v.limit;
                            return(<div key={v.label} style={{background:isHigh?'#fef2f2':'#f8fafc',borderRadius:9,padding:'8px 10px',border:`1px solid ${isHigh?'#fca5a5':'#e2e8f0'}`}}><div style={{fontSize:9,color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>{v.label}</div><div style={{fontSize:16,fontWeight:900,color:isHigh?'#dc2626':'#1e293b',marginTop:2}}>{v.val??'—'}</div><div style={{fontSize:9,color:'#94a3b8'}}>{v.unit}</div></div>);
                          })}
                        </div>
                        {['Accepted','Done','Ongoing'].includes(selectedApt.status)&&(
                          <button onClick={()=>setShowFollowup(true)} disabled={emailSentIds.has(selectedApt.id||selectedApt._id)} style={{width:'100%',marginTop:12,padding:10,borderRadius:9,border:'none',cursor:emailSentIds.has(selectedApt.id||selectedApt._id)?'default':'pointer',background:emailSentIds.has(selectedApt.id||selectedApt._id)?'#f0fdf4':'linear-gradient(135deg,#2563eb,#1d4ed8)',color:emailSentIds.has(selectedApt.id||selectedApt._id)?'#16a34a':'#fff',fontWeight:700,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
                            {emailSentIds.has(selectedApt.id||selectedApt._id)?<><CheckCircle size={13}/> Report Sent</>:<><Mail size={13}/> Send PDF Report</>}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ ANALYTICS ══ */}
          {activeNav==='analytics'&&(
            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:800,fontSize:17,color:'#1e293b'}}>Patient Analytics</div>
                  {patient&&<div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{patient.name} · {patient.history?.length||0} visits recorded</div>}
                </div>
                {/* Chart controls */}
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  {/* Chart type */}
                  <div style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,gap:2}}>
                    {[['area','Area'],['line','Line'],['bar','Bar']].map(([t,l])=>(
                      <button key={t} onClick={()=>setChartType(t)} style={{padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',background:chartType===t?'#fff':'transparent',color:chartType===t?'#1d4ed8':'#64748b',fontWeight:chartType===t?700:500,fontSize:12,transition:'all 0.15s',boxShadow:chartType===t?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>{l}</button>
                    ))}
                  </div>
                  {/* Risk filter */}
                  <div style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,gap:2}}>
                    {[['all','All'],['heart','Heart'],['diabetes','Diabetes'],['obesity','Obesity'],['overall','Overall']].map(([v,l])=>(
                      <button key={v} onClick={()=>setRiskFilter(v)} style={{padding:'5px 10px',borderRadius:8,border:'none',cursor:'pointer',background:riskFilter===v?'#fff':'transparent',color:riskFilter===v?'#1d4ed8':'#64748b',fontWeight:riskFilter===v?700:500,fontSize:11,transition:'all 0.15s',boxShadow:riskFilter===v?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              {!patient?(
                <div style={{background:'#fff',borderRadius:18,border:'1px solid #e8ecf4',padding:60,textAlign:'center',color:'#94a3b8'}}>
                  <Search size={40} style={{margin:'0 auto 12px',display:'block',opacity:0.3}}/>
                  <div style={{fontWeight:700,fontSize:14}}>Search a patient to view analytics</div>
                  <div style={{fontSize:12,marginTop:4}}>Enter a 12-digit Aadhaar in the search bar above</div>
                </div>
              ):(
                <>
                  {/* Combined risk chart */}
                  <div style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1px solid #e8ecf4'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <div style={{fontWeight:800,fontSize:13,color:'#1e293b'}}>AI Risk Trend — All Visits</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>{allVisitsData.length} data points</div>
                    </div>
                    {renderCombinedRiskChart()}
                  </div>

                  {/* Individual risk cards */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
                    {[
                      {title:'Cardiovascular Risk',key:'heartRisk',   color:'#ef4444',icon:<Heart size={14}/>,    unit:'%'},
                      {title:'Diabetes Risk',      key:'diabetesRisk',color:'#3b82f6',icon:<Droplets size={14}/>, unit:'%'},
                      {title:'Obesity Risk',       key:'obesityRisk', color:'#f97316',icon:<Activity size={14}/>,  unit:'%'},
                    ].filter(c=>riskFilter==='all'||riskFilter===c.key.replace('Risk','').toLowerCase()||riskFilter==='overall').map(c=>(
                      <div key={c.key} style={{background:'#fff',borderRadius:16,padding:'16px 18px',border:'1px solid #e8ecf4'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                          <div style={{fontSize:11,fontWeight:700,color:c.color,display:'flex',alignItems:'center',gap:5}}>{c.icon}{c.title}</div>
                          <div style={{fontSize:16,fontWeight:900,color:c.color}}>{allVisitsData[allVisitsData.length-1]?.[c.key]||0}%</div>
                        </div>
                        {renderRiskChart(c.key, c.color, c.title, c.unit)}
                      </div>
                    ))}
                  </div>

                  {/* Vitals charts */}
                  <div style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1px solid #e8ecf4'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <div style={{fontWeight:800,fontSize:13,color:'#1e293b'}}>Vitals History</div>
                      <div style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,gap:2}}>
                        {[['all','All'],['bp','BP'],['sugar','Sugar'],['cholesterol','Cholesterol'],['bmi','BMI']].map(([v,l])=>(
                          <button key={v} onClick={()=>setVitalFilter(v)} style={{padding:'4px 9px',borderRadius:8,border:'none',cursor:'pointer',background:vitalFilter===v?'#fff':'transparent',color:vitalFilter===v?'#1d4ed8':'#64748b',fontWeight:vitalFilter===v?700:500,fontSize:11,transition:'all 0.15s',boxShadow:vitalFilter===v?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
                      {(vitalFilter==='all'||vitalFilter==='bp')&&(
                        <div style={{borderRadius:12,border:'1px solid #f1f5f9',padding:'12px 14px'}}>
                          <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',marginBottom:10}}>Blood Pressure (mmHg)</div>
                          <ChartWrapper h={120}>
                            <AreaChart data={allVisitsData}>
                              <defs>
                                <linearGradient id="gbp1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                <linearGradient id="gbp2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                              <XAxis dataKey="visit" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                              <YAxis hide/><Tooltip content={<CustomTooltip unit=" mmHg"/>}/>
                              <Legend wrapperStyle={{fontSize:10}}/>
                              <ReferenceLine y={130} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1}/>
                              <Area type="monotone" dataKey="ap_hi" stroke="#ef4444" strokeWidth={2} fill="url(#gbp1)" dot={false} name="Systolic"/>
                              <Area type="monotone" dataKey="ap_lo" stroke="#f97316" strokeWidth={2} fill="url(#gbp2)" dot={false} name="Diastolic"/>
                            </AreaChart>
                          </ChartWrapper>
                        </div>
                      )}
                      {(vitalFilter==='all'||vitalFilter==='sugar')&&(
                        <div style={{borderRadius:12,border:'1px solid #f1f5f9',padding:'12px 14px'}}>
                          <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',marginBottom:10}}>Blood Sugar (mg/dL)</div>
                          {renderVitalChart('glucose','#3b82f6',140,'mg/dL')}
                        </div>
                      )}
                      {(vitalFilter==='all'||vitalFilter==='cholesterol')&&(
                        <div style={{borderRadius:12,border:'1px solid #f1f5f9',padding:'12px 14px'}}>
                          <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',marginBottom:10}}>Cholesterol (mg/dL)</div>
                          {renderVitalChart('cholesterol','#f59e0b',200,'mg/dL')}
                        </div>
                      )}
                      {(vitalFilter==='all'||vitalFilter==='bmi')&&(
                        <div style={{borderRadius:12,border:'1px solid #f1f5f9',padding:'12px 14px'}}>
                          <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',marginBottom:10}}>BMI (kg/m²)</div>
                          {renderVitalChart('bmi','#8b5cf6',25,'kg/m²')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Radar — health profile snapshot */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    <div style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1px solid #e8ecf4'}}>
                      <div style={{fontWeight:800,fontSize:13,color:'#1e293b',marginBottom:14}}>Health Profile Radar</div>
                      <ChartWrapper h={200}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#f1f5f9"/>
                          <PolarAngleAxis dataKey="subject" tick={{fontSize:10,fill:'#64748b'}}/>
                          <Radar name="Risk" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2}/>
                          <Tooltip content={<CustomTooltip unit="%"/>}/>
                        </RadarChart>
                      </ChartWrapper>
                    </div>

                    {/* Visit summary table */}
                    <div style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1px solid #e8ecf4',overflowX:'auto'}}>
                      <div style={{fontWeight:800,fontSize:13,color:'#1e293b',marginBottom:14}}>Visit History Summary</div>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <thead>
                          <tr>{['Visit','Date','Heart','Diabetes','Obesity','Overall'].map(h=><th key={h} style={{textAlign:'left',padding:'5px 8px',fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',borderBottom:'1px solid #f1f5f9'}}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {allVisitsData.map((r,i)=>(
                            <tr key={i} style={{background:i===allVisitsData.length-1?'#eff6ff':'transparent'}}>
                              <td style={{padding:'6px 8px',fontWeight:700,color:'#1e293b'}}>{r.visit}{i===allVisitsData.length-1&&<span style={{marginLeft:4,fontSize:8,background:'#2563eb',color:'#fff',borderRadius:4,padding:'1px 4px'}}>Latest</span>}</td>
                              <td style={{padding:'6px 8px',color:'#64748b'}}>{r.date}</td>
                              <td style={{padding:'6px 8px',fontWeight:700,color:riskColor(r.heartRisk)}}>{r.heartRisk}%</td>
                              <td style={{padding:'6px 8px',fontWeight:700,color:riskColor(r.diabetesRisk)}}>{r.diabetesRisk}%</td>
                              <td style={{padding:'6px 8px',fontWeight:700,color:riskColor(r.obesityRisk)}}>{r.obesityRisk}%</td>
                              <td style={{padding:'6px 8px',fontWeight:700,color:riskColor(r.overallRisk)}}>{r.overallRisk}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ PATIENTS ══ */}
          {activeNav==='patients'&&(
            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <div style={{fontWeight:800,fontSize:17,color:'#1e293b'}}>Patient Appointments</div>
              {emergencyApts.length>0&&(<div style={{background:'#fff',borderRadius:16,border:'2px solid #fca5a5',overflow:'hidden'}}><div style={{padding:'12px 18px',background:'#fef2f2',display:'flex',alignItems:'center',gap:8}}><ShieldAlert size={15} color="#ef4444"/><span style={{fontWeight:800,fontSize:12,color:'#dc2626',textTransform:'uppercase',letterSpacing:'0.5px'}}>Emergency</span><span style={{marginLeft:'auto',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'#ef4444',color:'#fff'}}>{emergencyApts.length}</span></div>{emergencyApts.map((apt,i)=><AptRow key={i} apt={apt} onUpdate={updateAptStatus} riskColor={riskColor} riskLabel={riskLabel} statusColor={statusColor}/>)}</div>)}
              <AptSection title="Yesterday" icon={<CalendarDays size={13}/>} apts={yesterdayApts} onUpdate={updateAptStatus} riskColor={riskColor} riskLabel={riskLabel} statusColor={statusColor}/>
              <AptSection title="Today"     icon={<Clock size={13}/>}        apts={filteredApts}   onUpdate={updateAptStatus} riskColor={riskColor} riskLabel={riskLabel} statusColor={statusColor} highlight/>
              <AptSection title="Tomorrow"  icon={<CalendarDays size={13}/>} apts={tomorrowApts}   onUpdate={updateAptStatus} riskColor={riskColor} riskLabel={riskLabel} statusColor={statusColor}/>
            </div>
          )}

          {/* ══ CALENDAR ══ */}
          {activeNav==='calendar'&&(
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:20}}>
              <MiniCalendar calYear={calYear} calMonth={calMonth} setCalYear={setCalYear} setCalMonth={setCalMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} aptDates={aptDates} daysInMonth={daysInMonth} firstDay={firstDay} big showCount appointments={appointments}/>
              <div style={{background:'#fff',borderRadius:20,border:'1px solid #e8ecf4',overflow:'hidden'}}>
                <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontWeight:800,fontSize:14,color:'#1e293b'}}>{selectedDate===todayISO?'Today':selectedDate} — {filteredApts.length} appointment{filteredApts.length!==1?'s':''}</div>
                </div>
                {filteredApts.length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No appointments on this date</div>:filteredApts.map((apt,i)=><AptRow key={i} apt={apt} onUpdate={updateAptStatus} riskColor={riskColor} riskLabel={riskLabel} statusColor={statusColor}/>)}
              </div>
            </div>
          )}

          {/* ══ MEDICINE ══ */}
          {activeNav==='medicine'&&(
            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <div style={{fontWeight:800,fontSize:17,color:'#1e293b'}}>Prescribed Medicines</div>
              {allPtLoading?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><Loader size={24} style={{animation:'spin 1s linear infinite'}}/></div>
                :allPatients.filter(p=>p.prescriptions?.length>0||p.history?.[0]?.prescriptions?.length>0).length===0?<div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf4',padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No prescription data</div>
                :allPatients.filter(p=>p.prescriptions?.length>0||p.history?.[0]?.prescriptions?.length>0).map((p,i)=>{
                    const latestPx = p.history?.[0]?.prescriptions?.[p.history[0].prescriptions.length-1];
                    const meds = p.prescriptions?.length?p.prescriptions:(latestPx?.medicines||[]);
                    const docNotes = p.doctor_notes||latestPx?.notes||'';
                    const prescDoctor = p.prescribing_doctor||latestPx?.doctor||'';
                    const updatedAt   = p.prescription_updated_at ? new Date(p.prescription_updated_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '';
                    return(
                      <div key={i} style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf4',overflow:'hidden'}}>
                        {/* Header */}
                        <div style={{padding:'14px 18px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:12}}>
                          <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#dbeafe,#bfdbfe)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#2563eb',flexShrink:0}}>{(p.name||'?').charAt(0).toUpperCase()}</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,fontSize:14,color:'#1e293b'}}>{p.name||'—'}</div>
                            <div style={{fontSize:11,color:'#94a3b8',display:'flex',gap:10,marginTop:2}}>
                              <span>Prescribed by: <b style={{color:'#475569'}}>{prescDoctor?`Dr. ${prescDoctor}`:'Doctor'}</b></span>
                              {updatedAt&&<span>· Updated: <b style={{color:'#475569'}}>{updatedAt}</b></span>}
                            </div>
                          </div>
                          <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:'#eff6ff',color:'#2563eb'}}>{meds.length} med{meds.length!==1?'s':''}</span>
                        </div>

                        {/* Medicine list */}
                        <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:8}}>
                          {meds.map((med,j)=>(
                            <div key={j} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0'}}>
                              <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#eff6ff,#dbeafe)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <Pill size={15} color="#2563eb"/>
                              </div>
                              <div style={{flex:1}}>
                                <div style={{fontWeight:700,fontSize:13,color:'#1e293b'}}>{med.name||'—'}</div>
                                <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{med.dosage||'No dosage specified'}</div>
                              </div>
                              {med.instruction&&<div style={{fontSize:11,color:'#94a3b8',fontStyle:'italic'}}>{med.instruction}</div>}
                            </div>
                          ))}

                          {/* Doctor notes */}
                          {docNotes&&(
                            <div style={{marginTop:6,padding:'12px 14px',background:'#eff6ff',borderRadius:10,border:'1px solid #bfdbfe'}}>
                              <div style={{fontSize:9,fontWeight:700,color:'#2563eb',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Doctor's Notes</div>
                              <div style={{fontSize:12,color:'#1e40af',lineHeight:1.6}}>{docNotes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          )}

          {/* ══ DIAGNOSIS ══ */}
          {activeNav==='diagnosis'&&(
            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <div style={{fontWeight:800,fontSize:17,color:'#1e293b'}}>Patient Diagnoses</div>
              {allPtLoading?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><Loader size={24} style={{animation:'spin 1s linear infinite'}}/></div>
                :allPatients.length===0?<div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf4',padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No patient data</div>
                :allPatients.map((p,i)=>{
                    const latestH=getLatest(p),pVitals=latestH?.vitals||{},pCalc=latestH?._calculated||{},pResults=latestH?.results||{};
                    const pRisk=computeOverallRisk(latestH),rColor=riskColor(pRisk);
                    const pBmi=pCalc.bmi;
                    const conditions=[];
                    if(pRisk>65)                                     conditions.push('High Cardiovascular Risk');
                    if((parseFloat(pBmi)||0)>30)                    conditions.push('Obesity (BMI > 30)');
                    if((parseFloat(pVitals.glucose_mg)||0)>140)     conditions.push('Hyperglycemia');
                    if((parseFloat(pVitals.ap_hi)||0)>140)          conditions.push('Hypertension');
                    if((parseFloat(pVitals.cholesterol_mg)||0)>200) conditions.push('Hypercholesterolemia');
                    if(pCalc.hypertension===true)                   conditions.push('Hypertension (Calculated)');
                    return(
                      <div key={i} style={{background:'#fff',borderRadius:16,border:`1.5px solid ${pRisk>65?'#fca5a5':'#e8ecf4'}`,overflow:'hidden'}}>
                        <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:12}}>
                          <div style={{width:40,height:40,borderRadius:10,background:`${rColor}22`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:rColor,flexShrink:0}}>{(p.name||'?').charAt(0).toUpperCase()}</div>
                          <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14,color:'#1e293b'}}>{p.name}</div><div style={{fontSize:11,color:'#94a3b8'}}>{(p.gender==='2'||p.gender===2)?'Male':'Female'} · DOB: {p.dob||'—'}{latestH?.date?` · Last: ${latestH.date.split('T')[0]}`:''}</div></div>
                          <div style={{textAlign:'right',flexShrink:0}}><div style={{fontSize:22,fontWeight:900,color:rColor}}>{pRisk}%</div><div style={{fontSize:9,color:'#94a3b8',textTransform:'uppercase'}}>{riskLabel(pRisk)}</div></div>
                        </div>
                        <div style={{padding:'14px 18px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Vitals</div>
                            {[{label:'BMI',val:pBmi,unit:'kg/m²',limit:25},{label:'Sys.BP',val:pVitals.ap_hi,unit:'mmHg',limit:130},{label:'Sugar',val:pVitals.glucose_mg,unit:'mg/dL',limit:140},{label:'Chol.',val:pVitals.cholesterol_mg,unit:'mg/dL',limit:200}].map(v=>(
                              <div key={v.label} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span style={{color:'#64748b',fontWeight:600}}>{v.label}</span><span style={{color:(parseFloat(v.val)||0)>v.limit?'#ef4444':'#1e293b',fontWeight:700}}>{v.val??'—'} {v.unit}</span></div>
                            ))}
                          </div>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Findings</div>
                            {conditions.length===0?<div style={{fontSize:12,color:'#16a34a',fontWeight:700,display:'flex',alignItems:'center',gap:6}}><CheckCircle size={13}/> All vitals normal</div>:conditions.map((c,j)=><div key={j} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}><AlertTriangle size={12} color="#f59e0b"/><span style={{fontSize:12,fontWeight:600,color:'#78350f'}}>{c}</span></div>)}
                            <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:3}}>
                              {pResults.heart_attack?.label&&<div style={{fontSize:10,color:'#64748b'}}>Heart: <b style={{color:pResults.heart_attack.color||'#10b981'}}>{pResults.heart_attack.label} ({pResults.heart_attack.percentage}%)</b></div>}
                              {pResults.diabetes?.label&&    <div style={{fontSize:10,color:'#64748b'}}>Diabetes: <b style={{color:pResults.diabetes.color||'#10b981'}}>{pResults.diabetes.label} ({pResults.diabetes.percentage}%)</b></div>}
                              {pResults.obesity?.label&&     <div style={{fontSize:10,color:'#64748b'}}>Obesity: <b style={{color:pResults.obesity.color||'#10b981'}}>{pResults.obesity.label} ({pResults.obesity.percentage}%)</b></div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          )}
        </div>
      </div>

      {/* FOLLOW-UP MODAL */}
      {showFollowup&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setShowFollowup(false);}} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.65)',zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:'#fff',borderRadius:24,padding:30,width:460,boxShadow:'0 30px 80px rgba(0,0,0,0.25)',animation:'slideUp 0.25s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
              <div><div style={{fontWeight:800,fontSize:16,color:'#1e293b'}}>Send Health Report (PDF)</div><div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>To: <strong style={{color:'#2563eb'}}>{patient?.email||'No email on record'}</strong></div></div>
              <button onClick={()=>setShowFollowup(false)} style={{width:28,height:28,borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={13} color="#64748b"/></button>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:6}}>Report Language</label>
              <div style={{display:'flex',gap:8}}>
                {[['en','English'],['gu','Gujarati'],['hi','Hindi']].map(([val,label])=>(
                  <button key={val} onClick={()=>setFollowupData(p=>({...p,lang:val}))} style={{flex:1,padding:'7px',borderRadius:8,border:`2px solid ${followupData.lang===val?'#2563eb':'#e2e8f0'}`,background:followupData.lang===val?'#eff6ff':'#fff',color:followupData.lang===val?'#2563eb':'#64748b',fontWeight:700,fontSize:12,cursor:'pointer'}}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}}>Doctor's Notes</label><textarea value={followupData.notes} onChange={e=>setFollowupData(p=>({...p,notes:e.target.value}))} placeholder="e.g. Reduce salt intake. Walk 30 min daily..." rows={3} style={{width:'100%',border:'2px solid #e2e8f0',borderRadius:9,padding:'9px 11px',fontSize:12,outline:'none',resize:'none',fontFamily:'inherit',color:'#1e293b',boxSizing:'border-box'}}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}}>Next Visit</label><input type="date" value={followupData.nextVisit} onChange={e=>setFollowupData(p=>({...p,nextVisit:e.target.value}))} style={{width:'100%',border:'2px solid #e2e8f0',borderRadius:9,padding:'9px 11px',fontSize:12,outline:'none',fontFamily:'inherit',color:'#1e293b',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}}>Tests Ordered</label><input type="text" value={followupData.tests} onChange={e=>setFollowupData(p=>({...p,tests:e.target.value}))} placeholder="HbA1c, Lipid Profile..." style={{width:'100%',border:'2px solid #e2e8f0',borderRadius:9,padding:'9px 11px',fontSize:12,outline:'none',fontFamily:'inherit',color:'#1e293b',boxSizing:'border-box'}}/></div>
              </div>
            </div>
            {!patient?.email&&<div style={{marginTop:12,padding:'9px 12px',background:'#fef2f2',borderRadius:9,border:'1px solid #fca5a5',fontSize:12,color:'#dc2626',fontWeight:600}}>⚠ No email address found for this patient.</div>}
            <div style={{display:'flex',gap:8,marginTop:18}}>
              <button onClick={()=>setShowFollowup(false)} style={{flex:1,padding:11,borderRadius:9,border:'1.5px solid #e2e8f0',background:'#fff',color:'#64748b',fontWeight:700,fontSize:12,cursor:'pointer'}}>Cancel</button>
              <button onClick={sendFollowupEmail} disabled={emailLoading||!patient?.email} style={{flex:2,padding:11,borderRadius:9,border:'none',fontWeight:700,fontSize:12,cursor:!patient?.email?'not-allowed':'pointer',background:!patient?.email?'#e2e8f0':'linear-gradient(135deg,#2563eb,#1d4ed8)',color:!patient?.email?'#94a3b8':'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
                {emailLoading?<><Loader size={13} style={{animation:'spin 1s linear infinite'}}/> Sending...</>:<><Send size={13}/> Send PDF Report</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast&&<div style={{position:'fixed',bottom:22,right:22,zIndex:9999,background:toast.type==='success'?'#f0fdf4':'#fef2f2',border:`1px solid ${toast.type==='success'?'#86efac':'#fca5a5'}`,borderRadius:12,padding:'11px 16px',fontSize:13,fontWeight:700,color:toast.type==='success'?'#16a34a':'#dc2626',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',animation:'slideUp 0.3s ease'}}>{toast.type==='success'?'✓ ':'⚠ '}{toast.msg}</div>}
      <style>{`@keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}`}</style>
    </div>
  );
}

function MiniCalendar({calYear,calMonth,setCalYear,setCalMonth,selectedDate,setSelectedDate,aptDates,daysInMonth,firstDay,big,showCount,appointments}){
  const t=new Date().toISOString().split('T')[0];
  return(
    <div style={{background:'#fff',borderRadius:20,border:'1px solid #e8ecf4',padding:big?24:16,width:big?340:undefined}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:big?18:12}}>
        <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}} style={{width:big?30:24,height:big?30:24,borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><ChevronLeft size={big?14:12}/></button>
        <span style={{fontWeight:800,fontSize:big?14:12,color:'#1e293b'}}>{MONTHS[calMonth]} {calYear}</span>
        <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}} style={{width:big?30:24,height:big?30:24,borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><ChevronRight size={big?14:12}/></button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1,marginBottom:4}}>{DAYS.map(d=><div key={d} style={{textAlign:'center',fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase'}}>{d}</div>)}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1}}>
        {Array.from({length:firstDay}).map((_,i)=><div key={'e'+i}/>)}
        {Array.from({length:daysInMonth}).map((_,i)=>{
          const d=i+1,iso=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const isT=iso===t,isSel=iso===selectedDate,hasA=aptDates.has(iso);
          const cnt=showCount&&appointments?appointments.filter(a=>a.date?.split('T')[0]===iso).length:0;
          return(<button key={d} onClick={()=>setSelectedDate(iso)} style={{width:'100%',aspectRatio:'1',borderRadius:7,border:'none',cursor:'pointer',fontSize:big?12:11,fontWeight:isT||isSel?800:500,background:isSel?'#2563eb':isT?'#eff6ff':'transparent',color:isSel?'#fff':isT?'#2563eb':'#374151',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.1s'}}>
            {d}
            {hasA&&!showCount&&<span style={{position:'absolute',bottom:2,left:'50%',transform:'translateX(-50%)',width:3,height:3,borderRadius:'50%',background:isSel?'#fff':'#2563eb'}}/>}
            {showCount&&cnt>0&&<span style={{position:'absolute',bottom:1,left:'50%',transform:'translateX(-50%)',fontSize:7,fontWeight:800,color:isSel?'#fff':'#2563eb'}}>{cnt}</span>}
          </button>);
        })}
      </div>
    </div>
  );
}

function AppointmentsTable({title,apts,loading,onSelect,selectedApt,onUpdate,riskColor,riskLabel,statusColor}){
  return(
    <div style={{background:'#fff',borderRadius:20,border:'1px solid #e8ecf4',overflow:'hidden'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontWeight:800,fontSize:14,color:'#1e293b'}}>{title}</div><span style={{background:'#eff6ff',color:'#2563eb',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{apts.length} scheduled</span></div>
      {loading?<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:12}}>Loading...</div>
        :apts.length===0?<div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No appointments for this date</div>
        :apts.map((apt,i)=>{const aptId=apt.id||apt._id,isSel=selectedApt&&(selectedApt.id===aptId||selectedApt._id===aptId);return(
          <div key={aptId||i} onClick={()=>onSelect(apt)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',cursor:'pointer',borderBottom:'1px solid #f8fafc',background:isSel?'#f8faff':'#fff',borderLeft:`3px solid ${isSel?'#2563eb':'transparent'}`,transition:'all 0.12s'}}>
            <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:`${riskColor(apt.risk||0)}22`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:riskColor(apt.risk||0),fontSize:14}}>{(apt.name||'?').charAt(0).toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,color:'#1e293b',display:'flex',alignItems:'center',gap:6}}>{apt.name}{apt.emergency&&<span style={{fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:8,background:'#fef2f2',color:'#ef4444',border:'1px solid #fca5a5'}}>Emergency</span>}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{apt.time} · Risk: <span style={{color:riskColor(apt.risk||0),fontWeight:700}}>{apt.risk||0}% {riskLabel(apt.risk||0)}</span></div></div>
            <span style={{fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:20,background:(statusColor[apt.status]||'#94a3b8')+'22',color:statusColor[apt.status]||'#94a3b8',flexShrink:0}}>{apt.status||'Pending'}</span>
            {(!apt.status||apt.status==='Pending')&&(<div style={{display:'flex',gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}><button onClick={()=>onUpdate(aptId,'Accepted')} style={{width:26,height:26,borderRadius:7,background:'#f0fdf4',border:'1px solid #86efac',color:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Check size={12}/></button><button onClick={()=>onUpdate(aptId,'Rejected')} style={{width:26,height:26,borderRadius:7,background:'#fef2f2',border:'1px solid #fca5a5',color:'#dc2626',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><X size={12}/></button></div>)}
          </div>
        );})}
    </div>
  );
}

function AptRow({apt,onUpdate,riskColor,riskLabel,statusColor}){
  const aptId=apt.id||apt._id;
  return(<div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:'1px solid #f8fafc',background:'#fff'}}><div style={{width:36,height:36,borderRadius:9,flexShrink:0,background:`${riskColor(apt.risk||0)}22`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:riskColor(apt.risk||0),fontSize:14}}>{(apt.name||'?').charAt(0).toUpperCase()}</div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,color:'#1e293b',display:'flex',alignItems:'center',gap:6}}>{apt.name}{apt.emergency&&<span style={{fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:8,background:'#fef2f2',color:'#ef4444',border:'1px solid #fca5a5'}}>Emergency</span>}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>{apt.time} · {apt.aadhaar} · Risk: <span style={{color:riskColor(apt.risk||0),fontWeight:700}}>{apt.risk||0}% {riskLabel(apt.risk||0)}</span></div></div><span style={{fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:20,background:(statusColor[apt.status]||'#94a3b8')+'22',color:statusColor[apt.status]||'#94a3b8',flexShrink:0}}>{apt.status||'Pending'}</span>{(!apt.status||apt.status==='Pending')&&(<div style={{display:'flex',gap:4,flexShrink:0}}><button onClick={()=>onUpdate(aptId,'Accepted')} style={{width:26,height:26,borderRadius:7,background:'#f0fdf4',border:'1px solid #86efac',color:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Check size={12}/></button><button onClick={()=>onUpdate(aptId,'Rejected')} style={{width:26,height:26,borderRadius:7,background:'#fef2f2',border:'1px solid #fca5a5',color:'#dc2626',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><X size={12}/></button></div>)}</div>);
}

function AptSection({title,icon,apts,onUpdate,riskColor,riskLabel,statusColor,highlight}){
  return(<div style={{background:'#fff',borderRadius:16,border:`1.5px solid ${highlight?'#bfdbfe':'#e8ecf4'}`,overflow:'hidden'}}><div style={{padding:'12px 18px',background:highlight?'#eff6ff':'#f8fafc',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:8}}><span style={{color:highlight?'#2563eb':'#64748b'}}>{icon}</span><span style={{fontWeight:800,fontSize:12,color:highlight?'#2563eb':'#475569',textTransform:'uppercase',letterSpacing:'0.5px'}}>{title}</span><span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,background:highlight?'#2563eb':'#94a3b8',color:'#fff',marginLeft:'auto'}}>{apts.length}</span></div>{apts.length===0?<div style={{padding:18,textAlign:'center',color:'#94a3b8',fontSize:12}}>No appointments</div>:apts.map((apt,i)=><AptRow key={i} apt={apt} onUpdate={onUpdate} riskColor={riskColor} riskLabel={riskLabel} statusColor={statusColor}/>)}</div>);
}