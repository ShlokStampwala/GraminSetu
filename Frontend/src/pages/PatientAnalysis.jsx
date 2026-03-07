import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import AppointmentBooking from "./AppointmentBooking"; // ← new import
import { 
  AlertCircle, Info, MessageSquare, Activity, ShieldAlert, 
  Zap, ArrowLeft, ClipboardList, Stethoscope, ExternalLink,
  Mail, X, CalendarCheck
} from "lucide-react";

const diagnosticAdvice = {
  heart: {
    label: "Cardiovascular Tests",
    reports: ["ECG (Electrocardiogram)", "Lipid Profile (HDL/LDL)", "2D Echo", "TMT Test"],
    color: "text-red-600",
    bg: "bg-red-50"
  },
  obesity: {
    label: "Metabolic Tests",
    reports: ["Thyroid Profile (TSH)", "Liver Function Test", "HbA1c", "Body Composition"],
    color: "text-orange-600",
    bg: "bg-orange-50"
  },
  diabetes: {
    label: "Sugar Monitoring",
    reports: ["HbA1c (Gold Standard)", "Fasting Blood Sugar", "Urine Microalbumin", "PPBS"],
    color: "text-blue-600",
    bg: "bg-blue-50"
  }
};

export default function PatientAnalysis() {
  const { state: routerState } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [state, setState] = useState(routerState);
  const [recommendedDoctors, setRecommendedDoctors] = useState([]);
  
  // Email modal
  const [emailModal,      setEmailModal]      = useState(false);
  const [targetEmail,     setTargetEmail]     = useState("");
  const [selectedMailLang,setSelectedMailLang]= useState("en");
  const [isSending,       setIsSending]       = useState(false);

  // ── NEW: Appointment modal ────────────────────────────────────
  const [showBooking,   setShowBooking]   = useState(false);
  const [bookingDone,   setBookingDone]   = useState(false);

  useEffect(() => {
    if (!state) {
      const cachedData = localStorage.getItem("latest_analysis");
      if (cachedData) {
        try { setState(JSON.parse(cachedData)); }
        catch (e) { console.error("Cache parse error", e); }
      }
    }
  }, [state]);

  const safeProb = (val) => {
    const n = parseFloat(val || 0);
    return isNaN(n) ? 0 : Math.max(0, Math.min(1, n));
  };

  const heartRisk    = (safeProb(state?.results?.heartRisk)    * 100).toFixed(1);
  const obesityRisk  = (safeProb(state?.results?.obesityRisk)  * 100).toFixed(1);
  const diabetesRisk = (safeProb(state?.results?.diabetesRisk) * 100).toFixed(1);
  const overallScore = ((parseFloat(heartRisk) + parseFloat(obesityRisk) + parseFloat(diabetesRisk)) / 3).toFixed(1);
  const isHighRisk   = parseFloat(overallScore) > 50;

  useEffect(() => {
    if (state && state.results) {
      const risks = [
        { type: 'Heart Specialist', score: parseFloat(heartRisk) },
        { type: 'Nutritionist',     score: parseFloat(obesityRisk) },
        { type: 'Endocrinologist',  score: parseFloat(diabetesRisk) }
      ];
      const primarySpecialty = risks.sort((a, b) => b.score - a.score)[0].type;
      fetch(`http://localhost:5000/api/doctors/search?specialty=${primarySpecialty}&taluka=${state.taluka || ''}`)
        .then(res => res.json())
        .then(data => setRecommendedDoctors(data.doctors || []))
        .catch(err => console.error("Doctor fetch error", err));
    }
  }, [state, heartRisk, obesityRisk, diabetesRisk]);

  const handleSendMail = async () => {
    if (!targetEmail) return alert("Please enter an email!");
    setIsSending(true);
    try {
      const res = await fetch('http://localhost:5000/api/send-report-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, lang: selectedMailLang, patientData: state, overallScore }),
      });
      if (res.ok) alert("✅ Report Sent Successfully!");
      else alert("❌ Error sending mail.");
    } catch { alert("Backend Error."); }
    finally { setIsSending(false); setEmailModal(false); }
  };

  if (!state) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6 text-center">
      <AlertCircle size={60} className="text-red-400 mb-4" />
      <h1 className="text-2xl font-black text-slate-900 uppercase italic">Analysis State Lost</h1>
      <button onClick={() => navigate('/add-patient')} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase flex items-center gap-2 mt-6">
        <ArrowLeft size={18} /> Go Back
      </button>
    </div>
  );

  // ── Risk data passed to booking component ─────────────────────
  const riskDataForBooking = {
    heartRisk:    parseFloat(heartRisk),
    diabetesRisk: parseFloat(diabetesRisk),
    obesityRisk:  parseFloat(obesityRisk),
    overallScore: parseFloat(overallScore),
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans pb-40">
        <div className="max-w-5xl mx-auto space-y-8">

          <button onClick={() => navigate('/add-patient')} className="flex items-center gap-2 text-slate-500 font-black text-xs uppercase hover:text-slate-900 transition-colors">
            <ArrowLeft size={16} /> New Patient
          </button>

          {/* Hero */}
          <div className={`p-10 rounded-[3rem] border-b-[16px] shadow-2xl flex flex-col md:flex-row items-center gap-10 transition-all ${isHighRisk ? 'bg-red-50 border-red-500' : 'bg-emerald-50 border-emerald-500'}`}>
            <div className="relative flex items-center justify-center flex-shrink-0">
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-slate-200" />
                <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="14" fill="transparent"
                  strokeDasharray={452.4}
                  strokeDashoffset={452.4 - (452.4 * parseFloat(overallScore)) / 100}
                  className={`${isHighRisk ? 'text-red-500' : 'text-emerald-500'} transition-all`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-3xl font-black italic text-slate-900">{overallScore}%</span>
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">{t('overall_risk')}</h2>
              <p className={`text-5xl md:text-6xl font-black tracking-tighter italic uppercase ${isHighRisk ? 'text-red-600' : 'text-emerald-600'}`}>
                {isHighRisk ? t('action_required') : t('system_normal')}
              </p>
              {state.name && <p className="text-slate-700 font-black text-lg mt-2 tracking-tight">{state.name}</p>}

              {/* ── BOOK APPOINTMENT BUTTON — inline in hero ── */}
              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                {!bookingDone ? (
                  <button
                    onClick={() => setShowBooking(true)}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all hover:-translate-y-0.5 active:scale-95 ${
                      isHighRisk
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <CalendarCheck size={20} />
                    {isHighRisk ? '🚨 Book Emergency Appointment' : 'Book Doctor Appointment'}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-emerald-100 text-emerald-700 border-2 border-emerald-300">
                    <CalendarCheck size={20} /> Appointment Booked ✓
                  </div>
                )}
              </div>

              {/* High risk urgency message */}
              {isHighRisk && !bookingDone && (
                <p className="mt-3 text-xs font-bold text-red-500 uppercase tracking-wider">
                  ⚠ Risk &gt;50% — Immediate specialist consultation recommended
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RiskCard label={t('heart_risk')}    score={heartRisk}    color="red"    icon={<Activity size={24} />} />
            <RiskCard label={t('obesity_risk')}  score={obesityRisk}  color="orange" icon={<Zap size={24} />} />
            <RiskCard label={t('diabetes_risk')} score={diabetesRisk} color="blue"   icon={<ShieldAlert size={24} />} />
          </div>

          {/* Diagnostics */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3 text-slate-400">
              <ClipboardList className="text-emerald-600" /> {t('recommended_diagnostics')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {parseFloat(heartRisk)    > 35 && <AdviceBox data={diagnosticAdvice.heart}   t={t} />}
              {parseFloat(obesityRisk)  > 35 && <AdviceBox data={diagnosticAdvice.obesity}  t={t} />}
              {parseFloat(diabetesRisk) > 35 && <AdviceBox data={diagnosticAdvice.diabetes} t={t} />}
            </div>
          </div>

          {/* Nearby specialists from DB */}
          {recommendedDoctors.length > 0 && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3 mb-8 text-slate-400">
                <Stethoscope className="text-indigo-600" /> {t('nearby_specialists')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedDoctors.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-300 transition-all">
                    <div>
                      <p className="font-black text-lg text-slate-900">{doc.name}</p>
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{doc.specialty}</p>
                    </div>
                    <div className="flex gap-2">
                      {/* Book directly from this card */}
                      <button
                        onClick={() => setShowBooking(true)}
                        className="p-3 bg-indigo-50 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
                        title="Book appointment"
                      >
                        <CalendarCheck size={18} />
                      </button>
                      <a href={`https://wa.me/${doc.phone}`} target="_blank" rel="noreferrer"
                        className="p-3 bg-white rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all border border-slate-100">
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3 mb-8 text-slate-400">
              <Info className="text-blue-600" /> {t('insights_title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parseInt(state.smoke) === 1 && <InsightBox icon={<Zap size={18} />}     title={t('smoke')} desc={t('advice_smoke')} color="orange" />}
              {parseInt(state.alco)  === 1 && <InsightBox icon={<Activity size={18} />} title={t('alco')}  desc={t('advice_alco')}  color="indigo" />}
            </div>
          </div>

          {/* ASHA instruction */}
          <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform text-emerald-400">
              <MessageSquare size={160} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.5em] text-emerald-400 flex items-center gap-2 mb-6">{t('asha_instruction')}</h3>
            <p className="text-2xl md:text-3xl font-bold leading-tight italic max-w-3xl relative z-10">"{t('asha_tell_patient')}"</p>
          </div>

          {/* ── FLOATING ACTION BAR ── */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-slate-200 px-6 py-4">
            <div className="max-w-5xl mx-auto flex gap-3 justify-center">
              {/* Book appointment button */}
              {!bookingDone ? (
                <button
                  onClick={() => setShowBooking(true)}
                  className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all hover:-translate-y-0.5 active:scale-95 ${
                    isHighRisk
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <CalendarCheck size={20} />
                  {isHighRisk ? '🚨 Emergency Appointment' : 'Book Appointment'}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm bg-emerald-100 text-emerald-700 border-2 border-emerald-300">
                  <CalendarCheck size={20} /> Booked ✓
                </div>
              )}

              {/* Send email */}
              <button
                onClick={() => setEmailModal(true)}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                <Mail size={20} /> Send Report
              </button>
            </div>
          </div>

          {/* Email modal */}
          {emailModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
              <div className="bg-white p-10 rounded-[3.5rem] w-full max-w-md shadow-2xl relative">
                <button onClick={() => setEmailModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><X size={24} /></button>
                <h3 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Send Digital Report</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">PDF Analytics & Advice Delivery</p>
                <div className="space-y-4">
                  <input type="email" placeholder="Patient's Email Address" value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black text-slate-800 placeholder:text-slate-300 focus:border-emerald-500 transition-all" />
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-2">
                    {[{id:'en',l:'EN'},{id:'gu',l:'ગુજ'},{id:'hi',l:'हिन्दी'}].map(lang => (
                      <button key={lang.id} onClick={() => setSelectedMailLang(lang.id)}
                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${selectedMailLang === lang.id ? 'bg-white shadow-md text-emerald-600' : 'text-slate-400 hover:text-slate-700'}`}>
                        {lang.l}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleSendMail} disabled={isSending}
                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                    {isSending ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <Mail size={18} />}
                    {isSending ? "Sending..." : "Dispatch PDF Report"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── APPOINTMENT BOOKING MODAL ── */}
      {showBooking && (
        <AppointmentBooking
          patientData={{
            name:    state?.name    || '',
            aadhaar: state?.aadhaar || '',
            phone:   state?.phone   || '',
            email:   state?.email   || '',
            taluka:  state?.taluka  || '',
          }}
          risks={riskDataForBooking}
          onClose={() => setShowBooking(false)}
          onBooked={() => {
            setBookingDone(true);
            setShowBooking(false);
          }}
        />
      )}
    </>
  );
}

function AdviceBox({ data, t }) {
  return (
    <div className={`${data.bg} p-8 rounded-[2.5rem] border-2 border-transparent hover:border-slate-200 transition-all`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${data.color}`}>{t(data.label)}</p>
      <ul className="space-y-3">
        {data.reports.map((report, i) => (
          <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-800">
            <div className="w-2 h-2 rounded-full bg-slate-900 opacity-20" />
            {t(report)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RiskCard({ label, score, color, icon }) {
  const themes = { red:'text-red-600 bg-red-50 border-red-200', orange:'text-orange-600 bg-orange-50 border-orange-200', blue:'text-blue-600 bg-blue-50 border-blue-200' };
  const barColor = { red:'bg-red-500', orange:'bg-orange-500', blue:'bg-blue-500' };
  const scoreNum = parseFloat(score);
  const riskLabel = scoreNum >= 65 ? 'HIGH' : scoreNum >= 35 ? 'MODERATE' : 'LOW';
  const riskBadge = { HIGH:'bg-red-100 text-red-700', MODERATE:'bg-yellow-100 text-yellow-700', LOW:'bg-emerald-100 text-emerald-700' };
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 shadow-lg flex flex-col items-center gap-6 transition-all hover:scale-105 ${themes[color]}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-50">{icon}</div>
        <span className="text-xs font-black uppercase tracking-widest opacity-80">{label}</span>
      </div>
      <div className="text-4xl font-black italic tracking-tighter">{score}%</div>
      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${riskBadge[riskLabel]}`}>{riskLabel}</span>
      <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden border border-slate-100">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor[color]}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function InsightBox({ icon, title, desc, color }) {
  const colors = { orange:'bg-orange-50 text-orange-900 border-orange-100', indigo:'bg-indigo-50 text-indigo-900 border-indigo-100' };
  const iconBg  = { orange:'bg-orange-500', indigo:'bg-indigo-500' };
  return (
    <div className={`p-6 rounded-[2rem] border flex items-start gap-5 ${colors[color]}`}>
      <div className={`p-3 rounded-xl text-white shadow-lg ${iconBg[color]}`}>{icon}</div>
      <div>
        <p className="font-black text-xs uppercase tracking-tighter opacity-60 mb-1">{title}</p>
        <p className="text-sm font-bold leading-snug">{desc}</p>
      </div>
    </div>
  );
}