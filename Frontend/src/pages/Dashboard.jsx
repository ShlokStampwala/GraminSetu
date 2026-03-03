import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import { Users, AlertTriangle, CalendarClock, Bell, PlusCircle, MapPin, RefreshCcw, FileDown, ShieldCheck } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total: 0, highRisk: 0, unSynced: 0 });
  const [patients, setPatients] = useState([]);
  const [ashaInfo, setAshaInfo] = useState({ name: "", village: "" });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const rawUserData = localStorage.getItem("asha_user_data");
    if (rawUserData) {
      const cachedUser = JSON.parse(rawUserData);
      setAshaInfo({ name: cachedUser.name, village: cachedUser.village });
    }

    const loadData = () => {
      const localData = JSON.parse(localStorage.getItem("offline_patients") || "[]");
      setStats({
        total: localData.length,
        highRisk: localData.filter(p => p.riskResult === "High").length,
        unSynced: localData.filter(p => !p.synced).length
      });
      setPatients(localData);
    };

    const handleAutoSync = async () => {
      const localData = JSON.parse(localStorage.getItem("offline_patients") || "[]");
      const pendingData = localData.filter(p => !p.synced);
      if (pendingData.length > 0 && navigator.onLine) {
        setIsSyncing(true);
        try {
          const response = await fetch('http://localhost:5000/api/sync/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingData),
          });
          if (response.ok) {
            const updatedData = localData.map(p => ({ ...p, synced: true }));
            localStorage.setItem("offline_patients", JSON.stringify(updatedData));
            loadData();
          }
        } catch (e) { console.error(e); }
        finally { setTimeout(() => setIsSyncing(false), 2000); }
      }
    };

    loadData();
    window.addEventListener('online', handleAutoSync);
    if (navigator.onLine) handleAutoSync();
    return () => window.removeEventListener('online', handleAutoSync);
  }, []);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(t('app_title'), 14, 20);
    doc.autoTable({
      startY: 30,
      head: [[t('table_name'), t('aadhaar'), t('age'), t('table_risk')]],
      body: patients.map(p => [p.name, p.aadhaar, p.age, p.riskResult === "High" ? t('high_risk') : t('low_risk')]),
      headStyles: { fillColor: [5, 150, 105] }
    });
    doc.save(`Report_${new Date().getTime()}.pdf`);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 p-6 space-y-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('welcome')}, {ashaInfo.name}</h1>
            <div className="flex items-center gap-2 text-emerald-600 font-bold mt-1">
              <ShieldCheck size={16} /> <span className="text-sm uppercase">{t('asha_instruction')}</span>
            </div>
          </div>
          <button onClick={downloadPDF} className="flex items-center gap-2 h-12 px-8 rounded-2xl bg-white border-2 border-slate-200 font-bold shadow-sm">
            <FileDown size={20} className="text-emerald-600" /> {t('download_report')}
          </button>
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isSyncing ? 'bg-amber-500 animate-spin' : 'bg-emerald-500'}`}>
                <RefreshCcw size={16} className="text-white" />
              </div>
              <span className="text-slate-800 font-bold text-sm">{isSyncing ? "Syncing..." : `${stats.unSynced} ${t('sync_btn')}`}</span>
            </div>
            <div className="flex items-center gap-2">
               <MapPin size={16} className="text-emerald-600" /> <span className="text-xs font-black text-emerald-700 uppercase">{ashaInfo.village}</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard title={t('total_patients')} value={stats.total} trend={t('month_growth')} icon={<Users />} accent="emerald" />
          <KpiCard title={t('high_risk_patients')} value={stats.highRisk} trend={t('critical_count')} icon={<AlertTriangle />} accent="red" />
          <KpiCard title={t('upcoming_followups')} value="7" trend={t('next_days')} icon={<CalendarClock />} accent="amber" />
          <KpiCard title={t('community_alerts')} value="3" trend={t('seasonal_rise')} icon={<Bell />} accent="blue" />
        </div>
        <div className="max-w-7xl mx-auto space-y-4">
          <h2 className="text-xl font-black text-slate-800 uppercase ml-1">{t('quick_actions')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <QuickAction title={t('action_add_title')} description={t('action_add_desc')} icon={<PlusCircle />} onClick={() => navigate("/add-patient")} />
            <QuickAction title={t('action_risk_title')} description={t('action_risk_desc')} icon={<AlertTriangle />} onClick={() => navigate("/review-high-risk")} />
            <QuickAction title={t('action_followup_title')} description={t('action_followup_desc')} icon={<CalendarClock />} onClick={() => navigate("/Follow-up-management")} />
          </div>
        </div>
      </div>
    </>
  );
}

function KpiCard({ title, value, trend, icon, accent }) {
  const accentMap = { emerald: "from-emerald-500/10 border-emerald-100 text-emerald-600", red: "from-red-500/10 border-red-100 text-red-600", amber: "from-amber-500/10 border-amber-100 text-amber-600", blue: "from-blue-500/10 border-blue-100 text-blue-600" };
  return (
    <div className={`rounded-3xl bg-white border-2 p-6 shadow-sm bg-gradient-to-br ${accentMap[accent]} to-transparent`}>
      <div className="flex justify-between items-start">
        <div><p className="text-xs font-black uppercase text-slate-400">{title}</p><p className="text-4xl font-black text-slate-900 mt-2">{value}</p><p className="text-xs mt-2 font-bold opacity-80">{trend}</p></div>
        <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100">{icon}</div>
      </div>
    </div>
  );
}

function QuickAction({ title, description, icon, onClick }) {
  return (
    <div onClick={onClick} className="rounded-3xl bg-white border-2 border-slate-100 p-6 shadow-sm hover:border-emerald-500 cursor-pointer group transition-all">
      <div className="flex items-center gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">{icon}</div>
        <div><h3 className="font-black text-slate-900 text-lg tracking-tight">{title}</h3><p className="text-sm text-slate-500 font-medium">{description}</p></div>
      </div>
    </div>
  );
}