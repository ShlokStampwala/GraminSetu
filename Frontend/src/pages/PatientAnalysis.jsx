import { useLocation, useNavigate } from "react-router-dom"; // useNavigate add kiya fallback ke liye
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import { AlertCircle, CheckCircle, Info, MessageSquare, Activity, ShieldAlert, Zap } from "lucide-react";

export default function PatientAnalysis() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Robust data check: Agar state missing hai toh error na aaye
  if (!state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <AlertCircle className="h-20 w-20 text-slate-300 mb-4" />
        <h1 className="text-2xl font-black text-slate-400 uppercase italic tracking-widest">No Analysis Data Found</h1>
        <button 
          onClick={() => navigate('/add-patient')} 
          className="mt-6 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs hover:bg-emerald-600 transition-all"
        >
          Go Back to Registration
        </button>
      </div>
    );
  }

  // TFLite v3 Outputs mapping with fallback values 
  const heartRisk = (parseFloat(state.results?.heartRisk || 0) * 100).toFixed(1);
  const obesityRisk = (parseFloat(state.results?.obesityRisk || 0) * 100).toFixed(1);
  const diabetesRisk = (parseFloat(state.results?.diabetesRisk || 0) * 100).toFixed(1);

  // Overall Score Calculation
  const overallScore = ((parseFloat(heartRisk) + parseFloat(obesityRisk) + parseFloat(diabetesRisk)) / 3).toFixed(1);
  const isHighRisk = parseFloat(overallScore) > 50;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* 1. Overall Health Score Card (Hero Section) */}
          <div className={`p-8 rounded-[2.5rem] border-b-[12px] shadow-2xl flex flex-col sm:flex-row items-center gap-8 transition-all ${isHighRisk ? 'bg-red-50 border-red-500' : 'bg-emerald-50 border-emerald-500'}`}>
            <div className="relative flex items-center justify-center">
               <svg className="w-32 h-32 transform -rotate-90">
                 <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200" />
                 <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                    strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * overallScore) / 100}
                    className={`${isHighRisk ? 'text-red-500' : 'text-emerald-500'} transition-all duration-1000`} 
                 />
               </svg>
               <span className="absolute text-2xl font-black italic">{overallScore}%</span>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">{t('risk_result')}</h2>
              <p className={`text-4xl sm:text-5xl font-black tracking-tighter italic uppercase ${isHighRisk ? 'text-red-600' : 'text-emerald-600'}`}>
                {isHighRisk ? "Action Required" : "System Normal"}
              </p>
              <p className="text-slate-500 font-bold text-xs mt-2 uppercase tracking-tighter">GraminSetu Health Vulnerability Index</p>
            </div>
          </div>

          {/* 2. Three Risk Circles (Multi-Task Model Results)  */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RiskCard label="Heart Disease" score={heartRisk} color="red" icon={<Activity size={20}/>} />
            <RiskCard label="Obesity Risk" score={obesityRisk} color="orange" icon={<Zap size={20}/>} />
            <RiskCard label="Diabetes Risk" score={diabetesRisk} color="blue" icon={<ShieldAlert size={20}/>} />
          </div>

          {/* 3. Lifestyle Insights Section */}
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 mb-6 text-slate-400">
              <Info className="text-blue-600" /> Personalized Health Intelligence
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {parseInt(state.smoke) === 1 && (
                <div className="p-5 bg-orange-50 text-orange-800 rounded-3xl border border-orange-100 flex items-start gap-4">
                  <div className="bg-orange-500 p-2 rounded-lg text-white"><Zap size={16}/></div>
                  <div>
                    <p className="font-black text-xs uppercase tracking-tighter">Smoking Alert</p>
                    <p className="text-sm font-medium opacity-80 leading-tight mt-1">{t('advice_smoke')}</p>
                  </div>
                </div>
              )}
              {parseInt(state.alco) === 1 && (
                <div className="p-5 bg-indigo-50 text-indigo-800 rounded-3xl border border-indigo-100 flex items-start gap-4">
                  <div className="bg-indigo-500 p-2 rounded-lg text-white"><Activity size={16}/></div>
                  <div>
                    <p className="font-black text-xs uppercase tracking-tighter">Alcohol Consumption</p>
                    <p className="text-sm font-medium opacity-80 leading-tight mt-1">{t('advice_alco')}</p>
                  </div>
                </div>
              )}
              {isHighRisk && (
                <div className="sm:col-span-2 p-6 bg-red-600 text-white rounded-3xl font-black flex items-center justify-between animate-pulse">
                  <span className="uppercase text-sm italic tracking-widest">{t('urgent_doc')}</span>
                  <AlertCircle />
                </div>
              )}
            </div>
          </div>

          {/* 4. ASHA Worker Interface */}
          <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
               <MessageSquare size={120} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400 flex items-center gap-2 mb-4">
               ASHA INSTRUCTION
            </h3>
            <p className="text-xl sm:text-2xl font-bold leading-tight italic max-w-2xl">
              "{t('asha_tell_patient')}"
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
               <span className="bg-emerald-500 text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Immediate Referral</span>
               <span className="bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Patient Counselling</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function RiskCard({ label, score, color, icon }) {
  const colorMap = {
    red: 'text-red-500 bg-red-50 border-red-100',
    orange: 'text-orange-500 bg-orange-50 border-orange-100',
    blue: 'text-blue-500 bg-blue-50 border-blue-100'
  };

  return (
    <div className={`p-6 rounded-[2rem] border-2 shadow-sm flex flex-col items-center gap-4 transition-transform hover:scale-105 ${colorMap[color]}`}>
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white rounded-xl shadow-sm">{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
      </div>
      <div className="text-3xl font-black italic">{score}%</div>
      <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${
          color === 'red' ? 'bg-red-500' : color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'
        }`} style={{ width: `${score}%` }}></div>
      </div>
    </div>
  );
}