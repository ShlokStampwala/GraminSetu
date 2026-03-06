import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import { AlertCircle, Info, MessageSquare, Activity, ShieldAlert, Zap, ArrowLeft } from "lucide-react";

export default function PatientAnalysis() {
  const { state: routerState } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [state, setState] = useState(routerState);

  useEffect(() => {
    if (!state) {
      const cachedData = localStorage.getItem("latest_analysis");
      if (cachedData) {
        try { setState(JSON.parse(cachedData)); }
        catch (e) { console.error("Cache parse error", e); }
      }
    }
  }, [state]);

  if (!state) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6 text-center">
      <AlertCircle size={60} className="text-red-400 mb-4" />
      <h1 className="text-2xl font-black text-slate-900 uppercase italic">Analysis State Lost</h1>
      <p className="text-slate-500 font-bold mb-6">Bhai, data refresh se udd gaya. Form wapas bharo.</p>
      <button onClick={() => navigate('/add-patient')}
        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
        <ArrowLeft size={18} /> Go Back to Form
      </button>
    </div>
  );

  // Safe probability extraction — works whether results come from old or new hook format
  const safeProb = (val) => {
    const n = parseFloat(val || 0);
    return isNaN(n) ? 0 : Math.max(0, Math.min(1, n));
  };

  const heartRisk    = (safeProb(state.results?.heartRisk)    * 100).toFixed(1);
  const obesityRisk  = (safeProb(state.results?.obesityRisk)  * 100).toFixed(1);
  const diabetesRisk = (safeProb(state.results?.diabetesRisk) * 100).toFixed(1);

  const overallScore = ((parseFloat(heartRisk) + parseFloat(obesityRisk) + parseFloat(diabetesRisk)) / 3).toFixed(1);
  const isHighRisk   = parseFloat(overallScore) > 50;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Back button */}
          <button onClick={() => navigate('/add-patient')}
            className="flex items-center gap-2 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">
            <ArrowLeft size={16} /> New Patient
          </button>

          {/* Hero: Overall Risk */}
          <div className={`p-10 rounded-[3rem] border-b-[16px] shadow-2xl flex flex-col md:flex-row items-center gap-10 transition-all ${isHighRisk ? 'bg-red-50 border-red-500' : 'bg-emerald-50 border-emerald-500'}`}>
            <div className="relative flex items-center justify-center flex-shrink-0">
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-slate-200" />
                <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="14" fill="transparent"
                  strokeDasharray={452.4}
                  strokeDashoffset={452.4 - (452.4 * parseFloat(overallScore)) / 100}
                  className={`${isHighRisk ? 'text-red-500' : 'text-emerald-500'} transition-all duration-1000 ease-out`}
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
              <p className="text-slate-500 font-bold text-xs mt-3 uppercase tracking-widest opacity-60 italic">
                Composite AI Risk Evaluation (Heart + Obesity + Diabetes)
              </p>
              {/* Patient name if available */}
              {state.name && (
                <p className="text-slate-700 font-black text-lg mt-2 tracking-tight">{state.name}</p>
              )}
            </div>
          </div>

          {/* 3 Individual Risk Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RiskCard label={t('heart_risk')}    score={heartRisk}    color="red"    icon={<Activity size={24} />} />
            <RiskCard label={t('obesity_risk')}  score={obesityRisk}  color="orange" icon={<Zap size={24} />} />
            <RiskCard label={t('diabetes_risk')} score={diabetesRisk} color="blue"   icon={<ShieldAlert size={24} />} />
          </div>

          {/* Lifestyle Insights */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3 mb-8 text-slate-400">
              <Info className="text-blue-600" /> {t('insights_title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parseInt(state.smoke) === 1 && (
                <InsightBox icon={<Zap size={18} />} title={t('smoke')} desc={t('advice_smoke')} color="orange" />
              )}
              {parseInt(state.alco) === 1 && (
                <InsightBox icon={<Activity size={18} />} title={t('alco')} desc={t('advice_alco')} color="indigo" />
              )}
              {isHighRisk && (
                <div className="md:col-span-2 p-8 bg-red-600 text-white rounded-[2.5rem] font-black flex items-center justify-between shadow-xl animate-pulse">
                  <span className="uppercase text-sm italic tracking-widest leading-relaxed">{t('urgent_doc')}</span>
                  <AlertCircle size={32} />
                </div>
              )}
              {!parseInt(state.smoke) && !parseInt(state.alco) && !isHighRisk && (
                <div className="md:col-span-2 p-6 bg-emerald-50 rounded-[2rem] border border-emerald-200 text-emerald-800 font-bold text-sm">
                  ✅ Good lifestyle habits detected. Keep maintaining healthy routines.
                </div>
              )}
            </div>
          </div>

          {/* ASHA Instruction Box */}
          <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform text-emerald-400">
              <MessageSquare size={160} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.5em] text-emerald-400 flex items-center gap-2 mb-6">
              {t('asha_instruction')}
            </h3>
            <p className="text-2xl md:text-3xl font-bold leading-tight italic max-w-3xl relative z-10">
              "{t('asha_tell_patient')}"
            </p>
          </div>

        </div>
      </div>
    </>
  );
}

function RiskCard({ label, score, color, icon }) {
  const themes = {
    red:    'text-red-600    bg-red-50    border-red-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    blue:   'text-blue-600   bg-blue-50   border-blue-200',
  };
  const barColor = {
    red:    'bg-red-500',
    orange: 'bg-orange-500',
    blue:   'bg-blue-500',
  };

  const scoreNum = parseFloat(score);
  const riskLabel = scoreNum >= 65 ? 'HIGH' : scoreNum >= 35 ? 'MODERATE' : 'LOW';
  const riskBadge = {
    HIGH:     'bg-red-100 text-red-700',
    MODERATE: 'bg-yellow-100 text-yellow-700',
    LOW:      'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border-2 shadow-lg flex flex-col items-center gap-6 transition-all hover:scale-105 ${themes[color]}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-50">{icon}</div>
        <span className="text-xs font-black uppercase tracking-widest opacity-80">{label}</span>
      </div>
      <div className="text-4xl font-black italic tracking-tighter">{score}%</div>
      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${riskBadge[riskLabel]}`}>
        {riskLabel}
      </span>
      <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden border border-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor[color]}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function InsightBox({ icon, title, desc, color }) {
  const colors = {
    orange: 'bg-orange-50 text-orange-900 border-orange-100',
    indigo: 'bg-indigo-50 text-indigo-900 border-indigo-100',
  };
  const iconBg = { orange: 'bg-orange-500', indigo: 'bg-indigo-500' };
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