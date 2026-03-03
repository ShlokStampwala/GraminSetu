import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import { AlertCircle, CheckCircle, Info, MessageSquare, Heart } from "lucide-react";

export default function PatientAnalysis() {
  const { state } = useLocation();
  const { t } = useTranslation();
  
  if (!state) return <div className="p-10 text-center">No Data Found</div>;
  const isHighRisk = state.riskResult === "High";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* 1. Risk Level Banner */}
          <div className={`p-8 rounded-3xl border-b-8 flex items-center gap-6 ${isHighRisk ? 'bg-red-50 border-red-500' : 'bg-emerald-50 border-emerald-500'}`}>
            {isHighRisk ? <AlertCircle className="h-16 w-16 text-red-600" /> : <CheckCircle className="h-16 w-16 text-emerald-600" />}
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase">{t('risk_result')}</h2>
              <p className={`text-4xl font-black ${isHighRisk ? 'text-red-600' : 'text-emerald-600'}`}>
                {isHighRisk ? t('high_risk') : t('low_risk')} ({state.riskProbability}%)
              </p>
            </div>
          </div>

          {/* 2. Personalized Conditioning (Smoking/Alcohol) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-blue-600" /> {t('advice_title')}
            </h3>
            <div className="space-y-3">
              {parseInt(state.smoke) === 1 && (
                <div className="p-4 bg-orange-50 text-orange-800 rounded-xl border border-orange-100">
                  {t('advice_smoke')}
                </div>
              )}
              {parseInt(state.alco) === 1 && (
                <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                  {t('advice_alco')}
                </div>
              )}
              {isHighRisk && (
                <div className="p-4 bg-red-100 text-red-900 rounded-xl font-bold animate-pulse">
                  {t('urgent_doc')}
                </div>
              )}
            </div>
          </div>

          {/* 3. ASHA Worker Final Instruction */}
          <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-xl">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" /> {t('asha_instruction')}
            </h3>
            <p className="text-emerald-50 text-md leading-relaxed">
              {t('asha_tell_patient')}
            </p>
            <div className="mt-4 flex gap-4">
               <span className="bg-emerald-800 px-3 py-1 rounded-full text-xs font-bold text-emerald-300">ACTION REQUIRED</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}